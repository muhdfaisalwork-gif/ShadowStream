# StreamApp — Full Platform Audit (2026-09-22)

Date: 2026-09-22 18:44 PKT
Auditor: PM + Full-Stack Engineering
Scope: Existing streaming web app `https://ls7m73ztxvfc2.space.minimax.io/` (Expo/React-Native web bundle) + Node/Express backend on `localhost:3000` + Python catalog micro-service on `localhost:7801`.

## 1. Live Infrastructure Snapshot

| Component | Status | Notes |
|---|---|---|
| Backend (Node :3000) | RUNNING | PID 15868 |
| Python catalog (:7801) | RUNNING | PID 2200 |
| Python live-scraper (:7800) | DOWN | not started; live titles cached = 0 |
| Tunnelmole tunnel | UP | `https://0diool-ip-72-255-21-218.tunnelmole.net/api/v1` (deployed CDN uses this) |
| CDN-deployed frontend | STALE | Bundle built against pre-TMDB backend; hits tunnel → sees only **683** unique titles vs current backend's **13,099** |

## 2. Catalog Health (truthful counts)

| Metric | Value | Source |
|---|---|---|
| `indexed` titles (DB) | 13,099 | `/api/v1/stats` |
| `playable_legal` | 10 | verified playback sources |
| `metadata_linked` | 677 | titles with cast/crew/IDs |
| `metadata_complete` | 44 | full cast + episodes + availability |
| `metadata_partial` | 1,273 | some metadata, missing pieces |
| `metadata_stub` | **11,782** | title + year only, no cast/overview/artwork |
| By type | movie 12,897 / tv 181 / anime 14 / short_drama 7 | heavily skewed to movies |
| By decade | 2020s 6,536 → 1900s 1 | good temporal spread |
| Collections | 68 (curated + franchise + thematic) | Marvel/DC/Star Wars/Jurassic/etc. |
| Audience tags | 18 (most have count=0 — unused) | filter infra exists, data missing |
| Countries | 42 listed; **15 have count=0** | Argentina/Australia/Bangladesh/Brazil/Canada/etc. all empty |
| Languages | 12 with real counts (English 12,994 dominant) | ok |

## 3. Endpoint Health

| Endpoint | Status | Notes |
|---|---|---|
| `GET /health` | OK | reports live + catalog availability |
| `GET /api/v1/categories` | OK | 16 home rows × 15 items each |
| `GET /api/v1/home` | OK | same as categories |
| `GET /api/v1/genres` | OK | 24 genres |
| `GET /api/v1/countries` | OK | 42 entries |
| `GET /api/v1/languages` | OK | 12 entries with flags |
| `GET /api/v1/years` | OK | 1903–2026 |
| `GET /api/v1/collections` | OK | 68 entries |
| `GET /api/v1/audience-tags` | OK | 18 entries, most count=0 |
| `GET /api/v1/sources` | OK | 8 verified legal sources |
| `GET /api/v1/stats` | OK | catalog quality breakdown |
| `GET /api/v1/titles` | OK | full filter set: type/genre/country/language/year/rating/audio_language/subtitle_language/collection/sort/playable_only |
| `GET /api/v1/titles/movies` | OK | 12,897 |
| `GET /api/v1/titles/tv` | OK | 181 |
| `GET /api/v1/titles/anime` | OK | 14 |
| `GET /api/v1/titles/short-dramas` | OK | 7 |
| `GET /api/v1/titles/trending` | OK | works |
| `GET /api/v1/titles/top-rated` | OK | works |
| `GET /api/v1/titles/latest` | OK | works |
| **`GET /api/v1/titles/coming-soon`** | **EMPTY** | proxy returns `{items: []}` because no `status=upcoming` rows exist in DB and the proxy doesn't inject that filter |
| `GET /api/v1/search?q=` | OK | debounced; returns facets |
| `GET /api/v1/title/{id}` | OK | full detail with relations |
| `GET /api/v1/title/{id}/seasons` | OK | when episodes exist (Chernobyl works) |
| `GET /api/v1/title/{id}/cast` | OK | |
| `GET /api/v1/title/{id}/availability` | OK | |
| `GET /api/v1/title/{id}/translations` | OK | |
| `GET /api/v1/title/{id}/assets` | OK | |
| **`GET /api/v1/collections/{slug}`** | **404** | proxy PATHS list excludes it; frontend bypasses via `/titles?collection={slug}` which works |
| **`GET /api/v1/genres/{slug}`** | **404** | same — frontend uses `/titles?genre={slug}` which works |
| **`GET /api/v1/countries/{code}`** | **404** | same — frontend uses `/titles?country={code}` which works |
| `GET /api/v1/health` (legacy) | OK | |

## 4. Frontend Screen Inventory (React Native Web)

| Screen | File | Status | Notes |
|---|---|---|---|
| Home | `HomeScreen.js` | OK | hero + 16 categories + continue watching |
| Movies | `MoviesScreen.js` | OK | tabs + country pills + 3 sorts + load more |
| TV | `TVScreen.js` | OK | similar pattern |
| Anime | `AnimeScreen.js` | OK | DUB/SUB filter, poster cards |
| Short Dramas | `ShortDramasScreen.js` | OK | 7 titles shown |
| Genres | `GenreScreen.js` | OK | tab + chips + grid |
| Countries | `CountriesScreen.js` | OK | regional grid |
| CountryDetail | `CountryDetailScreen.js` | OK | hero + grid + ranking |
| Languages | `LanguagesScreen.js` | OK | language list |
| Collections | `CollectionsScreen.js` | OK | 68 cards w/ tabs by kind |
| CollectionDetail | `CollectionDetailScreen.js` | OK | hero + chronological grid |
| Browse | `BrowseScreen.js` | OK | generic queryable grid |
| Search | `SearchScreen.js` | OK | debounced + facets + type/genre/country/rating/playable filters |
| Watchlist | `WatchlistScreen.js` | OK | local + remote sync |
| History | `HistoryScreen.js` | OK | local + remote sync, continue watching first |
| TitleDetail | `TitleDetailScreen.js` | OK | backdrop + poster + meta + episodes + cast + similar |
| Player | `PlayerScreen.js` | OK | expo-av WebView player |
| Settings | `SettingsScreen.js` | OK | |

## 5. Status by User-Requirement Bucket

### ✅ WORKING
- Multi-facet catalog API (titles filterable by type + genre + country + language + year + rating + collection + audio/subtitle language)
- 16-row homepage variety engine (trending/latest/popular/anime/K-Drama/C-Drama/Indian/Pakistani/Arabic/action/horror/romance/short-dramas/free/coming-soon)
- Hero banner with rotating featured titles + dots indicator
- Continue Watching surface from history
- Watchlist + History with localStorage + remote SQLite persistence (per-user)
- TV detail with season selector + episode cards
- Cast carousel on detail
- Similar titles via first-genre filter
- Search with debounce + abort + facets
- Multi-tab discovery on Movies/TV/Anime/Short Dramas screens
- 68 curated collections (Marvel, DC, Star Wars, Jurassic, Pixar, Studio Ghibli, …)
- 42 countries with flags + counts (where data exists)
- 12 languages with native names + flags
- Responsive: drawer permanent on desktop, drawer-on-mobile via header
- Mobile bottom tab bar
- Skeleton loaders
- TMDB-backed posters/backdrops for the 677 metadata-linked titles
- 100% legal-source compliance (Internet Archive, Blender, NASA, Wikimedia, Pixabay, Pexels)

### ⚠️ PARTIAL
- **Filter combinations** — `MoviesScreen` supports type+genre+country+sort but only 3 sort options (popularity/rating/year). Need: alphabetical, newest-added, trending, runtime.
- **Countries coverage** — 15 of 42 country codes have 0 titles (AR/AU/BD/BR/CA/CO/DK/XX/IR/IQ/CI/KE/LB/MY/MA/NO/PL/RU/SA/ZA/SE/SY/TH/AE). Need ingest from international cinema sources.
- **TV series** — only 181 TV titles in DB; many lack season/episode data. Need ingest from TV-focused sources.
- **Anime** — only 14 anime titles; spec wants 25+ categories (Trending/Latest/Popular/TopRated/New/Completed/Ongoing/Movies/Series/Dubbed). Need ingest from authorized anime metadata (e.g. TMDB anime endpoints).
- **Short dramas** — only 7 titles. Need real short-drama source ingest.
- **Audience tags** — 18 entries but 13 have count=0. Need to backfill from ratings/genres.
- **Coming Soon** — endpoint returns empty; no `status=upcoming` rows in DB. Need a real upcoming feed or label it as "no upcoming announcements yet" with empty-state.
- **Collections detail endpoint** — `/api/v1/collections/{slug}` 404s; frontend works around with `/titles?collection={slug}`.
- **Genre/Country detail endpoints** — same as above; `/api/v1/genres/{slug}` 404s.
- **Playback** — only 10 titles have a real verified playback URL (Internet Archive / Blender / Pixabay). All other titles show "Discovery Mode" banner.
- **Third-party embed URLs in deployed bundle** — bundle contains `vidsrc.me`, `multiembed.mov`, `vidsrc.to` URLs for fallback playback. These are unverified third-party hosts that may serve unauthorized streams. Should be replaced with verified legal sources only.
- **SEO** — RN Web bundle ships a single `<div id="root">` for every route; no per-page `<title>`, no meta description, no canonical, no Open Graph. Zero organic search visibility.
- **Performance** — categories endpoint returns 176KB JSON (full poster+backdrop URLs embedded). Home screen makes one large fetch and renders 16 rows × 15 items at once.
- **Drawer nav** — works on desktop (permanent), but on mobile it's hidden behind header burger button — no auto-close on route change.

### ❌ BROKEN / MISSING
- **Live scraper (:7800) offline** — TMDB enrichment disabled, `liveTitlesCached=0`, `liveAvailable=false`.
- **CDN-deployed frontend uses stale tunnel** — bundle was built when backend had 683 titles; current backend has 13,099. Live site is effectively frozen on the old catalog.
- **Coming-soon empty** — page loads but shows zero results (no data).
- **No real-time TMDB enrichment on demand** — `/api/v1/title/{slug}` works only if slug already in DB; ad-hoc title resolution missing.
- **No mobile-only filter drawer** — Search filters panel exists, but no equivalent for Movies/TV.

### 🔧 NEEDS DATA (most impactful first)
1. **Bulk-ingest popular anime** — at minimum One Piece, Naruto, Bleach, Death Note, Demon Slayer, Jujutsu Kaisen, Attack on Titan, My Hero Academia, Spy×Family, Frieren, Solo Leveling, Chainsaw Man, Black Clover, Fullmetal Alchemist, Hunter×Hunter, Steins;Gate, Cowboy Bebop, One Punch Man, Mob Psycho 100, Vinland Saga, Tokyo Ghoul, Sword Art Online, Re:Zero, Dr. Stone, Made in Abyss, Violet Evergarden, Kaguya-sama, Fruits Basket, Clannad, Erased, Promised Neverland.
2. **Bulk-ingest popular TV** — Breaking Bad, Game of Thrones, House of the Dragon, The Last of Us, Severance, The Bear, Succession, The Wire, The Sopranos, Stranger Things, Squid Game, Money Heist, Dark, Peaky Blinders, The Crown, The Boys, Mandalorian, WandaVision, Loki, Wednesday, Ted Lasso, Fleabag, Chernobyl (already in), Band of Brothers.
3. **Bulk-ingest Pakistani cinema** — add 25+ titles (current bucket has only 10 IDs).
4. **Bulk-ingest Nigerian cinema** — bucket empty; need Nollywood titles.
5. **Bulk-ingest Turkish dizi** — bucket empty.
6. **Bulk-ingest Indian drama serials** — bucket empty beyond Bollywood.
7. **Coming Soon seed** — at minimum 15 announced 2026/2027 titles with placeholder metadata.
8. **Real metadata for stub titles** — 11,782 titles are stubs; need to backfill from TMDB where possible (poster, overview, cast, genres).

### 🔧 NEEDS UX/DESIGN
1. **Empty-state UI** — Coming Soon page shows blank; needs "No upcoming announcements yet" card.
2. **Filter chips for browse pages** — Search has them; Movies/TV/Anime need same.
3. **Pagination** — current MoviesScreen uses manual "Load More" button; should switch to infinite-scroll trigger.
4. **SEO meta tags** — RN Web doesn't update `<title>` on navigation. Add react-helmet-async or pre-render key pages.
5. **Clean URL routing** — currently RN Web uses hash routing (`#/...`); no shareable deep links.
6. **Image lazy loading** — all 240 posters on Movies screen load immediately.
7. **Skeleton states for cards** — SkeletonGrid exists; should match real layout shape.

### 🔧 NEEDS BACKEND
1. **TMDB enrichment pipeline** — currently disabled (no TMDB_API_KEY in env). Need auto-enrichment job for stub titles.
2. **Real ingestion sources** — current 13,099 titles came from a bulk Wikipedia/TMDb-style ingest; need ongoing sync.
3. **Search ranking** — current search is keyword match on title; needs fuzzy + weighted scoring (title > overview > cast).
4. **Trending signal** — `popularity` column is the only sort hint; should derive from watch events (last 7d).
5. **Coming-soon model** — no schema for `status=upcoming` + `expected_release_date`; need to add.
6. **Episode cache** — seasons endpoint computes on the fly; should cache.
7. **Caching layer** — `/api/v1/categories` re-runs heavy SQL on every call; need Redis or in-memory TTL.

### 🔧 NEEDS QA
1. E2E test the full path: home → category → grid → detail → episode → player → history → resume.
2. Verify player playback on real legal sources (Internet Archive direct MP4).
3. Verify all 68 collection pages render.
4. Verify all 42 country pages render (even ones with 0 titles).
5. Verify search returns expected facets for edge cases (no results, partial matches, special characters).
6. Verify watchlist + history sync between two browsers (same user_id).

## 6. Files / Modules That Already Implement Spec

| Spec section | Implementation |
|---|---|
| §3 content types | `?type=movie\|tv\|anime\|short_drama` |
| §4 movie categories | MoviesScreen tabs + genre filters + country pills |
| §5 TV categories | TVScreen + collection slugs |
| §6 anime | AnimeScreen + `?type=anime` |
| §7 short dramas | ShortDramasScreen + `?type=short_drama` |
| §8 genres | 24 normalized genres in DB |
| §9 thematic collections | 68 collections across franchise/thematic/editorial/curated kinds |
| §10 audience | 18 audience tags (mostly empty) |
| §11 country | 42 countries |
| §13 language | 12 languages |
| §14 dub/sub | `audio_language` + `subtitle_language` query params |
| §15 year | `year_min` / `year_max` + `/api/v1/years` |
| §16 sorting | `sort=popularity\|rating\|year\|newest` (needs more) |
| §17 movie detail | TitleDetailScreen with full meta + CTAs |
| §18 TV detail | TitleDetailScreen with season selector + episodes |
| §19 search | SearchScreen with debounce + abort |
| §20 search filters | type/genre/country/min_rating/playable_only |
| §21 browse pages | Movies/TV/Anime/Short/Genres/Countries/Languages/Collections |
| §22 homepage | HomeScreen with hero + 16 rows |
| §23 hero | HomeScreen rotating banner with dots |
| §24 navigation | Drawer (desktop permanent + mobile slide) + MobileTabBar |
| §25 cards | MediaCard with poster + title + year + rating + type badge |
| §26 continue watching | HomeScreen from HistoryAPI.list |
| §27 watchlist | WatchlistScreen + WatchlistAPI (local+remote) |
| §28 history | HistoryScreen + HistoryAPI (local+remote) |
| §29 recommendations | TitleDetailScreen "More Like This" |
| §30 catalog DB | single titles table + junction tables (genres/countries/languages) |
| §31 availability | availability[] in title detail (source/status/kind/lastChecked/url) |
| §32 data quality | `metadataState` + `dataQualityScore` per title |
| §33 catalog counts | stats endpoint shows truthful indexed/playable/metadata breakdown |
| §34 catalog scale | pagination via `page`+`page_size`; no full-DB dump |
| §35 metadata enrichment | TMDB API configured (disabled without key) |
| §36 ingestion | backend has scraper modules but not running |
| §37 TV episodes | seasons/episodes JSON shape with thumbnail/runtime |
| §38 coming soon | endpoint exists but no data |
| §39 release status | `status` column (released/ongoing/ended/canceled/returning/upcoming) |
| §40 localized titles | `translations[]` + `alternativeTitles[]` in detail |
| §41 URL structure | hash routing only (no clean URLs) |
| §42 SEO | ❌ none |
| §43 performance | partial — no lazy loading |
| §44 player UX | PlayerScreen with expo-av + retry/error states |
| §45 responsive | RN Web adapts drawer + grid columns |
| §46 accessibility | partial — focus states exist but no ARIA |
| §47 variety engine | /home + /categories drives 16 dynamic rows |
| §48 discovery depth | ✓ titles appear in all facets via filterable /titles |
| §49 view all | CategoryRow "View All" navigates to filtered screens |
| §50 filtered browse | Movies/TV screens combine type+genre+country+sort |
| §51 personalization | Continue Watching surface only (no signed-in profile) |
| §52 empty states | partial — Coming Soon page is blank |
| §53 error handling | apiFetch has timeout + retry; player shows fallback banner |
| §54 admin tools | none — internal DB-only |
| §55 source health | /api/v1/sources endpoint exposes source health |

## 7. Three Highest-Impact Fixes (Sprint 1)

1. **Rebuild + redeploy frontend** so it sees the new 13,099-title backend (currently CDN bundle is locked to the 683-title snapshot).
2. **Fix `/api/v1/titles/coming-soon`** — proxy needs to inject a `status=upcoming` filter that the catalog accepts, OR seed the DB with upcoming rows OR show an empty-state in the frontend when this endpoint returns 0.
3. **Replace unverified third-party embed URLs** (`vidsrc.me`, `multiembed.mov`, `vidsrc.to`) in the deployed bundle with verified legal sources only (Internet Archive / Blender / Pixabay / Pexels). These were injected by the old aggregator path; the platform is supposed to be 100% lawful.

## 8. Three Highest-Impact Fixes (Sprint 2)

1. **TMDB API key** — enable `TMDB_API_KEY` so stub titles can be backfilled with poster/overview/cast.
2. **Browse filters** — extend Movies/TV/Anime screens with year + language + sort-alphabetical + sort-newest + audio-language + subtitle-language filters.
3. **Per-page SEO meta tags** — add `react-helmet-async` and emit unique `<title>`/`<meta description>`/`<link rel="canonical">` on each screen.

## 9. Architectural Constraints

- The platform is built on **Expo/React Native Web** — strong for cross-platform but weak for SEO. Long-term, marketing pages (browse, search) should be a separate Next.js/SSG frontend with the RN bundle reserved for the player.
- Backend is **Node.js 22+ with `node:sqlite`** — no PostgreSQL yet. Fine for current scale; will need migration at ~100k titles.
- Catalog micro-service is **Python (FastAPI/uvicorn on :7801)** — schema in `backend/src/services/LiveClient.js` doesn't fully expose it. Need to either commit fully to Python or bring the catalog logic into Node.

— End of audit —
