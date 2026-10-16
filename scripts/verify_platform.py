"""
ShadowStream platform verification.

This suite exists to be able to FAIL. The previous version
(scripts/e2e_full_verification.py) reported 23/23 green while:

  * the app had no PWA at all — its /manifest.json and /sw.js "passed" only
    because the SPA catch-all served index.html with Content-Type: text/html
  * /title/{id}/seasons returned [] for every TV show, and the suite recorded
    PASS anyway because it only checked for HTTP 200
  * the player test grepped the source file for the string "hls.js"
  * installer tests declared a min_size and never asserted it
  * the stream-resolver test used the internal catalogue id (439) where the
    real TMDB id (116328) was required, so all five "resolved" streams were
    dead URLs

Rules encoded below, per the plan:
  1. A static-asset test asserts Content-Type as well as status. A catch-all
     returning text/html must never count as a passing asset.
  2. A declared expected size is asserted. Unused parameters are defects.
  3. A test whose detail line contradicts its PASS status is a failure.
  4. No test asserts on the content of a source file.
  5. Fixtures use real TMDB ids, and resolve results are checked for that.

Usage:
    python scripts/verify_platform.py
    python scripts/verify_platform.py --offline     # skip network tests
    python scripts/verify_platform.py --only pwa
"""

import argparse
import json
import os
import re
import socket
import ssl
import sys
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor

try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

CATALOG = "https://streamapp-catalog.muhd-faisal-work.workers.dev"
WEB = "https://streamapp.muhd-faisal-work.workers.dev"
RELEASES = f"{CATALOG}/downloads"

# Real TMDB ids, for titles that actually HAVE season data in the catalogue.
#
# These were originally Breaking Bad and Squid Game, which turned out not to be
# in the catalogue at all — so the assertion "0 seasons" was measuring a missing
# title rather than a broken endpoint. The fixtures now come from titles the DB
# genuinely carries seasons for.
TV_FIXTURES = [
    (1396, "sanremo-music-festival-1951", "Sanremo Music Festival"),
    (14368, "panorama-1953", "Panorama"),
    (14350, "coronation-street-1960", "Coronation Street"),
]

# Providers that must be reachable. embed.su and multiembed.mov were removed
# from rotation on 2026-09-28 (DNS NXDOMAIN / host unreachable).
EXPECTED_MIRROR_PROVIDERS = {"vidlink", "vidsrc", "2embed"}
FORBIDDEN_MIRROR_PROVIDERS = {"embedsu", "superembed"}

RESULTS = []
PASSED = 0
FAILED = 0
SKIPPED = 0


def record(group, name, ok, detail="", skipped=False):
    global PASSED, FAILED, SKIPPED
    if skipped:
        SKIPPED += 1
        status = "SKIP"
    elif ok:
        PASSED += 1
        status = "PASS"
    else:
        FAILED += 1
        status = "FAIL"
    RESULTS.append((group, name, status, detail))
    print(f"[{status}] {group} | {name}: {detail}", flush=True)


def http(url, headers=None, timeout=20, method="GET", read=True):
    hdrs = {"User-Agent": "ShadowStream-Verify/2.4.0"}
    if headers:
        hdrs.update(headers)
    req = urllib.request.Request(url, headers=hdrs, method=method)
    with urllib.request.urlopen(req, timeout=timeout) as res:
        body = res.read() if read else b""
        return res.status, dict(res.headers), body


# ---------------------------------------------------------------------------
# 1. Static assets — Content-Type is part of the assertion (rule 1)
# ---------------------------------------------------------------------------

def test_static_assets():
    g = "Static Assets"
    expected = [
        ("/manifest.webmanifest", "manifest"),
        ("/sw.js", "javascript"),
        ("/icons/icon-192.png", "image/png"),
        ("/icons/icon-512.png", "image/png"),
        ("/apple-touch-icon.png", "image/png"),
        ("/favicon.ico", None),
    ]
    for path, kind in expected:
        try:
            status, hdrs, body = http(WEB + path)
            ctype = (hdrs.get("Content-Type") or "").lower()
            if kind is None:
                ok = status == 200 and "image" in ctype
            else:
                ok = status == 200 and kind in ctype
            record(
                g,
                f"{path} is a real {kind or 'image'} asset",
                ok,
                f"status={status} content-type={ctype or '(none)'} bytes={len(body)}",
            )
        except urllib.error.HTTPError as e:
            record(g, f"{path} is a real {kind or 'image'} asset", False, f"HTTP {e.code}")
        except Exception as e:
            record(g, f"{path} is a real {kind or 'image'} asset", False, str(e)[:90])


def test_manifest_contract():
    g = "PWA"
    try:
        status, hdrs, body = http(WEB + "/manifest.webmanifest")
        ctype = (hdrs.get("Content-Type") or "").lower()
        if "manifest" not in ctype:
            record(g, "manifest served as a real manifest", False,
                   f"Content-Type is {ctype!r} — this is the SPA catch-all, not a file")
            return
        m = json.loads(body.decode("utf-8"))
        record(g, "manifest served as a real manifest", True, f"Content-Type={ctype}")
    except Exception as e:
        record(g, "manifest served as a real manifest", False, str(e)[:90])
        return

    required = ["name", "short_name", "start_url", "scope", "display", "icons"]
    missing = [k for k in required if k not in m]
    record(g, "manifest has the required installability keys", not missing,
           f"missing={missing}" if missing else f"display={m.get('display')} scope={m.get('scope')}")

    record(g, "manifest display is standalone", m.get("display") == "standalone",
           f"display={m.get('display')!r}")

    sizes = {i.get("sizes") for i in m.get("icons", []) if isinstance(i, dict)}
    has_192 = any(s and "192" in s for s in sizes)
    has_512 = any(s and "512" in s for s in sizes)
    has_maskable = any(isinstance(i, dict) and "maskable" in (i.get("purpose") or "") for i in m.get("icons", []))
    record(g, "manifest ships 192 + 512 + maskable icons", has_192 and has_512 and has_maskable,
           f"sizes={sorted(x for x in sizes if x)} maskable={has_maskable}")


def test_service_worker_reachable():
    g = "PWA"
    try:
        status, hdrs, body = http(WEB + "/sw.js")
        text = body.decode("utf-8", errors="replace")
        is_js = "javascript" in (hdrs.get("Content-Type") or "").lower()
        # A real SW installs/activates/fetch handlers; the catch-all does not.
        looks_like_sw = "addEventListener" in text and "'fetch'" in text
        record(g, "sw.js is a real service worker", is_js and looks_like_sw,
               f"content-type={hdrs.get('Content-Type')} handlers={'yes' if looks_like_sw else 'no'}")
    except Exception as e:
        record(g, "sw.js is a real service worker", False, str(e)[:90])


# ---------------------------------------------------------------------------
# 2. Seasons / episodes — the data that used to be missing entirely
# ---------------------------------------------------------------------------

def test_season_data():
    g = "Seasons"
    for tmdb_id, slug, label in TV_FIXTURES:
        try:
            status, _, body = http(f"{CATALOG}/title/{slug}/seasons")
            data = json.loads(body.decode("utf-8"))
            seasons = data.get("seasons") or []
            ok = status == 200 and len(seasons) > 0
            detail = f"seasons={len(seasons)}"
            if seasons:
                first = seasons[0]
                eps = first.get("episodes") or []
                detail += f" S{first.get('season_number')} episodes={len(eps)}"
                ok = ok and len(eps) > 0
            record(g, f"{label} ({slug}) has seasons and episodes", ok, detail)
        except Exception as e:
            record(g, f"{label} ({slug}) has seasons and episodes", False, str(e)[:90])


def test_seasons_inventory():
    """The seasons dataset lives in R2, not behind a Worker route, so this
    proves it by asking for a title we know carries seasons and asserting the
    response is non-empty. A 404 here used to be reported as
    "seasons have not been exported" when the key simply is not a route."""
    g = "Seasons"
    slug, label = TV_FIXTURES[0][1], TV_FIXTURES[0][2]
    try:
        status, _, body = http(f"{CATALOG}/title/{slug}/seasons")
        data = json.loads(body.decode("utf-8"))
        seasons = data.get("seasons") or []
        record(g, "seasons data is served for a known episodic title",
               status == 200 and len(seasons) > 0,
               f"{label}: {len(seasons)} seasons returned")
    except Exception as e:
        record(g, "seasons data is served for a known episodic title", False, str(e)[:90])


def test_seasons_are_scoped_to_one_title():
    """A shard holds ~200 titles' seasons. If the Worker returns the whole
    shard, Reacher comes back with 184 seasons instead of its own 1."""
    g = "Seasons"
    try:
        _, _, body = http(f"{CATALOG}/title/reacher-2022/seasons")
        seasons = json.loads(body.decode("utf-8")).get("seasons") or []
        record(g, "seasons are scoped to the requested title", len(seasons) <= 5,
               f"reacher-2022 returned {len(seasons)} seasons (expected its own, not a whole shard)")
    except Exception as e:
        record(g, "seasons are scoped to the requested title", False, str(e)[:90])


# ---------------------------------------------------------------------------
# 3. Resolver contract
# ---------------------------------------------------------------------------

def test_resolve_contract():
    g = "Resolver"
    for tmdb_id, slug, label in TV_FIXTURES[:1]:
        try:
            status, _, body = http(
                f"{CATALOG}/resolve?tmdbId={tmdb_id}&type=tv&season=1&episode=1"
            )
            data = json.loads(body.decode("utf-8"))
            direct = data.get("direct")
            mirror = data.get("mirror")
            # Contract: /resolve must ALWAYS yield something playable.
            ok = bool(direct or mirror)
            record(g, "/resolve always returns something playable", ok,
                   f"direct={bool(direct)} mirror={bool(mirror)} mode={data.get('resolveMode')}")

            # Rule 5: a resolve URL must carry the real TMDB id, not the
            # internal catalogue id.
            urls = [mirror] if mirror else []
            if direct:
                urls.append(direct.get("url"))
            if not urls:
                urls = [m.get("mirror") or "" for m in data.get("mirrors", [])]
            bad = [u for u in urls if u and str(tmdb_id) not in u]
            record(g, f"{label} resolve URLs use the real TMDB id", not bad,
                   f"checked={len(urls)} wrong-id={len(bad)}" + (f" e.g. {bad[0][:90]}" if bad else ""))
        except Exception as e:
            record(g, "/resolve always returns something playable", False, str(e)[:90])


def test_provider_health():
    g = "Resolver"
    try:
        status, _, body = http(f"{CATALOG}/health/providers")
        data = json.loads(body.decode("utf-8"))
        providers = data.get("providers", [])
        disabled = [p["slug"] for p in providers if p.get("resolveMode") == "disabled"]
        record(g, "provider health endpoint responds", status == 200 and len(providers) > 0,
               f"{len(providers)} providers, {len(data.get('directlyResolvable', []))} directly resolvable")
        record(g, "dead providers are marked disabled", "embedsu" in disabled,
               f"disabled={disabled}")
    except Exception as e:
        record(g, "provider health endpoint responds", False, str(e)[:90])


def test_default_mirrors_healthy():
    """Every mirror the user is offered must actually resolve. embed.su did not."""
    g = "Mirrors"
    mirrors = [
        ("vidlink", "https://vidlink.pro/tv/116328/1/1"),
        ("vidsrc", "https://vidsrc.to/embed/tv/116328/1/1"),
        ("2embed", "https://www.2embed.cc/embed/tmdb/tv?id=116328&s=1&e=1"),
    ]
    for name, url in mirrors:
        try:
            socket.create_connection((urllib.parse.urlsplit(url).hostname, 443), timeout=8).close()
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=15) as res:
                ok = res.status == 200
                record(g, f"mirror {name} is reachable", ok, f"HTTP {res.status}")
        except socket.gaierror as e:
            record(g, f"mirror {name} is reachable", False, f"DNS: {e}")
        except Exception as e:
            record(g, f"mirror {name} is reachable", False, str(e)[:90])

    # The two that must no longer be offered. embed.su is hard-disabled in the
    # registry. multiembed was disabled on 2026-09-28 when it was unreachable,
    # but its DNS has since come back — so what matters is that it is absent
    # from the offered mirror list, not that the host is down.
    for name, host in (("embedsu", "embed.su"), ("multiembed", "multiembed.mov")):
        try:
            status, _, body = http(f"{CATALOG}/title/reacher-2022/availability")
            sources = {a.get("source") for a in json.loads(body.decode("utf-8")).get("availability", [])}
            record(g, f"{name} is not offered as a mirror", name not in sources,
                   f"{host} DNS={host} but offered={name in sources} (must be False)")
        except Exception as e:
            record(g, f"{name} is not offered as a mirror", False, str(e)[:90])


def test_availability_mirrors():
    g = "Mirrors"
    try:
        status, _, body = http(f"{CATALOG}/title/reacher-2022/availability?season=1&episode=1")
        data = json.loads(body.decode("utf-8"))
        avail = data.get("availability", [])
        providers = {a.get("source") for a in avail}
        record(g, "availability returns mirrors", status == 200 and len(avail) > 0,
               f"{len(avail)} mirrors: {sorted(p for p in providers if p)}")
        bad = providers & FORBIDDEN_MIRROR_PROVIDERS
        record(g, "dead providers are absent from availability", not bad, f"found={sorted(bad)}")
        expected_present = EXPECTED_MIRROR_PROVIDERS & providers
        record(g, "expected providers are present", len(expected_present) > 0,
               f"present={sorted(expected_present)}")
    except Exception as e:
        record(g, "availability returns mirrors", False, str(e)[:90])


# ---------------------------------------------------------------------------
# 4. Catalog sanity + no mixed content
# ---------------------------------------------------------------------------

def test_catalog_api():
    g = "Catalog"
    checks = [
        ("/health", lambda d: d.get("status") in ("ok", "healthy")),
        ("/stats", lambda d: (d.get("indexed") or d.get("total") or 0) > 1000),
        ("/search?q=spider", lambda d: len(d.get("items", [])) > 0),
        ("/titles?type=movie&limit=5", lambda d: len(_items(d)) > 0),
        ("/titles?type=tv&limit=5", lambda d: len(_items(d)) > 0),
    ]
    for path, ok_fn in checks:
        try:
            status, _, body = http(CATALOG + path)
            data = json.loads(body.decode("utf-8"))
            ok = status == 200 and ok_fn(data)
            record(g, path, ok, f"HTTP {status}")
        except Exception as e:
            record(g, path, False, str(e)[:90])


def _items(d):
    if isinstance(d, dict):
        return d.get("items", d if isinstance(d.get("items"), list) else [])
    return d if isinstance(d, list) else []


def test_no_mixed_content():
    """The catalog used to serve http:// TMDB images, producing 125 console warnings."""
    g = "Catalog"
    try:
        status, _, body = http(f"{CATALOG}/title/reacher-2022")
        text = body.decode("utf-8", errors="replace")
        insecure = re.findall(r'http://image\.tmdb\.org[^"]*', text)
        record(g, "title payload uses https images", status == 200 and not insecure,
               f"insecure_image_urls={len(insecure)}" + (f" e.g. {insecure[0][:70]}" if insecure else ""))
    except Exception as e:
        record(g, "title payload uses https images", False, str(e)[:90])


# ---------------------------------------------------------------------------
# 5. Releases — real size + real archive + real signature
# ---------------------------------------------------------------------------

APK_FLOOR_BYTES = 1_000_000
EXE_FLOOR_BYTES = 50_000_000


def test_releases():
    g = "Releases"
    artifacts = [
        ("ShadowStream.apk", APK_FLOOR_BYTES),
        ("StreamApp.apk", APK_FLOOR_BYTES),
        ("ShadowStream-Setup-x64.exe", EXE_FLOOR_BYTES),
    ]
    for name, floor in artifacts:
        url = f"{RELEASES}/{name}"
        try:
            # Rule 2: the declared floor is actually asserted.
            req = urllib.request.Request(url, headers={"User-Agent": "ShadowStream-Verify/2.4.0"})
            with urllib.request.urlopen(req, timeout=60) as res:
                ctype = (res.headers.get("Content-Type") or "").lower()
                total = int(res.headers.get("Content-Length") or 0)
                body = res.read()
            size_ok = len(body) >= floor
            ctype_ok = "text/html" not in ctype
            record(g, f"{name} downloads at real size", size_ok and ctype_ok,
                   f"bytes={len(body)} floor={floor} content-type={ctype}")
        except Exception as e:
            record(g, f"{name} downloads at real size", False, str(e)[:90])


def test_apk_is_valid_archive():
    """A 400 KB WebView shell that cannot be installed is not a passing release."""
    g = "Releases"
    try:
        import io
        import zipfile

        status, _, body = http(f"{RELEASES}/ShadowStream.apk", timeout=90)
        try:
            zf = zipfile.ZipFile(io.BytesIO(body))
            names = zf.namelist()
        except zipfile.BadZipFile as e:
            record(g, "APK is a valid archive", False, f"BadZipFile: {e}")
            return
        has_manifest = "AndroidManifest.xml" in names
        has_dex = any(n.endswith(".dex") for n in names)
        has_sig = "META-INF" in " ".join(names)
        record(g, "APK is a valid archive", has_manifest and has_dex,
               f"entries={len(names)} manifest={has_manifest} dex={has_dex} v1sig={has_sig}")
        record(g, "APK is above the installable floor", len(body) >= APK_FLOOR_BYTES,
               f"bytes={len(body)} (a thin WebView shell is well under this)")
    except Exception as e:
        record(g, "APK is a valid archive", False, str(e)[:90])


def test_apk_target_sdk():
    """Play has required API 36 for new apps and updates since 31 Aug 2026."""
    g = "Releases"
    import io
    import zipfile

    try:
        _, _, body = http(f"{RELEASES}/ShadowStream.apk", timeout=90)
        zf = zipfile.ZipFile(io.BytesIO(body))
        names = zf.namelist()
        if "META-INF" in " ".join(names):
            record(g, "APK targetSdkVersion is 36", False,
                   "cannot read targetSdk without aapt2; run the local APK inspector instead")
            return
        record(g, "APK targetSdkVersion is 36", False, "manifest unreadable without aapt2")
    except Exception as e:
        record(g, "APK targetSdkVersion is 36", False, str(e)[:90])


def test_no_duplicate_release_names():
    g = "Releases"
    try:
        _, _, a = http(f"{RELEASES}/ShadowStream.apk", timeout=90)
        _, _, b = http(f"{RELEASES}/StreamApp.apk", timeout=90)
        import hashlib
        ha = hashlib.sha256(a).hexdigest()
        hb = hashlib.sha256(b).hexdigest()
        record(g, "released artifacts are distinct files", ha != hb,
               "ShadowStream.apk and StreamApp.apk are byte-identical duplicates"
               if ha == hb else "distinct")
    except Exception as e:
        record(g, "released artifacts are distinct files", False, str(e)[:90])


# ---------------------------------------------------------------------------
# 6. Web app actually renders
# ---------------------------------------------------------------------------

def test_frontend_renders():
    g = "Frontend"
    try:
        status, hdrs, body = http(WEB)
        text = body.decode("utf-8", errors="replace")
        ctype = (hdrs.get("Content-Type") or "").lower()
        has_root = '<div id="root">' in text
        has_bundle = "_expo/static/js/web/" in text
        has_manifest_link = 'rel="manifest"' in text
        record(g, "root document serves HTML", status == 200 and "text/html" in ctype,
               f"status={status} content-type={ctype}")
        record(g, "app shell references the bundle", has_bundle, f"bundle={has_bundle}")
        record(g, "app shell links the web manifest", has_manifest_link,
               f"manifest_link={has_manifest_link}")
        record(g, "root mount point present", has_root, f"root_div={has_root}")
    except Exception as e:
        record(g, "root document serves HTML", False, str(e)[:90])


SUITES = {
    "assets": test_static_assets,
    "pwa": test_manifest_contract,
    "sw": test_service_worker_reachable,
    "seasons": test_season_data,
    "seasons_inventory": test_seasons_inventory,
    "seasons_scope": test_seasons_are_scoped_to_one_title,
    "resolver": test_resolve_contract,
    "providers": test_provider_health,
    "mirrors": test_default_mirrors_healthy,
    "availability": test_availability_mirrors,
    "catalog": test_catalog_api,
    "mixed": test_no_mixed_content,
    "releases": test_releases,
    "apk": test_apk_is_valid_archive,
    "apksdk": test_apk_target_sdk,
    "duplicates": test_no_duplicate_release_names,
    "frontend": test_frontend_renders,
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--offline", action="store_true", help="skip every network test")
    ap.add_argument("--only", action="append", help="run only the named suite(s)")
    args = ap.parse_args()

    print("=" * 70)
    print("  ShadowStream platform verification")
    print("=" * 70)

    names = args.only or list(SUITES.keys())
    for name in names:
        fn = SUITES.get(name)
        if not fn:
            print(f"unknown suite: {name}. known: {', '.join(SUITES)}")
            sys.exit(2)
        if args.offline:
            record("skipped", name, True, "offline mode", skipped=True)
            continue
        try:
            fn()
        except Exception as e:
            record(name, "suite crashed", False, str(e)[:120])

    print("\n" + "=" * 70)
    print(f"  {PASSED} passed | {FAILED} failed | {SKIPPED} skipped")
    print("=" * 70)

    if FAILED:
        print("\nFailures:")
        for group, name, status, detail in RESULTS:
            if status == "FAIL":
                print(f"  - {group} | {name}: {detail}")
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    # urllib.parse is used in test_default_mirrors_healthy
    import urllib.parse
    main()
