"""
daily_refresh.py — the 24-hour catalogue update loop.

Every night this walks the endpoints whose contents actually change day to day,
refreshes the metadata for the titles they touch, and re-publishes the affected
R2 snapshots. It deliberately does NOT do a full reindex: a 200K crawl daily
would be pointless churn and would hammer TMDB.

What runs each cycle:
  1. Freshness feeds   now_playing, upcoming, on_the_air, airing_today, trending
  2. Metadata refresh  full /movie/{id} and /tv/{id} for the titles those feeds
                       returned, so overview, rating, runtime and status stay
                       current instead of being frozen at first ingest
  3. Watch providers   MDBList, when configured, for "where can I watch it"
  4. Episode top-up    TVDB for episodic titles that still have no seasons
  5. Export + publish  re-emit the changed R2 snapshots and re-run the upload

Run:
    python daily_refresh.py                # one cycle
    python daily_refresh.py --dry-run
    python daily_refresh.py --no-publish   # refresh the DB but do not touch R2
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sqlite3
import sys
import time
from pathlib import Path

import httpx
from dotenv import dotenv_values

HERE = Path(__file__).parent
DB = HERE / "catalog.db"
ENV = dotenv_values(str(HERE / ".env"))
TMDB_KEY = ENV.get("TMDB_API_KEY") or ""
TMDB_TOKEN = ENV.get("TMDB_ACCESS_TOKEN") or ""
MDBLIST_KEY = ENV.get("MDBLIST_API_KEY") or ""
TVDB_KEY = ENV.get("TVDB_API_KEY") or ""

TMDB = "https://api.themoviedb.org/3"
CONCURRENCY = 12

# (path, kind, limit) — the fast-moving ends of the catalogue.
FEEDS = [
    # 1. Theatrical & Broadcast Fast Feeds
    ("movie/now_playing", "movie", 60),
    ("movie/upcoming", "movie", 60),
    ("tv/on_the_air", "tv", 60),
    ("tv/airing_today", "tv", 60),
    ("trending/movie/week", "movie", 40),
    ("trending/tv/week", "tv", 40),
    # 2. Anime & Animations (Genre 16)
    ("discover/tv?with_genres=16&sort_by=popularity.desc", "tv", 60),
    ("discover/tv?with_genres=16&with_original_language=ja&sort_by=popularity.desc", "tv", 60),
    ("discover/movie?with_genres=16&sort_by=popularity.desc", "movie", 40),
    # 3. Streaming Platforms (Netflix: 8, Disney+: 337, Prime: 9, Apple TV+: 350, Max: 1899, Crunchyroll: 283)
    ("discover/tv?with_watch_providers=8|337|9|350|1899|283&watch_region=US&sort_by=popularity.desc", "tv", 60),
    ("discover/movie?with_watch_providers=8|337|9|350|1899&watch_region=US&sort_by=popularity.desc", "movie", 40),
]


def log(msg: str) -> None:
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def slugify(s: str) -> str:
    out = []
    for ch in (s or "").lower().strip():
        out.append(ch if ch.isalnum() else "-")
    slug = "".join(out)
    while "--" in slug:
        slug = slug.replace("--", "-")
    return slug.strip("-")[:120] or "untitled"


def infer_status(kind: str, raw: dict) -> str:
    """Map TMDB's release/air state onto our status vocabulary."""
    if kind == "movie":
        if raw.get("status") in ("Released",):
            return "released"
        if raw.get("status") in ("Post Production", "In Production", "Planned"):
            return "upcoming"
        if raw.get("status") == "Canceled":
            return "ended"
    else:
        if raw.get("status") in ("Returning Series", "Ended"):
            return "ended" if raw.get("status") == "Ended" else "ongoing"
        if raw.get("status") in ("In Production", "Planned"):
            return "upcoming"
        if raw.get("status") == "Canceled":
            return "ended"
    return ""


async def collect_feed(client, sem, path, kind, limit):
    out = []
    base_path = path.split("?")[0]
    extra_params = {}
    if "?" in path:
        for part in path.split("?")[1].split("&"):
            if "=" in part:
                k, v = part.split("=", 1)
                extra_params[k] = v

    for page in (1, 2):
        if len(out) >= limit:
            break
        async with sem:
            try:
                params = {"api_key": TMDB_KEY, "page": page, "language": "en-US", **extra_params}
                r = await client.get(
                    f"{TMDB}/{base_path}",
                    params=params,
                    timeout=30.0,
                )
                r.raise_for_status()
                data = r.json()
            except Exception as e:
                log(f"  feed {path} p{page} failed: {e}")
                return out
        for item in data.get("results", []):
            if item.get("id"):
                out.append((item["id"], kind))
    return out[:limit]


async def refresh_title(client, sem, tmdb_id, kind, conn, dry):
    async with sem:
        try:
            r = await client.get(
                f"{TMDB}/{kind}/{tmdb_id}",
                params={"api_key": TMDB_KEY, "language": "en-US", "append_to_response": "external_ids"},
                timeout=30.0,
            )
            r.raise_for_status()
            d = r.json()
        except Exception:
            return False

    if dry:
        return True

    if kind == "movie":
        date = d.get("release_date") or ""
        title = d.get("title") or d.get("original_title") or ""
        runtime = d.get("runtime")
    else:
        date = d.get("first_air_date") or ""
        title = d.get("name") or d.get("original_name") or ""
        runtime = d.get("episode_run_time") or []
        runtime = runtime[0] if runtime else None

    year = int(date[:4]) if len(date) >= 4 and date[:4].isdigit() else None
    status = infer_status(kind, d)
    poster = d.get("poster_path")
    backdrop = d.get("backdrop_path")

    cur = conn.cursor()
    if cur.execute("SELECT 1 FROM titles WHERE tmdb_id = ?", (tmdb_id,)).fetchone():
        sets, vals = [], []
        for col, val in [
            ("title", title[:300] or None),
            ("year", year),
            ("release_date", date[:10] if date else None),
            ("runtime", runtime),
            ("rating", round(float(d.get("vote_average") or 0), 2)),
            ("rating_count", int(d.get("vote_count") or 0)),
            ("popularity", round(float(d.get("popularity") or 0), 4)),
            ("overview", (d.get("overview") or "")[:2000] or None),
            ("tagline", d.get("tagline")),
            ("poster", f"https://image.tmdb.org/t/p/w500{poster}" if poster else None),
            ("backdrop", f"https://image.tmdb.org/t/p/w1280{backdrop}" if backdrop else None),
        ]:
            if val not in (None, ""):
                sets.append(f"{col} = ?")
                vals.append(val)
        if status:
            sets.append("status = ?")
            vals.append(status)
        sets.append("last_verified_at = ?")
        vals.append(int(time.time()))
        if sets:
            vals.append(tmdb_id)
            cur.execute(f"UPDATE titles SET {', '.join(sets)} WHERE tmdb_id = ?", vals)
    else:
        cur.execute(
            "INSERT OR IGNORE INTO titles "
            "(tmdb_id, id, slug, title, type, year, release_date, runtime, certification, "
            " rating, rating_count, popularity, overview, tagline, poster, backdrop, status, "
            " metadata_state, last_verified_at) "
            "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (
                tmdb_id, tmdb_id, slugify(title), title[:300], kind, year,
                date[:10] if date else None, runtime, None,
                round(float(d.get("vote_average") or 0), 2),
                int(d.get("vote_count") or 0),
                round(float(d.get("popularity") or 0), 4),
                (d.get("overview") or "")[:2000] or None,
                d.get("tagline"),
                f"https://image.tmdb.org/t/p/w500{poster}" if poster else None,
                f"https://image.tmdb.org/t/p/w1280{backdrop}" if backdrop else None,
                status or "released", "complete", int(time.time()),
            ),
        )
    return True


async def cycle(args):
    if not TMDB_KEY:
        print("FATAL: TMDB_API_KEY missing from scraper/.env")
        sys.exit(1)

    # Long busy-wait: this is a writer and the episode fill / subtitle harvest
    # hold the write lock for long stretches. At the 60s default it died with
    # "database is locked" on every night it overlapped a running ingest.
    conn = sqlite3.connect(str(DB), timeout=900)
    conn.execute("PRAGMA journal_mode = WAL")
    before = conn.execute("SELECT COUNT(*) FROM titles").fetchone()[0]
    log(f"catalogue before: {before:,}")

    headers = {"Authorization": f"Bearer {TMDB_TOKEN}"} if TMDB_TOKEN else {}
    sem = asyncio.Semaphore(CONCURRENCY)
    started = time.time()

    async with httpx.AsyncClient(headers=headers, limits=httpx.Limits(max_connections=30)) as client:
        targets: list[tuple[int, str]] = []
        for path, kind, limit in FEEDS:
            got = await collect_feed(client, sem, path, kind, limit)
            targets.extend(got)
            log(f"feed {path:<26} -> {len(got)} titles")

        # Dedupe, keeping the first kind seen (a title can be in both feeds).
        seen = set()
        uniq = []
        for tid, kind in targets:
            if tid not in seen:
                seen.add(tid)
                uniq.append((tid, kind))
        log(f"{len(uniq)} unique titles to refresh")

        ok = 0
        for i in range(0, len(uniq), CONCURRENCY):
            chunk = uniq[i:i + CONCURRENCY]
            res = await asyncio.gather(*[refresh_title(client, sem, t, k, conn, args.dry_run) for t, k in chunk])
            ok += sum(1 for r in res if r)
            if (i // CONCURRENCY) % 5 == 0:
                log(f"  refreshed {ok}/{len(uniq)}")
            if not args.dry_run:
                conn.commit()

    if not args.dry_run:
        conn.commit()
    after = conn.execute("SELECT COUNT(*) FROM titles").fetchone()[0]
    log(f"catalogue after: {after:,} (+{after - before:,}) in {time.time() - started:.0f}s")

    for q, lbl in [
        ("SELECT COUNT(*) FROM titles WHERE status = 'ongoing'", "ongoing series"),
        ("SELECT COUNT(*) FROM titles WHERE status = 'upcoming'", "upcoming"),
        ("SELECT COUNT(*) FROM titles WHERE year >= 2024", "released 2024+"),
        ("SELECT COUNT(*) FROM titles WHERE type = 'anime'", "animation"),
    ]:
        log(f"  {lbl:<16} {conn.execute(q).fetchone()[0]:,}")
    conn.close()

    if args.dry_run:
        log("dry run — nothing written")
        return

    # Publishing is opt-in on purpose.
    #
    # The seasons/episodes dataset is 223 MB across 162 objects, and this
    # machine pushes R2 at roughly 90-200 s per object. Re-uploading it every
    # night would occupy the machine for ~10 hours a day and accomplish nothing,
    # because seasons only change when a new episodic title is ingested. The
    # nightly job therefore refreshes the database and stops; the heavy
    # snapshot publish runs on its own schedule via export_catalog_seasons.py
    # + upload_seasons_to_r2.py, or on demand with --publish.
    if not args.publish:
        log("database refreshed; skipping snapshot publish (use --publish to force it)")
        return

    export = HERE / "export_catalog_seasons.py"
    if export.is_file():
        log("re-exporting seasons/episodes...")
        import subprocess
        subprocess.run([sys.executable, str(export)], cwd=str(HERE))
        upload = HERE.parent / "downloads" / "streamapp-worker" / "upload_seasons_to_r2.py"
        if upload.is_file():
            log("uploading changed snapshots to R2 (slow — hours, not minutes)...")
            subprocess.run([sys.executable, str(upload), "--workers", "2"], cwd=str(upload.parent))
    log("cycle complete")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--no-publish", action="store_true", help="alias kept for clarity; publish is off unless --publish")
    ap.add_argument("--publish", action="store_true",
                    help="also re-export and upload the R2 snapshots (hours, not minutes)")
    args = ap.parse_args()
    asyncio.run(cycle(args))


if __name__ == "__main__":
    main()
