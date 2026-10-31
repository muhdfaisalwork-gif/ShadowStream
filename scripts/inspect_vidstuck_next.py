import urllib.request
import re

url = "https://vidstuck.cc/embed/tv/100088/1/1?loading=2&color=FFA500"
headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'}
req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req) as r:
    html = r.read().decode('utf-8', errors='ignore')

# Extract title, meta tags, and inline state
print("HTML Title:", re.findall(r'<title>(.*?)</title>', html))
print("Inline scripts count:", len(re.findall(r'<script', html)))

# Check if there is a video tag or player iframe or stream URL
for m in re.finditer(r'https?://[^\s"\'<>]+(?:\.m3u8|\.mp4)', html):
    print("Direct stream URL:", m.group(0))

# Check next_data
next_data = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html)
if next_data:
    print("Found NEXT_DATA in vidstuck! Length:", len(next_data.group(1)))
    print("NEXT_DATA preview:", next_data.group(1)[:500])
