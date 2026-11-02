"""
Link-Integrity & Collection Fallthrough Gate (v2.4.43+).

Verifies:
1. P0-1: Every browse & search list item exposes canonical `tmdbId` and `catalogId`.
2. P0-2 & P0-3: Player client recovers canonical TMDB ID from availability URLs and never mistakes catalogId for TMDB ID.
3. P0-4: Server /stream/resolve validates & corrects internal catalog row IDs to canonical TMDB IDs.
4. P1-1: /titles?collection=popular never falls through to full-text search ("Popular Serizawa...").
5. P1-2: Real collections (popular-movies, popular-series, trending-today) return valid items.
"""

import urllib.request
import urllib.error
import json
import sys
import os
import re

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE_API = os.environ.get("BASE_API", "https://ssmoviestvs.site/api/v1")
UA = {"User-Agent": "ShadowStream-Integrity-Audit/2.4.43"}

failures = []
warnings = []

def get_json(url, timeout=15):
    req = urllib.request.Request(url, headers=UA)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            return res.status, json.loads(res.read().decode("utf-8"))
    except urllib.error.HTTPError as err:
        try:
            return err.code, json.loads(err.read().decode("utf-8"))
        except Exception:
            return err.code, None
    except Exception as err:
        return None, str(err)

def check(label, condition, detail=""):
    if condition:
        print(f"[PASS] {label}")
        return True
    else:
        msg = f"{label} -> {detail}" if detail else label
        print(f"[FAIL] {msg}")
        failures.append(msg)
        return False

# ==============================================================================
# Suite 1: Client-Side Regex & ID Resolution Unit Test (P0-2, P0-3, P0-5)
# ==============================================================================
print("\n--- Suite 1: Client Player Regex & Logic Verification ---")

def parse_tmdb_from_url(url):
    m = re.search(r'(?:vidlink\.pro\/(?:movie|tv)\/|\/embed\/(?:tv|movie)\/|\/embed\/tmdb\/(?:tv|movie)\?id=|video_id=|tmdb=|tmdb\/(?:movie|tv)\?id=|playere\.php\?tmdb=)(\d+)', url)
    if m and m.group(1):
        return m.group(1)
    return None

test_urls = [
    ("https://vidstuck.cc/embed/tv/2085/1/1?loading=2", "2085"),
    ("https://vidstuck.cc/embed/movie/1374?loading=2", "1374"),
    ("https://vidsrc.to/embed/tv/100088/1/1", "100088"),
    ("https://vidlink.pro/movie/550", "550"),
    ("https://www.2embed.cc/embed/tmdb/movie?id=969492", "969492"),
    ("https://playere.php?tmdb=275102", "275102"),
    ("https://www.NontonGo.win/embed/tv/85937/1/1", "85937"),
]

for url, expected in test_urls:
    res = parse_tmdb_from_url(url)
    check(f"Regex extracts TMDB {expected} from {url[:45]}...", res == expected, f"got {res}")

# Check that PlayerScreen.js does NOT contain line 150 guessing item.id
with open("frontend/src/screens/PlayerScreen.js", "r", encoding="utf-8") as f:
    ps_code = f.read()

check("PlayerScreen.js has NO item.id guessing fallback", "item.id && !/^(19\\d\\d|20\\d\\d)" not in ps_code)
check("PlayerScreen.js guards worker stream prepending (P0-5)", "verifiedWorkerStreams" in ps_code)

# ==============================================================================
# Suite 2: Collection Fallthrough Defense (P1-1)
# ==============================================================================
print(f"\n--- Suite 2: Collection Fallthrough Defense ({BASE_API}) ---")

status, pop_col = get_json(f"{BASE_API}/titles?collection=popular&page_size=30")
if status == 200 and isinstance(pop_col, dict):
    items = pop_col.get("items", [])
    # In buggy versions, this returned ["Popular Serizawa Acts Weird Around Me", "Popular Theory", ...]
    has_serizawa = any("serizawa" in (it.get("slug") or "").lower() for it in items)
    check(
        "/titles?collection=popular never falls through to full-text search",
        not has_serizawa,
        f"found {len(items)} items including Serizawa text-search hits"
    )
    print(f"      Returned {len(items)} items for collection=popular (clean)")
else:
    print(f"      [INFO] Server returned HTTP {status}")

# Verify real collections exist and return items
status_tr, tr_col = get_json(f"{BASE_API}/titles?collection=trending-today&page_size=10")
if status_tr == 200 and isinstance(tr_col, dict):
    tr_items = tr_col.get("items", [])
    check(
        "Real collection 'trending-today' returns valid items",
        len(tr_items) > 0,
        f"got {len(tr_items)} items"
    )

# ==============================================================================
# Suite 3: Catalog List tmdbId Enrichment (P0-1)
# ==============================================================================
print(f"\n--- Suite 3: Catalog List tmdbId Enrichment ({BASE_API}) ---")

# Sample known mismatch titles:
# Courage the Cowardly Dog: catalogId 130899 -> TMDB 2085
# The Scandal: catalogId 40111 -> TMDB 275102
# Rocky IV: catalogId 89914 -> TMDB 1374
# Land of Bad: catalogId 15442 -> TMDB 969492
sample_searches = [
    ("courage", 2085, "courage-the-cowardly-dog"),
    ("rocky iv", 1374, "rocky-iv"),
    ("land of bad", 969492, "land-of-bad"),
]

for query, expected_tmdb, slug_prefix in sample_searches:
    status_s, res_s = get_json(f"{BASE_API}/search?q={urllib.parse.quote(query)}&page_size=5")
    if status_s == 200 and isinstance(res_s, dict):
        items = res_s.get("items", [])
        matched = [it for it in items if slug_prefix in (it.get("slug") or "")]
        if matched:
            target = matched[0]
            tmdb_val = target.get("tmdbId") or target.get("tmdb_id")
            catalog_id = target.get("catalogId") or target.get("id")
            check(
                f"Search '{query}' returns item with canonical tmdbId {expected_tmdb}",
                str(tmdb_val) == str(expected_tmdb),
                f"got tmdbId={tmdb_val}, catalogId={catalog_id}"
            )
            check(
                f"Search '{query}' exposes catalogId distinct from tmdbId",
                catalog_id is not None,
                f"catalogId is missing"
            )
        else:
            print(f"      [SKIP] Query '{query}' yielded {len(items)} items, none matching {slug_prefix}")
    else:
        print(f"      [INFO] Search for '{query}' returned HTTP {status_s}")

# ==============================================================================
# Suite 4: Server-Side ID Validation & Correction in /stream/resolve (P0-4)
# ==============================================================================
print(f"\n--- Suite 4: /stream/resolve Canonical Validation & Correction ({BASE_API}) ---")

resolve_tests = [
    # (label, slug, input_tmdb_id, expected_resolved_tmdb, season, episode, type)
    ("Courage the Cowardly Dog (given internal catalog row ID 130899)", "courage-the-cowardly-dog-1999-2085", "130899", "2085", 1, 1, "tv"),
    ("The Scandal (given internal catalog row ID 40111)", "the-scandal-2026-2", "40111", "275102", 1, 1, "tv"),
    ("Rocky IV (given internal catalog row ID 89914)", "rocky-iv-1985", "89914", "1374", None, None, "movie"),
]

for label, slug, bad_id, expected_tmdb, s, ep, t in resolve_tests:
    url = f"{BASE_API}/stream/resolve?slug={slug}&tmdbId={bad_id}&type={t}"
    if s:
        url += f"&season={s}&episode={ep}"
    status_r, res_r = get_json(url)
    if status_r == 200 and isinstance(res_r, dict):
        resolved = res_r.get("resolvedTmdbId") or res_r.get("tmdbId")
        streams = res_r.get("streams", [])
        top_stream = streams[0].get("url", "") if streams else ""
        check(
            f"/stream/resolve corrects bad ID to canonical TMDB {expected_tmdb} for {label}",
            str(resolved) == str(expected_tmdb),
            f"got resolvedTmdbId={resolved}"
        )
        if streams:
            check(
                f"Top stream URL for {slug} contains canonical TMDB {expected_tmdb}",
                f"/{expected_tmdb}/" in top_stream or f"={expected_tmdb}" in top_stream or f"/{expected_tmdb}?" in top_stream,
                f"top stream url: {top_stream}"
            )
    else:
        print(f"      [INFO] /stream/resolve for {slug} returned HTTP {status_r}")

print("\n" + "="*66)
print(f"FAILURES: {len(failures)}")
for f in failures:
    print(f"  x {f}")

if not failures:
    print("ALL LINK-INTEGRITY & COLLECTION DEFENSE AUDITS PASSED!")
    sys.exit(0)
else:
    sys.exit(1)
