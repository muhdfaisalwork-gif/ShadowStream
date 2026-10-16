const https = require('https');

function testUrl(name, url, checkStr = null) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        if (data.length < 100000) data += chunk;
      });
      res.on('end', () => {
        const passed = res.statusCode === 200 && (!checkStr || data.includes(checkStr));
        console.log(`[${name}] ${res.statusCode} - ${passed ? 'PASS' : 'FAIL'} (received: ${data.length} chars)`);
        if (!passed && res.statusCode !== 200) {
          console.log(`  Snippet: ${data.slice(0, 100)}`);
        }
        resolve(passed);
      });
    }).on('error', (err) => {
      console.log(`[${name}] ERROR: ${err.message}`);
      resolve(false);
    });
  });
}

async function run() {
  console.log('=== COMPREHENSIVE LIVE VERIFICATION ===');
  let ok = true;
  ok = (await testUrl('Web Shell index.html', 'https://ssmoviestvs.site/', 'index-94ab72df81385a1219d997a5c20990e5.js')) && ok;
  ok = (await testUrl('Expo JS Bundle', 'https://ssmoviestvs.site/_expo/static/js/web/index-94ab72df81385a1219d997a5c20990e5.js', 'window')) && ok;
  ok = (await testUrl('Service Worker v14', 'https://ssmoviestvs.site/sw.js', 'v14')) && ok;
  ok = (await testUrl('Static Featured JSON', 'https://ssmoviestvs.site/featured.json', 'picks')) && ok;
  ok = (await testUrl('API Health', 'https://ssmoviestvs.site/api/v1/health', 'ok')) && ok;
  ok = (await testUrl('API Titles (Browse)', 'https://ssmoviestvs.site/api/v1/titles?limit=10', 'items')) && ok;
  ok = (await testUrl('API Platform Collection (Netflix)', 'https://ssmoviestvs.site/api/v1/collections/netflix', 'items')) && ok;
  ok = (await testUrl('API Platform Collection (Max)', 'https://ssmoviestvs.site/api/v1/collections/max', 'items')) && ok;
  ok = (await testUrl('API Platform Collection (Disney+)', 'https://ssmoviestvs.site/api/v1/collections/disney-plus', 'items')) && ok;
  ok = (await testUrl('API Platform Collection (Prime Video)', 'https://ssmoviestvs.site/api/v1/collections/prime-video', 'items')) && ok;
  ok = (await testUrl('API Platform Collection (Apple TV+)', 'https://ssmoviestvs.site/api/v1/collections/apple-tv-plus', 'items')) && ok;
  ok = (await testUrl('API Browse by Collection (on-max)', 'https://ssmoviestvs.site/api/v1/titles?collection=on-max', 'items')) && ok;
  ok = (await testUrl('API Browse Sci-Fi Alias', 'https://ssmoviestvs.site/api/v1/titles?genre=scifi', 'items')) && ok;
  ok = (await testUrl('API Surprise Me (Any)', 'https://ssmoviestvs.site/api/v1/surprise?type=any&min_rating=7.0', '"item"')) && ok;
  ok = (await testUrl('API Anime English Dub', 'https://ssmoviestvs.site/api/v1/titles/anime?audio_language=en', 'items')) && ok;
  ok = (await testUrl('API Anime Hindi Dub', 'https://ssmoviestvs.site/api/v1/titles/anime?audio_language=hi', 'items')) && ok;
  ok = (await testUrl('API Anime Films (JP+Animation)', 'https://ssmoviestvs.site/api/v1/titles?type=movie&genre=animation&country=JP', 'items')) && ok;
  ok = (await testUrl('API Short Drama Billionaire', 'https://ssmoviestvs.site/api/v1/collection/short-drama-billionaire', 'items')) && ok;
  ok = (await testUrl('API Search with Facets (Avatar)', 'https://ssmoviestvs.site/api/v1/search?q=avatar', '"facets"')) && ok;
  ok = (await testUrl('API Search Empty-Query Filter (TV)', 'https://ssmoviestvs.site/api/v1/search?q=&type=tv', 'items')) && ok;
  ok = (await testUrl('API Admin Stats', 'https://ssmoviestvs.site/api/v1/admin/stats', '"by_type"')) && ok;
  ok = (await testUrl('API Admin Sources Health', 'https://ssmoviestvs.site/api/v1/admin/sources/health', '"sources"')) && ok;
  ok = (await testUrl('API Title Detail (House of the Dragon)', 'https://ssmoviestvs.site/api/v1/title/house-of-the-dragon-2022', '94997')) && ok;
  ok = (await testUrl('API Title Availability (HotD S1E1)', 'https://ssmoviestvs.site/api/v1/title/house-of-the-dragon-2022/availability?season=1&episode=1', 'vidlink')) && ok;
  ok = (await testUrl('API Title Seasons', 'https://ssmoviestvs.site/api/v1/title/house-of-the-dragon-2022/seasons', 'seasons')) && ok;
  ok = (await testUrl('Stream Resolver (HotD)', 'https://ssmoviestvs.site/api/v1/stream/resolve?tmdbId=94997&season=1&episode=1&type=tv', 'vidlink')) && ok;
  ok = (await testUrl('APK Download', 'https://ssmoviestvs.site/downloads/ShadowStream.apk')) && ok;
  console.log(`\n=============================================`);
  console.log(`FINAL RESULT: ${ok ? '100% HEALTHY - ALL ENDPOINTS PASS' : 'ISSUES DETECTED'}`);
  console.log(`=============================================`);
}

run();
