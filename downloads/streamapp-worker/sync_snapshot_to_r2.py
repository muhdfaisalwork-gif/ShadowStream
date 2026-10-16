"""
sync_snapshot_to_r2.py — Upload updated catalog snapshot files to Cloudflare R2 bucket streamapp-catalog.
"""
import os
import sys
import subprocess
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

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
                timeout=90
            )
            if res.returncode == 0:
                return (rel_path, True, "ok")
            err = (res.stderr or res.stdout or "").strip().replace("\n", " ")[:120]
        except Exception as e:
            err = str(e)
    return (rel_path, False, err)

def main():
    to_upload = []

    # 1. Root taxonomy files
    roots = [
        "meta.json", "sources.json", "collections.json", "genres.json",
        "countries.json", "languages.json", "categories.json", "title-detail-index.json"
    ]
    for r in roots:
        if (SRC / r).exists():
            to_upload.append(r)

    # 2. Collections files (85 files)
    col_dir = SRC / "collections"
    if col_dir.exists():
        for p in col_dir.glob("*.json"):
            to_upload.append(f"collections/{p.name}")

    # 3. Standard search shards (37 files)
    shards_dir = SRC / "search-shards"
    if shards_dir.exists():
        for p in shards_dir.glob("*.json"):
            to_upload.append(f"search-shards/{p.name}")

    # 4. Titles by type (anime, short_drama, tv, movie)
    types_dir = SRC / "titles-by-type"
    if types_dir.exists():
        for p in types_dir.rglob("*.json"):
            rel = p.relative_to(SRC).as_posix()
            to_upload.append(rel)

    # 5. Titles by country (42 files)
    country_dir = SRC / "titles-by-country"
    if country_dir.exists():
        for p in country_dir.glob("*.json"):
            to_upload.append(f"titles-by-country/{p.name}")

    # 6. Titles by language (86 files)
    lang_dir = SRC / "titles-by-language"
    if lang_dir.exists():
        for p in lang_dir.glob("*.json"):
            to_upload.append(f"titles-by-language/{p.name}")

    # 7. Titles by genre (27 files)
    genre_dir = SRC / "titles-by-genre"
    if genre_dir.exists():
        for p in genre_dir.glob("*.json"):
            to_upload.append(f"titles-by-genre/{p.name}")

    total = len(to_upload)
    print(f"Total files queued for R2 upload: {total}")

    ok = 0
    fail = 0
    with ThreadPoolExecutor(max_workers=5) as executor:
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

    print(f"\nUpload complete: {ok}/{total} succeeded, {fail} failed.")

if __name__ == "__main__":
    main()
