import urllib.request
import re

url = "https://donkey.to/_next/static/chunks/app/watch-now/page-38825d5b035fab95.js"
headers = {'User-Agent': 'Mozilla/5.0'}
with urllib.request.urlopen(urllib.request.Request(url, headers=headers)) as r:
    code = r.read().decode('utf-8')

for term in ['vidstuck', '1embed', 'videasy', 'vidsrc', 'vidy']:
    print(f"=== {term} ===")
    for m in re.finditer(re.escape(term), code):
        pos = m.start()
        print(code[max(0, pos-100):min(len(code), pos+200)])
        print("-" * 40)
