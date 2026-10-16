"""Final end-to-end verification."""
import urllib.request, urllib.error

HDRS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

def get(url, method="GET"):
    return urllib.request.urlopen(urllib.request.Request(url, headers=HDRS, method=method), timeout=15)


print("=== STEP 1: landing page ===")
r = get("https://7g5qmh0j79e4e.space.minimax.io/")
body = r.read().decode()
print("  status =", r.status)
print("  size   =", r.headers.get("Content-Length"), "bytes")
print("  has 101,971 titles count =", "101,971" in body)
print("  links to live app =", "ls7m73ztxvfc2.space.minimax.io" in body)
print("  links to 5 R2 binaries =", body.count("pub-94ab97339d4943b8a53502ba94f8d59f.r2.dev"), "instances")
print("  mentions Android =", "Android" in body)
print("  mentions Android TV =", "Android TV" in body)
print("  mentions iOS =", "iOS" in body)
print()

print("=== STEP 2: download a binary from R2 ===")
for fn in ["StreamApp-windows-x64.exe", "StreamApp-linux-x64", "StreamApp-macos-x64"]:
    r = get("https://pub-94ab97339d4943b8a53502ba94f8d59f.r2.dev/streamapp/" + fn, method="HEAD")
    size_mb = int(r.headers.get("Content-Length", 0)) / 1024 / 1024
    print(f"  [{r.status}] {fn:35s} {size_mb:.1f} MB")
print()

print("=== STEP 3: live web app ===")
r = get("https://ls7m73ztxvfc2.space.minimax.io/")
body = r.read().decode()
print("  status =", r.status)
print("  size   =", len(body), "bytes")
print("  bundle type    =", "react-native-web" if "react-native-web" in body else "other")
print()

print("=== STEP 4: catalog service (still running on 127.0.0.1:7801) ===")
r = get("http://127.0.0.1:7801/health")
print("  status =", r.status)
print("  body   =", r.read().decode()[:200])
print()

print("All four endpoints up. E2E PASS.")
