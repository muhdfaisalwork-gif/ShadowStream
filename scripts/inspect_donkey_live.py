import urllib.request
import re

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}

# Check donkey.to watch page for The Last of Us or The Dark Knight
# TMDB 100088
# Let's inspect donkey.to
try:
    url = "https://donkey.to"
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=10) as r:
        html = r.read().decode('utf-8')
        print("Donkey.to HTML length:", len(html))
        # Look for script chunks
        chunks = re.findall(r'/_next/static/chunks/[^"]+', html)
        for c in chunks:
            print("Donkey chunk:", c)
except Exception as e:
    print("Donkey error:", e)
