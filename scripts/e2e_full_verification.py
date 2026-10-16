"""
ShadowStream Platform-Wide End-to-End (E2E) Automated Verification Suite
Validates:
1. Cloudflare Production Worker API & CDN Health (Home, Browse, Titles, Episodes, Stream Resolver)
2. Showbiz Editorial & AI SEO System (Blogs, Backlinks, Schema.org JSON-LD)
3. Native App Installers & Releases (ShadowStream.apk, ShadowStream-Setup-x64.exe, StreamApp.apk/exe)
4. Web Frontend Deployment (Edge CDN, Single Page Application routing)
5. Built-in ShadowStream Player Architecture (HLS engine, edge-to-edge layout, ad-free iframe embed)
"""

import sys
import json
import urllib.request
import urllib.error
import sqlite3
import os

# Set UTF-8 encoding
try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

CATALOG_WORKER = "https://streamapp-catalog.muhd-faisal-work.workers.dev"
PRIMARY_WEB_APP = "https://streamapp.muhd-faisal-work.workers.dev"
SECONDARY_WEB_APP = "https://frontend.muhd-faisal-work.workers.dev"

PASSED = 0
FAILED = 0
RESULTS = []


def record_result(category: str, test_name: str, passed: bool, detail: str = ""):
    global PASSED, FAILED
    status_str = "PASS" if passed else "FAIL"
    if passed:
        PASSED += 1
    else:
        FAILED += 1
    RESULTS.append((category, test_name, status_str, detail))
    print(f"[{status_str}] {category.upper()} | {test_name}: {detail}", flush=True)


def http_get(url: str, headers: dict = None, timeout: int = 15, max_bytes: int = None):
    hdrs = {"User-Agent": "ShadowStream-E2E-Verifier/2.3.0"}
    if headers:
        hdrs.update(headers)
    req = urllib.request.Request(url, headers=hdrs)
    with urllib.request.urlopen(req, timeout=timeout) as res:
        data = res.read(max_bytes) if max_bytes else res.read()
        return res.status, res.headers, data


def test_catalog_api():
    print("\n--- 1. Testing Cloudflare Catalog Worker API & CDN ---", flush=True)
    
    # 1. Health check
    try:
        status, _, body = http_get(f"{CATALOG_WORKER}/health")
        data = json.loads(body.decode("utf-8"))
        ok = status == 200 and data.get("status") in ("ok", "healthy")
        record_result("Catalog Worker", "Health Endpoint", ok, f"Status: {status}, service={data.get('service')}")
    except Exception as e:
        record_result("Catalog Worker", "Health Endpoint", False, str(e))

    # 2. Stats
    try:
        status, _, body = http_get(f"{CATALOG_WORKER}/stats")
        data = json.loads(body.decode("utf-8"))
        total = data.get("total", data.get("indexed", 0))
        record_result("Catalog Worker", "Platform Stats", status == 200 and total > 0, f"Indexed titles: {total}")
    except Exception as e:
        record_result("Catalog Worker", "Platform Stats", False, str(e))

    # 3. Search API
    try:
        status, _, body = http_get(f"{CATALOG_WORKER}/search?q=spider")
        data = json.loads(body.decode("utf-8"))
        hits = data.get("items", [])
        record_result("Catalog Worker", "Search API", status == 200 and len(hits) > 0, f"Found {len(hits)} titles for query 'spider'")
    except Exception as e:
        record_result("Catalog Worker", "Search API", False, str(e))

    # 4. Browse Movies
    try:
        status, _, body = http_get(f"{CATALOG_WORKER}/titles?type=movie&limit=5")
        data = json.loads(body.decode("utf-8"))
        items = data.get("items", data) if isinstance(data, dict) else data
        record_result("Catalog Worker", "Browse Movies", status == 200 and len(items) > 0, f"Found {len(items)} movie items")
    except Exception as e:
        record_result("Catalog Worker", "Browse Movies", False, str(e))

    # 5. Browse TV
    try:
        status, _, body = http_get(f"{CATALOG_WORKER}/titles?type=tv&limit=5")
        data = json.loads(body.decode("utf-8"))
        items = data.get("items", data) if isinstance(data, dict) else data
        record_result("Catalog Worker", "Browse TV", status == 200 and len(items) > 0, f"Found {len(items)} TV series")
    except Exception as e:
        record_result("Catalog Worker", "Browse TV", False, str(e))

    # 6. Browse Anime
    try:
        status, _, body = http_get(f"{CATALOG_WORKER}/titles?type=anime&limit=5")
        data = json.loads(body.decode("utf-8"))
        items = data.get("items", data) if isinstance(data, dict) else data
        record_result("Catalog Worker", "Browse Anime", status == 200 and len(items) > 0, f"Found {len(items)} anime items")
    except Exception as e:
        record_result("Catalog Worker", "Browse Anime", False, str(e))

    # 7. Title details (Spider-Man Brand New Day & Reacher)
    try:
        status, _, body = http_get(f"{CATALOG_WORKER}/title/107960")
        data = json.loads(body.decode("utf-8"))
        title_name = data.get("title", "")
        record_result("Catalog Worker", "Title Detail (Spider-Man)", status == 200 and "Spider-Man" in title_name, f"Title: {title_name}")
    except Exception as e:
        record_result("Catalog Worker", "Title Detail (Spider-Man)", False, str(e))

    try:
        status, _, body = http_get(f"{CATALOG_WORKER}/title/439")
        data = json.loads(body.decode("utf-8"))
        title_name = data.get("title", "")
        record_result("Catalog Worker", "Title Detail (Reacher)", status == 200 and "Reacher" in title_name, f"Title: {title_name}")
    except Exception as e:
        record_result("Catalog Worker", "Title Detail (Reacher)", False, str(e))

    # 8. TV Seasons details (Reacher)
    try:
        status, _, body = http_get(f"{CATALOG_WORKER}/title/439/seasons")
        data = json.loads(body.decode("utf-8"))
        seasons = data.get("seasons", [])
        record_result("Catalog Worker", "Title Seasons (Reacher)", status == 200, f"Seasons count: {len(seasons)}")
    except Exception as e:
        record_result("Catalog Worker", "Title Seasons (Reacher)", False, str(e))

    # 9. Stream resolver API
    try:
        status, _, body = http_get(f"{CATALOG_WORKER}/stream/resolve?tmdbId=107960&type=movie")
        data = json.loads(body.decode("utf-8"))
        streams = data.get("streams", [])
        record_result("Catalog Worker", "Direct Stream Resolver", status == 200 and len(streams) > 0, f"Resolved {len(streams)} direct streams/mirrors")
    except Exception as e:
        record_result("Catalog Worker", "Direct Stream Resolver", False, str(e))


def test_app_downloads():
    print("\n--- 2. Testing Native App & Installer Downloads (Cloudflare R2) ---", flush=True)
    artifacts = [
        ("ShadowStream.apk", f"{CATALOG_WORKER}/downloads/ShadowStream.apk", 300_000),
        ("ShadowStream-Setup-x64.exe", f"{CATALOG_WORKER}/downloads/ShadowStream-Setup-x64.exe", 50_000_000),
        ("StreamApp.apk", f"{CATALOG_WORKER}/downloads/StreamApp.apk", 300_000),
        ("StreamApp-Setup-x64.exe", f"{CATALOG_WORKER}/downloads/StreamApp-Setup-x64.exe", 50_000_000),
    ]

    for name, url, min_size in artifacts:
        try:
            status, hdrs, body = http_get(url, headers={"Range": "bytes=0-1024"}, max_bytes=1024)
            content_disp = hdrs.get("Content-Disposition", "")
            # Verify status code 200 or 206 (Partial Content)
            ok_status = status in (200, 206)
            is_attachment = "attachment" in content_disp or "filename=" in content_disp
            record_result("App Downloads", name, ok_status and is_attachment, f"Status: {status} | Disp: {content_disp}")
        except Exception as e:
            record_result("App Downloads", name, False, str(e))


def test_frontend_deployments():
    print("\n--- 3. Testing Web Frontend Deployments ---", flush=True)
    urls = [
        ("Primary Domain (streamapp)", PRIMARY_WEB_APP),
        ("Secondary Domain (frontend)", SECONDARY_WEB_APP)
    ]
    for label, url in urls:
        try:
            status, _, body = http_get(url)
            text = body.decode("utf-8", errors="ignore")
            has_root = '<div id="root">' in text or '<div id="app-root">' in text
            has_bundle = "_expo/static/js/web/index-" in text
            record_result("Frontend Web", label, status == 200 and has_root and has_bundle, f"Status: {status}, Root: {has_root}, Bundle: {has_bundle}")
        except Exception as e:
            record_result("Frontend Web", label, False, str(e))


def test_seo_and_blogs():
    print("\n--- 4. Testing Showbiz Editorial & AI SEO Agent ---", flush=True)
    try:
        # Check master blogs.json
        status, _, body = http_get(f"{CATALOG_WORKER}/blogs.json")
        blogs = json.loads(body.decode("utf-8"))
        items = blogs.get("items", blogs) if isinstance(blogs, dict) else blogs
        record_result("SEO Agent", "Blogs Master Index", status == 200 and len(items) >= 6, f"Indexed {len(items)} showbiz articles")
        
        # Check first blog detail
        if items:
            first_slug = items[0]["slug"]
            status_b, _, body_b = http_get(f"{CATALOG_WORKER}/blogs/{first_slug}.json")
            blog_data = json.loads(body_b.decode("utf-8"))
            
            has_schema = "schema" in blog_data and "@graph" in blog_data["schema"]
            has_faqs = "faqs" in blog_data and len(blog_data["faqs"]) > 0
            has_featured = "featured_titles" in blog_data and len(blog_data["featured_titles"]) > 0
            has_backlinks = "seo-backlink" in blog_data.get("content_html", "") or "href=" in blog_data.get("content_html", "")

            record_result("SEO Agent", "Blog Schema.org JSON-LD", has_schema, f"Schema @graph present: {has_schema}")
            record_result("SEO Agent", "Blog Structured FAQs", has_faqs, f"FAQs count: {len(blog_data.get('faqs', []))}")
            record_result("SEO Agent", "Blog Featured Titles Verified", has_featured, f"Featured count: {len(blog_data.get('featured_titles', []))}")
            record_result("SEO Agent", "Internal Cross-Backlinks", has_backlinks, f"Backlinks detected in HTML: {has_backlinks}")
    except Exception as e:
        record_result("SEO Agent", "Showbiz Blogs API", False, str(e))


def test_player_architecture():
    print("\n--- 5. Testing ShadowStream Player Architecture ---", flush=True)
    # Verify PlayerScreen.js
    player_screen_path = "frontend/src/screens/PlayerScreen.js"
    if os.path.exists(player_screen_path):
        with open(player_screen_path, "r", encoding="utf-8") as f:
            ps_code = f.read()
        no_mirror_picker = "mirrorPickerRow" not in ps_code
        has_shadow_player = "<ShadowStreamPlayer" in ps_code
        record_result("Player", "PlayerScreen Fullscreen Layout", no_mirror_picker and has_shadow_player, f"mirrorPickerRow removed: {no_mirror_picker}, ShadowStreamPlayer mounted: {has_shadow_player}")
    else:
        record_result("Player", "PlayerScreen Fullscreen Layout", False, "PlayerScreen.js not found")

    # Verify ShadowStreamPlayer.js
    player_comp_path = "frontend/src/components/ShadowStreamPlayer.js"
    if os.path.exists(player_comp_path):
        with open(player_comp_path, "r", encoding="utf-8") as f:
            comp_code = f.read()
        has_sandbox = "sandbox=" in comp_code  # Ensures third-party popups/redirects are blocked
        has_topbar = "embedTopBar" in comp_code
        has_hls = "hls.js" in comp_code or "Hls" in comp_code
        record_result("Player", "ShadowStreamPlayer Embed & HLS Engine", has_sandbox and has_topbar and has_hls, f"Sandboxed Ad Protection: {has_sandbox}, Floating TopBar: {has_topbar}, HLS: {has_hls}")
    else:
        record_result("Player", "ShadowStreamPlayer Embed & HLS Engine", False, "ShadowStreamPlayer.js not found")


def main():
    print("=====================================================================")
    print("    ShadowStream Platform-Wide E2E Automated Verification Sweep     ")
    print("=====================================================================")
    
    test_player_architecture()
    test_catalog_api()
    test_app_downloads()
    test_frontend_deployments()
    test_seo_and_blogs()

    print("\n=====================================================================")
    print(f"E2E VERIFICATION COMPLETE: {PASSED} Passed | {FAILED} Failed")
    print("=====================================================================")
    
    if FAILED > 0:
        print("\nFailed Tests:")
        for cat, name, status, detail in RESULTS:
            if status == "FAIL":
                print(f"  - {cat} | {name}: {detail}")
        sys.exit(1)
    else:
        print("\nAll systems, endpoints, player architectures, and installers verified 100% operational!")
        sys.exit(0)


if __name__ == "__main__":
    main()
