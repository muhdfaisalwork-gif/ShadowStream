const assert = require('assert');
const fs = require('fs');

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

// 4. Verify version synchronization (v2.4.41 / code 281 / SW v50)
const versionJs = fs.readFileSync('frontend/src/config/version.js', 'utf-8');
assert(versionJs.includes("CURRENT_VERSION = '2.4.41'"), 'version.js must have CURRENT_VERSION = 2.4.41');
assert(versionJs.includes("CURRENT_CODE = 281"), 'version.js must have CURRENT_CODE = 281');

const workerIndexTs = fs.readFileSync('downloads/streamapp-worker/src/index.ts', 'utf-8');
assert(workerIndexTs.includes('version: "2.4.41"'), 'worker index.ts must have version 2.4.41');
assert(workerIndexTs.includes('versionCode: 281'), 'worker index.ts must have versionCode 281');
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
assert(swPublic.includes("const VERSION = 'v50'"), 'public/sw.js must be v50');
console.log('[PASS] Version Synchronization & Backend 4-Source Engine: v2.4.41 (code 281, SW v50) strictly verified across all tiers');

// 5. Test AdShield URL filtering logic
const vm = require('vm');
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
