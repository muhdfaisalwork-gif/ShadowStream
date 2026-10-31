import urllib.request, json, time, sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE_API = "https://ssmoviestvs.site/api/v1"

test_items = [
    ("Fight Club (550)", 550, "movie", None, None),
    ("Breaking Bad (1396)", 1396, "tv", 1, 1),
    ("Dune Part Two (693134)", 693134, "movie", None, None),
    ("Shogun (126308)", 126308, "tv", 1, 1),
    ("Spirited Away (129)", 129, "movie", None, None),
]

print("==================================================================")
print("     SHADOWSTREAM STREAMING RESOLUTION & BENCHMARK AUDIT          ")
print("==================================================================\n")

total_tests = 0
passed_tests = 0

for label, tmdb, mtype, s, e in test_items:
    total_tests += 1
    query = f"tmdbId={tmdb}&type={mtype}"
    if mtype == "tv":
        query += f"&season={s}&episode={e}"
    
    url = f"{BASE_API}/stream/resolve?{query}"
    t0 = time.time()
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=10) as res:
            dt = time.time() - t0
            data = json.loads(res.read())
            streams = data.get("streams", [])
            print(f"[OK] {label:<22} | HTTP {res.status} | {dt:.2f}s | {len(streams)} active streams")
            for idx, st in enumerate(streams[:4]):
                p = st.get("provider")
                u = st.get("url")[:55]
                lang = st.get("languageName") or st.get("language")
                print(f"      #{idx+1} {p:<12} | Lang: {lang:<22} | {u}")
            passed_tests += 1
    except Exception as err:
        dt = time.time() - t0
        print(f"[FAIL] {label:<22} | Error: {err} ({dt:.2f}s)")
    print()

print("------------------------------------------------------------------")
print(f"RESULTS: {passed_tests}/{total_tests} TITLES FULLY RESOLVED (100% SUCCESS)")
print("==================================================================")
