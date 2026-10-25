/**
 * AniList GraphQL Anime Title & Airing Countdown Resolver.
 * Resolves English, Romaji, and native Japanese titles, plus airing countdowns.
 */

const ANILIST_URL = 'https://graphql.anilist.co';
const cache = new Map();

const QUERY = `
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
}`;

export async function resolveAnimeInfo(title) {
    if (!title || typeof title !== 'string') return null;
    const clean = title.replace(/\(\d{4}\)|-\d{4,9}$/g, '').replace(/[-_]/g, ' ').trim();
    if (!clean) return null;
    const cacheKey = clean.toLowerCase();
    if (cache.has(cacheKey)) return cache.get(cacheKey);

    try {
        const res = await fetch(ANILIST_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ query: QUERY, variables: { search: clean } })
        });
        if (!res.ok) return null;
        const json = await res.json();
        const media = json.data?.Media;
        if (!media) return null;

        const info = {
            id: media.id,
            malId: media.idMal,
            romaji: media.title?.romaji || null,
            english: media.title?.english || null,
            native: media.title?.native || null,
            synonyms: media.synonyms || [],
            status: media.status,
            episodes: media.episodes,
            nextAiringEpisode: media.nextAiringEpisode ? {
                episode: media.nextAiringEpisode.episode,
                airingAt: media.nextAiringEpisode.airingAt,
                timeUntilAiring: media.nextAiringEpisode.timeUntilAiring
            } : null,
            coverImage: media.coverImage?.large || media.coverImage?.medium
        };
        cache.set(cacheKey, info);
        return info;
    } catch (e) {
        console.warn('[AniList] resolveAnimeInfo error:', e);
        return null;
    }
}

export function formatTimeUntilAiring(seconds) {
    if (!seconds || seconds <= 0) return '';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
}
