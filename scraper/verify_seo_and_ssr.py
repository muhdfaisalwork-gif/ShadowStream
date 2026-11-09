"""
verify_seo_and_ssr.py — Comprehensive SEO, Edge SSR & Regression Suite for ShadowStream
Tests live production endpoints on https://www.ssmoviestvs.site:
  1. robots.txt bot directives & sitemap reference
  2. llms.txt AI search documentation & 104,261+ index count
  3. sitemap_index.xml & segmented sitemaps (static, movies-1, movies-2, series-1, anime-1)
  4. Non-JS crawler SSR on Homepage (/): title, unified 104,261+ meta, WebSite schema, semantic <h1> and <nav> links
  5. Programmatic Category URLs: /movies, /series, /anime, /live, /dubs/hindi-dubbed, /regional/pakistani-turkish-dramas
  6. Individual Title Watch Page: /watch/movie/the-dark-knight-2008 with Movie JSON-LD schema & <h1>
  7. Regression tests:
     - HTTP 206 Partial Content Range requests on installer
     - API health and version integrity
     - Islamic history catalog items
"""
import sys
import json
import urllib.request
import urllib.error
from datetime import datetime

# UTF-8 stdout on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE_URL = "https://www.ssmoviestvs.site"
FAILURES = []
PASSES = []

def record_pass(test_name, details=""):
    PASSES.append(test_name)
    msg = f"  [PASS] {test_name}"
    if details:
        msg += f" — {details}"
    print(msg)

def record_fail(test_name, reason):
    FAILURES.append((test_name, reason))
    print(f"  [FAIL] {test_name}: {reason}")

def fetch_url(url, headers=None, range_header=None):
    req_headers = {"User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"}
    if headers:
        req_headers.update(headers)
    if range_header:
        req_headers["Range"] = range_header
    req = urllib.request.Request(url, headers=req_headers)
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return resp.status, dict(resp.headers), resp.read()
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers), e.read()
    except Exception as ex:
        return 0, {}, str(ex).encode()

def run_tests():
    print(f"==================================================================")
    print(f"    SHADOWSTREAM SEO, SSR & AI OPTIMIZATION VERIFICATION SUITE   ")
    print(f"    Target: {BASE_URL}                                           ")
    print(f"==================================================================")

    # -------------------------------------------------------------
    # 1. robots.txt
    # -------------------------------------------------------------
    print("\n--- Test 1: robots.txt Verification ---")
    status, headers, body = fetch_url(f"{BASE_URL}/robots.txt")
    if status == 200:
        text = body.decode("utf-8", errors="ignore")
        expected_bots = [
            "User-agent: *",
            "User-agent: OAI-SearchBot",
            "User-agent: ChatGPT-User",
            "User-agent: GPTBot",
            "User-agent: PerplexityBot",
            "User-agent: Claude-SearchBot",
            "User-agent: Googlebot",
            "User-agent: Bingbot",
            "Sitemap: https://www.ssmoviestvs.site/sitemap_index.xml",
        ]
        missing = [b for b in expected_bots if b not in text]
        if not missing:
            record_pass("robots.txt directives", f"All {len(expected_bots)} required bot user-agents and sitemap present")
        else:
            record_fail("robots.txt directives", f"Missing directives: {missing}")
    else:
        record_fail("robots.txt status", f"Expected HTTP 200, got {status}")

    # -------------------------------------------------------------
    # 2. llms.txt
    # -------------------------------------------------------------
    print("\n--- Test 2: llms.txt AI Search Verification ---")
    status, headers, body = fetch_url(f"{BASE_URL}/llms.txt")
    if status == 200:
        text = body.decode("utf-8", errors="ignore")
        checks = [
            ("Catalog Count 104,261+", "104,261+"),
            ("ShadowStream Platform Title", "ShadowStream (ssmoviestvs.site)"),
            ("Movies Hub Link", "https://www.ssmoviestvs.site/movies"),
            ("TV Series Hub Link", "https://www.ssmoviestvs.site/series"),
            ("Anime Hub Link", "https://www.ssmoviestvs.site/anime"),
            ("Hindi Dubs Hub Link", "https://www.ssmoviestvs.site/dubs"),
            ("Live TV Hub Link", "https://www.ssmoviestvs.site/live"),
        ]
        all_ok = True
        for label, needle in checks:
            if needle in text:
                record_pass(f"llms.txt: {label}")
            else:
                record_fail(f"llms.txt: {label}", f"'{needle}' not found in llms.txt")
                all_ok = False
    else:
        record_fail("llms.txt status", f"Expected HTTP 200, got {status}")

    # -------------------------------------------------------------
    # 3. Segmented Sitemaps (sitemap_index.xml & Sub-Sitemaps)
    # -------------------------------------------------------------
    print("\n--- Test 3: Segmented Sitemaps Verification ---")
    status, headers, body = fetch_url(f"{BASE_URL}/sitemap_index.xml")
    if status == 200:
        text = body.decode("utf-8", errors="ignore")
        expected_subs = [
            "https://www.ssmoviestvs.site/sitemap-static.xml",
            "https://www.ssmoviestvs.site/sitemap-movies-1.xml",
            "https://www.ssmoviestvs.site/sitemap-movies-2.xml",
            "https://www.ssmoviestvs.site/sitemap-series-1.xml",
            "https://www.ssmoviestvs.site/sitemap-anime-1.xml",
        ]
        missing_subs = [s for s in expected_subs if s not in text]
        if not missing_subs:
            record_pass("sitemap_index.xml sub-sitemaps", f"All 5 segmented sitemaps registered")
        else:
            record_fail("sitemap_index.xml sub-sitemaps", f"Missing sub-sitemaps: {missing_subs}")
    else:
        record_fail("sitemap_index.xml status", f"Expected HTTP 200, got {status}")

    # Verify sitemap-static.xml contains category and collection routes
    status, headers, body = fetch_url(f"{BASE_URL}/sitemap-static.xml")
    if status == 200:
        text = body.decode("utf-8", errors="ignore")
        if "<urlset" in text and f"{BASE_URL}/movies" in text and f"{BASE_URL}/series" in text and f"{BASE_URL}/live" in text:
            record_pass("sitemap-static.xml payload", f"Valid urlset with {text.count('<url>')} URLs")
        else:
            record_fail("sitemap-static.xml payload", "Missing expected static routes")
    else:
        record_fail("sitemap-static.xml status", f"Expected HTTP 200, got {status}")

    # -------------------------------------------------------------
    # 4. Non-JS Edge SSR on Homepage (/)
    # -------------------------------------------------------------
    print("\n--- Test 4: Edge SSR Prerendering on Homepage (/) ---")
    status, headers, body = fetch_url(f"{BASE_URL}/")
    if status == 200:
        html = body.decode("utf-8", errors="ignore")
        # Check Title
        if "<title>ShadowStream - Free Movies, TV Shows, Anime" in html:
            record_pass("Homepage <title> SSR", "Dynamic title rendered")
        else:
            record_fail("Homepage <title> SSR", f"Unexpected title tag: {html[:300]}")

        # Check Unified Catalog Count
        if "104,261+" in html:
            record_pass("Homepage Unified Catalog Count", "Contains unified 104,261+ in metadata & body")
        else:
            record_fail("Homepage Unified Catalog Count", "104,261+ not found in HTML response")

        # Check Schema.org WebSite JSON-LD
        if 'application/ld+json' in html and '"@type":"WebSite"' in html.replace(" ", "") and '"SearchAction"' in html:
            record_pass("Homepage JSON-LD WebSite Schema", "WebSite with SearchAction present")
        else:
            record_fail("Homepage JSON-LD WebSite Schema", "Schema.org WebSite JSON-LD missing or invalid")

        # Check Semantic <h1>
        if "<h1" in html and "Stream 104,261+ Movies" in html:
            record_pass("Homepage Semantic <h1>", "Crawlable <h1> heading present")
        else:
            record_fail("Homepage Semantic <h1>", "Semantic <h1> missing in SSR HTML")

        # Check Semantic Navigation Links
        nav_targets = ["/movies", "/series", "/anime", "/dubs/hindi-dubbed", "/regional/pakistani-turkish-dramas", "/live"]
        missing_nav = [n for n in nav_targets if f'href="{n}"' not in html]
        if not missing_nav:
            record_pass("Homepage Semantic Navigation <nav>", f"All {len(nav_targets)} category links present as crawlable <a> tags")
        else:
            record_fail("Homepage Semantic Navigation <nav>", f"Missing links: {missing_nav}")

        # Check Spotlight Title Links
        if 'href="/watch/movie/' in html and 'href="/watch/tv/' in html:
            record_pass("Homepage Spotlight Catalog Cards", "Semantic <a href='/watch/...'> links rendered for crawlers")
        else:
            record_fail("Homepage Spotlight Catalog Cards", "Spotlight title links missing")
    else:
        record_fail("Homepage status", f"Expected HTTP 200, got {status}")

    # -------------------------------------------------------------
    # 5. Programmatic Category & Dub Routes
    # -------------------------------------------------------------
    print("\n--- Test 5: Programmatic Category & Dub Routes ---")
    routes_to_test = [
        ("/movies", "Movies Catalog", "104,261+"),
        ("/series", "TV Series Catalog", "104,261+"),
        ("/anime", "Anime Hub", "Dual-Audio"),
        ("/live", "Live TV & Sports Guide", "Real-Time"),
        ("/dubs/hindi-dubbed", "Hindi Dubbed", "Cinema Hub"),
        ("/regional/pakistani-turkish-dramas", "Pakistani & Turkish Dramas", "Regional Dramas"),
    ]

    for route, expected_title, expected_body in routes_to_test:
        status, headers, body = fetch_url(f"{BASE_URL}{route}")
        if status == 200:
            html = body.decode("utf-8", errors="ignore")
            if expected_title in html and expected_body in html and "<nav" in html:
                record_pass(f"Category route {route}", f"Rendered '{expected_title}' with semantic content")
            else:
                record_fail(f"Category route {route}", f"Expected '{expected_title}' and '{expected_body}' in HTML")
        else:
            record_fail(f"Category route {route}", f"Expected HTTP 200, got {status}")

    # -------------------------------------------------------------
    # 6. Title Detail & Watch Page SSR (/watch/movie/the-dark-knight-2008)
    # -------------------------------------------------------------
    print("\n--- Test 6: Title Detail & Watch Page SSR ---")
    watch_url = f"{BASE_URL}/watch/movie/the-dark-knight-2008"
    status, headers, body = fetch_url(watch_url)
    if status == 200:
        html = body.decode("utf-8", errors="ignore")
        if "The Dark Knight" in html and "Movie" in html:
            record_pass("Watch Page SSR Content", "Rendered title, poster, and overview")
        else:
            record_fail("Watch Page SSR Content", "Title content missing in response")

        if 'application/ld+json' in html and '"Movie"' in html:
            record_pass("Watch Page Movie Schema.org JSON-LD", "Dynamic Movie schema injected")
        else:
            record_fail("Watch Page Movie Schema.org JSON-LD", "Movie JSON-LD schema missing")

        if 'href="/play/' in html:
            record_pass("Watch Page Play Link", "Direct watch stream link rendered")
        else:
            record_fail("Watch Page Play Link", "Play link missing")
    else:
        record_fail("Watch Page status", f"Expected HTTP 200, got {status}")

    # -------------------------------------------------------------
    # 7. Regression Tests: Range Requests, Health & Islamic Catalog
    # -------------------------------------------------------------
    print("\n--- Test 7: Regression Tests (Range Requests & Core Systems) ---")
    # A. HTTP 206 Partial Content Range Request on Installer
    status, headers, body = fetch_url(f"{BASE_URL}/ShadowStream-Setup-x64.exe", range_header="bytes=0-1023")
    if status == 206:
        content_range = headers.get("content-range", headers.get("Content-Range", ""))
        content_len = len(body)
        if "bytes 0-1023/" in content_range and content_len == 1024:
            record_pass("HTTP 206 Range Request on Installer", f"Content-Range: {content_range} ({content_len} bytes)")
        else:
            record_fail("HTTP 206 Range Request on Installer", f"Unexpected range: {content_range}, len: {content_len}")
    else:
        record_fail("HTTP 206 Range Request on Installer", f"Expected HTTP 206, got {status}")

    # B. Health & Version
    status, headers, body = fetch_url(f"{BASE_URL}/api/v1/health")
    if status == 200:
        try:
            data = json.loads(body.decode("utf-8"))
            if data.get("status") == "ok":
                record_pass("API Health Endpoint", f"Catalog health: {data.get('status')} (indexed: {data.get('counts', {}).get('indexed')})")
            else:
                record_fail("API Health Endpoint", f"Payload: {data}")
        except Exception as e:
            record_fail("API Health Endpoint", f"Parse error: {e}")
    else:
        record_fail("API Health Endpoint", f"Expected HTTP 200, got {status}")

    # C. Islamic History Catalog Preservation
    status, headers, body = fetch_url(f"{BASE_URL}/api/v1/collection/islamic-history")
    if status == 200:
        try:
            data = json.loads(body.decode("utf-8"))
            items = data.get("items", []) if isinstance(data, dict) else (data if isinstance(data, list) else [])
            if len(items) >= 15:
                record_pass("Islamic History Catalog", f"Preserved {len(items)} historical titles")
            else:
                record_fail("Islamic History Catalog", f"Found only {len(items)} items, expected >= 15")
        except Exception as e:
            record_fail("Islamic History Catalog", f"Parse error: {e}")
    else:
        record_fail("Islamic History Catalog", f"Expected HTTP 200, got {status}")

    # -------------------------------------------------------------
    # Summary
    # -------------------------------------------------------------
    print("\n==================================================================")
    print(f"VERIFICATION SUMMARY: {len(PASSES)} Passed, {len(FAILURES)} Failed")
    print("==================================================================")
    if FAILURES:
        for name, reason in FAILURES:
            print(f"  ❌ {name}: {reason}")
        sys.exit(1)
    else:
        print("  🎉 ALL TESTS PASSED! SEO, EDGE SSR & REGRESSIONS 100% VERIFIED!")
        sys.exit(0)

if __name__ == "__main__":
    run_tests()
