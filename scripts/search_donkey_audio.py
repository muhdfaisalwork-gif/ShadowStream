import urllib.request
import re

url = "https://donkey.to/_next/static/chunks/app/watch-now/page-38825d5b035fab95.js"
headers = {'User-Agent': 'Mozilla/5.0'}
with urllib.request.urlopen(urllib.request.Request(url, headers=headers)) as r:
    code = r.read().decode('utf-8')

for term in ['audio', 'dub', 'voice', 'language', 'subtitle', 'tracks']:
    matches = list(re.finditer(re.escape(term), code, re.IGNORECASE))
    print(f"Term '{term}': {len(matches)} matches")
    for m in matches[:3]:
        pos = m.start()
        print("  ", code[max(0, pos-60):min(len(code), pos+100)])
