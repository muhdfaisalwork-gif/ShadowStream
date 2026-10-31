const https = require('https');

https.get('https://player.videasy.to/_next/static/chunks/pages/_app-b31febe465465bc3.js', {
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
}, (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    const idx = data.indexOf('backend.videasy.to');
    console.log(data.substring(idx - 300, idx + 1000));
  });
});
