import urllib.request, urllib.error
hdrs = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

print("=== NEW DEPLOYMENT ===")
r = urllib.request.urlopen(urllib.request.Request("https://bxtc7e699j10r.space.minimax.io/", headers=hdrs), timeout=10)
body = r.read().decode()
print("  status =", r.status)
print("  size   =", len(body), "bytes")
title_start = body.find("<title>") + 7
title_end = body.find("</title>")
print("  title  =", body[title_start:title_end] if title_start > 6 else "?")

print()
print("=== /api/v1/stats on new URL (does it have a backend?) ===")
try:
    r = urllib.request.urlopen(urllib.request.Request("https://bxtc7e699j10r.space.minimax.io/api/v1/stats", headers=hdrs), timeout=10)
    body = r.read()
    print("  size   =", len(body), "bytes")
    print("  ct     =", r.headers.get("Content-Type"))
    if b"application/json" in r.headers.get("Content-Type", "").encode():
        print("  JSON   =", body[:200].decode(errors="replace"))
    else:
        print("  -> HTML returned (no backend, static SPA fallback only)")
except urllib.error.HTTPError as e:
    print("  HTTPError", e.code)

print()
print("=== JS bundle hash (should differ from old ls7m73ztxvfc2 deploy) ===")
old_bundle = "https://ls7m73ztxvfc2.space.minimax.io/_expo/static/js/web/index-6d4633124ce49caa05f37a8cbd112c87.js"
new_bundle = "https://bxtc7e699j10r.space.minimax.io/_expo/static/js/web/index-82f75ba165185a6914e6d13f1fcfbb4e.js"
for label, url in [("OLD", old_bundle), ("NEW", new_bundle)]:
    try:
        r = urllib.request.urlopen(urllib.request.Request(url, headers=hdrs, method="HEAD"), timeout=10)
        size = int(r.headers.get("Content-Length", 0))
        print(f"  [{label}] {url.split('/')[-1]}  size={size/1024:.0f} KB")
    except Exception as e:
        print(f"  [{label}] ERR: {e}")
