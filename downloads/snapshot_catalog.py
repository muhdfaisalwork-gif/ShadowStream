"""
snapshot_catalog.py — Dump the live catalog.db to a directory of JSON
files suitable for serving from a Cloudflare Worker + R2.

Output: G:\\streaming app\\downloads\\snapshots\\
  meta.json          ~1 KB
  sources.json       ~2 KB
  collections.json   ~10 KB
  genres.json        ~2 KB
  countries.json     ~3 KB
  languages.json     ~5 KB
  audience_tags.json ~1 KB
  by_type.json       ~1 KB
  by_decade.json     ~1 KB
  titles-lite.json   ~5 MB   (id, slug, title, year, type, rating, popularity, poster, backdrop, runtime)
  titles-by-type/    (movies, tv, anime, short_drama) ~50-80 MB total
  search.json        ~10 MB

The Worker reads these on cold start and caches them in memory.
"""
import json, os, sqlite3, sys, time
from pathlib import Path

DB = Path(r"G:\streaming app\scraper\catalog.db")
OUT_DIR = Path(r"G:\streaming app\downloads\snapshots")
TITLES_BY_TYPE_DIR = OUT_DIR / "titles-by-type"


def q(cur, sql, params=()):
    return [dict(r) for r in cur.execute(sql, params)]


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    size = path.stat().st_size / 1024 / 1024
    return size


def main():
    if not DB.exists():
        print(f"ERROR: {DB} not found")
        sys.exit(1)
    c = sqlite3.connect(str(DB))
    c.row_factory = sqlite3.Row
    cur = c.cursor()

    started = time.time()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    if TITLES_BY_TYPE_DIR.exists():
        import shutil
        shutil.rmtree(TITLES_BY_TYPE_DIR)
    TITLES_BY_TYPE_DIR.mkdir(parents=True, exist_ok=True)

    print("dumping taxonomy tables...")
    meta = {
        "built_at": int(time.time()),
        "source": "catalog.db",
        "title_count": cur.execute("SELECT COUNT(*) FROM titles").fetchone()[0],
    }
    write_json(OUT_DIR / "meta.json", meta)

    sources = q(cur, "SELECT * FROM sources")
    write_json(OUT_DIR / "sources.json", sources)

    cols = q(cur, "SELECT * FROM collections")
    write_json(OUT_DIR / "collections.json", cols)

    genres = q(cur, "SELECT * FROM genres")
    write_json(OUT_DIR / "genres.json", genres)

    countries = q(cur, "SELECT * FROM countries")
    write_json(OUT_DIR / "countries.json", countries)

    languages = q(cur, "SELECT * FROM languages")
    write_json(OUT_DIR / "languages.json", languages)

    audience_tags = q(cur, "SELECT * FROM audience_tags")
    write_json(OUT_DIR / "audience_tags.json", audience_tags)

    by_type = q(cur, "SELECT type, COUNT(*) AS count FROM titles GROUP BY type ORDER BY count DESC")
    write_json(OUT_DIR / "by_type.json", by_type)

    by_decade = q(cur, """
        SELECT (year / 10) * 10 AS decade, COUNT(*) AS count
        FROM titles WHERE year IS NOT NULL AND year > 1800
        GROUP BY decade ORDER BY decade DESC
    """)
    write_json(OUT_DIR / "by_decade.json", by_decade)

    print("dumping titles (full detail, by type)...")
    types = ["movie", "tv", "anime", "short_drama"]
    full_fields = """
        id, slug, title, original_title, type, year, runtime, rating, rating_count,
        popularity, overview, tagline, poster, backdrop, trailer_url,
        tmdb_id, imdb_id, status, is_anime, is_short_drama,
        release_date, certification
    """
    by_type_titles = {}
    for t in types:
        rows = q(cur, f"SELECT {full_fields} FROM titles WHERE type = ? ORDER BY id", (t,))
        for r in rows:
            for k in ("rating", "popularity"):
                if r.get(k) is not None:
                    r[k] = round(float(r[k]), 3)
        write_json(TITLES_BY_TYPE_DIR / f"{t}.json", rows)
        by_type_titles[t] = rows
        print(f"  {t}: {len(rows):,} titles")

    print("dumping titles-lite (compact list view)...")
    lite_fields = """
        id, slug, title, type, year, rating, rating_count, popularity,
        poster, backdrop, runtime, is_anime, is_short_drama
    """
    all_titles_lite = q(cur, f"""
        SELECT {lite_fields} FROM titles
        ORDER BY type, popularity DESC NULLS LAST, id
    """)
    for t in all_titles_lite:
        for k in ("rating", "popularity"):
            if t.get(k) is not None:
                t[k] = round(float(t[k]), 3)
    size = write_json(OUT_DIR / "titles-lite.json", all_titles_lite)
    print(f"  {len(all_titles_lite):,} titles, {size:.1f} MB")

    print("dumping junction tables...")
    write_json(OUT_DIR / "title_genres.json", q(cur, "SELECT * FROM title_genres"))
    write_json(OUT_DIR / "title_collections.json", q(cur, "SELECT * FROM title_collections"))
    write_json(OUT_DIR / "title_countries.json", q(cur, "SELECT * FROM title_countries"))
    write_json(OUT_DIR / "title_languages.json", q(cur, "SELECT * FROM title_languages"))
    write_json(OUT_DIR / "availability.json", q(cur, """
        SELECT title_id, source_id, status, external_url, playback_url,
               quality_options, format_options, last_checked_at, last_success_at
        FROM availability WHERE playback_url IS NOT NULL
    """))

    print("building search index...")
    search_index = []
    for t in all_titles_lite:
        title_lower = (t.get("title") or "").lower()
        slug = t.get("slug") or ""
        search_index.append({
            "id": t["id"],
            "slug": slug,
            "title": t.get("title") or "",
            "year": t.get("year"),
            "type": t.get("type"),
            "rating": t.get("rating"),
            "poster": t.get("poster"),
            "_t": title_lower,
            "_s": slug,
        })
    write_json(OUT_DIR / "search.json", search_index)

    elapsed = time.time() - started
    total_mb = sum(p.stat().st_size for p in OUT_DIR.rglob("*.json")) / 1024 / 1024
    print()
    print("=" * 60)
    print(f"wrote {len(list(OUT_DIR.rglob('*.json')))} JSON files to {OUT_DIR}")
    print(f"total size: {total_mb:.1f} MB")
    print(f"elapsed: {elapsed:.1f}s")
    print()
    for p in sorted(OUT_DIR.rglob("*.json")):
        size_mb = p.stat().st_size / 1024 / 1024
        rel = p.relative_to(OUT_DIR)
        print(f"  {str(rel):50s} {size_mb:7.2f} MB")
    print("=" * 60)


if __name__ == "__main__":
    main()
