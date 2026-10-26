// test_adshield.js — Comprehensive Unit tests for AdShield & 3rd-party link blocker
const assert = require('assert');

// Mock localStorage, window, and DOM environment for Node.js
global.window = {
    location: {
        origin: 'https://ssmoviestvs.site',
        hostname: 'ssmoviestvs.site'
    },
    dispatchEvent: () => {}
};
global.document = {
    addEventListener: () => {},
    removeEventListener: () => {}
};
global.HTMLAnchorElement = function() {};
global.HTMLAnchorElement.prototype = { click: () => {} };

// Import adShield module
const { isAllowed, isNoAdsActive, setNoAdsActive, toggleNoAds, getBlockedCount, onAdBlocked } = require('../frontend/src/utils/adShield');

console.log('====================================================');
console.log(' RUNNING ADSHIELD & 3RD-PARTY LINK BLOCKER TESTS');
console.log('====================================================');

// 1. Whitelist Verification
assert.strictEqual(isAllowed('https://ssmoviestvs.site'), true, 'ssmoviestvs.site should be allowed');
assert.strictEqual(isAllowed('https://ssmoviestvs.site/api/v1/titles'), true, 'ssmoviestvs.site API should be allowed');
assert.strictEqual(isAllowed('/movies/dune'), true, 'relative routes should be allowed');
assert.strictEqual(isAllowed('blob:https://ssmoviestvs.site/1234'), true, 'blob: URLs should be allowed');
assert.strictEqual(isAllowed('https://archive.org/embed/movie'), true, 'archive.org should be allowed');
assert.strictEqual(isAllowed('https://themoviedb.org/movie/123'), true, 'themoviedb.org should be allowed');
assert.strictEqual(isAllowed('https://imdb.com/title/tt123'), true, 'imdb.com should be allowed');
assert.strictEqual(isAllowed('https://github.com/project'), true, 'github.com should be allowed');
assert.strictEqual(isAllowed('vlc://stream.m3u8'), true, 'vlc protocol should be allowed');

// 2. Blacklist / Ad Verification
assert.strictEqual(isAllowed('https://evil-ads.com/popup'), false, 'evil-ads.com must be BLOCKED');
assert.strictEqual(isAllowed('https://betting-track.net/click'), false, 'betting-track.net must be BLOCKED');
assert.strictEqual(isAllowed('https://popunder.xyz'), false, 'popunder.xyz must be BLOCKED');
assert.strictEqual(isAllowed('https://betwinner.com/register'), false, 'betwinner must be BLOCKED');
assert.strictEqual(isAllowed('https://1xbet.com/live'), false, '1xbet must be BLOCKED');
assert.strictEqual(isAllowed('https://megapari.com/bonus'), false, 'megapari must be BLOCKED');
assert.strictEqual(isAllowed('https://adsterra.com/tag'), false, 'adsterra must be BLOCKED');
assert.strictEqual(isAllowed('https://monetag.com/click'), false, 'monetag must be BLOCKED');
assert.strictEqual(isAllowed('https://sodlessteargas.com/gateway'), false, 'sodlessteargas must be BLOCKED');
assert.strictEqual(isAllowed('https://trafficjunky.com/ad'), false, 'trafficjunky must be BLOCKED');
assert.strictEqual(isAllowed('https://vidsrc.xyz/popunder/zoneid=999'), false, 'zoneid query must be BLOCKED');
console.log('  [PASS] 1. Whitelist, safe schemes, and ad network checks passed.');

// 3. Toggle & State Verification
setNoAdsActive(true);
assert.strictEqual(isNoAdsActive(), true, 'Should be active when set to true');

const toggled = toggleNoAds();
assert.strictEqual(toggled, false, 'toggleNoAds should flip to false');
assert.strictEqual(isNoAdsActive(), false, 'isNoAdsActive should return false');

const reToggled = toggleNoAds();
assert.strictEqual(reToggled, true, 'toggleNoAds should flip back to true');
assert.strictEqual(isNoAdsActive(), true, 'isNoAdsActive should return true');
console.log('  [PASS] 2. No Ads toggle state management passed.');

// 4. Blocked Event Listener Verification
let receivedBlockedUrl = null;
const unsub = onAdBlocked((event) => {
    receivedBlockedUrl = event.url;
});

// Trigger a blocked check via __adShield
const { __adShield } = require('../frontend/src/utils/adShield');
__adShield.recordBlocked('https://popup-advert.com/track', 'popup attempt');

assert.strictEqual(receivedBlockedUrl, 'https://popup-advert.com/track', 'Listener should receive blocked URL');
assert.strictEqual(getBlockedCount() >= 1, true, 'Blocked count should increment');
unsub();
console.log('  [PASS] 3. Real-time blocked event listener & counter passed.');

console.log('====================================================');
console.log(' ALL ADSHIELD TESTS PASSED (100% SUCCESS)');
console.log('====================================================');
