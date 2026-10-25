#!/usr/bin/env python3
"""
ingest_tvmaze_schedule.py — Ingest live TV & streaming broadcast schedules from TVMaze API.

Fetches today's live US television broadcasts and web streaming premieres
(e.g., ABC, CBS, NBC, HBO, AMC, Netflix, Apple TV, Crunchyroll, etc.)
and generates frontend/public/airing_today.json for the Home screen live guide.
"""

import json
import re
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_FILE = REPO_ROOT / "frontend" / "public" / "airing_today.json"

USER_AGENT = "ShadowStream/2.4.21 (TVMaze Schedule Ingest; +https://ssmoviestvs.site)"


def clean_html(text: str) -> str:
    if not text:
        return ""
    clean = re.sub(r"<[^>]+>", "", text)
    return clean.replace("&quot;", '"').replace("&#039;", "'").replace("&amp;", "&").strip()


def slugify(text: str) -> str:
    clean = re.sub(r"[^\w\s-]", "", text.lower())
    return re.sub(r"[-\s]+", "-", clean).strip("-")


def fetch_json(url: str):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=12) as response:
            return json.loads(response.read().decode("utf-8"))
    except Exception as e:
        print(f"[TVMaze Ingest] Warning: Failed to fetch {url}: {e}", file=sys.stderr)
        return []


def ingest_schedule():
    print("[TVMaze Ingest] Fetching US TV broadcast schedule...")
    today_broadcasts = fetch_json("https://api.tvmaze.com/schedule?country=US")

    print("[TVMaze Ingest] Fetching digital web streaming schedule...")
    today_web = fetch_json("https://api.tvmaze.com/schedule/web")

    items = []
    seen_show_keys = set()

    # Process broadcast schedule
    for entry in today_broadcasts:
        show = entry.get("show") or {}
        show_name = show.get("name")
        if not show_name:
            continue

        slug = slugify(show_name)
        if slug in seen_show_keys:
            continue

        image = (show.get("image") or entry.get("image") or {})
        poster_url = image.get("medium") or image.get("original")
        if not poster_url:
            continue

        network_info = show.get("network") or show.get("webChannel") or {}
        network_name = network_info.get("name") or "Broadcast"

        rating_info = show.get("rating") or entry.get("rating") or {}
        rating = rating_info.get("average") or 0.0

        ep_season = entry.get("season") or 1
        ep_number = entry.get("number") or 1
        ep_name = entry.get("name") or f"Episode {ep_number}"
        airtime = entry.get("airtime") or ""

        summary = clean_html(entry.get("summary") or show.get("summary") or "")

        items.append({
            "id": entry.get("id") or show.get("id"),
            "slug": slug,
            "title": show_name,
            "type": "tv",
            "episodeTitle": ep_name,
            "season": ep_season,
            "episode": ep_number,
            "airtime": airtime,
            "network": network_name,
            "poster": poster_url,
            "backdrop": image.get("original") or poster_url,
            "rating": rating,
            "overview": summary,
            "genres": show.get("genres") or [],
            "status": show.get("status") or "Running",
            "isLiveToday": True
        })
        seen_show_keys.add(slug)

    # Process web streaming schedule (e.g. streaming premieres)
    for entry in today_web:
        embedded = entry.get("_embedded") or {}
        show = embedded.get("show") or entry.get("show") or {}
        show_name = show.get("name")
        if not show_name:
            continue

        slug = slugify(show_name)
        if slug in seen_show_keys:
            continue

        image = (show.get("image") or entry.get("image") or {})
        poster_url = image.get("medium") or image.get("original")
        if not poster_url:
            continue

        network_info = show.get("webChannel") or show.get("network") or {}
        network_name = network_info.get("name") or "Web Premiere"

        rating_info = show.get("rating") or entry.get("rating") or {}
        rating = rating_info.get("average") or 0.0

        ep_season = entry.get("season") or 1
        ep_number = entry.get("number") or 1
        ep_name = entry.get("name") or f"Episode {ep_number}"
        airtime = entry.get("airtime") or ""

        summary = clean_html(entry.get("summary") or show.get("summary") or "")

        items.append({
            "id": entry.get("id") or show.get("id"),
            "slug": slug,
            "title": show_name,
            "type": "tv",
            "episodeTitle": ep_name,
            "season": ep_season,
            "episode": ep_number,
            "airtime": airtime,
            "network": network_name,
            "poster": poster_url,
            "backdrop": image.get("original") or poster_url,
            "rating": rating,
            "overview": summary,
            "genres": show.get("genres") or [],
            "status": show.get("status") or "Running",
            "isLiveToday": True
        })
        seen_show_keys.add(slug)

    # Prioritize items with rating, then by presence of summary
    items.sort(key=lambda x: (float(x.get("rating") or 0), bool(x.get("overview"))), reverse=True)

    result = {
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "totalCount": len(items),
        "source": "TVMaze Live Schedule",
        "items": items[:40]
    }

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    print(f"[TVMaze Ingest] Successfully generated {OUTPUT_FILE} with {len(result['items'])} curated live shows airing today.")
    return len(result["items"])


if __name__ == "__main__":
    count = ingest_schedule()
    sys.exit(0 if count > 0 else 1)
