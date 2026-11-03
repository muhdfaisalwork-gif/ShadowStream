import urllib.request
import re
import json

url = "https://vidstuck.cc/embed/movie/26842?loading=2"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"})
with urllib.request.urlopen(req) as resp:
    html = resp.read().decode("utf-8", errors="ignore")

scripts = re.findall(r'<script[^>]*src=["\']([^"\']+)["\']', html)
print("Scripts count:", len(scripts))
for s in scripts:
    print(" ", s)

# Look for API endpoints in the page or Next.js data
matches = re.findall(r'https?://[a-zA-Z0-9.-]+/[a-zA-Z0-9._/-]+', html)
print("\nURLs in HTML:")
for m in set(matches):
    if any(k in m for k in ['api', 'source', 'stream', 'seed', 'vid', 'embed']):
        print(" ", m)
