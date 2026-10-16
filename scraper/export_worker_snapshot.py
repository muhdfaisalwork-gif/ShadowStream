"""
export_worker_snapshot.py — Exports catalog.db into JSON files for the
existing Cloudflare Worker + R2 static-snapshot architecture at
downloads/streamapp-worker/. Reuses that same design (proven to work within
Cloudflare's free-tier CPU limits at this scale), just re-run against the
current, fully-fixed catalog.db and extended with per-title availability
and precomputed home-page categories, which the original snapshot lacked.

Generated with qwen2.5-coder:7b via Ollama MCP, assembled and bug-fixed by
Claude (export_taxonomy used one generic SELECT id,slug,name for all 5
tables, silently dropping is_legal/flag/type; also missing UTF-8 encoding,
which would have corrupted flag emoji and non-English titles).
"""
from __future__ import annotations
import argparse
import json
import os
import sqlite3
import time


def ensure_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)


def export_meta(conn: sqlite3.Connection, outdir: str) -> None:
    title_count = conn.execute("SELECT COUNT(*) FROM titles").fetchone()[0]
    data = {"title_count": title_count, "built_at": int(time.time()), "source": "catalog.db local export"}
    with open(os.path.join(outdir, "meta.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)


def export_taxonomy(conn: sqlite3.Connection, outdir: str) -> None:
    # 1. Sources
    sources = [dict(r) for r in conn.execute("SELECT id, slug, name, is_legal FROM sources").fetchall()]
    with open(os.path.join(outdir, "sources.json"), "w", encoding="utf-8") as f:
        json.dump(sources, f, ensure_ascii=False)

    # 2. Genres with counts
    genre_counts = dict(conn.execute("SELECT genre_id, COUNT(title_id) FROM title_genres GROUP BY genre_id").fetchall())
    genres = []
    for r in conn.execute("SELECT id, slug, name FROM genres").fetchall():
        d = dict(r)
        cnt = genre_counts.get(d["id"], 0)
        d["title_count"] = cnt
        d["count"] = cnt
        genres.append(d)
    with open(os.path.join(outdir, "genres.json"), "w", encoding="utf-8") as f:
        json.dump(genres, f, ensure_ascii=False)

    # 3. Countries with counts
    country_counts = dict(conn.execute("SELECT country_id, COUNT(title_id) FROM title_countries GROUP BY country_id").fetchall())
    countries = []
    for r in conn.execute("SELECT id, code, name, flag FROM countries").fetchall():
        d = dict(r)
        cnt = country_counts.get(d["id"], 0)
        d["title_count"] = cnt
        d["count"] = cnt
        countries.append(d)
    with open(os.path.join(outdir, "countries.json"), "w", encoding="utf-8") as f:
        json.dump(countries, f, ensure_ascii=False)

    # 4. Languages with counts
    lang_counts = dict(conn.execute("SELECT language_id, COUNT(title_id) FROM title_languages GROUP BY language_id").fetchall())
    languages = []
    for r in conn.execute("SELECT id, code, name, flag FROM languages").fetchall():
        d = dict(r)
        cnt = lang_counts.get(d["id"], 0)
        d["title_count"] = cnt
        d["count"] = cnt
        languages.append(d)
    with open(os.path.join(outdir, "languages.json"), "w", encoding="utf-8") as f:
        json.dump(languages, f, ensure_ascii=False)

    # 5. Collections with counts, images, and individual collection files
    col_counts = dict(conn.execute("SELECT collection_id, COUNT(title_id) FROM title_collections GROUP BY collection_id").fetchall())
    ensure_dir(os.path.join(outdir, "collections"))
    collections = []
    for r in conn.execute("SELECT id, slug, name, type, poster, backdrop, overview FROM collections").fetchall():
        d = dict(r)
        cnt = col_counts.get(d["id"], 0)
        d["title_count"] = cnt
        d["count"] = cnt
        d["kind"] = d.get("type", "franchise")
        d["description"] = d.get("overview") or f"{d['name']} curated collection."

        # Franchise sagas sort chronologically (with unknown years last);
        # Studio hubs, streaming platforms, regional & thematic collections sort by popularity DESC.
        is_chronological = d.get("type") == "franchise" and d["slug"] not in (
            "pixar", "disney", "disney-classics", "marvel-universe", "dc-universe"
        )
        order_clause = (
            "CASE WHEN t.year IS NULL THEN 1 ELSE 0 END, t.year ASC, t.popularity DESC"
            if is_chronological
            else "t.popularity DESC, t.rating DESC"
        )

        # Fetch titles for this collection
        col_titles = []
        for tr in conn.execute(
            f"SELECT t.id, t.slug, t.title, t.year, t.type, t.rating, t.popularity, t.poster, t.backdrop "
            f"FROM titles t JOIN title_collections tc ON tc.title_id=t.id "
            f"WHERE tc.collection_id=? ORDER BY {order_clause}",
            (d["id"],)
        ).fetchall():
            td = dict(tr)
            td["year"] = sane_year(td.get("year"))
            col_titles.append(td)

        if not d.get("poster") and col_titles and col_titles[0].get("poster"):
            d["poster"] = col_titles[0]["poster"]
        if not d.get("backdrop") and col_titles and col_titles[0].get("backdrop"):
            d["backdrop"] = col_titles[0]["backdrop"]
        d["cover_image"] = d.get("backdrop") or d.get("poster")

        payload = {"items": col_titles, "total": len(col_titles), "collection": d}

        # Save individual collections/{slug}.json
        with open(os.path.join(outdir, "collections", f"{d['slug']}.json"), "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False)

        # Also save on-{slug}.json alias for streaming platforms
        if d["slug"] in ("netflix", "disney-plus", "max", "prime-video", "hulu", "apple-tv-plus", "paramount-plus", "peacock", "crunchyroll"):
            with open(os.path.join(outdir, "collections", f"on-{d['slug']}.json"), "w", encoding="utf-8") as f:
                json.dump(payload, f, ensure_ascii=False)
            if d["slug"] == "apple-tv-plus":
                with open(os.path.join(outdir, "collections", "on-apple-tv.json"), "w", encoding="utf-8") as f:
                    json.dump(payload, f, ensure_ascii=False)

        collections.append(d)

    with open(os.path.join(outdir, "collections.json"), "w", encoding="utf-8") as f:
        json.dump(collections, f, ensure_ascii=False)


def build_genre_map(conn: sqlite3.Connection) -> dict[int, list[dict]]:
    rows = conn.execute("SELECT tg.title_id, g.slug, g.name FROM title_genres tg JOIN genres g ON g.id=tg.genre_id")
    genre_map: dict[int, list[dict]] = {}
    for row in rows:
        genre_map.setdefault(row["title_id"], []).append({"slug": row["slug"], "name": row["name"]})
    return genre_map


def build_country_map(conn: sqlite3.Connection) -> dict[int, list[dict]]:
    rows = conn.execute(
        "SELECT tc.title_id, c.code, c.name, c.flag FROM title_countries tc JOIN countries c ON c.id=tc.country_id"
    )
    country_map: dict[int, list[dict]] = {}
    for row in rows:
        country_map.setdefault(row["title_id"], []).append({"code": row["code"], "name": row["name"], "flag": row["flag"]})
    return country_map


DOWNLOADABLE_SOURCE_TYPES = {"public_domain", "cc0", "cc_by_3", "cc_by_sa", "pexels_license"}


def load_scripted_flags(conn: sqlite3.Connection) -> dict[int, int]:
    """title_id -> is_scripted, from classify_scripted.py's side table.

    Deliberately a side table rather than a column on titles: titles is the
    hottest table in the DB and the ingests run against it concurrently.
    """
    try:
        return {
            r[0]: r[1]
            for r in conn.execute("SELECT title_id, is_scripted FROM title_classification")
        }
    except sqlite3.OperationalError:
        print("  (title_classification missing - run classify_scripted.py first; "
              "titles will be exported without the scripted flag)")
        return {}


def build_availability_map(conn: sqlite3.Connection) -> dict[int, list[dict]]:
    rows = conn.execute(
        "SELECT a.title_id, s.slug AS source_slug, s.name AS source_name, s.is_legal, s.type AS source_type, "
        "a.kind, a.status, a.external_url, a.playback_url, a.quality_options "
        "FROM availability a JOIN sources s ON s.id=a.source_id"
    )
    availability_map: dict[int, list[dict]] = {}
    for row in rows:
        # quality_options is a JSON array of alternate encodes recorded by
        # harvest_renditions.py. Progressive files have no HLS levels, so
        # without this the player's quality menu is empty.
        quality = None
        raw = row["quality_options"]
        if raw:
            try:
                parsed = json.loads(raw)
                if isinstance(parsed, list) and parsed:
                    quality = parsed
            except (TypeError, ValueError, json.JSONDecodeError):
                quality = None
        availability_map.setdefault(row["title_id"], []).append({
            "source": row["source_slug"],
            "sourceName": row["source_name"],
            "sourceIsLegal": bool(row["is_legal"]),
            "kind": row["kind"] or "playback",
            "status": row["status"],
            "url": row["external_url"],
            "playbackUrl": row["playback_url"],
            "isDownloadable": row["source_type"] in DOWNLOADABLE_SOURCE_TYPES and bool(row["playback_url"]),
            "qualityOptions": quality,
        })
    return availability_map


def build_watch_provider_map(conn: sqlite3.Connection) -> dict[int, list[dict]]:
    try:
        rows = conn.execute(
            "SELECT tsp.title_id, sp.slug, sp.name, sp.logo_url, "
            "tsp.availability_type, tsp.deep_link "
            "FROM title_streaming_providers tsp JOIN streaming_providers sp ON sp.id = tsp.provider_id "
            "WHERE tsp.region = 'US'"
        )
    except sqlite3.OperationalError:
        return {}
    provider_map: dict[int, list[dict]] = {}
    for row in rows:
        provider_map.setdefault(row["title_id"], []).append({
            "slug": row["slug"],
            "name": row["name"],
            "logo": row["logo_url"],
            "type": row["availability_type"],
            "deepLink": row["deep_link"],
        })
    return provider_map


_SCRIPTED = {}  # populated in main()
_SEASON_COUNTS: dict[int, int] = {}  # populated in main(); title_id -> distinct seasons
_AUDIO_LANGS: dict[int, list[str]] = {}  # title_id -> ["en","ja",...] ISO 639-1 codes


def build_season_counts(conn: sqlite3.Connection) -> dict[int, int]:
    """title_id -> number of DISTINCT season numbers.

    The Worker filters `min_seasons` on this, and there was no column or
    exported field for it anywhere, so the filter silently matched nothing and
    "Seasons & Episodes" came back empty. Counting DISTINCT season_number (not
    rows) matches how a viewer counts seasons: a duplicated ingest of season 1
    must not make a one-season show look multi-season.
    """
    return {
        r[0]: r[1]
        for r in conn.execute(
            "SELECT title_id, COUNT(DISTINCT season_number) FROM seasons GROUP BY title_id"
        )
    }


def build_audio_languages(conn: sqlite3.Connection) -> dict[int, list[str]]:
    """title_id -> sorted list of ISO-639-1 codes for available dubs.

    Populated today by backfill_audio_languages.py (TMDB spoken_languages),
    so the player can surface a real dub picker instead of the source's
    default. Empty list is the correct sentinel for 'no dub info recorded'.
    """
    out: dict[int, list[str]] = {}
    for tid, code in conn.execute(
        "SELECT al.title_id, l.code FROM title_audio_languages al "
        "JOIN languages l ON l.id = al.language_id"
    ):
        out.setdefault(tid, []).append(code)
    for v in out.values():
        v.sort()
    return out



MIN_PLAUSIBLE_YEAR = 1888  # Roundhay Garden Scene, earliest surviving film


def current_max_year() -> int:
    """Latest year we will treat as real. Two years of slack covers announced
    releases; anything beyond that is a parsing artefact, not a release."""
    from datetime import date
    return date.today().year + 2


def sane_year(year):
    """Return the year, or None if it is not a plausible release year.

    640 C-dramas were ingested with year=2521 — a Chinese sexagenary-cycle year
    read as a Gregorian one. Nothing downstream could recover the real year
    (no release_date, no tmdb_id on those rows), but publishing 2521 meant
    `sort=newest` led with them, they got their own decade bucket, and they
    passed `year_min=2024`. Publishing null instead keeps them browsable and
    pushes them to the end, without inventing a year we do not know.
    """
    try:
        y = int(year)
    except (TypeError, ValueError):
        return None
    if y < MIN_PLAUSIBLE_YEAR or y > current_max_year():
        return None
    return y


def title_row_to_dict(row: sqlite3.Row, genre_map: dict, country_map: dict, availability_map: dict,
                       watch_provider_map: dict | None = None) -> dict:
    row = {
        "id": row["id"],
        "slug": row["slug"],
        "title": row["title"],
        "originalTitle": row["original_title"],
        "type": row["type"],
        "year": sane_year(row["year"]),
        "releaseDate": row["release_date"],
        "runtime": row["runtime"],
        "rating": row["rating"],
        "ratingCount": row["rating_count"],
        "popularity": row["popularity"],
        "overview": row["overview"],
        "poster": row["poster"],
        "backdrop": row["backdrop"],
        "tmdbId": row["tmdb_id"],
        "imdbId": row["imdb_id"],
        "status": row["status"],
        "isAnime": bool(row["is_anime"]),
        "metadataState": row["metadata_state"],
        "genres": genre_map.get(row["id"], []),
        "countries": country_map.get(row["id"], []),
        "availability": availability_map.get(row["id"], []),
        "watchProviders": (watch_provider_map or {}).get(row["id"], []),
    }
    if row.get("type") in ("tv", "anime"):
        row["scripted"] = _SCRIPTED.get(row["id"])
    row["seasonCount"] = _SEASON_COUNTS.get(row["id"], 0)
    row["audioLanguages"] = _AUDIO_LANGS.get(row["id"], [])
    return row


def export_titles_by_type(conn: sqlite3.Connection, outdir: str, genre_map: dict, country_map: dict, availability_map: dict) -> None:
    ensure_dir(os.path.join(outdir, "titles-by-type"))
    for t in ["movie", "tv", "anime", "short_drama"]:
        rows = conn.execute("SELECT * FROM titles WHERE type = ?", (t,)).fetchall()
        items = [title_row_to_dict(r, genre_map, country_map, availability_map) for r in rows]
        with open(os.path.join(outdir, "titles-by-type", f"{t}.json"), "w", encoding="utf-8") as f:
            json.dump(items, f, ensure_ascii=False)
        print(f"Exported {len(items)} {t} titles")


def export_search_index(conn: sqlite3.Connection, outdir: str) -> None:
    """Sharded by first character of the lowercased title so a search request
    only ever loads one small shard (~4K titles) instead of scanning all
    ~102K in a single 27MB JSON blob — the same CPU/memory risk pagination
    fixed for browse, applied here to search."""
    rows = conn.execute("SELECT id, slug, title, year, type, rating, poster FROM titles").fetchall()
    shards: dict[str, list[dict]] = {}
    for r in rows:
        title_lower = (r["title"] or "").lower()
        first_char = title_lower[0] if title_lower and ('a' <= title_lower[0] <= 'z' or '0' <= title_lower[0] <= '9') else "_"
        shards.setdefault(first_char, []).append({
            "id": r["id"], "slug": r["slug"], "title": r["title"], "year": r["year"],
            "type": r["type"], "rating": r["rating"], "poster": r["poster"],
            "_t": title_lower, "_s": (r["slug"] or "").lower(),
        })

    ensure_dir(os.path.join(outdir, "search-shards"))
    for shard_key, items in shards.items():
        with open(os.path.join(outdir, "search-shards", f"{shard_key}.json"), "w", encoding="utf-8") as f:
            json.dump(items, f, ensure_ascii=False)
    with open(os.path.join(outdir, "search-shards", "index.json"), "w", encoding="utf-8") as f:
        json.dump({"shards": sorted(shards.keys()), "totalShards": len(shards)}, f, ensure_ascii=False)
    print(f"Search index sharded into {len(shards)} files")


def to_lite(full: dict) -> dict:
    """The compact record every list endpoint serves.

    `scripted` and `seasonCount` used to live only in the detail pages, so the
    list endpoints had nothing to filter on: `scripted=1` matched zero rows and
    `min_seasons=2` matched zero rows even once the filter was wired up. They
    are cheap integers and every browse/sort path needs them here.
    """
    return {
        "id": full["id"], "slug": full["slug"], "title": full["title"],
        "year": full["year"], "type": full["type"], "rating": full["rating"],
        "popularity": full["popularity"], "poster": full["poster"],
        "isAnime": full["isAnime"],
        "scripted": full.get("scripted", 0),
        "seasonCount": full.get("seasonCount", 0),
        "audioLanguages": full.get("audioLanguages", []),
    }


def decade_key(year) -> str:
    """Bucket a release year for the filter shards. Years that are not
    plausible (see sane_year) fall into "unknown" rather than getting their
    own decade, so a mis-parsed year like 2521 can never create a bucket that
    sorts ahead of real releases."""
    y = sane_year(year)
    if y is None:
        return "unknown"
    if y < 1950:
        return "pre1950"
    return str((y // 10) * 10)


def bucket_sort_key(key: str):
    """Newest decade first, oldest bucket after them, unknown years LAST.

    Plain reverse-sorted keys put "unknown" and "pre1950" ahead of 2020,
    because "u" > "2" and "p" > "2" — so undated titles opened the filtered
    lists and the front page was C-dramas with no year at all.
    """
    if key == "unknown":
        return (3, 0)
    if key == "pre1950":
        return (2, 0)
    return (1, -int(key))


def export_paginated_titles(conn: sqlite3.Connection, outdir: str, genre_map: dict, country_map: dict,
                             availability_map: dict, watch_provider_map: dict,
                             page_size: int = 1500, all_shard_size: int = 5000) -> list[dict]:
    """Replaces the old single-file-per-type export (movie.json alone was
    78MB — unusably large for a Worker to load per-request at this scale).
    Lite paginated listings for browse. Full detail is grouped into the SAME
    per-page files (not one object per title): with no bulk-upload tool
    available for R2, ~102K individual objects was not a viable upload
    strategy, only ~140 page files (lite + full, both types) is."""
    all_detail_index: list[dict] = []

    for t in ["movie", "tv", "anime", "short_drama"]:
        if t == "anime":
            rows = conn.execute("SELECT * FROM titles WHERE type = 'anime' OR is_anime = 1 ORDER BY popularity DESC").fetchall()
        elif t == "short_drama":
            rows = conn.execute("SELECT * FROM titles WHERE type = 'short_drama' OR is_short_drama = 1 ORDER BY popularity DESC").fetchall()
        else:
            rows = conn.execute("SELECT * FROM titles WHERE type = ? ORDER BY popularity DESC", (t,)).fetchall()
        full_dicts = [title_row_to_dict(r, genre_map, country_map, availability_map, watch_provider_map) for r in rows]
        lite_items = [to_lite(fd) for fd in full_dicts]

        ensure_dir(os.path.join(outdir, "titles-by-type", t))
        page_count = 0
        for page_num, offset in enumerate(range(0, len(lite_items), page_size)):
            lite_chunk = lite_items[offset:offset + page_size]
            full_chunk = full_dicts[offset:offset + page_size]

            with open(os.path.join(outdir, "titles-by-type", t, f"page-{page_num}.json"), "w", encoding="utf-8") as f:
                json.dump(lite_chunk, f, ensure_ascii=False)
            with open(os.path.join(outdir, "titles-by-type", t, f"detail-{page_num}.json"), "w", encoding="utf-8") as f:
                json.dump(full_chunk, f, ensure_ascii=False)

            for fd in full_chunk:
                all_detail_index.append({"id": fd["id"], "slug": fd["slug"], "tmdbId": fd["tmdbId"], "type": t, "page": page_num})
            page_count += 1

        with open(os.path.join(outdir, "titles-by-type", t, "index.json"), "w", encoding="utf-8") as f:
            json.dump({"type": t, "total": len(lite_items), "pageSize": page_size, "pageCount": page_count}, f, ensure_ascii=False)
        print(f"{t}: {len(lite_items)} items, {page_count} pages")

        # Complete lite set for worker-side filter/sort. The page-N files above
        # are pre-sorted by popularity and can only be sliced, which is why
        # sort= / year_min= / min_seasons= / scripted= were ignored on the
        # type= path: there was no full set to filter in the first place. Page
        # boundaries stay untouched because title-detail-index.json points
        # detail lookups at them; these shards sit alongside as a separate
        # all-index so nothing that resolves a title by page can break.
        #
        # Sharded by DECADE, not by a flat chunk. The flat version was 34 MB of
        # JSON for movies and every filtered request had to parse all of it;
        # bucketing by year means `year_min=2020` and "Latest" fetch one or two
        # buckets instead of the whole catalogue, and each bucket is pre-sorted
        # newest-first so "Latest" needs no in-memory sort.
        buckets: dict[str, list[dict]] = {}
        for it in lite_items:
            buckets.setdefault(decade_key(it.get("year")), []).append(it)

        bucket_meta = []
        for key in sorted(buckets.keys(), key=bucket_sort_key):
            rows = buckets[key]
            rows.sort(key=lambda r: (r.get("year") or 0), reverse=True)
            shard_sizes = []
            for shard_num, offset in enumerate(range(0, len(rows), all_shard_size)):
                chunk = rows[offset:offset + all_shard_size]
                with open(os.path.join(outdir, "titles-by-type", t, f"all-{key}-{shard_num}.json"), "w", encoding="utf-8") as f:
                    json.dump(chunk, f, ensure_ascii=False)
                shard_sizes.append(len(chunk))
            meta = {"key": key, "shards": shard_sizes, "count": len(rows)}
            if key == "pre1950":
                meta["yearMin"], meta["yearMax"] = 0, 1949
            elif key.isdigit():
                # The bucket key IS the decade start year, e.g. "2020" -> 2020-2029.
                base = int(key)
                meta["yearMin"], meta["yearMax"] = base, base + 9
            bucket_meta.append(meta)
        with open(os.path.join(outdir, "titles-by-type", t, "all-index.json"), "w", encoding="utf-8") as f:
            json.dump({"type": t, "total": len(lite_items), "shardSize": all_shard_size,
                       "buckets": bucket_meta}, f, ensure_ascii=False)
        print(f"{t}: {len(bucket_meta)} year buckets, {sum(len(b['shards']) for b in bucket_meta)} filter shards")

    return all_detail_index


FACET_COLUMNS = """
            t.id, t.slug, t.title, t.year, t.type, t.rating, t.popularity, t.poster, t.is_anime,
            (SELECT COUNT(DISTINCT s.season_number) FROM seasons s WHERE s.title_id = t.id) AS season_count,
            (SELECT c.is_scripted FROM title_classification c WHERE c.title_id = t.id) AS scripted
"""


def facet_item(r: sqlite3.Row) -> dict:
    """Projection shared by the country / language / genre facets.

    These facets are what the per-country, per-language and per-genre screens
    read, and they go through the same applyListFilters as the type path, so
    they need the same `scripted` and `seasonCount` fields — without them
    `min_seasons` and `scripted` returned zero on these screens too.
    """
    return {
        "id": r["id"],
        "slug": r["slug"],
        "title": r["title"],
        "year": r["year"],
        "type": r["type"],
        "rating": r["rating"],
        "popularity": r["popularity"],
        "poster": r["poster"],
        "isAnime": bool(r["is_anime"]),
        "seasonCount": r["season_count"] or 0,
        "scripted": r["scripted"] if r["scripted"] is not None else 0,
        "audioLanguages": _AUDIO_LANGS.get(r["id"], []),
    }


def export_titles_by_country(conn: sqlite3.Connection, outdir: str, limit_per_country: int = 0) -> None:
    ensure_dir(os.path.join(outdir, "titles-by-country"))
    countries = conn.execute("SELECT id, code, name FROM countries").fetchall()
    for c in countries:
        c_code = c["code"].upper()
        # No LIMIT by default: it used to be 1500, which silently truncated
        # every country tab to the 1500 most popular titles.
        sql = f"""
            SELECT {FACET_COLUMNS}
            FROM titles t
            JOIN title_countries tc ON t.id = tc.title_id
            WHERE tc.country_id = ?
            ORDER BY t.popularity DESC
        """
        rows = conn.execute(
            sql + (f" LIMIT {int(limit_per_country)}" if limit_per_country else ""), (c["id"],)
        ).fetchall()

        items = [facet_item(r) for r in rows]

        with open(os.path.join(outdir, "titles-by-country", f"{c_code}.json"), "w", encoding="utf-8") as f:
            json.dump({"items": items, "total": len(items), "country": c_code, "name": c["name"]}, f, ensure_ascii=False)
    print(f"Exported titles-by-country for {len(countries)} countries")


def export_titles_by_language(conn: sqlite3.Connection, outdir: str, limit_per_language: int = 0) -> None:
    ensure_dir(os.path.join(outdir, "titles-by-language"))
    languages = conn.execute("SELECT id, code, name FROM languages").fetchall()
    for l in languages:
        l_code = l["code"].lower()
        sql = f"""
            SELECT {FACET_COLUMNS}
            FROM titles t
            JOIN title_languages tl ON t.id = tl.title_id
            WHERE tl.language_id = ?
            ORDER BY t.popularity DESC
        """
        rows = conn.execute(
            sql + (f" LIMIT {int(limit_per_language)}" if limit_per_language else ""), (l["id"],)
        ).fetchall()

        items = [facet_item(r) for r in rows]

        with open(os.path.join(outdir, "titles-by-language", f"{l_code}.json"), "w", encoding="utf-8") as f:
            json.dump({"items": items, "total": len(items), "language": l_code, "name": l["name"]}, f, ensure_ascii=False)
    print(f"Exported titles-by-language for {len(languages)} languages")


def export_titles_by_genre(conn: sqlite3.Connection, outdir: str, limit_per_genre: int = 0) -> None:
    ensure_dir(os.path.join(outdir, "titles-by-genre"))
    genres = conn.execute("SELECT id, slug, name FROM genres").fetchall()
    for g in genres:
        g_slug = g["slug"].lower()
        sql = f"""
            SELECT {FACET_COLUMNS}
            FROM titles t
            JOIN title_genres tg ON t.id = tg.title_id
            WHERE tg.genre_id = ?
            ORDER BY t.popularity DESC
        """
        rows = conn.execute(
            sql + (f" LIMIT {int(limit_per_genre)}" if limit_per_genre else ""), (g["id"],)
        ).fetchall()

        items = [facet_item(r) for r in rows]

        with open(os.path.join(outdir, "titles-by-genre", f"{g_slug}.json"), "w", encoding="utf-8") as f:
            json.dump({"items": items, "total": len(items), "genre": g_slug, "name": g["name"]}, f, ensure_ascii=False)
    print(f"Exported titles-by-genre for {len(genres)} genres")


def export_categories(conn: sqlite3.Connection, outdir: str, genre_map: dict, country_map: dict,
                       availability_map: dict, watch_provider_map: dict, limit: int = 24) -> list[dict]:
    from datetime import date
    today = date.today().isoformat()

    # These category sections are the home page rails, and they are built here
    # rather than served from /titles, so `scripted=1` never applied to them and
    # the home page filled up with talk shows.
    #
    # The cause is TMDB popularity, not bad data: a show that has aired for
    # decades accumulates enormous season/episode counts, so "The Tonight Show"
    # outranks Reacher on a raw popularity sort. These panels are only titled
    # with genre tags ("comedy", "talk-show"), never "news", so the
    # classification is reliable for this purpose.
    #
    # COALESCE(..., 1) is deliberate: it excludes only titles EXPLICITLY
    # classified non-scripted. About 393 episodic titles were never classified
    # at all, and defaulting them to 0 would silently drop real shows.
    EXCLUDE_NON_SCRIPTED_EPISODIC = (
        "AND NOT (type IN ('tv','anime','short_drama') AND COALESCE("
        "(SELECT c.is_scripted FROM title_classification c WHERE c.title_id = titles.id), 1) = 0) "
    )

    queries = [
        ("trending-today", "🔥 Trending Today",
         "SELECT * FROM titles WHERE status='released' OR status='ongoing' ORDER BY popularity DESC LIMIT ?"),

        ("latest-movies", "🎬 Latest Movies",
         f"SELECT * FROM titles WHERE type='movie' AND status='released' AND release_date <= '{today}' "
         "ORDER BY release_date DESC, popularity DESC LIMIT ?"),

        ("latest-tv", "📺 Latest TV Shows",
         f"SELECT * FROM titles WHERE type='tv' AND (status='released' OR status='ongoing') AND release_date <= '{today}' "
         "ORDER BY release_date DESC, popularity DESC LIMIT ?"),

        ("ongoing-tv", "📡 Ongoing TV Series",
         "SELECT * FROM titles WHERE type='tv' AND status='ongoing' ORDER BY popularity DESC LIMIT ?"),

        ("coming-soon", "🗓️ Coming Soon",
         f"SELECT * FROM titles WHERE status='upcoming' AND release_date > '{today}' "
         "ORDER BY release_date ASC, popularity DESC LIMIT ?"),

        ("top-rated", "⭐ Top Rated",
         "SELECT * FROM titles WHERE rating_count > 10 AND status != 'upcoming' ORDER BY rating DESC LIMIT ?"),

        ("anime-picks", "⚡ Anime Picks",
         "SELECT * FROM titles WHERE (type='anime' OR is_anime = 1) AND status != 'upcoming' ORDER BY popularity DESC LIMIT ?"),

        ("latest-animation", "🎨 Latest Animation",
         f"SELECT * FROM titles WHERE status != 'upcoming' AND id IN (SELECT title_id FROM title_genres WHERE genre_id IN "
         "(SELECT id FROM genres WHERE slug='animation')) AND release_date <= '{today}' "
         "ORDER BY release_date DESC, popularity DESC LIMIT ?"),

        ("on-max", "📺 On Max (HBO)",
         "SELECT * FROM titles WHERE id IN (SELECT title_id FROM title_streaming_providers WHERE provider_id = "
         "(SELECT id FROM streaming_providers WHERE slug='max')) ORDER BY popularity DESC LIMIT ?"),

        ("on-disney-plus", "🏰 On Disney+",
         "SELECT * FROM titles WHERE id IN (SELECT title_id FROM title_streaming_providers WHERE provider_id = "
         "(SELECT id FROM streaming_providers WHERE slug='disney-plus')) ORDER BY popularity DESC LIMIT ?"),

        ("on-netflix", "🔴 On Netflix",
         "SELECT * FROM titles WHERE id IN (SELECT title_id FROM title_streaming_providers WHERE provider_id = "
         "(SELECT id FROM streaming_providers WHERE slug='netflix')) ORDER BY popularity DESC LIMIT ?"),

        ("on-prime-video", "📦 On Prime Video",
         "SELECT * FROM titles WHERE id IN (SELECT title_id FROM title_streaming_providers WHERE provider_id = "
         "(SELECT id FROM streaming_providers WHERE slug='prime-video')) ORDER BY popularity DESC LIMIT ?"),

        ("on-hulu", "💚 On Hulu",
         "SELECT * FROM titles WHERE id IN (SELECT title_id FROM title_streaming_providers WHERE provider_id = "
         "(SELECT id FROM streaming_providers WHERE slug='hulu')) ORDER BY popularity DESC LIMIT ?"),

        ("on-apple-tv", "🍎 On Apple TV+",
         "SELECT * FROM titles WHERE id IN (SELECT title_id FROM title_streaming_providers WHERE provider_id = "
         "(SELECT id FROM streaming_providers WHERE slug='apple-tv-plus')) ORDER BY popularity DESC LIMIT ?"),

        ("on-paramount-plus", "⛰️ Paramount+ Exclusives",
         "SELECT * FROM titles WHERE (id IN (SELECT title_id FROM title_streaming_providers WHERE provider_id = "
         "(SELECT id FROM streaming_providers WHERE slug='paramount-plus')) OR id IN (SELECT title_id FROM title_collections "
         "WHERE collection_id = (SELECT id FROM collections WHERE slug='paramount-plus'))) ORDER BY popularity DESC LIMIT ?"),

        ("on-peacock", "🦚 Peacock & NBC Hub",
         "SELECT * FROM titles WHERE (id IN (SELECT title_id FROM title_streaming_providers WHERE provider_id = "
         "(SELECT id FROM streaming_providers WHERE slug='peacock')) OR id IN (SELECT title_id FROM title_collections "
         "WHERE collection_id = (SELECT id FROM collections WHERE slug='peacock'))) ORDER BY popularity DESC LIMIT ?"),

        ("universal-pictures", "🌍 Universal Pictures Showcase",
         "SELECT * FROM titles WHERE id IN (SELECT title_id FROM title_collections WHERE collection_id = "
         "(SELECT id FROM collections WHERE slug='universal-pictures')) ORDER BY popularity DESC LIMIT ?"),

        ("sony-pictures", "🎬 Sony Pictures Blockbusters",
         "SELECT * FROM titles WHERE id IN (SELECT title_id FROM title_collections WHERE collection_id = "
         "(SELECT id FROM collections WHERE slug='sony-pictures')) ORDER BY popularity DESC LIMIT ?"),

        ("hot-short-dramas", "🔥 Hot Short TV Dramas",
         "SELECT * FROM titles WHERE type='short_drama' OR is_short_drama = 1 ORDER BY popularity DESC LIMIT ?"),

        ("playable-now", "▶️ Playable Now",
         "SELECT * FROM titles WHERE id IN (SELECT title_id FROM availability WHERE status='available') ORDER BY popularity DESC LIMIT ?"),
    ]
    sections = []
    for section_id, section_title, sql in queries:
        # The existing WHERE clause is wrapped in parentheses before the
        # exclusion is appended. Without this the splice binds to only part of
        # the condition: "WHERE status='released' OR status='ongoing'" became
        # "... OR status='ongoing' AND NOT (...)", which SQL reads as
        # "released OR (ongoing AND NOT ...)" — so the exclusion applied to
        # half the rows and The Tonight Show still led Trending Today.
        # Parenthesising makes it correct for every section regardless of its
        # own boolean structure, now or when a rail is added later.
        w_start = sql.find(" WHERE ")
        cut = sql.rfind(" ORDER BY ")
        if w_start == -1 or cut == -1 or cut < w_start:
            print(f"  Warning: category '{section_id}' not a simple WHERE/ORDER BY; left unfiltered")
        else:
            head = sql[:w_start + len(" WHERE ")]
            where = sql[w_start + len(" WHERE "):cut]
            tail = sql[cut:]
            sql = f"{head}({where}) {EXCLUDE_NON_SCRIPTED_EPISODIC}{tail}"
        try:
            rows = conn.execute(sql, (limit,)).fetchall()
            full_rows = conn.execute(sql, (150,)).fetchall()
        except Exception as e:
            print(f"  Warning: category '{section_id}' query failed: {e}")
            continue
        items = [title_row_to_dict(r, genre_map, country_map, availability_map, watch_provider_map) for r in rows]
        if items:  # only include non-empty sections
            sections.append({"id": section_id, "title": section_title, "items": items})
            col_file = os.path.join(outdir, "collections", f"{section_id}.json")
            if not os.path.exists(col_file):
                full_items = [to_lite(title_row_to_dict(r, genre_map, country_map, availability_map, watch_provider_map)) for r in full_rows]
                col_meta = {
                    "slug": section_id,
                    "name": section_title,
                    "kind": "editorial",
                    "description": f"Explore all titles in {section_title}.",
                    "count": len(full_items),
                    "title_count": len(full_items),
                    "poster": items[0].get("poster"),
                    "backdrop": items[0].get("backdrop") or items[0].get("poster"),
                    "cover_image": items[0].get("backdrop") or items[0].get("poster"),
                }
                with open(col_file, "w", encoding="utf-8") as cf:
                    json.dump({"items": full_items, "total": len(full_items), "collection": col_meta}, cf, ensure_ascii=False)
    with open(os.path.join(outdir, "categories.json"), "w", encoding="utf-8") as f:
        json.dump(sections, f, ensure_ascii=False)
    return sections


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Export worker snapshot data from the catalog database.")
    parser.add_argument("--db", default="catalog.db")
    parser.add_argument("--outdir", default="worker_export")
    parser.add_argument("--limit", type=int, default=24, help="items per category section")
    args = parser.parse_args()

    ensure_dir(args.outdir)
    conn = sqlite3.connect(args.db)
    conn.row_factory = sqlite3.Row

    print("Exporting meta...")
    export_meta(conn, args.outdir)

    print("Exporting taxonomy...")
    export_taxonomy(conn, args.outdir)

    print("Building relation maps...")
    genre_map = build_genre_map(conn)
    country_map = build_country_map(conn)
    _SCRIPTED = load_scripted_flags(conn)
    scripted_yes = sum(1 for v in _SCRIPTED.values() if v == 1)
    print(f"Loaded scripted flags: {scripted_yes:,} scripted series")
    _SEASON_COUNTS = build_season_counts(conn)
    multi = sum(1 for v in _SEASON_COUNTS.values() if v >= 2)
    print(f"Loaded season counts: {len(_SEASON_COUNTS):,} series with episodes, {multi:,} with 2+ seasons")
    _AUDIO_LANGS = build_audio_languages(conn)
    print(f"Loaded audio languages: {sum(1 for v in _AUDIO_LANGS.values() if v):,} titles with dub data, {len(_AUDIO_LANGS):,} total")
    availability_map = build_availability_map(conn)
    watch_provider_map = build_watch_provider_map(conn)

    print("Exporting paginated titles + per-title detail...")
    detail_index = export_paginated_titles(conn, args.outdir, genre_map, country_map, availability_map, watch_provider_map)
    with open(os.path.join(args.outdir, "title-detail-index.json"), "w", encoding="utf-8") as f:
        json.dump(detail_index, f, ensure_ascii=False)

    print("Exporting search index...")
    export_search_index(conn, args.outdir)

    print("Exporting titles by country, language, and genre...")
    export_titles_by_country(conn, args.outdir)
    export_titles_by_language(conn, args.outdir)
    export_titles_by_genre(conn, args.outdir)

    print("Exporting categories...")
    sections = export_categories(conn, args.outdir, genre_map, country_map, availability_map, watch_provider_map, limit=args.limit)

    conn.close()
    print(f"Export complete. {len(detail_index)} titles, {len(sections)} category sections written.")
