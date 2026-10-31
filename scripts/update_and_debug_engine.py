import re

def update_file(path, replacements):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    for pattern, repl in replacements:
        if isinstance(pattern, str):
            if pattern not in content:
                print(f"[WARN] String pattern '{pattern[:40]}...' not found in {path}")
            content = content.replace(pattern, repl)
        else:
            content, count = pattern.subn(repl, content)
            if count == 0:
                print(f"[WARN] Regex pattern '{pattern.pattern[:40]}...' not found in {path}")
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"[OK] Updated {path}")

# 1. Update providers.ts
update_file('downloads/streamapp-worker/src/providers.ts', [
    (
        '''    superembed: {
        slug: 'superembed',
        displayName: 'MultiEmbed (VIP Audio Dub)',
        resolveMode: 'iframe_only',
        buildUrl: (id, type, s, e) =>
            isTv(type, s)
                ? `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${cleanS(s)}&e=${cleanE(e)}`
                : `https://multiembed.mov/?video_id=${id}&tmdb=1`,
        note: 'Alias for multiembed.',
    },''',
        '''    superembed: {
        slug: 'superembed',
        displayName: 'MultiEmbed (VIP Audio Dub)',
        resolveMode: 'disabled',
        buildUrl: (id, type, s, e) =>
            isTv(type, s)
                ? `https://player.videasy.to/tv/${id}/${cleanS(s)}/${cleanE(e)}?color=FFA500`
                : `https://player.videasy.to/movie/${id}?color=FFA500`,
        note: 'Disabled: ad scripts (aclib.runPop); superseded by player.videasy.to.',
    },'''
    )
])

# 2. Update downloads/streamapp-worker/src/index.ts
update_file('downloads/streamapp-worker/src/index.ts', [
    ('version: "2.4.38"', 'version: "2.4.39"'),
    ('versionCode: 278', 'versionCode: 279'),
    (
        'releaseNotes: "v2.4.37: Unified 4-Source Backend Engine strictly implementing Donkey.to (VidStuck ultra-fast & Vidy multi-audio), AnimeSalt regional dubs, MovieBox OneRoom CDN failover, multi-key TMDB rotation, and zero-popup sandboxed frictionless UX."',
        'releaseNotes: "v2.4.39: Videasy Full-Catalog Multi-Audio Engine (17 Audio Tracks & Subtitles), sub-200ms VidStuck backup, zero-popup sandboxed AdShield, and zero background audio leak."'
    )
])

# 3. Update frontend/src/config/version.js
update_file('frontend/src/config/version.js', [
    ("CURRENT_VERSION = '2.4.38'", "CURRENT_VERSION = '2.4.39'"),
    ("CURRENT_CODE = 278", "CURRENT_CODE = 279")
])

# 4. Update frontend/public/version.json
update_file('frontend/public/version.json', [
    ('"version": "2.4.38"', '"version": "2.4.39"'),
    ('"versionCode": 278', '"versionCode": 279'),
    ('"releaseNotes": "v2.4.38: Videasy Full-Catalog Multi-Audio (17 Languages), VidStuck ultra-fast backup, zero-popup sandboxed AdShield. Unified 4-Source Backend Engine strictly implementing Donkey.to (VidStuck ultra-fast & Vidy multi-audio), AnimeSalt regional dubs, MovieBox OneRoom CDN failover, multi-key TMDB rotation, and zero-popup sandboxed frictionless UX."',
     '"releaseNotes": "v2.4.39: Videasy Full-Catalog Multi-Audio Engine (17 Audio Tracks & Subtitles), sub-200ms VidStuck backup, zero-popup sandboxed AdShield, and zero background audio leak."')
])

# 5. Update frontend/public/sw.js
update_file('frontend/public/sw.js', [
    ("const VERSION = 'v47'", "const VERSION = 'v48'")
])

# 6. Update frontend/app.json
update_file('frontend/app.json', [
    ('"version": "2.4.31"', '"version": "2.4.39"'),
    ('"buildNumber": "271"', '"buildNumber": "279"'),
    ('"versionCode": 271', '"versionCode": 279')
])

# 7. Update frontend/src/utils/resolver.js
update_file('frontend/src/utils/resolver.js', [
    (
        "['vidstuck', 'vidstuck_imdb', 'autoembed', 'autoembed_imdb', 'vidy', 'vidy_imdb', 'videasy', 'videasy_imdb', 'multiembed', 'multiembed_imdb', 'vidsrc_rip', 'vidsrc', '2embed', 'smashystream', 'vidlink', 'vidlink_sub', 'vidlink_dub', 'nontongo', 'nontongo_imdb']",
        "['videasy', 'videasy_imdb', 'vidstuck', 'vidstuck_imdb', 'vidy', 'vidy_imdb', 'vidsrc_rip', 'vidsrc', '2embed', 'smashystream', 'vidlink', 'vidlink_sub', 'vidlink_dub', 'nontongo', 'nontongo_imdb']"
    ),
    (
        '''    return {
        streamUrl: mirror.mirror || mirror.url,
        streamKind: 'embed',
        sourceName: mirror.label,
    };''',
        '''    return {
        streamUrl: mirror.mirror || mirror.url || mirror.playbackUrl,
        streamKind: mirror.kind === 'playback' ? 'direct' : 'embed',
        sourceName: mirror.label || mirror.sourceName,
    };'''
    )
])

# 8. Update frontend/src/screens/PlayerScreen.js
update_file('frontend/src/screens/PlayerScreen.js', [
    (
        "(wantedLang === 'hi' && (m.provider === 'multiembed' || m.label?.toLowerCase().includes('multiembed')))",
        "(wantedLang === 'hi' && (m.provider === 'videasy' || m.provider === 'smashystream'))"
    )
])

# 9. Update frontend/src/components/ShadowStreamPlayer.js
update_file('frontend/src/components/ShadowStreamPlayer.js', [
    (
        '''        // Check if current stream is already a verified dub:
        const currentMirror = mirrorList && mirrorList[activeMirrorIdx];
        const isDubMirror = currentMirror && (
            currentMirror.isDub ||
            currentMirror.provider?.includes('animesalt') ||
            (cleanLang === 'hi' && (currentMirror.provider === 'multiembed' || currentMirror.label?.toLowerCase().includes('multiembed'))) ||
            (['es', 'fr', 'de', 'it', 'pt', 'ru'].includes(cleanLang) && (currentMirror.provider === 'smashystream' || currentMirror.label?.toLowerCase().includes('smashystream')))
        );

        const langLabel = LANGUAGE_NAMES[cleanLang] || cleanLang.toUpperCase();
        if (isDubMirror) {
            if (currentMirror.provider === 'multiembed' || currentMirror.label?.toLowerCase().includes('multiembed')) {
                setDubToast(`🎙️ MultiEmbed Dual Audio Server: Tap "Server 2 (Hindi Dub)" inside player for Hindi voice.`);
                setTimeout(() => setDubToast(null), 6000);
            } else if (currentMirror.provider?.includes('animesalt')) {
                setDubToast(`🎙️ Playing ${currentMirror.label || 'Dubbed Audio'} (${langLabel})`);
                setTimeout(() => setDubToast(null), 4000);
            } else {
                setDubToast(`🎙️ Playing ${currentMirror.label || langLabel + ' Dub'}`);
                setTimeout(() => setDubToast(null), 4000);
            }
        }''',
        '''        // Check if current stream is already a verified dub:
        const currentMirror = mirrorList && mirrorList[activeMirrorIdx];
        const isDubMirror = currentMirror && (
            currentMirror.isDub ||
            currentMirror.provider?.includes('animesalt') ||
            (cleanLang === 'hi' && (currentMirror.provider === 'videasy' || currentMirror.provider === 'smashystream')) ||
            (['es', 'fr', 'de', 'it', 'pt', 'ru'].includes(cleanLang) && (currentMirror.provider === 'videasy' || currentMirror.provider === 'smashystream'))
        );

        const langLabel = LANGUAGE_NAMES[cleanLang] || cleanLang.toUpperCase();
        if (isDubMirror) {
            if (currentMirror.provider === 'videasy' || currentMirror.label?.toLowerCase().includes('videasy')) {
                setDubToast(`🎙️ Videasy Multi-Audio HD: In-player audio track switcher active (${langLabel}).`);
                setTimeout(() => setDubToast(null), 4000);
            } else if (currentMirror.provider?.includes('animesalt')) {
                setDubToast(`🎙️ Playing ${currentMirror.label || 'Dubbed Audio'} (${langLabel})`);
                setTimeout(() => setDubToast(null), 4000);
            } else {
                setDubToast(`🎙️ Playing ${currentMirror.label || langLabel + ' Dub'}`);
                setTimeout(() => setDubToast(null), 4000);
            }
        }'''
    ),
    (
        "(m.isDub || m.isSub || m.provider === 'multiembed' || m.provider === 'smashystream' || (m.language && m.language !== 'en' && m.language !== 'multi'))",
        "(m.isDub || m.isSub || m.provider === 'videasy' || m.provider === 'smashystream' || (m.language && m.language !== 'en' && m.language !== 'multi'))"
    )
])

# 10. Update scripts/test_player_lifecycle.js
update_file('scripts/test_player_lifecycle.js', [
    ("CURRENT_VERSION = '2.4.38'", "CURRENT_VERSION = '2.4.39'"),
    ("CURRENT_CODE = 278", "CURRENT_CODE = 279"),
    ('version: "2.4.38"', 'version: "2.4.39"'),
    ('versionCode: 278', 'versionCode: 279'),
    ("const VERSION = 'v47'", "const VERSION = 'v48'")
])

print("\nAll updates completed successfully!")
