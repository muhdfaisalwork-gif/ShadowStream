import urllib.request
import json
import sys

def test_url(name, url, check_str=None):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
        with urllib.request.urlopen(req, timeout=15) as res:
            code = res.getcode()
            body = res.read()
            text = body.decode('utf-8', errors='ignore')
            passed = (code == 200) and (check_str is None or check_str in text)
            print(f"[{name}] {code} - {'PASS' if passed else 'FAIL'} (size: {len(body)})")
            return passed
    except Exception as e:
        print(f"[{name}] ERROR: {e}")
        return False

print("=== VERIFYING LIVE PRODUCTION STATUS ===")
all_pass = True
all_pass &= test_url("Index HTML Bundle Tag", "https://ssmoviestvs.site/", "index-e86a542300eccc709b9dc9da135819f8.js")
all_pass &= test_url("Bundle JS Live Fetch", "https://ssmoviestvs.site/_expo/static/js/web/index-e86a542300eccc709b9dc9da135819f8.js")
all_pass &= test_url("Service Worker v13", "https://ssmoviestvs.site/sw.js", "v13")
all_pass &= test_url("API Health", "https://ssmoviestvs.site/api/v1/health", "ok")
all_pass &= test_url("Featured API", "https://ssmoviestvs.site/api/v1/featured", "banner")
all_pass &= test_url("Search API", "https://ssmoviestvs.site/api/v1/search?q=avatar", "results")
all_pass &= test_url("APK Release File", "https://ssmoviestvs.site/downloads/ShadowStream.apk")
print(f"OVERALL STATUS: {'ALL TESTS PASSED' if all_pass else 'SOME TESTS FAILED'}")
