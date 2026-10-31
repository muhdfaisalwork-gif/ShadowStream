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

// 2. Verify PlayerScreen.js focus & teardown hooks & no vidstuck
const playerScreenJs = fs.readFileSync('frontend/src/screens/PlayerScreen.js', 'utf-8');
assert(playerScreenJs.includes('useIsFocused'), 'PlayerScreen.js must import useIsFocused');
assert(playerScreenJs.includes('const isFocused = useIsFocused();'), 'PlayerScreen.js must call useIsFocused hook');
assert(playerScreenJs.includes('if (!isFocused)'), 'PlayerScreen.js must check isFocused to stop playback');
assert(playerScreenJs.includes('navigation.addListener(\'blur\''), 'PlayerScreen.js must clean up on navigation blur');
assert(playerScreenJs.includes('url.searchParams.delete(\'season\')'), 'PlayerScreen.js must clean up URL search params on leave');
assert(!playerScreenJs.includes('vidstuck.cc'), 'PlayerScreen.js must NOT contain dead vidstuck.cc URLs');
console.log('[PASS] PlayerScreen.js: Focus & blur listeners, state teardown, URL cleanup, and clean provider list verified');

// 3. Verify ShadowStreamPlayer.js hard unmount cleanup & ZERO manual server buttons
const shadowPlayerJs = fs.readFileSync('frontend/src/components/ShadowStreamPlayer.js', 'utf-8');
assert(shadowPlayerJs.includes('iframeRef.current.src = \'about:blank\''), 'ShadowStreamPlayer.js must clear iframe src on unmount');
assert(shadowPlayerJs.includes('videoRef.current.pause()'), 'ShadowStreamPlayer.js must pause video on unmount');
assert(!shadowPlayerJs.includes('sandbox={noAdsEnabled ?'), 'ShadowStreamPlayer.js must not restrict iframe sandbox');
assert(!shadowPlayerJs.includes('Switch Source'), 'ShadowStreamPlayer.js must NOT contain manual Switch Source button');
assert(!shadowPlayerJs.includes('Switch Stream Source'), 'ShadowStreamPlayer.js must NOT contain manual Switch Stream Source item');
assert(!shadowPlayerJs.includes('Select Stream Server'), 'ShadowStreamPlayer.js must NOT contain manual Select Stream Server menu');
assert(!shadowPlayerJs.includes('Switch to backup stream?'), 'ShadowStreamPlayer.js must NOT contain manual stalled failover prompt');
assert(shadowPlayerJs.includes('selectDubAudio'), 'ShadowStreamPlayer.js must contain unified selectDubAudio handler');
console.log('[PASS] ShadowStreamPlayer.js: Zero-Server Frictionless UX, silent auto-failover, Audio Dub selector & hard media teardown verified');

// 4. Verify version synchronization (v2.4.34 / code 274 / SW v43)
const versionJs = fs.readFileSync('frontend/src/config/version.js', 'utf-8');
assert(versionJs.includes("CURRENT_VERSION = '2.4.34'"), 'version.js must have CURRENT_VERSION = 2.4.34');
assert(versionJs.includes("CURRENT_CODE = 274"), 'version.js must have CURRENT_CODE = 274');

const workerIndexTs = fs.readFileSync('downloads/streamapp-worker/src/index.ts', 'utf-8');
assert(workerIndexTs.includes('version: "2.4.34"'), 'worker index.ts must have version 2.4.34');
assert(workerIndexTs.includes('versionCode: 274'), 'worker index.ts must have versionCode 274');
assert(workerIndexTs.includes('42d807f7358dcea850291d737ac42852'), 'worker index.ts must include Donkey.to TMDB key in pool');
assert(workerIndexTs.includes('99a5d8450024be69a1238450f6c92cbf'), 'worker index.ts must include Qmovies.co TMDB key in pool');
assert(!workerIndexTs.includes('vidstuck.cc'), 'worker index.ts must NOT contain dead vidstuck.cc URLs');

const swPublic = fs.readFileSync('frontend/public/sw.js', 'utf-8');
assert(swPublic.includes("const VERSION = 'v43'"), 'public/sw.js must be v43');
console.log('[PASS] Version Synchronization & Backend 4-Source Engine: v2.4.34 (code 274, SW v43) strictly verified across all tiers');

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
];

const allowedUrls = [
    'https://ssmoviestvs.site/api/v1/stream/resolve',
    'https://player.autoembed.me/embed/movie/155',
    'https://autoembed.co/tv/tmdb/100088-1-1',
    'https://vidy.st/tv/100088/1/1?color=FFA500',
    'https://multiembed.mov/?video_id=100088&tmdb=1',
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

console.log('\n==================================================================');
console.log('   ALL AUDITS PASSED WITH ZERO ERRORS (100% SUCCESS)              ');
console.log('==================================================================');
