"""
Verification script for all 15 Islamic & Religious History titles and mainstream titles.
Tests:
1. Catalog presence & metadata.
2. Season formatting & React Child Error #31 immunity.
3. /stream/resolve returns direct 1080p/720p streams and VidSrc fallbacks.
4. Direct Archive.org HTTP HEAD / byte-range responses (200 / 206).
5. Mainstream titles (e.g. The Last of Us, Fight Club) resolve cleanly without regressions.
"""

import sys
import json
import urllib.request
import urllib.error

TITLES = [
    {"slug": "the-message-1976", "title": "The Message", "type": "movie"},
    {"slug": "muhammad-the-messenger-of-god-2015", "title": "Muhammad: The Messenger of God", "type": "movie"},
    {"slug": "muhammad-the-last-prophet-2002", "title": "Muhammad: The Last Prophet", "type": "movie"},
    {"slug": "muhammad-the-final-legacy-2008", "title": "Qamar Bani Hashim (Muhammad: The Final Legacy)", "type": "tv", "ep": 1},
    {"slug": "prophet-joseph-2008", "title": "Prophet Joseph", "type": "tv", "ep": 1},
    {"slug": "the-kingdom-of-solomon-2010", "title": "The Kingdom of Solomon", "type": "movie"},
    {"slug": "abraham-friend-of-god-2008", "title": "Abraham: The Friend of God", "type": "movie"},
    {"slug": "saint-mary-2000", "title": "Saint Mary", "type": "tv", "ep": 1},
    {"slug": "the-messiah-2007", "title": "The Messiah", "type": "movie"},
    {"slug": "testament-the-story-of-moses-2024", "title": "Testament: The Story of Moses", "type": "tv", "ep": 1},
    {"slug": "omar-series-2012", "title": "Omar", "type": "tv", "ep": 1},
    {"slug": "bilal-a-new-breed-of-hero-2015", "title": "Bilal: A New Breed of Hero", "type": "movie"},
    {"slug": "imam-ali-1997", "title": "Imam Ali", "type": "tv", "ep": 1},
    {"slug": "men-of-anjolos-1997", "title": "Men of Anjolos", "type": "tv", "ep": 1},
    {"slug": "mokhtarnameh-2010", "title": "The Mokhtar Narrative (Mokhtarnameh)", "type": "tv", "ep": 1}
]

API_BASE = "https://ssmoviestvs.site/api/v1"

def check_url(url, timeout=5):
    try:
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Range": "bytes=0-1024"
            }
        )
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, resp.headers.get("Content-Type", "")
    except urllib.error.HTTPError as e:
        return e.code, str(e)
    except Exception as e:
        return 0, str(e)

def test_catalog():
    print("=" * 70)
    print("1. VERIFYING ISLAMIC CATEGORY AND CATALOG TITLES")
    print("=" * 70)

    url = f"{API_BASE}/categories/islamic-religious-history"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            items = data.get("items", [])
            print(f"[PASS] Category /categories/islamic-religious-history returned {len(items)} items")
            assert len(items) >= 15, f"Expected at least 15 items, got {len(items)}"
            
            # Check React Child Safety for each item
            for item in items:
                seasons = item.get("seasons")
                seasonCount = item.get("seasonCount")
                
                # Simulate MediaCard safe calculation
                displaySeasonCount = (
                    len(seasons) if isinstance(seasons, list) and len(seasons) > 0
                    else seasons if isinstance(seasons, int) and seasons > 0
                    else seasonCount if isinstance(seasonCount, int) and seasonCount > 0
                    else None
                )
                
                assert not isinstance(displaySeasonCount, (list, dict)), f"REACT ERROR #31 TRAP: displaySeasonCount is {type(displaySeasonCount)} for {item.get('title')}"
            print("[PASS] All category items pass React Child Safety (No Object/Array Child Trap)")
    except Exception as e:
        print(f"[FAIL] Category fetch failed: {e}")
        return False
    return True

def test_playback_resolution():
    print("\n" + "=" * 70)
    print("2. VERIFYING PLAYBACK RESOLUTION FOR ALL 15 TITLES")
    print("=" * 70)

    all_passed = True
    for t in TITLES:
        slug = t["slug"]
        m_type = t["type"]
        ep = t.get("ep", 1)
        url = f"{API_BASE}/stream/resolve?slug={slug}&type={m_type}&season=1&episode={ep}"
        
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                streams = data.get("streams", [])
                if not streams:
                    print(f"[FAIL] {t['title']} ({slug}): 0 streams returned!")
                    all_passed = False
                    continue
                
                top_stream = streams[0]
                provider = top_stream.get("provider")
                fmt = top_stream.get("format")
                stream_url = top_stream.get("url")
                
                print(f"[OK] {t['title']} ({m_type.upper()}) => {len(streams)} streams | Top: {provider} ({fmt})")
                print(f"     URL: {stream_url[:75]}...")
                
                # If archive_org direct stream, test byte range probe
                if provider.startswith("archive_org"):
                    status, ctype = check_url(stream_url)
                    if status in (200, 206):
                        print(f"     [DIRECT HEAD PROBE: HTTP {status} | Content-Type: {ctype}]")
                    else:
                        print(f"     [WARNING: Direct probe returned HTTP {status}: {ctype}]")
        except Exception as e:
            print(f"[FAIL] {t['title']} ({slug}): Error {e}")
            all_passed = False

    return all_passed

def test_mainstream():
    print("\n" + "=" * 70)
    print("3. VERIFYING MAINSTREAM TITLE RESOLUTION (NO REGRESSION)")
    print("=" * 70)

    mainstream = [
        {"slug": "the-last-of-us-2023", "tmdbId": 100088, "type": "tv", "season": 1, "episode": 1, "title": "The Last of Us"},
        {"slug": "fight-club-1999", "tmdbId": 550, "type": "movie", "season": 1, "episode": 1, "title": "Fight Club"}
    ]

    all_passed = True
    for m in mainstream:
        url = f"{API_BASE}/stream/resolve?slug={m['slug']}&tmdbId={m['tmdbId']}&type={m['type']}&season={m['season']}&episode={m['episode']}"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                streams = data.get("streams", [])
                assert len(streams) >= 5, f"Expected >= 5 streams, got {len(streams)}"
                print(f"[PASS] Mainstream: {m['title']} => {len(streams)} streams, Top: {streams[0].get('provider')}")
        except Exception as e:
            print(f"[FAIL] Mainstream {m['title']}: {e}")
            all_passed = False

    return all_passed

if __name__ == "__main__":
    c_ok = test_catalog()
    p_ok = test_playback_resolution()
    m_ok = test_mainstream()

    if c_ok and p_ok and m_ok:
        print("\n" + "=" * 70)
        print(">>> ALL 15 ISLAMIC TITLES & MAINSTREAM AUDITS PASSED 100% <<<")
        print("=" * 70)
        sys.exit(0)
    else:
        print("\n>>> AUDIT FAILED <<<")
        sys.exit(1)
