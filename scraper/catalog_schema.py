"""
catalog_schema.py — Normalized multi-facet catalog schema (Phase 2)

One canonical title record. Many relationships. Many availability records.
No duplication across categorization paths.

Tables:
  sources           - registry of stream sources
  titles            - canonical movie/show record (one row per unique title)
  title_genres      - junction: title x genre
  title_countries   - junction: title x production country
  title_languages   - junction: title x spoken language
  title_audio_languages    - available dubbing languages
  title_subtitle_languages - available subtitle languages
  title_collections - junction: title x collection/franchise
  title_aka         - alternative/localized titles
  seasons           - TV season metadata
  episodes          - TV episode metadata
  availability      - per-source availability for a title (separates meta from playback)
  genres            - canonical genre list
  countries         - canonical country list
  languages         - canonical language list
  collections       - canonical collection/franchise list
  crawl_state       - per-source freshness tracking
  ingest_log        - per-source ingest audit (new, updated, rejected, duplicates)
  user_watchlist    - per-user watchlist (when auth lands)
  user_history      - per-user viewing history (when auth lands)
"""
from __future__ import annotations
import sqlite3
from pathlib import Path
from typing import Iterable

SCHEMA_SQL = """
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;

-- Canonical genre list (taxonomy) ----------------------------------
CREATE TABLE IF NOT EXISTS genres (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT NOT NULL UNIQUE,         -- action, sci-fi, science-fiction
  name        TEXT NOT NULL UNIQUE,         -- "Action", "Science Fiction" (canonical)
  name_aliases TEXT NOT NULL DEFAULT '[]',  -- JSON list of accepted variants
  parent_id   INTEGER REFERENCES genres(id),
  sort_order  INTEGER NOT NULL DEFAULT 100,
  created_at  INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

-- Canonical country list ------------------------------------------
CREATE TABLE IF NOT EXISTS countries (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT NOT NULL UNIQUE,         -- ISO 3166-1 alpha-2
  name        TEXT NOT NULL UNIQUE,
  flag        TEXT,                         -- emoji
  region      TEXT,                         -- asia, europe, americas, africa, oceania
  sort_order  INTEGER NOT NULL DEFAULT 100
);

-- Canonical language list -----------------------------------------
CREATE TABLE IF NOT EXISTS languages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT NOT NULL UNIQUE,         -- ISO 639-1
  name        TEXT NOT NULL UNIQUE,
  native_name TEXT,
  flag        TEXT
);

-- Canonical collection/franchise list -------------------------------
CREATE TABLE IF NOT EXISTS collections (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT NOT NULL UNIQUE,         -- marvel-cinematic-universe, star-wars
  name        TEXT NOT NULL UNIQUE,         -- "Marvel Cinematic Universe"
  type        TEXT NOT NULL DEFAULT 'franchise', -- franchise, universe, saga, brand
  poster      TEXT,
  backdrop    TEXT,
  overview    TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 100
);

-- Canonical title record -------------------------------------------
CREATE TABLE IF NOT EXISTS titles (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  slug            TEXT NOT NULL UNIQUE,             -- URL-safe slug (e.g. "inception-2010")
  title           TEXT NOT NULL,
  original_title  TEXT,
  type            TEXT NOT NULL CHECK(type IN ('movie','tv','anime','short_drama','documentary','special','reality','game_show','talk_show','musical','concert','sport','kids','adult_animation')),
  year            INTEGER,
  release_date    TEXT,
  runtime         INTEGER,                          -- minutes
  certification    TEXT,
  rating          REAL,                             -- 0-10 normalized numeric
  rating_count    INTEGER DEFAULT 0,                -- # votes
  popularity      REAL DEFAULT 0,                    -- internal score
  overview        TEXT,
  tagline         TEXT,
  poster          TEXT,
  backdrop        TEXT,
  trailer_url     TEXT,
  tmdb_id         INTEGER,
  imdb_id         TEXT,
  status          TEXT DEFAULT 'released',          -- released, upcoming, ongoing, ended, returning, canceled
  is_anime        INTEGER NOT NULL DEFAULT 0,        -- 0/1 shortcut for type='anime'
  is_short_drama  INTEGER NOT NULL DEFAULT 0,
  created_at      INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  updated_at      INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_titles_type ON titles(type);
CREATE INDEX IF NOT EXISTS idx_titles_year ON titles(year);
CREATE INDEX IF NOT EXISTS idx_titles_rating ON titles(rating);
CREATE INDEX IF NOT EXISTS idx_titles_status ON titles(status);
CREATE INDEX IF NOT EXISTS idx_titles_popularity ON titles(popularity);
CREATE INDEX IF NOT EXISTS idx_titles_tmdb ON titles(tmdb_id);
CREATE INDEX IF NOT EXISTS idx_titles_imdb ON titles(imdb_id);
CREATE INDEX IF NOT EXISTS idx_titles_slug ON titles(slug);

-- Junction tables ---------------------------------------------------
CREATE TABLE IF NOT EXISTS title_genres (
  title_id    INTEGER NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
  genre_id    INTEGER NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
  PRIMARY KEY (title_id, genre_id)
);
CREATE INDEX IF NOT EXISTS idx_tg_genre ON title_genres(genre_id);

CREATE TABLE IF NOT EXISTS title_countries (
  title_id    INTEGER NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
  country_id  INTEGER NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
  PRIMARY KEY (title_id, country_id)
);
CREATE INDEX IF NOT EXISTS idx_tc_country ON title_countries(country_id);

CREATE TABLE IF NOT EXISTS title_languages (
  title_id    INTEGER NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
  language_id INTEGER NOT NULL REFERENCES languages(id) ON DELETE CASCADE,
  is_original INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (title_id, language_id)
);
CREATE INDEX IF NOT EXISTS idx_tl_language ON title_languages(language_id);

CREATE TABLE IF NOT EXISTS title_audio_languages (
  title_id    INTEGER NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
  language_id INTEGER NOT NULL REFERENCES languages(id) ON DELETE CASCADE,
  PRIMARY KEY (title_id, language_id)
);

CREATE TABLE IF NOT EXISTS title_subtitle_languages (
  title_id    INTEGER NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
  language_id INTEGER NOT NULL REFERENCES languages(id) ON DELETE CASCADE,
  PRIMARY KEY (title_id, language_id)
);

CREATE TABLE IF NOT EXISTS title_collections (
  title_id      INTEGER NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
  collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  PRIMARY KEY (title_id, collection_id)
);
CREATE INDEX IF NOT EXISTS idx_tcc_collection ON title_collections(collection_id);

-- Alternative titles -------------------------------------------------
CREATE TABLE IF NOT EXISTS title_aka (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title_id    INTEGER NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
  aka_title   TEXT NOT NULL,
  language_id INTEGER REFERENCES languages(id),     -- NULL = unspecified language
  region      TEXT                                 -- IN, KR, JP, etc.
);
CREATE INDEX IF NOT EXISTS idx_aka_title ON title_aka(title_id);
CREATE INDEX IF NOT EXISTS idx_aka_aka ON title_aka(aka_title);

-- TV seasons/episodes ----------------------------------------------
CREATE TABLE IF NOT EXISTS seasons (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  title_id     INTEGER NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
  season_number INTEGER NOT NULL,
  name         TEXT,
  overview     TEXT,
  poster       TEXT,
  air_date     TEXT,
  episode_count INTEGER DEFAULT 0,
  UNIQUE(title_id, season_number)
);
CREATE INDEX IF NOT EXISTS idx_seasons_title ON seasons(title_id);

CREATE TABLE IF NOT EXISTS episodes (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  season_id      INTEGER NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  episode_number INTEGER NOT NULL,
  title          TEXT,
  overview       TEXT,
  thumbnail      TEXT,
  air_date       TEXT,
  runtime        INTEGER,
  UNIQUE(season_id, episode_number)
);
CREATE INDEX IF NOT EXISTS idx_episodes_season ON episodes(season_id);

-- Sources + availability -------------------------------------------
CREATE TABLE IF NOT EXISTS sources (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT NOT NULL UNIQUE,           -- "movieboxhd", "yts", "curated"
  name        TEXT NOT NULL,                  -- "MovieBox HD"
  base_url    TEXT,
  type        TEXT NOT NULL DEFAULT 'scraper', -- scraper, aggregator, public
  enabled     INTEGER NOT NULL DEFAULT 1,
  is_legal    INTEGER NOT NULL DEFAULT 0,     -- lawful-source flag
  created_at  INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS availability (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  title_id        INTEGER NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
  source_id       INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'available', -- available, unavailable, coming_soon, expired, unknown
  external_id     TEXT,                       -- source's own ID for this title
  external_url    TEXT,
  quality_options TEXT NOT NULL DEFAULT '[]', -- ["1080p","720p"]
  format_options  TEXT NOT NULL DEFAULT '[]', -- ["embed","hls","mp4"]
  last_checked_at INTEGER,
  last_success_at INTEGER,
  UNIQUE(title_id, source_id)
);
CREATE INDEX IF NOT EXISTS idx_avail_status ON availability(status);
CREATE INDEX IF NOT EXISTS idx_avail_source ON availability(source_id);
CREATE INDEX IF NOT EXISTS idx_availability_episode_id ON availability(episode_id, kind);

-- Ingest audit ----------------------------------------------------
CREATE TABLE IF NOT EXISTS ingest_log (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id    INTEGER NOT NULL REFERENCES sources(id),
  ran_at       INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  new_records  INTEGER NOT NULL DEFAULT 0,
  updated_records INTEGER NOT NULL DEFAULT 0,
  rejected_records INTEGER NOT NULL DEFAULT 0,
  duplicates   INTEGER NOT NULL DEFAULT 0,
  errors       INTEGER NOT NULL DEFAULT 0,
  notes        TEXT
);

-- Per-source freshness --------------------------------------------
CREATE TABLE IF NOT EXISTS crawl_state (
  source_id       INTEGER PRIMARY KEY REFERENCES sources(id) ON DELETE CASCADE,
  total_records   INTEGER DEFAULT 0,
  last_page       INTEGER,
  last_crawled_at INTEGER,
  in_progress     INTEGER DEFAULT 0
);

-- User state (placeholder until auth ships) -----------------------
CREATE TABLE IF NOT EXISTS user_watchlist (
  user_id     TEXT NOT NULL,
  title_id    INTEGER NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
  added_at    INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  PRIMARY KEY (user_id, title_id)
);

CREATE TABLE IF NOT EXISTS user_history (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     TEXT NOT NULL,
  title_id    INTEGER NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
  episode_id  INTEGER REFERENCES episodes(id) ON DELETE SET NULL,
  position_sec INTEGER,
  duration_sec INTEGER,
  pct         REAL,
  completed   INTEGER DEFAULT 0,
  ts          INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);
CREATE INDEX IF NOT EXISTS idx_uhistory_user_ts ON user_history(user_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_uhistory_title ON user_history(title_id);

-- Paid streaming providers (reference data, NOT scraped) -----------
-- "Where to watch" metadata only. is_legal=1 since they're lawful
-- services. enabled=0 by default — these never feed the player.
-- Logos are sourced from DuckKota/omni-images gitlab repo.
CREATE TABLE IF NOT EXISTS streaming_providers (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  slug            TEXT NOT NULL UNIQUE,        -- "netflix", "disney-plus", "prime-video"
  name            TEXT NOT NULL UNIQUE,        -- "Netflix", "Disney+"
  base_url        TEXT,                        -- official site
  logo_url        TEXT,                        -- logo image from omni-images
  free_access_ref TEXT,                        -- link to free trial/keys resource (e.g. freekeys repo)
  region          TEXT NOT NULL DEFAULT 'US',  -- primary availability region
  is_legal        INTEGER NOT NULL DEFAULT 1,  -- lawful-source flag
  enabled         INTEGER NOT NULL DEFAULT 0,  -- never feeds scraper/player
  sort_order      INTEGER NOT NULL DEFAULT 100,
  created_at      INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

-- Production studios (logos from omni-images/studios) ---------------
CREATE TABLE IF NOT EXISTS studios (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT NOT NULL UNIQUE,            -- "marvel-studios", "dc-studios"
  name        TEXT NOT NULL UNIQUE,            -- "Marvel Studios"
  logo_url    TEXT,                            -- omni-images studio logo
  country     TEXT,                            -- ISO 3166-1 alpha-2
  founded     INTEGER,
  sort_order  INTEGER NOT NULL DEFAULT 100,
  created_at  INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

-- Animation studios (subset, distinct logos) ------------------------
CREATE TABLE IF NOT EXISTS animation_studios (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT NOT NULL UNIQUE,            -- "pixar", "dreamworks-animation"
  name        TEXT NOT NULL UNIQUE,
  logo_url    TEXT,
  parent_studio_id INTEGER REFERENCES studios(id) ON DELETE SET NULL,
  sort_order  INTEGER NOT NULL DEFAULT 100,
  created_at  INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

-- Decades (used as a fast browse facet) -----------------------------
CREATE TABLE IF NOT EXISTS decades (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT NOT NULL UNIQUE,            -- "1980", "1990", "2000", "2010", "2020"
  label       TEXT NOT NULL UNIQUE,            -- "1980s", "1990s"
  start_year  INTEGER NOT NULL,
  end_year    INTEGER NOT NULL,
  poster_url  TEXT,                            -- omni-images/decades poster
  sort_order  INTEGER NOT NULL DEFAULT 100
);

-- Actors (cast reference data) -------------------------------------
CREATE TABLE IF NOT EXISTS actors (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT NOT NULL UNIQUE,            -- "tom_cruise"
  name        TEXT NOT NULL UNIQUE,            -- "Tom Cruise"
  photo_url   TEXT,                            -- omni-images/actors photo
  birth_year  INTEGER,
  nationality TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 100,
  created_at  INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

-- Directors (filmmaker reference data) ----------------------------
CREATE TABLE IF NOT EXISTS directors (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT NOT NULL UNIQUE,            -- "christopher_nolan"
  name        TEXT NOT NULL UNIQUE,
  photo_url   TEXT,
  birth_year  INTEGER,
  nationality TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 100,
  created_at  INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

-- Genre poster images (mapping; existing genres table has no image)
CREATE TABLE IF NOT EXISTS genre_images (
  genre_slug TEXT PRIMARY KEY REFERENCES genres(slug) ON DELETE CASCADE,
  poster_url TEXT NOT NULL
);

-- Collection/franchise poster images (mapping; existing collections
-- table has a poster column but seed only inserts slug/name/type)
CREATE TABLE IF NOT EXISTS collection_images (
  collection_slug TEXT PRIMARY KEY REFERENCES collections(slug) ON DELETE CASCADE,
  poster_url      TEXT NOT NULL,
  backdrop_url    TEXT
);

-- Free access methods per provider (freekeys repo reference)
CREATE TABLE IF NOT EXISTS free_access_methods (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  provider_id     INTEGER NOT NULL REFERENCES streaming_providers(id) ON DELETE CASCADE,
  method          TEXT NOT NULL,               -- "free_trial", "student", "bundle", "shared_key"
  description     TEXT,
  reference_url   TEXT,                        -- direct link into freekeys repo or vendor
  expires_at      INTEGER,
  UNIQUE(provider_id, method, reference_url)
);
CREATE INDEX IF NOT EXISTS idx_fam_provider ON free_access_methods(provider_id);

-- Country-level production stats (from "Global Film and TV
-- Statistics.pdf" pp.3-8). One row per country. Stats are annual
-- production estimates, NOT title-level records.
CREATE TABLE IF NOT EXISTS country_production (
  country_code             TEXT PRIMARY KEY REFERENCES countries(code) ON DELETE CASCADE,
  annual_films_min         INTEGER,                -- lower-bound feature film output
  annual_films_max         INTEGER,                -- upper-bound feature film output
  annual_tv_titles_min     INTEGER,                -- lower-bound scripted TV titles
  annual_tv_titles_max     INTEGER,
  annual_tv_episodes_est   INTEGER,                -- total episode count estimate (where given)
  annual_hours_est         INTEGER,                -- broadcast hours estimate
  domestic_box_office_pct  TEXT,                   -- free-text "90%" / "~45-60%" / "~12-20%"
  primary_format           TEXT,                   -- e.g. "telenovela", "dizi", "sinetron"
  regulatory_body          TEXT,                   -- e.g. "CBFC", "NFVCB", "KOFIC"
  production_characteristic TEXT,                  -- free-text industry note
  source_pdf_page          TEXT,                   -- "pp.3-5" / "pp.5-8"
  updated_at               INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

-- Regional broadcast formats (dizi, sinetron, telenovela, etc.)
-- These are FORMAT identities, not genres. Each format has a
-- primary origin country and typical episode / runtime profile.
CREATE TABLE IF NOT EXISTS regional_formats (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  slug                TEXT NOT NULL UNIQUE,        -- "dizi", "sinetron", "telenovela"
  name                TEXT NOT NULL UNIQUE,        -- "Dizi", "Sinetron"
  origin_country_code TEXT REFERENCES countries(code) ON DELETE SET NULL,
  description         TEXT,
  typical_episode_count TEXT,                     -- "120-150 min episodes", ">50 ep runs"
  typical_runtime_min INTEGER,
  source_pdf_page     TEXT
);

-- Animation production centers, broken down by animation type.
-- Mirrors the table on page 10 of the PDF.
CREATE TABLE IF NOT EXISTS animation_centers (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  country_code    TEXT NOT NULL REFERENCES countries(code) ON DELETE CASCADE,
  animation_type  TEXT NOT NULL,                  -- "feature_film","tv_series","ova_ona","short_film","children_series"
  annual_volume_min INTEGER,
  annual_volume_max INTEGER,
  leading_studios TEXT,
  source_pdf_page TEXT,
  UNIQUE(country_code, animation_type)
);
CREATE INDEX IF NOT EXISTS idx_ac_country ON animation_centers(country_code);

-- Global audiovisual format statistics (PDF pp.1-2 table).
-- Catalog-wide totals across the 9 format buckets.
CREATE TABLE IF NOT EXISTS global_format_stats (
  format_key            TEXT PRIMARY KEY,         -- "tv_episodes"
  display_name          TEXT NOT NULL,            -- "Television Episodes (tvEpisode)"
  estimated_volume      INTEGER NOT NULL,
  share_pct             REAL NOT NULL,            -- 0-100
  structural_definition TEXT,
  primary_source        TEXT,
  source_pdf_page       TEXT
);

-- Home-page / browse facets (wires trending.png + others).
-- Slugs are NOT genre slugs — they are editorial / sort facets
-- used to build home rails and category landing pages.
CREATE TABLE IF NOT EXISTS facets (
  slug        TEXT PRIMARY KEY,                    -- "trending", "top_rated"
  name        TEXT NOT NULL UNIQUE,                -- "Trending Now"
  poster_url  TEXT,                                -- omni-images/genres/trending.png etc.
  sort_order  INTEGER NOT NULL DEFAULT 100,
  created_at  INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

-- Title <-> Actor junction (cast credits).
CREATE TABLE IF NOT EXISTS title_actors (
  title_id        INTEGER NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
  actor_id        INTEGER NOT NULL REFERENCES actors(id) ON DELETE CASCADE,
  character_name  TEXT,
  billing_order   INTEGER NOT NULL DEFAULT 100,    -- lower = more prominent
  role_type       TEXT NOT NULL DEFAULT 'cast',    -- "cast" | "voice" | "cameo" | "narrator"
  PRIMARY KEY (title_id, actor_id, role_type)
);
CREATE INDEX IF NOT EXISTS idx_ta_actor ON title_actors(actor_id);
CREATE INDEX IF NOT EXISTS idx_ta_billing ON title_actors(title_id, billing_order);

-- Title <-> Director junction.
CREATE TABLE IF NOT EXISTS title_directors (
  title_id    INTEGER NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
  director_id INTEGER NOT NULL REFERENCES directors(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'director',     -- "director" | "co_director" | "exec_producer"
  PRIMARY KEY (title_id, director_id)
);
CREATE INDEX IF NOT EXISTS idx_td_director ON title_directors(director_id);

-- Title <-> Production studio junction.
CREATE TABLE IF NOT EXISTS title_studios (
  title_id    INTEGER NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
  studio_id   INTEGER NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'production',   -- "production" | "distribution" | "co_production"
  PRIMARY KEY (title_id, studio_id, role)
);
CREATE INDEX IF NOT EXISTS idx_ts_studio ON title_studios(studio_id);

-- Title <-> Animation studio junction.
CREATE TABLE IF NOT EXISTS title_animation_studios (
  title_id            INTEGER NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
  animation_studio_id INTEGER NOT NULL REFERENCES animation_studios(id) ON DELETE CASCADE,
  role                TEXT NOT NULL DEFAULT 'animation', -- "animation" | "additional_animation"
  PRIMARY KEY (title_id, animation_studio_id, role)
);
CREATE INDEX IF NOT EXISTS idx_tas_studio ON title_animation_studios(animation_studio_id);

-- Title <-> Streaming provider junction ("where to watch").
-- availability_type tells the player how the title is reachable:
--   subscription      -> included with paid plan
--   free_with_ads     -> ad-supported free tier
--   purchase          -> buy / keep
--   rent              -> time-limited rental
--   free              -> fully free (no account needed)
CREATE TABLE IF NOT EXISTS title_streaming_providers (
  title_id            INTEGER NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
  provider_id         INTEGER NOT NULL REFERENCES streaming_providers(id) ON DELETE CASCADE,
  availability_type   TEXT NOT NULL DEFAULT 'subscription',
  region              TEXT NOT NULL DEFAULT 'US',
  deep_link           TEXT,                          -- provider-specific URL when known
  free_access_ref     TEXT,                          -- per-provider free trial/key link
  last_checked_at     INTEGER,
  PRIMARY KEY (title_id, provider_id, availability_type, region)
);
CREATE INDEX IF NOT EXISTS idx_tsp_provider ON title_streaming_providers(provider_id);
"""

# Canonical taxonomies (single source of truth) ----------------------
CANONICAL_GENRES = [
    ("action", "Action", ["act"]),
    ("adventure", "Adventure", ["adv"]),
    ("animation", "Animation", ["animated"]),
    ("biography", "Biography", ["bio"]),
    ("comedy", "Comedy", []),
    ("crime", "Crime", []),
    ("documentary", "Documentary", ["doc"]),
    ("drama", "Drama", []),
    ("family", "Family", ["kids"]),
    ("fantasy", "Fantasy", []),
    ("history", "History", ["historical"]),
    ("horror", "Horror", []),
    ("music", "Music", ["musical"]),
    ("musical", "Musical", []),
    ("mystery", "Mystery", ["myst"]),
    ("romance", "Romance", []),
    ("science-fiction", "Science Fiction", ["sci-fi", "scifi", "sci fi", "sf"]),
    ("sport", "Sport", ["sports"]),
    ("thriller", "Thriller", []),
    ("war", "War", []),
    ("western", "Western", []),
    ("film-noir", "Film-Noir", ["noir"]),
    ("reality", "Reality", ["reality-tv"]),
    ("game-show", "Game Show", ["game_show"]),
    ("talk-show", "Talk Show", ["talk_show"]),
    ("news", "News", []),
    ("short", "Short", ["short-film"]),
    ("anime", "Anime", ["animation-japanese"]),
]

CANONICAL_COUNTRIES = [
    ("US", "United States", "🇺🇸", "americas"),
    ("GB", "United Kingdom", "🇬🇧", "europe"),
    ("KR", "South Korea", "🇰🇷", "asia"),
    ("JP", "Japan", "🇯🇵", "asia"),
    ("CN", "China", "🇨🇳", "asia"),
    ("IN", "India", "🇮🇳", "asia"),
    ("PK", "Pakistan", "🇵🇰", "asia"),
    ("BD", "Bangladesh", "🇧🇩", "asia"),
    ("ID", "Indonesia", "🇮🇩", "asia"),
    ("TH", "Thailand", "🇹🇭", "asia"),
    ("MY", "Malaysia", "🇲🇾", "asia"),
    ("PH", "Philippines", "🇵🇭", "asia"),
    ("TR", "Turkey", "🇹🇷", "asia"),
    ("NG", "Nigeria", "🇳🇬", "africa"),
    ("EG", "Egypt", "🇪🇬", "africa"),
    ("MA", "Morocco", "🇲🇦", "africa"),
    ("SA", "Saudi Arabia", "🇸🇦", "asia"),
    ("LB", "Lebanon", "🇱🇧", "asia"),
    ("IQ", "Iraq", "🇮🇶", "asia"),
    ("SY", "Syria", "🇸🇾", "asia"),
    ("CI", "Ivory Coast", "🇨🇮", "africa"),
    ("KE", "Kenya", "🇰🇪", "africa"),
    ("ZA", "South Africa", "🇿🇦", "africa"),
    ("FR", "France", "🇫🇷", "europe"),
    ("DE", "Germany", "🇩🇪", "europe"),
    ("IT", "Italy", "🇮🇹", "europe"),
    ("ES", "Spain", "🇪🇸", "europe"),
    ("MX", "Mexico", "🇲🇽", "americas"),
    ("RU", "Russia", "🇷🇺", "europe"),
    # ---- appended: countries named in "Global Film and TV
    # Statistics.pdf" that were missing from the original list.
    ("BR", "Brazil", "🇧🇷", "americas"),
    ("IR", "Iran", "🇮🇷", "asia"),
    ("CA", "Canada", "🇨🇦", "americas"),
    ("CO", "Colombia", "🇨🇴", "americas"),
    ("NO", "Norway", "🇳🇴", "europe"),
    ("CH", "Switzerland", "🇨🇭", "europe"),
    ("TW", "Taiwan", "🇹🇼", "asia"),
    # ---- appended: pseudo-codes used by the PDF pp.8-9 regional
    # rollups. Not real ISO 3166-1 codes — they aggregate multiple
    # countries for statistical reporting only.
    ("EU", "European Union + UK + Norway + Switzerland", "🇪🇺", "europe"),
    ("LATAM", "Latin America (Brazil+Mexico+Colombia)", "🌎", "americas"),
    ("EASIA", "East Asia (S. Korea+Japan+China)", "🌏", "asia"),
]

CANONICAL_LANGUAGES = [
    ("en", "English", "English", "🇺🇸"),
    ("es", "Spanish", "Español", "🇪🇸"),
    ("fr", "French", "Français", "🇫🇷"),
    ("de", "German", "Deutsch", "🇩🇪"),
    ("it", "Italian", "Italiano", "🇮🇹"),
    ("pt", "Portuguese", "Português", "🇵🇹"),
    ("ja", "Japanese", "日本語", "🇯🇵"),
    ("ko", "Korean", "한국어", "🇰🇷"),
    ("zh", "Chinese", "中文", "🇨🇳"),
    ("hi", "Hindi", "हिन्दी", "🇮🇳"),
    ("ur", "Urdu", "اردو", "🇵🇰"),
    ("ar", "Arabic", "العربية", "🇸🇦"),
    ("tr", "Turkish", "Türkçe", "🇹🇷"),
    ("ru", "Russian", "Русский", "🇷🇺"),
    ("bn", "Bengali", "বাংলা", "🇧🇩"),
    ("ta", "Tamil", "தமிழ்", "🇮🇳"),
    ("te", "Telugu", "తెలుగు", "🇮🇳"),
    ("ml", "Malayalam", "മലയാളം", "🇮🇳"),
    ("kn", "Kannada", "ಕನ್ನಡ", "🇮🇳"),
    ("pa", "Punjabi", "ਪੰਜਾਬੀ", "🇮🇳"),
    ("fa", "Persian", "فارسی", "🇮🇷"),
    ("id", "Indonesian", "Bahasa Indonesia", "🇮🇩"),
    ("tl", "Filipino", "Filipino", "🇵🇭"),
]

CANONICAL_COLLECTIONS = [
    ("marvel-cinematic-universe", "Marvel Cinematic Universe", "universe"),
    ("dc-extended-universe", "DC Extended Universe", "universe"),
    ("star-wars", "Star Wars", "franchise"),
    ("harry-potter", "Harry Potter", "franchise"),
    ("lord-of-the-rings", "Lord of the Rings", "franchise"),
    ("fast-and-furious", "Fast & Furious", "franchise"),
    ("mission-impossible", "Mission: Impossible", "franchise"),
    ("jurassic-park", "Jurassic Park", "franchise"),
    ("pixar", "Pixar", "brand"),
    ("disney", "Disney", "brand"),
    ("anime-shonen", "Shonen Anime", "genre"),
    ("anime-isekai", "Isekai Anime", "genre"),
    ("k-drama", "K-Drama", "region"),
    ("c-drama", "C-Drama", "region"),
    ("j-drama", "J-Drama", "region"),
    ("turkish-dizi", "Turkish Dizi", "region"),
    ("anime-english-dub", "Anime English Dub", "language"),
    ("anime-hindi-dub", "Anime Hindi Dub", "language"),
    ("anime-arabic-dub", "Anime Arabic Dub", "language"),
    ("short-drama-romance", "Short Drama Romance", "genre"),
    ("short-drama-revenge", "Short Drama Revenge", "genre"),
    ("short-drama-billionaire", "Short Drama Billionaire", "genre"),
    ("short-drama-chinese", "Chinese Short Drama", "region"),
    ("short-drama-korean", "Korean Short Drama", "region"),
    ("short-drama-hindi", "Hindi Short Drama", "region"),
    # --- added: franchise/universe slugs that already have
    # omni-images posters in the DuckKota repo. Existing rows above
    # are NOT modified — these are append-only.
    ("avatar", "Avatar", "franchise"),
    ("back-to-the-future", "Back to the Future", "franchise"),
    ("dune", "Dune", "franchise"),
    ("hunger-games", "The Hunger Games", "franchise"),
    ("indiana-jones", "Indiana Jones", "franchise"),
    ("james-bond", "James Bond", "franchise"),
    ("john-wick", "John Wick", "franchise"),
    ("marvel", "Marvel", "brand"),
    ("matrix", "The Matrix", "franchise"),
    ("monsterverse", "Monsterverse", "universe"),
    ("pirates-of-the-caribbean", "Pirates of the Caribbean", "franchise"),
    ("rambo", "Rambo", "franchise"),
    ("rocky", "Rocky", "franchise"),
    ("star-trek", "Star Trek", "franchise"),
    ("transformers", "Transformers", "franchise"),
    ("x-men", "X-Men", "franchise"),
    # ---- appended: franchises explicitly named in the
    # "Global Film and TV Statistics" PDF.
    ("ne-zha", "Ne Zha", "franchise"),
    ("rafadan-tayfa", "Rafadan Tayfa", "franchise"),
]

# Image URLs from DuckKota/omni-images gitlab repo.
# Single base for every entry; per-row path is appended.
OMNI_IMG_BASE = "https://gitlab.com/DuckKota/omni-images/-/raw/main"

# Paid streaming providers (reference data — NOT scraped).
# Tuple: (slug, name, base_url, logo_path, free_access_ref, region)
# free_access_ref points at the rickylawson/freekeys repo (single
# umbrella reference; per-method rows live in free_access_methods).
CANONICAL_STREAMING_PROVIDERS = [
    ("netflix", "Netflix", "https://www.netflix.com",
     "streaming_services/netflix.jpg",
     "https://github.com/rickylawson/freekeys", "US"),
    ("disney-plus", "Disney+", "https://www.disneyplus.com",
     "streaming_services/disney_plus.jpg",
     "https://github.com/rickylawson/freekeys", "US"),
    ("prime-video", "Prime Video", "https://www.amazon.com/Prime-Video",
     "streaming_services/prime_video.jpg",
     "https://github.com/rickylawson/freekeys", "US"),
    ("apple-tv-plus", "Apple TV+", "https://tv.apple.com",
     "streaming_services/apple_tv.jpg",
     "https://github.com/rickylawson/freekeys", "US"),
    ("max", "Max", "https://www.max.com",
     "streaming_services/max.jpg",
     "https://github.com/rickylawson/freekeys", "US"),
    ("hulu", "Hulu", "https://www.hulu.com",
     "streaming_services/hulu.jpg",
     "https://github.com/rickylawson/freekeys", "US"),
    ("paramount-plus", "Paramount+", "https://www.paramountplus.com",
     "streaming_services/paramount_plus.jpg",
     "https://github.com/rickylawson/freekeys", "US"),
    ("peacock", "Peacock", "https://www.peacocktv.com",
     "streaming_services/peacock.jpg",
     "https://github.com/rickylawson/freekeys", "US"),
    ("discovery-plus", "Discovery+", "https://www.discoveryplus.com",
     "streaming_services/discovery_plus.jpg",
     "https://github.com/rickylawson/freekeys", "US"),
]

# Genre poster URLs — one per canonical genre slug. "trending" is a
# sort/flag facet, not a genre, so it is intentionally NOT included
# here (genre_images has a FK to genres.slug).
CANONICAL_GENRE_IMAGES = [
    ("action", "genres/action.png"),
    ("adventure", "genres/adventure.png"),
    ("animation", "genres/animation.png"),
    ("comedy", "genres/comedy.png"),
    ("crime", "genres/crime.png"),
    ("documentary", "genres/documentary.png"),
    ("drama", "genres/drama.png"),
    ("fantasy", "genres/fantasy.png"),
    ("history", "genres/historical.png"),
    ("horror", "genres/horror.png"),
    ("musical", "genres/musical.png"),
    ("mystery", "genres/mystery.png"),
    ("romance", "genres/romance.png"),
    ("science-fiction", "genres/sci-fi.png"),
    ("thriller", "genres/thriller.png"),
    ("war", "genres/war.png"),
]

# Collection poster URLs (kebab-case slug → image path).
# Covers every slug already in CANONICAL_COLLECTIONS plus the
# newly appended franchises.
CANONICAL_COLLECTION_IMAGES = [
    ("marvel-cinematic-universe", "collections/marvel.png"),
    ("marvel", "collections/marvel.png"),
    ("star-wars", "collections/star_wars.png"),
    ("harry-potter", "collections/harry_potter.png"),
    ("lord-of-the-rings", "collections/lord_of_the_rings.png"),
    ("fast-and-furious", "collections/fast_and_furious.png"),
    ("mission-impossible", "collections/mission_impossible.png"),
    ("jurassic-park", "collections/jurassic_park.png"),
    ("avatar", "collections/avatar.png"),
    ("back-to-the-future", "collections/back_to_the_future.png"),
    ("dune", "collections/dune.png"),
    ("hunger-games", "collections/hunger_games.png"),
    ("indiana-jones", "collections/indiana_jones.png"),
    ("james-bond", "collections/james_bond.png"),
    ("john-wick", "collections/john_wick.png"),
    ("matrix", "collections/matrix.png"),
    ("monsterverse", "collections/monsterverse.png"),
    ("pirates-of-the-caribbean", "collections/pirates_of_the_caribbean.png"),
    ("rambo", "collections/rambo.png"),
    ("rocky", "collections/rocky.png"),
    ("star-trek", "collections/star_trek.png"),
    ("transformers", "collections/transformers.png"),
    ("x-men", "collections/x_men.png"),
]

# Production studios (live-action). Tuple: (slug, name, logo_path, country)
CANONICAL_STUDIOS = [
    ("warner-bros-pictures", "Warner Bros. Pictures", "studios/warner_bros_pictures.png", "US"),
    ("walt-disney-pictures", "Walt Disney Pictures", "studios/walt_disney_pictures.png", "US"),
    ("universal-pictures", "Universal Pictures", "studios/universal_pictures.png", "US"),
    ("marvel-studios", "Marvel Studios", "studios/marvel_studios.png", "US"),
    ("dc-studios", "DC Studios", "studios/dc_studios.png", "US"),
    ("lionsgate", "Lionsgate", "studios/lionsgate.png", "US"),
    ("dreamworks-pictures", "DreamWorks Pictures", "studios/dreamworks_pictures.png", "US"),
]

# Animation studios. parent_studio_id is resolved at seed time by slug.
CANONICAL_ANIMATION_STUDIOS = [
    ("pixar", "Pixar", "animation_studios/pixar.png", "walt-disney-pictures"),
    ("walt-disney-animation", "Walt Disney Animation Studios", "animation_studios/walt_disney_animation.png", "walt-disney-pictures"),
    ("dreamworks-animation", "DreamWorks Animation", "animation_studios/dreamworks_animation.png", "dreamworks-pictures"),
    ("illumination", "Illumination", "animation_studios/illumination.png", "universal-pictures"),
    ("sony-pictures-animation", "Sony Pictures Animation", "animation_studios/sony_pictures_animation.png", None),
    ("blue-sky-animation", "Blue Sky Studios", "animation_studios/blue_sky_animation.png", None),
    ("warner-bros-animation", "Warner Bros. Animation", "animation_studios/warner_bros_animation.png", "warner-bros-pictures"),
]

# Decades (slug = 4-digit year; label = "YYYYs").
CANONICAL_DECADES = [
    ("1980", "1980s", 1980, 1989, "decades/1980.jpg"),
    ("1990", "1990s", 1990, 1999, "decades/1990.jpg"),
    ("2000", "2000s", 2000, 2009, "decades/2000.jpg"),
    ("2010", "2010s", 2010, 2019, "decades/2010.jpg"),
    ("2020", "2020s", 2020, 2029, "decades/2020.jpg"),
]

# Actors (name + photo). Nationality + birth_year are best-effort from
# public knowledge — left NULL where unsure rather than guessed.
CANONICAL_ACTORS = [
    ("adam_sandler", "Adam Sandler", "actors/adam_sandler.jpg", 1966, "US"),
    ("arnold_schwarzenegger", "Arnold Schwarzenegger", "actors/arnold_schwarzenegger.jpg", 1947, "AT"),
    ("christian_bale", "Christian Bale", "actors/christian_bale.jpg", 1974, "GB"),
    ("clint_eastwood", "Clint Eastwood", "actors/clint_eastwood.jpg", 1930, "US"),
    ("denzel_washington", "Denzel Washington", "actors/denzel_washington.jpg", 1954, "US"),
    ("dwayne_johnson", "Dwayne Johnson", "actors/dwayne_johnson.jpg", 1972, "US"),
    ("harrison_ford", "Harrison Ford", "actors/harrison_ford.jpg", 1942, "US"),
    ("jackie_chan", "Jackie Chan", "actors/jackie_chan.jpg", 1954, "HK"),
    ("jason_statham", "Jason Statham", "actors/jason_statham.jpg", 1967, "GB"),
    ("matt_damon", "Matt Damon", "actors/matt_damon.jpg", 1970, "US"),
    ("morgan_freeman", "Morgan Freeman", "actors/morgan_freeman.jpg", 1937, "US"),
    ("nicolas_cage", "Nicolas Cage", "actors/nicolas_cage.jpg", 1964, "US"),
    ("robert_downey_jr", "Robert Downey Jr.", "actors/robert_downey_jr.jpg", 1965, "US"),
    ("robin_williams", "Robin Williams", "actors/robin_williams.jpg", 1951, "US"),
    ("ryan_reynolds", "Ryan Reynolds", "actors/ryan_reynolds.jpg", 1976, "CA"),
    ("samuel_l_jackson", "Samuel L. Jackson", "actors/samuel_l_jackson.jpg", 1948, "US"),
    ("sylvester_stallone", "Sylvester Stallone", "actors/sylvester_stallone.jpg", 1946, "US"),
    ("tom_cruise", "Tom Cruise", "actors/tom_cruise.jpg", 1962, "US"),
]

# Directors.
CANONICAL_DIRECTORS = [
    ("alfred_hitchcock", "Alfred Hitchcock", "directors/alfred_hitchcock.jpg", 1899, "GB"),
    ("brian_de_palma", "Brian De Palma", "directors/brian_de_palma.jpg", 1940, "US"),
    ("christopher_nolan", "Christopher Nolan", "directors/christopher_nolan.jpg", 1970, "GB"),
    ("david_fincher", "David Fincher", "directors/david_fincher.jpg", 1962, "US"),
    ("denis_villeneuve", "Denis Villeneuve", "directors/denis_villeneuve.jpg", 1967, "CA"),
    ("john_carpenter", "John Carpenter", "directors/john_carpenter.jpg", 1948, "US"),
    ("martin_scorsese", "Martin Scorsese", "directors/martin_scorsese.jpg", 1942, "US"),
    ("paul_thomas_anderson", "Paul Thomas Anderson", "directors/paul_thomas_anderson.jpg", 1970, "US"),
    ("stanley_kubrick", "Stanley Kubrick", "directors/stanley_kubrick.jpg", 1928, "US"),
    # NOTE: source URL had a typo ("speilberg"); preserved as-is in the
    # image filename but corrected in the human-readable name.
    ("steven_spielberg", "Steven Spielberg", "directors/steven_speilberg.jpg", 1946, "US"),
]


# ====================================================================
#  Append-only additions sourced from "Global Film and TV Statistics"
#  PDF (in workspace root). All rows below are catalog-level reference
#  data — none of them replace or modify any existing entry above.
# ====================================================================

# Country-level production stats (PDF pp.3-8).
# Tuple: (country_code, films_min, films_max, tv_titles_min, tv_titles_max,
#         tv_episodes_est, hours_est, dom_box_office_pct,
#         primary_format, regulatory_body, characteristic, source_pdf_page)
# Numeric None means the PDF did not state that figure for that country.
CANONICAL_COUNTRY_PRODUCTION = [
    ("IN", 1800, 2500, None, None, None, None,
     "~90%", None,
     "Central Board of Film Certification (CBFC)",
     "Multilingual private commercial film industries",
     "pp.3-4"),
    ("NG", 1200, 2500, None, None, None, None,
     ">95%", None,
     "National Film and Video Censors Board (NFVCB)",
     "Direct-to-digital / informal video commerce (Nollywood)",
     "pp.3-4"),
    ("CN", 700, 1050, None, None, None, None,
     "~74%", None,
     "National Radio and Television Administration (NRTA)",
     "State-backed enterprises and major private tech studios",
     "pp.3,5"),
    ("US", 600, 800, 400, 600, None, 7000,
     "~52% (Global share)", "limited_series_prestige",
     "Motion Picture Association (MPA)",
     "Studio conglomerates, private equity, streaming slates",
     "pp.3,8"),
    ("JP", 500, 650, None, None, None, None,
     "~76%", None,
     "Motion Picture Producers Association of Japan (EIREN)",
     "Studio-distributor consortia and production committees",
     "pp.3-4"),
    ("IT", 300, 360, None, None, None, None,
     "~20-30%", None,
     "Direzione Generale Cinema e Audiovisivo (DGCA)",
     "Direct public subsidies, selective tax credits, TV presales",
     "p.4"),
    ("ES", 280, 320, None, None, None, None,
     "~15-25%", None,
     "Instituto de la Cinematografía y de las Artes Audiovisuales",
     "Regional tax incentives, European co-productions",
     "p.4"),
    ("FR", 230, 280, None, None, None, None,
     "~35-40%", None,
     "Centre National du Cinéma et de l'image animée (CNC)",
     "Mandatory broadcaster reinvestment and CNC levies",
     "p.4"),
    ("GB", 220, 270, None, None, None, None,
     "~15-30%", None,
     "British Film Institute (BFI)",
     "Inward studio investment, National Lottery support",
     "p.4"),
    ("KR", 200, 260, None, None, None, None,
     "~50-60%", None,
     "Korean Film Council (KOFIC)",
     "Conglomerate financing, theatrical-streaming windows",
     "p.4"),
    ("TR", 350, 450, 50, 70, None, None,
     "~45-60%", "dizi",
     "RTÜK / Turkish Radio and Television Supreme Council",
     "World's 2nd largest scripted TV exporter; $600M+ global distribution revenue",
     "pp.5,7"),
    ("ID", 180, 240, 80, 80, 2000, None,
     ">60%", "sinetron",
     "Indonesian Film Censorship Board (LSF)",
     "Largest SE Asian cinema market; 80M+ tickets/yr; daily sinetron serial production",
     "pp.5,7"),
    ("PK", 25, 45, 150, 250, None, None,
     "~25-35%", "finite_drama_serial",
     "Pakistan Electronic Media Regulatory Authority (PEMRA)",
     "High-prestige scripted serials; 20-35 ep finite runs; emerging theatrical revival",
     "pp.5,8"),
    ("PH", 120, 180, 80, 120, None, None,
     "~30-45%", "teleserye",
     "MTRCB",
     "Prolific commercial studio sector; multi-hundred episode broadcast runs",
     "p.6"),
    ("MX", 100, 140, 100, 100, None, None,
     "~10-18%", "telenovela",
     "RTC / Mexican regulatory authority",
     "Latin American broadcast hub (TelevisaUnivision); high-volume telenovela pipelines",
     "p.6"),
    ("BR", 130, 170, 80, 80, None, None,
     "~12-20%", "telenovela",
     "ANCINE",
     "High-budget daily serials (TV Globo); internationally syndicated telenovela production",
     "p.6"),
    ("EG", 35, 55, 40, 60, None, None,
     "~70-80%", "musalsalat",
     "Egyptian Radio and Television Union (ERTU)",
     "Historical pan-Arab cinematic library (>4,000 features); Ramadan television production center",
     "p.6"),
    ("IR", 90, 130, 30, 50, None, None,
     ">80%", None,
     "Farabi Cinema Foundation / Ministry of Culture",
     "State-regulated cinema via Farabi Cinema Foundation; distinct auteur festival circuit",
     "p.7"),
    # Regional rollups (PDF pp.8-9)
    ("EU", 1200, 1400, 1200, 1400, 23000, 14000,
     None, "high_end_series_telenovela_soap",
     "European Audiovisual Observatory",
     "EU27+UK+Norway+Switzerland; 6% title contraction in 2023, 5% in 2024",
     "p.8"),
    ("LATAM", 250, 400, 250, 400, None, 9500,
     None, "telenovela",
     "Various national regulators",
     "Brazil + Mexico + Colombia; high-volume daily telenovelas (>50 ep runs)",
     "pp.8-9"),
    ("EASIA", 600, 900, 600, 900, None, 8500,
     None, "miniseries_16_24_ep_arcs",
     "Various national regulators",
     "S. Korea + Japan + China; miniseries & standardized 16-to-24-episode arcs",
     "p.9"),
]

# Regional broadcast formats (PDF pp.5-8).
# Tuple: (slug, name, origin_country_code, description,
#         typical_episode_count, typical_runtime_min, source_pdf_page)
CANONICAL_REGIONAL_FORMATS = [
    ("dizi", "Dizi", "TR",
     "Turkish prime-time weekly drama serial; world's 2nd largest scripted TV export category",
     "50-70 new series/year", 135, "p.7"),
    ("sinetron", "Sinetron", "ID",
     "Indonesian daily serialized television drama; very long runs (500-1000+ episodes)",
     "Thousands of episodes/year", 60, "p.7"),
    ("telenovela", "Telenovela", "MX",
     "Latin American high-volume daily serial; >50 episode runs; TelevisaUnivision pipeline",
     ">50 ep runs", 45, "pp.6,8"),
    ("teleserye", "Teleserye", "PH",
     "Filipino multi-hundred-episode daily serial; commercial studio sector backbone",
     "100s of episodes", 45, "p.6"),
    ("musalsalat", "Musalsalat", "EG",
     "Arabic (Egyptian) serial; heavy Ramadan-cycle production; pan-Arab distribution",
     "40-60 new titles/year", 45, "p.6"),
    ("donghua", "Donghua", "CN",
     "Chinese animation; OVA/ONA and theatrical; rivals Japanese anime in domestic market",
     "Variable", 25, "p.10"),
    ("k-drama", "K-Drama", "KR",
     "Korean scripted television drama; miniseries & 16-24 episode arcs",
     "16-24 ep arcs", 70, "p.9"),
    ("j-drama", "J-Drama", "JP",
     "Japanese scripted drama; production-committee financed",
     "10-12 ep arcs", 50, "p.9"),
    ("c-drama", "C-Drama", "CN",
     "Mainland Chinese scripted drama; state broadcaster and tech-conglomerate commissions",
     "Variable", 45, "p.9"),
]

# Animation production centers (PDF p.10 table).
# Tuple: (country_code, animation_type, vol_min, vol_max, leading_studios, source_pdf_page)
# animation_type: feature_film | tv_series | ova_ona | short_film | children_series
CANONICAL_ANIMATION_CENTERS = [
    ("US", "feature_film", 11, 14, "Pixar, Disney Animation, Illumination, DreamWorks Animation", "p.10"),
    ("JP", "feature_film", 11, 14, "Studio Ghibli, Toei, Madhouse, Bones, MAPPA", "p.10"),
    ("CN", "feature_film", 11, 14, "Ne Zha studios, domestic adaptations of classical literature", "p.10"),
    ("FR", "feature_film", 11, 14, "Gaumont Animation, Ankama, Mac Guff", "p.10"),
    ("JP", "tv_series", 12, 14, "Production committees (Aniplex, Toho, Sunrise, MAPPA)", "p.10"),
    ("KR", "tv_series", 12, 14, "Outsourcing partner to JP (Studio Mir, SAKUGA)", "p.10"),
    ("CN", "tv_series", 12, 14, "Bilibili, Tencent Video, iQIYI in-house animation", "p.10"),
    ("JP", "ova_ona", 7, 9, "OVA/ONA pipeline (Aniplex, KyoAni)", "p.10"),
    ("CN", "ova_ona", 7, 9, "Donghua ONA platforms (Bilibili)", "p.10"),
    ("FR", "short_film", 150, 200, "Festival-circuit producers (Annecy ecosystem)", "p.10"),
    ("US", "short_film", 150, 200, "SVA, CalArts, indie animation studios", "p.10"),
    ("GB", "short_film", 150, 200, "Aardman, Channel 4 shorts", "p.10"),
    ("CA", "short_film", 150, 200, "NFB (National Film Board), Nelvana shorts", "p.10"),
    ("US", "children_series", 8, 12, "Nickelodeon, Disney Channel, PBS Kids", "p.10"),
    ("CA", "children_series", 8, 12, "Nelvana, WildBrain, 9 Story", "p.10"),
    ("FR", "children_series", 8, 12, "Gaumont Animation, Xilam, Ankama", "p.10"),
    ("GB", "children_series", 8, 12, "Aardman, BBC Children's", "p.10"),
]

# Global audiovisual format statistics (PDF pp.1-2).
# Tuple: (format_key, display_name, estimated_volume, share_pct,
#         structural_definition, primary_source, source_pdf_page)
CANONICAL_GLOBAL_FORMAT_STATS = [
    ("tv_episodes", "Television Episodes (tvEpisode)",
     23264000, 71.2,
     "Individual serialized narrative units",
     "Database registries / Broadcast logs", "pp.1-2"),
    ("feature_films", "Standalone Feature Films (movie)",
     2131000, 7.7,
     "Narrative / documentary features (>40 min)",
     "Statutory registries / IMDb", "p.2"),
    ("short_films", "Short Films (short / tvShort)",
     1030000, 3.7,
     "Non-episodic short works (≤40 min)",
     "Archival vaults / Festival registries", "p.2"),
    ("tv_series", "Television Series (tvSeries)",
     417000, 1.5,
     "Multi-episode serialized programs",
     "Network catalogs / IMDb", "p.2"),
    ("direct_to_video", "Direct-to-Video Releases (video)",
     419000, 1.5,
     "Home video and non-theatrical physical releases",
     "Consumer software registries", "p.2"),
    ("tv_movies", "Made-for-Television Films (tvMovie)",
     140000, 0.5,
     "Single-installment broadcast features",
     "Linear network programming ledgers", "p.2"),
    ("miniseries_specials", "Miniseries & Specials (tvMiniSeries / tvSpecial)",
     180000, 0.7,
     "Closed-ended narrative runs and broadcasts",
     "Network logs / Database registries", "p.2"),
    ("ancillary_media", "Ancillary Media (Video Games, Podcasts, Web)",
     1200000, 4.3,
     "Interactive software, podcasts, and digital media",
     "Multi-format registries", "p.2"),
    ("uncataloged_ephemeral", "Uncataloged / Ephemeral Celluloid Holdings",
     2500000, 9.0,
     "Lost silent films, local newsreels, non-circulating reels",
     "FIAF / National preservation vaults", "p.2"),
]

# Home-page / browse facets.
# Tuple: (slug, name, poster_path, sort_order).
# poster_path is the path under OMNI_IMG_BASE. This is where
# `genres/trending.png` finally gets wired in (it's a facet, not a
# genre slug — genre_images table does not accept it because of FK).
CANONICAL_FACETS = [
    ("trending",     "Trending Now",       "genres/trending.png",     10),
    ("new_releases", "New Releases",       None,                       20),
    ("top_rated",    "Top Rated",          None,                       30),
    ("most_popular", "Most Popular",       None,                       40),
    ("coming_soon",  "Coming Soon",        None,                       50),
    ("free_to_watch","Free to Watch",      None,                       60),
]



CANONICAL_SOURCES = [
    ("curated", "Curated Catalog", None, "curated", 1, 1),
    ("movieboxhd", "MovieBoxHD", "https://movieboxhd.net", "scraper", 1, 0),
    ("beetv", "BeeTV", "https://beetvs.com.co", "scraper", 1, 0),
    ("hdobox", "HDO Box", "https://hdoboxapkpro.com", "scraper", 1, 0),
    ("onstream", "OnStream", None, "scraper", 1, 0),
    ("123movies", "123Movies", "https://123moviesweb.org", "scraper", 1, 0),
    ("yts", "YTS", "https://yts.mx", "scraper", 1, 0),
    ("yify", "YIFY", "https://yify.pro", "scraper", 1, 0),
    ("tmovies", "TMovies", "https://tmovies.co", "scraper", 1, 0),
    ("donkey", "Donkey", "https://donkey.to", "scraper", 1, 0),
    ("uflix", "UFlix", None, "scraper", 1, 0),
    ("vidsrc", "VidSrc.me", "https://vidsrc.me", "embed", 1, 1),
    ("superembed", "SuperEmbed", "https://multiembed.mov", "embed", 1, 1),
    ("2embed", "2Embed", "https://www.2embed.cc", "embed", 1, 1),
]


def init_catalog(db_path: str | Path) -> sqlite3.Connection:
    """Create the catalog database with normalized schema and seed taxonomies."""
    db_path = Path(db_path)
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path))
    conn.executescript(SCHEMA_SQL)

    cur = conn.cursor()

    # Seed genres
    cur.executemany(
        "INSERT OR IGNORE INTO genres (slug, name, name_aliases) VALUES (?, ?, ?)",
        [(slug, name, str(aliases).replace("'", '"')) for slug, name, aliases in CANONICAL_GENRES]
    )
    # Seed countries
    cur.executemany(
        "INSERT OR IGNORE INTO countries (code, name, flag, region) VALUES (?, ?, ?, ?)",
        CANONICAL_COUNTRIES
    )
    # Seed languages
    cur.executemany(
        "INSERT OR IGNORE INTO languages (code, name, native_name, flag) VALUES (?, ?, ?, ?)",
        CANONICAL_LANGUAGES
    )
    # Seed collections
    cur.executemany(
        "INSERT OR IGNORE INTO collections (slug, name, type) VALUES (?, ?, ?)",
        CANONICAL_COLLECTIONS
    )
    # Seed sources
    cur.executemany(
        "INSERT OR IGNORE INTO sources (slug, name, base_url, type, enabled, is_legal) VALUES (?, ?, ?, ?, ?, ?)",
        CANONICAL_SOURCES
    )

    # ---- append-only additions (omni-images + freekeys) --------------
    # Streaming providers (paid, reference-only).
    cur.executemany(
        "INSERT OR IGNORE INTO streaming_providers "
        "(slug, name, base_url, logo_url, free_access_ref, region) "
        "VALUES (?, ?, ?, ?, ?, ?)",
        [
            (slug, name, base_url, f"{OMNI_IMG_BASE}/{logo_path}",
             free_access_ref, region)
            for slug, name, base_url, logo_path, free_access_ref, region
            in CANONICAL_STREAMING_PROVIDERS
        ],
    )

    # Genre poster images (mapping, not a column on genres).
    cur.executemany(
        "INSERT OR REPLACE INTO genre_images (genre_slug, poster_url) VALUES (?, ?)",
        [(slug, f"{OMNI_IMG_BASE}/{path}") for slug, path in CANONICAL_GENRE_IMAGES],
    )

    # Collection poster images (mapping; collections.poster left NULL).
    cur.executemany(
        "INSERT OR REPLACE INTO collection_images (collection_slug, poster_url) VALUES (?, ?)",
        [(slug, f"{OMNI_IMG_BASE}/{path}") for slug, path in CANONICAL_COLLECTION_IMAGES],
    )

    # Production studios.
    cur.executemany(
        "INSERT OR IGNORE INTO studios (slug, name, logo_url, country) VALUES (?, ?, ?, ?)",
        [
            (slug, name, f"{OMNI_IMG_BASE}/{logo_path}", country)
            for slug, name, logo_path, country in CANONICAL_STUDIOS
        ],
    )

    # Animation studios (resolve parent_studio_id by slug AFTER studios seed).
    cur.executemany(
        "INSERT OR IGNORE INTO animation_studios (slug, name, logo_url, parent_studio_id) "
        "VALUES (?, ?, ?, (SELECT id FROM studios WHERE slug = ?))",
        [
            (slug, name, f"{OMNI_IMG_BASE}/{logo_path}", parent_slug)
            for slug, name, logo_path, parent_slug in CANONICAL_ANIMATION_STUDIOS
        ],
    )

    # Decades.
    cur.executemany(
        "INSERT OR IGNORE INTO decades (slug, label, start_year, end_year, poster_url) "
        "VALUES (?, ?, ?, ?, ?)",
        [
            (slug, label, sy, ey, f"{OMNI_IMG_BASE}/{path}")
            for slug, label, sy, ey, path in CANONICAL_DECADES
        ],
    )

    # Actors.
    cur.executemany(
        "INSERT OR IGNORE INTO actors (slug, name, photo_url, birth_year, nationality) "
        "VALUES (?, ?, ?, ?, ?)",
        [
            (slug, name, f"{OMNI_IMG_BASE}/{path}", by, nat)
            for slug, name, path, by, nat in CANONICAL_ACTORS
        ],
    )

    # Directors.
    cur.executemany(
        "INSERT OR IGNORE INTO directors (slug, name, photo_url, birth_year, nationality) "
        "VALUES (?, ?, ?, ?, ?)",
        [
            (slug, name, f"{OMNI_IMG_BASE}/{path}", by, nat)
            for slug, name, path, by, nat in CANONICAL_DIRECTORS
        ],
    )

    # Free access methods (one umbrella row per provider pointing at
    # the rickylawson/freekeys repo — per-method rows can be added later).
    cur.executemany(
        "INSERT OR IGNORE INTO free_access_methods "
        "(provider_id, method, description, reference_url) "
        "VALUES ((SELECT id FROM streaming_providers WHERE slug = ?), "
        "?, ?, ?)",
        [
            (slug, "free_trial_key_repo",
             f"Free trials / shared keys / student bundles — see rickylawson/freekeys repo",
             "https://github.com/rickylawson/freekeys")
            for slug, *_ in CANONICAL_STREAMING_PROVIDERS
        ],
    )

    # ---- appended: PDF-sourced reference data -------------------
    # Country-level production stats.
    cur.executemany(
        "INSERT OR REPLACE INTO country_production "
        "(country_code, annual_films_min, annual_films_max, "
        " annual_tv_titles_min, annual_tv_titles_max, "
        " annual_tv_episodes_est, annual_hours_est, "
        " domestic_box_office_pct, primary_format, regulatory_body, "
        " production_characteristic, source_pdf_page) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [list(row) for row in CANONICAL_COUNTRY_PRODUCTION],
    )

    # Regional broadcast formats.
    cur.executemany(
        "INSERT OR IGNORE INTO regional_formats "
        "(slug, name, origin_country_code, description, "
        " typical_episode_count, typical_runtime_min, source_pdf_page) "
        "VALUES (?, ?, ?, ?, ?, ?, ?)",
        CANONICAL_REGIONAL_FORMATS,
    )

    # Animation production centers.
    cur.executemany(
        "INSERT OR REPLACE INTO animation_centers "
        "(country_code, animation_type, annual_volume_min, annual_volume_max, "
        " leading_studios, source_pdf_page) "
        "VALUES (?, ?, ?, ?, ?, ?)",
        CANONICAL_ANIMATION_CENTERS,
    )

    # Global format stats (PDF pp.1-2 totals).
    cur.executemany(
        "INSERT OR REPLACE INTO global_format_stats "
        "(format_key, display_name, estimated_volume, share_pct, "
        " structural_definition, primary_source, source_pdf_page) "
        "VALUES (?, ?, ?, ?, ?, ?, ?)",
        CANONICAL_GLOBAL_FORMAT_STATS,
    )

    # ---- appended: home-page facets (wires trending.png) -------
    # poster_url is built from OMNI_IMG_BASE; NULL when no image.
    cur.executemany(
        "INSERT OR REPLACE INTO facets (slug, name, poster_url, sort_order) "
        "VALUES (?, ?, ?, ?)",
        [
            (slug, name,
             f"{OMNI_IMG_BASE}/{path}" if path else None,
             sort_order)
            for slug, name, path, sort_order in CANONICAL_FACETS
        ],
    )

    conn.commit()
    return conn


if __name__ == "__main__":
    import sys
    target = sys.argv[1] if len(sys.argv) > 1 else "scraper/catalog.db"
    conn = init_catalog(target)
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM genres")
    print(f"genres: {cur.fetchone()[0]}")
    cur.execute("SELECT COUNT(*) FROM countries")
    print(f"countries: {cur.fetchone()[0]}")
    cur.execute("SELECT COUNT(*) FROM languages")
    print(f"languages: {cur.fetchone()[0]}")
    cur.execute("SELECT COUNT(*) FROM collections")
    print(f"collections: {cur.fetchone()[0]}")
    cur.execute("SELECT COUNT(*) FROM sources")
    print(f"sources: {cur.fetchone()[0]}")
    # append-only additions
    cur.execute("SELECT COUNT(*) FROM streaming_providers")
    print(f"streaming_providers: {cur.fetchone()[0]}")
    cur.execute("SELECT COUNT(*) FROM genre_images")
    print(f"genre_images: {cur.fetchone()[0]}")
    cur.execute("SELECT COUNT(*) FROM collection_images")
    print(f"collection_images: {cur.fetchone()[0]}")
    cur.execute("SELECT COUNT(*) FROM studios")
    print(f"studios: {cur.fetchone()[0]}")
    cur.execute("SELECT COUNT(*) FROM animation_studios")
    print(f"animation_studios: {cur.fetchone()[0]}")
    cur.execute("SELECT COUNT(*) FROM decades")
    print(f"decades: {cur.fetchone()[0]}")
    cur.execute("SELECT COUNT(*) FROM actors")
    print(f"actors: {cur.fetchone()[0]}")
    cur.execute("SELECT COUNT(*) FROM directors")
    print(f"directors: {cur.fetchone()[0]}")
    cur.execute("SELECT COUNT(*) FROM free_access_methods")
    print(f"free_access_methods: {cur.fetchone()[0]}")
    # appended: PDF-sourced tables
    cur.execute("SELECT COUNT(*) FROM country_production")
    print(f"country_production: {cur.fetchone()[0]}")
    cur.execute("SELECT COUNT(*) FROM regional_formats")
    print(f"regional_formats: {cur.fetchone()[0]}")
    cur.execute("SELECT COUNT(*) FROM animation_centers")
    print(f"animation_centers: {cur.fetchone()[0]}")
    cur.execute("SELECT COUNT(*) FROM global_format_stats")
    print(f"global_format_stats: {cur.fetchone()[0]}")
    # appended: facets + junction tables (junction counts are 0 until
    # titles are linked — only the table is created here)
    cur.execute("SELECT COUNT(*) FROM facets")
    print(f"facets: {cur.fetchone()[0]}")
    cur.execute("SELECT COUNT(*) FROM title_actors")
    print(f"title_actors: {cur.fetchone()[0]} (junction, populated as titles are linked)")
    cur.execute("SELECT COUNT(*) FROM title_directors")
    print(f"title_directors: {cur.fetchone()[0]} (junction, populated as titles are linked)")
    cur.execute("SELECT COUNT(*) FROM title_studios")
    print(f"title_studios: {cur.fetchone()[0]} (junction, populated as titles are linked)")
    cur.execute("SELECT COUNT(*) FROM title_animation_studios")
    print(f"title_animation_studios: {cur.fetchone()[0]} (junction, populated as titles are linked)")
    cur.execute("SELECT COUNT(*) FROM title_streaming_providers")
    print(f"title_streaming_providers: {cur.fetchone()[0]} (junction, populated as titles are linked)")
    conn.close()
    print(f"Catalog schema initialized at: {target}")
