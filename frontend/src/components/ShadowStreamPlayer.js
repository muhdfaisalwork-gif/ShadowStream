import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Platform, ActivityIndicator, useWindowDimensions, ScrollView, Linking
} from 'react-native';
import Hls from 'hls.js';
import { COLORS } from '../theme/colors';
import { availablePlayers } from '../utils/externalPlayer';
import { getApiBase } from '../utils/api';
import { isNoAdsActive, toggleNoAds, onNoAdsChange, onAdBlocked, getBlockedCount, recordBlocked } from '../utils/adShield';

// Common ISO 639-1 language code to readable name mapping
const LANGUAGE_NAMES = {
    en: 'English',
    ja: 'Japanese',
    hi: 'Hindi',
    ur: 'Urdu',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    ko: 'Korean',
    zh: 'Chinese',
    ar: 'Arabic',
    it: 'Italian',
    pt: 'Portuguese',
    ru: 'Russian',
    tr: 'Turkish',
    ta: 'Tamil',
    te: 'Telugu',
    bn: 'Bengali',
    id: 'Indonesian',
    tl: 'Tagalog',
    th: 'Thai',
    vi: 'Vietnamese',
    fa: 'Persian',
    pa: 'Punjabi',
};

function normalizeDub(d) {
    if (!d) return null;
    if (typeof d === 'string') {
        const code = d.toLowerCase().trim();
        return {
            code,
            label: LANGUAGE_NAMES[code] || code.toUpperCase(),
        };
    }
    const code = String(d.code || d.iso || d.language || '').toLowerCase().trim();
    const label = d.label || d.name || LANGUAGE_NAMES[code] || (code ? code.toUpperCase() : 'Unknown');
    return { code, label };
}

// Helper to format seconds into HH:MM:SS or MM:SS
function formatTime(seconds) {
    if (!seconds || isNaN(seconds) || seconds < 0) return '00:00';
    const s = Math.floor(seconds);
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    if (hrs > 0) {
        return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export default function ShadowStreamPlayer({
    title,
    season,
    episode,
    streamUrl,
    streamKind = 'direct', // 'direct' = our HLS/MP4 engine, 'embed' = sandboxed provider iframe
    sourceName = 'ShadowStream Ultra HD',
    seasons = [],
    mirrorList = [],
    activeMirrorIdx = 0,
    subtitles = [],
    dubs = [],
    onSelectMirror,
    onSelectEpisode,
    onNextEpisode,
    onBack,
    mediaId,
    notice = null,
    posterUrl = null,
    renditions = [],
    onSelectRendition,
}) {
    const { width, height } = useWindowDimensions();
    const isMobile = width < 768;

    // Our own decoder is only in play for a resolved direct stream. Every other
    // provider renders inside a sandboxed iframe, but the chrome around it —
    // back, title, server switcher, episode drawer — is still ours in both modes.
    const isDirect = streamKind === 'direct';

    // --- Crop / stretch ------------------------------------------------------
    //
    // 'fit'     whole frame, letterboxed (never distorts)
    // 'fill'    crop the edges to remove black bars
    // 'stretch' force the frame to the container, distorting it
    //
    // Direct mode owns the <video>, so this is just objectFit. Embed mode does not:
    // the picture belongs to the provider page inside a cross-origin iframe and
    // cannot be reached. There we transform the frame itself, which crops and
    // stretches the picture just the same. ASSUMED_ASPECT is the ratio we assume
    // the provider renders at, since we cannot measure inside the frame.
    const ASSUMED_ASPECT = 16 / 9;
    const [viewMode, setViewMode] = useState('fit');
    const [frameSize, setFrameSize] = useState({ w: 0, h: 0 });

    const embedTransform = useMemo(() => {
        if (isDirect || viewMode === 'fit' || !frameSize.w || !frameSize.h) return null;
        const { w, h } = frameSize;
        const sx = w / (h * ASSUMED_ASPECT);
        const sy = h / (w / ASSUMED_ASPECT);
        if (viewMode === 'fill') {
            const k = Math.max(sx, sy, 1);
            return { transform: `scale(${k})` };
        }
        return { transform: `scale(${sx}, ${sy})` };
    }, [isDirect, viewMode, frameSize]);

    const videoObjectFit = viewMode === 'fill' ? 'cover' : viewMode === 'stretch' ? 'fill' : 'contain';

    const nextViewMode = useCallback(() => {
        setViewMode((m) => (m === 'fit' ? 'fill' : m === 'fill' ? 'stretch' : 'fit'));
    }, []);
    const VIEW_LABEL = { fit: 'Fit', fill: 'Crop', stretch: 'Stretch' };

    // Video & Playback State
    const videoRef = useRef(null);
    const iframeRef = useRef(null);
    const hlsRef = useRef(null);
    const containerRef = useRef(null);
    const cssFullscreenRef = useRef(false);
    const autoHideTimerRef = useRef(null);
    const bingeTimerRef = useRef(null);
    const isHoveringTopBar = useRef(false);

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [buffered, setBuffered] = useState(0);
    const [isBuffering, setIsBuffering] = useState(false);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [fullscreenNote, setFullscreenNote] = useState(null);
    const [activeDubLang, setActiveDubLang] = useState('native'); // 'native' | lang code like 'hi', 'en', 'ar'
    const [dubToast, setDubToast] = useState(null);

    // No Ads & 3rd-Party Link Blocker State
    const [noAdsEnabled, setNoAdsEnabled] = useState(isNoAdsActive());
    const [blockedCount, setBlockedCount] = useState(getBlockedCount());
    const [adBlockedToast, setAdBlockedToast] = useState(null);
    const adToastTimerRef = useRef(null);

    useEffect(() => {
        const unsubToggle = onNoAdsChange((enabled) => {
            setNoAdsEnabled(enabled);
        });
        const unsubBlocked = onAdBlocked((event) => {
            setBlockedCount(event.count);
            let domain = 'Ad Link';
            try {
                if (event.url) domain = new URL(event.url).hostname;
            } catch (_) {}
            setAdBlockedToast(`🛡️ Blocked 3rd-party ${event.reason || 'ad'}: ${domain}`);
            if (adToastTimerRef.current) clearTimeout(adToastTimerRef.current);
            adToastTimerRef.current = setTimeout(() => {
                setAdBlockedToast(null);
            }, 3000);
        });
        return () => {
            unsubToggle();
            unsubBlocked();
            if (adToastTimerRef.current) clearTimeout(adToastTimerRef.current);
        };
    }, []);

    const handleToggleNoAds = useCallback(() => {
        const next = toggleNoAds();
        setNoAdsEnabled(next);
        setAdBlockedToast(next ? '🛡️ No Ads: ON — All 3rd-party links blocked' : '⚠️ No Ads: OFF — 3rd-party links allowed');
        if (adToastTimerRef.current) clearTimeout(adToastTimerRef.current);
        adToastTimerRef.current = setTimeout(() => {
            setAdBlockedToast(null);
        }, 2500);
    }, []);

    // Defend against iframe clickjacking popup attempts stealing focus
    useEffect(() => {
        if (!noAdsEnabled || typeof window === 'undefined') return;
        const handleWindowBlur = () => {
            if (document.activeElement && (document.activeElement.tagName === 'IFRAME' || document.activeElement === iframeRef.current)) {
                recordBlocked(streamUrl || 'embed', 'iframe popup attempt');
                setTimeout(() => {
                    try { window.focus(); } catch (_) {}
                }, 50);
            }
        };
        window.addEventListener('blur', handleWindowBlur);
        return () => window.removeEventListener('blur', handleWindowBlur);
    }, [noAdsEnabled, streamUrl]);

    // Overlay & UI State
    const [controlsVisible, setControlsVisible] = useState(true);
    const [hoverTime, setHoverTime] = useState(null);
    const [hoverPos, setHoverPos] = useState(null);
    const [showSpeedMenu, setShowSpeedMenu] = useState(false);
    const [showQualityMenu, setShowQualityMenu] = useState(false);
    const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
    const [showDubMenu, setShowDubMenu] = useState(false);
    const [availableAudioTracks, setAvailableAudioTracks] = useState([]);
    const [showServerMenu, setShowServerMenu] = useState(false);
    const [showLoadServerMenu, setShowLoadServerMenu] = useState(false);
    const [showPlayerMenu, setShowPlayerMenu] = useState(false);
    const [showDownloadMenu, setShowDownloadMenu] = useState(false);
    const [playerHandoffFailed, setPlayerHandoffFailed] = useState(false);
    const playerApps = availablePlayers();

    // Screen orientation & mobile landscape state
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const isCompactTopBar = width < 680;
    const isPortrait = height > width;

    const [adHelperDismissed, setAdHelperDismissed] = useState(false);

    // Embed failover.
    //
    // A cross-origin iframe gives us almost no signal: if a provider is down
    // or has changed its page, the frame either loads a dead page or a broken
    // player, and we cannot read inside it. What we can do is notice that it
    // loaded and then never became interactive, and offer the next mirror in
    // one tap rather than leaving the user on a black rectangle.
    const [embedState, setEmbedState] = useState('loading'); // loading | ready | stalled
    const embedTimer = useRef(null);

    const handleEmbedLoaded = useCallback(() => {
        setEmbedState('ready');
        if (embedTimer.current) { clearTimeout(embedTimer.current); embedTimer.current = null; }
    }, []);

    const handleEmbedFailed = useCallback(() => {
        setEmbedState('stalled');
    }, []);

    // Reset the watchdog whenever the active mirror changes.
    //
    // 20s, not 6s. Providers chain nested iframes — VidSrc (IMDb) goes
    // vidsrc.me -> vidsrc.sh -> cloudorchestranova.com, three hops — so the
    // OUTER frame's onLoad does not fire until the whole chain settles.
    // Measured cold on Dexter S5E7: onLoad landed at ~19s. At 6s we painted
    // "This server isn't responding" over a stream that then played fine, and
    // at 12s we still beat it by 7s. Since we cannot read inside a
    // cross-origin frame, the only honest option is a long leash.
    useEffect(() => {
        setEmbedState('loading');
        if (embedTimer.current) clearTimeout(embedTimer.current);
        embedTimer.current = setTimeout(() => {
            setEmbedState((prev) => (prev === 'loading' ? 'stalled' : prev));
        }, 20000);
        return () => { if (embedTimer.current) { clearTimeout(embedTimer.current); embedTimer.current = null; } };
    }, [streamUrl]);

    const tryNextMirror = useCallback(() => {
        if (!mirrorList || mirrorList.length < 2) return;
        setPlayerHandoffFailed(false);
        const next = (activeMirrorIdx + 1) % mirrorList.length;
        if (onSelectMirror) onSelectMirror(mirrorList[next], next);
    }, [mirrorList, activeMirrorIdx, onSelectMirror]);

    // The watchdog firing does not mean the stream is dead — on a three-hop
    // provider it usually just means we ran out of patience first. Give the
    // user a way to say "it's still coming" instead of only "give up".
    const keepWaiting = useCallback(() => {
        setEmbedState('loading');
        if (embedTimer.current) clearTimeout(embedTimer.current);
        embedTimer.current = setTimeout(() => {
            setEmbedState((prev) => (prev === 'loading' ? 'stalled' : prev));
        }, 20000);
    }, []);

    // True while the provider has not finished handing us a playable frame.
    // Covers both paths: our own decoder buffering, and the cross-origin
    // iframe still loading.
    //
    // The iframe's onLoad is NOT a readiness signal. Verified two ways: on Slow
    // 3G it fired while the provider was still showing "FETCHING DATA, PLEASE
    // WAIT", and with the network cut it fired for a chrome-error "No
    // internet" page. Neither tells us a frame ever arrived, and because the
    // frame is cross-origin we cannot read inside it to check. So the line is
    // driven by a fixed window on every source change rather than by a lie the
    // browser tells us.
    const [minLoading, setMinLoading] = useState(true);
    useEffect(() => {
        setMinLoading(true);
        // 8s floor: onLoad is not a readiness signal (it fires while the
        // provider is still showing "FETCHING DATA, PLEASE WAIT"), so the line
        // has to hold for a while on its own.
        const t = setTimeout(() => setMinLoading(false), 8000);
        return () => clearTimeout(t);
    }, [streamUrl]);

    // 'stalled' is deliberately excluded: that is the failover bar's job, and
    // showing both at once collided and blocked the Change button.
    //
    // The line also stays up past the 8s floor until the iframe finally loads,
    // so there is no silent gap between the line disappearing and the 12s
    // watchdog firing.
    const isLoadingContent = isDirect
        ? (isBuffering || minLoading)
        : ((minLoading || embedState === 'loading') && embedState !== 'stalled');

    // The picker lives INSIDE this bar, so the bar has to outlive the 6s timer
    // once it is open — otherwise a menu opened at 5.9s unmounts itself a
    // tenth of a second later, mid-tap.
    const loadBarVisible = isLoadingContent || showLoadServerMenu;

    // Elapsed seconds, so the line says "Loading… 12s" instead of a spinner
    // that could mean anything. Resets every time the source changes.
    const [loadSeconds, setLoadSeconds] = useState(0);
    useEffect(() => {
        if (!isLoadingContent) {
            setLoadSeconds(0);
            return undefined;
        }
        setLoadSeconds(0);
        const t = setInterval(() => setLoadSeconds(s => s + 1), 1000);
        return () => clearInterval(t);
    }, [isLoadingContent, streamUrl]);

    // MUST be declared before the effect below reads it. It used to sit ~30
    // lines further down with the other player state, and because the effect's
    // DEPENDENCY ARRAY is evaluated during render, every mount hit the
    // temporal dead zone and threw "Cannot access 'selectedSubtitle' before
    // initialization" — which white-screened the entire player route. Hooks
    // that appear earlier in the body must not depend on state declared later.
    const [selectedSubtitle, setSelectedSubtitle] = useState('off');

    // Apply the chosen subtitle to the real media element.
    //
    // The menu sets `selectedSubtitle`, but without this the <video> keeps
    // showing whatever the browser picked by default — which is why the
    // Subtitles control looked like it did nothing.
    useEffect(() => {
        if (!isDirect) return;
        const video = videoRef.current;
        if (!video || !video.textTracks) return;

        const wanted = selectedSubtitle;
        for (let i = 0; i < video.textTracks.length; i++) {
            const t = video.textTracks[i];
            const match = wanted !== 'off' && (t.language === wanted || t.label === wanted);
            t.mode = match ? 'showing' : 'disabled';
        }
    }, [selectedSubtitle, isDirect, streamUrl, subtitles.length]);

    // Expose the Subtitle menu on embed too, but make it honest: the provider
    // owns the track list there, so we only show the hint.
    const canSelectSubtitles = isDirect && Array.isArray(subtitles) && subtitles.length > 0;

    // Dub (audio language) picker — combines detected title dubs with common options
    const normalizedDubs = useMemo(() => {
        if (!Array.isArray(dubs)) return [];
        return dubs.map(normalizeDub).filter(Boolean);
    }, [dubs]);

    const availableDubs = useMemo(() => {
        const seen = new Set();
        const list = [];
        for (const d of normalizedDubs) {
            if (!seen.has(d.code)) {
                seen.add(d.code);
                list.push(d);
            }
        }
        return list;
    }, [normalizedDubs]);

    // Dead code removed deliberately.
    //
    // This used to build `<iframe src={streamUrl}&lang=<code>>` when a dub was
    // picked. It never worked. `lang` is not a parameter VidLink recognises —
    // its API takes `multiLang`, and that flag only governs SUBTITLES: the
    // response for this title is byte-identical with multiLang=0 and multiLang=1,
    // and contains no audio track array at all, just one file per resolution.
    // The picker was a menu that could not change anything.
    //
    // Real audio switching is possible in exactly one mode: direct, where the
    // <video> is ours and hls.js exposes the manifest's audio tracks. Embed mode
    // has no handle on the track list. See AUDIO_TRACKS below.

    const [activeAudioIdx, setActiveAudioIdx] = useState(0);

    const selectAudioTrack = useCallback((idx) => {
        setActiveAudioIdx(idx);
        const hls = hlsRef.current;
        if (hls && Array.isArray(hls.audioTracks) && hls.audioTracks.length > idx) {
            hls.audioTrack = idx;
            const track = hls.audioTracks[idx];
            const name = track?.name || track?.lang || `Track ${idx + 1}`;
            setDubToast(`🔊 Switched audio to ${name}`);
            setTimeout(() => setDubToast(null), 3000);
            return;
        }
        // Progressive MP4 or Safari native video tracks
        const video = videoRef.current;
        if (video && video.audioTracks && video.audioTracks.length > idx) {
            for (let i = 0; i < video.audioTracks.length; i++) {
                video.audioTracks[i].enabled = (i === idx);
            }
            const track = video.audioTracks[idx];
            const name = track?.label || track?.language || `Track ${idx + 1}`;
            setDubToast(`🔊 Switched audio to ${name}`);
            setTimeout(() => setDubToast(null), 3000);
        }
    }, []);

    const handleDownloadVideo = useCallback(() => {
        if (!streamUrl) return;
        const cleanTitle = (title || 'Video').replace(/[^a-zA-Z0-9_\- ]/g, '').trim();
        const epSuffix = season != null && episode != null ? ` - S${season}E${episode}` : '';
        const filename = `${cleanTitle}${epSuffix} [HD].mp4`;

        // 1. Native Android APK
        if (typeof window !== 'undefined' && window.ShadowStreamNative) {
            const isDirect = /\.(mp4|webm|mkv)(\?|$)/i.test(streamUrl);
            if (isDirect && typeof window.ShadowStreamNative.downloadMedia === 'function') {
                window.ShadowStreamNative.downloadMedia(streamUrl, filename);
                setDubToast(`⬇ Downloading ${filename} via DownloadManager...`);
            } else if (typeof window.ShadowStreamNative.openExternalDownloader === 'function') {
                window.ShadowStreamNative.openExternalDownloader(streamUrl, filename);
                setDubToast('🚀 Opening in external downloader (1DM / ADM / VLC)...');
            } else if (typeof window.ShadowStreamNative.downloadMedia === 'function') {
                window.ShadowStreamNative.downloadMedia(streamUrl, filename);
                setDubToast(`⬇ Downloading ${filename}...`);
            }
            setTimeout(() => setDubToast(null), 3500);
            setShowDownloadMenu(false);
            return;
        }

        // 2. Direct playable file (e.g. mp4, webm)
        const isDirectFile = /\.(mp4|webm|mkv)(\?|$)/i.test(streamUrl);
        if (isDirectFile && typeof document !== 'undefined') {
            const a = document.createElement('a');
            a.href = streamUrl;
            a.download = filename;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            document.body.appendChild(a);
            a.click();
            setTimeout(() => { if (document.body.contains(a)) document.body.removeChild(a); }, 300);
            setDubToast(`⬇ Downloading ${cleanTitle}${epSuffix}...`);
            setTimeout(() => setDubToast(null), 3500);
        } else {
            // For HLS streams & embeds: open in external downloader tab AND copy stream link
            if (typeof window !== 'undefined') {
                window.open(streamUrl, '_blank');
            }
            if (typeof navigator !== 'undefined' && navigator.clipboard) {
                navigator.clipboard.writeText(streamUrl);
                setDubToast('📋 Stream opened & link copied for 1DM, ADM, or VLC.');
                setTimeout(() => setDubToast(null), 4000);
            }
        }
        setShowDownloadMenu(false);
    }, [streamUrl, title, season, episode]);

    const handleOpenExternalDownloader = useCallback(() => {
        if (!streamUrl) return;
        const cleanTitle = (title || 'Video').replace(/[^a-zA-Z0-9_\- ]/g, '').trim();
        const epSuffix = season != null && episode != null ? ` - S${season}E${episode}` : '';
        const filename = `${cleanTitle}${epSuffix} [HD].mp4`;

        if (typeof window !== 'undefined' && window.ShadowStreamNative && typeof window.ShadowStreamNative.openExternalDownloader === 'function') {
            window.ShadowStreamNative.openExternalDownloader(streamUrl, filename);
            setDubToast('🚀 Opening in external downloader (1DM / ADM / VLC)...');
        } else if (typeof window !== 'undefined') {
            window.open(streamUrl, '_blank');
            if (typeof navigator !== 'undefined' && navigator.clipboard) {
                navigator.clipboard.writeText(streamUrl);
            }
            setDubToast('🚀 Opened external stream & copied link!');
        }
        setShowDownloadMenu(false);
    }, [streamUrl, title, season, episode]);

    const handleCopyStreamLink = useCallback(() => {
        if (!streamUrl) return;
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText(streamUrl);
            setDubToast('Stream link copied! Paste into 1DM, ADM, IDM, or VLC.');
            setTimeout(() => setDubToast(null), 3500);
        } else if (typeof window !== 'undefined') {
            window.prompt('Copy stream link:', streamUrl);
        }
        setShowDownloadMenu(false);
    }, [streamUrl]);

    const subMirrorIdx = useMemo(() => {
        return (mirrorList || []).findIndex(m => {
            const l = (m.label || m.provider || '').toLowerCase();
            return l.includes('sub') && !l.includes('dub');
        });
    }, [mirrorList]);

    const dubMirrorIdx = useMemo(() => {
        return (mirrorList || []).findIndex(m => {
            const l = (m.label || m.provider || '').toLowerCase();
            return l.includes('dub');
        });
    }, [mirrorList]);

    const hasSubAndDubMirrors = subMirrorIdx !== -1 && dubMirrorIdx !== -1;

    const selectDubAudio = useCallback((dubCode) => {
        if (!dubCode || dubCode === 'native') {
            setActiveDubLang('native');
            if (isDirect && availableAudioTracks.length > 0) {
                selectAudioTrack(0);
            }
            setDubToast('Switched to Original Audio');
            setTimeout(() => setDubToast(null), 3000);
            setShowDubMenu(false);
            return;
        }

        const cleanCode = String(dubCode).toLowerCase().trim();
        setActiveDubLang(cleanCode);
        const langLabel = LANGUAGE_NAMES[cleanCode] || cleanCode.toUpperCase();

        // 1. Direct Mode with multiple embedded tracks: match track by language
        if (isDirect && availableAudioTracks.length > 1) {
            const match = availableAudioTracks.find(t => 
                (t.lang && t.lang.toLowerCase() === cleanCode) ||
                (t.label && t.label.toLowerCase().includes(langLabel.toLowerCase()))
            );
            if (match) {
                selectAudioTrack(match.idx);
                setDubToast(`🎙️ Audio changed to ${match.label}`);
                setTimeout(() => setDubToast(null), 3500);
                setShowDubMenu(false);
                return;
            }
        }

        // 2. Anime & Regional Sub/Dub quick switch
        if (hasSubAndDubMirrors) {
            if (cleanCode === 'ja') {
                if (onSelectMirror && subMirrorIdx !== -1) {
                    onSelectMirror(mirrorList[subMirrorIdx], subMirrorIdx);
                    setDubToast('🇯🇵 Switched to Japanese SUB mirror');
                    setTimeout(() => setDubToast(null), 3500);
                    setShowDubMenu(false);
                    return;
                }
            } else if (cleanCode === 'en') {
                if (onSelectMirror && dubMirrorIdx !== -1) {
                    onSelectMirror(mirrorList[dubMirrorIdx], dubMirrorIdx);
                    setDubToast('🎙️ Switched to English DUB mirror');
                    setTimeout(() => setDubToast(null), 3500);
                    setShowDubMenu(false);
                    return;
                }
            }
        }

        // 3. User feedback for single track or embed mode
        if (isDirect) {
            setDubToast(`This stream has single default audio (${langLabel}). Alternate releases available via Server switcher.`);
        } else {
            setDubToast(`ℹ️ Spoken audio is inside provider settings (⚙️ at bottom right), or switch Server (⚡).`);
        }
        setTimeout(() => setDubToast(null), 4000);
        setShowDubMenu(false);
    }, [isDirect, availableAudioTracks, selectAudioTrack, hasSubAndDubMirrors, onSelectMirror, subMirrorIdx, dubMirrorIdx, mirrorList]);

    const setAudioTrackList = useCallback((tracks) => {
        setAvailableAudioTracks(tracks);
        setActiveAudioIdx(0);
    }, []);

    // The provider notice is informational, not an error. Fade it out after a
    // few seconds so it never sits over the video like a stuck subtitle.
    const [noticeVisible, setNoticeVisible] = useState(true);
    useEffect(() => {
        setNoticeVisible(true);
        if (!notice && !playerHandoffFailed) return undefined;
        const t = setTimeout(() => setNoticeVisible(false), 4000);
        return () => clearTimeout(t);
    }, [notice, playerHandoffFailed, streamUrl]);
    const [showEpisodeDrawer, setShowEpisodeDrawer] = useState(false);
    const [activeDrawerSeason, setActiveDrawerSeason] = useState(season || 1);

    // The drawer's highlighted season used to be seeded once and then never
    // followed the player, so switching episode by any other route (Next
    // Episode, deep link) left the drawer on a stale season.
    useEffect(() => {
        if (season != null) setActiveDrawerSeason(season);
    }, [season]);

    // Season rows as the API actually returns them. Episodes carry no
    // `season_number` of their own, so the season has to be resolved from the
    // row that owns them. Episodes from different titles vary, so tolerate the
    const rawDrawerSeasons = Array.isArray(seasons) ? seasons.filter(s => s && s.season_number != null) : [];
    const regularDrawer = rawDrawerSeasons.filter(s => s.season_number > 0).sort((a, b) => a.season_number - b.season_number);
    const specialDrawer = rawDrawerSeasons.filter(s => s.season_number === 0);
    const drawerSeasons = [...regularDrawer, ...specialDrawer];
    const drawerActiveSeasonRow =
        drawerSeasons.find(s => s.season_number === activeDrawerSeason) || drawerSeasons.find(s => s.season_number > 0) || drawerSeasons[0] || null;
    const drawerActiveSeasonNumber = drawerActiveSeasonRow ? drawerActiveSeasonRow.season_number : (season != null ? season : 1);
    const drawerEpisodes = (drawerActiveSeasonRow && Array.isArray(drawerActiveSeasonRow.episodes))
        ? drawerActiveSeasonRow.episodes.filter(ep => ep && ep.episode_number != null)
        : [];

    const drawerEpOffset = useMemo(() => {
        if (!drawerActiveSeasonRow || drawerActiveSeasonRow.season_number <= 0) return 0;
        let offset = 0;
        for (const s of drawerSeasons) {
            if (s.season_number > 0 && s.season_number < drawerActiveSeasonRow.season_number) {
                const count = (Array.isArray(s.episodes) && s.episodes.length > 0)
                    ? s.episodes.length
                    : (s.episode_count || 0);
                offset += count;
            }
        }
        return offset;
    }, [drawerSeasons, drawerActiveSeasonRow]);

    // HLS Quality levels
    const [qualityLevels, setQualityLevels] = useState([]);
    const [activeQualityIdx, setActiveQualityIdx] = useState(-1); // -1 = auto

    // Binge Next Episode state
    const [showBingeCard, setShowBingeCard] = useState(false);
    const [bingeCountdown, setBingeCountdown] = useState(10);
    const [bingeDismissed, setBingeDismissed] = useState(false);

    // Find next episode info
    const currentSeasonObj = seasons.find(s => s.season_number === (season || 1)) || seasons[0];
    const episodeList = currentSeasonObj?.episodes || [];
    const currentEpIdx = episodeList.findIndex(e => e.episode_number === episode);
    const hasNextEp = currentEpIdx !== -1 && currentEpIdx < episodeList.length - 1;
    const nextEpObj = hasNextEp ? episodeList[currentEpIdx + 1] : null;

    // Reset auto-hide timer for controls (both direct & embed modes)
    const resetAutoHide = useCallback(() => {
        setControlsVisible(true);
        if (autoHideTimerRef.current) {
            clearTimeout(autoHideTimerRef.current);
        }
        // Do not auto-hide if a menu is open or if user is hovering over top bar or if paused in direct mode
        const anyMenuOpen = showSpeedMenu || showQualityMenu || showSubtitleMenu || showDubMenu ||
            showServerMenu || showLoadServerMenu || showPlayerMenu || showDownloadMenu || showEpisodeDrawer;
        if (isHoveringTopBar.current || anyMenuOpen || (isDirect && !isPlaying)) {
            return;
        }
        autoHideTimerRef.current = setTimeout(() => {
            setControlsVisible(false);
        }, 3500);
    }, [
        isDirect, isPlaying, showSpeedMenu, showQualityMenu, showSubtitleMenu,
        showDubMenu, showServerMenu, showLoadServerMenu, showPlayerMenu,
        showDownloadMenu, showEpisodeDrawer
    ]);

    // Initial timer on stream load / change
    useEffect(() => {
        resetAutoHide();
    }, [resetAutoHide, streamUrl]);

    // Global desktop cursor movement and mobile touch activity listener
    useEffect(() => {
        if (Platform.OS !== 'web' || typeof window === 'undefined') return;
        const handleActivity = () => {
            resetAutoHide();
        };
        window.addEventListener('mousemove', handleActivity, { passive: true });
        window.addEventListener('touchstart', handleActivity, { passive: true });
        window.addEventListener('keydown', handleActivity, { passive: true });
        return () => {
            window.removeEventListener('mousemove', handleActivity);
            window.removeEventListener('touchstart', handleActivity);
            window.removeEventListener('keydown', handleActivity);
        };
    }, [resetAutoHide]);

    // Handle Play / Pause
    const togglePlay = useCallback(() => {
        if (!videoRef.current) return;
        if (videoRef.current.paused) {
            videoRef.current.play().catch(e => console.warn('Play error:', e));
            setIsPlaying(true);
        } else {
            videoRef.current.pause();
            setIsPlaying(false);
        }
        resetAutoHide();
    }, [resetAutoHide]);

    // Seek by delta seconds
    const seekRelative = useCallback((delta) => {
        if (!videoRef.current) return;
        const newTime = Math.max(0, Math.min(videoRef.current.duration || 0, videoRef.current.currentTime + delta));
        videoRef.current.currentTime = newTime;
        setCurrentTime(newTime);
        resetAutoHide();
    }, [resetAutoHide]);

    // Set Volume
    const handleVolumeChange = useCallback((newVol) => {
        if (!videoRef.current) return;
        const clamped = Math.max(0, Math.min(1, newVol));
        videoRef.current.volume = clamped;
        setVolume(clamped);
        if (clamped === 0) {
            videoRef.current.muted = true;
            setIsMuted(true);
        } else if (isMuted) {
            videoRef.current.muted = false;
            setIsMuted(false);
        }
    }, [isMuted]);

    // Toggle Mute
    const toggleMute = useCallback(() => {
        if (!videoRef.current) return;
        const nextMute = !isMuted;
        videoRef.current.muted = nextMute;
        setIsMuted(nextMute);
    }, [isMuted]);

    // Set Playback Speed
    const handleSetRate = useCallback((rate) => {
        if (!videoRef.current) return;
        videoRef.current.playbackRate = rate;
        setPlaybackRate(rate);
        setShowSpeedMenu(false);
    }, []);

    // Set Quality Level
    const handleSetQuality = useCallback((idx) => {
        const lvl = qualityLevels[idx];
        if (lvl && lvl.isRendition) {
            const opt = (renditions || [])[idx];
            if (!opt) return;
            if (opt.browserPlayable === false) {
                // e.g. an .mkv original — a browser cannot decode it, so this
                // is a download, not a playback switch.
                if (typeof window !== 'undefined' && opt.url) window.open(opt.url, '_blank');
                setShowQualityMenu(false);
                return;
            }
            const video = videoRef.current;
            const wasPlaying = video && !video.paused ? video.currentTime : 0;
            if (video) {
                video.src = opt.url;
                video.load();
                if (wasPlaying) {
                    video.currentTime = wasPlaying;
                    video.play().catch(() => {});
                }
            }
            setActiveQualityIdx(idx);
            setShowQualityMenu(false);
            return;
        }
        if (hlsRef.current) {
            hlsRef.current.currentLevel = idx; // -1 for auto
            setActiveQualityIdx(idx);
        }
        setShowQualityMenu(false);
    }, []);

    // Fullscreen Toggle
    //
    // Three separate things used to break here, so the ladder is explicit:
    //
    // 1. iPhone Safari has no element fullscreen at all. `requestFullscreen()` on a
    //    <div> is simply absent there (Safari unprefixed it on macOS/iPadOS in 16.4,
    //    never on iPhone). The old code called `target.requestFullscreen().catch(warn)`,
    //    which silently did nothing on every phone.
    // 2. The only element iOS *will* fullscreen is a <video>, via webkitEnterFullscreen.
    // 3. Some browsers support none of it. A CSS fullscreen (fixed, 100vw/100vh, escaped
    //    out of the scroll containers) is the last resort so the button is never dead.
    const requestElementFullscreen = useCallback((el) => {
        if (!el) return false;
        try {
            if (typeof el.requestFullscreen === 'function') {
                el.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
                return true;
            }
            if (typeof el.webkitRequestFullscreen === 'function') {
                el.webkitRequestFullscreen();
                return true;
            }
        } catch (e) {
            return false;
        }
        return false;
    }, []);

    const toggleFullscreen = useCallback(() => {
        if (Platform.OS !== 'web' || typeof document === 'undefined') return;

        const video = videoRef.current;
        const frame = iframeRef.current;
        const elementFsSupported =
            typeof document.documentElement.requestFullscreen === 'function' ||
            typeof document.documentElement.webkitRequestFullscreen === 'function';

        setFullscreenNote(null);

        // --- Exit ------------------------------------------------------------
        // iOS video fullscreen is invisible to document.fullscreenElement, so it has to
        // be checked first or the exit path never runs on a phone.
        if (video && video.webkitDisplayingFullscreen) {
            if (typeof video.webkitExitFullscreen === 'function') video.webkitExitFullscreen();
            else setIsFullscreen(false);
            return;
        }
        if (document.fullscreenElement) {
            if (typeof document.exitFullscreen === 'function') document.exitFullscreen().catch(() => {});
            else if (typeof document.webkitExitFullscreen === 'function') document.webkitExitFullscreen();
            else setIsFullscreen(false);
            return;
        }
        // CSS fallback is holding the screen — nothing in the document API to exit.
        if (cssFullscreenRef.current) {
            cssFullscreenRef.current = false;
            setIsFullscreen(false);
            return;
        }

        // --- Enter ------------------------------------------------------------
        if (isDirect) {
            // Container keeps our custom controls (seek, quality, subtitles, server switcher).
            if (elementFsSupported && requestElementFullscreen(containerRef.current)) return;
            // iPhone: the video element is the only thing that can go fullscreen.
            if (video && typeof video.webkitEnterFullscreen === 'function') {
                video.webkitEnterFullscreen();
                return;
            }
        } else {
            // Embed mode: fullscreen OUR container, not the provider frame.
            // The iframe already fills 100%x100%, so it looks identical — but the
            // top bar (and therefore the exit button) stays on top and reachable.
            // Putting the iframe itself in fullscreen buries our own chrome behind
            // it, and a touch user has no Esc key to get back out.
            if (elementFsSupported && requestElementFullscreen(containerRef.current)) return;
            if (elementFsSupported && requestElementFullscreen(frame)) return;
            if (frame && typeof frame.webkitRequestFullscreen === 'function') {
                frame.webkitRequestFullscreen();
                return;
            }
            setFullscreenNote(isMobile
                ? 'iPhone only fullscreens the video itself — use the player inside the frame.'
                : 'Provider blocked fullscreen — using app fullscreen.');
        }

        // Universal fallback: pure CSS fullscreen. Works everywhere, needs no API.
        cssFullscreenRef.current = true;
        setIsFullscreen(true);
    }, [isDirect, isMobile, requestElementFullscreen]);

    // Clear the fallback notice on its own — it is a hint, not a permanent banner.
    useEffect(() => {
        if (!fullscreenNote) return undefined;
        const t = setTimeout(() => setFullscreenNote(null), 5000);
        return () => clearTimeout(t);
    }, [fullscreenNote]);

    // Mobile / Tablet Screen Rotation Handler
    const handleToggleRotate = useCallback(() => {
        // 1. Native Android APK bridge
        if (typeof window !== 'undefined' && window.ShadowStreamNative) {
            if (typeof window.ShadowStreamNative.toggleOrientation === 'function') {
                try {
                    window.ShadowStreamNative.toggleOrientation();
                    setDubToast('📱 Orientation Toggled');
                    setTimeout(() => setDubToast(null), 2500);
                    return;
                } catch (_) {}
            }
        }

        // 2. Screen Orientation API (Android Chrome, Edge, PWA)
        if (typeof window !== 'undefined' && window.screen && window.screen.orientation && typeof window.screen.orientation.lock === 'function') {
            try {
                const currentType = window.screen.orientation.type || '';
                if (currentType.includes('landscape') || !isPortrait) {
                    window.screen.orientation.lock('portrait').catch(() => {});
                    setDubToast('📱 Rotated to Portrait');
                } else {
                    window.screen.orientation.lock('landscape').catch(() => {});
                    setDubToast('📱 Rotated to Landscape');
                }
                setTimeout(() => setDubToast(null), 2500);
                return;
            } catch (_) {}
        }

        // 3. Fallback on iOS Safari / Desktop / browsers without screen.orientation.lock:
        // Toggle fullscreen, which naturally aligns orientation on mobile
        toggleFullscreen();
    }, [isPortrait, toggleFullscreen]);

    // Fullscreen change listener
    //
    // cssFullscreenRef tracks whether our CSS fallback is what is currently holding
    // the screen, because that mode never touches document.fullscreenElement. Without
    // that distinction the exit event cannot tell "user left fullscreen" from "CSS
    // fallback still on", and the toggle icon goes stale.
    useEffect(() => {
        if (Platform.OS !== 'web') return undefined;

        const onFsChange = () => {
            const active = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
            if (active) {
                cssFullscreenRef.current = false;
                setIsFullscreen(true);
                return;
            }
            if (!cssFullscreenRef.current) setIsFullscreen(false);
        };
        document.addEventListener('fullscreenchange', onFsChange);
        document.addEventListener('webkitfullscreenchange', onFsChange);
        return () => {
            document.removeEventListener('fullscreenchange', onFsChange);
            document.removeEventListener('webkitfullscreenchange', onFsChange);
        };
    }, []);

    // iOS video fullscreen fires its own events and never touches document.*.
    // Keyed on isDirect because the <video> only exists in direct mode.
    useEffect(() => {
        if (Platform.OS !== 'web' || !isDirect) return undefined;
        const video = videoRef.current;
        if (!video) return undefined;
        const onBegin = () => setIsFullscreen(true);
        const onEnd = () => setIsFullscreen(false);
        video.addEventListener('webkitbeginfullscreen', onBegin);
        video.addEventListener('webkitendfullscreen', onEnd);
        return () => {
            video.removeEventListener('webkitbeginfullscreen', onBegin);
            video.removeEventListener('webkitendfullscreen', onEnd);
        };
    }, [isDirect, streamUrl]);

    // NOTE: the global window.open guard lives in src/utils/adShield.js and is
    // installed once by App.js. This component used to install a second,
    // stricter override that blocked every popup including the app's own —
    // the duplicate is gone. The iframe `sandbox` attribute below is the
    // actual popup defence.

    // Restore saved playback position
    const storageKey = `shadowstream_pos_${mediaId || title}_s${season || 1}_e${episode || 1}`;
    useEffect(() => {
        if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
            try {
                const saved = localStorage.getItem(storageKey);
                if (saved && videoRef.current) {
                    const pos = parseFloat(saved);
                    if (pos > 10) {
                        videoRef.current.currentTime = pos;
                    }
                }
            } catch (_) {}
        }
    }, [storageKey, streamUrl]);

    // Save playback position periodically
    useEffect(() => {
        if (Platform.OS !== 'web' || typeof localStorage === 'undefined') return;
        if (currentTime > 5 && duration > 0 && currentTime < duration - 10) {
            try {
                localStorage.setItem(storageKey, String(Math.floor(currentTime)));
            } catch (_) {}
        }
    }, [currentTime, duration, storageKey]);

    // Keyboard Shortcuts
    useEffect(() => {
        if (Platform.OS !== 'web') return;
        const handleKeyDown = (e) => {
            // Ignore if active element is an input
            if (['input', 'textarea'].includes(document.activeElement?.tagName?.toLowerCase())) return;

            switch (e.key) {
                case ' ':
                case 'k':
                case 'K':
                    e.preventDefault();
                    togglePlay();
                    break;
                case 'ArrowLeft':
                case 'j':
                case 'J':
                    e.preventDefault();
                    seekRelative(-10);
                    break;
                case 'ArrowRight':
                case 'l':
                case 'L':
                    e.preventDefault();
                    seekRelative(10);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    handleVolumeChange(volume + 0.1);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    handleVolumeChange(volume - 0.1);
                    break;
                case 'm':
                case 'M':
                    e.preventDefault();
                    toggleMute();
                    break;
                case 'f':
                case 'F':
                    e.preventDefault();
                    toggleFullscreen();
                    break;
                case 'n':
                case 'N':
                    e.preventDefault();
                    if (hasNextEp && onNextEpisode) onNextEpisode();
                    break;
                case 'Escape':
                    setShowSpeedMenu(false);
                    setShowQualityMenu(false);
                    setShowSubtitleMenu(false);
                    setShowServerMenu(false);
                    setShowEpisodeDrawer(false);
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [togglePlay, seekRelative, handleVolumeChange, volume, toggleMute, toggleFullscreen, hasNextEp, onNextEpisode]);

    // Setup Video Engine (HLS or native MP4) — our own decoder, direct mode only.
    useEffect(() => {
        if (Platform.OS !== 'web' || streamKind !== 'direct' || !streamUrl) return;

        const video = videoRef.current;
        if (!video) return;

        setIsBuffering(true);

        const isHlsStream = streamUrl.includes('.m3u8') || streamUrl.includes('application/x-mpegURL');

        if (!isHlsStream) {
            // Progressive files have no HLS manifest, so no levels ever arrive
            // and the quality menu stayed empty even when the source shipped
            // several encodes. Fall back to the renditions recorded for the
            // title; selecting one swaps the media source.
            setQualityLevels(
                Array.isArray(renditions) && renditions.length > 1
                    ? renditions.map((r, idx) => ({
                        idx,
                        label: r.label || `Option ${idx + 1}`,
                        bitrate: 0,
                        isRendition: true,
                        playable: r.browserPlayable !== false,
                    }))
                    : []
            );
        }

        if (isHlsStream && Hls.isSupported()) {
            if (hlsRef.current) {
                hlsRef.current.destroy();
            }

            const hls = new Hls({
                enableWorker: true,
                lowLatencyMode: true,
                backBufferLength: 90,
            });

            hlsRef.current = hls;
            hls.loadSource(streamUrl);
            hls.attachMedia(video);

            hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
                setIsBuffering(false);
                const levels = data.levels.map((lvl, idx) => ({
                    idx,
                    height: lvl.height,
                    label: lvl.height ? `${lvl.height}p` : `Level ${idx + 1}`,
                    bitrate: Math.round(lvl.bitrate / 1000)
                }));
                setQualityLevels(levels);
                video.play().catch(() => {});

                // Alternate audio tracks ship in the manifest or populate via AUDIO_TRACKS_UPDATED
                const syncAudioTracks = (tracksList) => {
                    const list = (tracksList && tracksList.length > 0) ? tracksList : (hls.audioTracks || []);
                    if (Array.isArray(list) && list.length > 0) {
                        const audioTracks = list.map((t, i) => {
                            const code = (t.lang || '').toLowerCase().trim();
                            const langName = LANGUAGE_NAMES[code] || t.name || t.groupId || `Track ${i + 1}`;
                            const label = t.name && !t.name.includes(langName) ? `${t.name} (${langName})` : langName;
                            return {
                                idx: i,
                                label,
                                lang: code,
                            };
                        });
                        setAudioTrackList(audioTracks);
                    }
                };

                syncAudioTracks(data.audioTracks);

                hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, (ev, trackData) => {
                    syncAudioTracks(trackData?.audioTracks);
                });
            });

            hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, (event, data) => {
                setActiveAudioIdx(data.id);
            });

            hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
                setActiveQualityIdx(hls.autoLevelEnabled ? -1 : data.level);
            });

            hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            console.warn('[ShadowStreamPlayer] Fatal network error, recovering...');
                            hls.startLoad();
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            console.warn('[ShadowStreamPlayer] Fatal media error, recovering...');
                            hls.recoverMediaError();
                            break;
                        default:
                            console.warn('[ShadowStreamPlayer] Fatal unrecoverable error:', data);
                            hls.destroy();
                            break;
                    }
                }
            });
        } else {
            // Direct MP4 or Safari Native HLS
            video.src = streamUrl;
            video.load();
            video.play().catch(() => {});

            if (video.audioTracks) {
                const syncNativeAudioTracks = () => {
                    const tracks = video.audioTracks;
                    if (tracks && tracks.length > 0) {
                        const list = [];
                        for (let i = 0; i < tracks.length; i++) {
                            const t = tracks[i];
                            const code = (t.language || '').toLowerCase().trim();
                            const langName = LANGUAGE_NAMES[code] || t.label || `Track ${i + 1}`;
                            const label = t.label && !t.label.includes(langName) ? `${t.label} (${langName})` : langName;
                            list.push({
                                idx: i,
                                label,
                                lang: code,
                                enabled: t.enabled,
                            });
                            if (t.enabled) setActiveAudioIdx(i);
                        }
                        setAudioTrackList(list);
                    }
                };
                syncNativeAudioTracks();
                video.audioTracks.addEventListener('addtrack', syncNativeAudioTracks);
                video.audioTracks.addEventListener('removetrack', syncNativeAudioTracks);
                video.audioTracks.addEventListener('change', syncNativeAudioTracks);
            }
        }

        // HTML5 Video Event Listeners
        const onPlay = () => {
            setIsPlaying(true);
        };
        const onPause = () => {
            setIsPlaying(false);
        };
        const onWaiting = () => {
            setIsBuffering(true);
        };
        const onPlaying = () => {
            setIsBuffering(false);
        };
        const onTimeUpdate = () => {
            setCurrentTime(video.currentTime);
            if (video.buffered.length > 0) {
                setBuffered(video.buffered.end(video.buffered.length - 1));
            }
        };
        const onLoadedMetadata = () => {
            setDuration(video.duration);
            setIsBuffering(false);
        };
        const onEnded = () => {
            setIsPlaying(false);
            if (hasNextEp && onNextEpisode) {
                onNextEpisode();
            }
        };

        video.addEventListener('play', onPlay);
        video.addEventListener('pause', onPause);
        video.addEventListener('waiting', onWaiting);
        video.addEventListener('playing', onPlaying);
        video.addEventListener('timeupdate', onTimeUpdate);
        video.addEventListener('loadedmetadata', onLoadedMetadata);
        video.addEventListener('ended', onEnded);

        return () => {
            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
            video.removeEventListener('play', onPlay);
            video.removeEventListener('pause', onPause);
            video.removeEventListener('waiting', onWaiting);
            video.removeEventListener('playing', onPlaying);
            video.removeEventListener('timeupdate', onTimeUpdate);
            video.removeEventListener('loadedmetadata', onLoadedMetadata);
            video.removeEventListener('ended', onEnded);
        };
    }, [streamUrl, streamKind, hasNextEp, onNextEpisode]);

    // Binge Next Episode Countdown Detection (45s before end)
    useEffect(() => {
        if (!hasNextEp || bingeDismissed || duration <= 60) return;

        if (currentTime >= duration - 45 && !showBingeCard) {
            setShowBingeCard(true);
            setBingeCountdown(10);

            let remaining = 10;
            bingeTimerRef.current = setInterval(() => {
                remaining -= 1;
                setBingeCountdown(remaining);
                if (remaining <= 0) {
                    clearInterval(bingeTimerRef.current);
                    setShowBingeCard(false);
                    if (onNextEpisode) onNextEpisode();
                }
            }, 1000);
        }

        return () => {
            if (bingeTimerRef.current) clearInterval(bingeTimerRef.current);
        };
    }, [currentTime, duration, hasNextEp, bingeDismissed, showBingeCard, onNextEpisode]);

    // Scrubber click/drag handler
    const handleScrub = (e) => {
        if (!videoRef.current || duration <= 0) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const clientX = e.clientX || (e.touches && e.touches[0]?.clientX) || 0;
        const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const newTime = pos * duration;
        videoRef.current.currentTime = newTime;
        setCurrentTime(newTime);
        resetAutoHide();
    };

    // Scrubber hover preview
    const handleScrubHover = (e) => {
        if (duration <= 0) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        setHoverPos(pos * 100);
        setHoverTime(pos * duration);
    };

    return (
        <View
            ref={containerRef}
            style={[
                styles.container,
                isFullscreen && styles.containerFullscreen,

                !controlsVisible && styles.cursorHidden
            ]}
            onMouseMove={resetAutoHide}
            onTouchStart={resetAutoHide}
            onLayout={(e) => {
                const { width: w, height: h } = e.nativeEvent.layout;
                setFrameSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
            }}
        >
            {/* Playback Area */}
            {isDirect ? (
                <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: '#000000' }}>
                    <video
                        ref={videoRef}
                        playsInline
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: videoObjectFit,
                            backgroundColor: '#000000',
                            display: 'block',
                        }}
                    >
                        {/* Real subtitle tracks. These are what the Subtitles
                            menu switches between — previously the menu existed
                            and did nothing, because no <track> was ever added. */}
                        {subtitles.map((s) => (
                            <track
                                key={s.id || s.language}
                                kind="subtitles"
                                src={s.url}
                                srcLang={s.language}
                                label={s.label || s.language}
                                default={selectedSubtitle === s.language}
                            />
                        ))}
                    </video>
                </div>
            ) : (
                /* Embed Mode: the provider decodes, we keep the chrome.
                   When No Ads is active, iframe is sandboxed without allow-popups and without allow-top-navigation */
                <View style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
                    <iframe
                        key={streamUrl}
                        ref={iframeRef}
                        src={streamUrl}
                        title="ShadowStream Built-in Player"
                        onLoad={handleEmbedLoaded}
                        onError={handleEmbedFailed}
                        style={{
                            width: '100%',
                            height: '100%',
                            border: 'none',
                            backgroundColor: '#000000',
                            transform: embedTransform ? embedTransform.transform : 'none',
                            transformOrigin: viewMode === 'fit' ? 'center center' : 'center bottom',
                        }}
                        allowFullScreen
                        referrerPolicy="origin"
                        sandbox={noAdsEnabled ? "allow-scripts allow-same-origin allow-forms allow-presentation allow-pointer-lock allow-downloads" : undefined}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    />
                </View>
            )}

            {/* In-Player Episode Drawer */}
            {showEpisodeDrawer && (
                <View style={styles.episodeDrawer}>
                    <View style={styles.drawerHeader}>
                        <Text style={styles.drawerTitle}>Seasons & Episodes</Text>
                        <TouchableOpacity
                            style={styles.drawerCloseBtn}
                            onPress={() => setShowEpisodeDrawer(false)}
                        >
                            <Text style={styles.drawerCloseText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Season Tabs */}
                    {drawerSeasons.length > 1 && (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.drawerSeasonTabs}>
                            {drawerSeasons.map(s => {
                                const active = s.season_number === drawerActiveSeasonNumber;
                                return (
                                    <TouchableOpacity
                                        key={s.season_number}
                                        style={[styles.drawerSeasonTab, active && styles.drawerSeasonTabActive]}
                                        onPress={() => setActiveDrawerSeason(s.season_number)}
                                    >
                                        <Text style={[styles.drawerSeasonTabText, active && styles.drawerSeasonTabTextActive]}>
                                            {s.season_number === 0 ? (s.name || 'Specials') : (s.name && !/^Season\s+\d+$/i.test(s.name) ? `${s.name} (S${s.season_number})` : (s.name || `Season ${s.season_number}`))}
                                            {Array.isArray(s.episodes) && s.episodes.length > 0
                                                ? `  (${s.episodes.length})`
                                                : ''}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    )}

                    {/* Episodes List */}
                    <ScrollView style={styles.drawerEpisodeList}>
                        {drawerEpisodes.length === 0 ? (
                            <Text style={styles.drawerEmpty}>
                                No episode list came back for this season.
                            </Text>
                        ) : null}
                        {drawerEpisodes.map(ep => {
                            const epSeason = ep.season_number != null ? ep.season_number : drawerActiveSeasonNumber;
                            const isCurrent = epSeason === season && ep.episode_number === episode;
                            const epAbsNum = (drawerActiveSeasonRow?.season_number > 0 && drawerEpOffset > 0) ? (drawerEpOffset + ep.episode_number) : null;
                            return (
                                <TouchableOpacity
                                    key={`${epSeason}-${ep.episode_number}`}
                                    style={[styles.drawerEpCard, isCurrent && styles.drawerEpCardActive]}
                                    onPress={() => {
                                        setShowEpisodeDrawer(false);
                                        if (onSelectEpisode) {
                                            onSelectEpisode(epSeason, ep.episode_number);
                                        }
                                    }}
                                >
                                    <View style={styles.drawerEpBadge}>
                                        <Text style={styles.drawerEpBadgeText}>EP {ep.episode_number}{epAbsNum ? ` (#${epAbsNum})` : ''}</Text>
                                    </View>
                                    <View style={{ flex: 1, paddingLeft: 10 }}>
                                        <Text style={[styles.drawerEpName, isCurrent && { color: COLORS.brand }]} numberOfLines={1}>
                                            {ep.name || ep.title || `Episode ${ep.episode_number}`}
                                        </Text>
                                        {ep.overview ? (
                                            <Text style={styles.drawerEpOverview} numberOfLines={2}>
                                                {ep.overview}
                                            </Text>
                                        ) : null}
                                    </View>
                                    {isCurrent && <Text style={styles.nowPlayingText}>▶ Playing</Text>}
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            )}

            {/* Minimized Trigger & Mini-Pill Bar (Visible when controls are minimized) */}
            {!controlsVisible && (
                <View style={styles.topTriggerZone} pointerEvents="box-none">
                    <TouchableOpacity
                        style={styles.minimizedPill}
                        onPress={resetAutoHide}
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityLabel="Show all player controls"
                    >
                        <Text style={styles.minimizedPillText}>‹ Back · ⌄ Controls</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Shared Top Bar — mounted in BOTH direct and embed mode so the
                server switcher and episode drawer are always reachable. */}
            <View
                style={[
                    styles.topControlBar,
                    controlsVisible ? styles.topControlBarVisible : styles.topControlBarHidden
                ]}
                onMouseEnter={() => { isHoveringTopBar.current = true; resetAutoHide(); }}
                onMouseLeave={() => { isHoveringTopBar.current = false; resetAutoHide(); }}
                pointerEvents={controlsVisible ? 'auto' : 'none'}
            >
                <TouchableOpacity style={styles.backBtn} onPress={onBack}>
                    <Text style={styles.backBtnText}>‹ Back</Text>
                </TouchableOpacity>

                <View style={styles.titleInfo}>
                    <Text style={styles.titleText} numberOfLines={1}>{title}</Text>
                    {season ? (
                        <Text style={styles.episodeBadge}>S{season}:E{episode}</Text>
                    ) : null}
                    <TouchableOpacity
                        style={[
                            styles.noAdsToggleBtn,
                            noAdsEnabled ? styles.noAdsToggleBtnOn : styles.noAdsToggleBtnOff
                        ]}
                        onPress={handleToggleNoAds}
                        activeOpacity={0.7}
                        accessibilityRole="switch"
                        accessibilityState={{ checked: noAdsEnabled }}
                        accessibilityLabel={`Toggle No Ads protection, currently ${noAdsEnabled ? 'ON' : 'OFF'}`}
                    >
                        <Text style={styles.noAdsToggleIcon}>🛡️</Text>
                        <Text style={[
                            styles.noAdsToggleText,
                            noAdsEnabled ? styles.noAdsToggleTextOn : styles.noAdsToggleTextOff
                        ]}>
                            {noAdsEnabled ? 'No Ads: ON' : 'No Ads: OFF'}
                        </Text>
                        {blockedCount > 0 && noAdsEnabled && (
                            <View style={styles.blockedBadge}>
                                <Text style={styles.blockedBadgeText}>{blockedCount}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.topRightControls}>
                    {/* Fullscreen lives in the SHARED top bar, not in the transport
                        controls. The transport bar is gated behind isDirect, and embed
                        mode is what nearly every title actually plays in — so the old
                        button was rendered for almost nobody, and phones have no
                        keyboard to fall back on the F shortcut. */}
                    <TouchableOpacity
                        style={styles.iconBtn}
                        onPress={toggleFullscreen}
                        accessibilityLabel="Toggle fullscreen"
                    >
                        <Text style={styles.iconBtnText}>{isFullscreen ? '⛷' : '⛶'}</Text>
                    </TouchableOpacity>

                    {/* Mobile Screen Rotate Button */}
                    <TouchableOpacity
                        style={[styles.pillButton, !isPortrait && styles.pillButtonActive]}
                        onPress={handleToggleRotate}
                        accessibilityLabel="Rotate screen orientation"
                    >
                        <Text style={styles.pillButtonText}>🔄 Rotate</Text>
                    </TouchableOpacity>

                    {/* Compact View: More Options Dropdown for small screens */}
                    {isCompactTopBar && (
                        <View style={{ position: 'relative' }}>
                            <TouchableOpacity
                                style={[styles.pillButton, showMoreMenu && styles.pillButtonActive]}
                                onPress={() => setShowMoreMenu(!showMoreMenu)}
                                accessibilityLabel="More playback options"
                            >
                                <Text style={styles.pillButtonText}>⋯ More</Text>
                            </TouchableOpacity>
                            {showMoreMenu && (
                                <View style={[styles.popupMenu, { width: 220, right: 0 }]}>
                                    <Text style={styles.popupMenuHeader}>Playback Options</Text>
                                    {mirrorList && mirrorList.length > 0 && (
                                        <TouchableOpacity
                                            style={styles.popupMenuItem}
                                            onPress={() => { setShowMoreMenu(false); setShowServerMenu(true); }}
                                        >
                                            <Text style={styles.popupMenuText}>⚡ Server: {sourceName || 'Auto'}</Text>
                                        </TouchableOpacity>
                                    )}
                                    <TouchableOpacity
                                        style={styles.popupMenuItem}
                                        onPress={() => { nextViewMode(); setShowMoreMenu(false); }}
                                    >
                                        <Text style={styles.popupMenuText}>⬚ Fit / Crop: {VIEW_LABEL[viewMode]}</Text>
                                    </TouchableOpacity>
                                    {canSelectSubtitles && (
                                        <TouchableOpacity
                                            style={styles.popupMenuItem}
                                            onPress={() => { setShowMoreMenu(false); setShowSubtitleMenu(true); }}
                                        >
                                            <Text style={styles.popupMenuText}>💬 Subtitles ({selectedSubtitle === 'off' ? 'Off' : selectedSubtitle})</Text>
                                        </TouchableOpacity>
                                    )}
                                    <TouchableOpacity
                                        style={styles.popupMenuItem}
                                        onPress={() => { setShowMoreMenu(false); setShowDubMenu(true); }}
                                    >
                                        <Text style={styles.popupMenuText}>🌐 Audio & Dubbing</Text>
                                    </TouchableOpacity>
                                    {streamUrl ? (
                                        <TouchableOpacity
                                            style={styles.popupMenuItem}
                                            onPress={() => { setShowMoreMenu(false); setShowDownloadMenu(true); }}
                                        >
                                            <Text style={styles.popupMenuText}>⬇ Download & Links</Text>
                                        </TouchableOpacity>
                                    ) : null}
                                    {drawerSeasons && drawerSeasons.length > 0 ? (
                                        <TouchableOpacity
                                            style={styles.popupMenuItem}
                                            onPress={() => { setShowMoreMenu(false); setShowEpisodeDrawer(true); }}
                                        >
                                            <Text style={styles.popupMenuText}>📚 Seasons & Episodes</Text>
                                        </TouchableOpacity>
                                    ) : null}
                                </View>
                            )}
                        </View>
                    )}

                    {/* Crop / stretch — cycles Fit → Crop → Stretch */}
                    <TouchableOpacity
                        style={[styles.pillButton, viewMode !== 'fit' && styles.pillButtonActive, isCompactTopBar && { display: 'none' }]}
                        onPress={nextViewMode}
                        accessibilityLabel={`Video fit: ${VIEW_LABEL[viewMode]}`}
                    >
                        <Text style={styles.pillButtonText}>⬚ {VIEW_LABEL[viewMode]}</Text>
                    </TouchableOpacity>

                    {/* Server Switcher */}
                    {mirrorList.length > 0 && (
                        <View style={[{ position: 'relative' }, isCompactTopBar && { display: 'none' }]}>
                            <TouchableOpacity
                                style={styles.pillButton}
                                onPress={() => setShowServerMenu(!showServerMenu)}
                            >
                                <Text style={styles.pillButtonText}>⚡ {sourceName || 'Server'}</Text>
                            </TouchableOpacity>
                            {showServerMenu && (
                                <View style={styles.popupMenu}>
                                    <Text style={styles.popupMenuHeader}>Select Stream Server</Text>
                                    {mirrorList.map((m, idx) => (
                                        <TouchableOpacity
                                            key={idx}
                                            style={[styles.popupMenuItem, idx === activeMirrorIdx && styles.popupMenuItemActive]}
                                            onPress={() => {
                                                setShowServerMenu(false);
                                                if (onSelectMirror) onSelectMirror(m, idx);
                                            }}
                                        >
                                            <Text style={[styles.popupMenuText, idx === activeMirrorIdx && styles.popupMenuTextActive]}>
                                                {idx === activeMirrorIdx ? '▶ ' : ''}{m.label} ({m.quality || 'HD'})
                                                {m.direct ? ' · direct' : ''}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>
                    )}

                    {/* Subtitles — only when the track list is real */}
                    {canSelectSubtitles && (
                        <View style={[{ position: 'relative' }, isCompactTopBar && { display: 'none' }]}>
                            <TouchableOpacity
                                style={styles.pillButton}
                                onPress={() => setShowSubtitleMenu(!showSubtitleMenu)}
                            >
                                <Text style={styles.pillButtonText}>💬 Subtitles</Text>
                            </TouchableOpacity>
                            {showSubtitleMenu && (
                                <View style={styles.popupMenu}>
                                    <Text style={styles.popupMenuHeader}>Subtitles</Text>
                                    <TouchableOpacity
                                        style={[styles.popupMenuItem, selectedSubtitle === 'off' && styles.popupMenuItemActive]}
                                        onPress={() => { setSelectedSubtitle('off'); setShowSubtitleMenu(false); }}
                                    >
                                        <Text style={styles.popupMenuText}>Off</Text>
                                    </TouchableOpacity>
                                    {subtitles.map(sub => (
                                        <TouchableOpacity
                                            key={sub.id || sub.language}
                                            style={[styles.popupMenuItem, selectedSubtitle === sub.language && styles.popupMenuItemActive]}
                                            onPress={() => { setSelectedSubtitle(sub.language); setShowSubtitleMenu(false); }}
                                        >
                                            <Text style={styles.popupMenuText}>{sub.label || sub.language}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>
                    )}

                    {/* Audio.
                        A real switcher appears only when the source genuinely
                        carries more than one audio track (direct mode, via the
                        HLS manifest). Embed mode gets the truth instead of a
                        list of languages it cannot act on. */}
                    <View style={{ position: 'relative' }}>
                        <TouchableOpacity
                            style={[
                                styles.pillButton,
                                (hasSubAndDubMirrors || (isDirect && availableAudioTracks.length > 1)) && styles.pillButtonActive
                            ]}
                            onPress={() => setShowDubMenu(!showDubMenu)}
                        >
                            <Text style={styles.pillButtonText}>
                                {hasSubAndDubMirrors
                                    ? (activeMirrorIdx === dubMirrorIdx ? '🎙️ DUB' : '🇯🇵 SUB')
                                    : (isDirect && availableAudioTracks.length > 1
                                        ? `🌐 Audio (${availableAudioTracks.length})`
                                        : '🌐 Audio')}
                            </Text>
                        </TouchableOpacity>
                        {showDubMenu && (
                            <View style={[styles.popupMenu, styles.audioPopupMenu]}>
                                <Text style={styles.popupMenuHeader}>Audio & Dubbing</Text>
                                <ScrollView style={{ maxHeight: 380 }}>
                                    {/* Active Audio State Box */}
                                    <View style={styles.audioActiveBox}>
                                        <Text style={styles.audioActiveLabel}>CURRENT AUDIO SOURCE</Text>
                                        <Text style={styles.audioActiveValue}>
                                            {hasSubAndDubMirrors
                                                ? (activeMirrorIdx === dubMirrorIdx ? '🎙️ English Dubbed Audio' : '🇯🇵 Original Japanese (Subtitled)')
                                                : (isDirect && availableAudioTracks.length > 1
                                                    ? (availableAudioTracks[activeAudioIdx]?.label || 'Original Audio')
                                                    : `Default Stream (${sourceName || 'Provider'})`)}
                                        </Text>
                                    </View>

                                    {/* Sub / Dub Quick Switcher (Anime & Series) */}
                                    {hasSubAndDubMirrors && (
                                        <>
                                            <Text style={styles.popupMenuSubheader}>Anime & Regional Switcher</Text>
                                            <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 4, marginVertical: 4 }}>
                                                <TouchableOpacity
                                                    style={[styles.subDubPill, activeMirrorIdx === subMirrorIdx && styles.subDubPillActive]}
                                                    onPress={() => {
                                                        if (onSelectMirror) onSelectMirror(mirrorList[subMirrorIdx], subMirrorIdx);
                                                        setDubToast('🇯🇵 Switched to Japanese SUB');
                                                        setTimeout(() => setDubToast(null), 3000);
                                                        setShowDubMenu(false);
                                                    }}
                                                >
                                                    <Text style={[styles.subDubPillText, activeMirrorIdx === subMirrorIdx && styles.subDubPillTextActive]}>
                                                        🇯🇵 SUB (Original)
                                                    </Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={[styles.subDubPill, activeMirrorIdx === dubMirrorIdx && styles.subDubPillActive]}
                                                    onPress={() => {
                                                        if (onSelectMirror) onSelectMirror(mirrorList[dubMirrorIdx], dubMirrorIdx);
                                                        setDubToast('🎙️ Switched to English DUB');
                                                        setTimeout(() => setDubToast(null), 3000);
                                                        setShowDubMenu(false);
                                                    }}
                                                >
                                                    <Text style={[styles.subDubPillText, activeMirrorIdx === dubMirrorIdx && styles.subDubPillTextActive]}>
                                                        🎙️ DUB (Dubbed)
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                            <Text style={styles.popupMenuHint}>
                                                One-click toggle between original Japanese with subtitles and English dubbed voice.
                                            </Text>
                                            <View style={styles.popupMenuDivider} />
                                        </>
                                    )}

                                    {/* Native Embedded Audio Tracks in HLS/Direct */}
                                    {isDirect && availableAudioTracks.length > 1 && (
                                        <>
                                            <Text style={styles.popupMenuSubheader}>Stream Audio Tracks</Text>
                                            {availableAudioTracks.map(t => (
                                                <TouchableOpacity
                                                    key={t.idx}
                                                    style={[styles.popupMenuItem, activeAudioIdx === t.idx && styles.popupMenuItemActive]}
                                                    onPress={() => {
                                                        selectAudioTrack(t.idx);
                                                        setShowDubMenu(false);
                                                    }}
                                                >
                                                    <Text style={[styles.popupMenuText, activeAudioIdx === t.idx && styles.popupMenuTextActive]}>
                                                        {activeAudioIdx === t.idx ? '▶ ' : ''}{t.label}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                            <View style={styles.popupMenuDivider} />
                                        </>
                                    )}

                                    {/* Production Spoken Language Information */}
                                    {availableDubs.length > 0 && (
                                        <>
                                            <Text style={styles.popupMenuSubheader}>Production Spoken Language</Text>
                                            <View style={styles.audioChipRow}>
                                                {availableDubs.slice(0, 6).map(d => (
                                                    <View
                                                        key={d.code}
                                                        style={styles.audioChip}
                                                    >
                                                        <Text style={styles.audioChipText}>
                                                            🗣️ {d.label}
                                                        </Text>
                                                    </View>
                                                ))}
                                            </View>
                                            <Text style={styles.popupMenuHint}>
                                                Original language recorded for this title.
                                            </Text>
                                            <View style={styles.popupMenuDivider} />
                                        </>
                                    )}

                                    {/* Direct Mode Single Audio Track Guidance */}
                                    {isDirect && availableAudioTracks.length <= 1 && (
                                        <View style={styles.embedAudioInfoBox}>
                                            <Text style={styles.embedAudioInfoTitle}>🔊 Single Master Audio Track</Text>
                                            <Text style={styles.embedAudioInfoText}>
                                                This direct stream carries a single default audio track. For alternate dubbed versions or localized releases, switch to another server using the ⚡ Server button.
                                            </Text>
                                        </View>
                                    )}

                                    {/* Provider Embed Stream Notice & Guide */}
                                    {!isDirect && (
                                        <View style={styles.embedAudioInfoBox}>
                                            <Text style={styles.embedAudioInfoTitle}>🎛️ Provider Audio Controls</Text>
                                            <Text style={styles.embedAudioInfoText}>
                                                Loaded via {sourceName || 'external server'}. The provider stream includes embedded audio settings inside its player.
                                            </Text>
                                            <Text style={styles.embedAudioTip}>
                                                • <Text style={{ fontWeight: '700', color: '#FFF' }}>⚙️ In-Player Settings:</Text> Click the ⚙️ Gear icon in the bottom-right corner of the video player to switch audio languages and subtitles.
                                            </Text>
                                            <Text style={styles.embedAudioTip}>
                                                • <Text style={{ fontWeight: '700', color: '#FFF' }}>⚡ Server Switcher:</Text> Tap ⚡ Server in the top bar to try other servers that may offer localized releases.
                                            </Text>
                                            <Text style={styles.embedAudioTip}>
                                                • <Text style={{ fontWeight: '700', color: '#FFF' }}>⏏️ External Players:</Text> Tap ⬇ Download → Copy Stream Link to play in VLC or MX Player with full multi-audio channel control.
                                            </Text>
                                        </View>
                                    )}
                                </ScrollView>
                            </View>
                        )}
                    </View>

                    {/* External player handoff — VLC and friends */}
                    {isDirect && streamUrl ? (
                        <View style={[{ position: 'relative' }, isCompactTopBar && { display: 'none' }]}>
                            <TouchableOpacity
                                style={styles.pillButton}
                                onPress={() => setShowPlayerMenu(!showPlayerMenu)}
                            >
                                <Text style={styles.pillButtonText}>⏏ External</Text>
                            </TouchableOpacity>
                            {showPlayerMenu && (
                                <View style={styles.popupMenu}>
                                    <Text style={styles.popupMenuHeader}>Open in</Text>
                                    {playerApps.map((p) => (
                                        <TouchableOpacity
                                            key={p.id}
                                            style={styles.popupMenuItem}
                                            onPress={async () => {
                                                setShowPlayerMenu(false);
                                                const ok = await p.run(streamUrl, title);
                                                if (!ok) setPlayerHandoffFailed(true);
                                            }}
                                        >
                                            <Text style={styles.popupMenuText}>{p.label}</Text>
                                        </TouchableOpacity>
                                    ))}
                                    <TouchableOpacity
                                        style={styles.popupMenuItem}
                                        onPress={() => { setShowPlayerMenu(false); setShowPlayerMenu(false); }}
                                    >
                                        <Text style={[styles.popupMenuText, { color: COLORS.textMuted }]}>Cancel</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    ) : null}

                    {/* Offline Media Download Menu */}
                    {streamUrl ? (
                        <View style={[{ position: 'relative' }, isCompactTopBar && { display: 'none' }]}>
                            <TouchableOpacity
                                style={styles.pillButton}
                                onPress={() => setShowDownloadMenu(!showDownloadMenu)}
                                accessibilityLabel="Download video or audio for offline watching"
                            >
                                <Text style={styles.pillButtonText}>⬇ Download</Text>
                            </TouchableOpacity>
                            {showDownloadMenu && (
                                <View style={[styles.popupMenu, { minWidth: 260 }]}>
                                    <Text style={styles.popupMenuHeader}>Offline Download</Text>
                                    <TouchableOpacity
                                        style={styles.popupMenuItem}
                                        onPress={handleDownloadVideo}
                                    >
                                        <Text style={styles.popupMenuText}>⬇ Download Video File (MP4)</Text>
                                    </TouchableOpacity>
                                     <TouchableOpacity
                                         style={styles.popupMenuItem}
                                         onPress={handleOpenExternalDownloader}
                                     >
                                         <Text style={[styles.popupMenuText, { color: '#60A5FA' }]}>🚀 Open Downloader (1DM/ADM/VLC)</Text>
                                     </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.popupMenuItem}
                                        onPress={handleCopyStreamLink}
                                    >
                                        <Text style={styles.popupMenuText}>📋 Copy Stream Link (1DM, ADM, IDM)</Text>
                                    </TouchableOpacity>
                                    <View style={styles.popupMenuDivider} />
                                    <TouchableOpacity
                                        style={styles.popupMenuItem}
                                        onPress={() => setShowDownloadMenu(false)}
                                    >
                                        <Text style={[styles.popupMenuText, { color: COLORS.textMuted }]}>Cancel</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    ) : null}

                    {/* Episodes Drawer */}
                    {seasons.length > 0 && (
                        <TouchableOpacity
                            style={styles.pillButton}
                            onPress={() => setShowEpisodeDrawer(true)}
                        >
                            <Text style={styles.pillButtonText}>📑 Episodes</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Honest feedback when the browser took the fallback path, instead of
                    the old behaviour where a rejected requestFullscreen vanished into a
                    console.warn and the button just looked broken. */}
                {fullscreenNote ? (
                    <View style={styles.fullscreenNoteWrap} pointerEvents="none">
                        <Text style={styles.fullscreenNote}>{fullscreenNote}</Text>
                    </View>
                ) : null}
                {dubToast ? (
                    <View style={styles.fullscreenNoteWrap} pointerEvents="none">
                        <Text style={[styles.fullscreenNote, { backgroundColor: 'rgba(20, 20, 28, 0.95)', borderColor: COLORS.brand, borderWidth: 1 }]}>
                            {dubToast}
                        </Text>
                    </View>
                ) : null}
                {adBlockedToast ? (
                    <View style={styles.fullscreenNoteWrap} pointerEvents="none">
                        <Text style={[styles.fullscreenNote, { backgroundColor: 'rgba(15, 23, 42, 0.95)', borderColor: noAdsEnabled ? '#10B981' : '#EF4444', borderWidth: 1, shadowColor: noAdsEnabled ? '#10B981' : '#EF4444', shadowOpacity: 0.4, shadowRadius: 6 }]}>
                            {adBlockedToast}
                        </Text>
                    </View>
                ) : null}
            </View>

            {/* AdShield Sandbox Helper Line — allows user to bypass sandbox if embed stalls, then toggle back on */}
            {!isDirect && !adHelperDismissed && (
                <View
                    style={[
                        styles.adShieldHelperBar,
                        !noAdsEnabled && styles.adShieldHelperBarOff
                    ]}
                    pointerEvents="box-none"
                >
                    <View style={styles.adShieldHelperLeft}>
                        <Text style={styles.adShieldHelperText}>
                            {noAdsEnabled
                                ? "⚠️ Video stuck or can't play? Turn off AdShield (🛡️) → start video → turn back on."
                                : "🛡️ Video started? Turn AdShield back ON to block popups & ads."}
                        </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <TouchableOpacity
                            style={[
                                styles.adShieldHelperBtn,
                                !noAdsEnabled && styles.adShieldHelperBtnOn
                            ]}
                            onPress={handleToggleNoAds}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.adShieldHelperBtnText}>
                                {noAdsEnabled ? 'Turn Off AdShield' : 'Turn AdShield ON'}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.adShieldHelperDismissBtn}
                            onPress={() => setAdHelperDismissed(true)}
                            accessibilityLabel="Dismiss notice"
                        >
                            <Text style={styles.adShieldHelperDismissText}>✕</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Loading line — sits directly under the title bar so a slow provider is
                never a silent black rectangle. It carries the switcher with it,
                so the user can bail to another server without waiting out the
                timeout or going back to the title bar. */}
            {loadBarVisible ? (
                <View style={styles.loadStatusBar} pointerEvents="box-none">
                    <View style={styles.loadStatusLeft}>
                        {isLoadingContent ? <ActivityIndicator size="small" color={COLORS.brand} /> : null}
                        <Text style={styles.loadStatusText} numberOfLines={1}>
                            {isLoadingContent
                                ? `Loading ${sourceName || 'stream'}… ${loadSeconds}s`
                                : `Playing via ${sourceName || 'this server'}`}
                        </Text>
                    </View>

                    {mirrorList.length > 1 ? (
                        <View style={styles.loadStatusMenuWrap}>
                            <TouchableOpacity
                                style={styles.loadStatusBtn}
                                onPress={() => setShowLoadServerMenu(v => !v)}
                                accessibilityLabel="Change stream server"
                            >
                                <Text style={styles.loadStatusBtnText}>
                                    {showLoadServerMenu ? 'Close' : 'Change'}
                                </Text>
                            </TouchableOpacity>

                            {showLoadServerMenu ? (
                                <View style={styles.popupMenu}>
                                    <Text style={styles.popupMenuHeader}>Change player</Text>
                                    {mirrorList.map((m, idx) => (
                                        <TouchableOpacity
                                            key={idx}
                                            style={[styles.popupMenuItem, idx === activeMirrorIdx && styles.popupMenuItemActive]}
                                            onPress={() => {
                                                setShowLoadServerMenu(false);
                                                if (onSelectMirror) onSelectMirror(m, idx);
                                            }}
                                        >
                                            <Text style={[styles.popupMenuText, idx === activeMirrorIdx && styles.popupMenuTextActive]}>
                                                {idx === activeMirrorIdx ? '▶ ' : ''}{m.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            ) : null}
                        </View>
                    ) : null}
                </View>
            ) : null}

            {!isDirect && embedState === 'stalled' && mirrorList && mirrorList.length > 1 ? (
                <View style={styles.failoverBar}>
                    <Text style={styles.failoverText}>
                        Still nothing after 20s. This server may not have this episode.
                    </Text>
                    <TouchableOpacity style={styles.failoverBtn} onPress={keepWaiting}>
                        <Text style={styles.failoverBtnText}>Keep waiting</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.failoverBtn} onPress={tryNextMirror}>
                        <Text style={styles.failoverBtnText}>Try next server</Text>
                    </TouchableOpacity>
                    {onBack ? (
                        <TouchableOpacity style={styles.failoverBtn} onPress={onBack}>
                            <Text style={styles.failoverBtnText}>Back</Text>
                        </TouchableOpacity>
                    ) : null}
                </View>
            ) : null}

            {(notice || playerHandoffFailed) && noticeVisible ? (
                <View style={styles.noticeBar} pointerEvents="none">
                    <View style={styles.noticePill}>
                        <Text style={styles.noticeText}>
                            {playerHandoffFailed
                                ? "Couldn't find a player app for this stream."
                                : 'Provider player · no direct stream available'}
                        </Text>
                    </View>
                </View>
            ) : null}

            {/* Transport controls — only meaningful when we own the decode.
                A cross-origin iframe keeps its own controls. */}
            {isDirect && (
                <View
                    style={[
                        styles.controlsOverlay,
                        controlsVisible ? styles.controlsOverlayVisible : styles.controlsOverlayHidden
                    ]}
                >
                    {/* Center Action Controls */}
                    <View style={styles.centerControlArea}>
                        {isBuffering ? (
                            <ActivityIndicator size="large" color={COLORS.brand} style={{ transform: [{ scale: 1.5 }] }} />
                        ) : (
                            <View style={styles.centerButtonRow}>
                                <TouchableOpacity
                                    style={styles.skipButton}
                                    onPress={() => seekRelative(-10)}
                                    accessibilityLabel="Rewind 10 seconds"
                                >
                                    <Text style={styles.skipButtonText}>↺ 10</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.playPauseButton}
                                    onPress={togglePlay}
                                    accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
                                >
                                    <Text style={styles.playPauseIcon}>
                                        {isPlaying ? '❚❚' : '▶'}
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.skipButton}
                                    onPress={() => seekRelative(10)}
                                    accessibilityLabel="Fast forward 10 seconds"
                                >
                                    <Text style={styles.skipButtonText}>10 ↻</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    {/* Bottom Control Bar */}
                    <View style={styles.bottomControlBar}>
                        {/* Interactive Scrubber Bar */}
                        <div
                            style={{
                                width: '100%',
                                height: 24,
                                position: 'relative',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                            }}
                            onClick={handleScrub}
                            onMouseMove={handleScrubHover}
                            onMouseLeave={() => { setHoverTime(null); setHoverPos(null); }}
                        >
                            {/* Track background */}
                            <div style={{
                                width: '100%',
                                height: 4,
                                backgroundColor: 'rgba(255, 255, 255, 0.25)',
                                borderRadius: 2,
                                position: 'relative',
                            }}>
                                {/* Buffered Bar */}
                                <div style={{
                                    position: 'absolute',
                                    left: 0,
                                    top: 0,
                                    bottom: 0,
                                    width: `${duration > 0 ? (buffered / duration) * 100 : 0}%`,
                                    backgroundColor: 'rgba(255, 255, 255, 0.4)',
                                    borderRadius: 2,
                                }} />

                                {/* Played Progress Bar */}
                                <div style={{
                                    position: 'absolute',
                                    left: 0,
                                    top: 0,
                                    bottom: 0,
                                    width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                                    backgroundColor: COLORS.brand,
                                    borderRadius: 2,
                                }}>
                                    {/* Thumb Handle */}
                                    <div style={{
                                        position: 'absolute',
                                        right: -6,
                                        top: -4,
                                        width: 12,
                                        height: 12,
                                        borderRadius: '50%',
                                        backgroundColor: '#FFFFFF',
                                        boxShadow: '0 0 6px rgba(0, 0, 0, 0.8)',
                                    }} />
                                </div>
                            </div>

                            {/* Hover Tooltip */}
                            {hoverTime !== null && hoverPos !== null && (
                                <div style={{
                                    position: 'absolute',
                                    left: `${hoverPos}%`,
                                    transform: 'translateX(-50%)',
                                    bottom: 22,
                                    backgroundColor: 'rgba(20, 20, 20, 0.95)',
                                    color: '#FFFFFF',
                                    padding: '3px 8px',
                                    borderRadius: 4,
                                    fontSize: 11,
                                    fontWeight: 'bold',
                                    pointerEvents: 'none',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                }}>
                                    {formatTime(hoverTime)}
                                </div>
                            )}
                        </div>

                        {/* Controls Bottom Row */}
                        <View style={styles.bottomControlsRow}>
                            <View style={styles.bottomLeftControls}>
                                <TouchableOpacity onPress={togglePlay} style={styles.iconBtn}>
                                    <Text style={styles.iconBtnText}>{isPlaying ? '❚❚' : '▶'}</Text>
                                </TouchableOpacity>

                                <TouchableOpacity onPress={toggleMute} style={styles.iconBtn}>
                                    <Text style={styles.iconBtnText}>{isMuted ? '🔇' : volume > 0.5 ? '🔊' : '🔉'}</Text>
                                </TouchableOpacity>

                                {/* Volume Slider */}
                                <div style={{ width: 70, display: 'flex', alignItems: 'center', marginRight: 12 }}>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        value={isMuted ? 0 : volume}
                                        onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                                        style={{ width: '100%', accentColor: COLORS.brand, cursor: 'pointer' }}
                                    />
                                </div>

                                <Text style={styles.timeDisplay}>
                                    {formatTime(currentTime)} / {formatTime(duration)}
                                </Text>
                            </View>

                            <View style={styles.bottomRightControls}>
                                {/* Playback Speed Selector */}
                                <View style={[{ position: 'relative' }, isCompactTopBar && { display: 'none' }]}>
                                    <TouchableOpacity
                                        style={styles.textOptionBtn}
                                        onPress={() => setShowSpeedMenu(!showSpeedMenu)}
                                    >
                                        <Text style={styles.textOptionBtnText}>{playbackRate}x</Text>
                                    </TouchableOpacity>
                                    {showSpeedMenu && (
                                        <View style={[styles.popupMenu, { bottom: 40, right: 0 }]}>
                                            <Text style={styles.popupMenuHeader}>Playback Speed</Text>
                                            {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map(rate => (
                                                <TouchableOpacity
                                                    key={rate}
                                                    style={[styles.popupMenuItem, playbackRate === rate && styles.popupMenuItemActive]}
                                                    onPress={() => handleSetRate(rate)}
                                                >
                                                    <Text style={[styles.popupMenuText, playbackRate === rate && styles.popupMenuTextActive]}>
                                                        {rate === 1 ? '1.0x (Normal)' : `${rate}x`}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    )}
                                </View>

                                {/* Quality Selector */}
                                {qualityLevels.length > 0 && (
                                    <View style={[{ position: 'relative' }, isCompactTopBar && { display: 'none' }]}>
                                        <TouchableOpacity
                                            style={styles.textOptionBtn}
                                            onPress={() => setShowQualityMenu(!showQualityMenu)}
                                        >
                                            <Text style={styles.textOptionBtnText}>
                                                {activeQualityIdx === -1 ? 'Auto' : `${qualityLevels[activeQualityIdx]?.height}p`}
                                            </Text>
                                        </TouchableOpacity>
                                        {showQualityMenu && (
                                            <View style={[styles.popupMenu, { bottom: 40, right: 0 }]}>
                                                <Text style={styles.popupMenuHeader}>Quality</Text>
                                                <TouchableOpacity
                                                    style={[styles.popupMenuItem, activeQualityIdx === -1 && styles.popupMenuItemActive]}
                                                    onPress={() => handleSetQuality(-1)}
                                                >
                                                    <Text style={[styles.popupMenuText, activeQualityIdx === -1 && styles.popupMenuTextActive]}>
                                                        Auto (Adaptive)
                                                    </Text>
                                                </TouchableOpacity>
                                                {qualityLevels.map(lvl => (
                                                    <TouchableOpacity
                                                        key={lvl.idx}
                                                        style={[styles.popupMenuItem, activeQualityIdx === lvl.idx && styles.popupMenuItemActive]}
                                                        onPress={() => handleSetQuality(lvl.idx)}
                                                    >
                                                        <Text style={[styles.popupMenuText, activeQualityIdx === lvl.idx && styles.popupMenuTextActive]}>
                                                            {lvl.label}
                                                        </Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                        )}
                                    </View>
                                )}

                                {/* Next Episode Button */}
                                {hasNextEp && (
                                    <TouchableOpacity
                                        style={styles.nextEpBtn}
                                        onPress={onNextEpisode}
                                    >
                                        <Text style={styles.nextEpBtnText}>Next Ep ⏭</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    </View>
                </View>
            )}
            {/* Netflix-Style Binge Watch Next Episode Countdown Card */}
            {showBingeCard && nextEpObj && (
                <View style={styles.bingeCard}>
                    <View style={styles.bingeHeaderRow}>
                        <Text style={styles.bingeTag}>NEXT EPISODE IN {bingeCountdown}s</Text>
                        <TouchableOpacity onPress={() => { setShowBingeCard(false); setBingeDismissed(true); }}>
                            <Text style={styles.bingeDismissText}>✕</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.bingeTitle} numberOfLines={1}>
                        S{nextEpObj.season_number || season}:E{nextEpObj.episode_number} - {nextEpObj.name || 'Next Episode'}
                    </Text>
                    <View style={styles.bingeBtnRow}>
                        <TouchableOpacity
                            style={styles.bingePlayNowBtn}
                            onPress={() => {
                                setShowBingeCard(false);
                                if (onNextEpisode) onNextEpisode();
                            }}
                        >
                            <Text style={styles.bingePlayNowText}>▶ Play Now</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.bingeCreditsBtn}
                            onPress={() => {
                                setShowBingeCard(false);
                                setBingeDismissed(true);
                            }}
                        >
                            <Text style={styles.bingeCreditsText}>Watch Credits</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        height: '100%',
        backgroundColor: '#000000',
        position: 'relative',
        overflow: 'hidden',
    },
    containerFullscreen: {
        /* position:fixed is the point of this rule — the player normally sits inside
           several overflow:hidden navigation wrappers, so 100vw/100vh alone would be
           clipped. This is the fallback for browsers with no fullscreen API (iPhone). */
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
    },
    controlsOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        justifyContent: 'space-between',
        padding: 20,
        transition: 'opacity 0.3s ease',
        zIndex: 10,
    },
    controlsOverlayVisible: {
        opacity: 1,
        pointerEvents: 'auto',
    },
    controlsOverlayHidden: {
        opacity: 0,
        pointerEvents: 'none',
    },
    failoverBar: {
        position: 'absolute',
        top: 60,
        left: 16,
        right: 16,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(20, 20, 24, 0.96)',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        paddingVertical: 10,
        paddingHorizontal: 14,
        zIndex: 35,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.6)',
    },
    failoverText: { color: '#E6E6EC', fontSize: 13, flex: 1 },
    failoverBtn: {
        backgroundColor: COLORS.brand,
        borderRadius: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        marginLeft: 8,
    },
    failoverBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },

    // Slim line under the title bar. Deliberately not the failover bar: that
    // one is a modal-looking block that only appears on timeout, and it sits at
    // top:60 which collides with this. This is the "still working on it" line.
    loadStatusBar: {
        position: 'absolute',
        top: 56,
        left: 12,
        right: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(16, 16, 20, 0.92)',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.14)',
        paddingVertical: 7,
        paddingLeft: 12,
        paddingRight: 7,
        zIndex: 30,
    },
    loadStatusLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        minWidth: 0,
        marginRight: 10,
    },
    loadStatusText: {
        color: '#E6E6EC',
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 8,
        flexShrink: 1,
    },
    loadStatusMenuWrap: {
        position: 'relative',
        flexShrink: 0,
    },
    loadStatusBtn: {
        backgroundColor: COLORS.brand,
        borderRadius: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    loadStatusBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
    noticeBar: {
        position: 'absolute',
        top: 10,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 25,
    },
    // A small pill rather than a full-width black bar. The old version spanned
    // the whole player and read as a broken subtitle track.
    noticePill: {
        backgroundColor: 'rgba(14, 14, 18, 0.72)',
        borderRadius: 999,
        paddingVertical: 5,
        paddingHorizontal: 12,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.14)',
    },
    noticeText: {
        color: '#B9B9C4',
        fontSize: 11,
        lineHeight: 15,
    },
    topControlBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 35,
        backgroundColor: 'rgba(10, 10, 14, 0.88)',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingTop: 12,
        paddingBottom: 8,
        transition: 'transform 0.32s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.32s ease',
    },
    topControlBarVisible: {
        transform: [{ translateY: 0 }],
        opacity: 1,
    },
    topControlBarHidden: {
        transform: [{ translateY: -70 }],
        opacity: 0,
    },
    topTriggerZone: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 52,
        zIndex: 34,
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: 8,
    },
    minimizedPill: {
        backgroundColor: 'rgba(15, 16, 23, 0.78)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.22)',
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 6,
        backdropFilter: 'blur(8px)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.5,
        shadowRadius: 6,
        elevation: 6,
    },
    minimizedPillText: {
        color: 'rgba(255, 255, 255, 0.95)',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.4,
    },
    cursorHidden: {
        cursor: 'none',
    },
    backBtn: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        backgroundColor: 'rgba(20, 20, 20, 0.75)',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
    },
    backBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
    titleInfo: {
        flex: 1,
        /* Without minWidth:0 a long title refuses to shrink below its content
           width in a flex row and pushes the right-hand controls off. */
        minWidth: 0,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        gap: 8,
    },
    titleText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '800',
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
        flexShrink: 1,
    },
    episodeBadge: {
        color: COLORS.brand,
        backgroundColor: 'rgba(229, 9, 20, 0.15)',
        borderColor: 'rgba(229, 9, 20, 0.4)',
        borderWidth: 1,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
        fontSize: 12,
        fontWeight: '800',
    },
    noAdsToggleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 5,
        alignSelf: 'center',
        borderWidth: 1,
        gap: 4,
    },
    noAdsToggleBtnOn: {
        backgroundColor: 'rgba(16, 185, 129, 0.22)',
        borderColor: '#10B981',
    },
    noAdsToggleBtnOff: {
        backgroundColor: 'rgba(239, 68, 68, 0.18)',
        borderColor: 'rgba(239, 68, 68, 0.5)',
    },
    noAdsToggleIcon: {
        fontSize: 10,
    },
    noAdsToggleText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    noAdsToggleTextOn: {
        color: '#34D399',
    },
    noAdsToggleTextOff: {
        color: '#FCA5A5',
    },
    blockedBadge: {
        backgroundColor: '#10B981',
        borderRadius: 8,
        paddingHorizontal: 5,
        paddingVertical: 1,
        marginLeft: 2,
    },
    blockedBadgeText: {
        color: '#000000',
        fontSize: 9,
        fontWeight: '900',
    },
    fullscreenNoteWrap: {
        position: 'absolute',
        top: 64,
        left: 16,
        right: 16,
        alignItems: 'center',
        zIndex: 20,
    },
    fullscreenNote: {
        color: '#ffffff',
        backgroundColor: 'rgba(20, 20, 24, 0.92)',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
        fontSize: 12,
        overflow: 'hidden',
    },
    topRightControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        /* Never let the title squeeze these controls — this is what collapsed
           the fullscreen button to a sliver. */
        flexShrink: 0,
        marginLeft: 8,
    },
    pillButton: {
        backgroundColor: 'rgba(20, 20, 20, 0.75)',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        flexShrink: 0,
    },
    pillButtonActive: {
        borderColor: COLORS.brand,
        backgroundColor: 'rgba(229, 9, 20, 0.25)',
    },
    pillButtonText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    popupMenu: {
        position: 'absolute',
        top: 40,
        right: 0,
        width: 200,
        backgroundColor: 'rgba(20, 20, 20, 0.95)',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        padding: 8,
        zIndex: 50,
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
    },
    audioPopupMenu: {
        width: 270,
        maxHeight: 380,
    },
    audioActiveBox: {
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        borderRadius: 6,
        padding: 8,
        marginVertical: 4,
        borderLeftWidth: 3,
        borderLeftColor: COLORS.brand,
    },
    audioActiveLabel: {
        color: '#8A8A98',
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    audioActiveValue: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
        marginTop: 2,
    },
    subDubPill: {
        flex: 1,
        paddingVertical: 6,
        borderRadius: 4,
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
    },
    subDubPillActive: {
        backgroundColor: 'rgba(229, 9, 20, 0.25)',
        borderColor: COLORS.brand,
    },
    subDubPillText: {
        color: '#CCCCCC',
        fontSize: 11,
        fontWeight: '700',
    },
    subDubPillTextActive: {
        color: '#FFFFFF',
        fontWeight: '800',
    },
    popupMenuSubheader: {
        color: '#8A8A98',
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        paddingHorizontal: 8,
        paddingTop: 8,
        paddingBottom: 3,
    },
    dubAudioDownloadItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 6,
        paddingHorizontal: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        marginVertical: 3,
    },
    dubAudioDownloadItemLabel: {
        color: '#E0E0E0',
        fontSize: 11,
        fontWeight: '600',
    },
    dubAudioDownloadBadge: {
        color: '#60A5FA',
        fontSize: 10,
        fontWeight: '700',
        backgroundColor: 'rgba(59, 130, 246, 0.18)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 3,
    },
    audioChipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        paddingHorizontal: 4,
        marginVertical: 4,
    },
    audioChip: {
        paddingVertical: 5,
        paddingHorizontal: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
    },
    audioChipActive: {
        backgroundColor: 'rgba(229, 9, 20, 0.25)',
        borderColor: COLORS.brand,
    },
    audioChipText: {
        color: '#CCCCCC',
        fontSize: 11,
        fontWeight: '600',
    },
    audioChipTextActive: {
        color: '#FFFFFF',
        fontWeight: '800',
    },
    popupMenuDivider: {
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        marginVertical: 6,
    },
    popupMenuHint: {
        color: '#8A8A98',
        fontSize: 10,
        fontStyle: 'italic',
        paddingHorizontal: 8,
        paddingVertical: 4,
        lineHeight: 14,
    },
    embedAudioInfoBox: {
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderRadius: 6,
        padding: 10,
        marginVertical: 6,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    embedAudioInfoTitle: {
        color: '#F59E0B',
        fontSize: 11,
        fontWeight: '800',
        marginBottom: 4,
    },
    embedAudioInfoText: {
        color: '#CCCCCC',
        fontSize: 11,
        lineHeight: 16,
        marginBottom: 6,
    },
    embedAudioTip: {
        color: '#9CA3AF',
        fontSize: 10,
        lineHeight: 15,
        marginTop: 4,
    },
    popupMenuHeader: {
        color: COLORS.textMuted,
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
        marginBottom: 4,
    },
    popupMenuItem: {
        paddingVertical: 8,
        paddingHorizontal: 8,
        borderRadius: 4,
    },
    popupMenuItemActive: {
        backgroundColor: 'rgba(229, 9, 20, 0.25)',
    },
    popupMenuText: {
        color: COLORS.textSecondary,
        fontSize: 12,
        fontWeight: '600',
    },
    popupMenuTextActive: {
        color: '#FFFFFF',
        fontWeight: '800',
    },
    centerControlArea: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    centerButtonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 36,
    },
    skipButton: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: 'rgba(20, 20, 20, 0.65)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
    },
    skipButtonText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '800',
    },
    playPauseButton: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: COLORS.brand,
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 20px rgba(229, 9, 20, 0.6)',
    },
    playPauseIcon: {
        color: '#FFFFFF',
        fontSize: 26,
        fontWeight: '900',
        marginLeft: 2,
    },
    bottomControlBar: {
        paddingHorizontal: 8,
        paddingBottom: 8,
    },
    bottomControlsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 6,
    },
    bottomLeftControls: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    bottomRightControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    iconBtn: {
        /* Explicit size + flexShrink:0. Without these the button collapses to a
           few pixels wide inside topRightControls whenever the title is long —
           it was rendering, but crushed to an untappable sliver. */
        width: 36,
        height: 36,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
    },
    iconBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        lineHeight: 20,
        textAlign: 'center',
    },
    timeDisplay: {
        color: '#CCCCCC',
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 6,
    },
    textOptionBtn: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    textOptionBtnText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '700',
    },
    nextEpBtn: {
        backgroundColor: COLORS.brand,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 4,
    },
    nextEpBtnText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '800',
    },
    episodeDrawer: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width: 340,
        backgroundColor: 'rgba(15, 15, 15, 0.96)',
        backdropFilter: 'blur(16px)',
        zIndex: 100,
        borderLeftWidth: 1,
        borderLeftColor: 'rgba(255, 255, 255, 0.12)',
        display: 'flex',
        flexDirection: 'column',
    },
    drawerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    drawerTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '800',
    },
    drawerCloseBtn: {
        padding: 6,
    },
    drawerCloseText: {
        color: COLORS.textMuted,
        fontSize: 18,
        fontWeight: '700',
    },
    drawerSeasonTabs: {
        flexDirection: 'row',
        paddingHorizontal: 12,
        paddingVertical: 10,
        gap: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    },
    drawerSeasonTab: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
    },
    drawerSeasonTabActive: {
        backgroundColor: COLORS.brand,
    },
    drawerSeasonTabText: {
        color: COLORS.textSecondary,
        fontSize: 12,
        fontWeight: '700',
    },
    drawerSeasonTabTextActive: {
        color: '#FFFFFF',
    },
    drawerEpisodeList: {
        flex: 1,
        padding: 12,
    },
    drawerEmpty: {
        color: COLORS.textMuted,
        fontSize: 12,
        paddingVertical: 18,
        textAlign: 'center',
    },
    drawerEpCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    drawerEpCardActive: {
        borderColor: COLORS.brand,
        backgroundColor: 'rgba(229, 9, 20, 0.12)',
    },
    drawerEpBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    drawerEpBadgeText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '800',
    },
    drawerEpName: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
    },
    drawerEpOverview: {
        color: COLORS.textMuted,
        fontSize: 11,
        marginTop: 2,
    },
    nowPlayingText: {
        color: COLORS.brand,
        fontSize: 11,
        fontWeight: '800',
    },
    bingeCard: {
        position: 'absolute',
        bottom: 80,
        right: 24,
        width: 300,
        backgroundColor: 'rgba(15, 15, 15, 0.95)',
        borderRadius: 8,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        zIndex: 50,
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.7)',
    },
    bingeHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    bingeTag: {
        color: COLORS.brand,
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    bingeDismissText: {
        color: COLORS.textMuted,
        fontSize: 14,
        fontWeight: '700',
    },
    bingeTitle: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 12,
    },
    bingeBtnRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    bingePlayNowBtn: {
        flex: 1,
        backgroundColor: COLORS.brand,
        paddingVertical: 8,
        borderRadius: 4,
        alignItems: 'center',
    },
    bingePlayNowText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '800',
    },
    bingeCreditsBtn: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    bingeCreditsText: {
        color: COLORS.textSecondary,
        fontSize: 11,
        fontWeight: '600',
    },
    adShieldHelperBar: {
        position: 'absolute',
        top: 56,
        left: 12,
        right: 12,
        zIndex: 45,
        backgroundColor: 'rgba(15, 23, 42, 0.94)',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(234, 179, 8, 0.5)',
        paddingVertical: 6,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 8,
    },
    adShieldHelperBarOff: {
        borderColor: 'rgba(16, 185, 129, 0.5)',
        backgroundColor: 'rgba(6, 78, 59, 0.94)',
    },
    adShieldHelperLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        minWidth: 200,
        gap: 6,
    },
    adShieldHelperText: {
        color: '#F9FAFB',
        fontSize: 12,
        fontWeight: '600',
        lineHeight: 16,
    },
    adShieldHelperBtn: {
        backgroundColor: '#EAB308',
        paddingVertical: 5,
        paddingHorizontal: 12,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    adShieldHelperBtnOn: {
        backgroundColor: '#10B981',
    },
    adShieldHelperBtnText: {
        color: '#000000',
        fontSize: 11,
        fontWeight: '800',
    },
    adShieldHelperDismissBtn: {
        padding: 4,
        marginLeft: 4,
    },
    adShieldHelperDismissText: {
        color: '#9CA3AF',
        fontSize: 14,
        fontWeight: '700',
    },
});
