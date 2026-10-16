"""
upload_shards.py — Uploads the 37 standard search shards (0-9, a-z, _)
from scraper/worker_export/search-shards/ to Cloudflare R2 bucket streamapp-catalog.
"""
import os
import sys
import subprocess
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

SRC = Path(r"G:\streaming app\scraper\worker_export\search-shards")
BUCKET = "streamapp-catalog"

def upload_shard(filename: str):
    file_path = SRC / filename
    if not file_path.exists():
        return (filename, False, "file not found")
    key = f"{BUCKET}/search-shards/{filename}"
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
                timeout=60
            )
            if res.returncode == 0:
                return (filename, True, "ok")
            err = (res.stderr or res.stdout or "").strip().replace("\n", " ")[:120]
        except Exception as e:
            err = str(e)
    return (filename, False, err)

def main():
    standard_shards = [f"{i}.json" for i in range(10)] + [f"{chr(c)}.json" for c in range(ord('a'), ord('z')+1)] + ["_.json", "index.json"]
    total = len(standard_shards)
    print(f"Total standard search shards to upload: {total}")

    ok = 0
    fail = 0
    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = {executor.submit(upload_shard, f): f for f in standard_shards}
        for i, future in enumerate(as_completed(futures), 1):
            rel, success, msg = future.result()
            if success:
                ok += 1
            else:
                fail += 1
                print(f"  FAIL: {rel} ({msg})", flush=True)
            if i % 10 == 0 or i == total:
                print(f"[{i}/{total}] ok={ok} fail={fail}", flush=True)

    print(f"\nDone: {ok}/{total} shards uploaded, {fail} failed.")
    return 0 if fail == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
