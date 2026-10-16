# E2E Verification Report — 2026-09-23

Ran `scripts/e2e_sweep.ps1` against the local backend (Node :3000 → Python catalog :7801). **41/41 endpoints return 200 OK**. Two real bugs found and fixed during the sweep.

## Health

| Endpoint | Status | Notes |
|---|---|---|
| `GET /health` | 200 | Backend healthy, catalog upstream reachable |
| `GET /api/v1/catalog/health` | 200 | 13,390 indexed, 334 complete, 1,273 partial, 11,783 stub |
| `GET /api/v1/stats` | 200 | 13,136 movies / 203 TV / 32 anime / 19 short_drama |

## Discovery

| Endpoint | Status | Notes |
|---|---|---|
| `GET /api/v1/home` | 200 | 16 categories, all return real titles (no stubs) |
| `GET /api/v1/home?include_stubs=true` | 200 | Same shape, shows raw counts (trending 3945 vs filtered 1100) |
| `GET /api/v1/titles/movies` | 200 | Returns movies |
| `GET /api/v1/titles/tv` | 200 | |
| `GET /api/v1/titles/anime` | 200 | |
| `GET /api/v1/titles/short-dramas` | 200 | |
| `GET /api/v1/titles/trending` | 200 | |
| `GET /api/v1/titles/top-rated` | 200 | |
| `GET /api/v1/titles/latest` | 200 | |
| `GET /api/v1/titles/coming-soon` | 200 | Real upcoming titles (1374 in 2026+) |

## Taxonomy

| Endpoint | Status |
|---|---|
| `GET /api/v1/genres-catalog?with_counts=true` | 200 (28 genres, drama 886, action 484) |
| `GET /api/v1/countries-catalog?with_counts=true` | 200 (42 countries) |
| `GET /api/v1/languages-catalog?with_counts=true` | 200 |
| `GET /api/v1/collections?with_counts=true` | 200 (68 collections) |
| `GET /api/v1/audience-tags` | 200 (18 tags) |
| `GET /api/v1/years` | 200 (year histogram) |

## Slug detail pages

| Endpoint | Status |
|---|---|
| `GET /api/v1/collections/{slug}` | 200 (marvel, etc.) |
| `GET /api/v1/genres/{slug}` | 200 (action, drama, etc.) |
| `GET /api/v1/countries/{code}` | 200 (US, KR, IN, PK, etc.) |
| `GET /api/v1/languages/{code}` | 200 (en, ko, etc.) |

## Title detail

| Endpoint | Status |
|---|---|
| `GET /api/v1/title/{slug}` | 200 (slug-aware) |
| `GET /api/v1/title/{id}` | 200 (numeric id) |
| `GET /api/v1/title/{id}/availability` | 200 |
| `GET /api/v1/title/{id}/translations` | 200 |
| `GET /api/v1/title/{id}/cast` | 200 |
| `GET /api/v1/title/{id}/seasons` | 200 (TV with episode lists) |

## Search

| Endpoint | Status |
|---|---|
| `GET /api/v1/search?q=batman` | 200 (finds Batman: Knightfall) |
| `GET /api/v1/search?q=godfather&type=movie` | 200 (filter by type) |

## Filtering

| Endpoint | Status |
|---|---|
| `GET /api/v1/titles?year=2024&type=movie` | 200 |
| `GET /api/v1/titles?country=PK` | 200 |
| `GET /api/v1/titles?genre=action` | 200 |
| `GET /api/v1/titles?collection=marvel` | 200 |

## Watchlist + History (FIXED in this sweep)

| Endpoint | Status | Notes |
|---|---|---|
| `POST /api/v1/watchlist` (slug body) | 200 | **Fix**: now accepts `{"slug": "..."}` (previously only `{"title_id": N}`) |
| `GET /api/v1/watchlist` | 200 | Returns the row we just added |
| `POST /api/v1/history` (slug body) | 200 | **Fix**: same slug support; field names are `position_sec` / `duration_sec` / `pct` |
| `GET /api/v1/history` | 200 | |

## Admin

| Endpoint | Status |
|---|---|
| `GET /internal/admin/v1/stats` | 200 |
| `GET /internal/admin/v1/duplicates` | 200 (2 duplicate groups found) |
| `GET /internal/admin/v1/sources/health` | 200 |

## Bugs fixed

**Bug 1** — `backend/src/api/watchlist.routes.js` `POST /watchlist`:
- **Before**: required `title_id` or `titleId` in body; slug-only payloads returned 400 `missing_title_id`.
- **After**: accepts both. If neither `id` nor `slug` is provided, returns 400 `missing_title_id_or_slug`.

**Bug 2** — `backend/src/api/watchlist.routes.js` `POST /history`:
- **Before**: same — only `title_id`/`titleId`, no slug.
- **After**: accepts `slug` field as well.

Both changes preserve backwards compatibility (existing `title_id` callers still work).

## Verification script

`scripts/e2e_sweep.ps1` — re-runnable. Each turn checks all 41 endpoints in ~3 seconds. No external dependencies, no auth required (uses `anonymous` user id).
