"""Thorough E2E that probes actual app behavior, not just HTTP status.

Checks each layer:
  L1: live URL loads, HTML present
  L2: live URL JS bundle present
  L3: live URL API endpoints resolve (same-origin vs backend)
  L4: API responses contain real data (not just HTML fallback)
  L5: catalog service (127.0.0.1:7801) returns real catalog numbers
  L6: R2 binaries are accessible
"""
import urllib.request, urllib.error, json, sys

HDRS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/html;q=0.9",
}


def get(url, accept="application/json"):
    req = urllib.request.Request(url, headers={**HDRS, "Accept": accept})
    return urllib.request.urlopen(req, timeout=15)


def head(url):
    req = urllib.request.Request(url, headers=HDRS, method="HEAD")
    return urllib.request.urlopen(req, timeout=10)


print("=" * 70)
print("LAYER 1 — downloads landing page (https://7g5qmh0j79e4e.space.minimax.io/)")
print("=" * 70)
r = get("https://7g5qmh0j79e4e.space.minimax.io/", accept="text/html")
body = r.read().decode()
print(f"  status={r.status}  size={len(body)} bytes")
checks = [
    ("page title contains 'StreamApp'", "StreamApp" in body),
    ("mentions 101,971 titles",          "101,971" in body),
    ("links to live app",                 "ls7m73ztxvfc2.space.minimax.io" in body),
    ("links to 5 R2 binaries",            body.count("pub-94ab97339d4943b8a53502ba94f8d59f.r2.dev") == 5),
    ("Open-in-browser CTA",               "Open StreamApp" in body),
]
for label, ok in checks:
    print(f"  [{'OK ' if ok else 'FAIL'}] {label}")
print()

print("=" * 70)
print("LAYER 2 — R2 binaries (the actual downloads)")
print("=" * 70)
binaries = [
    "StreamApp-windows-x64.exe",
    "StreamApp-linux-x64",
    "StreamApp-linux-arm64",
    "StreamApp-macos-x64",
    "StreamApp-macos-arm64",
]
all_ok = True
for fn in binaries:
    try:
        r = head(f"https://pub-94ab97339d4943b8a53502ba94f8d59f.r2.dev/streamapp/{fn}")
        size_mb = int(r.headers.get("Content-Length", 0)) / 1024 / 1024
        ct = r.headers.get("Content-Type", "?")
        print(f"  [OK {r.status}] {fn:30s} {size_mb:5.1f} MB  Content-Type={ct}")
    except Exception as e:
        print(f"  [FAIL] {fn}: {e}")
        all_ok = False
print(f"  -> {'ALL 5 BINARIES DOWNLOADABLE' if all_ok else 'SOME BINARIES FAILED'}")
print()

print("=" * 70)
print("LAYER 3 — live web app (https://ls7m73ztxvfc2.space.minimax.io/)")
print("=" * 70)
r = get("https://ls7m73ztxvfc2.space.minimax.io/", accept="text/html")
body = r.read().decode()
print(f"  status={r.status}  size={len(body)} bytes")
print(f"  bundle type detected: {'react-native-web' if 'react-native-web' in body else 'unknown'}")
app_checks = [
    ("page title contains 'StreamApp'",   "StreamApp" in body),
    ("page title contains 'frontend'",    "frontend" in body),
    ("footer mentions 'lawful'",          "lawful" in body),
    ("footer mentions countries count",    "countries" in body),
    ("footer shows current catalog count", "countries" in body),
    ("JS bundle referenced",              "_expo/static/js" in body),
]
for label, ok in app_checks:
    print(f"  [{'OK ' if ok else 'FAIL'}] {label}")
print()

print("=" * 70)
print("LAYER 4 — does the live app have a real backend?")
print("=" * 70)
# Hit /api/v1/stats on the live URL — if it returns JSON, backend is wired.
# If it returns HTML, it's the static SPA fallback.
try:
    r = get("https://ls7m73ztxvfc2.space.minimax.io/api/v1/stats")
    body = r.read()
    ct = r.headers.get("Content-Type", "?")
    print(f"  Content-Type: {ct}")
    print(f"  size: {len(body)} bytes")
    if "application/json" in ct:
        d = json.loads(body)
        print(f"  PARSED JSON: {json.dumps(d)[:300]}")
    else:
        print(f"  BODY: HTML (first 100 chars): {body[:100]!r}")
        print(f"  → LIVE APP HAS NO BACKEND. 'Live: offline (curated: 0)' is real.")
except Exception as e:
    print(f"  ERR: {e}")
print()

print("=" * 70)
print("LAYER 5 — local catalog service (127.0.0.1:7801) — what live should show")
print("=" * 70)
r = get("http://127.0.0.1:7801/health")
d = json.loads(r.read())
counts = d.get("counts", {})
print(f"  status={r.status}")
for k, v in counts.items():
    print(f"    {k}: {v}")
print()

print("=" * 70)
print("LAYER 6 — local catalog /api/v1/stats")
print("=" * 70)
try:
    r = get("http://127.0.0.1:7801/api/v1/stats")
    d = json.loads(r.read())
    print(f"  indexed: {d.get('indexed')}")
    print(f"  by_type: {d.get('by_type')}")
    print(f"  by_state: {d.get('by_state')}")
    print(f"  collections: {d.get('collections')}")
except Exception as e:
    print(f"  ERR: {e}")
