"""
anime_resolver.py — AniList GraphQL Anime Title & Airing Resolver.

Resolves anime titles across English, Romaji, and native Japanese names,
and retrieves live episode airing schedules and countdowns.
"""

import json
import re
import urllib.request
from typing import Dict, List, Optional, Any

ANILIST_API_URL = "https://graphql.anilist.co"
USER_AGENT = "ShadowStream/2.4.21 (AniList Anime Resolver; +https://ssmoviestvs.site)"

_QUERY = """
query ($search: String) {
  Media(search: $search, type: ANIME, sort: POPULARITY_DESC) {
    id
    idMal
    title {
      romaji
      english
      native
    }
    synonyms
    status
    episodes
    nextAiringEpisode {
      airingAt
      timeUntilAiring
      episode
    }
    coverImage {
      large
      medium
    }
  }
}
"""

_CACHE: Dict[str, Dict[str, Any]] = {}


def clean_search_title(title: str) -> str:
    # Remove year tags like (2023) or -2023
    t = re.sub(r"\(\d{4}\)|-\d{4,9}$", "", title).strip()
    # Remove season suffixes for top-level search
    t = re.sub(r"(?i)\s+season\s+\d+", "", t).strip()
    return t


def resolve_anime_title(title: str) -> Optional[Dict[str, Any]]:
    clean = clean_search_title(title)
    cache_key = clean.lower()
    if cache_key in _CACHE:
        return _CACHE[cache_key]

    payload = json.dumps({"query": _QUERY, "variables": {"search": clean}}).encode("utf-8")
    req = urllib.request.Request(
        ANILIST_API_URL,
        data=payload,
        headers={
            "User-Agent": USER_AGENT,
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=8) as response:
            data = json.loads(response.read().decode("utf-8"))
            media = data.get("data", {}).get("Media")
            if not media:
                return None

            t_obj = media.get("title") or {}
            romaji = t_obj.get("romaji") or ""
            english = t_obj.get("english") or ""
            native = t_obj.get("native") or ""
            synonyms = media.get("synonyms") or []

            next_ep = media.get("nextAiringEpisode")
            airing_info = None
            if next_ep:
                airing_info = {
                    "episode": next_ep.get("episode"),
                    "airingAt": next_ep.get("airingAt"),
                    "timeUntilAiring": next_ep.get("timeUntilAiring"),
                }

            result = {
                "anilistId": media.get("id"),
                "malId": media.get("idMal"),
                "romaji": romaji,
                "english": english,
                "native": native,
                "synonyms": synonyms,
                "status": media.get("status"),
                "episodes": media.get("episodes"),
                "nextAiringEpisode": airing_info,
                "coverImage": media.get("coverImage", {}).get("large"),
            }
            _CACHE[cache_key] = result
            return result
    except Exception as e:
        print(f"[AniList Resolver] Warning: Failed to resolve '{clean}': {e}")
        return None


if __name__ == "__main__":
    import sys
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    test_title = sys.argv[1] if len(sys.argv) > 1 else "Attack on Titan"
    print(f"Resolving: {test_title}")
    res = resolve_anime_title(test_title)
    print(json.dumps(res, indent=2, ensure_ascii=False))
