#!/usr/bin/env python3
"""
ingest_sports_streams.py — Ingest live sports channels (HLS / M3U8) and live match scoreboards.

Sources:
1. iptv-org sports feeds (400+ legal free-to-air & FAST sports channels)
2. ESPN public unauthenticated scoreboards (Premier League, NBA, NFL, F1)

Outputs:
frontend/public/sports_hub.json
"""

import json
import re
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

# Ensure UTF-8 output in Windows terminals
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

REPO_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_FILE = REPO_ROOT / "frontend" / "public" / "sports_hub.json"

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"


def fetch_url(url: str, timeout: int = 10) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "*/*"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            return response.read().decode("utf-8", errors="replace")
    except Exception as e:
        print(f"[Sports Ingest] Warning: fetch failed for {url}: {e}", file=sys.stderr)
        return ""


VERIFIED_CRICKET_CHANNELS = [
    {
        "id": "sport_cricket_1",
        "name": "Star Sports 1",
        "logo": "https://resources.cricket-australia.pulselive.com/cricket-australia/photo/2025/07/25/836eddae-4329-4542-ad17-dcd37e9d951a/Cricket-Gold-1920x1080_noBG.png",
        "url": "http://103.151.60.162:2122/play/a024/index.m3u8?hls",
        "quality": "1080p",
        "category": "cricket",
        "country": "IN",
        "isLive": True
    },
    {
        "id": "sport_cricket_2",
        "name": "Star Sports 1 Hindi",
        "logo": None,
        "url": "http://103.151.60.162:2122/play/a025/index.m3u8?hls",
        "quality": "1080p",
        "category": "cricket",
        "country": "IN",
        "isLive": True
    },
    {
        "id": "sport_cricket_3",
        "name": "Star Sports Select 1 HD",
        "logo": None,
        "url": "http://103.151.60.162:2122/play/a026/index.m3u8?hls",
        "quality": "1080p",
        "category": "cricket",
        "country": "IN",
        "isLive": True
    },
    {
        "id": "sport_cricket_4",
        "name": "Star Sports Select 2 HD",
        "logo": None,
        "url": "http://103.151.60.162:2122/play/a027/index.m3u8?hls",
        "quality": "1080p",
        "category": "cricket",
        "country": "IN",
        "isLive": True
    },
    {
        "id": "sport_cricket_5",
        "name": "Star Sports 2",
        "logo": None,
        "url": "http://103.151.60.162:2122/play/a00v/index.m3u8?hls",
        "quality": "720p",
        "category": "cricket",
        "country": "IN",
        "isLive": True
    },
    {
        "id": "sport_cricket_6",
        "name": "Sony Sports Ten 1",
        "logo": None,
        "url": "http://103.151.60.162:2122/play/a01c/index.m3u8?hls",
        "quality": "1080p",
        "category": "cricket",
        "country": "IN",
        "isLive": True
    },
    {
        "id": "sport_cricket_7",
        "name": "Sony Sports Ten 2",
        "logo": None,
        "url": "http://103.151.60.162:2122/play/a01b/index.m3u8?hls",
        "quality": "1080p",
        "category": "cricket",
        "country": "IN",
        "isLive": True
    },
    {
        "id": "sport_cricket_8",
        "name": "Ten Cricket",
        "logo": None,
        "url": "http://103.151.60.162:2122/play/a0fj/index.m3u8?hls",
        "quality": "720p",
        "category": "cricket",
        "country": "IN",
        "isLive": True
    },
    {
        "id": "sport_cricket_9",
        "name": "PTV Sports Live",
        "logo": None,
        "url": "http://103.151.60.162:2122/play/a018/index.m3u8?hls",
        "quality": "1080p",
        "category": "cricket",
        "country": "PK",
        "isLive": True
    },
    {
        "id": "sport_cricket_10",
        "name": "Willow Sports HD",
        "logo": None,
        "url": "https://d36r8jifhgsk5j.cloudfront.net/Willow_TV.m3u8",
        "quality": "1080p",
        "category": "cricket",
        "country": "US",
        "isLive": True
    },
    {
        "id": "sport_cricket_11",
        "name": "DD Sports HD",
        "logo": None,
        "url": "https://d3qs3d2rkhfqrt.cloudfront.net/out/v1/b17adfe543354fdd8d189b110617cddd/index.m3u8",
        "quality": "1080p",
        "category": "cricket",
        "country": "IN",
        "isLive": True
    },
    {
        "id": "sport_cricket_12",
        "name": "Cricket Gold HD",
        "logo": "https://resources.cricket-australia.pulselive.com/cricket-australia/photo/2025/07/25/836eddae-4329-4542-ad17-dcd37e9d951a/Cricket-Gold-1920x1080_noBG.png",
        "url": "https://streams2.sofast.tv/ptnr-yupptv/title-cricketgold/v1/master/611d79b11b77e2f571934fd80ca1413453772ac7/b2048bb8-1686-4432-aa50-647245383e0c/manifest.m3u8",
        "quality": "1080p",
        "category": "cricket",
        "country": "AU",
        "isLive": True
    }
]


def categorize_channel(name: str) -> str:
    n = name.lower()
    if any(k in n for k in ["cricket", "willow", "star sports", "ptv sports", "ten cricket", "sony ten", "sony sports ten", "a sports", "t sports", "geo super", "super sport cricket", "astro cricket"]):
        return "cricket"
    if any(k in n for k in ["football", "soccer", "futbol", "fifa", "premier", "serie a", "bundesliga", "liga"]):
        return "football"
    if any(k in n for k in ["racing", "motorsport", "auto", "f1", "motor", "nascar", "speedway", "rally", "kart", "moto"]):
        return "racing"
    if any(k in n for k in ["fight", "combat", "mma", "ufc", "boxing", "wrestling", "judo", "karate", "boxeo"]):
        return "combat"
    if any(k in n for k in ["basketball", "nba", "basket", "hoop", "acc", "ncaa", "baloncesto"]):
        return "basketball"
    if any(k in n for k in ["tennis", "golf", "pga", "atp", "wta"]):
        return "tennis_golf"
    if any(k in n for k in ["extreme", "outdoor", "red bull", "surf", "ski", "skate", "adventure", "hunt", "fish", "snow"]):
        return "extreme"
    return "general"


def ingest_iptv_sports():
    print("[Sports Ingest] Fetching live sports channels from iptv-org...")
    m3u_text = fetch_url("https://iptv-org.github.io/iptv/categories/sports.m3u", timeout=12)
    if not m3u_text:
        return []

    lines = m3u_text.splitlines()
    channels = []
    seen_urls = set()

    for i in range(len(lines)):
        line = lines[i].strip()
        if line.startswith("#EXTINF:"):
            # Extract channel name
            name_parts = line.split(",")
            name = name_parts[-1].strip() if len(name_parts) > 1 else "Sports Channel"
            
            # Extract quality
            quality = "1080p" if "1080p" in line else "720p" if "720p" in line else "HD"

            # Extract logo
            logo_match = re.search(r'tvg-logo="([^"]+)"', line)
            logo = logo_match.group(1) if logo_match else None

            # Extract country
            country_match = re.search(r'tvg-country="([^"]+)"', line)
            country = country_match.group(1) if country_match else "US"

            # Stream URL is in the next line
            if i + 1 < len(lines):
                stream_url = lines[i + 1].strip()
                if stream_url.startswith("http") and stream_url not in seen_urls:
                    seen_urls.add(stream_url)
                    cat = categorize_channel(name)
                    channels.append({
                        "id": f"sport_ch_{len(channels)+1}",
                        "name": re.sub(r"\s*\(\d+p\)", "", name).strip(),
                        "logo": logo,
                        "url": stream_url,
                        "quality": quality,
                        "category": cat,
                        "country": country,
                        "isLive": True
                    })

    # Prioritize channels with logos and standard qualities
    channels.sort(key=lambda c: (bool(c["logo"]), c["category"] != "general"), reverse=True)
    print(f"[Sports Ingest] Processed {len(channels)} valid sports streams.")
    return channels


def ingest_espn_scores():
    print("[Sports Ingest] Fetching live scores & match fixtures from ESPN...")
    leagues = [
        {"league": "Premier League", "sport": "football", "slug": "soccer/eng.1", "icon": "⚽"},
        {"league": "NBA", "sport": "basketball", "slug": "basketball/nba", "icon": "🏀"},
        {"league": "NFL", "sport": "football_us", "slug": "football/nfl", "icon": "🏈"},
        {"league": "Formula 1", "sport": "racing", "slug": "racing/f1", "icon": "🏎️"},
        {"league": "Champions League", "sport": "football", "slug": "soccer/uefa.champions", "icon": "🏆"},
    ]

    matches = []
    for lg in leagues:
        url = f"https://site.api.espn.com/apis/site/v2/sports/{lg['slug']}/scoreboard"
        raw = fetch_url(url, timeout=8)
        if not raw:
            continue
        try:
            data = json.loads(raw)
            events = data.get("events") or []
            for ev in events[:6]:  # top 6 matches per league
                comp = (ev.get("competitions") or [{}])[0]
                competitors = comp.get("competitors") or []
                home = next((c for c in competitors if c.get("homeAway") == "home"), {})
                away = next((c for c in competitors if c.get("homeAway") == "away"), {})
                status_type = ev.get("status", {}).get("type", {})
                
                broadcasts = comp.get("broadcasts") or []
                network = "Live Sports"
                if broadcasts and broadcasts[0].get("names"):
                    network = ", ".join(broadcasts[0]["names"])

                matches.append({
                    "id": ev.get("id"),
                    "name": ev.get("name") or f"{away.get('team', {}).get('displayName')} at {home.get('team', {}).get('displayName')}",
                    "shortName": ev.get("shortName"),
                    "league": lg["league"],
                    "sport": lg["sport"],
                    "icon": lg["icon"],
                    "status": status_type.get("description") or status_type.get("detail") or "Scheduled",
                    "state": status_type.get("state") or "pre",  # 'pre', 'in', 'post'
                    "date": ev.get("date"),
                    "homeTeam": {
                        "name": home.get("team", {}).get("displayName") or "Home",
                        "shortName": home.get("team", {}).get("abbreviation") or "HM",
                        "logo": home.get("team", {}).get("logo"),
                        "score": home.get("score") or "0"
                    },
                    "awayTeam": {
                        "name": away.get("team", {}).get("displayName") or "Away",
                        "shortName": away.get("team", {}).get("abbreviation") or "AW",
                        "logo": away.get("team", {}).get("logo"),
                        "score": away.get("score") or "0"
                    },
                    "broadcast": network,
                    "isLive": status_type.get("state") == "in"
                })
        except Exception as e:
            print(f"[Sports Ingest] Error parsing ESPN {lg['league']}: {e}", file=sys.stderr)

    print(f"[Sports Ingest] Processed {len(matches)} live and upcoming match fixtures.")
    return matches


def build_sports_hub():
    iptv_channels = ingest_iptv_sports()
    matches = ingest_espn_scores()

    # Prepend verified cricket channels and deduplicate URLs
    seen_urls = set(c["url"] for c in VERIFIED_CRICKET_CHANNELS)
    merged_channels = list(VERIFIED_CRICKET_CHANNELS)
    for ch in iptv_channels:
        if ch["url"] not in seen_urls:
            seen_urls.add(ch["url"])
            merged_channels.append(ch)

    result = {
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "totalChannels": len(merged_channels),
        "totalMatches": len(matches),
        "categories": [
            {"id": "all", "label": "All Sports", "icon": "🏆"},
            {"id": "cricket", "label": "Cricket", "icon": "🏏"},
            {"id": "football", "label": "Football / Soccer", "icon": "⚽"},
            {"id": "racing", "label": "Motorsports & Racing", "icon": "🏎️"},
            {"id": "combat", "label": "Combat & MMA", "icon": "🥊"},
            {"id": "basketball", "label": "Basketball", "icon": "🏀"},
            {"id": "tennis_golf", "label": "Tennis & Golf", "icon": "🎾"},
            {"id": "extreme", "label": "Extreme Sports", "icon": "🏂"},
            {"id": "general", "label": "Sports Networks", "icon": "📺"}
        ],
        "matches": matches,
        "channels": merged_channels[:175]  # Curated high-quality channels including live cricket
    }

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    # Sync to frontend dist and apkbuild if directories exist
    dist_file = REPO_ROOT / "frontend" / "dist" / "sports_hub.json"
    if dist_file.parent.exists():
        with open(dist_file, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2, ensure_ascii=False)

    apk_file = REPO_ROOT / ".apkbuild" / "assets" / "www" / "sports_hub.json"
    if apk_file.parent.exists():
        with open(apk_file, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2, ensure_ascii=False)

    print(f"[Sports Ingest] Successfully exported sports hub to {OUTPUT_FILE} (Channels: {len(result['channels'])})")
    return len(result["channels"])


if __name__ == "__main__":
    count = build_sports_hub()
    sys.exit(0 if count > 0 else 1)
