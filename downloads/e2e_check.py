"""Micro-level E2E verification before deployment."""
import os, struct, hashlib, socket, urllib.request, urllib.error

ROOT = r"G:\streaming app\downloads"
WWW  = os.path.join(ROOT, "www")

results = []
def check(label, ok, detail=""):
    sym = "OK " if ok else "FAIL"
    results.append((ok, label, detail))
    print(f"  [{sym}] {label}" + (f"  -- {detail}" if detail else ""))


print("=== 1. CATALOG SERVICE (live backend) ===")
try:
    s = socket.create_connection(("127.0.0.1", 7801), timeout=3)
    s.close()
    check("catalog service :7801 reachable", True)
except Exception as e:
    check("catalog service :7801 reachable", False, str(e))

try:
    r = urllib.request.urlopen("http://127.0.0.1:7801/health", timeout=5)
    body = r.read().decode()
    check("/health responds 2xx", r.status == 200, f"status={r.status}")
    check("/health mentions indexed count", '"indexed"' in body and '"101971"' in body, body[:200])
except Exception as e:
    check("/health fetch", False, str(e))

print()
print("=== 2. LIVE WEB APP ===")
try:
    r = urllib.request.urlopen("https://ls7m73ztxvfc2.space.minimax.io", timeout=10)
    body = r.read().decode()
    check("live URL responds 2xx", r.status == 200, f"status={r.status}")
    check("live URL serves Expo/React Native bundle", "react-native-web" in body or "expo" in body.lower())
except Exception as e:
    check("live URL reachable", False, str(e))

print()
print("=== 3. BINARY EXECUTABILITY ===")
def is_elf_pe_macho(path):
    with open(path, "rb") as f:
        head = f.read(20)
    if head[:4] == b"\x7fELF":
        return "ELF"
    if head[:2] == b"MZ":
        return "PE"
    if head[:4] == b"\xcf\xfa\xed\xfe" or head[:4] == b"\xfe\xed\xfa\xcf":
        return "Mach-O"
    return f"unknown({head[:4].hex()})"

for fn in ["StreamApp-windows-x64.exe", "StreamApp-linux-x64", "StreamApp-linux-arm64",
           "StreamApp-macos-x64", "StreamApp-macos-arm64"]:
    p = os.path.join(WWW, fn)
    if not os.path.exists(p):
        check(fn, False, "missing")
        continue
    size = os.path.getsize(p)
    fmt = is_elf_pe_macho(p)
    sha = hashlib.sha256(open(p, "rb").read()).hexdigest()[:16]
    ok = size > 1_000_000 and fmt != "unknown"
    check(fn, ok, f"{fmt}  {size/1024/1024:.1f} MB  sha256={sha}...")

print()
print("=== 4. INDEX.HTML structure ===")
html_path = os.path.join(WWW, "index.html")
html = open(html_path, encoding="utf-8").read()
check("index.html exists", os.path.exists(html_path))
check("index.html is valid HTML (has <!DOCTYPE html>)", "<!DOCTYPE html>" in html)
check("links to live web app", "ls7m73ztxvfc2.space.minimax.io" in html)
check("links to 5 binaries", all(f"StreamApp-{p}" in html for p in [
    "windows-x64.exe", "macos-x64", "macos-arm64", "linux-x64", "linux-arm64",
]))
check("mentions 101,971 titles", "101,971" in html or "101,000" in html)
check("has Android / Android TV / iOS cards", all(t in html for t in ["Android", "Android TV", "iOS"]))

print()
print("=== 5. ALL DOWNLOAD PATHS RESOLVE (relative to www/) ===")
import re
hrefs = re.findall(r'href="(\./[^"]+|https?://[^"]+)"', html)
internal = [h for h in hrefs if h.startswith("./")]
for href in internal:
    target = os.path.join(WWW, href[2:])
    ok = os.path.exists(target)
    check(f"link {href}", ok, "exists" if ok else "MISSING")

print()
print("=" * 60)
total = len(results)
passed = sum(1 for ok, *_ in results if ok)
print(f"RESULT: {passed}/{total} checks passed")
print("=" * 60)
if passed != total:
    print("\nFAILED CHECKS:")
    for ok, label, detail in results:
        if not ok:
            print(f"  - {label}  {detail}")
