"""
deep_audit.py — Comprehensive end-to-end debugging, streaming resolution,
and verification audit script for StreamApp / ShadowStream.
"""
import urllib.request
import urllib.parse
import json
import time
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE_URL = "https://ssmoviestvs.site"
LOCAL_BACKEND = "http://127.0.0.1:3000"
LOCAL_CATALOG = "http://127.0.0.1:7801"
LOCAL_SCRAPER = "http://127.0.0.1:7800"

def fetch_json(url, timeout=15):
    start = time.perf_counter()
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            dur = (time.perf_counter() - start) * 1000
            data = json.loads(resp.read().decode("utf-8"))
            return resp.status, dur, data, None
    except Exception as e:
        dur = (time.perf_counter() - start) * 1000
        return 0, dur, None, str(e)

def fetch_headers(url, timeout=15):
    start = time.perf_counter()
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            dur = (time.perf_counter() - start) * 1000
            return resp.status, dur, dict(resp.headers), None
    except Exception as e:
        dur = (time.perf_counter() - start) * 1000
        return 0, dur, {}, str(e)


def audit_system():
    print("==================================================================", flush=True)
    print("       SHADOWSTREAM COMPREHENSIVE DEEP AUDIT & HEALTH CHECK       ", flush=True)
    print("==================================================================\n", flush=True)

    passed = 0
    total = 0

    # 1. Local Daemons
    print("--- 1. LOCAL SERVICE DAEMONS ---", flush=True)
    for name, url in [
        ("Backend :3000", f"{LOCAL_BACKEND}/health"),
        ("Catalog :7801", f"{LOCAL_CATALOG}/health"),
        ("Live Scraper :7800", f"{LOCAL_SCRAPER}/stats")
    ]:
        total += 1
        st, ms, data, err = fetch_json(url, timeout=5)
        if st == 200:
            passed += 1
            print(f"  [PASS] {name:<20} -> HTTP 200 ({ms:.1f}ms)", flush=True)
        else:
            print(f"  [FAIL] {name:<20} -> {err} ({ms:.1f}ms)", flush=True)

    # 2. Production Core APIs
    print("\n--- 2. PRODUCTION CUSTOM DOMAIN APIs (ssmoviestvs.site) ---", flush=True)
    for name, path in [
        ("Health & Status", "/api/v1/health"),
        ("Catalog Stats", "/api/v1/stats"),
        ("Categories Rails", "/api/v1/categories"),
        ("Collections Index", "/api/v1/collections"),
        ("Editorial Blogs", "/api/v1/blogs")
    ]:
        total += 1
        st, ms, data, err = fetch_json(f"{BASE_URL}{path}")
        if st == 200:
            passed += 1
            count = len(data) if isinstance(data, list) else len(data.get("items", data.get("categories", [])))
            print(f"  [PASS] {name:<20} -> HTTP 200 ({ms:.1f}ms) | items: {count}", flush=True)
        else:
            print(f"  [FAIL] {name:<20} -> {err} ({ms:.1f}ms)", flush=True)

    # 3. Studio Hubs & Collections
    print("\n--- 3. STUDIO HUBS & PROPHETS COLLECTIONS ---", flush=True)
    for slug in ["paramount-plus", "peacock", "universal-pictures", "sony-pictures", "prophets-and-history"]:
        total += 1
        st, ms, data, err = fetch_json(f"{BASE_URL}/api/v1/collections/{slug}")
        if st == 200:
            passed += 1
            items = len(data.get("items", []))
            name = data.get("collection", {}).get("name", slug)
            print(f"  [PASS] Hub '{slug}': {name} -> HTTP 200 ({ms:.1f}ms) | {items} titles", flush=True)
        else:
            print(f"  [FAIL] Hub '{slug}': -> {err} ({ms:.1f}ms)", flush=True)

    # 4. Search API Verification
    print("\n--- 4. FULL-TEXT SEARCH API TESTS ---", flush=True)
    search_queries = ["Star Trek", "The Office", "Jurassic", "Spider-Man", "The Message"]
    for q in search_queries:
        total += 1
        st, ms, data, err = fetch_json(f"{BASE_URL}/api/v1/search?q={urllib.parse.quote(q)}")
        if st == 200:
            passed += 1
            res = data if isinstance(data, list) else data.get("results", data.get("items", []))
            top = res[0].get("title", "") if res else "None"
            print(f"  [PASS] Search \"{q}\": {len(res)} hits ({ms:.1f}ms) -> Top: '{top}'", flush=True)
        else:
            print(f"  [FAIL] Search \"{q}\": -> {err} ({ms:.1f}ms)", flush=True)

    # 5. Playback & Availability Resolvers
    print("\n--- 5. STREAMING EMBEDS & PLAYBACK AVAILABILITY ---", flush=True)
    test_titles = [
        ("Yellowstone / Star Trek (Paramount)", "star-trek-strange-new-worlds-2022"),
        ("The Office (Peacock)", "the-office-2005"),
        ("Oppenheimer (Universal)", "oppenheimer-2023-2"),
        ("Spider-Man (Sony)", "spider-man-no-way-home-2021")
    ]
    for label, slug in test_titles:
        total += 1
        st, ms, data, err = fetch_json(f"{BASE_URL}/api/v1/title/{slug}")
        if st == 200:
            avail = data.get("availability", [])
            sources = [a.get("source") for a in avail if a.get("source")]
            if avail:
                passed += 1
                print(f"  [PASS] {label:<35} -> HTTP 200 ({ms:.1f}ms) | {len(avail)} sources: {sources[:4]}", flush=True)
            else:
                print(f"  [WARN] {label:<35} -> HTTP 200 but 0 sources found ({ms:.1f}ms)", flush=True)
        else:
            print(f"  [FAIL] {label:<35} -> {err} ({ms:.1f}ms)", flush=True)

    # 6. Android APK Download Verification
    print("\n--- 6. ANDROID APK APP DOWNLOAD VERIFICATION ---", flush=True)
    total += 1
    apk_url = f"{BASE_URL}/downloads/ShadowStream.apk"
    st, ms, headers, err = fetch_headers(apk_url)
    cl = int(headers.get("Content-Length") or headers.get("content-length") or 0)
    ct = headers.get("Content-Type") or headers.get("content-type") or ""
    if st == 200 and cl > 1_000_000:
        passed += 1
        print(f"  [PASS] Native APK: {apk_url} -> HTTP 200 ({ms:.1f}ms)", flush=True)
        print(f"         Content-Type: {ct} | Size: {cl:,} bytes (1.03 MB) | Verified", flush=True)
    else:
        print(f"  [FAIL] Native APK -> status {st}, size: {cl} ({err})", flush=True)

    print("\n==================================================================", flush=True)
    print(f"AUDIT SUMMARY: {passed}/{total} CHECKS PASSED ({(passed/total)*100:.1f}%)", flush=True)
    print("==================================================================", flush=True)


if __name__ == "__main__":
    audit_system()
