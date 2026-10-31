const assert = require('assert');
const fs = require('fs');

console.log('==================================================================');
console.log('   SHADOWSTREAM PLAYER LIFECYCLE & ADSHIELD AUDIT SUITE           ');
console.log('==================================================================\n');

// 1. Verify App.js unmountOnBlur configuration
const appJs = fs.readFileSync('frontend/App.js', 'utf-8');
assert(
    appJs.includes('<Drawer.Screen name="Player" component={PlayerScreen} options={{ unmountOnBlur: true }} />'),
    'App.js MUST have unmountOnBlur: true for Player screen'
);
console.log('[PASS] App.js: Player screen configured with unmountOnBlur: true');

// 2. Verify PlayerScreen.js focus & teardown hooks
const playerScreenJs = fs.readFileSync('frontend/src/screens/PlayerScreen.js', 'utf-8');
assert(playerScreenJs.includes('useIsFocused'), 'PlayerScreen.js must import useIsFocused');
assert(playerScreenJs.includes('const isFocused = useIsFocused();'), 'PlayerScreen.js must call useIsFocused hook');
assert(playerScreenJs.includes('if (!isFocused)'), 'PlayerScreen.js must check isFocused to stop playback');
assert(playerScreenJs.includes('navigation.addListener(\'blur\''), 'PlayerScreen.js must clean up on navigation blur');
assert(playerScreenJs.includes('url.searchParams.delete(\'season\')'), 'PlayerScreen.js must clean up URL search params on leave');
console.log('[PASS] PlayerScreen.js: Focus & blur listeners, state teardown, and URL query cleanup verified');

// 3. Verify ShadowStreamPlayer.js hard unmount cleanup
const shadowPlayerJs = fs.readFileSync('frontend/src/components/ShadowStreamPlayer.js', 'utf-8');
assert(shadowPlayerJs.includes('iframeRef.current.src = \'about:blank\''), 'ShadowStreamPlayer.js must clear iframe src on unmount');
assert(shadowPlayerJs.includes('videoRef.current.pause()'), 'ShadowStreamPlayer.js must pause video on unmount');
assert(!shadowPlayerJs.includes('sandbox={noAdsEnabled ?'), 'ShadowStreamPlayer.js must not restrict iframe sandbox');
console.log('[PASS] ShadowStreamPlayer.js: Hard media termination on unmount & unblocked iframe verified');

// 4. Verify version synchronization
const versionJs = fs.readFileSync('frontend/src/config/version.js', 'utf-8');
assert(versionJs.includes("CURRENT_VERSION = '2.4.32'"), 'version.js must have CURRENT_VERSION = 2.4.32');
assert(versionJs.includes("CURRENT_CODE = 272"), 'version.js must have CURRENT_CODE = 272');

const workerIndexTs = fs.readFileSync('downloads/streamapp-worker/src/index.ts', 'utf-8');
assert(workerIndexTs.includes('version: "2.4.32"'), 'worker index.ts must have version 2.4.32');
assert(workerIndexTs.includes('versionCode: 272'), 'worker index.ts must have versionCode 272');

const swPublic = fs.readFileSync('frontend/public/sw.js', 'utf-8');
assert(swPublic.includes("const VERSION = 'v41'"), 'public/sw.js must be v41');
console.log('[PASS] Version Synchronization: v2.4.32 (code 272, SW v41) strictly verified across all tiers');

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
    'https://vidstuck.cc/embed/tv/100088/1/1?loading=2',
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
