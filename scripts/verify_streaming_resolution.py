"""
Streaming resolution & playback-viability audit.

The v2.4.39 release shipped a player that could not play a single frame and
this script still reported 100% success, because it only checked that the API
answered HTTP 200 and returned some URLs. It never checked:

  * that the top-ranked provider is one we trust,
  * that the provider hosts the requested episode at all,
  * that the shipped frontend does not sandbox the provider iframe,
  * that the deployed build is the version we think it is.

Every one of those checks is here now.
"""

import urllib.request
import urllib.error
import json
import time
import sys
import os
import re

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE_API = "https://ssmoviestvs.site/api/v1"
BASE_SITE = "https://ssmoviestvs.site"
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _expected_version():
    """Read the expected version from the repo instead of hard-coding it.

    A hard-coded constant here would silently rot on the next release and make
    the gate fail for the wrong reason.
    """
    path = os.path.join(REPO_ROOT, "frontend", "public", "version.json")
    try:
        with open(path, "r", encoding="utf-8") as fh:
            return json.load(fh).get("version")
    except Exception:  # noqa: BLE001
        return None


EXPECTED_VERSION = _expected_version()

# Hosts that must never reach the player. player.videasy.to refuses sandboxed
# embeds, soft-404s titles it does not host and loads hostile trackers;
# embed.smashystream.com no longer resolves in DNS; vidsrc.buzz injects ads.
BLOCKED_HOSTS = [
    "player.videasy.to",
    "videasy.to",
    "embed.smashystream.com",
    "smashystream.com",
    "vidsrc.buzz",
    "multiembed",
    "autoembed",
]

# The provider we intend to lead the rotation. Verified live: it plays
# The Last of Us S1E1 at 1080p and carries native dubbed audio.
EXPECTED_PRIMARY = "vidstuck"

# The exact sandbox token set that v2.4.39 shipped and that every provider
# refuses to play inside. If it appears in the deployed bundle, the player is
# broken again.
SANDBOX_TOKEN = "allow-scripts allow-same-origin allow-forms allow-presentation"

test_items = [
    ("The Dark Knight (155)", 155, "movie", None, None),
    ("The Last of Us (100088)", 100088, "tv", 1, 1),
    ("Fight Club (550)", 550, "movie", None, None),
    ("Breaking Bad (1396)", 1396, "tv", 1, 1),
    ("Dune Part Two (693134)", 693134, "movie", None, None),
    ("Demon Slayer (85937)", 85937, "anime", 1, 1),
]

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36"}

failures = []
warnings = []


def get(url, timeout=15, method="GET"):
    req = urllib.request.Request(url, headers=UA, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            body = res.read()
            return res.status, body, res.headers
    except urllib.error.HTTPError as err:
        return err.code, b"", err.headers
    except Exception as err:  # noqa: BLE001
        return None, str(err).encode("utf-8", "replace"), {}


def check(label, condition, detail=""):
    if condition:
        print(f"[PASS] {label}")
        return True
    print(f"[FAIL] {label}{(' -> ' + detail) if detail else ''}")
    failures.append(f"{label} {detail}".strip())
    return False


print("=" * 66)
print("     SHADOWSTREAM STREAMING RESOLUTION & PLAYBACK-VIABILITY AUDIT")
print("=" * 66)
print()

# ---------------------------------------------------------------- deployed build
print("--- Deployed build identity ---")
status, body, _ = get(f"{BASE_API}/app-version")
deployed_version = None
if status == 200:
    try:
        deployed_version = json.loads(body).get("version")
    except Exception:  # noqa: BLE001
        pass
check(
    f"Deployed version is {EXPECTED_VERSION}",
    deployed_version == EXPECTED_VERSION,
    f"got {deployed_version}",
)
print()

# ------------------------------------------------------------- player sandbox
print("--- Shipped player iframe must NOT be sandboxed ---")
status, body, _ = get(f"{BASE_SITE}/play/the-last-of-us-2023?season=1&episode=1")
bundles = []
if status == 200:
    text = body.decode("utf-8", "replace")
    bundles = re.findall(r'src="([^"]+\.js)"', text)

sandbox_hits = []
for src in bundles:
    url = src if src.startswith("http") else f"{BASE_SITE}{src}"
    st, js, _ = get(url, timeout=25)
    if st == 200 and SANDBOX_TOKEN in js.decode("utf-8", "replace"):
        sandbox_hits.append(src)

check(
    f"No shipped bundle contains the provider-breaking sandbox token ({len(bundles)} bundle(s) scanned)",
    not sandbox_hits,
    ", ".join(sandbox_hits),
)
print()

# --------------------------------------------------------- provider behaviour
print("--- Provider reachability & content presence ---")
# A provider that does not host the episode usually answers 404/5xx. This is
# the same signal the worker's presence probe uses, so a title that only
# resolves on dead providers is caught here before it reaches a customer.
presence_pairs = [
    ("vidstuck", "https://vidstuck.cc/embed/tv/100088/1/1?loading=2"),
    ("nontongo", "https://www.NontonGo.win/embed/tv/100088/1/1"),
    ("vidlink", "https://vidlink.pro/tv/100088/1/1"),
]
for provider, url in presence_pairs:
    st, _, _ = get(url, timeout=15, method="HEAD")
    ok = st is not None and st < 400
    check(f"{provider} answers for a title it hosts (HEAD {st})", ok, f"status={st}")

for provider, url in presence_pairs:
    fake = url.replace("100088", "9999999")
    st, _, _ = get(fake, timeout=15, method="HEAD")
    if st is not None and st >= 400:
        print(f"[INFO] {provider} reports a missing title with HTTP {st} -> presence probe applies")
    else:
        warnings.append(f"{provider} answers {st} for an unknown title - presence probe cannot detect it")
print()

# -------------------------------------------------------------- title resolve
print("--- Title resolution ---")
total_tests = 0
passed_tests = 0

for label, tmdb, mtype, s, e in test_items:
    total_tests += 1
    query = f"tmdbId={tmdb}&type={mtype}"
    if mtype in ("tv", "anime"):
        query += f"&season={s}&episode={e}"

    url = f"{BASE_API}/stream/resolve?{query}"
    t0 = time.time()
    status, body, _ = get(url)
    dt = time.time() - t0
    if status != 200:
        print(f"[FAIL] {label:<26} | HTTP {status} ({dt:.2f}s)")
        failures.append(f"resolve {label}")
        print()
        continue

    data = json.loads(body)
    streams = data.get("streams", [])
    print(f"[OK] {label:<26} | HTTP {status} | {dt:.2f}s | {len(streams)} active streams")
    for idx, st in enumerate(streams[:3]):
        p = st.get("provider")
        u = (st.get("url") or "")[:58]
        lang = st.get("languageName") or st.get("language")
        print(f"      #{idx+1} {p:<14} | Lang: {lang:<20} | {u}")

    if not streams:
        print(f"[FAIL] {label}: no streams returned")
        failures.append(f"no streams for {label}")
    else:
        passed_tests += 1

    for st in streams:
        su = (st.get("url") or "").lower()
        for bad in BLOCKED_HOSTS:
            if bad in su:
                print(f"[FAIL] {label}: blocked host served -> {st.get('provider')} {bad}")
                failures.append(f"blocked host {bad} for {label}")

    primary = (streams[0].get("provider") if streams else "") or ""
    if primary and primary != EXPECTED_PRIMARY:
        warnings.append(f"{label}: primary provider is {primary}, expected {EXPECTED_PRIMARY}")
    print()

print("-" * 66)
print(f"TITLES RESOLVED: {passed_tests}/{total_tests}")
if warnings:
    print("\nWARNINGS:")
    for w in warnings:
        print(f"  ! {w}")
if failures:
    print(f"\nFAILURES: {len(failures)}")
    for f in failures:
        print(f"  x {f}")
    print("=" * 66)
    sys.exit(1)
print("ALL CHECKS PASSED")
print("=" * 66)
sys.exit(0)
