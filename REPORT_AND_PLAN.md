# StreamApp — Report & Plan

**Last updated:** 2026-09-23
**Phase status:** 2 of 20 complete (8 done / 6 partial / 6 not started)

---

## 1. Executive Summary

**What it is today:** A law-compliant, multi-facet streaming-catalog *shell* deployed at https://mb9njv5j4l12l.space.minimax.io. The data model, API, taxonomy, and frontend are all in place. There are zero playable titles in the catalog (by design — every pirate source was removed). The platform honestly reports `0 playable`, not inflated numbers.

**What it is going to be** (per spec): "A large global entertainment catalog that can be explored from many directions."

**Where we are vs. that vision:** ~10% there. Foundation is solid. Catalog is empty.

**What blocks the next step:** an ingestion pipeline against lawful sources (Archive.org, Blender Open Movies, Wikimedia Commons, Prelinger Archives, Pixabay, Pexels, plus TMDB metadata).

---

## 2. Live System

| Component | Status | URL / Port |
|---|---|---|
| **Frontend (Expo bundle, deployed)** | LIVE | https://mb9njv5j4l12l.space.minimax.io |
| Frontend (old, CDN stale — do not use) | AVOID | https://ls7m73ztxvfc2.space.minimax.io |
| Backend (Node/Express, proxies multi-facet to :7801) | RUNNING | http://localhost:3000 |
| Catalog service (Python/FastAPI, canonical schema) | RUNNING | http://localhost:7801 |
| Public tunnel (Tunnelmole → :3000) | RUNNING | https://0diool-ip-72-255-21-218.tunnelmole.net |
| Database (`scraper/catalog.db`, SQLite, 23 tables) | RUNNING | local file |
| MiniMax Space drive node (current deploy) | LIVE | node_id `444512771195110` |

---

## 3. What Phase 2 Left Us With

### Data model (canonical, normalized)
- 13,075 title rows, each with `type` ∈ {movie, tv, anime, short_drama, documentary, special, reality, game_show, talk_show, musical, concert, sport, kids, adult_animation}
- 27 normalized genres (no duplicates, no `anime` genre)
- 29 countries (ISO codes)
- 23 languages (ISO codes), plus per-title `audioLanguages[]` and `subtitleLanguages[]`
- 46 collections (25 seed + 21 from spec §9)
- 18 audience tags (content categories, never user profiling)
- `metadata_state` per title: `stub` (11,785) / `partial` (1,290) / `complete` (0)
- `data_quality_score` 0.0–1.0 per title
- Cast/crew normalized (tables ready, not yet populated)
- Per-locale `title_translations` table (table ready, not populated)
- `media_assets` table (posters/backdrops/logos/stills per language)
- `seasons` + `episodes` tables ready (no rows yet)
- `availability.kind` enum: `playback` / `metadata` / `embed` / `page`

### Hard gates
- Trigger `availability_must_be_legal` blocks any `INSERT INTO availability` whose source has `is_legal=0`. **Verified working at the database layer.**
- `sources` registry contains only: `curated`, `archive_org`, `blender_open`, `pixabay`, `pexels`, `commons`, `prelinger`, `tmdb`, `wikidata`, `criticker`.
- 18 pirate source rows + 12,915 illegal availability rows **deleted** (no soft delete — gone).

### Counts API (the 3-count rule)
```
indexed:           13,075
playable_legal:         0   <-- headline number, zero inflated
metadata_linked:      677
metadata_complete:      0
metadata_partial:   1,290
metadata_stub:     11,785
```

### Frontend
- 1,931,005-byte Expo Web bundle (`index-6d4633124ce49caa05f37a8cbd112c87.js`)
- Honest counts in UI (no `Catalog (13k)` label)
- Settings page declares Phase 2 lawful-only sourcing
- Search mode `Catalog` shows real `indexed` count
- Browse tabs (Movies/TV/Anime/Short Dramas) read counts from `/api/v1/stats`
- Drawer footer: "v2.0.0 • Phase 2 • lawful-only • 10 lawful sources • 29 countries • 23 languages"

---

## 4. Honest Assessment — What Are We Actually Building?

Three layers:

### Layer A — Foundation (40% done, all the hard non-data work)
- Schema, taxonomy, API, frontend, lawful-source enforcement, deploy pipeline
- This work does NOT need to be repeated. It's the platform beneath the catalog.

### Layer B — Content (0% done, the entire product)
- Ingestion against lawful sources
- Legal player pipeline (HLS.js / Video.js with proper licensing per source)
- Per-episode TV / anime / short-drama metadata + playback
- 50 → 500 → 5,000 → 50,000 title progression as ingestion matures

### Layer C — Polish (5% done, mostly deferred from phase 2)
- Mobile-first responsive layouts
- SEO/SSR
- Accessibility (WCAG AA target)
- Performance (lazy load, virtualization, debounced search)
- Admin/source-health dashboard

**The product's center of gravity is Layer B. Everything in Layer A is scaffolding until Layer B fills it.**

---

## 5. 20-Phase Roadmap — Status

| # | Phase | Status | What's there / what's missing |
|---|---|---|---|
| 1 | Audit | DONE | `AUDIT_AND_FIX_REPORT.md` + the Phase 1 audit in this session |
| 2 | Data model | DONE | 23 tables, all relations, lawful-only trigger |
| 3 | Taxonomy | DONE | 46 collections, 27 genres, 18 audience tags |
| 4 | Catalog API | DONE | 19 multi-facet endpoints, proxy chain working |
| 5 | Movies | PARTIAL | Browse OK, **0 playable** |
| 6 | TV + seasons + episodes | PARTIAL | Schema OK, **no episodes ingested** |
| 7 | Anime | NOT STARTED | **1 movie** classified as `anime`, no real anime catalog |
| 8 | Short Dramas | NOT STARTED | **0 titles**, no source ingested |
| 9 | Countries | DONE | 29 ISO codes, full catalog endpoint |
| 10 | Languages + Dubbing + Subs | PARTIAL | Tables ready, **not populated** |
| 11 | Genres | DONE | 27 normalized, no duplicates |
| 12 | Collections + Franchises | DONE | 46 rows (25 seed + 21 spec §9) |
| 13 | Search + Filters | PARTIAL | 3 search modes, **no combined-filter UI** |
| 14 | Watchlist + History + CW | DONE | Server-persisted, SQLite |
| 15 | Detail Pages | PARTIAL | Movie OK, **TV no episodes render** |
| 16 | Player Reliability | NOT DONE | Player uses vidsrc.me / superembed mirrors (pirate), **no legal player** |
| 17 | Performance | NOT STARTED | — |
| 18 | SEO | NOT STARTED | SPA, **no SSR**, no per-title prerender |
| 19 | Accessibility | PARTIAL | Hero respects `prefers-reduced-motion`, nothing else |
| 20 | Final E2E | NOT STARTED | — |

**Status summary:** 8 done / 6 partial / 6 not started.

---

## 6. What Blocks Phase 3

Every Phase 5+ deliverable depends on having actual playable content. Phase 3 = **Ingestion Pipeline**. Without it the site is empty.

Ingestion work, ranked by ROI:

| Source | Type | API access | What it adds | Effort |
|---|---|---|---|---|
| **Internet Archive** ([archive.org](https://archive.org)) | public_domain | [JSON API](https://archive.org/developers/) — no key needed | ~10K films + 50K shorts/clips | Medium |
| **TMDB** ([themoviedb.org](https://www.themoviedb.org/)) | metadata_only | [Free API key](https://www.themoviedb.org/settings/api) | Metadata for ~1M titles (poster, overview, cast, crew, seasons/episodes) — playback from elsewhere | Low |
| **Blender Open Movies** ([studio.blender.org/films](https://studio.blender.org/films/)) | cc_by_3 | [Catalog](https://studio.blender.org/films/) — ~30 films | Curated [CC-BY-3.0](https://creativecommons.org/licenses/by/3.0/) shorts/features | Low |
| **Prelinger Archives** ([archive.org/details/prelinger](https://archive.org/details/prelinger)) | public_domain | Internet Archive sub-collection | ~17K 20C industrial/educational films | Low (subset of Archive.org) |
| **Wikimedia Commons** ([commons.wikimedia.org](https://commons.wikimedia.org/)) | cc_by_sa / PD | [MediaWiki API](https://www.mediawiki.org/wiki/API:Main_page) | Archival newsreels, government footage | Medium |
| **Pixabay** ([pixabay.com](https://pixabay.com/)) | cc0 | [Pixabay API](https://pixabay.com/api/docs/) | Stock footage, modern shorts | Low |
| **Pexels** ([pexels.com](https://www.pexels.com/)) | pexels_license | [Pexels API](https://www.pexels.com/api/documentation/) | Stock footage, modern shorts | Low |
| **AniList** ([anilist.co](https://anilist.co/)) + **JIKAN** ([jikan.moe](https://jikan.moe/)) | metadata only | [AniList API](https://docs.anilist.co/), [JIKAN](https://jikan.moe/) | Anime metadata, episode lists | Medium |
| **StardustTV / ReelShort / GoodShort** | proprietary | no public API | Short dramas (channels, episodes, HLS) | High (likely TOS-blocked) |

**Critical bottleneck:** No legal player. The current player falls back to vidsrc.me / superembed / 2embed / multiembed — all pirate embed aggregators. These were *source-removed* (the row in `sources` is gone) but the **player-side mirror builder** still hardcodes these URLs. Until a legal HLS player replaces them, every Play button leads to a pirate embed.

The legal-player work is a prerequisite for any ingestion to actually work end-to-end.

---

## 7. Recommendation — Three Honest Options

### Option 1 — Narrow: Just the Movies (2–3 weeks)

- Ingest [Internet Archive](https://archive.org) public-domain films: ~5K titles in scope
- Add [TMDB](https://www.themoviedb.org/) metadata for the same titles (overview, poster, runtime, cast)
- Build a legal HLS player ([Video.js](https://videojs.com/) + Archive.org's direct MP4 streams OR [HLS.js](https://github.com/video-dev/hls.js/) if Archive.org serves HLS)
- Manual quality pass on ~500 picked titles
- Result: ~500 playable, fully-catalogued movies. Detail page works. Player works. Watchlist works. Honest headline: "500 movies".

### Option 2 — Wide: All Content Types (5–6 weeks)

Everything in Option 1, plus:
- TV shows via [TMDB](https://www.themoviedb.org/) season/episode endpoints (no playback, metadata only — playback still Archive.org where available)
- Anime via [AniList](https://anilist.co/) + [JIKAN](https://jikan.moe/)
- Short dramas via 2-3 sources with TOS analysis per source before integrating
- Legal player for each source's media format
- Result: 5K-20K items across all content types. Episode-level browse. Anime discovery. Short-drama tab functional.

### Option 3 — Honest MVP: One Working Flow (4–5 days)

- Pick 50 best-of-class public-domain films on [Internet Archive](https://archive.org) (Sintel, Night of the Living Dead, some Chaplin, some Prelinger classics)
- Hand-curated metadata (no scraping) for those 50 titles
- Legal player against Archive.org's direct MP4s
- End-to-end test: home → category → detail → play → progress → watchlist
- Honest headline: "50 playable films"
- Proves the entire stack works before scaling ingestion

### **My recommendation: Option 3 first, then Option 1 in parallel**

Rationale:
- The platform has never worked end-to-end with real playable content. Option 3 proves every layer works before we build ingestion tools.
- Once 50 titles work, we have a working baseline to scale from. Every bug we find in scaling will be the same set of bugs we find at 50, just with more data.
- Option 1 can start in parallel on a separate branch once Option 3 lands. They don't compete.
- Option 2 is the right *goal* but the wrong *first step*. Skipping the 50-title MVP has failed this project before — every previous attempt shipped inflated counts that didn't match playable reality.

---

## 8. Acceptance for "What We Are Building"

What the product should look like when it's done:

- A user opens the site, sees an honest count of playable titles (not thousands of stubs).
- They can browse by Movies / TV / Anime / Short Dramas / Country / Language / Genre / Year.
- They click a title, see a complete detail page (cast, crew, episodes if TV, similar titles).
- They press Play, watch the title in a real legal HLS player with playback progress.
- They can add to Watchlist, the title survives page reload.
- They can come back, see "Continue Watching", and resume exactly where they left off.
- The site looks professional on desktop, tablet, and mobile.
- The site is fast ([LCP](https://web.dev/lcp/) < 2s on mobile), accessible ([WCAG AA](https://www.w3.org/WAI/WCAG2AA-Conformance)), and SEO-discoverable (each title has its own canonical URL with metadata).

That's what we're building. Phase 2 got us to the front door. Phase 3 opens it.

---

## 9. Files of Record in This Project

- [`AUDIT_AND_FIX_REPORT.md`](AUDIT_AND_FIX_REPORT.md) — Pre-Phase-1 audit + bug fixes
- [`REPORT_AND_PLAN.md`](REPORT_AND_PLAN.md) (this file) — Current state + roadmap
- [`Architecting a Resilient Free Streamer_ An Analysis of Aggregator Models for Cross-Platform App Development.pdf`](Architecting%20a%20Resilient%20Free%20Streamer_%20An%20Analysis%20of%20Aggregator%20Models%20for%20Cross-Platform%20App%20Development.pdf) — Research paper on aggregator-streamer market
- [`scraper/phase2_migration.py`](scraper/phase2_migration.py) — Idempotent schema migration script
- [`scraper/catalog_schema.py`](scraper/catalog_schema.py) — Canonical schema + canonical taxonomies
- [`scraper/catalog_service.py`](scraper/catalog_service.py) — FastAPI catalog service on :7801
- [`backend/src/api/catalog.routes.js`](backend/src/api/catalog.routes.js) — Backend proxy to catalog service
- [`frontend/App.js`](frontend/App.js) — Single-file frontend (3110 lines, awaiting refactor in Phase 17)
- [`frontend/dist/`](frontend/dist/) — Built bundle ready to deploy (`index-6d4633124ce49caa05f37a8cbd112c87.js`)
- [`.live-config`](.live-config) — Current URLs + service ports + known issues
- Backups before Phase 2: [`backups/phase2-20260922-152955/`](backups/phase2-20260922-152955/) (catalog.db + cache.db + streaming_app.db snapshots)

---

## 10. The Honest One-Line Answer

**Right now: a deployed, lawful, but empty shell. Next: prove the full flow with 50 hand-curated titles, then scale ingestion.**

---

# References

## Live system

| Resource | URL / Path |
|---|---|
| Live frontend (Phase 2, in-place deployment) | https://mb9njv5j4l12l.space.minimax.io |
| MiniMax Space drive node (current) | node_id `444512771195110` |
| Local backend (Node/Express) | http://localhost:3000 |
| Local catalog service (FastAPI) | http://localhost:7801 |
| Public tunnel (Tunnelmole → :3000) | https://0diool-ip-72-255-21-218.tunnelmole.net |
| Old frontend URL (CDN stale, do not use) | https://ls7m73ztxvfc2.space.minimax.io |
| Old frontend node_id (CDN-stale) | `444010127544573` |
| Site `/health` | http://localhost:3000/health |
| Site `/api/v1/stats` | http://localhost:3000/api/v1/stats |
| Database file | `G:\streaming app\scraper\catalog.db` (23 tables, 13,075 title rows) |
| Backend logs | `G:\streaming app\backend\backend.out.log` |
| Catalog service logs | `G:\streaming app\scraper\catalog_service.out.log` |
| Tunnel logs | `G:\streaming app\tunnel.out.log` |

## Project files

| File | Purpose |
|---|---|
| [`G:\streaming app\REPORT_AND_PLAN.md`](G:\streaming%20app\REPORT_AND_PLAN.md) | This document |
| [`G:\streaming app\AUDIT_AND_FIX_REPORT.md`](G:\streaming%20app\AUDIT_AND_FIX_REPORT.md) | Pre-Phase-1 audit |
| [`G:\streaming app\.live-config`](G:\streaming%20app\.live-config) | Live URLs + service ports + status |
| [`G:\streaming app\scraper\phase2_migration.py`](G:\streaming%20app\scraper\phase2_migration.py) | Idempotent migration script |
| [`G:\streaming app\scraper\catalog_schema.py`](G:\streaming%20app\scraper\catalog_schema.py) | Canonical schema |
| [`G:\streaming app\scraper\catalog_service.py`](G:\streaming%20app\scraper\catalog_service.py) | FastAPI service |
| [`G:\streaming app\backend\src\api\catalog.routes.js`](G:\streaming%20app\backend\src\api\catalog.routes.js) | Backend proxy |
| [`G:\streaming app\frontend\App.js`](G:\streaming%20app\frontend\App.js) | Frontend (3110 lines, single file) |
| [`G:\streaming app\frontend\dist\index.html`](G:\streaming%20app\frontend\dist\index.html) | Deploy entry point |
| [`G:\streaming app\frontend\dist\_expo\static\js\web\index-6d4633124ce49caa05f37a8cbd112c87.js`](G:\streaming%20app\frontend\dist\_expo\static\js\web\index-6d4633124ce49caa05f37a8cbd112c87.js) | Built bundle (1,931,005 bytes) |
| [`G:\streaming app\backups\phase2-20260922-152955\`](G:\streaming%20app\backups\phase2-20260922-152955\) | Pre-Phase-2 DB snapshots |
| [`G:\streaming app\Architecting a Resilient Free Streamer_ An Analysis of Aggregator Models for Cross-Platform App Development.pdf`](G:\streaming%20app\Architecting%20a%20Resilient%20Free%20Streamer_%20An%20Analysis%20of%20Aggregator%20Models%20for%20Cross-Platform%20App%20Development.pdf) | Background research |

## Lawful content providers (Phase 3 ingestion candidates)

| Provider | URL | License | API |
|---|---|---|---|
| Internet Archive | [archive.org](https://archive.org/) | Public Domain | [developers.archive.org](https://archive.org/developers/) |
| Prelinger Archives | [archive.org/details/prelinger](https://archive.org/details/prelinger) | Public Domain | subset of Archive.org |
| Blender Open Movies | [studio.blender.org/films](https://studio.blender.org/films/) | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) | static catalog |
| Wikimedia Commons | [commons.wikimedia.org](https://commons.wikimedia.org/) | CC BY-SA / Public Domain | [MediaWiki API](https://www.mediawiki.org/wiki/API:Main_page) |
| Pixabay | [pixabay.com](https://pixabay.com/) | [Pixabay License](https://pixabay.com/service/license/) / CC0 | [Pixabay API docs](https://pixabay.com/api/docs/) |
| Pexels | [pexels.com](https://www.pexels.com/) | [Pexels License](https://www.pexels.com/license/) | [Pexels API docs](https://www.pexels.com/api/documentation/) |
| The Movie DB (metadata) | [themoviedb.org](https://www.themoviedb.org/) | Free for non-commercial | [API settings](https://www.themoviedb.org/settings/api) |
| Wikidata | [wikidata.org](https://www.wikidata.org/) | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) | [Wikidata API](https://www.wikidata.org/w/api.php) |
| AniList (anime metadata) | [anilist.co](https://anilist.co/) | GraphQL free | [AniList docs](https://docs.anilist.co/) |
| JIKAN (MAL unofficial) | [jikan.moe](https://jikan.moe/) | Free | [JIKAN docs](https://jikan.moe/) |
| Criticker (metadata) | [criticker.com](https://www.criticker.com/) | Free read | n/a |

## Frontend stack

| Component | Library | Version | Doc |
|---|---|---|---|
| React Native runtime | react-native-web | 0.21.2 | [reactnative.dev](https://reactnative.dev/) |
| Bundler | Expo (Metro) | 57.0.24 | [docs.expo.dev](https://docs.expo.dev/) |
| Navigation | React Navigation | 7.x | [reactnavigation.org](https://reactnavigation.org/) |
| Audio/Video | expo-av (deprecated) | 16.0.8 | [expo-av deprecation note](https://docs.expo.dev/versions/latest/sdk/video/) |
| Build target | Expo Web export | — | [Expo Web docs](https://docs.expo.dev/workflow/web/) |

## Backend stack

| Component | Library | Version | Doc |
|---|---|---|---|
| HTTP server | Express | 5.2.1 | [expressjs.com](https://expressjs.com/) |
| CORS | cors | 2.8.x | [github.com/expressjs/cors](https://github.com/expressjs/cors) |
| HTTP client | Playwright (server-side fetch for catalog proxy) | 1.63 | [playwright.dev](https://playwright.dev/) |
| Env | dotenv | 18.x | [github.com/motdotla/dotenv](https://github.com/motdotla/dotenv) |
| Catalog API | FastAPI | 0.141 | [fastapi.tiangolo.com](https://fastapi.tiangolo.com/) |
| Validation | Pydantic | 2.13 | [docs.pydantic.dev](https://docs.pydantic.dev/) |
| ASGI | Uvicorn | 0.49 | [uvicorn.dev](https://www.uvicorn.dev/) |
| HTTP (Python) | httpx | 0.28 | [python-httpx.org](https://www.python-httpx.org/) |
| Database | SQLite 3 | 3.50 | [sqlite.org](https://www.sqlite.org/) |
| Tunnel | tunnelmole (open-source ngrok alt) | 2.4 | [tunnelmole.com](https://tunnelmole.com/) |

## Reference platforms studied (research only — not used as sources)

| Site | Model | Status |
|---|---|---|
| MovieBoxHD | Aggregator APK | Volatile |
| BeeTV | Aggregator APK | Volatile |
| 123Movies | Aggregator | Volatile |
| YTS / YIFY | Torrent | Volatile |
| VidSrc / SuperEmbed / 2Embed / MultiEmbed | Pirate embed aggregators | **REMOVED from this project** |
| UFlix, Donkey, TMovies, OnStream, HDO Box | Volatile aggregators | **REMOVED from this project** |

## Reference docs / standards

| Reference | URL |
|---|---|
| MovieBox-style reference (research only) | [movieboxhd.net](https://movieboxhd.net/) (research only, not integrated) |
| WCAG 2.2 AA (accessibility target) | [w3.org/WAI/WCAG22](https://www.w3.org/WAI/WCAG22/Understanding/) |
| Core Web Vitals (LCP / INP / CLS) | [web.dev/vitals](https://web.dev/vitals/) |
| Schema.org structured data (for SEO) | [schema.org](https://schema.org/) |
| Open Graph protocol (social sharing) | [ogp.me](https://ogp.me/) |
| ISO 3166-1 country codes | [iso.org](https://www.iso.org/iso-3166-country-codes.html) |
| ISO 639-1 language codes | [iso.org](https://www.iso.org/iso-639-language-codes.html) |
| Creative Commons licenses | [creativecommons.org](https://creativecommons.org/) |
| TLS / ACM piracy background | not applicable to lawful-only scope |

## Channel / one-line status

- **Live:** https://mb9njv5j4l12l.space.minimax.io  →  tunnel  https://0diool-ip-72-255-21-218.tunnelmole.net  →  :3000  →  :7801  →  `catalog.db`
- **Catalog:** 13,075 indexed / 0 playable / 677 metadata-linked
- **Sources:** 10 lawful / 0 pirate (DB-trigger-enforced)
- **Phase:** 2 of 20 done
