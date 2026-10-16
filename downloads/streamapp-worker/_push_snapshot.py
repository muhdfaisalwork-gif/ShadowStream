"""
_push_snapshot.py — Push all files in ../../scraper/worker_export/ to the
streamapp-catalog R2 bucket via wrangler. Equivalent to upload_snapshot.sh but
cross-platform and with progress reporting.

Run from downloads/streamapp-worker/ so wrangler.toml is picked up.
"""
import os
import subprocess
import sys
from pathlib import Path

# Force UTF-8 stdout for Windows consoles that default to cp1252
try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

HERE = Path(__file__).parent.resolve()
SRC = (HERE / ".." / ".." / "scraper" / "worker_export").resolve()
BUCKET = "streamapp-catalog"

if not SRC.exists():
    print(f"FATAL: snapshot dir not found: {SRC}", file=sys.stderr)
    sys.exit(1)

files = [p for p in SRC.rglob("*") if p.is_file()]
total = len(files)
print(f"Source: {SRC}")
print(f"Target bucket: {BUCKET}")
print(f"Files to upload: {total}")

ok = 0
fail = 0
for i, f in enumerate(files, 1):
    rel = f.relative_to(SRC).as_posix()
    key = f"{BUCKET}/{rel}"
    # Use --remote to push to Cloudflare, not local miniflare
    cmd = ["npx", "wrangler", "r2", "object", "put", key,
           "--file", str(f),
           "--content-type", "application/json",
           "--content-encoding", "identity",
           "--remote",
           "-y"]
    try:
        # shell=True so npx.cmd resolves correctly on Windows
        result = subprocess.run(cmd, capture_output=True, timeout=60,
                                shell=True, encoding='utf-8', errors='replace')
        if result.returncode == 0:
            ok += 1
        else:
            fail += 1
            err = (result.stderr or '')[:200].encode('ascii', 'replace').decode('ascii')
            print(f"  ! {rel}: rc={result.returncode} {err}", flush=True)
    except subprocess.TimeoutExpired:
        fail += 1
        print(f"  ! {rel}: timeout", flush=True)

    if i % 10 == 0 or i == total:
        print(f"  [{i}/{total}] ok={ok} fail={fail}", flush=True)

print(f"\nDONE: {ok}/{total} uploaded, {fail} failed")
sys.exit(0 if fail == 0 else 1)