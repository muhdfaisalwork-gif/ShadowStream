import urllib.request
import json

urls = [
    'https://ssmoviestvs.site/api/v1/app-version',
    'https://ssmoviestvs.site/version.json',
    'https://ssmoviestvs.site/downloads/version.json',
    'https://ssmoviestvs.site/downloads/latest.yml',
]
for u in urls:
    try:
        req = urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as r:
            body = r.read().decode('utf-8', errors='replace')
            ct = r.headers.get("Content-Type")
            print(f"=== {u} === status {r.status} Content-Type: {ct}")
            print(body[:200].strip())
    except Exception as e:
        print(f"=== {u} === ERROR: {e}")

req_apk = urllib.request.Request('https://ssmoviestvs.site/downloads/ShadowStream.apk', method='HEAD', headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req_apk, timeout=10) as r:
        cl = r.headers.get('Content-Length')
        ct = r.headers.get('Content-Type')
        print(f"=== APK HEAD === status: {r.status}, Content-Length: {cl}, Content-Type: {ct}")
except Exception as e:
    print(f"=== APK HEAD === ERROR: {e}")
