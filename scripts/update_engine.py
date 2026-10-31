import os
import re

print("Running complete engine update...")

# =========================================================================
# 1. Update frontend/src/screens/HomeScreen.js
# =========================================================================
home_path = 'frontend/src/screens/HomeScreen.js'
with open(home_path, 'r', encoding='utf-8') as f:
    home_code = f.read()

if 'useIsFocused' not in home_code:
    home_code = home_code.replace(
        "import { useRouteMeta } from '../utils/useRouteMeta';",
        "import { useRouteMeta } from '../utils/useRouteMeta';\nimport { useIsFocused } from '@react-navigation/native';"
    )

old_home_effect = re.search(r"// Clean any residual playback query params if returning to Home[\s\S]*?}, \[\]\);", home_code)
if old_home_effect:
    new_home_effect = """const isFocused = useIsFocused();

    // Clean any residual playback query params and terminate audio on returning to Home
    useEffect(() => {
        if (!isFocused) return;
        if (typeof window !== 'undefined' && window.location && window.history?.replaceState) {
            try {
                const url = new URL(window.location.href);
                if (url.searchParams.has('season') || url.searchParams.has('episode') || url.searchParams.has('targetLanguage') || url.searchParams.has('lang')) {
                    url.searchParams.delete('season');
                    url.searchParams.delete('episode');
                    url.searchParams.delete('targetLanguage');
                    url.searchParams.delete('lang');
                    window.history.replaceState({}, '', url.pathname + (url.search ? url.search : '') + url.hash);
                }
            } catch (_) {}
        }
        // Hard terminate any background audio or video
        if (typeof document !== 'undefined') {
            try {
                const mediaEls = document.querySelectorAll('video, audio');
                mediaEls.forEach(el => {
                    try {
                        el.pause();
                        el.removeAttribute('src');
                        el.load();
                    } catch (_) {}
                });
                const iframes = document.querySelectorAll('iframe');
                iframes.forEach(f => {
                    try {
                        if (f.src && !f.src.startsWith('chrome-extension')) {
                            f.src = 'about:blank';
                        }
                    } catch (_) {}
                });
            } catch (_) {}
        }
    }, [isFocused]);"""
    home_code = home_code[:old_home_effect.start()] + new_home_effect + home_code[old_home_effect.end():]
    print("[OK] Updated HomeScreen.js with isFocused audio kill & parameter cleaner")

with open(home_path, 'w', encoding='utf-8') as f:
    f.write(home_code)


# =========================================================================
# 2. Update frontend/src/screens/PlayerScreen.js
# =========================================================================
player_screen_path = 'frontend/src/screens/PlayerScreen.js'
with open(player_screen_path, 'r', encoding='utf-8') as f:
    ps_code = f.read()

# Add resolvedTmdb state if not present
if "const [resolvedTmdb, setResolvedTmdb] = useState(null);" not in ps_code:
    ps_code = ps_code.replace(
        "const [activeMirrorIdx, setActiveMirrorIdx] = useState(0);",
        "const [activeMirrorIdx, setActiveMirrorIdx] = useState(0);\n    const [resolvedTmdb, setResolvedTmdb] = useState(null);"
    )

# When finalTmdb is resolved in resolveStream, call setResolvedTmdb
if "setResolvedTmdb(finalTmdb);" not in ps_code:
    ps_code = ps_code.replace(
        "const finalTmdb = currentTmdb || effectiveTmdb;",
        "const finalTmdb = currentTmdb || effectiveTmdb;\n            if (finalTmdb && finalTmdb !== resolvedTmdb) setResolvedTmdb(String(finalTmdb));"
    )

# Pass resolvedTmdb to ShadowStreamPlayer
ps_code = ps_code.replace(
    "tmdbId={effectiveTmdb}",
    "tmdbId={resolvedTmdb || effectiveTmdb}"
)

# Update vidy URLs to www.vidy.st
ps_code = ps_code.replace("https://vidy.st/movie/${finalTmdb}", "https://www.vidy.st/movie/${finalTmdb}")
ps_code = ps_code.replace("https://vidy.st/tv/${finalTmdb}", "https://www.vidy.st/tv/${finalTmdb}")
ps_code = ps_code.replace("https://vidy.st/movie/${effectiveImdb}", "https://www.vidy.st/movie/${effectiveImdb}")
ps_code = ps_code.replace("https://vidy.st/tv/${effectiveImdb}", "https://www.vidy.st/tv/${effectiveImdb}")

with open(player_screen_path, 'w', encoding='utf-8') as f:
    f.write(ps_code)
print("[OK] Updated PlayerScreen.js with resolvedTmdb state & www.vidy.st")


# =========================================================================
# 3. Update frontend/src/components/ShadowStreamPlayer.js
# =========================================================================
ssp_path = 'frontend/src/components/ShadowStreamPlayer.js'
with open(ssp_path, 'r', encoding='utf-8') as f:
    ssp_code = f.read()

# Ensure extractNumericId is used inside selectDubAudio
old_select_dub = re.search(r"const selectDubAudio = useCallback\(\(dubCode\) => \{[\s\S]*?\}, \[isDirect, availableAudioTracks[\s\S]*?\]\);", ssp_code)
if old_select_dub:
    new_select_dub = """const selectDubAudio = useCallback((dubCode) => {
        const extractNumericId = (val) => {
            if (!val) return null;
            const str = String(val).trim();
            if (/^\\d+$/.test(str) && !/^(19\\d\\d|20\\d\\d)$/.test(str)) return str;
            const m = str.match(/(?:embed\\/movie\\/|embed\\/tv\\/|movie\\/|tv\\/|video_id=|tmdb=|tmdb\\/(?:movie|tv)\\?id=)(\\d+)/i);
            if (m && m[1] && !/^(19\\d\\d|20\\d\\d)$/.test(m[1])) return m[1];
            return null;
        };
        const effectiveId = extractNumericId(tmdbId) || extractNumericId(streamUrl) || extractNumericId(mediaId);
        const isTvTitle = Boolean(season != null || episode != null || mediaType === 'tv');

        const MULTIEMBED_LANG_MAP = {
            hi: 'hindi',
            ta: 'tamil',
            te: 'telugu',
            ml: 'malayalam',
            bn: 'bengali',
            es: 'spanish',
            fr: 'french',
            de: 'german',
            it: 'italian',
            pt: 'portuguese',
            ru: 'russian',
            ja: 'japanese',
            ko: 'korean',
            zh: 'chinese',
            ar: 'arabic',
            tr: 'turkish',
        };

        if (!dubCode || dubCode === 'native') {
            setActiveDubLang('native');
            AudioPreferencesAPI.setPreferred('auto');
            if (isDirect && availableAudioTracks.length > 0) {
                selectAudioTrack(0);
            }
            // Switch back to master Donkey.to English stream
            const masterUrl = isTvTitle
                ? (effectiveId ? `https://vidstuck.cc/embed/tv/${effectiveId}/${season || 1}/${episode || 1}?loading=2` : `https://www.vidy.st/tv/${effectiveId}/${season || 1}/${episode || 1}?color=FFA500`)
                : (effectiveId ? `https://vidstuck.cc/embed/movie/${effectiveId}?loading=2` : `https://www.vidy.st/movie/${effectiveId}?color=FFA500`);
            const masterMirror = {
                label: 'VidStuck Ultra Fast (HD)',
                provider: 'vidstuck',
                url: masterUrl,
                format: 'embed',
                quality: '1080p',
                language: 'en',
                languageName: 'English (Original Master)',
                isDub: false,
            };
            if (onSelectMirror) {
                onSelectMirror(masterMirror, 0);
            }
            setSelectedSubtitle('off');
            setDubToast('🎙️ Audio: English (Original Master)');
            setTimeout(() => setDubToast(null), 3000);
            setShowDubMenu(false);
            return;
        }

        const cleanCode = String(dubCode).toLowerCase().trim();
        setActiveDubLang(cleanCode);
        AudioPreferencesAPI.setPreferred(cleanCode);
        const langLabel = LANGUAGE_NAMES[cleanCode] || cleanCode.toUpperCase();
        const dubWord = MULTIEMBED_LANG_MAP[cleanCode] || cleanCode;

        // 1. Direct Mode with multiple embedded audio tracks
        if (isDirect && availableAudioTracks.length > 1) {
            const match = availableAudioTracks.find(t => 
                (t.lang && t.lang.toLowerCase() === cleanCode) ||
                (t.label && t.label.toLowerCase().includes(langLabel.toLowerCase()))
            );
            if (match) {
                selectAudioTrack(match.idx);
                setDubToast(`🎙️ Audio: ${match.label}`);
                setTimeout(() => setDubToast(null), 3500);
                setShowDubMenu(false);
                return;
            }
        }

        // 2. Check if a mirror in mirrorList specifically matches this language
        const mirrorMatchIdx = (mirrorList || []).findIndex(m => 
            (m.isDub || (m.provider && (m.provider.includes('animesalt') || m.provider.includes('multiembed')))) &&
            (
                m.language === cleanCode || 
                (m.languageName && m.languageName.toLowerCase() === langLabel.toLowerCase()) ||
                (m.provider && m.provider.toLowerCase().includes(`_${cleanCode}`))
            )
        );
        if (mirrorMatchIdx !== -1) {
            if (onSelectMirror) {
                onSelectMirror(mirrorList[mirrorMatchIdx], mirrorMatchIdx);
            }
            setSelectedSubtitle(cleanCode);
            setDubToast(`🎙️ Audio: ${mirrorList[mirrorMatchIdx].label || langLabel + ' Dub'}`);
            setTimeout(() => setDubToast(null), 3500);
            setShowDubMenu(false);
            return;
        }

        // 3. Anime Sub/Dub quick switch
        if (hasSubAndDubMirrors) {
            if (cleanCode === 'ja') {
                if (onSelectMirror && subMirrorIdx !== -1) {
                    onSelectMirror(mirrorList[subMirrorIdx], subMirrorIdx);
                    setSelectedSubtitle('en');
                    setDubToast('🇯🇵 Audio: Japanese (Original SUB)');
                    setTimeout(() => setDubToast(null), 3500);
                    setShowDubMenu(false);
                    return;
                }
            } else if (cleanCode === 'en') {
                if (onSelectMirror && dubMirrorIdx !== -1) {
                    onSelectMirror(mirrorList[dubMirrorIdx], dubMirrorIdx);
                    setDubToast('🎙️ Audio: English DUB');
                    setTimeout(() => setDubToast(null), 3500);
                    setShowDubMenu(false);
                    return;
                }
            }
        }

        // 4. Hindi & Indian Regional Dubs: MultiEmbed Server 2 VIP
        if (['hi', 'ta', 'te', 'ml', 'bn'].includes(cleanCode) && effectiveId) {
            const regionalUrl = isTvTitle
                ? `https://multiembed.mov/?video_id=${effectiveId}&tmdb=1&s=${season || 1}&e=${episode || 1}&server=2&dub=${dubWord}`
                : `https://multiembed.mov/?video_id=${effectiveId}&tmdb=1&server=2&dub=${dubWord}`;
            const regionalMirror = {
                label: `MultiEmbed (${langLabel} Dub VIP)`,
                provider: 'multiembed',
                url: regionalUrl,
                format: 'embed',
                quality: '1080p',
                language: cleanCode,
                languageName: langLabel,
                isDub: true,
            };
            if (onSelectMirror) {
                onSelectMirror(regionalMirror, activeMirrorIdx >= 0 ? activeMirrorIdx : 0);
            }
            setSelectedSubtitle(cleanCode);
            setDubToast(`🎙️ Audio: ${langLabel} Dub Track`);
            setTimeout(() => setDubToast(null), 3500);
            setShowDubMenu(false);
            return;
        }

        // 5. European Multi-Language (Spanish, French, German, Italian, Portuguese, Russian): SmashyStream / MultiEmbed
        if (['es', 'fr', 'de', 'it', 'pt', 'ru'].includes(cleanCode) && effectiveId) {
            const smashyUrl = isTvTitle
                ? `https://embed.smashystream.com/playere.php?tmdb=${effectiveId}&season=${season || 1}&episode=${episode || 1}`
                : `https://embed.smashystream.com/playere.php?tmdb=${effectiveId}`;
            const europeanMirror = {
                label: `SmashyStream (${langLabel} Multi-Lang)`,
                provider: 'smashystream',
                url: smashyUrl,
                format: 'embed',
                quality: '1080p',
                language: cleanCode,
                languageName: langLabel,
                isDub: true,
            };
            if (onSelectMirror) {
                onSelectMirror(europeanMirror, activeMirrorIdx >= 0 ? activeMirrorIdx : 0);
            }
            setSelectedSubtitle(cleanCode);
            setDubToast(`🎙️ Audio: ${langLabel} Track Loaded`);
            setTimeout(() => setDubToast(null), 3500);
            setShowDubMenu(false);
            return;
        }

        // 6. Universal Dub & Subtitle pairing
        setSelectedSubtitle(cleanCode);
        setDubToast(`🎙️ Audio: ${langLabel} Track (Subtitles Paired)`);
        setTimeout(() => setDubToast(null), 3500);
        setShowDubMenu(false);
    }, [isDirect, availableAudioTracks, selectAudioTrack, hasSubAndDubMirrors, onSelectMirror, subMirrorIdx, dubMirrorIdx, mirrorList, subtitles, activeMirrorIdx, tmdbId, mediaId, streamUrl, season, episode, mediaType]);"""
    ssp_code = ssp_code[:old_select_dub.start()] + new_select_dub + ssp_code[old_select_dub.end():]
    print("[OK] Replaced selectDubAudio with robust numeric ID extraction and language mapping")

# Update subDubPill style so pills wrap cleanly
old_subdub_style = re.search(r"subDubPill:\s*\{[\s\S]*?borderColor:\s*'rgba\(255,\s*255,\s*255,\s*0\.15\)',\s*\},", ssp_code)
if old_subdub_style:
    new_subdub_style = """subDubPill: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        minWidth: 80,
    },"""
    ssp_code = ssp_code[:old_subdub_style.start()] + new_subdub_style + ssp_code[old_subdub_style.end():]
    print("[OK] Updated subDubPill styles for clean wrapping")

# Ensure unmount completely clears iframe
if "iframeRef.current.src = 'about:blank';" not in ssp_code:
    ssp_code = ssp_code.replace(
        "unsubBlocked();",
        "unsubBlocked();\n            if (iframeRef.current) { try { iframeRef.current.src = 'about:blank'; } catch (_) {} }"
    )

with open(ssp_path, 'w', encoding='utf-8') as f:
    f.write(ssp_code)
print("[OK] Updated ShadowStreamPlayer.js")
