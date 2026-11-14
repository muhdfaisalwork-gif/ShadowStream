"""
ingest_tmdb_episodes.py — fill season + episode gaps from TMDB.

Why this exists
---------------
TVDB was the only episode source and it moved the needle by ONE title across
the whole catalogue. The gap is stark:

    TV / anime / short titles      58,741
    with season data                3,424   (5.8%)
    without season data            55,317

TVDB indexes long-running European/US programming well and has almost no
coverage of Pakistani dramas, talk shows and regional titles, which is what
most of the catalogue actually is. Game of Thrones, for example, returns 0
seasons from it.

TMDB is the source the 201K titles came from in the first place, so it is the
obvious place to look next, and the key is already provisioned.

Strategy: for every episodic title with a tmdb_id and no seasons, walk
/tv/{id} then /tv/{id}/season/{n} until the API reports no more seasons.
Both endpoints are cheap. Dedupe on the (title_id, season_number) pair so a
re-run is safe.

Resumable via a checkpoint file.

Run:
    python ingest_tmdb_episodes.py --limit 50
    python ingest_tmdb_episodes.py
"""

from __future__ import annotations

import argparse
import itertools
import json
import sqlite3
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen
from urllib.error import HTTPError

HERE = Path(__file__).parent
DB = HERE / "catalog.db"
STATE = HERE / ".tmdb_episodes_state.json"
LOG_PATH = HERE / "tmdb_episodes.log"
BASE = "https://api.themoviedb.org/3"
UA = "ShadowStreamTMDBEpisodes/1.0"
CONCURRENCY = 6
TIMEOUT = 25
MAX_SEASONS = 100


def env_values() -> dict:
    vals = {}
    p = HERE / ".env"
    if p.is_file():
        for line in p.read_text(encoding="utf-8", errors="replace").splitlines():
            s = line.strip()
            if s and not s.startswith("#") and "=" in s:
                k, v = s.split("=", 1)
                vals[k.strip()] = v.strip()
    return vals


ENV = env_values()
API_KEY = ENV.get("TMDB_API_KEY", "")


def api(path: str) -> dict | None:
    url = f"{BASE}{path}?api_key={quote(API_KEY)}&language=en-US"
    req = Request(url, headers={"User-Agent": UA})
    try:
        with urlopen(req, timeout=TIMEOUT) as r:
            return json.loads(r.read().decode("utf-8", errors="replace"))
    except HTTPError as e:
        if e.code == 404:
            return None
        return None
    except Exception:
        return None


def upsert(conn, cursor, table, row):
    if table == "seasons":
        cursor.execute(
            "INSERT OR REPLACE INTO seasons "
            "(id, title_id, season_number, name, overview, poster, air_date, episode_count) "
            "VALUES (?,?,?,?,?,?,?,?)", row)
    else:
        cursor.execute(
            "INSERT OR REPLACE INTO episodes "
            "(id, season_id, episode_number, title, overview, thumbnail, air_date, runtime) "
            "VALUES (?,?,?,?,?,?,?,?)", row)


def fetch_title(tmdb_id: int, ongoing_only: bool = False) -> tuple[list, list]:
    """Network only. Returns (season_rows, episode_rows).

    Deliberately does no database work: sqlite3 is not thread-safe across
    workers, so HTTP is parallelised and the writes are serialised in main().
    That is the same split this repo's other ingesters use.
    """
    detail = api(f"/tv/{tmdb_id}")
    if not detail:
        return [], []
    s_rows: list = []
    e_rows: list = []
    raw_seasons = detail.get("seasons") or []
    if ongoing_only and len(raw_seasons) > 2:
        # For ongoing shows, only re-fetch the 2 most recent seasons to pick up newly aired episodes fast
        raw_seasons = sorted(raw_seasons, key=lambda x: x.get("season_number") or 0)[-2:]
    for sm in raw_seasons:
        num = sm.get("season_number")
        if num is None:
            continue
        sid = tmdb_id * 1000 + num
        season = api(f"/tv/{tmdb_id}/season/{num}")
        eps = (season or {}).get("episodes") or []
        s_rows.append((
            sid, num, sm.get("name") or f"Season {num}",
            (sm.get("overview") or "")[:2000] or None,
            f"https://image.tmdb.org/t/p/w500{sm['poster_path']}" if sm.get("poster_path") else None,
            sm.get("air_date"), len(eps)))
        for e in eps:
            en = e.get("episode_number")
            if en is None:
                continue
            e_rows.append((
                sid, sid * 1000 + en, en, (e.get("name") or f"Episode {en}")[:300],
                (e.get("overview") or "")[:2000] or None,
                f"https://image.tmdb.org/t/p/w500{e['still_path']}" if e.get("still_path") else None,
                e.get("air_date"), e.get("runtime")))
    return s_rows, e_rows


def load_state() -> dict:
    if STATE.is_file():
        try:
            return json.loads(STATE.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {"done": [], "matched": 0, "no_data": 0, "seasons": 0, "episodes": 0, "errors": 0}


def save_state(st: dict) -> None:
    STATE.write_text(json.dumps(st), encoding="utf-8")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--ongoing-only", action="store_true", help="Refresh latest seasons/episodes for ongoing/airing shows")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    if not API_KEY:
        print("FATAL: TMDB_API_KEY not set in scraper/.env")
        sys.exit(3)

    conn = sqlite3.connect(str(DB), timeout=900)
    conn.execute("PRAGMA journal_mode = WAL")
    cur = conn.cursor()

    state = load_state()
    done = set(state.get("done", []))

    if args.ongoing_only:
        pending = cur.execute("""
            SELECT t.id, t.tmdb_id FROM titles t
            WHERE t.type IN ('tv','anime','short_drama')
              AND LOWER(COALESCE(t.status, '')) IN ('ongoing', 'returning series', 'airing')
              AND t.tmdb_id IS NOT NULL AND t.tmdb_id > 0
            ORDER BY t.popularity DESC
        """).fetchall()
        print(f"ongoing episodic titles to refresh latest episodes: {len(pending):,}")
    else:
        rows = cur.execute("""
            SELECT t.id, t.tmdb_id FROM titles t
            WHERE t.type IN ('tv','anime','short_drama')
              AND t.tmdb_id IS NOT NULL AND t.tmdb_id > 0
              AND NOT EXISTS (SELECT 1 FROM seasons s WHERE s.title_id = t.id)
        """).fetchall()
        pending = [r for r in rows if str(r[0]) not in done]
        print(f"episodic titles with a tmdb_id and NO seasons: {len(rows):,}")
        print(f"already attempted: {len(done):,}   pending: {len(pending):,}")

    if args.dry_run:
        for r in pending[:8]:
            print(f"  would fetch tmdbId={r[1]} for title {r[0]}")
        return
    if args.limit:
        pending = pending[: args.limit]

    matched = state.get("matched", 0)
    no_data = state.get("no_data", 0)
    s_tot = state.get("seasons", 0)
    e_tot = state.get("episodes", 0)
    errors = state.get("errors", 0)
    started = time.time()

    def work(row):
        tid, tmdb_id = row
        try:
            s_rows, e_rows = fetch_title(tmdb_id, ongoing_only=args.ongoing_only)
            return (tid, s_rows, e_rows, False)
        except Exception:
            return (tid, [], [], True)

    # Bounded window, not one future per pending row.
    #
    # Submitting all ~35,000 futures at once held every row and every completed
    # result in memory: the process climbed past 800 MB and stopped writing
    # entirely, twice. A sliding window keeps memory flat and the writes
    # flowing, and lets the checkpoint reflect real progress.
    processed = 0
    with ThreadPoolExecutor(max_workers=CONCURRENCY) as ex:
        it = iter(pending)
        window = list(itertools.islice(it, CONCURRENCY * 8))
        while window:
            futs = [ex.submit(work, r) for r in window]
            for fut in as_completed(futs):
                tid, s_rows, e_rows, err = fut.result()
                processed += 1
                done.add(str(tid))
                if err:
                    errors += 1
                    continue
                if not s_rows:
                    no_data += 1
                    continue
                # All database writes happen here, on one thread, one cursor.
                for (sid, num, name, ov, poster, air, cnt) in s_rows:
                    upsert(conn, cur, "seasons", (sid, tid, num, name, ov, poster, air, cnt))
                for (sid, eid, en, name, ov, still, air, rt) in e_rows:
                    upsert(conn, cur, "episodes", (eid, sid, en, name, ov, still, air, rt))
                matched += 1
                s_tot += len(s_rows)
                e_tot += len(e_rows)

                if processed % 20 == 0:
                    conn.commit()
                    if not args.ongoing_only:
                        state.update({"done": sorted(done), "matched": matched, "no_data": no_data,
                                      "seasons": s_tot, "episodes": e_tot, "errors": errors})
                        save_state(state)
                    rate = processed / max(time.time() - started, 1)
                    with LOG_PATH.open("a", encoding="utf-8") as lf:
                        lf.write(f"[{time.strftime('%H:%M:%S')}] {processed}/{len(pending)} "
                                 f"matched={matched} no_data={no_data} seasons={s_tot} "
                                 f"episodes={e_tot} ({rate:.2f}/s)\n")
            nxt = list(itertools.islice(it, CONCURRENCY * 8))
            if not nxt:
                break
            window = nxt

    conn.commit()
    if not args.ongoing_only:
        state.update({"done": sorted(done), "matched": matched, "no_data": no_data,
                      "seasons": s_tot, "episodes": e_tot, "errors": errors})
        save_state(state)
    print(f"\nthis run: matched {matched}, no data {no_data}, errors {errors}")
    print(f"seasons now: {conn.execute('SELECT COUNT(*) FROM seasons').fetchone()[0]:,}")
    print(f"episodes now: {conn.execute('SELECT COUNT(*) FROM episodes').fetchone()[0]:,}")
    print(f"titles with seasons: {conn.execute('SELECT COUNT(DISTINCT title_id) FROM seasons').fetchone()[0]:,}")
    conn.close()


if __name__ == "__main__":
    main()
