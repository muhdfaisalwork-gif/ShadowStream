const https = require('https');

function fetchJson(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ error: e.message, raw: data.slice(0, 200) });
        }
      });
    }).on('error', err => resolve({ error: err.message }));
  });
}

async function testSeries() {
  const slugs = ['avatar-seven-havens', 'stranger-things', 'the-last-of-us', 'game-of-thrones', 'shogun-2024'];
  for (const slug of slugs) {
    const detail = await fetchJson(`https://ssmoviestvs.site/api/v1/title/${slug}`);
    const seasonsData = await fetchJson(`https://ssmoviestvs.site/api/v1/title/${slug}/seasons`);
    console.log(`\n--- Title: ${slug} ---`);
    console.log(`Title: ${detail?.title}, Type: ${detail?.type}, SeasonCount: ${detail?.seasonCount}`);
    const seasons = seasonsData?.seasons || [];
    console.log(`Seasons array length: ${seasons.length}`);
    for (const s of seasons.slice(0, 3)) {
      const epCount = Array.isArray(s.episodes) ? s.episodes.length : (s.episode_count || s.episodeCount || 0);
      console.log(`  Season ${s.season_number || s.seasonNumber || s.name}: ${epCount} episodes`);
    }
  }
}

testSeries();
