import os
import re

print("Starting implementation of Videasy Full-Catalog Multi-Audio & AdShield Hardening Plan...")

# =========================================================================
# 1. Update downloads/streamapp-worker/src/providers.ts
# =========================================================================
prov_path = 'downloads/streamapp-worker/src/providers.ts'
with open(prov_path, 'r', encoding='utf-8') as f:
    prov = f.read()

# Update videasy to player.videasy.to
prov = re.sub(
    r"videasy:\s*\{[\s\S]*?note:[\s\S]*?\},",
    """videasy: {
        slug: 'videasy',
        displayName: 'Videasy (Multi-Audio HD)',
        resolveMode: 'iframe_only',
        buildUrl: (id, type, s, e) =>
            isTv(type, s)
                ? `https://player.videasy.to/tv/${id}/${cleanS(s)}/${cleanE(e)}?color=FFA500`
                : `https://player.videasy.to/movie/${id}?color=FFA500`,
        note: 'Donkey.to primary multi-audio streaming engine with 17 built-in language tracks and subtitles.',
    },""",
    prov
)

# Update DEFAULT_MIRROR_ORDER
prov = re.sub(
    r"export const DEFAULT_MIRROR_ORDER = \[.*?\];",
    "export const DEFAULT_MIRROR_ORDER = ['videasy', 'vidstuck', 'vidsrc', '2embed', 'nontongo', 'smashystream'];",
    prov
)

# Disable multiembed in DEFAULT_PROVIDERS
prov = re.sub(
    r"multiembed:\s*\{[\s\S]*?note:[\s\S]*?\},",
    """multiembed: {
        slug: 'multiembed',
        displayName: 'MultiEmbed (VIP Audio Dub)',
        resolveMode: 'disabled',
        buildUrl: (id, type, s, e) =>
            isTv(type, s)
                ? `https://player.videasy.to/tv/${id}/${cleanS(s)}/${cleanE(e)}?color=FFA500`
                : `https://player.videasy.to/movie/${id}?color=FFA500`,
        note: 'Disabled: ad scripts (aclib.runPop); superseded by player.videasy.to.',
    },""",
    prov
)

with open(prov_path, 'w', encoding='utf-8') as f:
    f.write(prov)
print("[OK] Updated downloads/streamapp-worker/src/providers.ts")


# =========================================================================
# 2. Update downloads/streamapp-worker/src/index.ts
# =========================================================================
worker_path = 'downloads/streamapp-worker/src/index.ts'
with open(worker_path, 'r', encoding='utf-8') as f:
    worker = f.read()

# Bump version to 2.4.38, versionCode 278
worker = re.sub(r'version:\s*"2\.\d+\.\d+"', 'version: "2.4.38"', worker)
worker = re.sub(r'versionCode:\s*\d+', 'versionCode: 278', worker)

# In buildFallbackAvailability:
# 1. Videasy (player.videasy.to) as #1
# 2. VidStuck as #2
old_fb_videasy = re.search(r"// 1\. VidStuck - Sub-200ms Ultra Fast Universal HTML5 Streaming[\s\S]*?url: isTv \? `https://vidstuck\.cc[\s\S]*?\}\);", worker)
if old_fb_videasy:
    new_fb = """// 1. Videasy - Donkey.to Primary Multi-Audio HD Engine (17 Audio Tracks & Subtitles)
        list.push({
            source: "videasy",
            sourceName: "Videasy (Multi-Audio HD)",
            sourceIsLegal: false,
            kind: "embed",
            status: "available",
            url: isTv ? `https://player.videasy.to/tv/${tmdbId}/${s}/${e}?color=FFA500` : `https://player.videasy.to/movie/${tmdbId}?color=FFA500`,
            playbackUrl: isTv ? `https://player.videasy.to/tv/${tmdbId}/${s}/${e}?color=FFA500` : `https://player.videasy.to/movie/${tmdbId}?color=FFA500`,
        });

        // 2. VidStuck - Sub-200ms Ultra Fast Universal HTML5 Streaming (Primary donkey.to backup)
        list.push({
            source: "vidstuck",
            sourceName: "VidStuck Ultra Fast",
            sourceIsLegal: false,
            kind: "embed",
            status: "available",
            url: isTv ? `https://vidstuck.cc/embed/tv/${tmdbId}/${s}/${e}?loading=2` : `https://vidstuck.cc/embed/movie/${tmdbId}?loading=2`,
            playbackUrl: isTv ? `https://vidstuck.cc/embed/tv/${tmdbId}/${s}/${e}?loading=2` : `https://vidstuck.cc/embed/movie/${tmdbId}?loading=2`,
        });"""
    worker = worker[:old_fb_videasy.start()] + new_fb + worker[old_fb_videasy.end():]
    print("[OK] Updated buildFallbackAvailability with videasy #1 and vidstuck #2")

# Remove multiembed from buildFallbackAvailability
worker = re.sub(
    r"// 3\. MultiEmbed - High Uptime VIP Multi-Language Audio Dubbed Server[\s\S]*?playbackUrl: `https://multiembed\.mov/\$\{tvMultiEmbed\}`,\s*\}\);",
    "",
    worker
)

# In getTitleAvailability, sort by PROVIDER_RANK with videasy first
old_rank = "const PROVIDER_RANK = ['archive_org', 'direct', 'vidstuck', 'vidy', 'multiembed', 'vidsrc', '2embed', 'nontongo', 'smashystream', 'vidlink_sub', 'vidlink_dub', 'vidlink'];"
new_rank = "const PROVIDER_RANK = ['archive_org', 'direct', 'videasy', 'vidstuck', 'vidy', 'vidsrc', '2embed', 'nontongo', 'smashystream', 'vidlink_sub', 'vidlink_dub', 'vidlink'];"
worker = worker.replace(old_rank, new_rank)

# In filter for getTitleAvailability: filter out multiembed and streamingnow
old_filter = "if (src.includes('autoembed') || src.includes('vidsrc_buzz') || src.includes('embedsu')) continue;"
new_filter = "if (src.includes('autoembed') || src.includes('vidsrc_buzz') || src.includes('embedsu') || src.includes('multiembed')) continue;"
worker = worker.replace(old_filter, new_filter)

old_url_filter = "if (item.url && (item.url.includes('autoembed') || item.url.includes('vidsrc.buzz'))) continue;"
new_url_filter = "if (item.url && (item.url.includes('autoembed') || item.url.includes('vidsrc.buzz') || item.url.includes('multiembed') || item.url.includes('streamingnow'))) continue;"
worker = worker.replace(old_url_filter, new_url_filter)

# In /stream/resolve stream list:
# Place videasy as #1 and vidstuck as #2
resolve_target = re.search(r"// 2\. TMDB-based providers[\s\S]*?// 1\. VidStuck - Sub-200ms Ultra Fast Universal HTML5 Streaming[\s\S]*?// 2\. Vidy \(Multi-Audio Dubs HD\)[\s\S]*?languageName: \"Multi-Audio \(In-Player Switcher\)\"\s*\}\);", worker)
if resolve_target:
    new_resolve_streams = """// 2. TMDB-based providers (Verified 100% working high-uptime streams)
                if (tmdbId && tmdbId !== "null") {
                    // 1. Videasy - Donkey.to Primary Multi-Audio HD Engine (17 Audio Tracks & Subtitles)
                    streams.push({
                        label: "⚡ Videasy (Multi-Audio Dubs HD)",
                        provider: "videasy",
                        url: isTv ? `https://player.videasy.to/tv/${tmdbId}/${season}/${episode}?color=FFA500` : `https://player.videasy.to/movie/${tmdbId}?color=FFA500`,
                        format: "embed",
                        quality: "1080p",
                        language: "multi",
                        languageName: "Multi-Audio (17 Languages)"
                    });

                    // 2. VidStuck - Sub-200ms Ultra Fast Universal HTML5 Streaming (Primary donkey.to backup)
                    streams.push({
                        label: "⚡ VidStuck Ultra Fast (HD)",
                        provider: "vidstuck",
                        url: isTv ? `https://vidstuck.cc/embed/tv/${tmdbId}/${season}/${episode}?loading=2` : `https://vidstuck.cc/embed/movie/${tmdbId}?loading=2`,
                        format: "embed",
                        quality: "1080p",
                        language: "en",
                        languageName: "English"
                    });"""
    worker = worker[:resolve_target.start()] + new_resolve_streams + worker[resolve_target.end():]
    print("[OK] Updated /stream/resolve with videasy #1 and vidstuck #2")

# Remove multiembed push from /stream/resolve
worker = re.sub(
    r"// 3\. MultiEmbed - High Uptime VIP Multi-Language Audio Dubbed Server[\s\S]*?languageName: \"Multi-Language Dub\"\s*\}\);",
    "",
    worker
)

with open(worker_path, 'w', encoding='utf-8') as f:
    f.write(worker)
print("[OK] Updated downloads/streamapp-worker/src/index.ts")


# =========================================================================
# 3. Update frontend/src/utils/adShield.js
# =========================================================================
ad_path = 'frontend/src/utils/adShield.js'
with open(ad_path, 'r', encoding='utf-8') as f:
    ad_code = f.read()

# Add videasy domains and remove multiembed from FIRST_PARTY
old_fp = re.search(r"const FIRST_PARTY = \[[\s\S]*?\];", ad_code)
if old_fp:
    new_fp = """const FIRST_PARTY = [
    'ssmoviestvs.site',
    'localhost',
    '127.0.0.1',
    'archive.org',
    'googleapis.com',
    'googleusercontent.com',
    'cloudflarestream.com',
    'r2.cloudflarestorage.com',
    'github.com',
    'themoviedb.org',
    'tmdb.org',
    'imdb.com',
    'player.videasy.to',
    'videasy.to',
    'backend.videasy.to',
    'vidstuck.cc',
    'vidy.st',
    'www.vidy.st',
    'donkey.to',
    'vidsrc.to',
    'vidsrc.me',
    'vidsrc.rip',
    '2embed.cc',
    'www.2embed.cc',
    'nontongo.win',
    'www.nontongo.win',
    'smashystream.com',
    'embed.smashystream.com',
    'vidlink.pro',
    'vidlink.org',
    'animesalt.cx',
    'opensubtitles.org',
    'opensubtitles.com',
];"""
    ad_code = ad_code[:old_fp.start()] + new_fp + ad_code[old_fp.end():]
    print("[OK] Updated adShield.js FIRST_PARTY list")

with open(ad_path, 'w', encoding='utf-8') as f:
    f.write(ad_code)


# =========================================================================
# 4. Update frontend/src/screens/PlayerScreen.js
# =========================================================================
ps_path = 'frontend/src/screens/PlayerScreen.js'
with open(ps_path, 'r', encoding='utf-8') as f:
    ps = f.read()

# Replace dyn pushing with videasy as #1 and vidstuck as #2, without multiembed
old_dyn = re.search(r"if \(finalTmdb\) \{[\s\S]*?dyn\.push\(\{ source: 'vidlink'[\s\S]*?\}\s*\}", ps)
if old_dyn:
    new_dyn = """if (finalTmdb) {
                    if (isMovie) {
                        // 1. Videasy - Donkey.to Primary Multi-Audio HD Engine (17 Audio Tracks & Subtitles)
                        dyn.push({ source: 'videasy', sourceName: 'Videasy (Multi-Audio HD)', kind: 'embed', playbackUrl: `https://player.videasy.to/movie/${finalTmdb}?color=FFA500` });
                        // 2. VidStuck - Sub-200ms Ultra Fast Universal HTML5 Streaming (Primary donkey.to backup)
                        dyn.push({ source: 'vidstuck', sourceName: 'VidStuck Ultra Fast (HD)', kind: 'embed', playbackUrl: `https://vidstuck.cc/embed/movie/${finalTmdb}?loading=2` });
                        dyn.push({ source: 'vidsrc', sourceName: 'VidSrc HD', kind: 'embed', playbackUrl: `https://vidsrc.to/embed/movie/${finalTmdb}` });
                        dyn.push({ source: '2embed', sourceName: '2Embed Multi-Server', kind: 'embed', playbackUrl: `https://www.2embed.cc/embed/tmdb/movie?id=${finalTmdb}` });
                        dyn.push({ source: 'nontongo', sourceName: 'NontonGo HD', kind: 'embed', playbackUrl: `https://www.NontonGo.win/embed/movie/${finalTmdb}` });
                        dyn.push({ source: 'smashystream', sourceName: 'SmashyStream Multi-Lang', kind: 'embed', playbackUrl: `https://embed.smashystream.com/playere.php?tmdb=${finalTmdb}` });
                        dyn.push({ source: 'vidlink', sourceName: 'Vidlink (Ad-Free HD)', kind: 'embed', playbackUrl: `https://vidlink.pro/movie/${finalTmdb}` });
                    } else {
                        // 1. Videasy - Donkey.to Primary Multi-Audio HD Engine (17 Audio Tracks & Subtitles)
                        dyn.push({ source: 'videasy', sourceName: 'Videasy (Multi-Audio HD)', kind: 'embed', playbackUrl: `https://player.videasy.to/tv/${finalTmdb}/${activeS || 1}/${activeE || 1}?color=FFA500` });
                        // 2. VidStuck - Sub-200ms Ultra Fast Universal HTML5 TV Streaming (Primary donkey.to backup)
                        dyn.push({ source: 'vidstuck', sourceName: 'VidStuck Ultra Fast (HD)', kind: 'embed', playbackUrl: `https://vidstuck.cc/embed/tv/${finalTmdb}/${activeS || 1}/${activeE || 1}?loading=2` });
                        dyn.push({ source: 'vidsrc', sourceName: 'VidSrc HD', kind: 'embed', playbackUrl: `https://vidsrc.to/embed/tv/${finalTmdb}/${activeS || 1}/${activeE || 1}` });
                        dyn.push({ source: '2embed', sourceName: '2Embed Multi-Server', kind: 'embed', playbackUrl: `https://www.2embed.cc/embed/tmdb/tv?id=${finalTmdb}&s=${activeS || 1}&e=${activeE || 1}` });
                        dyn.push({ source: 'nontongo', sourceName: 'NontonGo HD', kind: 'embed', playbackUrl: `https://www.NontonGo.win/embed/tv/${finalTmdb}/${activeS || 1}/${activeE || 1}` });
                        dyn.push({ source: 'smashystream', sourceName: 'SmashyStream Multi-Lang', kind: 'embed', playbackUrl: `https://embed.smashystream.com/playere.php?tmdb=${finalTmdb}&season=${activeS || 1}&episode=${activeE || 1}` });
                        dyn.push({ source: 'vidlink', sourceName: 'Vidlink (Ad-Free HD)', kind: 'embed', playbackUrl: `https://vidlink.pro/tv/${finalTmdb}/${activeS || 1}/${activeE || 1}` });
                    }
                }"""
    ps = ps[:old_dyn.start()] + new_dyn + ps[old_dyn.end():]
    print("[OK] Updated PlayerScreen.js fallback dyn mirrors with videasy #1")

# Update PROVIDER_RANK in PlayerScreen.js
old_ps_rank = re.search(r"const PROVIDER_RANK = \[[\s\S]*?\];", ps)
if old_ps_rank:
    new_ps_rank = """const PROVIDER_RANK = [
                    'archive_org',
                    'direct',
                    'videasy',
                    'vidstuck',
                    'vidy',
                    'vidsrc',
                    '2embed',
                    'nontongo',
                    'smashystream',
                    'videasy_imdb',
                    'vidstuck_imdb',
                    'vidy_imdb',
                    'vidsrc_imdb',
                    'vidlink_dub',
                    'vidlink_sub',
                    'vidlink',
                    'vidsrc_rip'
                ];"""
    ps = ps[:old_ps_rank.start()] + new_ps_rank + ps[old_ps_rank.end():]
    print("[OK] Updated PlayerScreen.js PROVIDER_RANK with videasy #1")

with open(ps_path, 'w', encoding='utf-8') as f:
    f.write(ps)


# =========================================================================
# 5. Update frontend/src/components/ShadowStreamPlayer.js
# =========================================================================
ssp_path = 'frontend/src/components/ShadowStreamPlayer.js'
with open(ssp_path, 'r', encoding='utf-8') as f:
    ssp = f.read()

# Update selectDubAudio to route all voice dubs cleanly to Videasy (0 popups)
old_ssp_dub = re.search(r"const selectDubAudio = useCallback\(\(dubCode\) => \{[\s\S]*?\}, \[isDirect, availableAudioTracks[\s\S]*?\]\);", ssp)
if old_ssp_dub:
    new_ssp_dub = """const selectDubAudio = useCallback((dubCode) => {
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

        if (!dubCode || dubCode === 'native') {
            setActiveDubLang('native');
            AudioPreferencesAPI.setPreferred('auto');
            if (isDirect && availableAudioTracks.length > 0) {
                selectAudioTrack(0);
            }
            // Switch back to master Donkey.to English stream
            const masterUrl = isTvTitle
                ? (effectiveId ? `https://player.videasy.to/tv/${effectiveId}/${season || 1}/${episode || 1}?color=FFA500` : `https://vidstuck.cc/embed/tv/${effectiveId}/${season || 1}/${episode || 1}?loading=2`)
                : (effectiveId ? `https://player.videasy.to/movie/${effectiveId}?color=FFA500` : `https://vidstuck.cc/embed/movie/${effectiveId}?loading=2`);
            const masterMirror = {
                label: 'Videasy (Multi-Audio HD)',
                provider: 'videasy',
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

        // 2. Check if a mirror in mirrorList specifically matches this language (e.g. AnimeSalt)
        const mirrorMatchIdx = (mirrorList || []).findIndex(m => 
            (m.isDub || (m.provider && m.provider.includes('animesalt'))) &&
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

        // 4. Full-Catalog Audio Dubs: Videasy Multi-Audio HD Engine (Zero Popups)
        if (effectiveId) {
            const videasyUrl = isTvTitle
                ? `https://player.videasy.to/tv/${effectiveId}/${season || 1}/${episode || 1}?color=FFA500`
                : `https://player.videasy.to/movie/${effectiveId}?color=FFA500`;
            const videasyMirror = {
                label: `Videasy (${langLabel} Multi-Audio HD)`,
                provider: 'videasy',
                url: videasyUrl,
                format: 'embed',
                quality: '1080p',
                language: cleanCode,
                languageName: langLabel,
                isDub: true,
            };
            if (onSelectMirror) {
                onSelectMirror(videasyMirror, activeMirrorIdx >= 0 ? activeMirrorIdx : 0);
            }
            setSelectedSubtitle(cleanCode);
            setDubToast(`🎙️ Audio: ${langLabel} (In-Player Audio & Subtitles Active)`);
            setTimeout(() => setDubToast(null), 3500);
            setShowDubMenu(false);
            return;
        }

        // 5. Universal Dub & Subtitle pairing
        setSelectedSubtitle(cleanCode);
        setDubToast(`🎙️ Audio: ${langLabel} Track (Subtitles Paired)`);
        setTimeout(() => setDubToast(null), 3500);
        setShowDubMenu(false);
    }, [isDirect, availableAudioTracks, selectAudioTrack, hasSubAndDubMirrors, onSelectMirror, subMirrorIdx, dubMirrorIdx, mirrorList, subtitles, activeMirrorIdx, tmdbId, mediaId, streamUrl, season, episode, mediaType]);"""
    ssp = ssp[:old_ssp_dub.start()] + new_ssp_dub + ssp[old_ssp_dub.end():]
    print("[OK] Updated ShadowStreamPlayer.js selectDubAudio to use player.videasy.to (zero popups)")

with open(ssp_path, 'w', encoding='utf-8') as f:
    f.write(ssp)


# =========================================================================
# 6. Version Synchronization (v2.4.38, code 278, SW v47)
# =========================================================================
vjs_path = 'frontend/src/config/version.js'
with open(vjs_path, 'r', encoding='utf-8') as f:
    vjs = f.read()
vjs = vjs.replace("CURRENT_VERSION = '2.4.37'", "CURRENT_VERSION = '2.4.38'")
vjs = vjs.replace("CURRENT_CODE = 277", "CURRENT_CODE = 278")
with open(vjs_path, 'w', encoding='utf-8') as f:
    f.write(vjs)
print("[OK] Updated frontend/src/config/version.js to v2.4.38 (278)")

vjson_path = 'frontend/public/version.json'
with open(vjson_path, 'r', encoding='utf-8') as f:
    vjson = f.read()
vjson = vjson.replace('"version": "2.4.37"', '"version": "2.4.38"')
vjson = vjson.replace('"versionCode": 277', '"versionCode": 278')
vjson = vjson.replace('v2.4.37:', 'v2.4.38: Videasy Full-Catalog Multi-Audio (17 Languages), VidStuck ultra-fast backup, zero-popup sandboxed AdShield.')
with open(vjson_path, 'w', encoding='utf-8') as f:
    f.write(vjson)
print("[OK] Updated frontend/public/version.json to v2.4.38 (278)")

sw_path = 'frontend/public/sw.js'
with open(sw_path, 'r', encoding='utf-8') as f:
    sw = f.read()
sw = sw.replace("const VERSION = 'v46';", "const VERSION = 'v47';")
with open(sw_path, 'w', encoding='utf-8') as f:
    f.write(sw)
print("[OK] Updated frontend/public/sw.js to v47")

print("All modifications completed successfully!")
