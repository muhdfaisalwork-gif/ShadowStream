"""Full E2E: live app + Worker backend."""
import urllib.request, urllib.error, json

HDRS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}

LIVE = "https://rez2tvqr75258.space.minimax.io"
WORKER = "https://streamapp-catalog.muhd-faisal-work.workers.dev"

print("=" * 70)
print("LAYER 1 — live app HTML serves with __STREAMING_CONFIG__ injected")
print("=" * 70)
r = urllib.request.urlopen(urllib.request.Request(LIVE + "/", headers=HDRS), timeout=10)
body = r.read().decode()
checks = [
    ("status 200", r.status == 200),
    ("__STREAMING_CONFIG__ present", "__STREAMING_CONFIG__" in body),
    ("apiBase points at Worker", "streamapp-catalog.muhd-faisal-work.workers.dev" in body),
    ("indexedCount=101971 injected", "indexedCount\":101971" in body or "indexedCount:101971" in body),
]
for label, ok in checks:
    print(f"  [{'OK ' if ok else 'FAIL'}] {label}")
print()

print("=" * 70)
print("LAYER 2 — Worker backend reachable from anywhere")
print("=" * 70)
endpoints = [
    ("/health",                                          "/health"),
    ("/api/v1/stats",                                    "/api/v1/stats"),
    ("/api/v1/sources",                                  "/api/v1/sources"),
    ("/api/v1/collections",                              "/api/v1/collections"),
    ("/api/v1/genres",                                   "/api/v1/genres"),
    ("/api/v1/countries",                                "/api/v1/countries"),
    ("/api/v1/audience-tags",                            "/api/v1/audience-tags"),
    ("/api/v1/titles?type=movie&limit=3",                "/api/v1/titles?type=movie&limit=3"),
    ("/api/v1/titles?type=tv&limit=3",                   "/api/v1/titles?type=tv&limit=3"),
    ("/api/v1/title/dune-2021",                          "/api/v1/title/dune-2021"),
    ("/api/v1/search?q=nolan",                           "/api/v1/search?q=nolan&limit=3"),
]
for label, path in endpoints:
    try:
        r = urllib.request.urlopen(urllib.request.Request(WORKER + path, headers=HDRS), timeout=30)
        body = r.read()
        ct = r.headers.get("Content-Type", "")
        if "json" in ct:
            d = json.loads(body)
            preview = json.dumps(d, default=str)[:140].replace("\n", " ")
        else:
            preview = f"<{len(body)} bytes HTML>"
        print(f"  [OK {r.status:3d}] {label:45s} {preview}")
    except urllib.error.HTTPError as e:
        print(f"  [FAIL {e.code:3d}] {label:45s} {e.read().decode()[:100]}")
    except Exception as e:
        print(f"  [ERR] {label}: {e}")
print()

print("=" * 70)
print("LAYER 3 — what the live app footer will now show (synthesized)")
print("=" * 70)
r = urllib.request.urlopen(urllib.request.Request(WORKER + "/api/v1/stats", headers=HDRS), timeout=10)
d = json.loads(r.read())
print(f"  v2.0.0+ · Phase 2 + lawful-only")
print(f"  {d['sources_legal']} lawful sources · {d['countries']} countries · {d['languages']} languages")
print(f"  indexed: {d['indexed']:,} titles")
