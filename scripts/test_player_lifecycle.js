const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

console.log('==================================================================');
console.log('   SHADOWSTREAM PLAYER LIFECYCLE, ZERO-SERVER UX & ADSHIELD AUDIT  ');
console.log('==================================================================\n');

// 1. Verify App.js unmountOnBlur configuration
const appJs = fs.readFileSync('frontend/App.js', 'utf-8');
assert(
    appJs.includes('<Drawer.Screen name="Player" component={PlayerScreen} options={{ unmountOnBlur: true }} />'),
    'App.js MUST have unmountOnBlur: true for Player screen'
);
console.log('[PASS] App.js: Player screen configured with unmountOnBlur: true');

// 2. Verify PlayerScreen.js focus & teardown hooks & Videasy primary engine
const playerScreenJs = fs.readFileSync('frontend/src/screens/PlayerScreen.js', 'utf-8');
assert(playerScreenJs.includes('useIsFocused'), 'PlayerScreen.js must import useIsFocused');
assert(playerScreenJs.includes('const isFocused = useIsFocused();'), 'PlayerScreen.js must call useIsFocused hook');
assert(playerScreenJs.includes('if (!isFocused)'), 'PlayerScreen.js must check isFocused to stop playback');
assert(playerScreenJs.includes('navigation.addListener(\'blur\''), 'PlayerScreen.js must clean up on navigation blur');
assert(playerScreenJs.includes('url.searchParams.delete(\'season\')'), 'PlayerScreen.js must clean up URL search params on leave');
assert(playerScreenJs.includes('vidstuck.cc'), 'PlayerScreen.js must contain the clean vidstuck.cc engine');
assert(!playerScreenJs.includes('autoembed.co'), 'PlayerScreen.js must NOT contain XFO-blocked autoembed.co URLs');
assert(!playerScreenJs.includes('multiembed.mov'), 'PlayerScreen.js must NOT contain ad-injecting multiembed.mov URLs');
assert(!playerScreenJs.includes('https://player.videasy.to'), 'PlayerScreen.js must NOT contain the hostile player.videasy.to host');
assert(!playerScreenJs.includes('embed.smashystream.com'), 'PlayerScreen.js must NOT contain the DNS-dead smashystream host');
console.log('[PASS] PlayerScreen.js: Focus & blur listeners, state teardown, URL cleanup, and clean VidStuck #1 engine verified');

// 3. Verify ShadowStreamPlayer.js hard unmount cleanup & ZERO manual server buttons
const shadowPlayerJs = fs.readFileSync('frontend/src/components/ShadowStreamPlayer.js', 'utf-8');
assert(shadowPlayerJs.includes('iframeRef.current.src = \'about:blank\''), 'ShadowStreamPlayer.js must clear iframe src on unmount');
assert(shadowPlayerJs.includes('videoRef.current.pause()'), 'ShadowStreamPlayer.js must pause video on unmount');

// REGRESSION GUARD (v2.4.41): the iframe must NOT carry a `sandbox` attribute.
// Every provider refuses to play inside one:
//   player.videasy.to -> "Iframe Sandbox Detected"
//   vidstuck.cc        -> "Sandbox Detected"
// The check is presence-based, so no token set helps. Popup defence lives in
// adShield.js instead.
// Strip comments so an explanatory note that quotes the old attribute cannot
// make the structural check below match.
const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

assert(
    !/sandbox=\{/i.test(stripComments(shadowPlayerJs)),
    'ShadowStreamPlayer.js must NOT put a sandbox attribute on the provider iframe - every provider refuses to play inside one'
);
assert(
    !/<iframe[^>]*\bsandbox=/i.test(stripComments(shadowPlayerJs)),
    'ShadowStreamPlayer.js provider iframe must not be sandboxed'
);
assert(!shadowPlayerJs.includes('https://player.videasy.to'), 'ShadowStreamPlayer.js must NOT point at the hostile player.videasy.to host');
assert(shadowPlayerJs.includes('dubLang='), 'ShadowStreamPlayer.js must map the dub selector onto VidStuck native dubLang/dubType parameters');
assert(shadowPlayerJs.includes('dubType=1'), 'ShadowStreamPlayer.js must request the dubbed audio track via dubType=1');
assert(!shadowPlayerJs.includes('Switch Source'), 'ShadowStreamPlayer.js must NOT contain manual Switch Source button');
assert(!shadowPlayerJs.includes('Switch Stream Source'), 'ShadowStreamPlayer.js must NOT contain manual Switch Stream Source item');
assert(!shadowPlayerJs.includes('Select Stream Server'), 'ShadowStreamPlayer.js must NOT contain manual Select Stream Server menu');
assert(!shadowPlayerJs.includes('Switch to backup stream?'), 'ShadowStreamPlayer.js must NOT contain manual stalled failover prompt');
// ...but there must still be an escape hatch, because a provider that answers
// HTTP 200 with its own "not found" page is invisible to the client.
assert(shadowPlayerJs.includes('Playback source'), 'ShadowStreamPlayer.js must keep a manual playback-source escape hatch');
assert(shadowPlayerJs.includes("moreSubmenu === 'server'"), 'ShadowStreamPlayer.js must expose the source list as a menu submenu');
assert(shadowPlayerJs.includes('selectDubAudio'), 'ShadowStreamPlayer.js must contain unified selectDubAudio handler');
assert(!shadowPlayerJs.includes('multiembed.mov'), 'ShadowStreamPlayer.js must NOT contain ad-injecting multiembed.mov URLs');
console.log('[PASS] ShadowStreamPlayer.js: unsandboxed iframe, VidStuck dub mapping, source escape hatch, hard media teardown verified');

// 4. Verify version synchronization (v2.4.42 / code 282 / SW v51)
const versionJs = fs.readFileSync('frontend/src/config/version.js', 'utf-8');
assert(versionJs.includes("CURRENT_VERSION = '2.4.44'"), 'version.js must have CURRENT_VERSION = 2.4.42');
assert(versionJs.includes("CURRENT_CODE = 284"), 'version.js must have CURRENT_CODE = 284');

const workerIndexTs = fs.readFileSync('downloads/streamapp-worker/src/index.ts', 'utf-8');
assert(workerIndexTs.includes('version: "2.4.44"'), 'worker index.ts must have version 2.4.42');
assert(workerIndexTs.includes('versionCode: 284'), 'worker index.ts must have versionCode 282');
assert(workerIndexTs.includes('42d807f7358dcea850291d737ac42852'), 'worker index.ts must include Donkey.to TMDB key in pool');
assert(workerIndexTs.includes('99a5d8450024be69a1238450f6c92cbf'), 'worker index.ts must include Qmovies.co TMDB key in pool');
assert(workerIndexTs.includes('vidstuck.cc'), 'worker index.ts must use vidstuck as clean stream provider');
assert(!workerIndexTs.includes('autoembed.co'), 'worker index.ts must NOT contain XFO-blocked autoembed.co URLs');
assert(!workerIndexTs.includes('https://player.videasy.to'), 'worker index.ts must NOT contain the hostile player.videasy.to host');
assert(!workerIndexTs.includes('player.videasy.to/tv'), 'worker index.ts must NOT build player.videasy.to TV URLs');
assert(!workerIndexTs.includes('player.videasy.to/movie'), 'worker index.ts must NOT build player.videasy.to movie URLs');
assert(!workerIndexTs.includes('https://embed.smashystream.com'), 'worker index.ts must NOT contain the DNS-dead embed.smashystream.com host');
assert(!workerIndexTs.includes('https://vidsrc.buzz'), 'worker index.ts must NOT contain the hostile vidsrc.buzz host');
assert(workerIndexTs.includes('probeProviderPresence'), 'worker index.ts must contain the server-side content-presence probe');
assert(workerIndexTs.includes('filterAbsentProviders'), 'worker index.ts must apply the content-presence probe to the availability list');

const swPublic = fs.readFileSync('frontend/public/sw.js', 'utf-8');
assert(swPublic.includes("const VERSION = 'v53'"), 'public/sw.js must be v51');
console.log('[PASS] Version Synchronization & Backend 4-Source Engine: v2.4.44 (code 284, SW v53) strictly verified across all tiers');

// 4b. REGRESSION GUARD (v2.4.42): the auto-switch and the app-side ad rules.
//
// The subframe guard used to be an allowlist of player hosts. Providers chain
// their player through hosts they invent per load (vidsrc.to -> vidsrc.sh ->
// stellarconductornexus.com) and anime players live on other hosts, so the
// allowlist broke playback. Both apps must now guard with a denylist.
const electronMain = fs.readFileSync('packaging/windows/app/resources/app/main.js', 'utf-8');
assert(!electronMain.includes('isAllowedMediaHost'), 'main.js must NOT keep the player-host allowlist - it breaks provider chains');
assert(!electronMain.includes('MEDIA_HOSTS'), 'main.js must NOT keep the player-host allowlist array');
for (const rule of ['/vidstuck.js', '/__ads/', '/cdn-cgi/rum', '/scripts/vidy.js', '/lt/shared/']) {
    assert(
        electronMain.includes(rule),
        `main.js must drop the provider ad script by path: ${rule}`
    );
}
assert(electronMain.includes(".endsWith('.cfd')"), 'main.js must drop the rotating ad hosts by TLD (.cfd)');
assert(electronMain.includes(".endsWith('.qpon')"), 'main.js must drop the rotating ad hosts by TLD (.qpon)');
assert(electronMain.includes('crwdcntrl.net'), 'main.js must drop the Lotame ad iframe host');

const androidBuilder = fs.readFileSync('scraper/build_android_apk.py', 'utf-8');
assert(!androidBuilder.includes('ALLOWED_MEDIA_HOSTS'), 'build_android_apk.py must NOT keep the player-host allowlist');
assert(!androidBuilder.includes('isAllowedMediaHost'), 'build_android_apk.py must NOT keep the player-host allowlist helper');
for (const rule of ['/vidstuck.js', '/__ads/', '/cdn-cgi/rum', '/scripts/vidy.js', '/lt/shared/']) {
    assert(
        androidBuilder.includes(rule),
        `build_android_apk.py must drop the provider ad script by path: ${rule}`
    );
}
assert(androidBuilder.includes('host.endsWith(".cfd")'), 'build_android_apk.py must drop the rotating ad hosts by TLD (.cfd)');
assert(androidBuilder.includes('host.endsWith(".qpon")'), 'build_android_apk.py must drop the rotating ad hosts by TLD (.qpon)');
assert(androidBuilder.includes('crwdcntrl.net'), 'build_android_apk.py must drop the Lotame ad iframe host');
console.log('[PASS] App AdShield: denylist subframe guard + provider ad script paths + rotating ad TLDs enforced in both apps');

// 4c. The web player must switch servers on its own and must offer the user a
// way out when every server has failed.
assert(shadowPlayerJs.includes('watchdogBudgetFor'), 'ShadowStreamPlayer.js must use a per-provider watchdog budget');
assert(shadowPlayerJs.includes('WATCHDOG_MULTIHOP_MS'), 'ShadowStreamPlayer.js must give multi-hop providers a longer budget');
assert(shadowPlayerJs.includes('markProviderDead'), 'ShadowStreamPlayer.js must remember providers that failed');
assert(shadowPlayerJs.includes('isProviderDead'), 'ShadowStreamPlayer.js must skip providers that already failed');
assert(shadowPlayerJs.includes('styles.failoverBar'), 'ShadowStreamPlayer.js must render the failover bar');
assert(shadowPlayerJs.includes('styles.failoverBtn'), 'ShadowStreamPlayer.js must render the failover buttons');
assert(shadowPlayerJs.includes('openServerPicker'), 'ShadowStreamPlayer.js must expose a Change server action on the failover bar');
assert(shadowPlayerJs.includes('onPress={keepWaiting}'), 'ShadowStreamPlayer.js must wire the Keep waiting action');
console.log('[PASS] Auto-switch: per-provider budget, dead-provider memory and the inline failover bar are wired');

// 4d. PLAYBACK GUARD (v2.4.42): the ad rules must never match a URL the
// provider needs to play the video. Every URL below was captured from the
// live rotation, including the chain hosts the provider invents per load.
// A rule that matches one of these breaks the stream, which is worse than
// an ad that slips through.
const vm2 = require('vm');
const mainSrc = fs.readFileSync('packaging/windows/app/resources/app/main.js', 'utf-8');
const rulesStart = mainSrc.indexOf('const AD_DOMAINS');
const fnStart = mainSrc.indexOf('function isAdUrl');
let depth = 0;
let fnEnd = -1;
for (let i = fnStart; i < mainSrc.length; i++) {
    if (mainSrc[i] === '{') depth++;
    else if (mainSrc[i] === '}') { depth--; if (depth === 0) { fnEnd = i + 1; break; } }
}
assert(rulesStart > 0 && fnEnd > 0, 'main.js must expose the ad rules for the playback guard');
const ruleSandbox = { URL, console };
vm.createContext(ruleSandbox);
vm.runInContext(mainSrc.slice(rulesStart, fnEnd), ruleSandbox);
const isAdUrl = ruleSandbox.isAdUrl;

const playbackUrls = [
    'https://vidstuck.cc/embed/tv/100088/1/1?loading=2',
    'https://vidstuck.cc/backend/tmdb/details/tv/100088?language=en-US',
    'https://vidstuck.cc/_next/static/chunks/24uyhvvmdi5sa.js',
    'https://sacdn.hakunaymatata.com/dash/100088/1/1/stream.mpd',
    'https://sacdn.hakunaymatata.com/dash/100088/1/1/segment-1.m4s',
    'https://vidsrc.to/embed/tv/100088/1/1',
    'https://vidsrc.sh/embed/tv/100088/1-1',
    'https://stellarconductornexus.com/embed/tv/100088/1/1?vs=Fup0JMP9_APDL6mso',
    'https://www.2embed.skin/movie/tmdb/tv?id=100088&s=1&e=1',
    'https://www.nontongo.win/embed/tv/100088/1/1',
    'https://www.vidy.st/movie/tt3581920',
    'https://users.vidy.st/api/track',
    'https://animesalt.cx/episode/bleach-1x1/',
    'https://abyssplayer.com/embed/bleach-1x1',
    'https://ravok.net/embed/bleach-1x1',
];
for (const u of playbackUrls) {
    assert.strictEqual(isAdUrl(u), false, `Ad rules must NOT flag a playback URL: ${u}`);
}

// The Android build carries the same rules in a different language. Check
// its domain list and path rules against the same URLs.
const androidSrc = fs.readFileSync('scraper/build_android_apk.py', 'utf-8');
const adDomainsRaw = androidSrc.slice(
    androidSrc.indexOf('private static final String[] AD_DOMAINS'),
    androidSrc.indexOf('private static final String[] AD_PATTERNS')
);
const domainList = [...adDomainsRaw.matchAll(/"([^"]+)"/g)].map((m) => m[1].toLowerCase());
assert(domainList.length > 20, 'Android AD_DOMAINS must still contain the ad domain list');
const androidPathRules = ['/vidstuck.js', '/__ads/', '/cdn-cgi/rum', '/scripts/vidy.js', '/lt/shared/'];
for (const u of playbackUrls) {
    const parsed = new URL(u);
    const host = parsed.hostname.toLowerCase();
    const full = u.toLowerCase();
    assert(!host.endsWith('.cfd') && !host.endsWith('.qpon'), `Android rules must NOT flag a playback TLD: ${u}`);
    assert(
        !domainList.some((d) => host === d || host.endsWith('.' + d)),
        `Android ad domains must NOT contain the playback host: ${host}`
    );
    for (const rule of androidPathRules) {
        assert(!full.includes(rule), `Android path rule must NOT match a playback URL: ${rule} in ${u}`);
    }
    assert(
        !(full.includes('/api/script.js') && host.includes('vidy.st')) || !full.includes('/api/script.js'),
        `Android vidy script rule must NOT match a playback URL: ${u}`
    );
}
console.log(`[PASS] Playback Guard: ${playbackUrls.length} captured playback URLs survive the ad rules in both apps`);

// 5. Test AdShield URL filtering logic
let adShieldRaw = fs.readFileSync('frontend/src/utils/adShield.js', 'utf-8');
adShieldRaw = adShieldRaw.replace(/^export\s+const\s+/gm, 'var ').replace(/^export\s+function\s+/gm, 'function ');
const sandbox = { window: { location: { origin: 'https://ssmoviestvs.site' } }, document: {}, localStorage: {}, console, URL };
vm.createContext(sandbox);
vm.runInContext(adShieldRaw, sandbox);
const isAllowed = sandbox.__adShield ? sandbox.__adShield.isAllowed : sandbox.isAllowed;

const blockedUrls = [
    'https://onclicktop.com/jump/next.php?r=123',
    'https://highperformancegate.com/zone?zoneid=999',
    'https://adsterra.com/feed',
    'https://monetag.com/popunder',
    'https://al5sm.com/track',
    'https://aclib.com/serve',
    'https://notix.co/push',
    'https://deloton.com/ad',
    'https://vdo.ai/banner',
    'https://unfortunatelyejectinflected.com/bundle.js',
    'https://multiembed.mov/?video_id=123',
    'https://streamingnow.mov/?play=123',
    // v2.4.41: the hostile hosts and the trackers they load.
    'https://player.videasy.to/movie/155?color=FFA500',
    'https://player.videasy.to/tv/100088/1/1?color=FFA500',
    'https://backend.videasy.to/tv/100088/1/1',
    'https://meatusbyway.cfd/cuid/?f=https://vidstuck.cc',
    'https://hostile.wonnotscroganisoin.cyou/gd/115848?md=https%3A%2F%2Fssmoviestvs.site',
    // v2.4.42: the rotating ad hosts (throwaway TLDs, new name every load),
    // the analytics and ad scripts, and the provider-side injectors that are
    // served from the provider's own host and are only identifiable by path.
    'https://t2f.183nq1tht933j77g.cfd/knypqclZMOhr3FC1j14bPk/jAJQL',
    'https://zfz7hwz.7nbebz9jo87v13nn3zexy52h1vc9.cfd/kb352YnZGOw4Q6/nrOne',
    'https://nifty.macecuttyscallom.qpon/gd/155094?md=abc',
    'https://aulete.chequesjuddersearle.qpon/gd/115848?md=abc',
    'https://www.googletagmanager.com/gtag/js?id=G-176CLJRLPB',
    'https://www.google-analytics.com/analytics.js',
    'https://static.cloudflareinsights.com/beacon.min.js/vce7018',
    'https://soycdn.lol/__ads/vidsrcto.js',
    'https://adplox.com/promo/click',
    'https://tags.crwdcntrl.net/lt/shared/2/lt.iframe.html?c=3825',
    'https://bcp.crwdcntrl.net/pixels?src=LTJS',
    'https://vidstuck.cc/vidstuck.js',
    'https://www.vidy.st/scripts/vidy.js',
    'https://users.vidy.st/api/script.js',
];

const allowedUrls = [
    'https://ssmoviestvs.site/api/v1/stream/resolve',
    'https://vidstuck.cc/embed/movie/155?loading=2',
    'https://vidstuck.cc/embed/tv/100088/1/1?loading=2&dubLang=hi&dubType=1',
    'https://www.NontonGo.win/embed/tv/100088/1/1',
    'https://vidsrc.to/embed/movie/155',
    'https://www.2embed.cc/embed/tmdb/movie?id=155',
    '/play/the-last-of-us-2023',
    '/movies',
    'blob:https://ssmoviestvs.site/1234-abcd',
    'vlc://https://example.com/video.mp4'
];

let adPass = 0;
for (const u of blockedUrls) {
    assert.strictEqual(isAllowed(u), false, `Should BLOCK ad URL: ${u}`);
    adPass++;
}
for (const u of allowedUrls) {
    assert.strictEqual(isAllowed(u), true, `Should ALLOW legitimate URL: ${u}`);
    adPass++;
}
console.log(`[PASS] AdShield URL Filter: ${adPass}/${blockedUrls.length + allowedUrls.length} test URLs correctly handled`);

console.log('\n>>> ALL 5 PLAYER LIFECYCLE & ZERO-SERVER UX SUITES PASSED! <<<\n');
