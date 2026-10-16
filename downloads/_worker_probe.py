import urllib.request, urllib.error, json

BASE = "https://streamapp-catalog.muhd-faisal-work.workers.dev"

hdrs = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json",
}


def probe(label, path):
    try:
        r = urllib.request.urlopen(urllib.request.Request(BASE + path, headers=hdrs), timeout=30)
        body = r.read().decode()
        ct = r.headers.get("Content-Type", "")
        size = len(body)
        if "application/json" in ct:
            try:
                d = json.loads(body)
                if isinstance(d, dict):
                    keys = list(d.keys())[:6]
                    preview = json.dumps(d, indent=2)[:400]
                else:
                    keys = type(d).__name__
                    preview = str(d)[:300]
            except Exception:
                keys = "?"
                preview = body[:300]
        else:
            keys = "?"
            preview = body[:300]
        print(f"  [OK {r.status}] {label:35s} {size:>10,} bytes")
        print(f"           keys/head: {preview[:300]}")
        print()
        return True
    except urllib.error.HTTPError as e:
        print(f"  [FAIL {e.code}] {label}")
        return False
    except Exception as e:
        print(f"  [ERR] {label}: {e}")
        return False


print("=" * 70)
print("WORKER PROBES")
print("=" * 70)
probe("/health",                              "/health")
probe("/api/v1/stats",                        "/api/v1/stats")
probe("/api/v1/sources",                      "/api/v1/sources")
probe("/api/v1/collections",                  "/api/v1/collections")
probe("/api/v1/genres",                       "/api/v1/genres")
probe("/api/v1/titles (limit=3)",             "/api/v1/titles?limit=3")
probe("/api/v1/titles (type=movie, limit=3)", "/api/v1/titles?type=movie&limit=3")
probe("/api/v1/title/dune-2021",              "/api/v1/title/dune-2021")
probe("/api/v1/title/the-matrix-1999",        "/api/v1/title/the-matrix-1999")
probe("/api/v1/search?q=spielberg",           "/api/v1/search?q=spielberg")
probe("/api/v1/search?q=breaking+bad",        "/api/v1/search?q=breaking+bad&limit=3")
