import urllib.request, json, re

UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36'

def get(url, timeout=15):
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': '*/*'})
    r = urllib.request.urlopen(req, timeout=timeout)
    return r.status, r.read(), dict(r.headers)

W = 'https://streamapp-catalog.muhd-faisal-work.workers.dev'
F = 'https://ssmoviestvs.site'

print("=== CATALOG WORKER ===")
try:
    s, b, h = get(f'{W}/api/v1/stats')
    d = json.loads(b)
    keys = ['total','titles','movies','tvSeries','seasons','episodes','countries','languages','sources']
    print("stats:", {k: d.get(k) for k in keys if k in d})
except Exception as e:
    print("stats ERR", e)

print()
print("=== COUNTRY ROUTE (regression check) ===")
for cc in ['PK','JP','IN','KR','TR','BR','US']:
    try:
        s, b, _ = get(f'{W}/api/v1/titles?country={cc}&page=1&page_size=3')
        d = json.loads(b)
        print(f"   {cc}: total={d.get('total'):>7}  first={d.get('items',[{}])[0].get('title')}")
    except Exception as e:
        print(f"   {cc}: ERR {e}")

print()
print("=== AUDIO-LANGUAGES ENDPOINT ===")
try:
    s, b, _ = get(f'{W}/api/v1/audio-languages?limit=3')
    d = json.loads(b)
    items = d.get('items', d) if isinstance(d, dict) else d
    print("   status", s, "count:", len(items))
    for it in items[:3]:
        print("   ", {k: it.get(k) for k in ('title','slug','audioLanguages','dubs') if k in it})
except Exception as e:
    print("   ERR", e)

print()
print("=== FRONTEND ===")
try:
    s, b, h = get(F)
    html = b.decode('utf-8', 'replace')
    scripts = re.findall(r'<script[^>]+src="([^"]+)"', html)
    print("   index status:", s, "len:", len(html))
    print("   bundles:", [x for x in scripts if '_expo' in x])
    print("   serviceWorker refs:", re.findall(r'sw\.js|manifest\.webmanifest', html)[:4])
except Exception as e:
    print("   ERR", e)

try:
    s, b, h = get(f'{F}/sw.js')
    sw = b.decode('utf-8', 'replace')
    m = re.search(r"const VERSION = '([^']+)'", sw)
    print(f"   sw.js status={s} len={len(b)} VERSION={m.group(1) if m else '?'}")
    print("   sw uses full Request as cache key:", 'cache.match(request)' in sw and 'cache.put(request, res.clone())' in sw)
except Exception as e:
    print("   sw ERR", e)

print()
print("=== RELEASES BUCKET ===")
for k in ['latest.yml', 'ShadowStream-Setup-x64.exe', 'ShadowStream-win-x64.zip',
          'StreamApp-Browser-Shortcut.exe', 'ShadowStream-Setup-x64.exe.blockmap',
          'StreamApp-Setup-x64.exe']:
    url = f'https://streamapp-catalog.muhd-faisal-work.workers.dev/downloads/{k}'
    try:
        req = urllib.request.Request(url, headers={'User-Agent': UA}, method='HEAD')
        r = urllib.request.urlopen(req, timeout=15)
        size = int(r.headers.get('content-length', 0))
        print(f"   {k:<38} {r.status}  {size/1048576:>8.1f} MB")
    except Exception as e:
        print(f"   {k:<38} {e}")