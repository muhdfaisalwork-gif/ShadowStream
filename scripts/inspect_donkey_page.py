import urllib.request
import re

url = "https://donkey.to/_next/static/chunks/app/watch-now/page-38825d5b035fab95.js"
headers = {'User-Agent': 'Mozilla/5.0'}
try:
    with urllib.request.urlopen(urllib.request.Request(url, headers=headers)) as r:
        code = r.read().decode('utf-8')
        print("Length:", len(code))
        # Look for iframe src
        for m in re.finditer(r'src[:=]["\']([^"\']+)["\']', code):
            print("src:", m.group(1))
        # Look for URLs
        for m in re.finditer(r'https?://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[^"\'`\s)]*', code):
            print("URL in watch-now:", m.group(0))
except Exception as e:
    print("Error:", e)
