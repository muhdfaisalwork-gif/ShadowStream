import urllib.request
import json

endpoints = [
    "https://ssmoviestvs.site/app-version",
    "https://ssmoviestvs.site/version.json",
    "https://ssmoviestvs.site/api/v1/app-version",
    "https://ssmoviestvs.site/downloads/version.json",
    "https://ssmoviestvs.site/latest.yml"
]

print("=" * 70)
print("VERIFYING LIVE VERSION CONSISTENCY ACROSS ALL ENDPOINTS")
print("=" * 70)

all_ok = True
for ep in endpoints:
    try:
        req = urllib.request.Request(ep + "?_t=123", headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            body = resp.read().decode("utf-8")
            if ep.endswith(".yml"):
                assert "version: 2.4.46" in body, f"latest.yml version mismatch:\n{body}"
                print(f"[PASS] {ep} => version: 2.4.46")
            else:
                data = json.loads(body)
                assert data.get("version") == "2.4.46", f"{ep} returned wrong version {data.get('version')}"
                assert data.get("versionCode") == 286, f"{ep} returned wrong versionCode {data.get('versionCode')}"
                print(f"[PASS] {ep} => version: {data.get('version')} (code {data.get('versionCode')})")
    except Exception as e:
        print(f"[FAIL] {ep}: {e}")
        all_ok = False

if all_ok:
    print("\n>>> ALL VERSION ENDPOINTS RETURN 2.4.46 (CODE 286) WITH 100% CONSISTENCY <<<")
else:
    sys.exit(1)
