import urllib.request, json, re

UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36'

def head(url, timeout=20):
    req = urllib.request.Request(url, headers={'User-Agent': UA}, method='HEAD')
    try:
        r = urllib.request.urlopen(req, timeout=timeout)
        return r.status, int(r.headers.get('content-length', 0))
    except Exception as e:
        return str(e), 0

print("=== RELEASES: where are they actually served? ===")
keys = ['latest.yml', 'ShadowStream-Setup-x64.exe', 'ShadowStream-win-x64.zip',
        'StreamApp-Browser-Shortcut.exe', 'ShadowStream-Setup-x64.exe.blockmap']
bases = [
    'https://ssmoviestvs.site/downloads',
    'https://streamapp-catalog.muhd-faisal-work.workers.dev/downloads',
    'https://streamapp-releases.r2.dev/downloads',
]
for b in bases:
    print(f"\n  base: {b}")
    for k in keys:
        s, n = head(f'{b}/{k}')
        mb = f"{n/1048576:.1f} MB" if n else '-'
        print(f"     {k:<38} {s}  {mb}")

print()
print("=== WORKER ROUTE DISCOVERY: find audio-languages ===")
W = 'https://streamapp-catalog.muhd-faisal-work.workers.dev'
for path in ['/api/v1/audio-languages', '/audio-languages', '/api/v1/audio-languages?limit=5',
             '/api/v1/titles-lite?audio_language=hi&page=1&page_size=3']:
    req = urllib.request.Request(W + path, headers={'User-Agent': UA})
    try:
        r = urllib.request.urlopen(req, timeout=15)
        b = r.read()
        print(f"   {r.status} {path}  len={len(b)}  {b[:160]!r}")
    except Exception as e:
        print(f"   {e} {path}")