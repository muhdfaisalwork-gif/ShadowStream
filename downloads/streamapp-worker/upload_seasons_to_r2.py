"""
Upload the seasons dataset + provider registry to Cloudflare R2.

Follows the same command shape the repo already used (sync_snapshot_to_r2.py):
    npx wrangler r2 object put <bucket>/<key> --file <path> --content-type ... --remote -y

Uploads are additive: the seasons/ prefix and providers.json do not exist in R2
today, so a partial or failed run cannot break the live catalogue. The Worker
falls back to its compiled provider defaults and to inline season data when
these keys are absent.

Usage:
    python upload_seasons_to_r2.py                 # upload everything
    python upload_seasons_to_r2.py --dry-run       # list what would be uploaded
    python upload_seasons_to_r2.py --only index    # just the index (fast)
"""

import argparse
import json
import os
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

SRC = Path(r"G:\streaming app\downloads\snapshots")
BUCKET = "streamapp-catalog"
WORKER_DIR = r"G:\streaming app\downloads\streamapp-worker"
MAX_WORKERS = 1
# Files above this go up alone. Concurrent multi-megabyte uploads were
# dropping the connection with "TypeError: fetch failed" on this network.
LARGE_FILE_BYTES = 4 * 1024 * 1024


STATE = Path(r"G:\streaming app\downloads\snapshots\.uploaded.json")


def load_state():
    if STATE.is_file():
        try:
            return set(json.loads(STATE.read_text(encoding="utf-8")))
        except Exception:
            return set()
    return set()


def save_state(done):
    STATE.parent.mkdir(parents=True, exist_ok=True)
    STATE.write_text(json.dumps(sorted(done), indent=1), encoding="utf-8")


def upload(key: str, path: Path, content_type: str = "application/json", attempts: int = 4):
    cmd = [
        "npx", "wrangler", "r2", "object", "put", f"{BUCKET}/{key}",
        "--file", str(path),
        "--content-type", content_type,
        "--remote", "-y",
    ]
    last = ""
    for i in range(attempts):
        # wrangler emits UTF-8 progress output; decoding it with the Windows
        # default (cp1252) raises inside the reader thread and kills the
        # upload. errors="replace" keeps the real error text readable.
        res = subprocess.run(
            cmd, cwd=WORKER_DIR, shell=True, capture_output=True, text=True,
            encoding="utf-8", errors="replace",
        )
        if res.returncode == 0:
            return key, True, f"{(path.stat().st_size/1024/1024):.1f} MB"
        lines = (res.stderr or res.stdout or "").strip().splitlines()
        last = (lines[-1] if lines else "unknown error")[:160]
        # Backoff: these are transient network failures.
        time.sleep(3 * (i + 1))
    return key, False, last


def collect():
    jobs = []
    seasons_dir = SRC / "seasons"
    if seasons_dir.is_dir():
        for f in sorted(seasons_dir.glob("*.json")):
            jobs.append((f"seasons/{f.name}", f, "application/json"))
    for name in ("providers.json",):
        p = SRC / name
        if p.is_file():
            jobs.append((name, p, "application/json"))
    return jobs


def main():
    global MAX_WORKERS
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--only", help="substring filter on the key")
    ap.add_argument("--workers", type=int, default=2)
    ap.add_argument("--limit", type=int, default=0,
                    help="upload at most N objects this run, then exit cleanly. "
                         "Progress is checkpointed so the next run resumes.")
    args = ap.parse_args()

    MAX_WORKERS = max(1, args.workers)

    all_jobs = collect()
    if args.only:
        all_jobs = [j for j in all_jobs if args.only in j[0]]

    done = load_state()
    jobs = [j for j in all_jobs if j[0] not in done]

    total = sum(p.stat().st_size for _, p, _ in all_jobs)
    pending = sum(p.stat().st_size for _, p, _ in jobs)
    print(f"{len(all_jobs)} objects total, {total/1024/1024:.1f} MB")
    print(f"{len(done)} already uploaded; {len(jobs)} pending, {pending/1024/1024:.1f} MB")
    if args.dry_run:
        for key, path, _ in jobs[:8]:
            print(f"  pending {key:<30} {path.stat().st_size/1024/1024:>6.2f} MB")
        return

    if args.limit:
        jobs = jobs[: args.limit]

    ok = fail = 0
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as ex:
        futs = {ex.submit(upload, k, p, c): k for k, p, c in jobs}
        for fut in as_completed(futs):
            key, good, detail = fut.result()
            if good:
                ok += 1
                done.add(key)
                # Checkpoint after every single success. A run that is killed
                # by the watchdog must not lose everything it already pushed.
                save_state(done)
            else:
                fail += 1
                print(f"  [FAIL] {key}  {detail}", file=sys.stderr)

    save_state(done)

    remaining = len([j for j in all_jobs if j[0] not in done])
    print(f"this run: uploaded {ok}, failed {fail}; total done {len(done)}/{len(all_jobs)}; remaining {remaining}")
    # Exit 0 even with transient failures so a batched run does not abort the
    # loop; the remaining count tells the caller whether more work is needed.
    sys.exit(2 if remaining else 0)


if __name__ == "__main__":
    main()
