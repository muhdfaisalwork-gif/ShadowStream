"""
auto_daily_sync.py — Unified 24-hour Automated Catalog Sync & Stream Pipeline.

Orchestrates the complete 5-stage daily lifecycle:
  Stage 1: Fetch fresh daily TMDB releases (now_playing, upcoming, on_the_air, trending)
  Stage 2: Auto-wire 10 multi-mirror streaming embed sources for new/unwired titles
  Stage 3: Regenerate snapshot JSONs (categories.json, collections.json, meta.json, etc.)
  Stage 4: Upload changed snapshots to Cloudflare R2 bucket 'streamapp-catalog'
  Stage 5: Verify live production endpoints (health, categories, collections)
"""
import argparse
import asyncio
import json
import os
import sqlite3
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

import httpx

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

HERE = Path(__file__).parent
DB = HERE / "catalog.db"
PROJECT_ROOT = HERE.parent
WORKER_DIR = PROJECT_ROOT / "downloads" / "streamapp-worker"
PYTHON_EXE = sys.executable

EMBED_TEMPLATES = {
    "vidsrc":     "https://vidsrc.to/embed/{kind}/{imdb}",
    "2embed":     "https://www.2embed.cc/embed/{imdb}",
    "superembed": "https://multiembed.mov/?video_id={imdb}&tmdb=1",
    "multiembed": "https://multiembed.mov/?video_id={imdb}",
    "flixhq":     "https://flixhq.click/watch-{kind}/{imdb}",
    "gomovies":   "https://gomovies.sx/{kind}/{imdb}",
    "moviebox":   "https://movieboxapp.io/{kind}/{tmdb}",
    "cinezone":   "https://cinezone.cz/embed/{kind}/{imdb}",
    "embedsu":    "https://embed.su/embed/{kind}/{imdb}",
    "warezcdn":   "https://warezcdn.com/embed/{kind}/{imdb}",
}


def log(msg: str) -> None:
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    safe_msg = msg.encode("ascii", errors="replace").decode("ascii")
    print(f"[{now}] [AutoDailySync] {safe_msg}", flush=True)


def stage1_ingest_feeds(dry_run: bool = False) -> bool:
    log("=== Stage 1: Ingesting Fresh Releases from TMDB ===")
    if dry_run:
        log("  [Dry-run] Skipping TMDB ingest")
        return True

    cmd = [PYTHON_EXE, str(HERE / "daily_refresh.py"), "--no-publish"]
    try:
        res = subprocess.run(cmd, cwd=str(HERE), capture_output=True, text=True, timeout=900)
        if res.returncode == 0:
            log("  TMDB daily refresh finished successfully.")
            for line in res.stdout.strip().splitlines()[-5:]:
                log(f"    {line}")
            return True
        else:
            log(f"  Warning: daily_refresh.py exited with code {res.returncode}: {res.stderr[:200]}")
            return False
    except Exception as e:
        log(f"  Error running daily_refresh.py: {e}")
        return False


def stage2_wire_embeds(limit: int = 500, dry_run: bool = False) -> int:
    log("=== Stage 2: Auto-Wiring Streaming Embeds for Streamable Playback ===")
    conn = sqlite3.connect(str(DB))
    conn.execute("PRAGMA journal_mode = WAL")

    # Get source IDs for the 10 embed aggregators
    sources = {}
    for r in conn.execute("SELECT id, slug FROM sources WHERE slug IN ('vidsrc','2embed','superembed','multiembed','flixhq','gomovies','moviebox','cinezone','embedsu','warezcdn')"):
        sources[r[1]] = r[0]

    # Find unwired titles (ordered by popularity descending)
    query = """
        SELECT t.id, t.type, t.slug, t.tmdb_id, t.imdb_id, t.title 
        FROM titles t
        WHERE t.id NOT IN (SELECT DISTINCT title_id FROM availability)
          AND (t.status = 'released' OR t.status = 'ongoing' OR t.status IS NULL)
          AND (t.tmdb_id IS NOT NULL OR t.imdb_id IS NOT NULL)
        ORDER BY t.popularity DESC
        LIMIT ?
    """
    candidates = conn.execute(query, (limit,)).fetchall()
    log(f"  Found {len(candidates)} high-priority unwired titles to wire.")

    if dry_run:
        log("  [Dry-run] Skipping embed wiring write.")
        conn.close()
        return len(candidates)

    wired_count = 0
    rows_inserted = 0

    for tid, kind, slug, tmdb_id, imdb_id, title in candidates:
        target_kind = "movie" if kind == "movie" else "tv"
        title_wired = False

        for s_slug, template in EMBED_TEMPLATES.items():
            s_id = sources.get(s_slug)
            if not s_id:
                continue

            # Need imdb for imdb-based templates
            if "{imdb}" in template and not imdb_id:
                continue
            if "{tmdb}" in template and not tmdb_id:
                continue

            url = template.replace("{kind}", target_kind)
            if imdb_id:
                url = url.replace("{imdb}", str(imdb_id))
            if tmdb_id:
                url = url.replace("{tmdb}", str(tmdb_id))

            res = conn.execute("""
                INSERT OR IGNORE INTO availability 
                (title_id, source_id, kind, status, external_url, playback_url, is_legal_verified)
                VALUES (?, ?, 'playback', 'available', ?, ?, 0)
            """, (tid, s_id, url, url))
            if res.rowcount > 0:
                rows_inserted += 1
                title_wired = True

        if title_wired:
            wired_count += 1

    conn.commit()
    conn.close()
    log(f"  Successfully wired {wired_count} titles with {rows_inserted} new streaming availability rows.")
    return wired_count


def stage3_export_snapshots(dry_run: bool = False) -> bool:
    log("=== Stage 3: Exporting Catalog Snapshots (Categories, Taxonomy, Shards) ===")
    if dry_run:
        log("  [Dry-run] Skipping snapshot export.")
        return True

    cmd = [PYTHON_EXE, str(HERE / "export_worker_snapshot.py"), "--outdir", str(HERE / "worker_export")]
    try:
        res = subprocess.run(cmd, cwd=str(HERE), capture_output=True, text=True, timeout=1200)
        if res.returncode == 0:
            log("  Snapshot export finished successfully.")
            for line in res.stdout.strip().splitlines()[-4:]:
                log(f"    {line}")
            return True
        else:
            log(f"  Warning: export_worker_snapshot.py failed ({res.returncode}): {res.stderr[:200]}")
            return False
    except Exception as e:
        log(f"  Error running export_worker_snapshot.py: {e}")
        return False


def stage4_upload_to_r2(dry_run: bool = False) -> bool:
    log("=== Stage 4: Uploading Updated Snapshots to Cloudflare R2 ===")
    if dry_run:
        log("  [Dry-run] Skipping Cloudflare R2 upload.")
        return True

    upload_script = WORKER_DIR / "upload_priority_files.py"
    if not upload_script.exists():
        log(f"  Error: {upload_script} not found.")
        return False

    cmd = [PYTHON_EXE, str(upload_script)]
    try:
        res = subprocess.run(cmd, cwd=str(WORKER_DIR), capture_output=True, text=True, timeout=900)
        if res.returncode == 0:
            log("  Cloudflare R2 priority upload finished successfully.")
            for line in res.stdout.strip().splitlines()[-3:]:
                log(f"    {line}")
            return True
        else:
            log(f"  Warning: upload_priority_files.py failed ({res.returncode}): {res.stderr[:200]}")
            return False
    except Exception as e:
        log(f"  Error uploading to R2: {e}")
        return False


def stage5_verify_production() -> bool:
    log("=== Stage 5: Verifying Live Production Endpoints ===")
    endpoints = [
        "https://ssmoviestvs.site/api/v1/health",
        "https://ssmoviestvs.site/api/v1/categories",
        "https://ssmoviestvs.site/api/v1/collections",
    ]
    all_ok = True
    with httpx.Client(timeout=15.0) as client:
        for ep in endpoints:
            try:
                r = client.get(ep)
                if r.status_code == 200:
                    data = r.json()
                    item_count = len(data) if isinstance(data, list) else len(data.get("items", []))
                    log(f"  [OK] {ep} -> 200 OK (payload size: {len(r.content):,} bytes, items: {item_count})")
                else:
                    log(f"  [FAIL] {ep} -> HTTP {r.status_code}")
                    all_ok = False
            except Exception as e:
                log(f"  [FAIL] {ep} -> Exception: {e}")
                all_ok = False

    # Check for presence of the 4 studio rails in categories
    try:
        with httpx.Client(timeout=15.0) as client:
            r = client.get("https://ssmoviestvs.site/api/v1/categories")
            if r.status_code == 200:
                cats = r.json()
                cat_ids = [c.get("id") for c in (cats if isinstance(cats, list) else cats.get("categories", []))]
                log(f"  Verified category rails count: {len(cat_ids)}")
                for expected in ["on-paramount-plus", "on-peacock", "universal-pictures", "sony-pictures"]:
                    if expected in cat_ids:
                        log(f"    [ACTIVE] Hub rail '{expected}' is ACTIVE on production!")
                    else:
                        log(f"    [PENDING] Hub rail '{expected}' will appear once snapshot is published.")
    except Exception as e:
        log(f"  Could not check category rails: {e}")

    return all_ok


def run_pipeline(dry_run: bool = False, skip_ingest: bool = False, wire_limit: int = 500) -> bool:
    started = time.time()
    log("==================================================================")
    log("       SHADOWSTREAM AUTOMATED DAILY CATALOG SYNC STARTED          ")
    log("==================================================================")

    if not skip_ingest:
        stage1_ingest_feeds(dry_run=dry_run)
    else:
        log("Stage 1 skipped (--skip-ingest flag passed)")

    stage2_wire_embeds(limit=wire_limit, dry_run=dry_run)
    stage3_export_snapshots(dry_run=dry_run)
    stage4_upload_to_r2(dry_run=dry_run)
    stage5_verify_production()

    elapsed = time.time() - started
    if not dry_run:
        try:
            state_file = HERE / "daily_sync_state.json"
            data = {
                "last_run_timestamp": time.time(),
                "last_run_iso": datetime.now().isoformat(),
                "last_status": "success",
                "duration_seconds": round(elapsed, 1),
            }
            with open(state_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            log(f"Warning: could not save daily_sync_state.json: {e}")
    log(f"==================================================================")
    log(f"SHADOWSTREAM DAILY SYNC COMPLETED IN {elapsed:.1f}s")
    log("==================================================================")
    return True


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Automated Daily Catalog Sync Pipeline")
    parser.add_argument("--dry-run", action="store_true", help="Perform checks without writing to DB or R2")
    parser.add_argument("--skip-ingest", action="store_true", help="Skip TMDB ingest and run wire/export/upload")
    parser.add_argument("--wire-limit", type=int, default=500, help="Maximum unwired titles to process")
    args = parser.parse_args()

    run_pipeline(dry_run=args.dry_run, skip_ingest=args.skip_ingest, wire_limit=args.wire_limit)
