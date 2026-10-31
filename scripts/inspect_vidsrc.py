import urllib.request
import re

headers = {'User-Agent': 'Mozilla/5.0'}
for u in [
    'https://vidsrc.to/embed/tv/100088/1/1',
    'https://vidsrc.sh/embed/tv/100088/1/1&color=FFA500',
    'https://www.NontonGo.win/embed/tv/100088/1/1'
]:
    try:
        req = urllib.request.Request(u, headers=headers)
        with urllib.request.urlopen(req) as r:
            html = r.read().decode('utf-8', errors='ignore')
            print(u, 'Status:', r.status, 'Title:', re.findall(r'<title>(.*?)</title>', html), 'Length:', len(html))
    except Exception as e:
        print(u, 'Error:', e)
