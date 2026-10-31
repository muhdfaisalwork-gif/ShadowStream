import urllib.request
import re

url = "https://www.vidy.st/tv/100088/1/1?color=FFA500"
headers = {'User-Agent': 'Mozilla/5.0'}
req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req) as r:
    html = r.read().decode('utf-8', errors='ignore')

print("Vidy Title:", re.findall(r'<title>(.*?)</title>', html))
next_data = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html)
if next_data:
    print("Found NEXT_DATA in vidy! Length:", len(next_data.group(1)))
    print("NEXT_DATA preview:", next_data.group(1)[:500])
