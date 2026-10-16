"""
upload_types.py — Uploads all 190 files in scraper/worker_export/titles-by-type
to Cloudflare R2 bucket streamapp-catalog using 4 concurrent wrangler processes with retry.
"""
import os
import sys
import subprocess
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

SRC = Path(r"G:\streaming app\scraper\worker_export\titles-by-type")
BUCKET = "streamapp-catalog"

def upload_one(file_path: Path):
    rel = file_path.relative_to(SRC.parent).as_posix()
    key = f"{BUCKET}/{rel}"
    cmd = [
        "npx", "wrangler", "r2", "object", "put", key,
        "--file", str(file_path),
        "--content-type", "application/json",
        "--remote", "-y"
    ]
    for attempt in range(3):
        try:
            res = subprocess.run(
                cmd,
                shell=True,
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                timeout=90
            )
            if res.returncode == 0:
                return (rel, True, "ok")
            err = (res.stderr or res.stdout or "").strip().replace("\n", " ")[:120]
        except Exception as e:
            err = str(e)
    return (rel, False, err)

def main():
    files = [p for p in SRC.rglob("*.json") if p.is_file()]
    total = len(files)
    print(f"Total titles-by-type files to upload: {total}")
    
    ok = 0
    fail = 0
    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = {executor.submit(upload_one, f): f for f in files}
        for i, future in enumerate(as_completed(futures), 1):
            rel, success, msg = future.result()
            if success:
                ok += 1
            else:
                fail += 1
                print(f"  FAIL: {rel} ({msg})", flush=True)
            if i % 10 == 0 or i == total:
                print(f"[{i}/{total}] ok={ok} fail={fail}", flush=True)

    print(f"\nDone: {ok}/{total} uploaded, {fail} failed.")
    return 0 if fail == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
