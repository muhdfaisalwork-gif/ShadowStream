import urllib.request, re, json

UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129 Safari/537.36'
req = urllib.request.Request('https://ssmoviestvs.site/', headers={'User-Agent': UA})
r = urllib.request.urlopen(req, timeout=10)
html = r.read().decode(errors='replace')
print('HTML length:', len(html))
print('SW refs:', re.findall(r'sw\.js|serviceWorker|navigator\.serviceWorker', html))
print('Script srcs:')
for m in re.finditer(r'<script[^>]+src="([^"]+)"', html):
    print(' ', m.group(1))
print('First 500 chars:')
print(html[:500])