import os
import subprocess
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

SRC = Path(r"G:\streaming app\scraper\worker_export")
BUCKET = "streamapp-catalog"

core_files = [
    "collections.json",
    "categories.json",
    "collections/paramount-plus.json",
    "collections/peacock.json",
    "collections/universal-pictures.json",
    "collections/sony-pictures.json",
    "meta.json",
    "title-detail-index.json"
]

print(f"Uploading {len(core_files)} studio collection files to Cloudflare R2...", flush=True)
for rel in core_files:
    file_path = SRC / rel
    if not file_path.exists():
        print(f"  Missing file: {rel}", flush=True)
        continue
    key = f"{BUCKET}/{rel.replace(os.sep, '/')}"
    cmd = [
        "npx", "wrangler", "r2", "object", "put", key,
        "--file", str(file_path),
        "--content-type", "application/json",
        "--remote", "-y"
    ]
    res = subprocess.run(
        cmd,
        shell=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        cwd=r"G:\streaming app\downloads\streamapp-worker",
        timeout=60
    )
    if res.returncode == 0:
        print(f"  [OK] Uploaded: {rel}", flush=True)
    else:
        err = (res.stderr or res.stdout or "").strip()[:100]
        safe_err = err.encode("ascii", errors="replace").decode("ascii")
        print(f"  [FAIL] {rel}: {safe_err}", flush=True)

print("Upload completed.", flush=True)
