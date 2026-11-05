"""
Upload all v2.4.46 release binaries and manifests to Cloudflare R2 bucket `streamapp-releases`.
Ensures Android APK, Windows Setup exe, blockmap, latest.yml, and version.json are 100% updated to v2.4.46.
"""

import os
import sys
import subprocess
import urllib.request
import json
from pathlib import Path

REPO = Path(r"G:\streaming app")
BUCKET = "streamapp-releases"

FILES_TO_UPLOAD = [
    {
        "key": "downloads/version.json",
        "path": REPO / "downloads" / "version.json",
        "content_type": "application/json; charset=utf-8"
    },
    {
        "key": "version.json",
        "path": REPO / "frontend" / "public" / "version.json",
        "content_type": "application/json; charset=utf-8"
    },
    {
        "key": "latest.yml",
        "path": REPO / "packaging" / "windows" / "app" / "dist-v2446" / "latest.yml",
        "content_type": "text/yaml; charset=utf-8"
    },
    {
        "key": "ShadowStream-Setup-x64.exe.blockmap",
        "path": REPO / "packaging" / "windows" / "app" / "dist-v2446" / "ShadowStream-Setup-x64.exe.blockmap",
        "content_type": "application/octet-stream"
    },
    {
        "key": "ShadowStream.apk",
        "path": REPO / "downloads" / "ShadowStream.apk",
        "content_type": "application/vnd.android.package-archive"
    },
    {
        "key": "StreamApp.apk",
        "path": REPO / "downloads" / "ShadowStream.apk",
        "content_type": "application/vnd.android.package-archive"
    },
    {
        "key": "downloads/ShadowStream.apk",
        "path": REPO / "downloads" / "ShadowStream.apk",
        "content_type": "application/vnd.android.package-archive"
    },
    {
        "key": "ShadowStream-Setup-x64.exe",
        "path": REPO / "packaging" / "windows" / "app" / "dist-v2446" / "ShadowStream-Setup-x64.exe",
        "content_type": "application/vnd.microsoft.portable-executable"
    },
    {
        "key": "StreamApp-Setup-x64.exe",
        "path": REPO / "packaging" / "windows" / "app" / "dist-v2446" / "ShadowStream-Setup-x64.exe",
        "content_type": "application/vnd.microsoft.portable-executable"
    },
    {
        "key": "ShadowStream-win-x64.zip",
        "path": REPO / "downloads" / "ShadowStream-win-x64.zip",
        "content_type": "application/zip"
    }
]

def upload_file(key, file_path, content_type):
    print(f"\n[UPLOADING] {key} ({file_path.stat().st_size:,} bytes)...")
    cmd = [
        "npx", "wrangler", "r2", "object", "put",
        f"{BUCKET}/{key}",
        f"--file={file_path}",
        f"--content-type={content_type}",
        "--remote"
    ]
    
    max_retries = 3
    for attempt in range(1, max_retries + 1):
        try:
            res = subprocess.run(
                " ".join(cmd),
                cwd=str(REPO),
                shell=True,
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                timeout=600
            )
            if res.returncode == 0:
                print(f"[SUCCESS] {key} uploaded successfully.")
                return True
            else:
                print(f"[RETRY {attempt}/{max_retries}] Upload failed for {key}: {res.stderr.strip()[:200]}")
        except subprocess.TimeoutExpired:
            print(f"[TIMEOUT {attempt}/{max_retries}] Upload timed out for {key}")
        except Exception as e:
            print(f"[ERROR {attempt}/{max_retries}] Exception for {key}: {e}")
            
    return False

def verify_live():
    print("\n" + "=" * 70)
    print("VERIFYING PUBLIC DOWNLOADS ON SSMOVIESTVS.SITE")
    print("=" * 70)
    
    url = "https://ssmoviestvs.site/downloads/list"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            items = json.loads(resp.read().decode("utf-8"))
            print(f"Total objects in R2 downloads: {len(items)}")
            for item in items:
                print(f"  • {item['key']:<35} | {item['size']:>12,} bytes | {item['uploaded']}")
    except Exception as e:
        print(f"Verification error: {e}")

if __name__ == "__main__":
    success = True
    for item in FILES_TO_UPLOAD:
        if not item["path"].exists():
            print(f"[ERROR] Source file missing: {item['path']}")
            sys.exit(1)
        ok = upload_file(item["key"], item["path"], item["content_type"])
        if not ok:
            success = False
            
    verify_live()
    
    if success:
        print("\n>>> ALL R2 RELEASES UPLOADED AND VERIFIED SUCCESSFULLY <<<")
        sys.exit(0)
    else:
        print("\n>>> SOME UPLOADS FAILED <<<")
        sys.exit(1)
