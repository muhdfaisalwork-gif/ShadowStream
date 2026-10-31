import urllib.request
import re

url = "https://www.vidy.st/tv/100088/1/1?color=FFA500"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as r:
    html = r.read().decode('utf-8')

for s in re.findall(r'src=["\']([^"\']+)["\']', html):
    if 'tv' in s:
        print("TV chunk:", s)
        s_url = s if s.startswith('http') else 'https://www.vidy.st' + s
        with urllib.request.urlopen(urllib.request.Request(s_url, headers={'User-Agent': 'Mozilla/5.0'})) as sr:
            code = sr.read().decode('utf-8')
            for m in re.finditer(r'https?://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[^"\'`\s)]*', code):
                print("URL in TV chunk:", m.group(0))
