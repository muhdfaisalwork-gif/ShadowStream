import urllib.request
import re

c_url = 'https://vidstuck.cc/_next/static/chunks/1f4kdvef1sb4u.js'
js = urllib.request.urlopen(urllib.request.Request(c_url, headers={'User-Agent': 'Mozilla/5.0'})).read().decode('utf-8')

# Search for zxcstream and surrounding text
for m in re.finditer(r'zxcstream', js, re.IGNORECASE):
    idx = m.start()
    print("--- ZXCSTREAM SNIPPET ---")
    print(js[max(0, idx - 200):min(len(js), idx + 300)])

# Search for error messages
for m in re.finditer(r'couldnt|searched through|providers|Go Back', js, re.IGNORECASE):
    idx = m.start()
    print("--- MATCH SNIPPET ---")
    print(js[max(0, idx - 100):min(len(js), idx + 200)])
