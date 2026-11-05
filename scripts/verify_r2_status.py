import urllib.request
import json

req = urllib.request.Request('https://ssmoviestvs.site/downloads/list', headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req, timeout=10) as resp:
    data = json.loads(resp.read().decode('utf-8'))
    print(f'Total objects in R2: {len(data)}')
    for o in data:
        print(f"{o['key']:35} | {o['size']:>12,} bytes | {o['uploaded']}")
