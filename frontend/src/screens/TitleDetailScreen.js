import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    SafeAreaView, ActivityIndicator, Alert, useWindowDimensions, Modal, Pressable, Linking, Image
} from 'react-native';
import { COLORS } from '../theme/colors';
import AppHeader from '../components/AppHeader';
import MobileTabBar from '../components/MobileTabBar';
import Poster from '../components/Poster';
import MediaCard from '../components/MediaCard';
import { getApiBase } from '../utils/api';
import { WatchlistAPI, HistoryAPI } from '../utils/storage';
import { useRouteMeta } from '../utils/useRouteMeta';

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

function formatLanguage(l) {
    if (!l) return '';
    if (typeof l === 'string') {
        const code = l.toLowerCase().trim();
        return LANGUAGE_NAMES[code] || l.toUpperCase();
    }
    const code = String(l.code || l.iso || l.language || '').toLowerCase().trim();
    return l.label || l.name || LANGUAGE_NAMES[code] || (code ? code.toUpperCase() : '');
}

export default function TitleDetailScreen({ route, navigation }) {
    // Support both navigation patterns:
    //   - in-app:    route.params.item is a populated MediaItem-like object
    //   - deep link: route.params.slug (or route.params.id) is the only source
    //                — we resolve by slug via GET /api/v1/title/{slug}
    const params = route.params || {};
    const initialItem = params.item;
    const slugFromUrl = params.slug || params.id || null;

    const { width } = useWindowDimensions();
    const isDesktop = width >= 768;

    const titleKey = slugFromUrl || initialItem?.slug || initialItem?.id;
    const [item, setItem] = useState(initialItem || null);
    const [seasons, setSeasons] = useState([]);
    const [loadingSeasons, setLoadingSeasons] = useState(false);
    const [activeSeasonNum, setActiveSeasonNum] = useState(1);
    const [cast, setCast] = useState([]);
    const [similar, setSimilar] = useState([]);
    const [franchise, setFranchise] = useState(null);
    const [relatedBlogs, setRelatedBlogs] = useState([]);
    const [inWatchlist, setInWatchlist] = useState(false);
    const [loadingDetail, setLoadingDetail] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [trailerUrl, setTrailerUrl] = useState(null);
    const [dubModalVisible, setDubModalVisible] = useState(false);
    const [downloadModalVisible, setDownloadModalVisible] = useState(false);
    const [selectedDownloadEpisode, setSelectedDownloadEpisode] = useState(null);
    const [copyToast, setCopyToast] = useState(null);

    // Inject the YouTube iframe imperatively after mount (RN Web View doesn't render <iframe> children).
    const trailerHostRef = useRef(null);
    useEffect(() => {
        if (trailerHostRef.current && typeof document !== 'undefined') {
            if (trailerUrl) {
                const safeUrl = trailerUrl.replace(/"/g, '&quot;');
                const safeTitle = (item?.title || 'Trailer').replace(/"/g, '&quot;');
                trailerHostRef.current.innerHTML =
                    `<iframe src="${safeUrl}" style="position:absolute;inset:0;width:100%;height:100%;border:0;display:block;background:#000" allow="autoplay; encrypted-media; accelerometer; gyroscope; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin" title="${safeTitle} — YouTube embed"></iframe>`;
            } else {
                trailerHostRef.current.innerHTML = '';
            }
        }
    }, [trailerUrl, item?.title]);

    useRouteMeta('TitleDetail', item);

    const isEpisodic = (item?.type || initialItem?.type) === 'tv' ||
        (item?.type || initialItem?.type) === 'short_drama' ||
        (item?.is_anime === 1 || initialItem?.is_anime === 1) ||
        (item?.isAnime === true || initialItem?.isAnime === true) ||
        (item?.seasonCount != null && item.seasonCount > 0) ||
        (initialItem?.seasonCount != null && initialItem.seasonCount > 0) ||
        (Array.isArray(item?.seasons) && item.seasons.length > 0) ||
        ((item?.type || initialItem?.type) === 'anime' && (
            (item?.seasonCount != null && item.seasonCount > 0) ||
            (initialItem?.seasonCount != null && initialItem.seasonCount > 0) ||
            (Array.isArray(item?.seasons) && item.seasons.length > 0)
        ));

    useEffect(() => {
        let cancelled = false;
        async function load() {
            setLoadingDetail(true);
            setLoadError(null);
            setItem(initialItem || null);
            setSeasons([]);
            setLoadingSeasons(true);
            setCast([]);
            setSimilar([]);
            setFranchise(null);
            setRelatedBlogs([]);
            try {
                // 1. Fetch full title detail (works for both ID and slug)
                const detailRes = await fetch(`${getApiBase()}/title/${encodeURIComponent(titleKey)}`);
                if (!detailRes.ok) {
                    if (!cancelled) {
                        setLoadError(detailRes.status === 404 ? 'not_found' : `http_${detailRes.status}`);
                        setLoadingSeasons(false);
                    }
                    return;
                }
                const detailData = await detailRes.json();
                if (cancelled) return;

                setItem(detailData);
                setInWatchlist(
                    WatchlistAPI.isSaved(detailData.id) ||
                    WatchlistAPI.isSaved(detailData.slug) ||
                    WatchlistAPI.isSaved(titleKey)
                );

                // 4. Fetch similar titles
                const firstGenre = detailData.genres && detailData.genres[0]
                    ? (detailData.genres[0].slug || detailData.genres[0])
                    : null;
                if (firstGenre) {
                    fetch(`${getApiBase()}/titles?genre=${encodeURIComponent(firstGenre)}&page_size=8`)
                        .then(r => r.json())
                        .then(simData => {
                            if (!cancelled) setSimilar((simData.items || []).filter(t => t.id !== detailData.id));
                        })
                        .catch(() => {});
                }

                // Helper to order and select active season
                const setupSeasons = (rawSeasons) => {
                    if (!Array.isArray(rawSeasons) || rawSeasons.length === 0) return false;
                    const regular = rawSeasons.filter(s => s && s.season_number > 0).sort((a, b) => a.season_number - b.season_number);
                    const specials = rawSeasons.filter(s => s && s.season_number === 0);
                    const ordered = [...regular, ...specials];
                    if (ordered.length === 0) return false;
                    setSeasons(ordered);
                    const now = new Date();
                    const releasedRegular = regular.find(s => {
                        if (s.air_date && new Date(s.air_date) <= now) return true;
                        if (Array.isArray(s.episodes) && s.episodes.some(ep => !ep.air_date || new Date(ep.air_date) <= now)) return true;
                        return !s.air_date;
                    });
                    setActiveSeasonNum(releasedRegular ? releasedRegular.season_number : (regular.length > 0 ? regular[0].season_number : ordered[0].season_number));
                    return true;
                };

                const synthesizeSeasons = (titleObj) => {
                    const sCount = Math.max(1, typeof titleObj.seasonCount === 'number' && titleObj.seasonCount > 0 ? titleObj.seasonCount : 1);
                    const synths = [];
                    for (let sn = 1; sn <= sCount; sn++) {
                        const eps = [];
                        const epCount = 8;
                        for (let en = 1; en <= epCount; en++) {
                            eps.push({
                                id: ((titleObj.id || 1) * 1000) + (sn * 100) + en,
                                episode_number: en,
                                name: `Episode ${en}`,
                                overview: `${titleObj.title || 'Series'} - Season ${sn}, Episode ${en}`,
                                thumbnail: titleObj.backdrop || titleObj.poster || null,
                                air_date: null,
                                runtime: titleObj.runtime || 45,
                            });
                        }
                        synths.push({
                            id: ((titleObj.id || 1) * 100) + sn,
                            season_number: sn,
                            name: `Season ${sn}`,
                            overview: `${titleObj.title || 'Series'} Season ${sn}`,
                            poster: titleObj.poster || null,
                            air_date: null,
                            episode_count: epCount,
                            episodes: eps,
                        });
                    }
                    return synths;
                };

                // 2. If episodic, fetch seasons and episodes
                const isEp = detailData.type === 'tv' ||
                    detailData.type === 'short_drama' ||
                    detailData.is_anime === 1 ||
                    detailData.isAnime === true ||
                    (detailData.type === 'anime' && (
                        (detailData.seasonCount != null && detailData.seasonCount > 0) ||
                        (Array.isArray(detailData.seasons) && detailData.seasons.length > 0)
                    )) ||
                    (typeof detailData.seasonCount === 'number' && detailData.seasonCount > 0);

                if (isEp) {
                    // Try seasons already attached to detailData first
                    let hasSeasons = setupSeasons(detailData.seasons);
                    if (!hasSeasons) {
                        try {
                            const seasonsRes = await fetch(`${getApiBase()}/title/${encodeURIComponent(titleKey)}/seasons`);
                            if (seasonsRes.ok) {
                                const sData = await seasonsRes.json();
                                const seasonsList = Array.isArray(sData) ? sData : (Array.isArray(sData?.seasons) ? sData.seasons : []);
                                if (!cancelled && seasonsList.length > 0) {
                                    hasSeasons = setupSeasons(seasonsList);
                                }
                            }
                        } catch (e) {
                            console.warn('[TitleDetailScreen] seasons fetch error:', e);
                        }
                    }

                    // If still empty, synthesize seasons based on seasonCount so episodes ALWAYS display and play
                    if (!hasSeasons && !cancelled) {
                        const synths = synthesizeSeasons(detailData);
                        setupSeasons(synths);
                    }
                    if (!cancelled) setLoadingSeasons(false);
                } else {
                    if (!cancelled) setLoadingSeasons(false);
                }

                // 3. Fetch cast
                const castRes = await fetch(`${getApiBase()}/title/${encodeURIComponent(titleKey)}/cast`);
                if (castRes.ok) {
                    const castData = await castRes.json();
                    if (!cancelled) {
                        setCast(castData.cast || []);
                    }
                }

                // 4. Fetch franchise / collection (movies only)
                if (detailData.type === 'movie') {
                    fetch(`${getApiBase()}/title/${encodeURIComponent(titleKey)}/franchise`)
                        .then(r => r.ok ? r.json() : null)
                        .then(frData => {
                            if (!cancelled && frData && frData.collection) {
                                setFranchise(frData);
                            }
                        })
                        .catch(() => { /* swallow */ });
                }

                // 5. Fetch related showbiz editorial blogs (Reverse Backlink)
                fetch(`${getApiBase()}/blogs`)
                    .then(r => r.ok ? r.json() : null)
                    .then(bData => {
                        if (!cancelled && bData) {
                            const list = Array.isArray(bData) ? bData : (bData.items || bData.blogs || []);
                            const targetTitle = (detailData.title || '').toLowerCase();

                            const matches = list.filter(b => {
                                const bTitle = (b.title || '').toLowerCase();
                                const bDesc = (b.meta_description || '').toLowerCase();
                                const bTags = (b.tags || []).map(t => String(t).toLowerCase());

                                if (targetTitle.length > 3 && (bTitle.includes(targetTitle) || bDesc.includes(targetTitle) || bTags.some(t => t.includes(targetTitle)))) {
                                    return true;
                                }
                                if (detailData.type === 'anime' && b.category === 'anime') return true;
                                if ((detailData.type === 'short_drama' || detailData.is_short_drama) && b.category === 'short-dramas') return true;
                                return false;
                            });

                            const finalGuides = matches.length > 0 ? matches.slice(0, 3) : list.slice(0, 2);
                            setRelatedBlogs(finalGuides);
                        }
                    })
                    .catch(() => {});
            } catch (err) {
                console.error('[TitleDetailScreen] load error:', err);
            } finally {
                if (!cancelled) setLoadingDetail(false);
            }
        }

        load();
        setInWatchlist(WatchlistAPI.isSaved(titleKey));
        return () => { cancelled = true; };
    }, [titleKey]);

    const activeSeason = seasons.find(s => s.season_number === activeSeasonNum) || seasons.find(s => s.season_number > 0) || seasons[0] || null;
    const episodes = activeSeason?.episodes || [];

    const episodeOffset = useMemo(() => {
        if (!activeSeason || activeSeason.season_number <= 0) return 0;
        let offset = 0;
        for (const s of seasons) {
            if (s.season_number > 0 && s.season_number < activeSeason.season_number) {
                const count = (Array.isArray(s.episodes) && s.episodes.length > 0)
                    ? s.episodes.length
                    : (s.episode_count || 0);
                offset += count;
            }
        }
        return offset;
    }, [seasons, activeSeason]);

    const availableDubsList = useMemo(() => {
        const raw = item?.audioLanguages || item?.audio_languages || item?.languages || [];
        if (!Array.isArray(raw)) return [];
        return raw.map(d => {
            const code = typeof d === 'string' ? d.toLowerCase().trim() : (d.code || d.iso || '').toLowerCase().trim();
            const label = LANGUAGE_NAMES[code] || (typeof d === 'string' ? d.toUpperCase() : d.name || code.toUpperCase());
            return { code, label };
        }).filter(d => Boolean(d.code));
    }, [item]);

    const toggleWatchlist = () => {
        if (!item) return;
        if (inWatchlist) {
            WatchlistAPI.remove(item.id);
            setInWatchlist(false);
            Alert.alert('Removed', `${item.title} removed from Watchlist`);
        } else {
            WatchlistAPI.add(item);
            setInWatchlist(true);
            Alert.alert('Saved', `${item.title} added to Watchlist`);
        }
    };

    const safeItem = item;
    const availList = Array.isArray(item?.availability) ? item.availability : [];
    const directPlayback = availList.find(a => a.kind === 'playback' && (a.playbackUrl || a.playback_url));
    const embedPlayback = availList.find(a => a.kind === 'embed' && (a.url || a.external_url));
    const isPlayable = Boolean(directPlayback || embedPlayback || item?.has_playback || item?.tmdbId || item?.imdbId || item?.id);
    const downloadable = availList.find(a => a.isDownloadable && (a.playbackUrl || a.playback_url));
    const watchProviders = Array.isArray(item?.watchProviders) ? item.watchProviders : [];

    const playTitleOrEpisode = (ep) => {
        if (!item) return;
        const now = new Date();
        if (ep && ep.air_date) {
            const epDate = new Date(ep.air_date);
            if (epDate > now) {
                Alert.alert(
                    'Upcoming Episode',
                    `This episode has not aired yet (Scheduled for ${ep.air_date}). Please select an available released episode to watch.`,
                    [{ text: 'OK' }]
                );
                return;
            }
        }

        let targetSeason = isEpisodic
            ? (ep ? (ep.season_number != null ? ep.season_number : activeSeasonNum) : (activeSeasonNum != null ? activeSeasonNum : 1))
            : null;

        // If top "Watch Now" is clicked and active season is unreleased, fall back to first released regular season
        if (isEpisodic && !ep && Array.isArray(seasons) && seasons.length > 0) {
            const activeSeasonObj = seasons.find(s => s.season_number === targetSeason);
            const isFutureSeason = activeSeasonObj && (
                (activeSeasonObj.air_date && new Date(activeSeasonObj.air_date) > now) ||
                (Array.isArray(activeSeasonObj.episodes) && activeSeasonObj.episodes.length > 0 && activeSeasonObj.episodes.every(e => e.air_date && new Date(e.air_date) > now))
            );
            if (isFutureSeason) {
                const releasedSeason = seasons.find(s => s.season_number > 0 && (!s.air_date || new Date(s.air_date) <= now));
                if (releasedSeason) {
                    targetSeason = releasedSeason.season_number;
                }
            }
        }

        const targetEpisode = isEpisodic ? (ep ? ep.episode_number : 1) : null;
        const payload = {
            slug: item.slug || String(item.id),
            item,
            season: targetSeason,
            episode: targetEpisode,
        };
        navigation.navigate('Player', payload);
    };

    const openTrailerModal = (url) => {
        if (!url) return;
        // Convert YouTube watch URLs to embed URLs
        let embedUrl = url;
        const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/);
        if (m && m[1]) {
            embedUrl = `https://www.youtube.com/embed/${m[1]}?autoplay=1&modestbranding=1&rel=0`;
        }
        setTrailerUrl(embedUrl);
    };
    const closeTrailerModal = () => setTrailerUrl(null);

    const handleOpenDownloadModal = (ep = null) => {
        setSelectedDownloadEpisode(ep);
        setDownloadModalVisible(true);
    };

    const getMediaDownloadUrl = (ep = null) => {
        if (ep && (ep.playbackUrl || ep.playback_url)) return ep.playbackUrl || ep.playback_url;
        if (directPlayback?.playbackUrl || directPlayback?.playback_url) return directPlayback.playbackUrl || directPlayback.playback_url;
        if (downloadable?.playbackUrl || downloadable?.playback_url) return downloadable.playbackUrl || downloadable.playback_url;
        if (item?.streamUrl || item?.playbackUrl) return item.streamUrl || item.playbackUrl;
        const av = availList.find(a => (a.playbackUrl || a.playback_url || a.url || a.external_url));
        if (av) return av.playbackUrl || av.playback_url || av.url || av.external_url;
        const tmdb = item?.tmdbId || item?.tmdb_id || (typeof item?.slug === 'string' ? item.slug.match(/-(\d{4,9})$/)?.[1] : null);
        if (tmdb) {
            const s = ep ? (ep.season_number != null ? ep.season_number : (activeSeasonNum || 1)) : (activeSeasonNum || 1);
            const e = ep ? (ep.episode_number || 1) : 1;
            return isEpisodic
                ? `https://vidlink.pro/tv/${tmdb}/${s}/${e}`
                : `https://vidlink.pro/movie/${tmdb}`;
        }
        return null;
    };

    const triggerVideoDownload = (ep = null) => {
        const rawUrl = getMediaDownloadUrl(ep);
        const cleanTitle = (item?.title || 'Video').replace(/[^a-zA-Z0-9_\- ]/g, '').trim();
        const epSuffix = ep ? ` - S${ep.season_number != null ? ep.season_number : activeSeasonNum}E${ep.episode_number}` : '';
        const filename = `${cleanTitle}${epSuffix} [HD].mp4`;

        if (!rawUrl) {
            playTitleOrEpisode(ep);
            setDownloadModalVisible(false);
            return;
        }

        // 1. Native Android APK
        if (typeof window !== 'undefined' && window.ShadowStreamNative) {
            const isDirect = /\.(mp4|webm|mkv)(\?|$)/i.test(rawUrl);
            if (isDirect && typeof window.ShadowStreamNative.downloadMedia === 'function') {
                window.ShadowStreamNative.downloadMedia(rawUrl, filename);
                setCopyToast(`⬇ Downloading ${filename}...`);
            } else if (typeof window.ShadowStreamNative.openExternalDownloader === 'function') {
                window.ShadowStreamNative.openExternalDownloader(rawUrl, filename);
                setCopyToast('🚀 Opening in external downloader (1DM / ADM / VLC)...');
            } else if (typeof window.ShadowStreamNative.downloadMedia === 'function') {
                window.ShadowStreamNative.downloadMedia(rawUrl, filename);
                setCopyToast(`⬇ Downloading ${filename}...`);
            }
            setTimeout(() => setCopyToast(null), 3500);
            setDownloadModalVisible(false);
            return;
        }

        // 2. Direct playable media file
        const isDirectFile = /\.(mp4|webm|mkv)(\?|$)/i.test(rawUrl);
        if (isDirectFile && typeof document !== 'undefined') {
            const a = document.createElement('a');
            a.href = rawUrl;
            a.download = filename;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            document.body.appendChild(a);
            a.click();
            setTimeout(() => { if (document.body.contains(a)) document.body.removeChild(a); }, 300);
            setCopyToast(`⬇ Downloading ${cleanTitle}${epSuffix}...`);
            setTimeout(() => setCopyToast(null), 3000);
        } else {
            // For HLS streams & embeds: open in external downloader tab AND copy stream link
            if (typeof window !== 'undefined') {
                window.open(rawUrl, '_blank');
            }
            if (typeof navigator !== 'undefined' && navigator.clipboard) {
                navigator.clipboard.writeText(rawUrl);
                setCopyToast('📋 Stream opened & link copied for 1DM, ADM, or VLC.');
                setTimeout(() => setCopyToast(null), 4000);
            }
        }
        setDownloadModalVisible(false);
    };

    const handleOpenExternalDownloader = (ep = null) => {
        const rawUrl = getMediaDownloadUrl(ep);
        const cleanTitle = (item?.title || 'Video').replace(/[^a-zA-Z0-9_\- ]/g, '').trim();
        const epSuffix = ep ? ` - S${ep.season_number != null ? ep.season_number : activeSeasonNum}E${ep.episode_number}` : '';
        const filename = `${cleanTitle}${epSuffix} [HD].mp4`;

        if (!rawUrl) return;

        if (typeof window !== 'undefined' && window.ShadowStreamNative && typeof window.ShadowStreamNative.openExternalDownloader === 'function') {
            window.ShadowStreamNative.openExternalDownloader(rawUrl, filename);
            setCopyToast('🚀 Opening in external downloader (1DM / ADM / VLC)...');
        } else if (typeof window !== 'undefined') {
            window.open(rawUrl, '_blank');
            if (typeof navigator !== 'undefined' && navigator.clipboard) {
                navigator.clipboard.writeText(rawUrl);
            }
            setCopyToast('🚀 Opened external stream tab & copied link!');
        }
        setTimeout(() => setCopyToast(null), 3500);
        setDownloadModalVisible(false);
    };

    const copyDownloadLink = (ep = null) => {
        const rawUrl = getMediaDownloadUrl(ep);
        if (!rawUrl) return;
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText(rawUrl);
            setCopyToast('Stream link copied! Paste into IDM, 1DM, or VLC.');
            setTimeout(() => setCopyToast(null), 3500);
        } else {
            Linking.openURL(rawUrl);
        }
    };

    const handleDownloadDub = (dub) => {
        const cleanTitle = (item?.title || 'title').replace(/[^a-zA-Z0-9_\- ]/g, '').trim();
        const filename = `${cleanTitle} - ${dub.label} Dub.mp3`;
        const downloadUrl = `${getApiBase()}/dub/download?title=${encodeURIComponent(cleanTitle)}&lang=${encodeURIComponent(dub.code)}&url=${encodeURIComponent(directPlayback?.playbackUrl || '')}`;

        if (typeof window !== 'undefined') {
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = filename;
            a.target = '_blank';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } else {
            Linking.openURL(downloadUrl);
        }
        setDubModalVisible(false);
    };

    // If we don't have an item yet (loading or failed), show a loader.
    // Catches: cold start from deep link, post-route-change, fetch failure, etc.
    if (!item) {
        return (
            <SafeAreaView style={styles.screen}>
                <AppHeader navigation={navigation} title={titleKey ? 'Loading…' : 'Title'} />
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
                    {loadError === 'not_found' ? (
                        <>
                            <Text style={{ color: COLORS.textPrimary, fontSize: 22, fontWeight: '700', marginBottom: 8 }}>Title not found</Text>
                            <Text style={{ color: COLORS.textMuted, fontSize: 14, textAlign: 'center' }}>
                                We couldn't find "{titleKey}". It may have been removed or the link is incorrect.
                            </Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Home')} style={{ marginTop: 20, paddingHorizontal: 18, paddingVertical: 10, backgroundColor: COLORS.brand, borderRadius: 6 }}>
                                <Text style={{ color: '#fff', fontWeight: '700' }}>Back to Home</Text>
                            </TouchableOpacity>
                        </>
                    ) : loadError ? (
                        <>
                            <Text style={{ color: COLORS.textPrimary, fontSize: 22, fontWeight: '700', marginBottom: 8 }}>Couldn't load title</Text>
                            <Text style={{ color: COLORS.textMuted, fontSize: 14, textAlign: 'center' }}>Server returned {loadError}. Try again in a moment.</Text>
                        </>
                    ) : (
                        <>
                            <ActivityIndicator size="large" color={COLORS.brand} />
                            <Text style={{ color: COLORS.textMuted, fontSize: 14, marginTop: 16 }}>Looking up "{titleKey}"…</Text>
                        </>
                    )}
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.screen}>
            <AppHeader navigation={navigation} title={item.title} />

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Hero Backdrop Banner */}
                <View style={[styles.heroBanner, isDesktop && styles.heroBannerDesktop]}>
                    <Poster
                        url={item.backdrop || item.poster}
                        title={item.title}
                        style={StyleSheet.absoluteFill}
                        resizeMode="cover"
                    />
                    <View style={styles.heroOverlay} />

                    <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                        <Text style={styles.backBtnText}>‹ Back</Text>
                    </TouchableOpacity>

                    <View style={styles.heroContentRow}>
                        <View style={styles.posterContainer}>
                            <Poster
                                url={item.poster}
                                title={item.title}
                                style={StyleSheet.absoluteFill}
                            />
                        </View>

                        <View style={styles.heroInfoCol}>
                            <View style={styles.typeBadgeRow}>
                                <View style={styles.typeBadge}>
                                    <Text style={styles.typeBadgeText}>
                                        {(item.type || 'movie').toUpperCase().replace('_', ' ')}
                                    </Text>
                                </View>
                                {item.rating ? (
                                    <View style={styles.ratingBadge}>
                                        <Text style={styles.ratingStar}>★</Text>
                                        <Text style={styles.ratingText}>{Number(item.rating).toFixed(1)}</Text>
                                    </View>
                                ) : null}
                            </View>

                            <Text style={styles.mainTitle}>{item.title}</Text>

                            {item.originalTitle && item.originalTitle !== item.title && (
                                <Text style={styles.origTitle}>{item.originalTitle}</Text>
                            )}

                            <View style={styles.metaChipsRow}>
                                {item.year && <Text style={styles.metaChip}>{item.year}</Text>}
                                {item.runtime && <Text style={styles.metaChip}>{item.runtime}m</Text>}
                                {(() => {
                                    const sCount = (Array.isArray(seasons) && seasons.length > 0)
                                        ? seasons.filter(s => s && s.season_number > 0).length || seasons.length
                                        : (typeof item.seasons === 'number' && item.seasons > 0
                                            ? item.seasons
                                            : (item.seasonCount != null && item.seasonCount > 0
                                                ? item.seasonCount
                                                : (Array.isArray(item.seasons) && item.seasons.length > 0 ? item.seasons.length : 0)));
                                    if (sCount > 0) {
                                        return <Text style={styles.metaChip}>{sCount} {sCount === 1 ? 'Season' : 'Seasons'}</Text>;
                                    }
                                    return null;
                                })()}
                                {isPlayable && <Text style={[styles.metaChip, styles.metaChipGreen]}>Verified Stream</Text>}
                            </View>

                            {/* CTAs */}
                            <View style={styles.actionButtonsRow}>
                                <TouchableOpacity
                                    style={[styles.playBtn, !isPlayable && {opacity: 0.5}]}
                                    onPress={() => isPlayable ? playTitleOrEpisode(null) : null}
                                    activeOpacity={0.8}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Play ${item.title}`}
                                >
                                    <Text style={styles.playBtnIcon}>▶</Text>
                                    <Text style={styles.playBtnText}>Watch Now</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.watchlistBtn, inWatchlist && styles.watchlistBtnActive]}
                                    onPress={toggleWatchlist}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.watchlistIcon}>{inWatchlist ? '✓' : '+'}</Text>
                                    <Text style={styles.watchlistText}>{inWatchlist ? 'In Watchlist' : 'Watchlist'}</Text>
                                </TouchableOpacity>

                                {isPlayable ? (
                                    <TouchableOpacity
                                        style={styles.downloadMediaBtn}
                                        onPress={() => handleOpenDownloadModal(null)}
                                        activeOpacity={0.8}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Download ${item.title}`}
                                    >
                                        <Text style={styles.downloadMediaBtnIcon}>⬇</Text>
                                        <Text style={styles.downloadMediaBtnText}>Download</Text>
                                    </TouchableOpacity>
                                ) : null}

                                {item.trailerUrl ? (
                                    <TouchableOpacity
                                        style={styles.trailerBtn}
                                        onPress={() => openTrailerModal(item.trailerUrl)}
                                        activeOpacity={0.8}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Watch trailer for ${item.title}`}
                                    >
                                        <Text style={styles.trailerBtnIcon}>🎬</Text>
                                        <Text style={styles.trailerBtnText}>Trailer</Text>
                                    </TouchableOpacity>
                                ) : null}

                                {availableDubsList.length > 0 ? (
                                    <TouchableOpacity
                                        style={styles.dubDownloadBtn}
                                        onPress={() => setDubModalVisible(true)}
                                        activeOpacity={0.8}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Download Dub Audio for ${item.title}`}
                                    >
                                        <Text style={styles.dubDownloadBtnIcon}>🎧</Text>
                                        <Text style={styles.dubDownloadBtnText}>Dub Audio ({availableDubsList.length})</Text>
                                    </TouchableOpacity>
                                ) : null}
                            </View>
                        </View>
                    </View>
                </View>

                {/* Stream Availability Status Banner */}
                <View style={styles.statusBannerWrapper}>
                    {isPlayable ? (
                        <View style={styles.availBannerSuccess}>
                            <Text style={styles.availBannerIcon}>✅</Text>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.availBannerTitle}>Stream Ready</Text>
                                <Text style={styles.availBannerSub}>
                                    Tap "Watch Now" - the Player streams directly from {directPlayback?.sourceName || 'available verified sources'}.
                                </Text>
                            </View>
                        </View>
                    ) : watchProviders.length > 0 ? (
                        <View style={styles.availBannerInfo}>
                            <Text style={styles.availBannerIcon}>📡</Text>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.availBannerTitle}>Available Elsewhere</Text>
                                <Text style={styles.availBannerSub}>
                                    Not in our lawful catalog yet, but already streaming on a real licensed service.
                                </Text>
                                <View style={styles.langPillsRow}>
                                    {watchProviders.map((p, idx) => (
                                        <TouchableOpacity
                                            key={`${p.slug}-${p.type}-${idx}`}
                                            style={styles.metaChip}
                                            onPress={() => p.deepLink && Linking.openURL(p.deepLink)}
                                        >
                                            <Text style={{ color: COLORS.text }}>
                                                {p.name}{p.type === 'subscription' ? '' : ` (${p.type})`}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.availBannerInfo}>
                            <Text style={styles.availBannerIcon}>ℹ</Text>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.availBannerTitle}>Metadata Only</Text>
                                <Text style={styles.availBannerSub}>
                                    This title is currently not available for streaming. Check back later.
                                </Text>
                            </View>
                        </View>
                    )}
                </View>

                {/* Synopsis & Tagline */}
                <View style={styles.sectionBlock}>
                    <Text style={styles.sectionHeaderTitle}>STORYLINE</Text>
                    {item.tagline && <Text style={styles.tagline}>"{item.tagline}"</Text>}
                    <Text style={styles.overviewText}>
                        {item.overview || item.description || 'Full synopsis currently being cataloged.'}
                    </Text>
                </View>

                {/* Languages — dubs + subs availability */}
                {(item.audioLanguages?.length > 0 || item.subtitleLanguages?.length > 0 || item.languages?.length > 0) && (
                    <View style={styles.sectionBlock}>
                        <Text style={styles.sectionHeaderTitle}>🗣️ LANGUAGES & DUBBING</Text>
                        <View style={styles.langPillsRow}>
                            {item.audioLanguages && item.audioLanguages.length > 0 && (
                                <View style={styles.langGroup}>
                                    <Text style={styles.langGroupHeader}>🎙️ Audio Dubs</Text>
                                    <View style={styles.langPillsRow}>
                                        {item.audioLanguages.map((l, idx) => {
                                            const label = formatLanguage(l);
                                            if (!label) return null;
                                            return (
                                                <TouchableOpacity
                                                    key={`audio-${idx}`}
                                                    style={[styles.langPill, styles.langPillAudio]}
                                                    onPress={() => navigation.navigate('Languages')}
                                                    activeOpacity={0.7}
                                                >
                                                    <Text style={styles.langPillText}>{label}</Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>
                            )}
                            {item.subtitleLanguages && item.subtitleLanguages.length > 0 && (
                                <View style={styles.langGroup}>
                                    <Text style={styles.langGroupHeader}>📝 Subtitles</Text>
                                    <View style={styles.langPillsRow}>
                                        {item.subtitleLanguages.map((l, idx) => {
                                            const label = formatLanguage(l);
                                            if (!label) return null;
                                            return (
                                                <TouchableOpacity
                                                    key={`sub-${idx}`}
                                                    style={[styles.langPill, styles.langPillSub]}
                                                    onPress={() => navigation.navigate('Languages')}
                                                    activeOpacity={0.7}
                                                >
                                                    <Text style={styles.langPillText}>{label}</Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>
                            )}
                            {item.languages && item.languages.length > 0 && (
                                <View style={styles.langGroup}>
                                    <Text style={styles.langGroupHeader}>🌐 Original</Text>
                                    <View style={styles.langPillsRow}>
                                        {item.languages.map((l, idx) => {
                                            const label = formatLanguage(l);
                                            if (!label) return null;
                                            return (
                                                <TouchableOpacity
                                                    key={`lang-${idx}`}
                                                    style={[styles.langPill, styles.langPillOrig]}
                                                    onPress={() => navigation.navigate('Languages')}
                                                    activeOpacity={0.7}
                                                >
                                                    <Text style={styles.langPillText}>{label}</Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>
                            )}
                        </View>
                    </View>
                )}

                {/* Cast & Countries */}
                {(item.countries && item.countries.length > 0) && (
                    <View style={styles.sectionBlock}>
                        <Text style={styles.sectionHeaderTitle}>🌍 ORIGIN</Text>
                        <View style={styles.langPillsRow}>
                            {item.countries.map((c, idx) => {
                                const code = typeof c === 'string' ? c : (c.code || '');
                                const name = typeof c === 'string' ? c : (c.name || c.code || '');
                                const flag = typeof c === 'object' && c.flag ? c.flag : '🌐';
                                return (
                                    <TouchableOpacity
                                        key={`country-${code || idx}`}
                                        style={[styles.langPill, styles.langPillCountry]}
                                        onPress={() => {
                                            if (code) {
                                                navigation.navigate('CountryDetail', { slug: code.toLowerCase(), code: code.toUpperCase(), country: { code: code.toUpperCase(), name, flag } });
                                            }
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.langPillText}>{flag} {name || code}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                )}

                {/* Episodic Season & Episode Selector */}
                {isEpisodic && (
                    <View style={styles.sectionBlock}>
                        <View style={styles.seasonHeaderRow}>
                            <Text style={styles.sectionHeaderTitle}>EPISODES</Text>
                            {seasons.length > 1 && (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.seasonsChipsRow}>
                                    {seasons.map(s => {
                                        const now = new Date();
                                        const isSel = activeSeasonNum === s.season_number;
                                        const isSeasonUpcoming = (s.air_date && new Date(s.air_date) > now) ||
                                            (Array.isArray(s.episodes) && s.episodes.length > 0 && s.episodes.every(ep => ep.air_date && new Date(ep.air_date) > now));
                                        const seasonLabel = s.season_number === 0 
                                            ? (s.name || 'Specials') 
                                            : (s.name && !/^Season\s+\d+$/i.test(s.name) ? `${s.name} (S${s.season_number})` : (s.name || `Season ${s.season_number}`));
                                        return (
                                            <TouchableOpacity
                                                key={s.id || s.season_number}
                                                style={[
                                                    styles.seasonChip,
                                                    isSel && styles.seasonChipActive,
                                                    isSeasonUpcoming && styles.seasonChipUpcoming
                                                ]}
                                                onPress={() => setActiveSeasonNum(s.season_number)}
                                            >
                                                <Text style={[styles.seasonChipText, isSel && styles.seasonChipTextActive]}>
                                                    {seasonLabel}{isSeasonUpcoming ? ' ⏳' : ''}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            )}
                        </View>

                        {/* Episodes List */}
                        <View style={styles.episodesList}>
                            {loadingSeasons ? (
                                <View style={{ padding: 28, alignItems: 'center', justifyContent: 'center' }}>
                                    <ActivityIndicator size="small" color={COLORS.brand} />
                                    <Text style={{ color: COLORS.textMuted, fontSize: 13, marginTop: 8 }}>
                                        Loading episodes & seasons…
                                    </Text>
                                </View>
                            ) : episodes.length === 0 ? (
                                <View style={{ padding: 24, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 8, marginVertical: 8 }}>
                                    <Text style={{ color: COLORS.textMuted, fontSize: 13, textAlign: 'center' }}>
                                        Episodes are currently being cataloged and indexed. Check back shortly.
                                    </Text>
                                </View>
                            ) : episodes.map(ep => {
                                const now = new Date();
                                const epAirDate = ep.air_date ? new Date(ep.air_date) : null;
                                const isEpUpcoming = Boolean(epAirDate && epAirDate > now);
                                return (
                                <View key={ep.id || ep.episode_number} style={[styles.episodeCardWrapper, isEpUpcoming && styles.episodeCardUpcomingWrapper]}>
                                    <TouchableOpacity
                                        style={[styles.episodeCard, isEpUpcoming && styles.episodeCardUpcoming]}
                                        onPress={() => playTitleOrEpisode(ep)}
                                        activeOpacity={0.8}
                                    >
                                        <View style={styles.epThumbWrapper}>
                                            <Poster
                                                url={ep.thumbnail || item.backdrop || item.poster}
                                                title={`Ep ${ep.episode_number}`}
                                                style={StyleSheet.absoluteFill}
                                            />
                                            <View style={[styles.epPlayOverlay, isEpUpcoming && styles.epUpcomingOverlay]}>
                                                <Text style={styles.epPlayOverlayIcon}>{isEpUpcoming ? '⏳' : '▶'}</Text>
                                            </View>
                                        </View>

                                        <View style={styles.epInfo}>
                                            <View style={styles.epTitleRow}>
                                                <Text style={styles.epNumText}>
                                                    E{ep.episode_number}
                                                    {(activeSeason?.season_number > 0 && episodeOffset > 0) ? ` (#${episodeOffset + ep.episode_number})` : ''}
                                                </Text>
                                                <Text style={styles.epTitleText} numberOfLines={1}>
                                                    {ep.name || ep.title || `Episode ${ep.episode_number}`}
                                                </Text>
                                            </View>
                                            {isEpUpcoming ? (
                                                <View style={styles.epUpcomingBadge}>
                                                    <Text style={styles.epUpcomingBadgeText}>⏳ UPCOMING RELEASE · Airs {ep.air_date}</Text>
                                                </View>
                                            ) : null}
                                            <Text style={styles.epOverview} numberOfLines={2}>
                                                {ep.overview || (isEpUpcoming ? `Scheduled to air on ${ep.air_date}.` : 'Episode synopsis available in database.')}
                                            </Text>
                                            {ep.runtime && <Text style={styles.epRuntimeText}>{ep.runtime} min</Text>}
                                        </View>
                                    </TouchableOpacity>
                                    {!isEpUpcoming ? (
                                        <TouchableOpacity
                                            style={styles.epDownloadBtn}
                                            onPress={() => handleOpenDownloadModal(ep)}
                                            accessibilityLabel={`Download Episode ${ep.episode_number}`}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={styles.epDownloadIcon}>⬇</Text>
                                            <Text style={styles.epDownloadText}>Offline</Text>
                                        </TouchableOpacity>
                                    ) : null}
                                </View>
                            );
                        })}
                        </View>
                    </View>
                )}

                {/* Franchise / Collection (movies only — Baahubali 1+2, Star Wars saga, etc.) */}
                {franchise && franchise.parts && franchise.parts.length > 1 && (
                    <View style={styles.sectionBlock}>
                        <View style={{ marginBottom: 12 }}>
                            <Text style={styles.sectionHeaderTitle}>🎬 FRANCHISE — {franchise.collection.name}</Text>
                            <Text style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 4 }}>
                                {franchise.parts.length} films in this saga
                            </Text>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingHorizontal: 4 }}>
                            {franchise.parts.map((part) => (
                                <TouchableOpacity
                                    key={part.id}
                                    style={[styles.franchiseCard, part.is_current && styles.franchiseCardCurrent]}
                                    onPress={() => {
                                        if (part.is_current) return;
                                        navigation.navigate('TitleDetail', { slug: part.slug || String(part.id), item: part });
                                    }}
                                    activeOpacity={part.is_current ? 1 : 0.85}
                                    accessibilityLabel={`${part.title}, ${part.year || ''}`}
                                    accessibilityRole="button"
                                >
                                    <View style={styles.franchiseThumb}>
                                        <Poster url={part.poster} title={part.title} style={StyleSheet.absoluteFill} />
                                        {part.is_current && (
                                            <View style={styles.franchiseYouBadge}>
                                                <Text style={styles.franchiseYouBadgeText}>YOU ARE HERE</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={styles.franchiseTitle} numberOfLines={2}>{part.title}</Text>
                                    {part.year && <Text style={styles.franchiseYear}>{part.year}</Text>}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* Cast Carousel */}
                {cast.length > 0 && (
                    <View style={styles.sectionBlock}>
                        <Text style={styles.sectionHeaderTitle}>TOP CAST</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.castRow}>
                            {cast.map((actor, idx) => (
                                <View key={`${actor.id || idx}-${idx}`} style={styles.castCard}>
                                    <View style={styles.castAvatar}>
                                        <Poster
                                            url={actor.profile_image}
                                            title={actor.name}
                                            style={StyleSheet.absoluteFill}
                                        />
                                    </View>
                                    <Text style={styles.actorName} numberOfLines={1}>{actor.name}</Text>
                                    <Text style={styles.characterName} numberOfLines={1}>{actor.character_name || actor.known_for_department}</Text>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* Editorial Showbiz Guides & In-Depth Analysis (Bidirectional Backlink) */}
                {relatedBlogs && relatedBlogs.length > 0 && (
                    <View style={styles.sectionBlock}>
                        <Text style={styles.sectionHeaderTitle}>📰 EDITORIAL COVERAGE & STREAMING GUIDES</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.blogRow}>
                            {relatedBlogs.map((b) => (
                                <TouchableOpacity
                                    key={b.slug}
                                    style={styles.editorialCard}
                                    activeOpacity={0.8}
                                    accessibilityRole="link"
                                    href={`https://ssmoviestvs.site/blog/${b.slug}`}
                                    onPress={() => navigation.navigate('BlogDetail', { slug: b.slug })}
                                >
                                    {b.cover_image && (
                                        <Image source={{ uri: b.cover_image }} style={styles.editorialCardCover} resizeMode="cover" />
                                    )}
                                    <View style={styles.editorialCardContent}>
                                        <View style={styles.editorialCategoryBadge}>
                                            <Text style={styles.editorialCategoryText}>{b.category?.toUpperCase() || 'SHOWBIZ'}</Text>
                                            <Text style={styles.editorialReadTime}>⏱️ {b.reading_time || '5 min'}</Text>
                                        </View>
                                        <Text style={styles.editorialCardTitle} numberOfLines={2}>{b.title}</Text>
                                        <Text style={styles.editorialCardDesc} numberOfLines={2}>{b.meta_description}</Text>
                                        <Text style={styles.editorialCta}>Read In-Depth Guide →</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* Similar Recommendations */}
                {similar.length > 0 && (
                    <View style={styles.sectionBlock}>
                        <Text style={styles.sectionHeaderTitle}>MORE LIKE THIS</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.similarRow}>
                            {similar.map((sim, idx) => (
                                <View key={`${sim.id || idx}-${idx}`} style={{ marginRight: 14 }}>
                                    <MediaCard
                                        item={sim}
                                        onPress={(it) => navigation.navigate('TitleDetail', { slug: it.slug || String(it.id), item: it })}
                                    />
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Trailer Modal */}
            <Modal
                visible={!!trailerUrl}
                transparent
                animationType="fade"
                onRequestClose={closeTrailerModal}
                statusBarTranslucent
            >
                <Pressable style={styles.trailerBackdrop} onPress={closeTrailerModal} accessibilityLabel="Close trailer" />
                <View style={styles.trailerContainer} accessibilityViewIsModal>
                    <View style={styles.trailerHeader}>
                        <Text style={styles.trailerHeaderTitle}>🎬 Official Trailer</Text>
                        <Text style={styles.trailerHeaderSub} numberOfLines={1}>{item?.title}</Text>
                        <TouchableOpacity onPress={closeTrailerModal} style={styles.trailerCloseBtn} accessibilityRole="button" accessibilityLabel="Close trailer">
                            <Text style={styles.trailerCloseBtnText}>×</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.trailerFrameWrap}>
                        <View ref={trailerHostRef} style={{ flex: 1, width: '100%', height: '100%' }} />
                    </View>
                </View>
            </Modal>

            {/* Dub Audio Download Modal */}
            <Modal
                visible={dubModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setDubModalVisible(false)}
                statusBarTranslucent
            >
                <Pressable style={styles.trailerBackdrop} onPress={() => setDubModalVisible(false)} accessibilityLabel="Close dub menu" />
                <View style={styles.dubModalContainer} accessibilityViewIsModal>
                    <View style={styles.trailerHeader}>
                        <Text style={styles.trailerHeaderTitle}>🎧 Download Dub Audio</Text>
                        <TouchableOpacity onPress={() => setDubModalVisible(false)} style={styles.trailerCloseBtn} accessibilityRole="button">
                            <Text style={styles.trailerCloseBtnText}>×</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.dubModalSub}>
                        Select an audio track to download for offline listening or external playback:
                    </Text>
                    <ScrollView style={{ maxHeight: 300, marginTop: 14 }}>
                        {availableDubsList.map(dub => (
                            <TouchableOpacity
                                key={dub.code}
                                style={styles.dubOptionRow}
                                onPress={() => handleDownloadDub(dub)}
                                activeOpacity={0.7}
                            >
                                <View style={{ flex: 1, marginRight: 12 }}>
                                    <Text style={styles.dubOptionTitle}>• {dub.label} Audio Track</Text>
                                    <Text style={styles.dubOptionSubtitle}>Language Code: {dub.code.toUpperCase()} • Direct MP3 Audio</Text>
                                </View>
                                <View style={styles.dubDownloadBadgeWrap}>
                                    <Text style={styles.dubDownloadBadgeText}>⬇ Download</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </Modal>

            {/* Offline Media Download Modal */}
            <Modal
                visible={downloadModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setDownloadModalVisible(false)}
                statusBarTranslucent
            >
                <Pressable
                    style={styles.trailerBackdrop}
                    onPress={() => setDownloadModalVisible(false)}
                    accessibilityLabel="Close download menu"
                />
                <View style={styles.downloadModalContainer} accessibilityViewIsModal>
                    <View style={styles.trailerHeader}>
                        <Text style={styles.trailerHeaderTitle}>⬇ Download for Offline Watching</Text>
                        <TouchableOpacity
                            onPress={() => setDownloadModalVisible(false)}
                            style={styles.trailerCloseBtn}
                            accessibilityRole="button"
                        >
                            <Text style={styles.trailerCloseBtnText}>×</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.dubModalSub}>
                        {selectedDownloadEpisode
                            ? `Download ${item?.title} • Season ${selectedDownloadEpisode.season_number != null ? selectedDownloadEpisode.season_number : activeSeasonNum}, Episode ${selectedDownloadEpisode.episode_number}:`
                            : `Download ${item?.title} to watch offline without an internet connection:`}
                    </Text>

                    <ScrollView style={{ maxHeight: 360, marginTop: 14 }}>
                        {/* Section 1: Full Video Direct Download */}
                        <View style={styles.downloadSectionCard}>
                            <Text style={styles.downloadSectionHeader}>VIDEO FILE (MP4 / HIGH DEFINITION)</Text>
                            <Text style={styles.downloadSectionText}>
                                Save full video file directly to your phone gallery, downloads folder, or PC for offline playback.
                            </Text>
                            <TouchableOpacity
                                style={styles.downloadPrimaryBtn}
                                onPress={() => triggerVideoDownload(selectedDownloadEpisode)}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.downloadPrimaryBtnText}>
                                    ⬇ Download Full Video File (HD)
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.downloadSecondaryBtn}
                                onPress={() => copyDownloadLink(selectedDownloadEpisode)}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.downloadSecondaryBtnText}>
                                    📋 Copy Direct Stream Link (For 1DM, ADM, IDM, VLC)
                                </Text>
                            </TouchableOpacity>
                        
                            <TouchableOpacity
                                style={[styles.downloadSecondaryBtn, { borderColor: '#3B82F6', marginTop: 8 }]}
                                onPress={() => handleOpenExternalDownloader(selectedDownloadEpisode)}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.downloadSecondaryBtnText, { color: '#60A5FA' }]}>
                                    🚀 Open in 1DM / ADM / Downloader App
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Section 2: Dub Audio Tracks (Optional / Extra) */}
                        {availableDubsList.length > 0 && (
                            <View style={[styles.downloadSectionCard, { marginTop: 12 }]}>
                                <Text style={styles.downloadSectionHeader}>DUBBED AUDIO TRACKS</Text>
                                <Text style={styles.downloadSectionText}>
                                    Download standalone MP3 voice tracks to sync with external players.
                                </Text>
                                <View style={{ gap: 8 }}>
                                    {availableDubsList.map(dub => (
                                        <TouchableOpacity
                                            key={dub.code}
                                            style={styles.dubOptionRow}
                                            onPress={() => handleDownloadDub(dub)}
                                            activeOpacity={0.7}
                                        >
                                            <View style={{ flex: 1, marginRight: 10 }}>
                                                <Text style={styles.dubOptionTitle}>• {dub.label} Track</Text>
                                                <Text style={styles.dubOptionSubtitle}>Direct MP3 Audio File</Text>
                                            </View>
                                            <View style={styles.dubDownloadBadgeWrap}>
                                                <Text style={styles.dubDownloadBadgeText}>⬇ MP3</Text>
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* Tip Box */}
                        <View style={styles.downloadTipCard}>
                            <Text style={styles.downloadTipText}>
                                💡 Tip: For ultra-fast multi-threaded downloads on Android & Windows, copy the stream link and paste it into downloaders like 1DM, ADM, IDM, or VLC.
                            </Text>
                        </View>
                    </ScrollView>
                </View>
            </Modal>

            {/* Copy / Action Toast Notification */}
            {copyToast ? (
                <View style={styles.copyToastWrap} pointerEvents="none">
                    <Text style={styles.copyToastText}>{copyToast}</Text>
                </View>
            ) : null}

            <MobileTabBar navigation={navigation} activeRoute="TitleDetail" />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: COLORS.bg },
    heroBanner: {
        height: 400,
        position: 'relative',
        justifyContent: 'flex-end',
        backgroundColor: COLORS.surface
    },
    heroBannerDesktop: {
        height: 480
    },
    heroOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(10, 10, 10, 0.75)'
    },
    backBtn: {
        position: 'absolute',
        top: 16,
        left: 16,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        zIndex: 10
    },
    backBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
    heroContentRow: {
        flexDirection: 'row',
        padding: 20,
        alignItems: 'flex-end',
        zIndex: 5
    },
    posterContainer: {
        width: 120,
        height: 180,
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        backgroundColor: COLORS.surfaceAlt,
        marginRight: 16
    },
    heroInfoCol: {
        flex: 1
    },
    typeBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6
    },
    typeBadge: {
        backgroundColor: COLORS.brand,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4
    },
    typeBadgeText: {
        color: '#FFFFFF',
        fontSize: 9,
        fontWeight: '800'
    },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4
    },
    ratingStar: { color: COLORS.gold, fontSize: 10, marginRight: 3 },
    ratingText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
    mainTitle: {
        color: COLORS.textPrimary,
        fontSize: 24,
        fontWeight: '900',
        letterSpacing: -0.5
    },
    origTitle: {
        color: COLORS.textMuted,
        fontSize: 12,
        marginTop: 2
    },
    metaChipsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 8,
        marginBottom: 14
    },
    metaChip: {
        color: COLORS.textSecondary,
        fontSize: 11,
        fontWeight: '600'
    },
    metaChipGreen: {
        color: COLORS.success,
        fontWeight: '800'
    },
    actionButtonsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10
    },
    playBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.brand,
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 6
    },
    playBtnIcon: { color: '#FFFFFF', fontSize: 13, marginRight: 6 },
    playBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
    watchlistBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.12)',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 6
    },
    watchlistBtnActive: {
        backgroundColor: 'rgba(16, 185, 129, 0.25)'
    },
    watchlistIcon: { color: '#FFFFFF', fontSize: 13, marginRight: 6 },
    watchlistText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
    trailerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.18)',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.55)',
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 6
    },
    trailerBtnIcon: { fontSize: 13, marginRight: 6 },
    trailerBtnText: { color: '#FCA5A5', fontSize: 12, fontWeight: '700' },
    dubDownloadBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(59, 130, 246, 0.18)',
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.55)',
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 6
    },
    dubDownloadBtnIcon: { fontSize: 13, marginRight: 6 },
    dubDownloadBtnText: { color: '#93C5FD', fontSize: 12, fontWeight: '700' },
    downloadMediaBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(37, 99, 235, 0.22)',
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.65)',
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 6,
    },
    downloadMediaBtnIcon: { fontSize: 13, marginRight: 6 },
    downloadMediaBtnText: { color: '#93C5FD', fontSize: 12, fontWeight: '700' },
    episodeCardWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    epDownloadBtn: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        paddingHorizontal: 10,
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 46,
    },
    epDownloadIcon: {
        color: '#60A5FA',
        fontSize: 16,
        fontWeight: '700',
    },
    epDownloadText: {
        color: '#9CA3AF',
        fontSize: 9,
        fontWeight: '700',
        marginTop: 2,
    },
    downloadModalContainer: {
        position: 'absolute',
        top: '12%', bottom: '12%', left: '5%', right: '5%',
        backgroundColor: '#0f1017',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.4)',
        padding: 20,
        alignSelf: 'center',
        maxWidth: 580,
    },
    downloadSectionCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 10,
        padding: 14,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        marginTop: 8,
    },
    downloadSectionHeader: {
        color: '#60A5FA',
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    downloadSectionText: {
        color: '#9CA3AF',
        fontSize: 12,
        marginTop: 4,
        marginBottom: 10,
        lineHeight: 16,
    },
    downloadPrimaryBtn: {
        backgroundColor: COLORS.brand,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 6,
        alignItems: 'center',
        marginTop: 4,
    },
    downloadPrimaryBtnText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '800',
    },
    downloadSecondaryBtn: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        paddingVertical: 9,
        paddingHorizontal: 14,
        borderRadius: 6,
        alignItems: 'center',
        marginTop: 8,
    },
    downloadSecondaryBtnText: {
        color: '#E5E7EB',
        fontSize: 12,
        fontWeight: '700',
    },
    downloadTipCard: {
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderRadius: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.25)',
        marginTop: 14,
        marginBottom: 6,
    },
    downloadTipText: {
        color: '#93C5FD',
        fontSize: 11,
        lineHeight: 16,
    },
    copyToastWrap: {
        position: 'absolute',
        bottom: 80,
        left: 20,
        right: 20,
        alignItems: 'center',
        zIndex: 999,
    },
    copyToastText: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        color: '#FFFFFF',
        borderColor: COLORS.brand,
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        fontSize: 12,
        fontWeight: '700',
    },
    dubModalContainer: {
        position: 'absolute',
        top: '20%', bottom: '20%', left: '5%', right: '5%',
        backgroundColor: '#0f1017',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.4)',
        padding: 20,
        alignSelf: 'center',
        maxWidth: 550,
    },
    dubModalSub: {
        color: COLORS.textSecondary,
        fontSize: 13,
        marginTop: 8,
        lineHeight: 18,
    },
    dubOptionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.surfaceAlt,
        padding: 14,
        borderRadius: 8,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    dubOptionTitle: {
        color: COLORS.textPrimary,
        fontSize: 14,
        fontWeight: '700',
    },
    dubOptionSubtitle: {
        color: COLORS.textMuted,
        fontSize: 11,
        marginTop: 2,
    },
    dubDownloadBadgeWrap: {
        backgroundColor: COLORS.brand,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
    },
    dubDownloadBadgeText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    trailerBackdrop: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.88)',
    },
    trailerContainer: {
        position: 'absolute',
        top: '6%', bottom: '6%', left: '4%', right: '4%',
        backgroundColor: '#0c0d12',
        borderRadius: 14,
        borderWidth: 1, borderColor: 'rgba(239,68,68,0.35)',
        overflow: 'hidden',
        alignSelf: 'center',
        maxWidth: 1080,
    },
    trailerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.06)',
        gap: 12,
    },
    trailerHeaderTitle: { color: '#FCA5A5', fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
    trailerHeaderSub: { color: '#fff', fontSize: 14, fontWeight: '600', flex: 1 },
    trailerCloseBtn: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.08)',
        alignItems: 'center', justifyContent: 'center',
    },
    trailerCloseBtnText: { color: '#fff', fontSize: 22, lineHeight: 24, fontWeight: '600' },
    trailerFrameWrap: { flex: 1, backgroundColor: '#000' },
    statusBannerWrapper: {
        paddingHorizontal: 18,
        paddingVertical: 12
    },
    availBannerSuccess: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.3)',
        borderRadius: 8,
        padding: 12
    },
    availBannerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.25)',
        borderRadius: 8,
        padding: 12
    },
    availBannerIcon: { fontSize: 20, marginRight: 12 },
    availBannerTitle: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '700' },
    availBannerSub: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
    sectionBlock: {
        paddingHorizontal: 20,
        paddingVertical: 14
    },
    sectionHeaderTitle: {
        color: COLORS.textMuted,
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1,
        marginBottom: 8
    },
    tagline: {
        color: COLORS.textSecondary,
        fontSize: 13,
        fontStyle: 'italic',
        marginBottom: 8
    },
    overviewText: {
        color: COLORS.textSecondary,
        fontSize: 13,
        lineHeight: 20
    },
    langPillsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 12
    },
    langGroup: {
        marginBottom: 8,
        width: '100%'
    },
    langGroupHeader: {
        color: COLORS.textMuted,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5,
        marginBottom: 6
    },
    langPill: {
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 4,
        borderWidth: 1,
        backgroundColor: 'rgba(255,255,255,0.04)'
    },
    langPillAudio: {
        borderColor: 'rgba(34, 211, 238, 0.5)',
        backgroundColor: 'rgba(34, 211, 238, 0.10)'
    },
    langPillSub: {
        borderColor: 'rgba(167, 139, 250, 0.5)',
        backgroundColor: 'rgba(167, 139, 250, 0.10)'
    },
    langPillOrig: {
        borderColor: COLORS.border,
        backgroundColor: COLORS.surfaceAlt
    },
    langPillCountry: {
        borderColor: 'rgba(255,255,255,0.2)',
        backgroundColor: 'rgba(255,255,255,0.04)'
    },
    langPillText: {
        color: COLORS.textPrimary,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.3
    },
    seasonHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12
    },
    seasonsChipsRow: {
        gap: 6
    },
    seasonChip: {
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 16,
        backgroundColor: COLORS.surfaceAlt,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    seasonChipActive: {
        backgroundColor: COLORS.badgeTv,
        borderColor: COLORS.badgeTv
    },
    seasonChipUpcoming: {
        borderColor: 'rgba(234, 179, 8, 0.45)',
    },
    seasonChipText: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600' },
    seasonChipTextActive: { color: '#FFFFFF', fontWeight: '700' },
    episodesList: {
        gap: 10
    },
    episodeCardUpcomingWrapper: {
        opacity: 0.9,
    },
    episodeCard: {
        flexDirection: 'row',
        backgroundColor: COLORS.surfaceCard,
        borderRadius: 8,
        padding: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
        flex: 1,
    },
    episodeCardUpcoming: {
        borderColor: 'rgba(234, 179, 8, 0.35)',
        backgroundColor: 'rgba(234, 179, 8, 0.04)',
    },
    epThumbWrapper: {
        width: 100,
        height: 60,
        borderRadius: 6,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: COLORS.surfaceAlt
    },
    epPlayOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    epUpcomingOverlay: {
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    epPlayOverlayIcon: { color: '#FFFFFF', fontSize: 16 },
    epUpcomingBadge: {
        backgroundColor: 'rgba(234, 179, 8, 0.18)',
        borderColor: 'rgba(234, 179, 8, 0.5)',
        borderWidth: 1,
        borderRadius: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
        alignSelf: 'flex-start',
        marginTop: 4,
        marginBottom: 2,
    },
    epUpcomingBadgeText: {
        color: '#FDE047',
        fontSize: 10,
        fontWeight: '800',
    },
    epInfo: {
        flex: 1,
        marginLeft: 12,
        justifyContent: 'center'
    },
    epTitleRow: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    epNumText: {
        color: COLORS.brandSecondary,
        fontSize: 12,
        fontWeight: '800',
        marginRight: 6
    },
    epTitleText: {
        color: COLORS.textPrimary,
        fontSize: 13,
        fontWeight: '700',
        flex: 1
    },
    epOverview: {
        color: COLORS.textMuted,
        fontSize: 11,
        marginTop: 2
    },
    epRuntimeText: {
        color: COLORS.textMuted,
        fontSize: 10,
        marginTop: 4
    },
    franchiseCard: {
        width: 140,
        position: 'relative'
    },
    franchiseCardCurrent: {
        opacity: 1
    },
    franchiseThumb: {
        width: 140,
        height: 200,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: COLORS.surface,
        position: 'relative'
    },
    franchiseYouBadge: {
        position: 'absolute',
        bottom: 8,
        left: 8,
        right: 8,
        backgroundColor: COLORS.brand,
        borderRadius: 4,
        paddingVertical: 4,
        paddingHorizontal: 6,
        alignItems: 'center'
    },
    franchiseYouBadgeText: {
        color: '#fff',
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 1
    },
    franchiseTitle: {
        color: COLORS.textPrimary,
        fontSize: 12,
        fontWeight: '700',
        marginTop: 6,
        maxWidth: 140
    },
    franchiseYear: {
        color: COLORS.textMuted,
        fontSize: 11,
        marginTop: 2
    },
    castRow: {
        paddingTop: 6,
        gap: 14
    },
    castCard: {
        width: 80,
        alignItems: 'center'
    },
    castAvatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        overflow: 'hidden',
        backgroundColor: COLORS.surfaceAlt,
        marginBottom: 6
    },
    actorName: { color: COLORS.textPrimary, fontSize: 11, fontWeight: '700', textAlign: 'center' },
    characterName: { color: COLORS.textMuted, fontSize: 10, textAlign: 'center' },
    similarRow: {
        paddingTop: 8
    },
    blogRow: {
        paddingTop: 8,
        paddingBottom: 4
    },
    editorialCard: {
        width: 290,
        backgroundColor: COLORS.surface,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: 'hidden',
        marginRight: 14
    },
    editorialCardCover: {
        width: '100%',
        height: 140
    },
    editorialCardContent: {
        padding: 12
    },
    editorialCategoryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6
    },
    editorialCategoryText: {
        backgroundColor: COLORS.surfaceAlt,
        color: COLORS.brand,
        fontSize: 10,
        fontWeight: '800',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        letterSpacing: 0.5
    },
    editorialReadTime: {
        color: COLORS.textMuted,
        fontSize: 11
    },
    editorialCardTitle: {
        color: COLORS.textPrimary,
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 4,
        lineHeight: 18
    },
    editorialCardDesc: {
        color: COLORS.textMuted,
        fontSize: 12,
        lineHeight: 16,
        marginBottom: 8
    },
    editorialCta: {
        color: COLORS.brand,
        fontSize: 12,
        fontWeight: '700'
    }
});
