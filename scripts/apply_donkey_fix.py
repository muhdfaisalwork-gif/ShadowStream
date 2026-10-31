import re

def update_file(path, replacements):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    for pattern, repl in replacements:
        if isinstance(pattern, str):
            if pattern not in content:
                print(f"[WARN] String pattern not found in {path}: '{pattern[:50]}...'")
            content = content.replace(pattern, repl)
        else:
            content, count = pattern.subn(repl, content)
            if count == 0:
                print(f"[WARN] Regex pattern not found in {path}: '{pattern.pattern[:50]}...'")
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"[OK] Updated {path}")

# 1. Update providers.ts
with open('downloads/streamapp-worker/src/providers.ts', 'r', encoding='utf-8') as f:
    prov = f.read()

# Disable videasy and set DEFAULT_MIRROR_ORDER to clean Donkey trio
prov = re.sub(
    r"videasy:\s*\{[\s\S]*?note:\s*['\"].*?['\"],?\s*\},",
    '''videasy: {
        slug: 'videasy',
        displayName: 'Videasy HD',
        resolveMode: 'disabled',
        buildUrl: (id, type, s, e) =>
            isTv(type, s)
                ? `https://vidstuck.cc/embed/tv/${id}/${cleanS(s)}/${cleanE(e)}?loading=2&color=FFA500`
                : `https://vidstuck.cc/embed/movie/${id}?loading=2&color=FFA500`,
        note: 'Disabled: backend.videasy.to DNS NXDOMAIN; superseded by vidstuck.cc.',
    },''',
    prov
)
prov = re.sub(
    r"export const DEFAULT_MIRROR_ORDER = \[.*?\];",
    "export const DEFAULT_MIRROR_ORDER = ['vidstuck', 'nontongo', 'vidsrc', '2embed', 'smashystream'];",
    prov
)
with open('downloads/streamapp-worker/src/providers.ts', 'w', encoding='utf-8') as f:
    f.write(prov)
print("[OK] Updated providers.ts")

# 2. Update streamapp-worker/src/index.ts
with open('downloads/streamapp-worker/src/index.ts', 'r', encoding='utf-8') as f:
    worker = f.read()

# Update version to 2.4.40, code 280
worker = worker.replace('version: "2.4.39"', 'version: "2.4.40"')
worker = worker.replace('versionCode: 279', 'versionCode: 280')
worker = worker.replace(
    'releaseNotes: "v2.4.39: Videasy Full-Catalog Multi-Audio Engine (17 Audio Tracks & Subtitles), sub-200ms VidStuck backup, zero-popup sandboxed AdShield, and zero background audio leak."',
    'releaseNotes: "v2.4.40: Promote VidStuck ultra-fast HTML5 engine to #1 Main (Donkey.to parity), purge broken videasy/vidy DNS failures, NontonGo HD & VidSrc backups, hardened AdShield sandbox, zero background audio leak."'
)

# Update buildFallbackAvailability to have vidstuck as #1, nontongo as #2, vidsrc as #3
# Find and remove videasy entry from buildFallbackAvailability
worker = re.sub(
    r"// 1\. Videasy - Donkey\.to Primary Multi-Audio HD Engine[\s\S]*?\}\);\s*",
    "",
    worker
)
# Update vidstuck URL to include color=FFA500
worker = worker.replace(
    "`https://vidstuck.cc/embed/tv/${tmdbId}/${s}/${e}?loading=2`",
    "`https://vidstuck.cc/embed/tv/${tmdbId}/${s}/${e}?loading=2&color=FFA500`"
)
worker = worker.replace(
    "`https://vidstuck.cc/embed/movie/${tmdbId}?loading=2`",
    "`https://vidstuck.cc/embed/movie/${tmdbId}?loading=2&color=FFA500`"
)

# Update PROVIDER_RANK in index.ts
worker = worker.replace(
    "const PROVIDER_RANK = ['archive_org', 'direct', 'videasy', 'vidstuck', 'vidy', 'vidsrc', '2embed', 'nontongo', 'smashystream', 'vidlink_sub', 'vidlink_dub', 'vidlink'];",
    "const PROVIDER_RANK = ['archive_org', 'direct', 'vidstuck', 'nontongo', 'vidsrc', '2embed', 'smashystream', 'vidlink_sub', 'vidlink_dub', 'vidlink'];"
)

# Remove videasy from /stream/resolve
worker = re.sub(
    r"// 1\. Videasy - Donkey\.to Primary Multi-Audio HD Engine[\s\S]*?\}\);\s*",
    "",
    worker
)

with open('downloads/streamapp-worker/src/index.ts', 'w', encoding='utf-8') as f:
    f.write(worker)
print("[OK] Updated index.ts")

# 3. Update frontend/src/config/version.js
update_file('frontend/src/config/version.js', [
    ("CURRENT_VERSION = '2.4.39'", "CURRENT_VERSION = '2.4.40'"),
    ("CURRENT_CODE = 279", "CURRENT_CODE = 280"),
    ("CURRENT_RELEASE_DATE = '2026-10-31'", "CURRENT_RELEASE_DATE = '2026-11-01'")
])

# 4. Update frontend/public/version.json
update_file('frontend/public/version.json', [
    ('"version": "2.4.39"', '"version": "2.4.40"'),
    ('"versionCode": 279', '"versionCode": 280'),
    ('"releaseDate": "2026-10-31"', '"releaseDate": "2026-11-01"'),
    ('"releaseNotes": "v2.4.39: Videasy Full-Catalog Multi-Audio Engine (17 Audio Tracks & Subtitles), sub-200ms VidStuck backup, zero-popup sandboxed AdShield, and zero background audio leak."',
     '"releaseNotes": "v2.4.40: VidStuck ultra-fast HTML5 engine promoted to #1 Main (Donkey.to parity), purged broken videasy/vidy DNS failures, NontonGo HD & VidSrc backups, zero-popup sandboxed AdShield, and zero audio leak."')
])

# 5. Update frontend/public/sw.js
update_file('frontend/public/sw.js', [
    ("const VERSION = 'v48'", "const VERSION = 'v49'")
])

# 6. Update frontend/app.json
update_file('frontend/app.json', [
    ('"version": "2.4.39"', '"version": "2.4.40"'),
    ('"buildNumber": "279"', '"buildNumber": "280"'),
    ('"versionCode": 279', '"versionCode": 280')
])

# 7. Update frontend/src/utils/resolver.js
update_file('frontend/src/utils/resolver.js', [
    (
        "['videasy', 'videasy_imdb', 'vidstuck', 'vidstuck_imdb', 'vidy', 'vidy_imdb', 'vidsrc_rip', 'vidsrc', '2embed', 'smashystream', 'vidlink', 'vidlink_sub', 'vidlink_dub', 'nontongo', 'nontongo_imdb']",
        "['vidstuck', 'vidstuck_imdb', 'nontongo', 'nontongo_imdb', 'vidsrc_rip', 'vidsrc', '2embed', 'smashystream', 'vidlink', 'vidlink_sub', 'vidlink_dub']"
    )
])

# 8. Update frontend/src/screens/PlayerScreen.js
with open('frontend/src/screens/PlayerScreen.js', 'r', encoding='utf-8') as f:
    ps = f.read()

# Update dyn list to make vidstuck #1, nontongo #2, vidsrc #3, 2embed #4, smashystream #5
# Movies
ps = re.sub(
    r"// 1\. Videasy - Donkey\.to Primary Multi-Audio HD Engine[\s\S]*?dyn\.push\(\{ source: 'videasy'.*?\}\);\s*",
    "",
    ps
)
ps = ps.replace(
    "`https://vidstuck.cc/embed/movie/${finalTmdb}?loading=2`",
    "`https://vidstuck.cc/embed/movie/${finalTmdb}?loading=2&color=FFA500`"
)
ps = ps.replace(
    "`https://vidstuck.cc/embed/tv/${finalTmdb}/${activeS || 1}/${activeE || 1}?loading=2`",
    "`https://vidstuck.cc/embed/tv/${finalTmdb}/${activeS || 1}/${activeE || 1}?loading=2&color=FFA500`"
)

# Update PROVIDER_RANK in PlayerScreen.js
ps = ps.replace(
    "const PROVIDER_RANK = [\n                    'archive_org',\n                    'direct',\n                    'videasy',\n                    'vidstuck',",
    "const PROVIDER_RANK = [\n                    'archive_org',\n                    'direct',\n                    'vidstuck',\n                    'nontongo',\n                    'vidsrc',\n                    '2embed',\n                    'smashystream',"
)

with open('frontend/src/screens/PlayerScreen.js', 'w', encoding='utf-8') as f:
    f.write(ps)
print("[OK] Updated PlayerScreen.js")

# 9. Update frontend/src/components/ShadowStreamPlayer.js
with open('frontend/src/components/ShadowStreamPlayer.js', 'r', encoding='utf-8') as f:
    ssp = f.read()

# Update selectDubAudio: remove videasy fallback, route to vidstuck / smashystream / animesalt
ssp = re.sub(
    r"// 4\. Full-Catalog Audio Dubs: Videasy Multi-Audio HD Engine \(Zero Popups\)[\s\S]*?// 5\. Universal Dub & Subtitle pairing",
    "// 4. Universal Dub & Subtitle pairing (VidStuck HTML5 + OpenSubtitles sync)",
    ssp
)

# Also update isDubMirror in line 250+
ssp = ssp.replace(
    "(currentMirror.provider === 'videasy' || currentMirror.provider === 'smashystream')",
    "(currentMirror.provider === 'vidstuck' || currentMirror.provider === 'smashystream')"
)
ssp = ssp.replace(
    "setDubToast(`🎙️ Videasy Multi-Audio HD: In-player audio track switcher active (${langLabel}).`);",
    "setDubToast(`🎙️ Audio: ${langLabel} (Select audio track inside player controls)`);"
)

with open('frontend/src/components/ShadowStreamPlayer.js', 'w', encoding='utf-8') as f:
    f.write(ssp)
print("[OK] Updated ShadowStreamPlayer.js")

# 10. Update test_player_lifecycle.js
update_file('scripts/test_player_lifecycle.js', [
    ("CURRENT_VERSION = '2.4.39'", "CURRENT_VERSION = '2.4.40'"),
    ("CURRENT_CODE = 279", "CURRENT_CODE = 280"),
    ('version: "2.4.39"', 'version: "2.4.40"'),
    ('versionCode: 279', 'versionCode: 280'),
    ("const VERSION = 'v48'", "const VERSION = 'v49'"),
    ("v2.4.39 (code 279, SW v48)", "v2.4.40 (code 280, SW v49)"),
    ("v2.4.39 / code 279 / SW v48", "v2.4.40 / code 280 / SW v49"),
    ("CURRENT_VERSION = 2.4.39", "CURRENT_VERSION = 2.4.40"),
    ("version = 2.4.39", "version = 2.4.40"),
    ("versionCode 279", "versionCode 280"),
    ("public/sw.js must be v48", "public/sw.js must be v49"),
    ("assert(playerScreenJs.includes('player.videasy.to'), 'PlayerScreen.js must contain primary donkey player.videasy.to engine');\n", ""),
    ("assert(workerIndexTs.includes('player.videasy.to'), 'worker index.ts must use videasy as clean #1 primary stream');\n", "")
])

print("\nAll Donkey parity & VidStuck #1 updates applied cleanly!")
