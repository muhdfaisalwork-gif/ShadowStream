import os
import sys
import subprocess
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

os.environ["CLOUDFLARE_ACCOUNT_ID"] = "0dab17d269e4877aeadea10dee5354bd"
os.environ["NODE_OPTIONS"] = "--dns-result-order=ipv4first"

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

SRC = Path(r"G:\streaming app\scraper\worker_export")
BUCKET = "streamapp-catalog"

def upload_file(rel_path: str):
    file_path = SRC / rel_path
    if not file_path.exists():
        return (rel_path, False, "file not found")
    
    key = f"{BUCKET}/{rel_path.replace(os.sep, '/')}"
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
                return (rel_path, True, "ok")
            err = (res.stderr or res.stdout or "").strip().replace("\n", " ")[:120]
        except Exception as e:
            err = str(e)
    return (rel_path, False, err)

def main():
    to_upload = [
        "categories.json",
        "countries.json",
        "languages.json",
        "genres.json",
        "collections.json",
        "title-detail-index.json"
    ]

    # Individual collection files (88+ files)
    col_dir = SRC / "collections"
    if col_dir.exists():
        for p in col_dir.glob("*.json"):
            to_upload.append(f"collections/{p.name}")

    # Short drama files
    sd_dir = SRC / "titles-by-type" / "short_drama"
    if sd_dir.exists():
        for p in sd_dir.glob("*.json"):
            to_upload.append(f"titles-by-type/short_drama/{p.name}")

    # Core and featured detail shards (The Office, Spider-Man, popular titles)
    for shard in [
        "titles-by-type/tv/detail-0.json",
        "titles-by-type/tv/detail-1.json",
        "titles-by-type/tv/detail-29.json",
        "titles-by-type/movie/detail-0.json",
        "titles-by-type/movie/detail-1.json",
        "titles-by-type/movie/detail-106.json",
    ]:
        if (SRC / shard).exists():
            to_upload.append(shard)

    # All countries (42 files)
    c_dir = SRC / "titles-by-country"
    if c_dir.exists():
        for p in c_dir.glob("*.json"):
            to_upload.append(f"titles-by-country/{p.name}")

    # All languages (86 files)
    l_dir = SRC / "titles-by-language"
    if l_dir.exists():
        for p in l_dir.glob("*.json"):
            to_upload.append(f"titles-by-language/{p.name}")

    # All genres (27 files)
    g_dir = SRC / "titles-by-genre"
    if g_dir.exists():
        for p in g_dir.glob("*.json"):
            to_upload.append(f"titles-by-genre/{p.name}")

    total = len(to_upload)
    print(f"Priority files queued: {total}")

    ok = 0
    fail = 0
    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = {executor.submit(upload_file, rel): rel for rel in to_upload}
        for i, future in enumerate(as_completed(futures), 1):
            rel, success, msg = future.result()
            if success:
                ok += 1
            else:
                fail += 1
                print(f"  FAIL: {rel} ({msg})", flush=True)
            if i % 10 == 0 or i == total:
                print(f"[{i}/{total}] ok={ok} fail={fail}", flush=True)

    print(f"\nPriority upload complete: {ok}/{total} succeeded, {fail} failed.")

if __name__ == "__main__":
    main()
