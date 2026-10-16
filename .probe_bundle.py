import urllib.request, re

UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129 Safari/537.36'
req = urllib.request.Request('https://ssmoviestvs.site/_expo/static/js/web/index-91c0b9b358dec635a245053b03bc31a2.js', headers={'User-Agent': UA})
r = urllib.request.urlopen(req, timeout=15)
body = r.read().decode(errors='replace')

# Look for the country fetch logic
# Find context around 'titles cataloged from'
idx = body.find('titles cataloged from')
print('idx:', idx)
print(body[max(0, idx-2000):idx+200])

# Find the fetch URL pattern
idx2 = body.find('country=')
print('\n--- COUNTRY= context ---')
print(body[max(0, idx2-500):idx2+500])