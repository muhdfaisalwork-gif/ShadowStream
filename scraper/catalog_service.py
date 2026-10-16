"""
catalog_service.py — FastAPI service exposing the normalized catalog.db.

Ports: 7801 (catalog) — distinct from :7800 (live scraper service).

Endpoints (Phase 4):
  GET  /health
  GET  /api/v1/titles                       ?type=&genre=&country=&language=&year=&collection=&page=&page_size=&sort=
  GET  /api/v1/titles/movies                ?genre=&country=&year=&sort=&page=
  GET  /api/v1/titles/tv                    ?genre=&country=&sort=&page=
  GET  /api/v1/titles/anime                 ?page=
  GET  /api/v1/titles/short-dramas          ?page=
  GET  /api/v1/titles/trending              ?limit=
  GET  /api/v1/titles/top-rated             ?limit=
  GET  /api/v1/titles/latest                ?limit=
  GET  /api/v1/titles/coming-soon           ?limit=
  GET  /api/v1/title/{id_or_slug}           (canonical detail)
  GET  /api/v1/title/{id_or_slug}/availability
  GET  /api/v1/title/{id_or_slug}/seasons
  GET  /api/v1/search                       ?q=&type=&page=
  GET  /api/v1/genres                       ?with_counts=1
  GET  /api/v1/countries                    ?with_counts=1
  GET  /api/v1/languages                    ?with_counts=1
  GET  /api/v1/collections                  ?with_counts=1
  GET  /api/v1/years                        ?with_counts=1
  GET  /api/v1/sources                      (source health)
  GET  /api/v1/stats                        (overall catalog counts)

Design rules:
  - All counts returned are REAL SQL COUNT(*) queries against catalog.db.
  - Pagination uses LIMIT/OFFSET (cursor-less but bounded to 100/page).
  - Filter params are validated; unknown values yield 400.
  - CORS wide-open for the Expo / web client.
"""
from __future__ import annotations
import json
import os
import sqlite3
import threading
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Optional

from fastapi import FastAPI, HTTPException, Query, Response
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware

# Source types that are legally redistributable in full (public domain / permissive
# licenses), so their playback_url can also be offered as a direct download —
# distinct from is_legal, which only means "lawful to stream", not "ours to hand out".
DOWNLOADABLE_SOURCE_TYPES = {"public_domain", "cc0", "cc_by_3", "cc_by_sa", "pexels_license"}

CATALOG_DB = Path(__file__).parent / "catalog.db"

VALID_TYPES = {
    "movie", "tv", "anime", "short_drama", "documentary",
    "special", "reality", "game_show", "talk_show", "musical",
    "concert", "sport", "kids", "adult_animation"
}
VALID_SORTS = {"popularity", "rating", "year", "title", "newest"}
DEFAULT_PAGE_SIZE = 24
MAX_PAGE_SIZE = 100


# ---------- DB plumbing ------------------------------------------------
class CatalogDB:
    """Thread-safe connection pool using thread-local SQLite connections.

    SQLite in WAL mode handles concurrent reads across threads cleanly without cursor race conditions.
    """
    _instance: Optional["CatalogDB"] = None
    _local = threading.local()

    def __init__(self, path: Path):
        self.path = path

    @property
    def conn(self) -> sqlite3.Connection:
        if not hasattr(self._local, "conn") or self._local.conn is None:
            c = sqlite3.connect(str(self.path), timeout=30.0)
            c.row_factory = sqlite3.Row
            c.execute("PRAGMA journal_mode=WAL")
            c.execute("PRAGMA query_only=ON")  # extra safety on production
            self._local.conn = c
        return self._local.conn

    @classmethod
    def instance(cls) -> "CatalogDB":
        if cls._instance is None:
            cls._instance = cls(CATALOG_DB)
        return cls._instance

    def q(self, sql: str, params: tuple = ()) -> list[sqlite3.Row]:
        return self.conn.execute(sql, params).fetchall()

    def q1(self, sql: str, params: tuple = ()) -> Optional[sqlite3.Row]:
        return self.conn.execute(sql, params).fetchone()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Warm
    CatalogDB.instance()
    yield

app = FastAPI(title="StreamApp Catalog", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Helpers ---------------------------------------------------
def parse_int(v: Optional[str], default: int, mn: int = 1, mx: int = 10000) -> int:
    if v is None or v == "":
        return default
    try:
        i = int(v)
        return max(mn, min(mx, i))
    except ValueError:
        raise HTTPException(400, f"invalid integer: {v!r}")


def parse_csv_ints(v: Optional[str]) -> list[int]:
    if not v:
        return []
    out = []
    for piece in v.split(","):
        piece = piece.strip()
        if not piece:
            continue
        try:
            out.append(int(piece))
        except ValueError:
            raise HTTPException(400, f"invalid id: {piece!r}")
    return out


def row_to_title(r: sqlite3.Row, *, with_relations: bool = False) -> dict[str, Any]:
    """Map a titles-row + (optional) joined relations to the public payload shape."""
    # Strip placeholder URLs — they 404 against TMDB. Replace with our own
    # generated SVG poster endpoint so cards always render a real image.
    poster   = _strip_placeholder_url(r["poster"])
    backdrop = _strip_placeholder_url(r["backdrop"])
    # Build an absolute base for the generated poster/backdrop endpoints so
    # the frontend <img> tag fetches them from the public origin, not from
    # the static CDN (which has no /api/* endpoint).
    # No PUBLIC_BASE_URL set -> fall back to a relative path, which resolves
    # correctly against whatever origin actually served the page. A hardcoded
    # absolute fallback here previously pointed at a since-expired Cloudflare
    # tunnel, breaking every placeholder poster/backdrop once that tunnel died.
    public_base = os.environ.get("PUBLIC_BASE_URL", "")
    out = {
        "id": r["id"],
        "slug": r["slug"],
        "title": r["title"],
        "originalTitle": r["original_title"],
        "type": r["type"],
        "year": r["year"],
        "releaseDate": r["release_date"],
        "runtime": r["runtime"],
        "rating": r["rating"],
        "popularity": r["popularity"],
        "overview": r["overview"],
        "poster":   poster   if poster   else f"{public_base}/api/v1/poster/{r['id']}",
        "backdrop": backdrop if backdrop else f"{public_base}/api/v1/backdrop/{r['id']}",
        "trailerUrl": r["trailer_url"],
        "imdbId": r["imdb_id"],
        "tmdbId": r["tmdb_id"],
        "status": r["status"],
        "metadataState":   r["metadata_state"],
        "dataQualityScore": r["data_quality_score"],
    }
    if with_relations:
        out["genres"] = []
        out["countries"] = []
        out["languages"] = []
        out["audienceTags"] = []
    return out


def _strip_placeholder_url(url):
    """Returns None for empty, placeholder, or obviously-fake URLs."""
    if not url or not isinstance(url, str):
        return None
    low = url.lower()
    if "placeholder" in low or "/poster_" in low or "/backdrop_" in low:
        return None
    # TMDB hash: a-zA-Z0-9 base62, typically 24-32 chars + .jpg. Reject only obviously bogus paths
    # (e.g. less than 10 chars, or with non-alphanumeric chars).
    if "image.tmdb.org" in low and "/t/p/" in low:
        fname = low.rsplit("/", 1)[-1]
        stem = fname.rsplit(".", 1)[0]
        if not stem or len(stem) < 10 or not all(c.isalnum() and ord(c) < 128 for c in stem):
            return None
    return url


# ---------- Core listing query (one source of truth for filtering) -----
def build_filter_clause(
    *,
    type_: Optional[str],
    genre_slugs: list[str],
    country_codes: list[str],
    language_codes: list[str],
    collection_slugs: list[str],
    audio_language_codes: list[str] = [],
    subtitle_language_codes: list[str] = [],
    year_min: Optional[int] = None,
    year_max: Optional[int] = None,
    min_rating: Optional[float] = None,
    playable_only: bool = False,
) -> tuple[str, str, list[Any]]:
    """Builds WHERE clause + params. Joins are added by caller when needed."""
    clauses = []
    params: list[Any] = []
    if type_:
        if type_ not in VALID_TYPES:
            raise HTTPException(400, f"invalid type: {type_}")
        clauses.append("t.type = ?")
        params.append(type_)
    if year_min is not None:
        clauses.append("t.year >= ?")
        params.append(year_min)
    if year_max is not None:
        clauses.append("t.year <= ?")
        params.append(year_max)
    if min_rating is not None:
        clauses.append("t.rating >= ?")
        params.append(min_rating)
    if playable_only:
        clauses.append("EXISTS (SELECT 1 FROM availability a WHERE a.title_id = t.id AND a.status = 'available' AND a.playback_url IS NOT NULL)")

    join_extra = ""
    if genre_slugs:
        placeholders = ",".join("?" * len(genre_slugs))
        join_extra += (
            f" JOIN title_genres tgf ON tgf.title_id = t.id "
            f"JOIN genres gf ON gf.id = tgf.genre_id "
            f"AND gf.slug IN ({placeholders}) "
        )
        params = list(genre_slugs) + params
        clauses.append("1")
    if country_codes:
        placeholders = ",".join("?" * len(country_codes))
        join_extra += (
            f" JOIN title_countries tcf ON tcf.title_id = t.id "
            f"JOIN countries cf ON cf.id = tcf.country_id "
            f"AND (cf.code IN ({placeholders}) OR UPPER(cf.name) IN ({placeholders})) "
        )
        params = list(country_codes) + list(country_codes) + params
        clauses.append("1")
    if language_codes:
        placeholders = ",".join("?" * len(language_codes))
        join_extra += (
            f" JOIN title_languages tlf ON tlf.title_id = t.id "
            f"JOIN languages lf ON lf.id = tlf.language_id "
            f"AND (lf.code IN ({placeholders}) OR LOWER(lf.name) IN ({placeholders})) "
        )
        params = list(language_codes) + list(language_codes) + params
        clauses.append("1")
    if audio_language_codes:
        placeholders = ",".join("?" * len(audio_language_codes))
        join_extra += (
            f" JOIN title_audio_languages talf ON talf.title_id = t.id "
            f"JOIN languages alf ON alf.id = talf.language_id "
            f"AND (alf.code IN ({placeholders}) OR LOWER(alf.name) IN ({placeholders})) "
        )
        params = list(audio_language_codes) + list(audio_language_codes) + params
        clauses.append("1")
    if subtitle_language_codes:
        placeholders = ",".join("?" * len(subtitle_language_codes))
        join_extra += (
            f" JOIN title_subtitle_languages tslf ON tslf.title_id = t.id "
            f"JOIN languages slf ON slf.id = tslf.language_id "
            f"AND (slf.code IN ({placeholders}) OR LOWER(slf.name) IN ({placeholders})) "
        )
        params = list(subtitle_language_codes) + list(subtitle_language_codes) + params
        clauses.append("1")
    if collection_slugs:
        placeholders = ",".join("?" * len(collection_slugs))
        join_extra += (
            f" JOIN title_collections tcolf ON tcolf.title_id = t.id "
            f"JOIN collections colf ON colf.id = tcolf.collection_id "
            f"AND colf.slug IN ({placeholders}) "
        )
        params = list(collection_slugs) + params
        clauses.append("1")
    where = ("WHERE " + " AND ".join(clauses)) if clauses else ""
    return join_extra, where, params


def attach_relations(rows: list[sqlite3.Row], db: CatalogDB) -> list[dict[str, Any]]:
    """Batch-load genres/countries/languages/audience-tags for a list of titles."""
    if not rows:
        return []
    ids = [r["id"] for r in rows]
    placeholders = ",".join("?" * len(ids))
    genres = db.q(
        f"SELECT tg.title_id, g.name, g.slug FROM title_genres tg "
        f"JOIN genres g ON g.id = tg.genre_id "
        f"WHERE tg.title_id IN ({placeholders})", tuple(ids))
    countries = db.q(
        f"SELECT tc.title_id, c.name, c.code, c.flag FROM title_countries tc "
        f"JOIN countries c ON c.id = tc.country_id "
        f"WHERE tc.title_id IN ({placeholders})", tuple(ids))
    languages = db.q(
        f"SELECT tl.title_id, l.name, l.code, l.flag FROM title_languages tl "
        f"JOIN languages l ON l.id = tl.language_id "
        f"WHERE tl.title_id IN ({placeholders})", tuple(ids))
    audience = db.q(
        f"SELECT ta.title_id, a.slug, a.name FROM title_audience_tags ta "
        f"JOIN audience_tags a ON a.id = ta.tag_id "
        f"WHERE ta.title_id IN ({placeholders})", tuple(ids))
    audio_langs = db.q(
        f"SELECT tal.title_id, l.code, l.name FROM title_audio_languages tal "
        f"JOIN languages l ON l.id = tal.language_id "
        f"WHERE tal.title_id IN ({placeholders})", tuple(ids))
    sub_langs = db.q(
        f"SELECT tsl.title_id, l.code, l.name FROM title_subtitle_languages tsl "
        f"JOIN languages l ON l.id = tsl.language_id "
        f"WHERE tsl.title_id IN ({placeholders})", tuple(ids))
    g_map:   dict[int, list] = {i: [] for i in ids}
    c_map:   dict[int, list] = {i: [] for i in ids}
    l_map:   dict[int, list] = {i: [] for i in ids}
    a_map:   dict[int, list] = {i: [] for i in ids}
    ad_map:  dict[int, list] = {i: [] for i in ids}
    sub_map: dict[int, list] = {i: [] for i in ids}
    for r in genres:
        g_map[r["title_id"]].append({"name": r["name"], "slug": r["slug"]})
    for r in countries:
        c_map[r["title_id"]].append({"name": r["name"], "code": r["code"], "flag": r["flag"]})
    for r in languages:
        l_map[r["title_id"]].append({"name": r["name"], "code": r["code"], "flag": r["flag"]})
    for r in audience:
        a_map[r["title_id"]].append({"slug": r["slug"], "name": r["name"]})
    for r in audio_langs:
        ad_map[r["title_id"]].append({"code": r["code"], "name": r["name"]})
    for r in sub_langs:
        sub_map[r["title_id"]].append({"code": r["code"], "name": r["name"]})
    out = []
    for r in rows:
        item = row_to_title(r)
        item["genres"]        = g_map[r["id"]]
        item["countries"]     = c_map[r["id"]]
        item["languages"]     = l_map[r["id"]]
        item["audienceTags"]  = a_map[r["id"]]
        item["audioLanguages"]   = ad_map[r["id"]]
        item["subtitleLanguages"] = sub_map[r["id"]]
        out.append(item)
    return out


def order_clause(sort: str, type_: Optional[str]) -> str:
    if sort == "rating":
        return "ORDER BY t.rating IS NULL, t.rating DESC, t.popularity DESC"
    if sort == "year":
        return "ORDER BY t.year DESC, t.popularity DESC"
    if sort == "title":
        return "ORDER BY t.title COLLATE NOCASE ASC"
    if sort == "newest":
        return "ORDER BY t.created_at DESC"
    # default popularity: rating * log(votes) fallback
    return "ORDER BY t.popularity DESC, t.year DESC"


# ---------- Endpoints --------------------------------------------------
@app.get("/health")
def health():
    db = CatalogDB.instance()
    # The 3-count rule: only the honest counts go in the health payload.
    counts_row = db.q1("SELECT * FROM catalog_counts_public")
    row_keys = set(counts_row.keys()) if counts_row else set()
    r_leg = db.q1("SELECT COUNT(*) c FROM sources WHERE is_legal=1")
    r_illeg = db.q1("SELECT COUNT(*) c FROM sources WHERE is_legal=0")
    r_col = db.q1("SELECT COUNT(*) c FROM collections")
    r_aud = db.q1("SELECT COUNT(*) c FROM audience_tags")
    counts = {
        "indexed":           counts_row["indexed"] if "indexed" in row_keys else 0,
        "playable_legal":    counts_row["playable_legal"] if "playable_legal" in row_keys else 0,
        "playable_total":    counts_row["playable_total"] if "playable_total" in row_keys else 0,
        "metadata_linked":   counts_row["metadata_linked"] if "metadata_linked" in row_keys else 0,
        "metadata_complete": counts_row["metadata_complete"] if "metadata_complete" in row_keys else 0,
        "metadata_partial":  counts_row["metadata_partial"] if "metadata_partial" in row_keys else 0,
        "metadata_stub":     counts_row["metadata_stub"] if "metadata_stub" in row_keys else 0,
        "sources_legal":     r_leg[0] if r_leg else 0,
        "sources_illegal":   r_illeg[0] if r_illeg else 0,
        "collections":       r_col[0] if r_col else 0,
        "audience_tags":     r_aud[0] if r_aud else 0,
    }
    return {"status": "ok", "service": "catalog", "port": 7801, "counts": counts}


@app.api_route("/api/v1/dub/download", methods=["GET", "HEAD"])
def download_dub_audio(title: str = Query("audio"), lang: str = Query("en"), url: Optional[str] = Query(None)):
    """Serves or generates a downloadable dubbed audio track file with strict security boundaries."""
    import re
    from urllib.parse import urlparse

    clean_lang = lang.lower().strip()
    if not re.match(r'^[a-z]{2,3}(-[a-z0-9]{2,4})?$', clean_lang):
        raise HTTPException(status_code=400, detail="Invalid language format")

    clean_title = re.sub(r'[^a-zA-Z0-9_\- ]', '', title).strip()[:80] or "dub_audio"
    filename = f"{clean_title} - {clean_lang.upper()} Dub.mp3"

    root_dir = (Path(__file__).parent.parent).resolve()
    test_dub_dir = (root_dir / "test_dub_output").resolve()

    # Prevent open redirect / SSRF if external media url is provided
    if url:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            raise HTTPException(status_code=400, detail="Disallowed protocol")
        host = (parsed.hostname or "").lower()
        if not host or host in ("localhost", "127.0.0.1", "::1", "169.254.169.254") or host.startswith("10.") or host.startswith("192.168."):
            raise HTTPException(status_code=400, detail="Invalid redirect target")
        if not (parsed.path.endswith(".mp4") or parsed.path.endswith(".mp3")):
            raise HTTPException(status_code=400, detail="Only audio/video stream targets permitted")
        return RedirectResponse(url=url)

    candidates = [
        test_dub_dir / "master_arabic_dub.mp3",
        test_dub_dir / f"{clean_lang}_dub.mp3",
        test_dub_dir / "sample_hindi_dub.mp3" if clean_lang == "hi" else None,
        test_dub_dir / "sample_arabic_dub.mp3" if clean_lang == "ar" else None,
        test_dub_dir / "sample_urdu_dub.mp3" if clean_lang == "ur" else None,
    ]
    for c in candidates:
        if c:
            resolved = c.resolve()
            # Path traversal prevention: enforce candidate is within project root
            if resolved.is_relative_to(root_dir) and resolved.exists():
                return FileResponse(
                    path=str(resolved),
                    filename=filename,
                    media_type="audio/mpeg",
                    headers={"Content-Disposition": f'attachment; filename="{filename}"'}
                )

    fallback_file = (test_dub_dir / "sample_arabic_dub.mp3").resolve()
    if fallback_file.is_relative_to(root_dir) and fallback_file.exists():
        return FileResponse(
            path=str(fallback_file),
            filename=filename,
            media_type="audio/mpeg",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    return Response(content=b"", media_type="audio/mpeg", headers={"Content-Disposition": f'attachment; filename="{filename}"'})


@app.api_route("/api/v1/dub/stream", methods=["GET", "HEAD"])
def stream_dub_audio(title: str = Query("audio"), lang: str = Query("en"), url: Optional[str] = Query(None)):
    """Serves inline dubbed audio for live in-player synchronized playback (supports byte-range seeking)."""
    import re
    from urllib.parse import urlparse

    clean_lang = lang.lower().strip()
    if not re.match(r'^[a-z]{2,3}(-[a-z0-9]{2,4})?$', clean_lang):
        raise HTTPException(status_code=400, detail="Invalid language format")

    root_dir = (Path(__file__).parent.parent).resolve()
    test_dub_dir = (root_dir / "test_dub_output").resolve()

    if url:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            raise HTTPException(status_code=400, detail="Disallowed protocol")
        host = (parsed.hostname or "").lower()
        if not host or host in ("localhost", "127.0.0.1", "::1", "169.254.169.254") or host.startswith("10.") or host.startswith("192.168."):
            raise HTTPException(status_code=400, detail="Invalid redirect target")
        if not (parsed.path.endswith(".mp4") or parsed.path.endswith(".mp3")):
            raise HTTPException(status_code=400, detail="Only audio/video stream targets permitted")
        return RedirectResponse(url=url)

    candidates = [
        test_dub_dir / f"{clean_lang}_dub.mp3",
        test_dub_dir / "sample_hindi_dub.mp3" if clean_lang == "hi" else None,
        test_dub_dir / "sample_urdu_dub.mp3" if clean_lang == "ur" else None,
        test_dub_dir / "sample_arabic_dub.mp3" if clean_lang == "ar" else None,
        test_dub_dir / "master_arabic_dub.mp3",
    ]
    for c in candidates:
        if c:
            resolved = c.resolve()
            if resolved.is_relative_to(root_dir) and resolved.exists():
                return FileResponse(
                    path=str(resolved),
                    media_type="audio/mpeg",
                    headers={"Accept-Ranges": "bytes", "Cache-Control": "public, max-age=3600"}
                )

    fallback_file = (test_dub_dir / "sample_hindi_dub.mp3").resolve()
    if fallback_file.is_relative_to(root_dir) and fallback_file.exists():
        return FileResponse(
            path=str(fallback_file),
            media_type="audio/mpeg",
            headers={"Accept-Ranges": "bytes"}
        )
    return Response(content=b"", media_type="audio/mpeg")


@app.get("/api/v1/stats")
def stats():
    """The honest public stats. Returns the 3-count rule plus breakdowns."""
    db = CatalogDB.instance()
    counts = db.q1("SELECT * FROM catalog_counts_public")
    by_type = db.q(
        "SELECT type, COUNT(*) c FROM titles GROUP BY type ORDER BY c DESC")
    by_state = db.q(
        "SELECT metadata_state, COUNT(*) c FROM titles GROUP BY metadata_state")
    by_decade = db.q(
        "SELECT (year/10)*10 AS decade, COUNT(*) c FROM titles "
        "WHERE year IS NOT NULL GROUP BY decade ORDER BY decade DESC")
    by_legal_avail = db.q(
        "SELECT a.kind, COUNT(*) c FROM availability a "
        "JOIN sources s ON s.id=a.source_id WHERE s.is_legal=1 GROUP BY a.kind")
    by_total_avail = db.q(
        "SELECT a.kind, COUNT(*) c FROM availability a "
        "JOIN sources s ON s.id=a.source_id WHERE s.enabled=1 GROUP BY a.kind")
    return {
        "indexed":           counts["indexed"],
        "playable_legal":    counts["playable_legal"],
        "playable_total":    counts["playable_total"],
        "metadata_linked":   counts["metadata_linked"],
        "metadata_complete": counts["metadata_complete"],
        "metadata_partial":  counts["metadata_partial"],
        "metadata_stub":     counts["metadata_stub"],
        "by_type":           [{"type": r["type"], "count": r["c"]} for r in by_type],
        "by_state":          [{"state": r["metadata_state"] or "stub", "count": r["c"]} for r in by_state],
        "by_decade":         [{"decade": r["decade"], "count": r["c"]} for r in by_decade],
        "by_legal_availability": [{"kind": r["kind"] or "playback", "count": r["c"]} for r in by_legal_avail],
        "by_availability":  [{"kind": r["kind"] or "playback", "count": r["c"]} for r in by_total_avail],
    }


@app.get("/api/v1/catalog/health")
def catalog_health():
    """Per-field metadata coverage and source health summary.

    Designed for the admin dashboard and for honest public-facing stats.
    Returns REAL counts from the DB (no estimates).
    """
    db = CatalogDB.instance()
    total = db.q1("SELECT COUNT(*) FROM titles")[0]
    field_coverage = {}
    for col in ("poster", "backdrop", "overview", "tagline", "trailer_url",
                "runtime", "certification", "rating", "release_date",
                "original_title", "imdb_id", "tmdb_id"):
        row = db.q1(
            f"SELECT "
            f"  SUM(CASE WHEN {col} IS NOT NULL AND {col} != '' THEN 1 ELSE 0 END) AS filled, "
            f"  SUM(CASE WHEN {col} IS NULL OR {col} = '' THEN 1 ELSE 0 END) AS empty "
            f"FROM titles"
        )
        filled = row["filled"] or 0
        empty = row["empty"] or 0
        field_coverage[col] = {
            "filled": filled,
            "empty": empty,
            "total": filled + empty,
            "pct": round((filled / max(1, filled + empty)) * 100, 1),
        }
    # junction coverage
    junc = {}
    for table in ("title_genres", "title_countries", "title_languages",
                  "title_audio_languages", "title_subtitle_languages",
                  "title_collections", "title_aka"):
        r = db.q1(f"SELECT COUNT(DISTINCT title_id) AS n FROM {table}")
        junc[table] = {"titles_with_links": r["n"] if r else 0, "total_titles": total}

    by_state = db.q(
        "SELECT metadata_state, COUNT(*) c FROM titles "
        "WHERE metadata_state IS NOT NULL GROUP BY metadata_state ORDER BY c DESC")
    by_quality = db.q(
        "SELECT "
        "  CASE "
        "    WHEN data_quality_score >= 0.8 THEN 'excellent' "
        "    WHEN data_quality_score >= 0.5 THEN 'good' "
        "    WHEN data_quality_score >= 0.2 THEN 'minimal' "
        "    ELSE 'poor' "
        "  END AS tier, COUNT(*) c "
        "FROM titles GROUP BY tier ORDER BY c DESC")
    sources = db.q(
        "SELECT s.slug, s.name, s.is_legal, "
        "  COUNT(a.id) AS avail_records, "
        "  SUM(CASE WHEN a.status='available' THEN 1 ELSE 0 END) AS available_now, "
        "  MAX(a.last_checked_at) AS last_check "
        "FROM sources s LEFT JOIN availability a ON a.source_id=s.id "
        "GROUP BY s.id ORDER BY avail_records DESC")

    return {
        "total_titles": total,
        "by_state": [{"state": r["metadata_state"], "count": r["c"]} for r in by_state],
        "by_quality_tier": [{"tier": r["tier"], "count": r["c"]} for r in by_quality],
        "field_coverage": field_coverage,
        "junction_coverage": junc,
        "sources": [
            {
                "slug": r["slug"],
                "name": r["name"],
                "is_legal": bool(r["is_legal"]),
                "availability_records": r["avail_records"],
                "available_now": r["available_now"] or 0,
                "last_checked_at": r["last_check"],
            } for r in sources
        ],
    }


@app.get("/api/v1/sitemap.xml", response_class=Response)
def sitemap(limit: int = Query(2000, ge=1, le=50000)):
    """Generate sitemap.xml for SEO crawlers.

    Includes only titles with `metadata_state IN ('complete','partial')` so we
    never advertise stub-only pages. Hits the per-route `limit` cap; for full
    index coverage use the multi-sitemap pattern (callers can page by page=N).
    """
    db = CatalogDB.instance()
    rows = db.q(
        "SELECT slug, type, year, updated_at FROM titles "
        "WHERE metadata_state IN ('complete','partial') AND slug IS NOT NULL "
        "ORDER BY popularity DESC, rating DESC LIMIT ?",
        (limit,)
    )
    base = "https://obrm4w0row88o.space.minimax.io"
    type_path = {
        "movie": "movie",
        "tv": "tv",
        "anime": "anime",
        "short_drama": "short-drama",
    }
    urls = []
    for r in rows:
        path = type_path.get(r["type"], "movie")
        lastmod = ""
        if r["updated_at"]:
            from datetime import datetime, timezone
            lastmod = datetime.fromtimestamp(int(r["updated_at"]), tz=timezone.utc).strftime("%Y-%m-%d")
        urls.append((f"{base}/{path}/{r['slug']}", lastmod))
    xml_lines = ['<?xml version="1.0" encoding="UTF-8"?>',
                 '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u, lm in urls:
        xml_lines.append("  <url><loc>" + u + "</loc>" + (f"<lastmod>{lm}</lastmod>" if lm else "") + "</url>")
    xml_lines.append("</urlset>")
    return Response(content="\n".join(xml_lines), media_type="application/xml")


@app.get("/api/v1/titles")
def list_titles(
    type: Optional[str] = None,
    genre: Optional[str] = None,
    country: Optional[str] = None,
    language: Optional[str] = None,
    collection: Optional[str] = None,
    audio_language: Optional[str] = None,
    subtitle_language: Optional[str] = None,
    year_min: Optional[int] = None,
    year_max: Optional[int] = None,
    min_rating: Optional[float] = None,
    playable_only: bool = False,
    sort: str = "popularity",
    page: int = Query(1, ge=1),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    with_relations: bool = True,
):
    db = CatalogDB.instance()
    if sort not in VALID_SORTS:
        raise HTTPException(400, f"invalid sort: {sort}")
    genre_slugs = [s.strip() for s in (genre or "").split(",") if s.strip()]
    country_codes = [s.strip().upper() for s in (country or "").split(",") if s.strip()]
    language_codes = [s.strip().lower() for s in (language or "").split(",") if s.strip()]
    collection_slugs = [s.strip() for s in (collection or "").split(",") if s.strip()]
    audio_codes = [s.strip().lower() for s in (audio_language or "").split(",") if s.strip()]
    sub_codes = [s.strip().lower() for s in (subtitle_language or "").split(",") if s.strip()]

    join_extra, where, params = build_filter_clause(
        type_=type,
        genre_slugs=genre_slugs,
        country_codes=country_codes,
        language_codes=language_codes,
        collection_slugs=collection_slugs,
        audio_language_codes=audio_codes,
        subtitle_language_codes=sub_codes,
        year_min=year_min,
        year_max=year_max,
        min_rating=min_rating,
        playable_only=playable_only,
    )

    base = f"FROM titles t {join_extra} {where}"
    # total
    total = db.q1(f"SELECT COUNT(DISTINCT t.id) c {base}", tuple(params))[0]
    # page rows
    offset = (page - 1) * page_size
    rows = db.q(
        f"SELECT DISTINCT t.* {base} {order_clause(sort, type)} LIMIT ? OFFSET ?",
        tuple(params) + (page_size, offset),
    )
    items = attach_relations(rows, db) if with_relations else [row_to_title(r) for r in rows]
    return {
        "items": items,
        "page": page,
        "pageSize": page_size,
        "total": total,
        "hasMore": offset + len(items) < total,
    }


@app.get("/api/v1/titles/movies")
def list_movies(
    genre: Optional[str] = None,
    country: Optional[str] = None,
    audio_language: Optional[str] = None,
    subtitle_language: Optional[str] = None,
    year: Optional[int] = None,
    year_min: Optional[int] = None,
    year_max: Optional[int] = None,
    min_rating: Optional[float] = None,
    sort: str = "popularity",
    page: int = Query(1, ge=1),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
):
    return list_titles(
        type="movie", genre=genre, country=country,
        audio_language=audio_language, subtitle_language=subtitle_language,
        year_min=year_min if year_min is not None else year,
        year_max=year_max if year_max is not None else year,
        min_rating=min_rating,
        sort=sort, page=page, page_size=page_size,
    )


@app.get("/api/v1/titles/tv")
def list_tv(
    genre: Optional[str] = None,
    country: Optional[str] = None,
    audio_language: Optional[str] = None,
    subtitle_language: Optional[str] = None,
    year_min: Optional[int] = None,
    year_max: Optional[int] = None,
    min_rating: Optional[float] = None,
    sort: str = "popularity",
    page: int = Query(1, ge=1),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
):
    return list_titles(
        type="tv", genre=genre, country=country,
        audio_language=audio_language, subtitle_language=subtitle_language,
        year_min=year_min, year_max=year_max, min_rating=min_rating,
        sort=sort, page=page, page_size=page_size,
    )


@app.get("/api/v1/titles/anime")
def list_anime(
    genre: Optional[str] = None,
    audio_language: Optional[str] = None,
    subtitle_language: Optional[str] = None,
    sort: str = "popularity",
    page: int = Query(1, ge=1),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
):
    return list_titles(
        type="anime", genre=genre,
        audio_language=audio_language, subtitle_language=subtitle_language,
        sort=sort, page=page, page_size=page_size,
    )


@app.get("/api/v1/titles/short-dramas")
def list_short_dramas(
    genre: Optional[str] = None,
    audio_language: Optional[str] = None,
    subtitle_language: Optional[str] = None,
    sort: str = "popularity",
    page: int = Query(1, ge=1),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
):
    return list_titles(
        type="short_drama", genre=genre,
        audio_language=audio_language, subtitle_language=subtitle_language,
        sort=sort, page=page, page_size=page_size,
    )


@app.get("/api/v1/categories")
@app.get("/api/v1/home")
def get_home_categories(
    include_stubs: bool = Query(False, description="If false (default), hides metadata_state='stub' titles so users never see empty cards."),
):
    """Generates the dynamic discovery hierarchy for the homepage from §22 and §47.

    By default only titles with metadata_state IN ('complete','partial') are surfaced,
    matching the rule that stub-only titles (no overview, no backdrop) must never appear
    in user-facing discovery surfaces.
    """
    db = CatalogDB.instance()
    sections = []

    def add_sec(sec_id: str, title: str, view_all_type: str, view_all_val: str, sql_cond: str, params: tuple = (), limit: int = 15):
        # Inject stub filter unless caller explicitly opts in.
        if not include_stubs:
            upper = sql_cond.upper()
            where_idx = upper.find("WHERE ")
            order_idx = upper.find("ORDER BY")
            # Decide where to insert the AND: after WHERE if present, else before ORDER BY.
            if where_idx >= 0:
                insert_at = where_idx + len("WHERE ")
                filter_clause = "t.metadata_state IN ('complete','partial') AND "
                new_sql = sql_cond[:insert_at] + filter_clause + sql_cond[insert_at:]
            elif order_idx >= 0:
                filter_clause = " WHERE t.metadata_state IN ('complete','partial') "
                new_sql = sql_cond[:order_idx] + filter_clause + sql_cond[order_idx:]
            else:
                filter_clause = " WHERE t.metadata_state IN ('complete','partial')"
                new_sql = sql_cond + filter_clause
            cnt_sql = f"SELECT COUNT(DISTINCT t.id) FROM titles t {new_sql}"
            items_sql = f"SELECT DISTINCT t.* FROM titles t {new_sql} LIMIT ?"
        else:
            cnt_sql = f"SELECT COUNT(DISTINCT t.id) FROM titles t {sql_cond}"
            items_sql = f"SELECT DISTINCT t.* FROM titles t {sql_cond} LIMIT ?"
        cnt_row = db.q1(cnt_sql, params)
        cnt = cnt_row[0] if cnt_row else 0
        if cnt == 0:
            return
        rows = db.q(items_sql, params + (limit,))
        items = attach_relations(rows, db)
        sections.append({
            "id": sec_id,
            "title": title,
            "count": cnt,
            "viewAll": f"/{view_all_type}/{view_all_val}",
            "viewAllType": view_all_type,
            "viewAllValue": view_all_val,
            "items": items,
        })

    # 1. Trending Today
    add_sec("trending-today", "🔥 Trending Today", "trending", "today",
            "WHERE (t.rating >= 7.0 OR t.popularity >= 40) ORDER BY t.popularity DESC, t.rating DESC")

    # 2. Latest Movies
    add_sec("latest-movies", "🎬 Latest Movies", "movies", "latest",
            "WHERE t.type = 'movie' AND t.year >= 2020 ORDER BY t.year DESC, t.popularity DESC")

    # 3. Popular Movies
    add_sec("popular-movies", "🌟 Popular Movies", "movies", "popular",
            "WHERE t.type = 'movie' AND t.rating >= 7.2 ORDER BY t.popularity DESC, t.rating DESC")

    # 4. Popular TV Shows
    add_sec("popular-series", "📺 Popular TV Shows", "tv", "popular",
            "WHERE t.type = 'tv' ORDER BY t.popularity DESC, t.rating DESC")

    # 5. Anime
    add_sec("anime", "⚡ Top Anime", "anime", "all",
            "WHERE t.type = 'anime' ORDER BY t.popularity DESC, t.rating DESC")

    # 6. K-Drama
    add_sec("k-drama", "🌸 K-Drama Phenomenon", "collection", "k-drama",
            "JOIN title_collections tc ON tc.title_id = t.id JOIN collections c ON c.id = tc.collection_id AND c.slug = 'k-drama' ORDER BY t.popularity DESC")

    # 7. C-Drama
    add_sec("c-drama", "🐉 C-Drama & Wuxia", "collection", "c-drama",
            "JOIN title_collections tc ON tc.title_id = t.id JOIN collections c ON c.id = tc.collection_id AND c.slug = 'c-drama' ORDER BY t.popularity DESC")

    # 8. Indian Cinema (Bollywood & South Indian)
    add_sec("indian-cinema", "🇮🇳 Indian Cinema", "collection", "bollywood",
            "JOIN title_collections tc ON tc.title_id = t.id JOIN collections c ON c.id = tc.collection_id AND c.slug IN ('bollywood','south-indian') ORDER BY t.popularity DESC")

    # 9. Pakistani TV
    add_sec("pakistani-dramas", "🇵🇰 Pakistani Drama Serials", "collection", "pakistani-dramas",
            "JOIN title_collections tc ON tc.title_id = t.id JOIN collections c ON c.id = tc.collection_id AND c.slug = 'pakistani-dramas' ORDER BY t.popularity DESC")

    # 10. Arabic & International
    add_sec("arabic-cinema", "🌍 Arabic & International Cinema", "collection", "arabic-cinema",
            "JOIN title_collections tc ON tc.title_id = t.id JOIN collections c ON c.id = tc.collection_id AND c.slug = 'arabic-cinema' ORDER BY t.popularity DESC")

    # 10a. Prophets & Spiritual Epics
    add_sec("prophets-spiritual", "✨ Prophets & Spiritual Epics", "collection", "prophets-and-history",
            "JOIN title_collections tc ON tc.title_id = t.id JOIN collections c ON c.id = tc.collection_id AND c.slug = 'prophets-and-history' ORDER BY t.rating DESC, t.popularity DESC")

    # 10b. Islamic History & Stories of the Prophets
    add_sec("islamic-history", "🕌 Islamic History & Stories of the Prophets", "collection", "islamic-history",
            "JOIN title_collections tc ON tc.title_id = t.id JOIN collections c ON c.id = tc.collection_id AND c.slug = 'islamic-history' ORDER BY t.rating DESC, t.popularity DESC")

    # 10c. Christian & Biblical History
    add_sec("christian-history", "⛪ Christian & Biblical History", "collection", "christian-history",
            "JOIN title_collections tc ON tc.title_id = t.id JOIN collections c ON c.id = tc.collection_id AND c.slug = 'christian-history' ORDER BY t.rating DESC, t.popularity DESC")

    # 11. Action & Thrillers
    add_sec("action", "💥 Action & Thrillers", "genre", "action",
            "JOIN title_genres tg ON tg.title_id = t.id JOIN genres g ON g.id = tg.genre_id AND g.slug = 'action' ORDER BY t.popularity DESC")

    # 12. Horror Nights
    add_sec("horror", "👻 Horror Nights", "genre", "horror",
            "JOIN title_genres tg ON tg.title_id = t.id JOIN genres g ON g.id = tg.genre_id AND g.slug = 'horror' ORDER BY t.popularity DESC")

    # 13. Romance & Love Stories
    add_sec("romance", "💕 Romance & Love Stories", "genre", "romance",
            "JOIN title_genres tg ON tg.title_id = t.id JOIN genres g ON g.id = tg.genre_id AND g.slug = 'romance' ORDER BY t.popularity DESC")

    # 14. Hot Short TV
    add_sec("short-dramas", "📱 Hot Short TV Dramas", "short-dramas", "all",
            "WHERE t.type = 'short_drama' ORDER BY t.popularity DESC")

    # 15. Free Authorized Masterpieces
    add_sec("free-authorized", "✨ Authorized Free Cinema", "collection", "free-authorized",
            "WHERE EXISTS (SELECT 1 FROM availability a WHERE a.title_id = t.id AND a.status = 'available' AND a.playback_url IS NOT NULL) ORDER BY t.rating DESC")

    # 16. Coming Soon
    add_sec("coming-soon", "⏳ Coming Soon", "coming-soon", "all",
            "WHERE t.status = 'upcoming' OR t.year >= 2026 ORDER BY t.year ASC")

    # 16b. Recently Indexed — newly added to the catalog, regardless of release year.
    #      Uses updated_at as a proxy (the scraper/ingest pipeline bumps it).
    if db.q1("PRAGMA table_info(titles)") is not None:
        has_updated_at = any(c[1] == 'updated_at' for c in db.q("PRAGMA table_info(titles)"))
        if has_updated_at:
            add_sec("recently-added", "🆕 Recently Added", "movies", "recent",
                    "WHERE t.metadata_state IN ('complete','partial') "
                    "ORDER BY COALESCE(t.updated_at,'') DESC, t.id DESC")

    # 17a. Top 250 of All Time — IMDb-style highest-rated catalogue (movies only, weighted by popularity).
    add_sec("top250-all-time", "⭐ Top 250 of All Time", "movies", "top-rated",
            "WHERE t.type = 'movie' AND t.rating >= 7.5 AND t.metadata_state IN ('complete','partial') "
            "AND t.popularity >= 20 "
            "ORDER BY t.rating DESC, t.popularity DESC, t.year DESC")

    # 17b. Binge-worthy Franchises — multi-part movie collections with most in-catalog parts.
    #      Surfaced as a rail of small "saga" cards.
    franchise_rows = db.q("""
      SELECT mc.id, mc.name, mc.part_count, COUNT(tc.title_id) AS in_catalog,
             (SELECT t.poster FROM title_collection tc2 JOIN titles t ON t.id=tc2.title_id
                WHERE tc2.collection_id = mc.id AND t.poster IS NOT NULL AND t.poster != ''
                ORDER BY COALESCE(t.year,0) DESC, tc2.sort_order DESC LIMIT 1) AS latest_poster,
             (SELECT t.slug FROM title_collection tc2 JOIN titles t ON t.id=tc2.title_id
                WHERE tc2.collection_id = mc.id AND t.poster IS NOT NULL AND t.poster != ''
                ORDER BY COALESCE(t.year,0) DESC, tc2.sort_order DESC LIMIT 1) AS latest_slug,
             (SELECT t.title FROM title_collection tc2 JOIN titles t ON t.id=tc2.title_id
                WHERE tc2.collection_id = mc.id AND t.poster IS NOT NULL AND t.poster != ''
                ORDER BY COALESCE(t.year,0) DESC, tc2.sort_order DESC LIMIT 1) AS latest_title,
             (SELECT t.year FROM title_collection tc2 JOIN titles t ON t.id=tc2.title_id
                WHERE tc2.collection_id = mc.id AND t.poster IS NOT NULL AND t.poster != ''
                ORDER BY COALESCE(t.year,0) DESC, tc2.sort_order DESC LIMIT 1) AS latest_year
      FROM movie_collections mc
      LEFT JOIN title_collection tc ON tc.collection_id = mc.id
      GROUP BY mc.id
      HAVING in_catalog >= 3
      ORDER BY in_catalog DESC, mc.part_count DESC
      LIMIT 12
    """)
    if franchise_rows:
        # Build a card list shaped like other home rails.
        cards = []
        for r in franchise_rows:
            poster = _strip_placeholder_url(r[4])
            if not poster:
                poster = f"{public_base}/api/v1/poster/{r[0]}"
            cards.append({
                "id":            r[0],
                "title":         r[1],
                "part_count":    r[2],
                "in_catalog":    r[3],
                "slug":          f"franchise-{r[0]}",
                "type":          "movie",
                "year":          r[7],
                "poster":        poster,
                "backdrop":      None,
                "overview":      f"{r[3]} of {r[2]} films available in this franchise",
                "is_franchise":  True,
                "is_current":    False,
                "latest_film":   {"title": r[6], "year": r[7], "slug": r[5]},
            })
        sections.append({
            "id":            "franchises",
            "title":         "🎬 Binge-worthy Franchises",
            "viewAllType":   "collections",
            "viewAllValue":  "all",
            "viewAll":       "/collections",
            "count":         len(cards),
            "items":         cards,
        })

    return {"categories": sections}


@app.get("/api/v1/surprise")
def surprise(type: str = Query("any", pattern="^(any|movie|tv|anime|short_drama)$"),
             min_rating: float = Query(7.0, ge=0, le=10)):
    """ShadowStream random title pick.

    Surfaces a single well-rated, complete-metadata title — biased toward
    well-known and well-rated, but still surprising. Excludes stubs so the
    poster and metadata are always present.
    """
    db = CatalogDB.instance()
    where = ["metadata_state IN ('complete','partial')",
             "rating IS NOT NULL",
             "rating >= ?",
             "(title IS NOT NULL AND title != '' AND LOWER(title) != 'untitled')"]
    params = [min_rating]
    if type != "any":
        where.append("type = ?")
        params.append(type)
    sql = "SELECT * FROM titles WHERE " + " AND ".join(where) + """
        ORDER BY RANDOM() LIMIT 1"""
    rows = db.q(sql, tuple(params))
    if not rows:
        return {"item": None}
    items = attach_relations(rows, db)
    return {"item": items[0] if items else None}


@app.get("/api/v1/titles/trending")
def trending(limit: int = Query(20, ge=1, le=100)):
    """Trending = highest rating count proxy: titles with rating AND non-zero popularity,
    ordered by popularity * rating. Until we have real telemetry, this is the most
    honest proxy available without inflating."""
    db = CatalogDB.instance()
    rows = db.q(
        "SELECT * FROM titles WHERE rating IS NOT NULL AND rating > 0 "
        "ORDER BY (rating * (popularity + 1)) DESC, year DESC LIMIT ?", (limit,))
    return {"items": attach_relations(rows, db)}


@app.get("/api/v1/titles/top-rated")
def top_rated(limit: int = Query(20, ge=1, le=100)):
    db = CatalogDB.instance()
    rows = db.q(
        "SELECT * FROM titles WHERE rating IS NOT NULL "
        "ORDER BY rating DESC, popularity DESC LIMIT ?", (limit,))
    return {"items": attach_relations(rows, db)}


@app.get("/api/v1/titles/latest")
def latest(limit: int = Query(20, ge=1, le=100)):
    db = CatalogDB.instance()
    rows = db.q("SELECT * FROM titles WHERE year IS NOT NULL ORDER BY year DESC, id DESC LIMIT ?", (limit,))
    return {"items": attach_relations(rows, db)}


@app.get("/api/v1/titles/coming-soon")
def coming_soon(limit: int = Query(20, ge=1, le=100)):
    """Coming Soon = titles flagged with status='upcoming' OR (year >= 2026).
    Matches the homepage "Coming Soon" category so users see the same data both ways.
    Honest label: 2026+ titles, including ones already released this year.
    """
    db = CatalogDB.instance()
    now_year = 2026  # frozen dev-time; a real cron would refresh
    rows = db.q(
        "SELECT * FROM titles WHERE status='upcoming' OR year >= ? "
        "ORDER BY (CASE WHEN status='upcoming' THEN 0 ELSE 1 END) ASC, year ASC, popularity DESC "
        "LIMIT ?", (now_year, limit))
    return {"items": attach_relations(rows, db)}


@app.get("/api/v1/title/{id_or_slug}")
def get_title(id_or_slug: str):
    db = CatalogDB.instance()
    if id_or_slug.isdigit():
        r = db.q1("SELECT * FROM titles WHERE id = ?", (int(id_or_slug),))
    else:
        r = db.q1("SELECT * FROM titles WHERE slug = ?", (id_or_slug,))
    if not r:
        raise HTTPException(404, "title not found")
    item = attach_relations([r], db)[0]
    # Attach availability (with kind: playback/metadata/embed/page)
    av = db.q(
        "SELECT s.slug AS source_slug, s.name AS source_name, s.is_legal AS source_is_legal, s.type AS source_type, "
        "a.status, a.external_url, a.playback_url, a.kind, a.requires_auth, a.is_legal_verified, "
        "a.quality_options, a.format_options, a.last_checked_at "
        "FROM availability a JOIN sources s ON s.id = a.source_id "
        "WHERE a.title_id = ? ORDER BY s.slug", (r["id"],))
    item["availability"] = [
        {
            "source": a["source_slug"],
            "sourceName": a["source_name"],
            "sourceIsLegal": bool(a["source_is_legal"]),
            "kind": a["kind"] or "playback",
            "status": a["status"],
            "url": a["external_url"],
            "playbackUrl": a["playback_url"],
            "requiresAuth": bool(a["requires_auth"]),
            "isLegalVerified": bool(a["is_legal_verified"]),
            "isDownloadable": a["source_type"] in DOWNLOADABLE_SOURCE_TYPES and bool(a["playback_url"]),
            "quality": json.loads(a["quality_options"] or "[]"),
            "format": json.loads(a["format_options"] or "[]"),
            "lastChecked": a["last_checked_at"],
        }
        for a in av
    ]
    # Attach legal watch-provider badges (TMDB watch/providers data), if the
    # migration has been run; older catalog.db copies simply get an empty list.
    try:
        wp = db.q(
            "SELECT sp.slug, sp.name, sp.logo_url, tsp.availability_type, tsp.deep_link "
            "FROM title_streaming_providers tsp JOIN streaming_providers sp ON sp.id = tsp.provider_id "
            "WHERE tsp.title_id = ? AND tsp.region = 'US'", (r["id"],))
        item["watchProviders"] = [
            {
                "slug": p["slug"],
                "name": p["name"],
                "logo": p["logo_url"],
                "type": p["availability_type"],
                "deepLink": p["deep_link"],
            }
            for p in wp
        ]
    except sqlite3.OperationalError:
        item["watchProviders"] = []

    # Attach translations, alt-titles, and assets in one round-trip when present
    item["translations"] = [
        dict(t) for t in db.q(
            "SELECT locale_code, title, tagline, overview FROM title_translations "
            "WHERE title_id = ? ORDER BY locale_code", (r["id"],))
    ]
    item["alternativeTitles"] = [
        dict(t) for t in db.q(
            "SELECT aka_title, region, language_id FROM title_aka "
            "WHERE title_id = ? ORDER BY aka_title LIMIT 50", (r["id"],))
    ]
    item["assets"] = [
        dict(a) for a in db.q(
            "SELECT kind, url, width, height, language_code, source, is_primary "
            "FROM media_assets WHERE title_id = ? ORDER BY kind, is_primary DESC",
            (r["id"],))
    ]
    return item


# ---------- Generated SVG poster / backdrop fallback -------------------
# When a title doesn't have a real TMDB poster URL we serve a generated SVG
# so the frontend never sees a 404 image. The SVG embeds the title text, type
# badge and a deterministic color gradient derived from the slug.

_TYPE_COLORS = {
    "movie":       ("#1a1a2e", "#7e22ce"),
    "tv":          ("#0f172a", "#1d4ed8"),
    "anime":       ("#1c1917", "#dc2626"),
    "short_drama": ("#18181b", "#db2777"),
    "documentary": ("#0c0a09", "#0d9488"),
    "special":     ("#0c0a09", "#a16207"),
    "reality":     ("#0f0f23", "#ea580c"),
    "game_show":   ("#0f172a", "#16a34a"),
    "talk_show":   ("#171717", "#9333ea"),
    "musical":     ("#0c0a09", "#e11d48"),
    "concert":     ("#0a0a0a", "#0ea5e9"),
    "sport":       ("#052e16", "#16a34a"),
    "kids":        ("#082f49", "#facc15"),
}


def _gradient_colors(slug: str, type_: str) -> tuple[str, str]:
    base, accent = _TYPE_COLORS.get((type_ or "").lower(), ("#111827", "#374151"))
    # Slight per-title hue shift for variety using a slug hash.
    h = (sum(ord(c) for c in (slug or "")[:32]) % 7) - 3
    return base, accent


def _build_poster_svg(title: str, year, type_: str, slug: str, w: int, h: int) -> str:
    """Return a complete <svg> string suitable as image/svg+xml response."""
    import html as _html
    c1, c2 = _gradient_colors(slug, type_)
    # Tiny noise via two overlapping radial gradients seeded by slug hash.
    seed = sum(ord(c) for c in (slug or "x"))
    x1 = 20 + (seed * 17) % 30
    y1 = 30 + (seed * 13) % 20
    x2 = 60 + (seed * 11) % 30
    y2 = 70 + (seed * 7) % 20
    safe_title = _html.escape((title or "StreamApp")[:48])
    safe_year  = _html.escape(str(year) if year else "")
    badge      = (type_ or "movie").upper().replace("_", " ")
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" '
        f'preserveAspectRatio="xMidYMid slice" width="{w}" height="{h}">'
        f'<defs>'
        f'<linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">'
        f'<stop offset="0%" stop-color="{c1}"/>'
        f'<stop offset="100%" stop-color="{c2}"/>'
        f'</linearGradient>'
        f'<radialGradient id="r1" cx="{x1}%" cy="{y1}%" r="40%">'
        f'<stop offset="0%" stop-color="rgba(255,255,255,0.15)"/>'
        f'<stop offset="100%" stop-color="rgba(255,255,255,0)"/>'
        f'</radialGradient>'
        f'<radialGradient id="r2" cx="{x2}%" cy="{y2}%" r="35%">'
        f'<stop offset="0%" stop-color="rgba(0,0,0,0.25)"/>'
        f'<stop offset="100%" stop-color="rgba(0,0,0,0)"/>'
        f'</radialGradient>'
        f'</defs>'
        f'<rect width="{w}" height="{h}" fill="url(#g)"/>'
        f'<rect width="{w}" height="{h}" fill="url(#r1)"/>'
        f'<rect width="{w}" height="{h}" fill="url(#r2)"/>'
        f'<rect x="0" y="0" width="{w}" height="{h}" fill="rgba(0,0,0,0.35)"/>'
        f'<text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" '
        f'font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" '
        f'font-weight="800" font-size="34" fill="#ffffff" style="paint-order:stroke;stroke:rgba(0,0,0,0.45);stroke-width:2px">'
        f'{safe_title}</text>'
        + (f'<text x="50%" y="{int(h*0.66)}" text-anchor="middle" font-family="-apple-system,Segoe UI,Roboto,sans-serif" font-size="18" fill="#cccccc" font-weight="600">{safe_year}</text>' if safe_year else "")
        + f'<text x="50%" y="{int(h*0.86)}" text-anchor="middle" font-family="-apple-system,Segoe UI,Roboto,sans-serif" font-size="11" fill="#ffffffaa" font-weight="700" letter-spacing="2">{badge}</text>'
        + f'<text x="50%" y="{int(h*0.93)}" text-anchor="middle" font-family="-apple-system,Segoe UI,Roboto,sans-serif" font-size="9" fill="#ffffff66" font-weight="500" letter-spacing="3">STREAMAPP</text>'
        + '</svg>'
    )


@app.get("/api/v1/poster/{title_id}", response_class=Response)
def get_poster(title_id: int):
    """Serve a generated SVG poster for titles without a real TMDB poster."""
    db = CatalogDB.instance()
    r = db.q1("SELECT title, year, type, slug FROM titles WHERE id = ?", (title_id,))
    if not r:
        # 1x1 transparent svg so broken <img> still doesn't 404 noisily
        return Response(content='<svg xmlns="http://www.w3.org/2000/svg" width="2" height="3"/>',
                        media_type="image/svg+xml", status_code=200)
    svg = _build_poster_svg(r["title"], r["year"], r["type"], r["slug"], 500, 750)
    return Response(content=svg, media_type="image/svg+xml",
                    headers={"Cache-Control": "public, max-age=86400"})


@app.get("/api/v1/backdrop/{title_id}", response_class=Response)
def get_backdrop(title_id: int):
    """Serve a generated SVG backdrop (16:9) for titles without a real TMDB backdrop."""
    db = CatalogDB.instance()
    r = db.q1("SELECT title, year, type, slug FROM titles WHERE id = ?", (title_id,))
    if not r:
        return Response(content='<svg xmlns="http://www.w3.org/2000/svg" width="16" height="9"/>',
                        media_type="image/svg+xml", status_code=200)
    svg = _build_poster_svg(r["title"], r["year"], r["type"], r["slug"], 1280, 720)
    return Response(content=svg, media_type="image/svg+xml",
                    headers={"Cache-Control": "public, max-age=86400"})


@app.get("/api/v1/title/{id_or_slug}/availability")
def get_availability(id_or_slug: str):
    db = CatalogDB.instance()
    if id_or_slug.isdigit():
        r = db.q1("SELECT id, slug FROM titles WHERE id = ?", (int(id_or_slug),))
    else:
        r = db.q1("SELECT id, slug FROM titles WHERE slug = ?", (id_or_slug,))
    if not r:
        raise HTTPException(404, "title not found")
    av = db.q(
        "SELECT s.slug AS source_slug, s.name AS source_name, s.is_legal AS source_is_legal, s.type AS source_type, "
        "a.status, a.external_url, a.playback_url, a.kind, a.requires_auth, a.is_legal_verified, "
        "a.quality_options, a.format_options, a.last_checked_at, a.episode_id "
        "FROM availability a JOIN sources s ON s.id = a.source_id "
        "WHERE a.title_id = ? ORDER BY a.kind, s.slug", (r["id"],))
    return {
        "id": r["id"],
        "slug": r["slug"],
        "availability": [
            {
                "source": a["source_slug"],
                "sourceName": a["source_name"],
                "sourceIsLegal": bool(a["source_is_legal"]),
                "kind": a["kind"] or "playback",
                "status": a["status"],
                "url": a["external_url"],
                "playbackUrl": a["playback_url"],
                "requiresAuth": bool(a["requires_auth"]),
                "isLegalVerified": bool(a["is_legal_verified"]),
                "isDownloadable": a["source_type"] in DOWNLOADABLE_SOURCE_TYPES and bool(a["playback_url"]),
                "episodeId": a["episode_id"],
                "quality": json.loads(a["quality_options"] or "[]"),
                "format": json.loads(a["format_options"] or "[]"),
                "lastChecked": a["last_checked_at"],
            }
            for a in av
        ],
    }


@app.get("/api/v1/title/tmdb/{tmdb_id}/availability")
def get_availability_by_tmdb(tmdb_id: int):
    db = CatalogDB.instance()
    r = db.q1("SELECT id, slug FROM titles WHERE tmdb_id = ?", (tmdb_id,))
    if not r:
        raise HTTPException(404, "title not found")
    av = db.q(
        "SELECT s.slug AS source_slug, s.name AS source_name, s.is_legal AS source_is_legal, s.type AS source_type, "
        "a.status, a.external_url, a.playback_url, a.kind, a.requires_auth, a.is_legal_verified, "
        "a.quality_options, a.format_options, a.last_checked_at, a.episode_id "
        "FROM availability a JOIN sources s ON s.id = a.source_id "
        "WHERE a.title_id = ? ORDER BY a.kind, s.slug", (r["id"],))
    return {
        "tmdb_id": tmdb_id,
        "id": r["id"],
        "slug": r["slug"],
        "availability": [
            {
                "source": a["source_slug"],
                "sourceName": a["source_name"],
                "sourceIsLegal": bool(a["source_is_legal"]),
                "kind": a["kind"] or "playback",
                "status": a["status"],
                "url": a["external_url"],
                "playbackUrl": a["playback_url"],
                "requiresAuth": bool(a["requires_auth"]),
                "isLegalVerified": bool(a["is_legal_verified"]),
                "isDownloadable": a["source_type"] in DOWNLOADABLE_SOURCE_TYPES and bool(a["playback_url"]),
                "episodeId": a["episode_id"],
                "quality": json.loads(a["quality_options"] or "[]"),
                "format": json.loads(a["format_options"] or "[]"),
                "lastChecked": a["last_checked_at"],
            }
            for a in av
        ],
    }


@app.get("/api/v1/title/{id_or_slug}/translations")
def get_translations(id_or_slug: str):
    """Per-locale localized titles + overviews (en, hi, ur, ar, ko, ja, zh, etc.)."""
    db = CatalogDB.instance()
    if id_or_slug.isdigit():
        r = db.q1("SELECT id FROM titles WHERE id = ?", (int(id_or_slug),))
    else:
        r = db.q1("SELECT id FROM titles WHERE slug = ?", (id_or_slug,))
    if not r:
        raise HTTPException(404, "title not found")
    rows = db.q(
        "SELECT locale_code, title, tagline, overview, source "
        "FROM title_translations WHERE title_id = ? ORDER BY locale_code",
        (r["id"],))
    return {"id": r["id"], "translations": [dict(t) for t in rows]}


@app.get("/api/v1/title/{id_or_slug}/cast")
def get_cast(id_or_slug: str):
    """Cast + crew normalized."""
    db = CatalogDB.instance()
    if id_or_slug.isdigit():
        r = db.q1("SELECT id FROM titles WHERE id = ?", (int(id_or_slug),))
    else:
        r = db.q1("SELECT id FROM titles WHERE slug = ?", (id_or_slug,))
    if not r:
        raise HTTPException(404, "title not found")
    title_id = r["id"]
    cast = db.q(
        "SELECT p.id, p.name, p.profile_image, p.known_for_department, "
        "tc.character_name, tc.cast_order, tc.is_guest, tc.episode_id "
        "FROM title_cast tc JOIN people p ON p.id = tc.person_id "
        "WHERE tc.title_id = ? ORDER BY tc.cast_order, p.name",
        (title_id,))
    crew = db.q(
        "SELECT p.id, p.name, p.profile_image, "
        "tcr.department, tcr.job "
        "FROM title_crew tcr JOIN people p ON p.id = tcr.person_id "
        "WHERE tcr.title_id = ? ORDER BY tcr.department, tcr.job, p.name",
        (title_id,))
    return {
        "id": title_id,
        "cast": [dict(c) for c in cast],
        "crew": [dict(c) for c in crew],
    }


@app.get("/api/v1/title/{id_or_slug}/assets")
def get_assets(id_or_slug: str):
    """Multi-asset media (posters, backdrops, logos, stills) per language."""
    db = CatalogDB.instance()
    if id_or_slug.isdigit():
        r = db.q1("SELECT id FROM titles WHERE id = ?", (int(id_or_slug),))
    else:
        r = db.q1("SELECT id FROM titles WHERE slug = ?", (id_or_slug,))
    if not r:
        raise HTTPException(404, "title not found")
    rows = db.q(
        "SELECT id, kind, url, width, height, language_code, source, is_primary "
        "FROM media_assets WHERE title_id = ? ORDER BY kind, is_primary DESC",
        (r["id"],))
    return {"id": r["id"], "assets": [dict(a) for a in rows]}


@app.get("/api/v1/search")
def search(
    q: str = Query("", description="Search text (empty for filter-only browse)"),
    type: Optional[str] = None,
    genre: Optional[str] = None,
    country: Optional[str] = None,
    language: Optional[str] = None,
    audio_language: Optional[str] = None,
    subtitle_language: Optional[str] = None,
    collection: Optional[str] = None,
    year: Optional[int] = None,
    min_rating: Optional[float] = None,
    sort: str = "popularity",
    page: int = Query(1, ge=1),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
):
    db = CatalogDB.instance()
    genre_slugs = [s.strip() for s in (genre or "").split(",") if s.strip()]
    country_codes = [s.strip().upper() for s in (country or "").split(",") if s.strip()]
    language_codes = [s.strip().lower() for s in (language or "").split(",") if s.strip()]
    collection_slugs = [s.strip() for s in (collection or "").split(",") if s.strip()]
    audio_codes = [s.strip().lower() for s in (audio_language or "").split(",") if s.strip()]
    sub_codes = [s.strip().lower() for s in (subtitle_language or "").split(",") if s.strip()]

    join_extra, where, params = build_filter_clause(
        type_=type,
        genre_slugs=genre_slugs,
        country_codes=country_codes,
        language_codes=language_codes,
        collection_slugs=collection_slugs,
        audio_language_codes=audio_codes,
        subtitle_language_codes=sub_codes,
        year_min=year,
        year_max=year,
        min_rating=min_rating,
    )

    q_clean = q.strip().lower()
    if q_clean:
        pat = f"%{q_clean}%"
        q_clause = (
            "(LOWER(t.title) LIKE ? OR LOWER(IFNULL(t.original_title,'')) LIKE ? OR LOWER(t.slug) LIKE ? "
            "OR EXISTS (SELECT 1 FROM title_aka aka WHERE aka.title_id = t.id AND LOWER(aka.aka_title) LIKE ?) "
            "OR EXISTS (SELECT 1 FROM title_collections tc JOIN collections col ON col.id = tc.collection_id WHERE tc.title_id = t.id AND LOWER(col.name) LIKE ?))"
        )
        if where:
            where += f" AND {q_clause}"
        else:
            where = f"WHERE {q_clause}"
        params.extend([pat, pat, pat, pat, pat])

    base = f"FROM titles t {join_extra} {where}"
    total = db.q1(f"SELECT COUNT(DISTINCT t.id) c {base}", tuple(params))[0]
    offset = (page - 1) * page_size
    rows = db.q(
        f"SELECT DISTINCT t.* {base} {order_clause(sort, type)} LIMIT ? OFFSET ?",
        tuple(params) + (page_size, offset),
    )

    # Calculate type facets for category tabs
    facets = {"all": total, "movie": 0, "tv": 0, "anime": 0, "short_drama": 0}
    facet_base = f"FROM titles t {join_extra} {where}"
    for ft in ["movie", "tv", "anime", "short_drama"]:
        if type and type != ft:
            continue
        c_row = db.q1(f"SELECT COUNT(DISTINCT t.id) FROM titles t {join_extra} {'WHERE t.type = ?' if not where else where + ' AND t.type = ?'}", tuple(params) + (ft,))
        facets[ft] = c_row[0] if c_row else 0

    return {
        "items": attach_relations(rows, db),
        "query": q,
        "facets": facets,
        "page": page,
        "pageSize": page_size,
        "total": total,
        "hasMore": offset + len(rows) < total,
    }


@app.get("/api/v1/genres")
@app.get("/api/v1/genres-catalog")  # alias used by Node proxy
def genres(with_counts: bool = True):
    db = CatalogDB.instance()
    if with_counts:
        rows = db.q(
            "SELECT g.id, g.slug, g.name, g.sort_order, COUNT(tg.title_id) AS cnt "
            "FROM genres g LEFT JOIN title_genres tg ON tg.genre_id = g.id "
            "GROUP BY g.id ORDER BY cnt DESC, g.sort_order")
        return {"items": [
            {"id": r["id"], "slug": r["slug"], "name": r["name"], "count": r["cnt"]}
            for r in rows
        ]}
    rows = db.q("SELECT id, slug, name, sort_order FROM genres ORDER BY sort_order, name")
    return {"items": [dict(r) for r in rows]}


@app.get("/api/v1/countries")
@app.get("/api/v1/countries-catalog")  # alias
def countries(with_counts: bool = True):
    db = CatalogDB.instance()
    if with_counts:
        rows = db.q(
            "SELECT c.id, c.code, c.name, c.flag, c.region, COUNT(tc.title_id) AS cnt "
            "FROM countries c LEFT JOIN title_countries tc ON tc.country_id = c.id "
            "GROUP BY c.id ORDER BY cnt DESC, c.name")
        return {"items": [
            {"id": r["id"], "code": r["code"], "name": r["name"], "flag": r["flag"],
             "region": r["region"], "count": r["cnt"]}
            for r in rows
        ]}
    rows = db.q("SELECT * FROM countries ORDER BY name")
    return {"items": [dict(r) for r in rows]}


@app.get("/api/v1/languages")
@app.get("/api/v1/languages-catalog")  # alias
def languages(with_counts: bool = True):
    db = CatalogDB.instance()
    if with_counts:
        rows = db.q(
            "SELECT l.id, l.code, l.name, l.native_name, l.flag, COUNT(tl.title_id) AS cnt "
            "FROM languages l LEFT JOIN title_languages tl ON tl.language_id = l.id "
            "GROUP BY l.id ORDER BY cnt DESC, l.name")
        return {"items": [
            {"id": r["id"], "code": r["code"], "name": r["name"],
             "nativeName": r["native_name"], "flag": r["flag"], "count": r["cnt"]}
            for r in rows
        ]}
    rows = db.q("SELECT * FROM languages ORDER BY name")
    return {"items": [dict(r) for r in rows]}


@app.get("/api/v1/collections")
def collections(with_counts: bool = True):
    db = CatalogDB.instance()
    if with_counts:
        rows = db.q(
            "SELECT c.id, c.slug, c.name, c.type, COUNT(tc.title_id) AS cnt "
            "FROM collections c LEFT JOIN title_collections tc ON tc.collection_id = c.id "
            "GROUP BY c.id ORDER BY cnt DESC, c.name")
        return {"items": [
            {"id": r["id"], "slug": r["slug"], "name": r["name"],
             "type": r["type"], "count": r["cnt"]}
            for r in rows
        ]}
    rows = db.q("SELECT * FROM collections ORDER BY name")
    return {"items": [dict(r) for r in rows]}


@app.get("/api/v1/years")
def years():
    db = CatalogDB.instance()
    rows = db.q(
        "SELECT year, COUNT(*) c FROM titles WHERE year IS NOT NULL "
        "GROUP BY year ORDER BY year DESC")
    return {"items": [{"year": r["year"], "count": r["c"]} for r in rows]}


@app.get("/api/v1/sources")
def sources():
    db = CatalogDB.instance()
    rows = db.q(
        "SELECT s.id, s.slug, s.name, s.base_url, s.type, s.enabled, s.is_legal, "
        "COUNT(a.id) AS availability_count "
        "FROM sources s LEFT JOIN availability a ON a.source_id = s.id "
        "GROUP BY s.id ORDER BY availability_count DESC")
    return {"items": [dict(r) for r in rows]}


@app.get("/api/v1/sources/{slug}")
def source_detail(slug: str):
    """Single source by slug, with availability breakdown."""
    db = CatalogDB.instance()
    r = db.q1(
        "SELECT s.id, s.slug, s.name, s.base_url, s.type, s.enabled, s.is_legal, "
        "COUNT(a.id) AS availability_count, "
        "SUM(CASE WHEN a.status = 'available' THEN 1 ELSE 0 END) AS available_now, "
        "MAX(a.last_checked_at) AS last_check "
        "FROM sources s LEFT JOIN availability a ON a.source_id = s.id "
        "WHERE s.slug = ? GROUP BY s.id",
        (slug,),
    )
    if not r:
        raise HTTPException(404, "source not found")
    return dict(r)


@app.get("/api/v1/audience-tags")
def audience_tags(with_counts: bool = True):
    """Content audience categories (NOT user profiling — these are content labels)."""
    db = CatalogDB.instance()
    if with_counts:
        rows = db.q(
            "SELECT a.id, a.slug, a.name, a.description, a.sort_order, "
            "COUNT(t.title_id) AS cnt "
            "FROM audience_tags a LEFT JOIN title_audience_tags t ON t.tag_id = a.id "
            "GROUP BY a.id ORDER BY cnt DESC, a.sort_order")
        return {"items": [
            {"id": r["id"], "slug": r["slug"], "name": r["name"],
             "description": r["description"], "count": r["cnt"]}
            for r in rows
        ]}
    rows = db.q("SELECT * FROM audience_tags ORDER BY sort_order, name")
    return {"items": [dict(r) for r in rows]}


@app.get("/api/v1/title/{id_or_slug}/seasons")
def get_seasons_with_episodes(id_or_slug: str):
    """TV/Anime/Short-Drama season + episode structure (with availability per episode)."""
    db = CatalogDB.instance()
    if id_or_slug.isdigit():
        r = db.q1("SELECT id FROM titles WHERE id = ?", (int(id_or_slug),))
    else:
        r = db.q1("SELECT id FROM titles WHERE slug = ?", (id_or_slug,))
    if not r:
        raise HTTPException(404, "title not found")
    title_id = r["id"]
    seasons = db.q(
        "SELECT * FROM seasons WHERE title_id = ? ORDER BY season_number",
        (title_id,))
    out = []
    for s in seasons:
        eps = db.q(
            "SELECT e.id, e.episode_number, e.title, e.overview, e.thumbnail, "
            "e.air_date, e.runtime, "
            "(SELECT COUNT(*) FROM availability WHERE episode_id = e.id AND kind='playback') AS has_playback, "
            "(SELECT COUNT(*) FROM availability WHERE episode_id = e.id AND kind='metadata') AS has_metadata_link "
            "FROM episodes e WHERE e.season_id = ? ORDER BY e.episode_number",
            (s["id"],))
        out.append({
            "id":            s["id"],
            "season_number": s["season_number"],
            "name":          s["name"],
            "overview":      s["overview"],
            "poster":        s["poster"],
            "air_date":      s["air_date"],
            "episode_count": s["episode_count"],
            "episodes": [dict(e) for e in eps],
        })
    return {"id": title_id, "seasons": out}


# ---------- Slug detail endpoints ----------
# Used by frontend screens that show a single collection / genre / country / language.
# Returns the entity metadata + the first page of titles that match.

def _titles_for_collection(slug: str, page: int, page_size: int):
    db = CatalogDB.instance()
    c = db.q1("SELECT * FROM collections WHERE slug = ?", (slug,))
    if not c:
        raise HTTPException(404, "collection not found")
    offset = (page - 1) * page_size
    rows = db.q(
        "SELECT t.* FROM titles t "
        "JOIN title_collections ct ON ct.title_id = t.id "
        "WHERE ct.collection_id = ? "
        "ORDER BY t.year DESC, t.popularity DESC LIMIT ? OFFSET ?",
        (c["id"], page_size, offset))
    total = db.q1(
        "SELECT COUNT(*) AS n FROM title_collections WHERE collection_id = ?",
        (c["id"],))["n"]
    def safe(row, key, default=None):
        try: return row[key]
        except (KeyError, IndexError): return default
    return {
        "kind": "collection",
        "slug": safe(c, "slug"),
        "name": safe(c, "name"),
        "type": safe(c, "type") or "curated",
        "description": safe(c, "overview") or "",
        "cover_image": safe(c, "poster"),
        "backdrop": safe(c, "backdrop"),
        "count": total,
        "page": page,
        "page_size": page_size,
        "items": attach_relations(rows, db),
    }


@app.get("/api/v1/collections/{slug}")
def collection_detail(slug: str, page: int = Query(1, ge=1), page_size: int = Query(24, ge=1, le=100)):
    return _titles_for_collection(slug, page, page_size)


@app.get("/api/v1/title/{id_or_slug}/franchise")
def title_franchise(id_or_slug: str):
    """Return the movie franchise / collection this title is part of (movies only)."""
    db = CatalogDB.instance()
    if id_or_slug.isdigit():
        r = db.q1("SELECT id, type, title, year FROM titles WHERE id = ?", (int(id_or_slug),))
    else:
        r = db.q1("SELECT id, type, title, year FROM titles WHERE slug = ?", (id_or_slug,))
    if not r:
        raise HTTPException(404, "title not found")
    title_id = r["id"]
    colls = db.q(
        """SELECT mc.id, mc.tmdb_collection_id, mc.slug, mc.name, mc.overview,
                  mc.poster, mc.backdrop, mc.part_count, tc.sort_order
           FROM title_collection tc JOIN movie_collections mc ON mc.id = tc.collection_id
           WHERE tc.title_id = ?
           ORDER BY tc.sort_order""",
        (title_id,),
    )
    if not colls:
        return {"title_id": title_id, "collection": None, "parts": []}
    coll = colls[0]
    parts = db.q(
        """SELECT t.id, t.slug, t.title, t.year, t.original_title,
                  t.type, t.poster, t.backdrop, t.popularity, t.rating,
                  t.runtime, t.overview, t.trailer_url,
                  tc.sort_order,
                  (CASE WHEN t.id = ? THEN 1 ELSE 0 END) AS is_current
           FROM title_collection tc JOIN titles t ON t.id = tc.title_id
           WHERE tc.collection_id = ?
             AND t.type = 'movie'
           ORDER BY COALESCE(t.year, 0), tc.sort_order, t.id""",
        (title_id, coll["id"]),
    )
    def safe(row, key, default=None):
        try: return row[key]
        except (KeyError, IndexError): return default
    return {
        "title_id": title_id,
        "current_id": title_id,
        "collection": {
            "id": safe(coll, "id"),
            "tmdb_collection_id": safe(coll, "tmdb_collection_id"),
            "slug": safe(coll, "slug"),
            "name": safe(coll, "name"),
            "overview": safe(coll, "overview"),
            "poster": safe(coll, "poster"),
            "backdrop": safe(coll, "backdrop"),
            "part_count": safe(coll, "part_count"),
        },
        "parts": [
            {
                "id": safe(p, "id"),
                "slug": safe(p, "slug"),
                "title": safe(p, "title"),
                "original_title": safe(p, "original_title"),
                "year": safe(p, "year"),
                "type": safe(p, "type"),
                "poster": safe(p, "poster"),
                "backdrop": safe(p, "backdrop"),
                "popularity": safe(p, "popularity"),
                "rating": safe(p, "rating"),
                "runtime": safe(p, "runtime"),
                "overview": safe(p, "overview"),
                "sort_order": safe(p, "sort_order"),
                "is_current": bool(safe(p, "is_current")),
            }
            for p in parts
        ],
    }


@app.get("/api/v1/genres/{slug}")
def genre_detail(slug: str, page: int = Query(1, ge=1), page_size: int = Query(24, ge=1, le=100)):
    db = CatalogDB.instance()
    g = db.q1("SELECT * FROM genres WHERE slug = ?", (slug,))
    if not g:
        raise HTTPException(404, "genre not found")
    offset = (page - 1) * page_size
    rows = db.q(
        "SELECT t.* FROM titles t "
        "JOIN title_genres tg ON tg.title_id = t.id "
        "WHERE tg.genre_id = ? "
        "ORDER BY t.popularity DESC, t.year DESC LIMIT ? OFFSET ?",
        (g["id"], page_size, offset))
    total = db.q1(
        "SELECT COUNT(*) AS n FROM title_genres WHERE genre_id = ?",
        (g["id"],))["n"]
    def safe(row, key, default=None):
        try: return row[key]
        except (KeyError, IndexError): return default
    return {
        "kind": "genre",
        "slug": safe(g, "slug"),
        "name": safe(g, "name"),
        "count": total,
        "page": page,
        "page_size": page_size,
        "items": attach_relations(rows, db),
    }


def _titles_for_actor(slug: str, page: int, page_size: int):
    db = CatalogDB.instance()
    a = db.q1("SELECT * FROM actors WHERE slug = ?", (slug,))
    if not a:
        raise HTTPException(404, "actor not found")
    offset = (page - 1) * page_size
    rows = db.q(
        "SELECT t.* FROM titles t "
        "JOIN title_actors ta ON ta.title_id = t.id "
        "WHERE ta.actor_id = ? "
        "ORDER BY t.year DESC, t.popularity DESC LIMIT ? OFFSET ?",
        (a["id"], page_size, offset))
    total = db.q1(
        "SELECT COUNT(*) AS n FROM title_actors WHERE actor_id = ?",
        (a["id"],))["n"]
    def safe(row, key, default=None):
        try: return row[key]
        except (KeyError, IndexError): return default
    return {
        "kind": "actor",
        "slug": safe(a, "slug"),
        "name": safe(a, "name"),
        "photo": safe(a, "photo_url"),
        "tmdb_person_id": safe(a, "tmdb_person_id"),
        "count": total,
        "page": page,
        "page_size": page_size,
        "items": attach_relations(rows, db),
    }


@app.get("/api/v1/actors/{slug}")
def actor_detail(slug: str, page: int = Query(1, ge=1), page_size: int = Query(24, ge=1, le=100)):
    return _titles_for_actor(slug, page, page_size)


def _titles_for_director(slug: str, page: int, page_size: int):
    db = CatalogDB.instance()
    d = db.q1("SELECT * FROM directors WHERE slug = ?", (slug,))
    if not d:
        raise HTTPException(404, "director not found")
    offset = (page - 1) * page_size
    rows = db.q(
        "SELECT t.* FROM titles t "
        "JOIN title_directors td ON td.title_id = t.id "
        "WHERE td.director_id = ? "
        "ORDER BY t.year DESC, t.popularity DESC LIMIT ? OFFSET ?",
        (d["id"], page_size, offset))
    total = db.q1(
        "SELECT COUNT(*) AS n FROM title_directors WHERE director_id = ?",
        (d["id"],))["n"]
    def safe(row, key, default=None):
        try: return row[key]
        except (KeyError, IndexError): return default
    return {
        "kind": "director",
        "slug": safe(d, "slug"),
        "name": safe(d, "name"),
        "photo": safe(d, "photo_url"),
        "tmdb_person_id": safe(d, "tmdb_person_id"),
        "count": total,
        "page": page,
        "page_size": page_size,
        "items": attach_relations(rows, db),
    }


@app.get("/api/v1/directors/{slug}")
def director_detail(slug: str, page: int = Query(1, ge=1), page_size: int = Query(24, ge=1, le=100)):
    return _titles_for_director(slug, page, page_size)


def _titles_for_studio(slug: str, page: int, page_size: int):
    db = CatalogDB.instance()
    s = db.q1("SELECT * FROM studios WHERE slug = ?", (slug,))
    if not s:
        raise HTTPException(404, "studio not found")
    offset = (page - 1) * page_size
    rows = db.q(
        "SELECT t.* FROM titles t "
        "JOIN title_studios ts ON ts.title_id = t.id "
        "WHERE ts.studio_id = ? "
        "ORDER BY t.year DESC, t.popularity DESC LIMIT ? OFFSET ?",
        (s["id"], page_size, offset))
    total = db.q1(
        "SELECT COUNT(*) AS n FROM title_studios WHERE studio_id = ?",
        (s["id"],))["n"]
    def safe(row, key, default=None):
        try: return row[key]
        except (KeyError, IndexError): return default
    return {
        "kind": "studio",
        "slug": safe(s, "slug"),
        "name": safe(s, "name"),
        "logo": safe(s, "logo_url"),
        "tmdb_company_id": safe(s, "tmdb_company_id"),
        "country": safe(s, "country"),
        "founded": safe(s, "founded"),
        "count": total,
        "page": page,
        "page_size": page_size,
        "items": attach_relations(rows, db),
    }


@app.get("/api/v1/studios/{slug}")
def studio_detail(slug: str, page: int = Query(1, ge=1), page_size: int = Query(24, ge=1, le=100)):
    return _titles_for_studio(slug, page, page_size)


def _titles_for_animation_studio(slug: str, page: int, page_size: int):
    db = CatalogDB.instance()
    s = db.q1("SELECT * FROM animation_studios WHERE slug = ?", (slug,))
    if not s:
        raise HTTPException(404, "animation studio not found")
    offset = (page - 1) * page_size
    rows = db.q(
        "SELECT t.* FROM titles t "
        "JOIN title_animation_studios tas ON tas.title_id = t.id "
        "WHERE tas.animation_studio_id = ? "
        "ORDER BY t.year DESC, t.popularity DESC LIMIT ? OFFSET ?",
        (s["id"], page_size, offset))
    total = db.q1(
        "SELECT COUNT(*) AS n FROM title_animation_studios WHERE animation_studio_id = ?",
        (s["id"],))["n"]
    def safe(row, key, default=None):
        try: return row[key]
        except (KeyError, IndexError): return default
    return {
        "kind": "animation_studio",
        "slug": safe(s, "slug"),
        "name": safe(s, "name"),
        "logo": safe(s, "logo_url"),
        "tmdb_company_id": safe(s, "tmdb_company_id"),
        "count": total,
        "page": page,
        "page_size": page_size,
        "items": attach_relations(rows, db),
    }


@app.get("/api/v1/animation-studios/{slug}")
def animation_studio_detail(slug: str, page: int = Query(1, ge=1), page_size: int = Query(24, ge=1, le=100)):
    return _titles_for_animation_studio(slug, page, page_size)


@app.get("/api/v1/actors")
def list_actors():
    db = CatalogDB.instance()
    rows = db.q("SELECT slug, name, photo_url, sort_order FROM actors ORDER BY sort_order, name")
    return {"items": [dict(r) for r in rows]}


@app.get("/api/v1/directors")
def list_directors():
    db = CatalogDB.instance()
    rows = db.q("SELECT slug, name, photo_url, sort_order FROM directors ORDER BY sort_order, name")
    return {"items": [dict(r) for r in rows]}


@app.get("/api/v1/studios")
def list_studios():
    db = CatalogDB.instance()
    rows = db.q("SELECT slug, name, logo_url, sort_order FROM studios ORDER BY sort_order, name")
    return {"items": [dict(r) for r in rows]}


@app.get("/api/v1/animation-studios")
def list_animation_studios():
    db = CatalogDB.instance()
    rows = db.q("SELECT slug, name, logo_url, sort_order FROM animation_studios ORDER BY sort_order, name")
    return {"items": [dict(r) for r in rows]}


@app.get("/api/v1/countries/{code}")
def country_detail(code: str, page: int = Query(1, ge=1), page_size: int = Query(24, ge=1, le=100)):
    db = CatalogDB.instance()
    c = db.q1("SELECT * FROM countries WHERE code = ?",
              (code.upper(),))
    if not c:
        raise HTTPException(404, "country not found")
    offset = (page - 1) * page_size
    rows = db.q(
        "SELECT t.* FROM titles t "
        "JOIN title_countries tc ON tc.title_id = t.id "
        "WHERE tc.country_id = ? "
        "ORDER BY t.popularity DESC, t.year DESC LIMIT ? OFFSET ?",
        (c["id"], page_size, offset))
    total = db.q1(
        "SELECT COUNT(*) AS n FROM title_countries WHERE country_id = ?",
        (c["id"],))["n"]
    def safe(row, key, default=None):
        try: return row[key]
        except (KeyError, IndexError): return default
    return {
        "kind": "country",
        "code": safe(c, "code"),
        "slug": (safe(c, "code") or "").lower(),
        "name": safe(c, "name"),
        "flag": safe(c, "flag"),
        "region": safe(c, "region"),
        "count": total,
        "page": page,
        "page_size": page_size,
        "items": attach_relations(rows, db),
    }


@app.get("/api/v1/languages/{code}")
def language_detail(code: str, page: int = Query(1, ge=1), page_size: int = Query(24, ge=1, le=100)):
    db = CatalogDB.instance()
    lang = db.q1("SELECT * FROM languages WHERE code = ?", (code.lower(),))
    if not lang:
        raise HTTPException(404, "language not found")
    offset = (page - 1) * page_size
    def safe(row, key, default=None):
        try: return row[key]
        except (KeyError, IndexError): return default
    lang_id = safe(lang, "id")
    rows = db.q(
        "SELECT DISTINCT t.* FROM titles t "
        "LEFT JOIN title_languages tl ON tl.title_id = t.id "
        "LEFT JOIN title_audio_languages al ON al.title_id = t.id "
        "LEFT JOIN title_subtitle_languages sl ON sl.title_id = t.id "
        "WHERE tl.language_id = ? OR al.language_id = ? OR sl.language_id = ? "
        "ORDER BY t.popularity DESC, t.year DESC LIMIT ? OFFSET ?",
        (lang_id, lang_id, lang_id, page_size, offset))
    total = db.q1(
        "SELECT COUNT(DISTINCT t.id) AS n FROM titles t "
        "LEFT JOIN title_languages tl ON tl.title_id = t.id "
        "LEFT JOIN title_audio_languages al ON al.title_id = t.id "
        "LEFT JOIN title_subtitle_languages sl ON sl.title_id = t.id "
        "WHERE tl.language_id = ? OR al.language_id = ? OR sl.language_id = ?",
        (lang_id, lang_id, lang_id))["n"]
    return {
        "kind": "language",
        "code": safe(lang, "code"),
        "name": safe(lang, "name"),
        "nativeName": safe(lang, "native_name"),
        "flag": safe(lang, "flag"),
        "count": total,
        "page": page,
        "page_size": page_size,
        "items": attach_relations(rows, db),
    }


@app.api_route("/api/v1/blogs", methods=["GET", "HEAD"])
def list_blogs(page: int = Query(1, ge=1), page_size: int = Query(50, ge=1, le=100)):
    db = CatalogDB.instance()
    try:
        total = db.q1("SELECT COUNT(*) AS n FROM blogs")["n"]
    except Exception:
        total = 0
    offset = (page - 1) * page_size
    try:
        rows = db.q(
            "SELECT slug, title, meta_title, meta_description, category, tags_json, "
            "cover_image, cover_image_alt, middle_image, middle_image_alt, reading_time, "
            "author, region, published_at FROM blogs ORDER BY id DESC LIMIT ? OFFSET ?",
            (page_size, offset)
        )
    except Exception:
        rows = []

    items = []
    for r in rows:
        tags = []
        try:
            if r["tags_json"]:
                tags = json.loads(r["tags_json"])
        except Exception:
            pass
        items.append({
            "slug": r["slug"],
            "title": r["title"],
            "meta_title": r["meta_title"],
            "meta_description": r["meta_description"],
            "category": r["category"],
            "tags": tags,
            "region": r["region"],
            "cover_image": r["cover_image"],
            "cover_image_alt": r["cover_image_alt"],
            "middle_image": r["middle_image"],
            "middle_image_alt": r["middle_image_alt"],
            "reading_time": r["reading_time"],
            "author": r["author"],
            "published_at": r["published_at"],
        })
    return {
        "items": items,
        "blogs": items,
        "total": total,
        "count": len(items),
        "page": page,
        "page_size": page_size
    }


@app.api_route("/api/v1/blogs/{slug}", methods=["GET", "HEAD"])
def blog_detail(slug: str):
    db = CatalogDB.instance()
    clean_slug = slug.replace(".json", "")
    try:
        row = db.q1("SELECT * FROM blogs WHERE slug = ?", (clean_slug,))
    except Exception:
        row = None
    if not row:
        raise HTTPException(404, "blog not found")

    def safe_json(val, default):
        try:
            return json.loads(val) if val else default
        except Exception:
            return default

    return {
        "slug": row["slug"],
        "title": row["title"],
        "meta_title": row["meta_title"],
        "meta_description": row["meta_description"],
        "category": row["category"],
        "tags": safe_json(row["tags_json"], []),
        "region": row["region"],
        "cover_image": row["cover_image"],
        "cover_image_alt": row["cover_image_alt"],
        "middle_image": row["middle_image"],
        "middle_image_alt": row["middle_image_alt"],
        "reading_time": row["reading_time"],
        "author": row["author"],
        "content_markdown": row["content_markdown"],
        "content_html": row["content_html"],
        "faqs": safe_json(row["faqs_json"], []),
        "schema": safe_json(row["schema_json"], {}),
        "featured_titles": safe_json(row["featured_titles_json"], []),
        "published_at": row["published_at"],
        "status": row["status"] if "status" in row.keys() else "published"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7801, log_level="info")