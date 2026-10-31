import urllib.request
import json

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}

for u in ['https://ssmoviestvs.site/api/v1/app-version', 'https://www.ssmoviestvs.site/version.json']:
    try:
        req = urllib.request.Request(u, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as r:
            data = json.loads(r.read().decode('utf-8'))
            print(f"{u} -> version: {data.get('version')}, code: {data.get('versionCode')}")
    except Exception as e:
        print(f"{u} error: {e}")

try:
    url = 'https://ssmoviestvs.site/api/v1/titles/the-dark-knight-2008'
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=10) as r:
        data = json.loads(r.read().decode('utf-8'))
        print('the-dark-knight availability (Top 5):')
        for a in data.get('availability', [])[:5]:
            print(f"  - {a.get('source')}: {a.get('url') or a.get('playbackUrl')}")
except Exception as e:
    print('the-dark-knight error:', e)

try:
    url = 'https://ssmoviestvs.site/api/v1/stream/resolve?id=155&type=movie'
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=10) as r:
        data = json.loads(r.read().decode('utf-8'))
        print('stream/resolve id=155 streams (Top 5):')
        for s in data.get('streams', [])[:5]:
            print(f"  - {s.get('provider')}: {s.get('url')}")
except Exception as e:
    print('stream/resolve error:', e)
