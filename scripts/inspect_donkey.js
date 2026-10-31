const https = require('https');

https.get('https://player.videasy.to/movie/155?color=FFA500', {
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
}, (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    console.log('Videasy HTML Length:', data.length);
    const adKeywords = /(adsterra|popcash|popads|monetag|propellerads|aclib|histats|llvpn|notix|deloton|galaksion|rollerads|richpush|evadav|juicyads|vdo\.ai)/i;
    console.log('Contains ad scripts?', adKeywords.test(data));
    const inlineScripts = data.match(/<script>([\s\S]*?)<\/script>/gi) || [];
    console.log('Inline script count:', inlineScripts.length);
    inlineScripts.forEach((s, i) => {
      console.log(`Script ${i}:`, s.substring(0, 100));
    });
  });
});
