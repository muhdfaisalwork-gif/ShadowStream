import urllib.request, json

WORKER = 'https://streamapp-catalog.muhd-faisal-work.workers.dev'
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129 Safari/537.36'

def fetch(url, label):
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': 'application/json'})
    try:
        r = urllib.request.urlopen(req, timeout=10)
        d = json.loads(r.read())
        total = d.get('total', '?')
        items = d.get('items', [])
        name = d.get('name', '?')
        sample = items[0].get('title') if items else 'none'
        print(f"  [{label}] http={r.status} total={total} name={name} items={len(items)} first={sample}")
    except Exception as e:
        print(f"  [{label}] ERROR {e}")

countries = ['JP','IN','US','PK','GB','CN','KR','TR','BR','FR','CA','DE','ES','IT','MX','RU','AU','SA','AE','EG']

print("\n=== Test A: /titles?country=XX (frontend currently calls this) ===")
for cc in countries[:5]:
    fetch(f'{WORKER}/titles?country={cc}&page=1&page_size=5', f'A {cc}')

print("\n=== Test B: /api/v1/titles?country=XX (canonical route per worker) ===")
for cc in countries:
    fetch(f'{WORKER}/api/v1/titles?country={cc}&page=1&page_size=5', f'B {cc}')

print("\n=== Test C: /titles (no filter, control) ===")
fetch(f'{WORKER}/titles?page=1&page_size=5', 'C titles')
fetch(f'{WORKER}/api/v1/titles?page=1&page_size=5', 'C api/v1/titles')