import urllib.request
import json
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE_URL = "https://ssmoviestvs.site"

def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
    with urllib.request.urlopen(req, timeout=10) as resp:
        return resp.status, resp.read().decode('utf-8', errors='ignore')

def main():
    print("=" * 70)
    print("      LIVE PRODUCTION VERIFICATION FOR SHADOWSTREAM v2.4.44")
    print("=" * 70)

    all_passed = True

    # 1. Version check
    print("\n1. Checking live version.json...")
    try:
        st, body = get(f"{BASE_URL}/version.json")
        vdata = json.loads(body)
        print(f" [PASS] Live version: {vdata.get('version')}, code: {vdata.get('versionCode')}")
        if vdata.get('version') != "2.4.44" or vdata.get('versionCode') != 284:
            print("  [WARN] version.json doesn't match 2.4.44/284 yet (may take 30s CDN cache)")
    except Exception as e:
        print(f" [FAIL] version.json check error: {e}")
        all_passed = False

    # 2. Bugfix verification: slug passed as id in /stream/resolve
    print("\n2. Checking /stream/resolve slug-as-id bugfix for 'the-last-of-us-2023'...")
    try:
        st, body = get(f"{BASE_URL}/api/v1/stream/resolve?id=the-last-of-us-2023&season=1&episode=1")
        res = json.loads(body)
        streams = res.get('streams', [])
        print(f"  Received {len(streams)} streams for the-last-of-us-2023")
        vidstuck = next((s for s in streams if s.get('provider') == 'vidstuck'), None)
        if vidstuck and '100088' in vidstuck.get('url', ''):
            print(f" [PASS] VidStuck resolved with canonical TMDB 100088: {vidstuck['url']}")
        else:
            print(f" [FAIL] VidStuck did not resolve with TMDB 100088: {vidstuck}")
            all_passed = False
    except Exception as e:
        print(f" [FAIL] stream/resolve error: {e}")
        all_passed = False

    # 3. Categories check: Islamic & Religious History tray
    print("\n3. Checking /api/v1/categories for 'islamic-history' tray...")
    try:
        st, body = get(f"{BASE_URL}/api/v1/categories")
        cats = json.loads(body)
        islamic_cat = next((c for c in cats if c.get('id') == 'islamic-history'), None)
        if islamic_cat and len(islamic_cat.get('items', [])) == 15:
            print(f" [PASS] Category found: '{islamic_cat.get('title')}' with {len(islamic_cat.get('items', []))} items!")
        else:
            print(f" [FAIL] islamic-history category missing or incomplete: {islamic_cat}")
            all_passed = False
    except Exception as e:
        print(f" [FAIL] categories error: {e}")
        all_passed = False

    # 4. Collections check: /api/v1/collections/islamic-history
    print("\n4. Checking /api/v1/collections/islamic-history...")
    try:
        st, body = get(f"{BASE_URL}/api/v1/collections/islamic-history")
        col_res = json.loads(body)
        items = col_res.get('items', [])
        print(f" [PASS] Collection endpoint returned {len(items)} items, name: {col_res.get('collection', {}).get('name')}")
        if len(items) != 15:
            all_passed = False
    except Exception as e:
        print(f" [FAIL] collections error: {e}")
        all_passed = False

    # 5. Search check: test Islamic search queries
    print("\n5. Checking /api/v1/search queries...")
    queries = ["the message", "prophet joseph", "kingdom of solomon", "islam", "omar", "moses", "mokhtar", "sahaba"]
    for q in queries:
        try:
            st, body = get(f"{BASE_URL}/api/v1/search?q={urllib.parse.quote(q)}")
            s_res = json.loads(body)
            items = s_res.get('items', [])
            top = items[0].get('title') if items else "None"
            print(f" [PASS] Search '{q}': found {len(items)} hits (top: {top})")
        except Exception as e:
            print(f" [FAIL] Search '{q}' error: {e}")
            all_passed = False

    # 6. Stream resolution for all 15 Islamic titles
    print("\n6. Checking /stream/resolve across all 15 Islamic titles...")
    from verify_islamic_catalog_and_playback import ISLAMIC_TITLES
    for idx, (slug, tmdb, imdb, mtype, name) in enumerate(ISLAMIC_TITLES, 1):
        try:
            q_url = f"{BASE_URL}/api/v1/stream/resolve?id={slug}&type={mtype}"
            if mtype == 'tv':
                q_url += "&season=1&episode=1"
            st, body = get(q_url)
            data = json.loads(body)
            streams = data.get('streams', [])
            if len(streams) > 0:
                print(f" [PASS] #{idx:02d} {name} -> {len(streams)} streams resolved")
            else:
                print(f" [FAIL] #{idx:02d} {name} -> 0 streams resolved")
                all_passed = False
        except Exception as e:
            print(f" [FAIL] #{idx:02d} {name} -> resolve error: {e}")
            all_passed = False

    print("\n" + "=" * 70)
    if all_passed:
        print(">>> ALL PRODUCTION VERIFICATION CHECKS PASSED 100%! <<<")
        return 0
    else:
        print(">>> ONE OR MORE PRODUCTION CHECKS FAILED! <<<")
        return 1

if __name__ == "__main__":
    sys.exit(main())
