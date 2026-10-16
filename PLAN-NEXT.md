# ShadowStream — plan from here

Written 2026-10-01, grounded in measured state rather than assumptions. Every number
below was read from the database or a live endpoint on that date.

---

## 1. Where we actually are

| | |
|---|---|
| Titles in catalogue | **201,222** |
| Playing in our own engine (native) | **23,341** — was 7 before this work |
| Titles with season + episode data | **4,122** of 58,741 episodic (7.0%) — was 3,424 |
| Episode rows | **762,418** |
| Live site | `https://ssmoviestvs.site` — PWA, service worker active |
| Android | APK built, signed with a durable key, cert digest verified |
| Windows | portable app built, loads the real domain |
| Play / App Store | not submitted — needs your accounts |
| Subtitle tracks | **0** — blocked on your OpenSubtitles login |

Player, verified live: video plays, our chrome renders in **both** direct and embed
mode, server switcher, auto-failover on a dead mirror, VLC handoff, quality menu
populated from real renditions.

---

## 2. Finish what's running (do first)

**2.1 — TMDB episode fill.** Running now. 54,531 titles pending, ~97% match rate.
Projected outcome: season/episode selectors on **~92% of episodic titles**, up from
5.8%. This is the single highest-value job outstanding. Let it run; it checkpoints
every 20 titles so it is safe to interrupt and resume.

**2.2 — Prelinger sweep.** 10,461 public-domain films, ~4,000 net-new native titles.
Broke three times already (mangled `fl[]` params, `total_changes` on the wrong
object, a UNIQUE constraint needing `INSERT OR REPLACE`). Working now. Sequence it
**after** the TMDB fill — both write `catalog.db` and SQLite allows one writer.

**2.3 — Republish.** Neither job's output reaches users until re-exported and
uploaded. Required once both finish:
```
python scraper/export_worker_snapshot.py
python scraper/upload_worker_export_to_r2.py --workers 3
python scraper/export_catalog_seasons.py
python scraper/upload_seasons_to_r2.py --workers 2
```
Upload the seasons **last** — `export_worker_snapshot.py` rewrites
`worker_export/`, and the uploader checkpoint is key-based, so clear
`worker_export/.r2_uploaded.json` or it will skip changed content. That exact bug
bit us once already.

---

## 3. Open sources still at zero

Four sources are configured in the database and have **never been ingested**:

| source | type | available |
|---|---|---|
| `prelinger` | public_domain | 10,461 — in progress |
| `commons` | cc_by_sa | tens of thousands of clips, few features |
| `pixabay` | cc0 | large, stock footage not feature films |
| `pexels` | pexels_license | large, stock footage not feature films |

Worth doing: **commons** is the only one likely to add feature-length content.
Pixabay and Pexels are stock footage — they will inflate the count with clips
rather than films, which is worse than useless for a streaming catalogue. My
recommendation: ingest `commons`, skip the other two.

---

## 4. Blocked on you

These are the only things I cannot do. Each is a credential or an account only you
can create.

**4.1 — Subtitles.** The API key works for search but not download:
```
GET  /infos/user -> 401 {"errors":["No token in request"]}
POST /login      -> 401 "invalid username/password"
GET  /subtitles  -> 200
```
Add to `scraper/.env`:
```
OPENSUBTITLES_USERNAME=your@email.com
OPENSUBTITLES_PASSWORD=your-password
```
The login exchange, 24-hour JWT cache and download path are all written. Realistic
yield: moderate, and only for native titles. Current addressable set is ~74 titles
because the playable set is public-domain films, which rarely have subtitles.

**4.2 — Play Store.** Needs a $25 account, government-ID verification, and a
**14-day closed test with 12 testers** for new personal accounts. Also needs an
`.aab` at targetSdk 36, which requires the Android SDK (~10 GB) or EAS Build
(~$5–30). The current APK is a sideload artifact at targetSdk 33 and cannot be
submitted. The realistic route is `eas build --platform android` from `frontend/`,
which reuses the keystore already created.

**4.3 — App Store.** An IPA cannot be produced on Windows. Needs a Mac or EAS
credits. Apple requires the iOS 26 SDK. Config is written (`com.streamapp.app`,
deployment target 16.4); only the build host is missing.

**4.4 — ssmovietvs.site.** Working, but the dead zone is `ssmovietvs.site`
(no `e`) — a different domain still delegated to Tucows. Delete it from Cloudflare.
The live one needs no further DNS work.

---

## 5. Operations that now exist

| job | cadence | does |
|---|---|---|
| `ShadowStreamDailyRefresh` | 04:30 daily | refreshes now-playing, upcoming, on-the-air, airing-today + weekly trending; ~15 s |
| `ShadowStreamTVDB2` | one-shot | superseded by TMDB; can be retired |

Two harvesters have no schedule and should get one, both resumable:
- `harvest_archive_subtitles.py` — bundled `.vtt` from archive.org items, no auth
- `harvest_renditions.py` — quality options, already run once to completion

The verification suite is `scripts/verify_platform.py`. It is capable of failing —
which the previous one was not. Run it before any deploy; it is the only thing
standing between us and another "23/23 green while broken" night.

---

## 6. Limits I can't engineer around

**6.1 — ~178,000 titles play in a provider's iframe, not our engine.** The only
routes to a direct stream for those are extracting it from the embed aggregators,
which I don't do. They play, reliably, with our chrome and a server switcher
around them — but our engine is not the decoder.

**6.2 — No dubbing, ever, for this catalogue.** `title_audio_languages` has 475
rows across 201,222 titles. The public-domain content is original-language, and
provider audio lives inside a cross-origin iframe we cannot replace. There is
nothing to switch between.

**6.3 — Subtitles only work on native titles.** You cannot inject a `<track>` into
someone else's `<video>`. Embed titles get the provider's own CC button or nothing.

**6.4 — Episode data depends on TMDB having the show.** At a 97% match rate this is
mostly solved, but titles absent from TMDB will never get selectors. Re-run
`ingest_tmdb_episodes.py` after any catalogue expansion to catch new titles.

---

## 7. What I'd do next, in order

1. Let the TMDB episode fill finish. **Do not interrupt it.**
2. Run the Prelinger sweep after it.
3. Re-export and publish both.
4. Ingest `commons`; skip pixabay and pexels.
5. Add the two harvesters to the daily task.
6. Whatever you unblock from §4.

**Acceptance for "done":**
- ≥ 90% of episodic titles have a working season/episode selector
- ≥ 28,000 titles play in our own engine
- `verify_platform.py` green, including the PWA and season-scope tests
- No title shows a season selector with an empty list

---

## 8. Things I got wrong, so you can distrust the right parts

- A loop condition `'0 pending' -match` matched inside `"21120 pending"`, so the
  archive backfill quit at 15% while reporting success. It was restarted; 23,242
  titles are the result.
- The R2 uploader's checkpoint is key-based, so a regenerated 470 MB export was
  silently skipped as "already uploaded". Fixed by clearing the checkpoint.
- `tvdb_episode_ingest.py` read `os.environ` while the keys live in `scraper/.env`,
  so it exited immediately under a scheduled task. It now loads `.env` itself.
- I wrote SQLite writes from six threads in the TMDB ingest. This repo's own
  `enrich_tvdb_seasons.py` warns about exactly that. Fixed: parallel HTTP, serial
  writes.
- The first season/episode endpoint returned **184 seasons for Reacher** because a
  shard holds ~200 titles and I wasn't filtering. Fixed with a 170 KB by-title map
  rather than re-uploading 223 MB.
- My subtitle verification checked the parent document's `innerText` for text
  rendered *inside* a cross-origin iframe, so it passed while the player was
  broken. The screenshot caught what the test could not.

Every one of those was a check that passed when it should have failed. That is the
failure mode to watch for, not the individual bugs.
