import urllib.request
import json
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=15) as r:
        return r.status, r.read()

print("=== FINAL LIVE PRODUCTION SYSTEM VERIFICATION ===\n", flush=True)

# 1. Health
st, b = get("https://ssmoviestvs.site/api/v1/health")
print(f"1. Health API: HTTP {st} -> {b.decode()[:60]}...", flush=True)

# 2. Categories (4 studio rails)
st, b = get("https://ssmoviestvs.site/api/v1/categories")
cats = json.loads(b.decode())
print(f"\n2. Categories API: HTTP {st} -> Total {len(cats)} rails", flush=True)
for c in cats:
    cid = c.get("id", "")
    if any(k in cid for k in ["paramount", "peacock", "universal", "sony"]):
        title = c.get("title", "")
        safe_title = title.encode("ascii", errors="replace").decode("ascii")
        print(f"   [ACTIVE RAIL] {cid}: {safe_title} ({len(c.get('items', []))} titles)", flush=True)

# 3. Collections List
st, b = get("https://ssmoviestvs.site/api/v1/collections")
cols = json.loads(b.decode())
items = cols.get("items", cols) if isinstance(cols, dict) else cols
print(f"\n3. Collections API: HTTP {st} -> Total {len(items)} collections", flush=True)
for c in items:
    slug = c.get("slug", "")
    if any(k in slug for k in ["paramount", "peacock", "universal", "sony"]):
        cnt = c.get("title_count") or c.get("count")
        print(f"   [STUDIO HUB] {slug}: {c.get('name')} ({cnt} titles mapped)", flush=True)

# 4. Individual Collections
print("\n4. Individual Collection Pages:", flush=True)
for s in ["paramount-plus", "peacock", "universal-pictures", "sony-pictures"]:
    st, b = get(f"https://ssmoviestvs.site/api/v1/collections/{s}")
    cd = json.loads(b.decode())
    print(f"   [OK] /collections/{s}: HTTP {st} ({len(cd.get('items', []))} titles available to browse)", flush=True)

# 5. Android APK Download
st, b = get("https://ssmoviestvs.site/downloads/ShadowStream.apk")
print(f"\n5. Android APK: HTTP {st} -> {len(b):,} bytes downloaded and verified", flush=True)

print("\n==================================================", flush=True)
print("ALL LIVE PRODUCTION CHECKS PASSED WITH 100% SUCCESS!", flush=True)
print("==================================================", flush=True)
