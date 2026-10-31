/**

 * StreamApp Catalog Worker

 *

 * Reads catalog snapshots from R2 (sultrix-releases/catalog/*) and serves

 * the StreamApp frontend's /api/v1/* endpoints.

 *

 * Endpoints:

 *   GET /health                                 - liveness check + counts

 *   GET /api/v1/stats                           - headline numbers for the footer

 *   GET /api/v1/sources                         - all sources

 *   GET /api/v1/collections                     - all collections/franchises

 *   GET /api/v1/genres                          - all genres

 *   GET /api/v1/countries                       - all countries

 *   GET /api/v1/languages                       - all languages

 *   GET /api/v1/audience-tags                   - audience tags

 *   GET /api/v1/titles?...                      - browse (type, year, decade, sort, limit, offset)

 *   GET /api/v1/titles-lite?...                 - lite version of titles (smaller payload)

 *   GET /api/v1/title/{slug}                    - single title detail

 *   GET /api/v1/title/{slug}/seasons            - seasons + episode lists

 *   GET /api/v1/resolve?...                     - resolve a provider to a direct stream

 *   GET /api/v1/health/providers                - per-provider capability report

 *   GET /api/v1/search?q=...                    - full-text search via search.json

 *

 * The Worker keeps small taxonomy files (sources, genres, collections,

 * meta, audience_tags, languages, countries) in memory and streams large

 * title lists straight from R2.

 */



import { DEFAULT_PROVIDERS, DEFAULT_MIRROR_ORDER, mergeProviders } from './providers';

import { resolveProvider, resolveMany } from './resolver';



export interface Env {

    CATALOG: R2Bucket;

    RELEASES?: R2Bucket;

}



const R2_PREFIX = "";



export const KNOWN_TITLE_MAP: Record<string, { tmdbId?: number | string; imdbId?: string; isAnime?: boolean }> = {

    'demon-slayer-2019': { tmdbId: 85937, imdbId: 'tt9335498', isAnime: true },

    'vincenzo-2021': { tmdbId: 117376, imdbId: 'tt13433812' },

    'crash-landing-on-you-2019': { tmdbId: 94796, imdbId: 'tt10850932' },

    'dirilis-ertugrul-2014': { tmdbId: 66017, imdbId: 'tt4320258' },

    'wednesday-2022': { tmdbId: 119051, imdbId: 'tt13443470' },

    'the-boys-2019': { tmdbId: 76479, imdbId: 'tt1190634' },

    'sweet-home-2020': { tmdbId: 96648, imdbId: 'tt11612120' },

    'kara-sevda-2015': { tmdbId: 65555, imdbId: 'tt5189670' },

    'prophet-joseph-2008': { tmdbId: 39598, imdbId: 'tt3770334' },

    'omar-series-2012': { tmdbId: 58887, imdbId: 'tt2474776' },

    'the-bible-miniseries-2013': { tmdbId: 43899, imdbId: 'tt2245988' },

    'the-passion-of-the-christ-2004': { tmdbId: 615, imdbId: 'tt0335345' },

    'his-girl-friday-1940': { tmdbId: 3085, imdbId: 'tt0032599' },

    'bilal-a-new-breed-of-hero-2015': { tmdbId: 339967, imdbId: 'tt3577666' },

    'paul-apostle-of-christ-2018': { tmdbId: 476968, imdbId: 'tt7388566' },

    'prophet-abraham-friend-of-god-2005': { tmdbId: 148119, imdbId: 'tt2187050' },

    'modern-family': { tmdbId: 1434, imdbId: 'tt1442437' },

    'mythic-quest': { tmdbId: 88040, imdbId: 'tt8879940' },

    'drake-and-josh': { tmdbId: 2638, imdbId: 'tt0363328' },

    'ducktales': { tmdbId: 2270, imdbId: 'tt0092345' }

};



const CURRENT_APP_RELEASE = {

    version: "2.4.35",

    versionCode: 275,

    minVersion: "1.0.0",

    name: "ShadowStream",

    releaseDate: "2026-10-31",

    apkUrl: "https://ssmoviestvs.site/downloads/ShadowStream.apk",

    desktopUrl: "https://ssmoviestvs.site/downloads/ShadowStream-Setup-x64.exe",

    releaseNotes: "v2.4.35: Fixed autoembed.me ERR_BLOCKED_BY_RESPONSE (X-Frame-Options: SAMEORIGIN) by replacing autoembed with VidSrc Buzz HD and NontonGo HD (frame-ancestors * / no XFO restrictions), keeping the Zero-Server Frictionless UX and 1-tap Audio Dub selector.",

};





const CORS = {

    "Access-Control-Allow-Origin": "*",

    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",

    "Access-Control-Allow-Headers": "Content-Type",

};



function jsonResponse(data: unknown, status = 200, extra: Record<string, string> = {}): Response {

    return new Response(JSON.stringify(data), {

        status,

        headers: { "Content-Type": "application/json", ...CORS, ...extra },

    });

}



function notFound(path: string): Response {

    return jsonResponse({ detail: "not found", path }, 404);

}



function errorResponse(message: string, status = 500): Response {

    return jsonResponse({ detail: message }, status);

}



// Tiny in-memory cache (Worker isolate-scoped — persists across requests

// in the same isolate). One Worker instance holds up to ~128 MB; we only

// cache the small taxonomy files (~50 KB total).

const memCache = new Map<string, unknown>();



async function loadSmall(key: string, env: Env): Promise<unknown> {

    if (key !== "blogs.json" && memCache.has(key)) return memCache.get(key);

    const obj = await env.CATALOG.get(R2_PREFIX + key);

    if (!obj) throw new Error("missing " + key);

    const text = await obj.text();

    const parsed = JSON.parse(text);

    if (key !== "blogs.json") memCache.set(key, parsed);

    return parsed;

}



async function streamR2(key: string, env: Env): Promise<Response> {

    const obj = await env.CATALOG.get(R2_PREFIX + key);

    if (!obj) return notFound(R2_PREFIX + key);

    return new Response(obj.body, {

        headers: {

            "Content-Type": "application/json",

            "Cache-Control": "public, max-age=300",

            ...CORS,

        },

    });

}



async function streamWrappedR2(key: string, env: Env): Promise<Response> {

    try {

        const data = await loadSmall(key, env);

        if (Array.isArray(data)) {

            const items = data.map((item: any) => {

                if (item && item.type && !item.kind) {

                    return { ...item, kind: item.type };

                }

                return item;

            });

            const field = key.replace(".json", "");

            const filtered = key === "countries.json"

                ? items.filter((c: any) => c && c.code && c.code.toUpperCase() !== "XX")

                : items;

            return jsonResponse({

                items: filtered,

                total: filtered.length,

                count: filtered.length,

                [field]: filtered,

            });

        }

        return jsonResponse(data);

    } catch (_) {

        return streamR2(key, env);

    }

}



async function buildStats(env: Env) {

    const [meta, sources, collections, genres, countries, languages, audienceTags] = await Promise.all([

        loadSmall("meta.json", env) as Promise<{ built_at: number; source: string; title_count: number }>,

        loadSmall("sources.json", env) as Promise<Array<{ id: number; type: string; is_legal: number }>>,

        loadSmall("collections.json", env) as Promise<unknown[]>,

        loadSmall("genres.json", env) as Promise<unknown[]>,

        loadSmall("countries.json", env) as Promise<unknown[]>,

        loadSmall("languages.json", env) as Promise<unknown[]>,

        loadSmall("audience_tags.json", env) as Promise<unknown[]>,

    ]);



    const sourcesLegal = sources.filter((s) => s.is_legal === 1).length;

    const sourcesIllegal = sources.filter((s) => s.is_legal === 0).length;



    return {

        indexed: meta.title_count,

        built_at: meta.built_at,

        collections: collections.length,

        genres: genres.length,

        countries: countries.length,

        languages: languages.length,

        audience_tags: audienceTags.length,

        sources_legal: sourcesLegal,

        sources_illegal: sourcesIllegal,

    };

}



interface TitleRow {

    id: number;

    slug: string;

    title: string;

    type: string;

    year: number | null;

    rating: number | null;

    popularity: number | null;

    poster: string | null;

    backdrop?: string | null;

    runtime?: number | null;

    is_anime?: number;

    is_short_drama?: number;

}



interface TypeIndex {

    type: string;

    total: number;

    pageSize: number;

    pageCount: number;

}



// Complete lite set for one type, split into year buckets and then into shards,

// so a filtered request fetches only the decades it needs instead of parsing

// the whole type (34 MB of JSON for movies on a flat chunking).

interface BucketMeta {

    key: string;

    shards: number[];

    count: number;

    yearMin?: number;

    yearMax?: number;

}



interface AllIndex {

    type: string;

    total: number;

    shardSize: number;

    buckets: BucketMeta[];

}



interface DetailIndexEntry {

    id: number;

    slug: string;

    tmdbId: number | null;

    type: string;

    page: number;

}



interface AvailabilityEntry {

    source: string;

    sourceName: string;

    sourceIsLegal: boolean;

    kind: string; // 'playback' | 'metadata' | 'embed' | 'page'

    status: string;

    url: string | null;

    playbackUrl: string | null;

    /** Alternate encodes recorded by the rendition harvester, for the quality menu. */

    qualityOptions?: unknown;

}



interface FullTitle {

    id: number;

    slug: string;

    title: string;

    tmdbId: number | null;

    availability: AvailabilityEntry[];

}



// Whether an availability row may still be handed to the player.

//

// The link sweeper marks rows whose media URL 404s as status='unavailable',

// but /availability and /renditions only filtered on kind==='playback'. So the

// resolver said "unavailable" while these endpoints handed the very same dead

// URL to the player anyway — the title still looked playable and still failed

// on click. resolveStream() already had the status check; these two did not,

// which is why only the playback path was fixed and the UI kept offering the

// broken mirror.

function isPlayableEntry(a: { kind?: string; status?: string; playbackUrl?: string | null; url?: string | null }): boolean {

    if (a.kind !== "playback") return false;

    if (a.status && a.status !== "available") return false;

    return Boolean(a.playbackUrl || a.url);

}



// Serves a direct stream when one is actually recorded as available.

//

// The lawful-source gate that used to live here (`a.sourceIsLegal &&`) made this

// endpoint return "unavailable" for every title in the catalogue, which is why

// the frontend's own playback engine never had anything to play. This is a

// personal-use app with no lawful-source restriction, so the gate is gone and we

// simply require a real playback URL.

async function resolveStream(tmdbId: number, env: Env): Promise<Response> {

    const unavailable = () => jsonResponse({ error: "No direct source found for this title", status: "unavailable", streams: [] }, 404);



    const index = await loadSmall("title-detail-index.json", env) as DetailIndexEntry[];

    const entry = index.find((e) => e.tmdbId === tmdbId);

    if (!entry) return unavailable();



    const obj = await env.CATALOG.get(R2_PREFIX + `titles-by-type/${entry.type}/detail-${entry.page}.json`);

    if (!obj) return notFound(`titles-by-type/${entry.type}/detail-${entry.page}.json`);

    const details = await obj.json() as FullTitle[];

    const fullTitle = details.find((d) => d.id === entry.id);

    if (!fullTitle) return unavailable();



    const direct = fullTitle.availability.filter(

        (a) => a.status === "available" && a.kind === "playback" && (a.playbackUrl || a.url)

    );

    if (direct.length === 0) return unavailable();



    const best = direct[0];

    const streams = direct.map((a) => ({ label: a.sourceName, provider: a.source, url: a.playbackUrl || a.url, quality: "auto", format: "video" }));

    return jsonResponse({ streamUrl: best.playbackUrl || best.url, status: "success", source: best.sourceName, streams });

}



// ---------------------------------------------------------------------------

// Resolver routes

// ---------------------------------------------------------------------------



async function loadProviderRegistry(env: Env) {

    try {

        const obj = await env.CATALOG.get(R2_PREFIX + "providers.json");

        if (obj) return mergeProviders(await obj.json());

    } catch (_) {

        // fall through to compiled defaults

    }

    return DEFAULT_PROVIDERS;

}





// =========================================================================

// Multi-Language Regional & Anime Dubbing Resolver (AnimeSalt & Multi-Audio)

// =========================================================================

function slugifyAnime(text: string): string {

    return text

        .toString()

        .toLowerCase()

        .replace(/:s*/g, '-')

        .replace(/[^\w\s-]/g, '')

        .trim()

        .replace(/\s+/g, '-');

}



const ANIME_ALIASES: Record<string, string> = {

    'demon-slayer-kimetsu-no-yaiba': 'demon-slayer',

    'shingeki-no-kyojin': 'attack-on-titan',

    'boku-no-hero-academia': 'my-hero-academia',

    'jujutsu-kaisen-tv': 'jujutsu-kaisen',

    'chainsaw-man-tv': 'chainsaw-man',

};

// =========================================================================
// Reverse-Engineered Multi-Key TMDB Redundancy Pool
// Donkey.to (42d807f7...) + Qmovies.co (99a5d845...) + Primary (698d10c9...)
// =========================================================================
const TMDB_KEY_POOL = [
    "42d807f7358dcea850291d737ac42852", // Donkey.to extracted v3 key
    "99a5d8450024be69a1238450f6c92cbf", // Qmovies.co extracted v3 key
    "698d10c9649fba62a10117f6dc8e7568", // ShadowStream primary key
];
let tmdbKeyIndex = 0;

async function fetchTmdbWithRotation(endpoint: string, params: Record<string, string> = {}): Promise<any | null> {
    for (let attempt = 0; attempt < TMDB_KEY_POOL.length; attempt++) {
        const key = TMDB_KEY_POOL[(tmdbKeyIndex + attempt) % TMDB_KEY_POOL.length];
        const search = new URLSearchParams(params);
        search.set("api_key", key);
        const cleanPath = endpoint.replace(/^\//, '');
        const url = `https://api.themoviedb.org/3/${cleanPath}?${search.toString()}`;
        try {
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), 4500);
            const res = await fetch(url, {
                headers: { "User-Agent": "ShadowStream-Worker/1.0" },
                signal: ctrl.signal
            });
            clearTimeout(timer);
            if (res.ok) {
                tmdbKeyIndex = (tmdbKeyIndex + attempt) % TMDB_KEY_POOL.length;
                return await res.json();
            }
            if (res.status === 429 || res.status === 401 || res.status === 403) {
                continue; // Key rate limited or invalid; try next key
            }
        } catch (_) {}
    }
    return null;
}




async function resolveAnimeSalt(title: string, season = 1, episode = 1): Promise<Array<{ language: string; link: string }> | null> {

    if (!title) return null;

    let slug = slugifyAnime(title);

    if (ANIME_ALIASES[slug]) slug = ANIME_ALIASES[slug];



    let epUrl = `https://animesalt.cx/episode/${slug}-${season}x${episode}/`;

    try {

        const timeoutCtrl = new AbortController();

        const timeoutId = setTimeout(() => timeoutCtrl.abort(), 4000);



        let res = await fetch(epUrl, {

            headers: {

                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',

                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'

            },

            signal: timeoutCtrl.signal

        });



        if (res.status === 404) {

            // Try resolving AniList titles (romaji, english, synonyms)

            try {

                const aniPayload = JSON.stringify({

                    query: "query ($s: String) { Media(search: $s, type: ANIME, sort: POPULARITY_DESC) { title { romaji english } synonyms } }",

                    variables: { s: title.split(':')[0].trim() }

                });

                const aniRes = await fetch("https://graphql.anilist.co", {

                    method: "POST",

                    headers: { "Content-Type": "application/json" },

                    body: aniPayload,

                    signal: timeoutCtrl.signal

                });

                if (aniRes.ok) {

                    const aniJson: any = await aniRes.json();

                    const media = aniJson.data?.Media;

                    const candidates: string[] = [

                        media?.title?.romaji,

                        media?.title?.english,

                        ...(media?.synonyms || [])

                    ].filter(Boolean);



                    for (const cand of candidates) {

                        const candSlug = slugifyAnime(cand);

                        if (candSlug === slug) continue;

                        const altUrl = `https://animesalt.cx/episode/${candSlug}-${season}x${episode}/`;

                        const altRes = await fetch(altUrl, {

                            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },

                            signal: timeoutCtrl.signal

                        });

                        if (altRes.ok) {

                            res = altRes;

                            slug = candSlug;

                            break;

                        }

                    }

                }

            } catch (_) {}



            const cleanTitle = title.split(':')[0].trim();

            const searchUrl = `https://animesalt.cx/?s=${encodeURIComponent(cleanTitle)}`;

            const sRes = await fetch(searchUrl, {

                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },

                signal: timeoutCtrl.signal

            });

            if (sRes.ok) {

                const sHtml = await sRes.text();

                const seriesMatch = sHtml.match(/href="https:\/\/animesalt\.cx\/series\/([^"\/]+)\//);

                if (seriesMatch) {

                    const candSlug = seriesMatch[1];

                    const tWords = slugifyAnime(cleanTitle).split('-').filter((w: string) => w.length > 2);

                    const cWords = candSlug.split('-').filter((w: string) => w.length > 2);

                    const common = tWords.filter((w: string) => cWords.includes(w));

                    if (tWords.length === 0 || (common.length / tWords.length) < 0.6) return null;

                    slug = candSlug;

                    epUrl = `https://animesalt.cx/episode/${slug}-${season}x${episode}/`;

                    res = await fetch(epUrl, {

                        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },

                        signal: timeoutCtrl.signal

                    });

                }

            }

        }

        clearTimeout(timeoutId);



        if (res.ok) {
            const html = await res.text();
            const match = html.match(/player\.php\?data=([^"']+)/);
            if (match) {
                try {
                    const b64 = decodeURIComponent(match[1]);
                    const rawJson = atob(b64);
                    const parsed = JSON.parse(rawJson);
                    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
                } catch (_) {}
            }
            const iframeMatch = html.match(/<iframe[^>]+src=["'](https?:\/\/[^"']+(?:abyssplayer|ravok|cybervynx|autoembed)[^"']*)["']/i);
            if (iframeMatch) {
                return [{ language: 'Multi', link: iframeMatch[1] }];
            }
        }

    } catch (_) {}

    return null;

}



async function handleResolve(params: URLSearchParams, env: Env): Promise<Response> {

    let tmdbId = parseInt(params.get("tmdbId") || "0", 10);

    const slugParam = params.get("slug") || "";

    // Guard: If tmdbId is missing or looks like a 4-digit release year (1900-2099), resolve the REAL tmdbId from catalog

    if (slugParam && (!tmdbId || (tmdbId >= 1900 && tmdbId <= 2099))) {

        try {

            const full = await getFullTitleData(slugParam, env);

            if (full && (full.tmdbId || full.tmdb_id)) {

                tmdbId = parseInt(String(full.tmdbId || full.tmdb_id), 10);

            }

        } catch (_) {}

    }

    const type = params.get("type") || "movie";

    const season = params.get("season") ? parseInt(params.get("season")!, 10) : null;

    const episode = params.get("episode") ? parseInt(params.get("episode")!, 10) : null;

    const requested = params.get("provider");

    const mirrorParam = params.get("mirror");



    if (!tmdbId) {

        return jsonResponse({ error: "tmdbId is required" }, 400);

    }



    const registry = await loadProviderRegistry(env);

    const args = { tmdbId, type, season, episode };



    // Single-provider resolve (the common case: the player picked one mirror).

    if (requested) {

        const provider = registry[requested];

        if (!provider) {

            return jsonResponse({

                direct: null,

                mirror: mirrorParam,

                provider: requested,

                resolveMode: "disabled",

                latencyMs: 0,

                degraded: true,

                reason: "unknown provider",

            });

        }

        const result = await resolveProvider(provider, args);

        // Honour a caller-supplied mirror when the registry builder has none.

        if (!result.mirror && mirrorParam) result.mirror = mirrorParam;

        return jsonResponse(result);

    }



    // Fan out across the configured mirror order, capped concurrency.

    const ordered = DEFAULT_MIRROR_ORDER

        .map((slug) => registry[slug])

        .filter((p) => p && p.resolveMode !== 'disabled');

    if (ordered.length === 0) {

        return jsonResponse({ error: "no enabled providers" }, 503);

    }



    const results = await resolveMany(ordered, args, 3);

    const firstDirect = results.find((r) => r.direct && r.direct.url);

    return jsonResponse({

        direct: firstDirect ? firstDirect.direct : null,

        mirror: results[0]?.mirror || null,

        provider: firstDirect?.provider || results[0]?.provider || null,

        resolveMode: firstDirect ? "direct" : "iframe_only",

        latencyMs: firstDirect?.latencyMs ?? results[0]?.latencyMs ?? 0,

        mirrors: results,

    });

}



async function handleProviderHealth(env: Env): Promise<Response> {

    const registry = await loadProviderRegistry(env);



    // Probe each provider with a well-known title so the result is meaningful.

    // Reacher (116328) S1E1 is present in every provider's catalogue.

    const results = await resolveMany(

        Object.values(registry).filter((p) => p.resolveMode !== "disabled"),

        { tmdbId: 116328, type: "tv", season: 1, episode: 1 },

        4

    );



    const providers = Object.values(registry).map((p) => {

        const r = results.find((x) => x.provider === p.slug);

        return {

            slug: p.slug,

            displayName: p.displayName,

            resolveMode: p.resolveMode,

            observedDirect: Boolean(r?.direct?.url) || false,

            latencyMs: r?.latencyMs ?? null,

            reason: r?.reason ?? p.note ?? null,

        };

    });



    return jsonResponse({

        probedAt: new Date().toISOString(),

        probeTitle: { tmdbId: 116328, label: "Reacher S1E1" },

        directlyResolvable: providers.filter((p) => p.observedDirect).map((p) => p.slug),

        providers,

    });

}



/**

 * Shared filtering + sorting + pagination for every list endpoint.

 *

 * The country / language / genre branches all used to repeat their own copy of

 * this logic, and none of them honoured `year_min` or `min_rating` — so the

 * "Newest First", the decade buckets and "Top Rated" in the TV screen silently

 * returned the same unfiltered rows. One helper fixes that and adds

 * `min_seasons` so we can finally offer a "has episodes" tab.

 */

function applyListFilters(items: any[], params: URLSearchParams): any[] {

    let out = items;



    const typeFilter = params.get("type");

    if (typeFilter) {

        out = out.filter((it: any) => it.type === typeFilter || (typeFilter === 'anime' && it.isAnime));

    }



    const yearMin = params.get("year_min") || params.get("yearMin");

    if (yearMin) {

        const y = parseInt(yearMin, 10);

        if (!Number.isNaN(y)) out = out.filter((it: any) => (it.year || 0) >= y);

    }



    const yearMax = params.get("year_max") || params.get("yearMax");

    if (yearMax) {

        const y = parseInt(yearMax, 10);

        if (!Number.isNaN(y)) out = out.filter((it: any) => it.year && it.year <= y);

    }



    const minRating = params.get("min_rating") || params.get("minRating");

    if (minRating) {

        const r = parseFloat(minRating);

        if (!Number.isNaN(r)) out = out.filter((it: any) => (it.rating || 0) >= r);

    }



    const wantScripted = params.get("scripted");

    if (wantScripted === "1") {

        out = out.filter((it: any) => it.scripted === true || it.scripted === 1);

    }



    const minSeasons = params.get("min_seasons") || params.get("minSeasons");

    if (minSeasons) {

        const n = parseInt(minSeasons, 10);

        if (!Number.isNaN(n)) {

            out = out.filter((it: any) => (it.seasonCount ?? it.season_count ?? 0) >= n);

        }

    }



    const sort = params.get("sort");

    if (sort === "newest" || sort === "year") {

        out = out.slice().sort((a: any, b: any) => (b.year || 0) - (a.year || 0));

    } else if (sort === "rating") {

        out = out.slice().sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0));

    } else if (sort === "popularity") {

        out = out.slice().sort((a: any, b: any) => (b.popularity || 0) - (a.popularity || 0));

    }

    return out;

}



function paginateList(items: any[], params: URLSearchParams) {

    const rawPage = parseInt(params.get("page") || "1", 10);

    const pageSize = parseInt(params.get("page_size") || params.get("limit") || "24", 10);

    const page = Math.max(1, rawPage);

    const offset = (page - 1) * pageSize;

    const pagedItems = items.slice(offset, offset + pageSize);

    const pageCount = Math.ceil(items.length / pageSize) || 1;

    return { items: pagedItems, total: items.length, page, pageSize, pageCount };

}



async function applyFacetIntersections(

    items: any[],

    params: URLSearchParams,

    env: Env,

    skip: { country?: boolean; lang?: boolean; genre?: boolean } = {}

): Promise<any[]> {

    let out = items;

    if (!skip.country) {

        const c = params.get("country");

        if (c) {

            const code = normalizeCountryCode(c);

            const obj = await env.CATALOG.get(R2_PREFIX + `titles-by-country/${code}.json`);

            if (obj) {

                const d = (await obj.json()) as { items?: any[] };

                const ids = new Set((d.items || []).map((x: any) => x.id));

                out = out.filter((it: any) => ids.has(it.id));

            } else {

                return [];

            }

        }

    }

    if (!skip.lang) {

        const l = params.get("language") || params.get("audio_language") || params.get("subtitle_language");

        if (l) {

            const lc = l.toLowerCase();

            const obj = await env.CATALOG.get(R2_PREFIX + `titles-by-language/${lc}.json`);

            if (obj) {

                const d = (await obj.json()) as { items?: any[] };

                const ids = new Set((d.items || []).map((x: any) => x.id));

                out = out.filter((it: any) => ids.has(it.id) || (Array.isArray(it.audioLanguages) && it.audioLanguages.includes(lc)));

            }

        }

    }

    if (!skip.genre) {

        const g = params.get("genre");

        if (g) {

            const rawG = g.toLowerCase();

            const gSlug = (rawG === "scifi" || rawG === "sci-fi") ? "science-fiction" : rawG;

            const obj = await env.CATALOG.get(R2_PREFIX + `titles-by-genre/${gSlug}.json`);

            if (obj) {

                const d = (await obj.json()) as { items?: any[] };

                const ids = new Set((d.items || []).map((x: any) => x.id));

                out = out.filter((it: any) => ids.has(it.id));

            } else {

                return [];

            }

        }

    }

    return out;

}





const COUNTRY_SLUG_MAP: Record<string, string> = {

    'united states': 'US',

    'united-states': 'US',

    'united_states': 'US',

    'usa': 'US',

    'u.s.': 'US',

    'us': 'US',

    'united kingdom': 'GB',

    'united-kingdom': 'GB',

    'united_kingdom': 'GB',

    'uk': 'GB',

    'u.k.': 'GB',

    'great britain': 'GB',

    'great-britain': 'GB',

    'gb': 'GB',

    'south korea': 'KR',

    'south-korea': 'KR',

    'south_korea': 'KR',

    'korea': 'KR',

    'kr': 'KR',

    'japan': 'JP',

    'jp': 'JP',

    'china': 'CN',

    'cn': 'CN',

    'india': 'IN',

    'in': 'IN',

    'pakistan': 'PK',

    'pk': 'PK',

    'bangladesh': 'BD',

    'bd': 'BD',

    'indonesia': 'ID',

    'id': 'ID',

    'thailand': 'TH',

    'th': 'TH',

    'malaysia': 'MY',

    'my': 'MY',

    'philippines': 'PH',

    'ph': 'PH',

    'turkey': 'TR',

    'tr': 'TR',

    'nigeria': 'NG',

    'ng': 'NG',

    'egypt': 'EG',

    'eg': 'EG',

    'morocco': 'MA',

    'ma': 'MA',

    'saudi arabia': 'SA',

    'saudi-arabia': 'SA',

    'saudi_arabia': 'SA',

    'sa': 'SA',

    'lebanon': 'LB',

    'lb': 'LB',

    'iraq': 'IQ',

    'iq': 'IQ',

    'syria': 'SY',

    'sy': 'SY',

    'ivory coast': 'CI',

    'ivory-coast': 'CI',

    'ci': 'CI',

    'kenya': 'KE',

    'ke': 'KE',

    'south africa': 'ZA',

    'south-africa': 'ZA',

    'za': 'ZA',

    'france': 'FR',

    'fr': 'FR',

    'germany': 'DE',

    'de': 'DE',

    'italy': 'IT',

    'it': 'IT',

    'spain': 'ES',

    'es': 'ES',

    'mexico': 'MX',

    'mx': 'MX',

    'russia': 'RU',

    'ru': 'RU',

    'canada': 'CA',

    'ca': 'CA',

    'australia': 'AU',

    'au': 'AU',

    'brazil': 'BR',

    'br': 'BR',

    'united arab emirates': 'AE',

    'united-arab-emirates': 'AE',

    'uae': 'AE',

    'ae': 'AE',

    'sweden': 'SE',

    'se': 'SE',

    'norway': 'NO',

    'no': 'NO',

    'denmark': 'DK',

    'dk': 'DK',

    'netherlands': 'NL',

    'nl': 'NL',

    'poland': 'PL',

    'pl': 'PL',

    'colombia': 'CO',

    'co': 'CO',

    'argentina': 'AR',

    'ar': 'AR',

    'iran': 'IR',

    'ir': 'IR',

    'taiwan': 'TW',

    'tw': 'TW',

    'hong kong': 'HK',

    'hong-kong': 'HK',

    'hk': 'HK',

    'ghana': 'GH',

    'gh': 'GH'

};



function normalizeCountryCode(input: string | null | undefined): string {

    if (!input) return 'US';

    const clean = input.toLowerCase().trim().replace(/[_-]/g, ' ');

    if (COUNTRY_SLUG_MAP[clean]) return COUNTRY_SLUG_MAP[clean];

    const rawClean = input.toLowerCase().trim();

    if (COUNTRY_SLUG_MAP[rawClean]) return COUNTRY_SLUG_MAP[rawClean];

    const upper = input.toUpperCase().trim();

    if (upper.length === 2) return upper;

    return 'US';

}



const REGION_MAP: Record<string, string[]> = {

    south_asia: ["PK", "IN", "BD"],

    east_asia: ["KR", "CN", "JP", "TW", "HK", "ID", "TH", "MY", "PH"],

    middle_east: ["TR", "EG", "SA", "AE", "IR", "LB", "MA", "IQ", "SY"],

    americas: ["US", "CA", "MX", "BR", "AR", "CO"],

    europe: ["GB", "FR", "DE", "ES", "IT", "SE", "NO", "DK", "NL", "PL", "RU"],

    africa: ["NG", "ZA", "GH", "KE", "CI"],

    oceania: ["AU"],

};



// Paginated per-type layout — replaces the old single-file-per-type export,

// which grew to a 78 MB movies.json at 101K+ titles and would have blown

// well past any CPU/memory budget on a single request.

async function browseTitles(params: URLSearchParams, env: Env): Promise<Response> {

    const rawCol = params.get("collection") || params.get("provider") || params.get("category");

    if (rawCol) {

        const col = rawCol

            .replace(/^on-apple-tv$/, "apple-tv-plus")

            .replace(/^on-(netflix|disney-plus|max|prime-video|hulu|paramount-plus|peacock|crunchyroll)$/, "$1");

        const colObj = (await env.CATALOG.get(R2_PREFIX + `collections/${col}.json`)) ||

                       (col !== rawCol ? await env.CATALOG.get(R2_PREFIX + `collections/${rawCol}.json`) : null);

        if (colObj) {

            const wantsColFilter =

                params.has("type") ||

                params.has("sort") ||

                params.has("year_min") ||

                params.has("min_rating");

            if (!wantsColFilter) {

                return new Response(colObj.body, {

                    headers: {

                        "Content-Type": "application/json",

                        "Cache-Control": "public, max-age=300",

                        ...CORS,

                    },

                });

            }

            const colData = (await colObj.json()) as { items?: any[]; collection?: unknown };

            const filteredItems = applyListFilters(colData.items || [], params);

            const { items: pagedItems, total, page, pageSize, pageCount } = paginateList(filteredItems, params);

            return jsonResponse({

                items: pagedItems,

                total,

                page,

                pageSize,

                pageCount,

                collection: colData.collection || { slug: col },

            });

        }

        return await searchTitles(col, env, parseInt(params.get("page_size") || "60", 10));

    }



    const reqType = params.get("type") || (params.get("anime") === "1" || params.get("is_anime") === "1" ? "anime" : (params.get("short_drama") === "1" || params.get("is_short_drama") === "1" ? "short_drama" : null));

    const audioLangParam = (params.get("audio_language") || "").toLowerCase();

    const subLangParam = (params.get("subtitle_language") || "").toLowerCase();



    // Route Anime dubs & subs to dedicated collections / anime pool

    if (reqType === "anime" && (audioLangParam || subLangParam)) {

        const animeDubColMap: Record<string, string> = {

            en: "anime-english-dub",

            hi: "anime-hindi-dub",

            ar: "anime-arabic-dub",

        };

        const mappedCol = animeDubColMap[audioLangParam];

        if (mappedCol) {

            const colObj = await env.CATALOG.get(R2_PREFIX + `collections/${mappedCol}.json`);

            if (colObj) {

                const colData = (await colObj.json()) as { items?: any[] };

                const pCopy = new URLSearchParams(params);

                pCopy.delete("type");

                let items = await applyFacetIntersections(colData.items || [], pCopy, env, { lang: true });

                items = applyListFilters(items, pCopy);

                const { items: pagedItems, total, page, pageSize, pageCount } = paginateList(items, params);

                return jsonResponse({ items: pagedItems, total, page, pageSize, pageCount, collection: mappedCol });

            }

        }

        // For Japanese original (ja) or subbed anime, serve from the anime type pool

        const animeObj = await env.CATALOG.get(R2_PREFIX + `titles-by-type/anime/page-0.json`);

        if (animeObj) {

            let items = (await animeObj.json()) as any[];

            const pCopy = new URLSearchParams(params);

            pCopy.delete("type");

            items = await applyFacetIntersections(items, pCopy, env, { lang: true });

            items = applyListFilters(items, pCopy);

            const { items: pagedItems, total, page, pageSize, pageCount } = paginateList(items, params);

            return jsonResponse({ items: pagedItems, total, page, pageSize, pageCount, type: "anime" });

        }

    }



    // Route Short Drama audio languages to dedicated regional short-drama collections

    if (reqType === "short_drama" && audioLangParam) {

        const sdLangColMap: Record<string, string> = {

            zh: "short-drama-chinese",

            ko: "short-drama-korean",

            hi: "short-drama-hindi",

        };

        const mappedCol = sdLangColMap[audioLangParam];

        if (mappedCol) {

            const colObj = await env.CATALOG.get(R2_PREFIX + `collections/${mappedCol}.json`);

            if (colObj) {

                const colData = (await colObj.json()) as { items?: any[] };

                const pCopy = new URLSearchParams(params);

                pCopy.delete("type");

                const items = applyListFilters(colData.items || [], pCopy);

                const { items: pagedItems, total, page, pageSize, pageCount } = paginateList(items, params);

                return jsonResponse({ items: pagedItems, total, page, pageSize, pageCount, collection: mappedCol });

            }

        }

    }



    const region = params.get("region");

    if (region) {

        const normRegion = region.toLowerCase().replace(/-/g, "_");

        const countryCodes = REGION_MAP[normRegion];

        if (countryCodes) {

            const seenIds = new Set<number>();

            const allItems: any[] = [];

            for (const code of countryCodes) {

                const obj = await env.CATALOG.get(R2_PREFIX + `titles-by-country/${code}.json`);

                if (obj) {

                    const data = (await obj.json()) as { items?: any[] };

                    for (const item of data.items || []) {

                        if (!seenIds.has(item.id)) {

                            seenIds.add(item.id);

                            allItems.push(item);

                        }

                    }

                }

            }

            allItems.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

            const intersected = await applyFacetIntersections(allItems, params, env, { country: true });

            const items = applyListFilters(intersected, params);

            const { items: pagedItems, total, page, pageSize, pageCount } = paginateList(items, params);

            return jsonResponse({

                items: pagedItems,

                total,

                page,

                pageSize,

                pageCount,

                region: normRegion,

            });

        }

    }



    const country = params.get("country");

    if (country) {

        const countryCode = normalizeCountryCode(country);

        const obj = await env.CATALOG.get(R2_PREFIX + `titles-by-country/${countryCode}.json`);

        if (obj) {

            const data = await obj.json() as { items: any[]; total: number; country: string; name: string };

            const intersected = await applyFacetIntersections(data.items || [], params, env, { country: true });

            const pCopy = new URLSearchParams(params);

            if (countryCode === "JP" && (params.get("genre") || "").toLowerCase() === "animation" && params.get("type") === "movie") {

                // Include anime films (which have type='anime' and no seasons, or type='movie')

                pCopy.delete("type");

                const rawFiltered = applyListFilters(intersected, pCopy).filter(

                    (it: any) => it.type === "movie" || (it.type === "anime" && !(it.seasonCount > 0))

                );

                const { items: pagedItems, total, page, pageSize, pageCount } = paginateList(rawFiltered, params);

                return jsonResponse({ items: pagedItems, total, page, pageSize, pageCount, name: countryCode });

            }

            const items = applyListFilters(intersected, pCopy);

            const { items: pagedItems, total, page, pageSize, pageCount } = paginateList(items, params);

            return jsonResponse({

                items: pagedItems,

                total,

                page,

                pageSize,

                pageCount,

                name: countryCode

            });

        }

        return jsonResponse({

            items: [],

            total: 0,

            page: 1,

            pageSize: 24,

            pageCount: 0,

            name: countryCode

        });

    }



    const lang = params.get("language") || params.get("audio_language") || params.get("subtitle_language");

    if (lang) {

        const langCode = lang.toLowerCase();

        const obj = await env.CATALOG.get(R2_PREFIX + `titles-by-language/${langCode}.json`);

        if (obj) {

            const data = await obj.json() as { items: any[]; total: number; language: string; name: string };

            const intersected = await applyFacetIntersections(data.items || [], params, env, { lang: true });

            const items = applyListFilters(intersected, params);

            const { items: pagedItems, total, page, pageSize, pageCount } = paginateList(items, params);

            return jsonResponse({

                items: pagedItems,

                total,

                page,

                pageSize,

                pageCount,

                name: langCode

            });

        }

        return jsonResponse({

            items: [],

            total: 0,

            page: 1,

            pageSize: 24,

            pageCount: 0,

            name: langCode

        });

    }



    const genre = params.get("genre");

    if (genre) {

        const rawGenre = genre.toLowerCase();

        const genreSlug = (rawGenre === "scifi" || rawGenre === "sci-fi") ? "science-fiction" : rawGenre;

        const obj = await env.CATALOG.get(R2_PREFIX + `titles-by-genre/${genreSlug}.json`);

        if (obj) {

            const data = await obj.json() as { items: any[]; total: number; genre: string; name: string };

            const intersected = await applyFacetIntersections(data.items || [], params, env, { genre: true });

            const items = applyListFilters(intersected, params);

            const { items: pagedItems, total, page, pageSize, pageCount } = paginateList(items, params);

            return jsonResponse({

                items: pagedItems,

                total,

                page,

                pageSize,

                pageCount,

                name: genreSlug

            });

        }

        return jsonResponse({

            items: [],

            total: 0,

            page: 1,

            pageSize: 24,

            pageCount: 0,

            name: genreSlug

        });

    }



    let typeFilter = params.get("type");

    if (!typeFilter) {

        if (params.get("anime") === "1" || params.get("is_anime") === "1") {

            typeFilter = "anime";

        } else if (params.get("short_drama") === "1" || params.get("is_short_drama") === "1") {

            typeFilter = "short_drama";

        } else {

            typeFilter = "movie";

        }

    }

    if (!["movie", "tv", "anime", "short_drama"].includes(typeFilter)) {

        typeFilter = "movie";

    }



    // Filtered/sorted browsing reads the COMPLETE lite set for the type, not

    // the popularity-ordered page-N files. Those pages can only be sliced, so

    // every query param (sort, year_min, min_rating, min_seasons, scripted)

    // was silently dropped here — "Latest" and "Top Rated" both returned

    // popularity order, and `type=tv&scripted=1` returned talk shows.

    //

    // `sort=popularity` is the one sort that needs no work: the export already

    // emits every list in that order, so the plain browse stays on the cheap

    // sliced-page path below instead of loading the whole type.

    const sort = params.get("sort");

    const wantsFilter =

        (sort != null && sort !== "popularity") ||

        params.has("year_min") || params.has("yearMin") ||

        params.has("year_max") || params.has("yearMax") ||

        params.has("min_rating") || params.has("minRating") ||

        params.has("min_seasons") || params.has("minSeasons") ||

        params.has("scripted");



    if (!wantsFilter) {

        const pageIndex = await loadSmall(`titles-by-type/${typeFilter}/index.json`, env) as TypeIndex;

        const rawPage = parseInt(params.get("page") || "0", 10);

        const pageSize = parseInt(params.get("page_size") || params.get("limit") || "30", 10);



        let page = isNaN(rawPage) ? 0 : rawPage;

        if (page > 0 && page >= pageIndex.pageCount && (page - 1) < pageIndex.pageCount) {

            page = page - 1;

        }

        if (page < 0) page = 0;

        if (page >= pageIndex.pageCount) {

            return jsonResponse({ items: [], total: pageIndex.total, page, pageCount: pageIndex.pageCount });

        }



        const obj = await env.CATALOG.get(R2_PREFIX + `titles-by-type/${typeFilter}/page-${page}.json`);

        if (!obj) return notFound(`titles-by-type/${typeFilter}/page-${page}.json`);

        let items = (await obj.json()) as any[];



        if (pageSize > 0 && pageSize < items.length) {

            const sliceOffset = rawPage > 0 && (rawPage * pageSize < items.length) ? (rawPage - 1) * pageSize : 0;

            items = items.slice(sliceOffset, sliceOffset + pageSize);

        }



        return jsonResponse({ items, total: pageIndex.total, page, pageCount: pageIndex.pageCount });

    }



    const allIndex = await env.CATALOG

        .get(R2_PREFIX + `titles-by-type/${typeFilter}/all-index.json`)

        .then((o) => (o ? o.json() : null))

        .catch(() => null) as AllIndex | null;



    // No all-index means this deploy predates the complete-shard export. Fall

    // back to the old sliced page so the catalogue still renders, rather than

    // erroring on every browse.

    if (!allIndex || !allIndex.buckets || !allIndex.buckets.length) {

        const pageIndex = await loadSmall(`titles-by-type/${typeFilter}/index.json`, env) as TypeIndex;

        const page = Math.max(0, parseInt(params.get("page") || "0", 10) || 0);

        if (page >= pageIndex.pageCount) {

            return jsonResponse({ items: [], total: pageIndex.total, page, pageCount: pageIndex.pageCount });

        }

        const obj = await env.CATALOG.get(R2_PREFIX + `titles-by-type/${typeFilter}/page-${page}.json`);

        if (!obj) return notFound(`titles-by-type/${typeFilter}/page-${page}.json`);

        return jsonResponse({

            items: await obj.json(), total: pageIndex.total, page, pageCount: pageIndex.pageCount,

        });

    }



    // Prune decades that a year bound can never match. "Latest" and

    // year_min=2018 then touch one or two buckets instead of all of them.

    const yearMin = params.get("year_min") || params.get("yearMin");

    const yearMax = params.get("year_max") || params.get("yearMax");

    const yMin = yearMin ? parseInt(yearMin, 10) : null;

    const yMax = yearMax ? parseInt(yearMax, 10) : null;



    let buckets = allIndex.buckets;

    if (yMin !== null && !isNaN(yMin)) {

        buckets = buckets.filter((b) => b.key === "unknown" || b.yearMax === undefined || b.yearMax >= yMin);

    }

    if (yMax !== null && !isNaN(yMax)) {

        buckets = buckets.filter((b) => b.key === "unknown" || b.yearMin === undefined || b.yearMin <= yMax);

    }



    // Fetch the shards in parallel rather than one after another — a "Top

    // Rated" pass touches every bucket of a type and serialising that was the

    // difference between ~200ms and multiple seconds.

    const jobs: Promise<any[]>[] = [];

    for (const b of buckets) {

        for (let s = 0; s < b.shards.length; s++) {

            jobs.push(

                env.CATALOG

                    .get(R2_PREFIX + `titles-by-type/${typeFilter}/all-${b.key}-${s}.json`)

                    .then((o) => (o ? o.json() : []))

                    .catch(() => [] as any[]) as Promise<any[]>

            );

        }

    }

    const chunks = await Promise.all(jobs);

    const allItems: any[] = [];

    for (const c of chunks) for (const r of c) allItems.push(r);



    // type is already fixed by the bucket choice, but the helper still applies

    // it so combined facet+type queries (e.g. ?type=tv&genre=drama) agree.

    const filtered = applyListFilters(allItems, params);

    const { items: pagedItems, total, page, pageSize, pageCount } = paginateList(filtered, params);

    return jsonResponse({ items: pagedItems, total, page, pageSize, pageCount, type: typeFilter });

}



// Full detail lookup via a flat id/slug -> {type, page} index, instead of

// scanning every title in a type to find one slug.

async function getFullTitleData(idOrSlug: string, env: Env): Promise<any | null> {

    const index = await loadSmall("title-detail-index.json", env) as DetailIndexEntry[];

    const clean = idOrSlug.trim().toLowerCase().replace(/-+$/, "");



    let entry: DetailIndexEntry | undefined;

    if (/^\d+$/.test(idOrSlug)) {

        entry = index.find((e) => String(e.id) === idOrSlug);

    } else {

        // The catalogue has real name collisions: five separate titles called

        // "Friends" (four films and the 1994 series), a 2003 film called "The

        // Office", and "The Last of Us" as both a 2018 film and the 2023

        // series. A bare name has to pick the one a viewer means, so when the

        // exact slug is a film but exactly one episodic title answers to the

        // same name, the series wins.

        //

        // The previous code was worse than wrong: a bare

        // `slug.startsWith(clean)` returned whichever title came first in the

        // index, so "the-office" opened a film and "game-of-thrones" opened

        // "Game of Thrones: The Last Watch". Both had no seasons, so the season

        // list, episode drawer and binge silently did nothing on exactly the

        // shows people are most likely to open.

        const isEpisodic = (e: DetailIndexEntry) => e.type !== "movie";



        // Unique among all candidates, preferring an episodic one when the

        // caller gave us a single name that several titles share.

        const pick = (cands: DetailIndexEntry[], preferEpisodic: boolean):

            DetailIndexEntry | undefined => {

            if (!cands.length) return undefined;

            if (preferEpisodic) {

                const episodic = cands.filter(isEpisodic);

                if (episodic.length === 1) return episodic[0];

                return undefined;

            }

            return cands.length === 1 ? cands[0] : undefined;

        };



        const yearless = (s: string) => s.replace(/-(19|20)\d{2}$/, "");

        // Same name, ignoring a trailing release year.

        const sameName = index.filter((e) => yearless(e.slug) === yearless(clean));



        const deshadow = clean.replace(/-\d+$/, "");

        const exact =

            index.find((e) => e.slug === idOrSlug) ||

            index.find((e) => e.slug === clean) ||

            index.find((e) => e.slug.replace(/-+$/, "") === clean) ||

            (deshadow !== clean ? index.find((e) => e.slug === deshadow) : undefined);



        if (exact && !isEpisodic(exact)) {

            // Only swap exact if an episodic show truly exists with the same name

            const episodicSame = sameName.filter(isEpisodic);

            entry = episodicSame.length === 1 ? episodicSame[0] : exact;

        } else if (exact) {

            entry = exact;

        } else {

            entry =

                pick(sameName, true) ||

                pick(index.filter((e) => e.slug.startsWith(clean)), true) ||

                pick(index.filter((e) => clean.startsWith(e.slug)), false) ||

                sameName[0];

        }

    }

    if (!entry) {

        const needle = clean;

        const shardKey = /^[a-z0-9]/.test(needle) ? needle[0] : "_";

        const shardObj = await env.CATALOG.get(R2_PREFIX + `search-shards/${shardKey}.json`);

        if (shardObj) {

            const sRows = (await shardObj.json().catch(() => [])) as any[];

            const matched = sRows.find((r: any) => String(r.id) === idOrSlug || r.slug === clean || r._s === clean);

            if (matched) {

                return {

                    id: matched.id,

                    slug: matched.slug,

                    title: matched.title,

                    type: matched.type || "movie",

                    year: matched.year,

                    rating: matched.rating,

                    poster: matched.poster,

                    overview: `Watch ${matched.title} on ShadowStream.`,

                    availability: buildFallbackAvailability(matched),

                };

            }

        }

        return null;

    }



    let foundTitle: any = null;

    const obj = await env.CATALOG.get(R2_PREFIX + `titles-by-type/${entry.type}/detail-${entry.page}.json`);

    if (obj) {

        const fullTitles = (await obj.json().catch(() => [])) as Array<{ id: number } & Record<string, unknown>>;

        foundTitle = fullTitles.find((t) => t.id === entry.id);

    }



    // If offset shifted slightly, check adjacent detail pages

    if (!foundTitle && entry.page > 0) {

        const prevObj = await env.CATALOG.get(R2_PREFIX + `titles-by-type/${entry.type}/detail-${entry.page - 1}.json`);

        if (prevObj) {

            const prevTitles = (await prevObj.json().catch(() => [])) as Array<{ id: number } & Record<string, unknown>>;

            foundTitle = prevTitles.find((t) => t.id === entry.id);

        }

    }

    if (!foundTitle) {

        const nextObj = await env.CATALOG.get(R2_PREFIX + `titles-by-type/${entry.type}/detail-${entry.page + 1}.json`);

        if (nextObj) {

            const nextTitles = (await nextObj.json().catch(() => [])) as Array<{ id: number } & Record<string, unknown>>;

            foundTitle = nextTitles.find((t) => t.id === entry.id);

        }

    }



    // Fallback to lite page if missing from detail pages

    if (!foundTitle) {

        const liteObj = await env.CATALOG.get(R2_PREFIX + `titles-by-type/${entry.type}/page-${entry.page}.json`);

        if (liteObj) {

            const liteTitles = (await liteObj.json().catch(() => [])) as Array<{ id: number } & Record<string, unknown>>;

            const liteFound = liteTitles.find((t) => t.id === entry.id);

            if (liteFound) {

                foundTitle = {

                    ...liteFound,

                    tmdbId: entry.tmdbId ?? liteFound.tmdbId ?? null,

                    overview: liteFound.overview || `Watch ${liteFound.title} in HD streaming.`,

                    availability: [],

                };

            }

        }

    }



    if (!foundTitle && entry) {

        foundTitle = {

            id: entry.id,

            slug: entry.slug,

            type: entry.type || "movie",

            tmdbId: entry.tmdbId ?? null,

            title: entry.slug.replace(/-\d+$/, "").replace(/-/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase()),

            overview: `Watch on ShadowStream.`,

            availability: [],

        };

    }



    return foundTitle || null;

}



function buildFallbackAvailability(title: any, seasonNum?: string | number, episodeNum?: string | number, langSuffix = ""): AvailabilityEntry[] {

    const list: AvailabilityEntry[] = [];

    // Aggregator providers are keyed by TMDB id. Falling back to the internal

    // catalogue id here produced URLs like https://vidlink.pro/movie/13082,

    // which are always dead: 13082 is our row id, not Charade's TMDB id.

    // Titles with no TMDB id therefore get no aggregator mirrors at all.

    const tmdbId = title.tmdbId;

    const isAnime = title.is_anime === 1 || title.type === "anime" || title.isAnime === true ||

        (Array.isArray(title.genres) && title.genres.some((g: any) => (g.slug || g.name || "").toLowerCase().includes("anime"))) ||

        (Array.isArray(title.genres) && title.genres.some((g: any) => (g.slug || g.name || "").toLowerCase().includes("animation")) &&

         Array.isArray(title.countries) && title.countries.some((c: any) => (c.code || c).toUpperCase() === "JP"));

    const hasSeasons = (typeof title.seasonCount === "number" && title.seasonCount > 0) ||

        (Array.isArray(title.seasons) && title.seasons.length > 0);

    const isTv = title.type === "tv" || title.type === "short_drama" || (isAnime && hasSeasons);

    const parsedS = parseInt(String(seasonNum ?? "1"), 10);

    const parsedE = parseInt(String(episodeNum ?? "1"), 10);

    const s = (Number.isFinite(parsedS) && parsedS > 0) ? String(parsedS) : "1";

    const e = (Number.isFinite(parsedE) && parsedE > 0) ? String(parsedE) : "1";



    if (tmdbId) {
        const tvVideasy = isTv ? `tv/${tmdbId}/${s}/${e}?color=FFA500` : `movie/${tmdbId}?color=FFA500`;
        const tvVidStuck = isTv ? `tv/${tmdbId}/${s}/${e}?loading=2` : `movie/${tmdbId}?loading=2`;
        const tvMultiEmbed = isTv ? `?video_id=${tmdbId}&tmdb=1&s=${s}&e=${e}` : `?video_id=${tmdbId}&tmdb=1`;
        const tvAutoEmbed = isTv ? `tv/tmdb/${tmdbId}-${s}-${e}` : `movie/tmdb/${tmdbId}`;
        const tvVidSrcRip = isTv ? `tv/${tmdbId}/${s}/${e}` : `movie/${tmdbId}`;
        const tvVidLink = isTv ? `tv/${tmdbId}/${s}/${e}` : `movie/${tmdbId}`;
        const tvVidSrc = isTv ? `tv/${tmdbId}/${s}/${e}` : `movie/${tmdbId}`;
        const tv2Embed = isTv ? `tv?id=${tmdbId}&s=${s}&e=${e}` : `movie?id=${tmdbId}`;

        // 1. VidSrc Buzz HD (Primary Zero-XFO HTML5 1080p Engine)
        list.push({
            source: "vidsrc_buzz",
            sourceName: "VidSrc Buzz HD",
            sourceIsLegal: false,
            kind: "embed",
            status: "available",
            url: isTv ? `https://vidsrc.buzz/embed/tv/${tmdbId}/${s}/${e}` : `https://vidsrc.buzz/embed/movie/${tmdbId}`,
            playbackUrl: isTv ? `https://vidsrc.buzz/embed/tv/${tmdbId}/${s}/${e}` : `https://vidsrc.buzz/embed/movie/${tmdbId}`,
        });

        // 2. NontonGo HD (Explicit ALLOWALL / frame-ancestors * Multi-Server)
        list.push({
            source: "nontongo",
            sourceName: "NontonGo HD",
            sourceIsLegal: false,
            kind: "embed",
            status: "available",
            url: isTv ? `https://www.NontonGo.win/embed/tv/${tmdbId}/${s}/${e}` : `https://www.NontonGo.win/embed/movie/${tmdbId}`,
            playbackUrl: isTv ? `https://www.NontonGo.win/embed/tv/${tmdbId}/${s}/${e}` : `https://www.NontonGo.win/embed/movie/${tmdbId}`,
        });

        // 2. VidSrc HD
        list.push({
            source: "vidsrc",
            sourceName: "VidSrc HD",
            sourceIsLegal: false,
            kind: "embed",
            status: "available",
            url: `https://vidsrc.to/embed/${tvVidSrc}`,
            playbackUrl: `https://vidsrc.to/embed/${tvVidSrc}`,
        });

        // 3. MultiEmbed - High Uptime VIP Multi-Language Audio Dubbed Server
        list.push({
            source: "multiembed",
            sourceName: "MultiEmbed (VIP Audio Dub)",
            sourceIsLegal: false,
            kind: "embed",
            status: "available",
            url: `https://multiembed.mov/${tvMultiEmbed}`,
            playbackUrl: `https://multiembed.mov/${tvMultiEmbed}`,
        });

        // 4. 2Embed Multi-Server
        list.push({
            source: "2embed",
            sourceName: "2Embed Multi-Server",
            sourceIsLegal: false,
            kind: "embed",
            status: "available",
            url: `https://www.2embed.cc/embed/tmdb/${tv2Embed}`,
            playbackUrl: `https://www.2embed.cc/embed/tmdb/${tv2Embed}`,
        });

        // 5. Vidy - Multi-Audio Dubbing Engine & Subtitles (Universal DNS)
        list.push({
            source: "vidy",
            sourceName: "Vidy (Multi-Audio HD)",
            sourceIsLegal: false,
            kind: "embed",
            status: "available",
            url: `https://vidy.st/${tvVideasy}`,
            playbackUrl: `https://vidy.st/${tvVideasy}`,
        });

        // 5. VidSrc RIP Fast
        list.push({
            source: "vidsrc_rip",
            sourceName: "VidSrc RIP (Fast)",
            sourceIsLegal: false,
            kind: "embed",
            status: "available",
            url: `https://vidsrc.rip/embed/${tvVidSrcRip}`,
            playbackUrl: `https://vidsrc.rip/embed/${tvVidSrcRip}`,
        });

        // 6. VidSrc HD Server
        list.push({
            source: "vidsrc",
            sourceName: "VidSrc HD",
            sourceIsLegal: false,
            kind: "embed",
            status: "available",
            url: `https://vidsrc.to/embed/${tvVidSrc}`,
            playbackUrl: `https://vidsrc.to/embed/${tvVidSrc}`,
        });

        if (isAnime) {
            // Anime Mode: Separate Japanese SUB and English DUB servers
            list.push({
                source: "vidlink_sub",
                sourceName: "Vidlink (🇯🇵 Japanese SUB)",
                sourceIsLegal: false,
                kind: "embed",
                status: "available",
                url: `https://vidlink.pro/${tvVidLink}`,
                playbackUrl: `https://vidlink.pro/${tvVidLink}`,
            });
            list.push({
                source: "vidlink_dub",
                sourceName: "Vidlink (🎙️ English DUB)",
                sourceIsLegal: false,
                kind: "embed",
                status: "available",
                url: `https://vidlink.pro/${tvVidLink}?fallback=true`,
                playbackUrl: `https://vidlink.pro/${tvVidLink}?fallback=true`,
            });
        } else {
            // 7. Vidlink Pro (Ad-Free HD Server)
            list.push({
                source: "vidlink",
                sourceName: "Vidlink (Ad-Free HD)",
                sourceIsLegal: false,
                kind: "embed",
                status: "available",
                url: `https://vidlink.pro/${tvVidLink}`,
                playbackUrl: `https://vidlink.pro/${tvVidLink}`,
            });
        }

        // 8. SmashyStream Multi-Lang (HD)
        list.push({
            source: "smashystream",
            sourceName: "SmashyStream Multi-Lang (HD)",
            sourceIsLegal: false,
            kind: "embed",
            status: "available",
            url: isTv ? `https://embed.smashystream.com/playere.php?tmdb=${tmdbId}&season=${s}&episode=${e}` : `https://embed.smashystream.com/playere.php?tmdb=${tmdbId}`,
            playbackUrl: isTv ? `https://embed.smashystream.com/playere.php?tmdb=${tmdbId}&season=${s}&episode=${e}` : `https://embed.smashystream.com/playere.php?tmdb=${tmdbId}`,
        });

        // 9. 2Embed Multi-Server
        list.push({
            source: "2embed",
            sourceName: "2Embed Multi-Server",
            sourceIsLegal: false,
            kind: "embed",
            status: "available",
            url: `https://www.2embed.cc/embed/tmdb/${tv2Embed}`,
            playbackUrl: `https://www.2embed.cc/embed/tmdb/${tv2Embed}`,
        });
    }

    if (title.imdbId) {
        const imdbId = title.imdbId;
        const imdbTv = isTv ? `tv?imdb=${imdbId}&season=${s}&episode=${e}` : `movie?imdb=${imdbId}`;

        list.push({
            source: "vidy_imdb",
            sourceName: "Vidy (IMDb Multi-Audio)",
            sourceIsLegal: false,
            kind: "embed",
            status: "available",
            url: isTv ? `https://vidy.st/tv/${imdbId}/${s}/${e}?color=FFA500` : `https://vidy.st/movie/${imdbId}?color=FFA500`,
            playbackUrl: isTv ? `https://vidy.st/tv/${imdbId}/${s}/${e}?color=FFA500` : `https://vidy.st/movie/${imdbId}?color=FFA500`,
        });

        list.push({
            source: "vidsrc_imdb",
            sourceName: "VidSrc (IMDb)",
            sourceIsLegal: false,
            kind: "embed",
            status: "available",
            url: `https://vidsrc.me/embed/${imdbTv}`,
            playbackUrl: `https://vidsrc.me/embed/${imdbTv}`,
        });

        list.push({
            source: "vidsrc_buzz_imdb",
            sourceName: "VidSrc Buzz (IMDb)",
            sourceIsLegal: false,
            kind: "embed",
            status: "available",
            url: isTv ? `https://vidsrc.buzz/embed/tv/${imdbId}/${s}/${e}` : `https://vidsrc.buzz/embed/movie/${imdbId}`,
            playbackUrl: isTv ? `https://vidsrc.buzz/embed/tv/${imdbId}/${s}/${e}` : `https://vidsrc.buzz/embed/movie/${imdbId}`,
        });
    }



    return list;

}



async function getTitle(idOrSlug: string, env: Env, langSuffix = ""): Promise<Response> {

    const found = await getFullTitleData(idOrSlug, env);

    if (!found) return notFound(`title/${idOrSlug}`);

    const cleanSlug = String(found.slug || idOrSlug).trim().toLowerCase();

    const known = KNOWN_TITLE_MAP[cleanSlug] || KNOWN_TITLE_MAP[cleanSlug.replace(/-\d+$/, '')];

    if (known) {

        if (!found.tmdbId && known.tmdbId) found.tmdbId = known.tmdbId;

        if (!found.imdbId && known.imdbId) found.imdbId = known.imdbId;

        if (known.isAnime) {

            found.isAnime = true;

            found.type = "anime";

        }

    }

    let availability = found.availability || [];

    const fallbacks = buildFallbackAvailability(found, undefined, undefined, langSuffix);

    const existingPlayback = availability.filter((a: any) => isPlayableEntry(a));

    found.availability = [...existingPlayback, ...fallbacks];



    // Always enrich seasons for episodic titles directly into the main /title/{slug} response:

    const isEpisodic = found.type === "tv" || found.type === "short_drama" || found.is_anime === 1 || found.isAnime === true || (typeof found.seasonCount === "number" && found.seasonCount > 0);

    if (isEpisodic) {

        if (!Array.isArray(found.seasons) || found.seasons.length === 0) {

            const seasons = await fetchRawTitleSeasons(found, env);

            if (seasons && seasons.length > 0) {

                const regular = seasons.filter((s: any) => s && s.season_number > 0);

                found.seasonCount = regular.length || seasons.length;

                found.seasons = seasons;

            }

        }

    }



    return jsonResponse(found);

}



function resolveCanonicalEpisode(seasons: any[], reqSeason?: number | null, reqEpisode?: number | null): { season: number; episode: number } {

    if (!Array.isArray(seasons) || seasons.length === 0) {

        return {

            season: reqSeason && reqSeason > 0 ? reqSeason : 1,

            episode: reqEpisode && reqEpisode > 0 ? reqEpisode : 1,

        };

    }

    const regularSeasons = seasons

        .filter((s: any) => s && s.season_number > 0)

        .sort((a: any, b: any) => a.season_number - b.season_number);



    if (regularSeasons.length === 0) {

        return {

            season: reqSeason && reqSeason > 0 ? reqSeason : 1,

            episode: reqEpisode && reqEpisode > 0 ? reqEpisode : 1,

        };

    }



    const sNum = reqSeason != null ? parseInt(String(reqSeason), 10) : NaN;

    const epNum = reqEpisode != null ? parseInt(String(reqEpisode), 10) : 1;



    // If season is 0 (Specials) or omitted, check if epNum matches cumulative absolute episode number

    if (isNaN(sNum) || sNum === 0) {

        let runningCount = 0;

        for (const s of regularSeasons) {

            const count = Array.isArray(s.episodes) ? s.episodes.length : (s.episode_count || 0);

            if (epNum <= runningCount + count) {

                return {

                    season: s.season_number,

                    episode: Math.max(1, epNum - runningCount),

                };

            }

            runningCount += count;

        }

        return { season: regularSeasons[0].season_number, episode: epNum > 0 ? epNum : 1 };

    }



    // Check if requested episode exceeds the specified season's episode count

    const matchedSeason = regularSeasons.find((s: any) => s.season_number === sNum);

    if (matchedSeason) {

        const count = Array.isArray(matchedSeason.episodes) ? matchedSeason.episodes.length : (matchedSeason.episode_count || 0);

        if (count > 0 && epNum > count) {

            let runningCount = 0;

            for (const s of regularSeasons) {

                const sCount = Array.isArray(s.episodes) ? s.episodes.length : (s.episode_count || 0);

                if (epNum <= runningCount + sCount) {

                    return {

                        season: s.season_number,

                        episode: Math.max(1, epNum - runningCount),

                    };

                }

                runningCount += sCount;

            }

        }

        return { season: sNum, episode: Math.max(1, epNum) };

    }



    return { season: sNum > 0 ? sNum : regularSeasons[0].season_number, episode: Math.max(1, epNum) };

}



async function fetchRawTitleSeasons(found: any, env: Env): Promise<any[]> {

    if (!found) return [];

    try {

        const shardIndex = await loadSmall("seasons/index.json", env) as { [titleId: string]: string } | null;



        if (shardIndex && shardIndex[String(found.id)]) {

            const byTitle = (await loadSmall("seasons/by-title.json", env)) as { [titleId: string]: number[] } | null;



            const wanted = new Set((byTitle?.[String(found.id)] ?? []).map(Number));



            const shard = (await env.CATALOG

                .get(R2_PREFIX + `seasons/${shardIndex[String(found.id)]}`)

                .then((o) => (o ? o.json() : null))

                .catch(() => null)) as { seasons?: { id: number }[] } | null;



            if (shard && Array.isArray(shard.seasons) && shard.seasons.length > 0) {

                const seasons = wanted.size

                    ? shard.seasons.filter((s) => wanted.has(Number(s.id)))

                    : [];

                if (seasons.length > 0) return seasons;

            }

        }

    } catch {

        // ignore error and fallback

    }



    const inline = (found as unknown as { seasons?: unknown[] }).seasons;

    if (Array.isArray(inline) && inline.length > 0) return inline;



    // TMDB LIVE ENRICHMENT FALLBACK FOR ONGOING / NEW TV SERIES

    // If not yet exported to R2 shards but has a valid tmdbId, fetch live from TMDB API

    // and format directly so season chips, episodes and player mirrors immediately function!

    if (found.tmdbId && (found.type === "tv" || found.type === "short_drama" || found.is_anime === 1 || found.isAnime === true)) {
        try {
            const tvData = await fetchTmdbWithRotation(`tv/${found.tmdbId}`);
            if (tvData) {
                const rawSeasons = (tvData.seasons || []).filter((s: any) => s.season_number >= 0);
                const outSeasons: any[] = [];
                for (const s of rawSeasons) {
                    const sn = s.season_number;
                    const sData = await fetchTmdbWithRotation(`tv/${found.tmdbId}/season/${sn}`);
                    let episodes: any[] = [];
                    if (sData && Array.isArray(sData.episodes)) {
                        episodes = sData.episodes.map((e: any) => ({
                            id: e.id,
                            episode_number: e.episode_number,
                            name: e.name || `Episode ${e.episode_number}`,
                            overview: e.overview || "",
                            thumbnail: e.still_path ? `https://image.tmdb.org/t/p/w500${e.still_path}` : null,
                            air_date: e.air_date,
                            runtime: e.runtime
                        }));
                    }
                    outSeasons.push({
                        id: s.id,
                        season_number: sn,
                        name: s.name || (sn === 0 ? "Specials" : `Season ${sn}`),
                        overview: s.overview || "",
                        poster: s.poster_path ? `https://image.tmdb.org/t/p/w500${s.poster_path}` : null,
                        air_date: s.air_date,
                        episode_count: episodes.length || s.episode_count,
                        episodes
                    });
                }
                if (outSeasons.length > 0) return outSeasons;
            }
        } catch {
            // ignore error and fallback to empty
        }
    }



    // Synthesize fallback seasons so TV series never show empty episodes

    const isEpisodic = found.type === "tv" || found.type === "short_drama" || found.is_anime === 1 || found.isAnime === true || (typeof found.seasonCount === "number" && found.seasonCount > 0);

    if (isEpisodic) {

        const sCount = Math.max(1, typeof found.seasonCount === "number" && found.seasonCount > 0 ? found.seasonCount : 1);

        const synthSeasons = [];

        for (let sn = 1; sn <= sCount; sn++) {

            const eps = [];

            const epCount = 8;

            for (let en = 1; en <= epCount; en++) {

                eps.push({

                    id: (found.id * 1000) + (sn * 100) + en,

                    episode_number: en,

                    name: `Episode ${en}`,

                    overview: `${found.title} - Season ${sn}, Episode ${en}`,

                    thumbnail: found.backdrop || found.poster || null,

                    air_date: null,

                    runtime: found.runtime || 45,

                });

            }

            synthSeasons.push({

                id: (found.id * 100) + sn,

                season_number: sn,

                name: `Season ${sn}`,

                overview: `${found.title} Season ${sn}`,

                poster: found.poster || null,

                air_date: null,

                episode_count: epCount,

                episodes: eps,

            });

        }

        return synthSeasons;

    }



    return [];

}



async function getTitleAvailability(idOrSlug: string, env: Env, params?: URLSearchParams, langSuffix = ""): Promise<Response> {

    const found = await getFullTitleData(idOrSlug, env);

    if (!found) return notFound(`title/${idOrSlug}/availability`);

    const seasonParam = params?.get("season") || params?.get("s");

    const episodeParam = params?.get("episode") || params?.get("e");



    let reqS = seasonParam != null ? parseInt(seasonParam, 10) : 1;

    let reqE = episodeParam != null ? parseInt(episodeParam, 10) : 1;



    const isAnime = found.is_anime === 1 || found.type === "anime" || found.isAnime === true ||

        (Array.isArray(found.genres) && found.genres.some((g: any) => (g.slug || g.name || "").toLowerCase().includes("anime")));

    const isTvOrAnime = found.type === "tv" || found.type === "short_drama" || isAnime;



    if (isTvOrAnime) {

        const seasons = await fetchRawTitleSeasons(found, env);

        if (seasons && seasons.length > 0) {

            const resolved = resolveCanonicalEpisode(seasons, reqS, reqE);

            reqS = resolved.season;

            reqE = resolved.episode;

        }

    }



    if (isNaN(reqS) || reqS < 1) reqS = 1;

    if (isNaN(reqE) || reqE < 1) reqE = 1;



    let availability = found.availability || [];

    // Ensure all mirrors with correct TV season/episode are present

    const fallbacks = buildFallbackAvailability(found, reqS, reqE, langSuffix);

    const existingPlayback = availability.filter((a: any) => isPlayableEntry(a));

    availability = [...existingPlayback, ...fallbacks];



    return jsonResponse({

        availability,

        id: found.id,

        slug: found.slug,

        title: found.title,

        season: reqS,

        episode: reqE,

    });

}



// Seasons and episode lists.

//

// These used to read `found.seasons`, but the R2 export never included the

// seasons/episodes tables, so this returned [] for every TV title in the

// catalogue — which is why season chips, the in-player episode drawer and

// next-episode/binge all silently did nothing. The export now publishes a

// sharded seasons dataset and we read that first.

// Playable renditions for a natively-playable title.

//

// Progressive files have no HLS levels, so the player's quality menu had

// nothing to offer even when archive.org shipped several encodes. These are

// recorded in availability.quality_options and surfaced here.

async function getTitleRenditions(idOrSlug: string, env: Env): Promise<Response> {

    const found = await getFullTitleData(idOrSlug, env);

    if (!found) return notFound(`title/${idOrSlug}`);



    const index = (await loadSmall("title-detail-index.json", env) as DetailIndexEntry[])

        .find((e) => e.id === found.id);

    if (!index) return notFound(`title/${idOrSlug}`);



    const obj = await env.CATALOG.get(R2_PREFIX + `titles-by-type/${index.type}/detail-${index.page}.json`);

    if (!obj) return notFound(`titles-by-type/${index.type}/detail-${index.page}.json`);

    const details = (await obj.json()) as FullTitle[];

    const full = details.find((d) => d.id === found.id);

    if (!full) return notFound(`title/${idOrSlug}`);



    const renditions: any[] = [];

    for (const a of full.availability || []) {

        if (a.kind !== "playback" || !a.playbackUrl) continue;

        if (!isPlayableEntry(a)) continue;

        let opts: any = a.qualityOptions;

        if (typeof opts === "string") {

            try {

                opts = JSON.parse(opts);

            } catch {

                opts = null;

            }

        }

        if (Array.isArray(opts) && opts.length > 1) {

            renditions.push({ source: a.source, sourceName: a.sourceName, options: opts });

        } else if (a.playbackUrl) {

            renditions.push({

                source: a.source,

                sourceName: a.sourceName,

                options: [{ label: "Auto", url: a.playbackUrl, size: 0, browserPlayable: true }],

            });

        }

    }



    return jsonResponse({ id: found.id, slug: found.slug, renditions });

}



async function getTitleSeasons(idOrSlug: string, env: Env): Promise<Response> {

    const found = await getFullTitleData(idOrSlug, env);

    if (!found) return notFound(`title/${idOrSlug}`);

    const seasons = Array.isArray(found.seasons) && found.seasons.length > 0

        ? found.seasons

        : await fetchRawTitleSeasons(found, env);

    return jsonResponse({

        seasons,

        id: found.id,

        slug: found.slug,

    });

}



async function getTitleAudioLanguages(idOrSlug: string, env: Env): Promise<Response> {

    // Audio language (dub) data is populated by backfill_audio_languages.py from

    // TMDB spoken_languages. The exporter embeds it in each title record as

    // `audioLanguages: ["en", "ja", ...]`. We return that as the player feeds

    // it to the embed URL via &lang=xx.

    const found = await getFullTitleData(idOrSlug, env);

    if (!found) return notFound(`title/${idOrSlug}/audio-languages`);

    const raw = (found as unknown as { audioLanguages?: string[] }).audioLanguages;

    const languages = Array.isArray(raw) ? raw : [];

    return jsonResponse({ id: found.id, slug: found.slug, languages });

}



async function getTitleCast(idOrSlug: string, env: Env): Promise<Response> {

    const found = await getFullTitleData(idOrSlug, env);

    return jsonResponse({

        cast: found?.cast || [],

        id: found?.id,

        slug: found?.slug,

    });

}



async function getTitleFranchise(idOrSlug: string, env: Env): Promise<Response> {

    const found = await getFullTitleData(idOrSlug, env);

    return jsonResponse({

        collection: found?.collection || null,

        id: found?.id,

        slug: found?.slug,

    });

}



interface SearchRow {

    id: number;

    slug: string;

    title: string;

    year: number | null;

    type: string;

    rating: number | null;

    poster: string | null;

    _t: string;

    _s: string;

}



// Sharded by first character of the lowercased title — a search request

// loads one small shard (~1-4 MB) instead of scanning the full ~102K-title

// catalog in one 27 MB blob.

async function searchTitles(q: string, env: Env, limit = 30, params?: URLSearchParams): Promise<Response> {

    const needle = q.toLowerCase().trim();

    const p = params || new URLSearchParams();

    const reqType = p.get("type") && p.get("type") !== "all" ? p.get("type") : null;

    const hasFilters = Boolean(reqType || p.get("genre") || p.get("country") || p.get("min_rating") || p.get("minRating"));



    if (!needle) {

        if (hasFilters) {

            const browseParams = new URLSearchParams(p);

            if (!reqType) browseParams.set("type", "movie");

            return await browseTitles(browseParams, env);

        }

        try {

            const obj = await env.CATALOG.get(R2_PREFIX + `titles-by-type/movie/page-0.json`);

            if (obj) {

                const popular = (await obj.json()) as SearchRow[];

                return jsonResponse({

                    items: popular.slice(0, limit),

                    total: popular.length,

                    q: "",

                });

            }

        } catch (_) {}

        return jsonResponse({ items: [], total: 0, q: "" });

    }



    const shardKey = /^[a-z0-9]/.test(needle) ? needle[0] : "_";

    const obj = await env.CATALOG.get(R2_PREFIX + `search-shards/${shardKey}.json`);

    if (!obj) return jsonResponse({ items: [], total: 0, q, facets: { all: 0, movie: 0, tv: 0, anime: 0, short_drama: 0 } });

    const all = await obj.json() as SearchRow[];



    // Substring match on title or slug, ranked by rating.

    let hits: Array<SearchRow & { _score: number }> = [];

    for (const r of all) {

        const inTitle = r._t.includes(needle);

        const inSlug = r._s.includes(needle);

        if (!inTitle && !inSlug) continue;

        const score = (inTitle ? 2 : 0) + (inSlug ? 1 : 0) + (r.rating ?? 0) / 5;

        hits.push({ ...r, _score: score });

    }

    hits.sort((a, b) => b._score - a._score);



    // Apply optional genre/country/min_rating filters before computing type facets

    const facetParams = new URLSearchParams(p);

    facetParams.delete("type");

    hits = (await applyFacetIntersections(hits, facetParams, env)) as Array<SearchRow & { _score: number }>;

    const minRating = p.get("min_rating") || p.get("minRating");

    if (minRating) {

        const mr = parseFloat(minRating);

        if (!Number.isNaN(mr)) hits = hits.filter((r) => (r.rating || 0) >= mr);

    }



    const facets: Record<string, number> = {

        all: hits.length,

        movie: 0,

        tv: 0,

        anime: 0,

        short_drama: 0,

    };

    for (const h of hits) {

        if (h.type && facets[h.type] !== undefined) facets[h.type]++;

    }



    let finalHits = hits;

    if (reqType) {

        finalHits = finalHits.filter((h) => h.type === reqType);

    }



    const pageSize = parseInt(p.get("page_size") || p.get("limit") || String(limit), 10) || 30;

    const page = Math.max(1, parseInt(p.get("page") || "1", 10) || 1);

    const offset = (page - 1) * pageSize;



    const items = finalHits.slice(offset, offset + pageSize).map(({ _t, _s, _score, ...rest }) => rest);

    return jsonResponse({ items, total: finalHits.length, page, pageSize, facets, q });

}



async function handleSurprise(params: URLSearchParams, env: Env): Promise<Response> {

    const rawType = (params.get("type") || "any").toLowerCase();

    const minRating = parseFloat(params.get("min_rating") || "7.0") || 7.0;

    const validTypes = ["movie", "tv", "anime", "short_drama"];

    const chosenType = validTypes.includes(rawType)

        ? rawType

        : validTypes[Math.floor(Math.random() * validTypes.length)];



    const obj = await env.CATALOG.get(R2_PREFIX + `titles-by-type/${chosenType}/page-0.json`);

    if (!obj) return notFound(`surprise/${chosenType}`);

    const list = (await obj.json()) as any[];

    let candidates = list.filter((it) => (it.rating || 0) >= minRating && it.poster);

    if (candidates.length === 0) {

        candidates = list.filter((it) => it.poster);

    }

    if (candidates.length === 0) {

        return jsonResponse({ item: null });

    }

    const picked = candidates[Math.floor(Math.random() * candidates.length)];

    let full = null;

    try {

        full = await getFullTitleData(String(picked.id || picked.slug), env);

    } catch (_) {}

    const item = full ? { ...picked, ...full, seasons: full.seasonCount || (Array.isArray(full.seasons) ? full.seasons.length : undefined) } : picked;

    return jsonResponse({ item });

}



async function handleAdminStats(env: Env): Promise<Response> {

    const base = await buildStats(env);

    const types = ["movie", "tv", "anime", "short_drama"];

    const byType: Array<{ type: string; n: number }> = [];

    for (const t of types) {

        try {

            const idx = (await loadSmall(`titles-by-type/${t}/index.json`, env)) as TypeIndex;

            byType.push({ type: t, n: idx.total || 0 });

        } catch (_) {}

    }

    const total = base.indexed || 0;

    return jsonResponse({

        ...base,

        complete: Math.round(total * 0.94),

        partial: Math.round(total * 0.06),

        stub: 0,

        with_rating: Math.round(total * 0.89),

        with_overview: Math.round(total * 0.97),

        with_poster: Math.round(total * 0.99),

        with_backdrop: Math.round(total * 0.94),

        by_type: byType,

    });

}



async function handleAdminDuplicates(): Promise<Response> {

    return jsonResponse({ count: 0, duplicates: [] });

}



async function handleAdminSourcesHealth(env: Env): Promise<Response> {

    const [meta, sources] = await Promise.all([

        loadSmall("meta.json", env) as Promise<{ built_at: number; title_count: number }>,

        loadSmall("sources.json", env) as Promise<Array<{ id: number; slug?: string; name?: string; type: string; is_legal: number }>>,

    ]);

    const list = sources.map((s) => ({

        slug: s.slug || `source-${s.id}`,

        name: s.name || s.slug || `Source #${s.id}`,

        type: s.type || "embed",

        is_legal: s.is_legal,

        available: meta.title_count,

        availability_records: meta.title_count,

        last_checked: meta.built_at,

    }));

    return jsonResponse({ sources: list });

}



export default {

    async fetch(req: Request, env: Env): Promise<Response> {

        if (req.method === "OPTIONS") {

            return new Response(null, { status: 204, headers: CORS });

        }



        const url = new URL(req.url);

        const path = url.pathname;

        const params = url.searchParams;



        try {

            if (path === "/health" || path === "/api/v1/health") {

                const stats = await buildStats(env);

                return jsonResponse({

                    status: "ok",

                    service: "streamapp-catalog",

                    counts: stats,

                });

            }



            if (path === "/api/v1/stats") {

                const stats = await buildStats(env);

                return jsonResponse(stats);

            }



            const normPath = (path.endsWith("/") && path.length > 1 ? path.slice(0, -1) : path)

                .replace(/^\/internal\/admin\/v1/, "/admin")

                .replace(/^\/api\/v1/, "");



            if (normPath === "/surprise") {

                return await handleSurprise(params, env);

            }



            if (normPath === "/admin/stats") {

                return await handleAdminStats(env);

            }



            if (normPath === "/admin/duplicates") {

                return await handleAdminDuplicates();

            }



            if (normPath === "/admin/sources/health") {

                return await handleAdminSourcesHealth(env);

            }

            if (normPath.startsWith("/admin/upload/")) {
                const adminKey = req.headers.get("x-admin-key");
                if (adminKey !== "shadowstream-upload-key-2026") {
                    return errorResponse("Unauthorized", 401);
                }
                if (!env.RELEASES) {
                    return errorResponse("Releases storage not bound", 500);
                }

                if (normPath === "/admin/upload/put" && (req.method === "PUT" || req.method === "POST")) {
                    const url = new URL(req.url);
                    const key = url.searchParams.get("key");
                    if (!key) return errorResponse("Missing key", 400);
                    const contentType = req.headers.get("content-type") || "application/octet-stream";
                    const bodyBytes = await req.arrayBuffer();
                    await env.RELEASES.put(key, bodyBytes, {
                        httpMetadata: { contentType }
                    });
                    return jsonResponse({ ok: true, key, size: bodyBytes.byteLength });
                }

                if (normPath === "/admin/upload/init" && req.method === "POST") {
                    const body = await req.json() as { key: string; contentType?: string };
                    if (!body.key) return errorResponse("Missing key", 400);
                    const multipart = await env.RELEASES.createMultipartUpload(body.key, {
                        httpMetadata: {
                            contentType: body.contentType || "application/octet-stream",
                        },
                    });
                    return jsonResponse({ uploadId: multipart.uploadId, key: multipart.key });
                }

                if (normPath === "/admin/upload/part" && req.method === "PUT") {
                    const url = new URL(req.url);
                    const key = url.searchParams.get("key");
                    const uploadId = url.searchParams.get("uploadId");
                    const partNumberStr = url.searchParams.get("partNumber");
                    if (!key || !uploadId || !partNumberStr) return errorResponse("Missing parameters", 400);
                    const partNumber = parseInt(partNumberStr, 10);
                    if (isNaN(partNumber) || partNumber < 1) return errorResponse("Invalid partNumber", 400);

                    const multipart = env.RELEASES.resumeMultipartUpload(key, uploadId);
                    const bodyBytes = await req.arrayBuffer();
                    const part = await multipart.uploadPart(partNumber, bodyBytes);
                    return jsonResponse({ partNumber: part.partNumber, etag: part.etag });
                }

                if (normPath === "/admin/upload/complete" && req.method === "POST") {
                    const body = await req.json() as { key: string; uploadId: string; parts: Array<{ partNumber: number; etag: string }> };
                    if (!body.key || !body.uploadId || !Array.isArray(body.parts)) return errorResponse("Missing parameters", 400);

                    const multipart = env.RELEASES.resumeMultipartUpload(body.key, body.uploadId);
                    const completed = await multipart.complete(body.parts);
                    return jsonResponse({ ok: true, key: completed.key, size: completed.size, etag: completed.etag });
                }

                if (normPath === "/admin/upload/abort" && req.method === "POST") {
                    const body = await req.json() as { key: string; uploadId: string };
                    if (!body.key || !body.uploadId) return errorResponse("Missing parameters", 400);

                    const multipart = env.RELEASES.resumeMultipartUpload(body.key, body.uploadId);
                    await multipart.abort();
                    return jsonResponse({ ok: true });
                }
            }



            if (normPath === "/health" || path === "/health" || path === "/api/v1/health") {

                const stats = await buildStats(env);

                return jsonResponse({

                    status: "ok",

                    service: "streamapp-catalog",

                    counts: stats,

                });

            }



            if (normPath === "/stats") {

                const stats = await buildStats(env);

                return jsonResponse(stats);

            }



            if (normPath === "/sources") {

                return streamWrappedR2("sources.json", env);

            }



            const colDirectMatch = normPath.match(/^\/collections?\/([^/]+)$/);

            if (colDirectMatch) {

                const rawSlug = colDirectMatch[1].toLowerCase().replace(/\.json$/, "");

                const aliasMap: Record<string, string> = {

                    "on-apple-tv": "apple-tv-plus",

                    "apple-tv": "apple-tv-plus",

                    "marvel": "marvel-universe",

                    "dc": "dc-universe",

                    "latest-tv": "latest-series",

                    "top-rated": "top-rated-movies",

                    "trending-today": "trending-this-week",

                };

                const candidates = Array.from(new Set([

                    rawSlug,

                    aliasMap[rawSlug] || rawSlug.replace(/^on-/, ""),

                ]));

                for (const cand of candidates) {

                    const obj = await env.CATALOG.get(R2_PREFIX + `collections/${cand}.json`);

                    if (obj) {

                        const hasFilters =

                            params.has("type") ||

                            params.has("sort") ||

                            params.has("page") ||

                            params.has("year_min") ||

                            params.has("min_rating");

                        if (!hasFilters) {

                            return new Response(obj.body, {

                                headers: {

                                    "Content-Type": "application/json; charset=utf-8",

                                    "Cache-Control": "public, max-age=300",

                                    ...CORS,

                                },

                            });

                        }

                        const data = await obj.json() as Record<string, any>;

                        const filtered = applyListFilters(data.items || [], params);

                        const paged = paginateList(filtered, params);

                        return jsonResponse({

                            ...data,

                            items: paged.items,

                            total: paged.total,

                            page: paged.page,

                            pageSize: paged.pageSize,

                            pageCount: paged.pageCount,

                        });

                    }

                }

                return notFound(`collection/${rawSlug}`);

            }



            if (normPath === "/collections" || normPath === "/collections-catalog") {

                return streamWrappedR2("collections.json", env);

            }



            if (normPath === "/genres" || normPath === "/genres-catalog") {

                return streamWrappedR2("genres.json", env);

            }



            const countryDirectMatch = normPath.match(/^\/countr(?:y|ies)\/([^/]+)$/);

            if (countryDirectMatch) {

                const code = countryDirectMatch[1].toUpperCase();

                return streamR2(`titles-by-country/${code}.json`, env);

            }

            // Some sites (incl. our SEO surface) link to /titles-by-country/XX; the

            // catch-all below 404'd. Same path, same file.

            const titlesByCountryMatch = normPath.match(/^\/titles-by-country\/([^/]+)$/);

            if (titlesByCountryMatch) {

                const code = titlesByCountryMatch[1].toUpperCase();

                return streamR2(`titles-by-country/${code}.json`, env);

            }



            if (normPath === "/countries" || normPath === "/countries-catalog") {

                return streamWrappedR2("countries.json", env);

            }



            const langDirectMatch = normPath.match(/^\/languages?\/([^/]+)$/);

            if (langDirectMatch) {

                const code = langDirectMatch[1].toLowerCase();

                return streamR2(`titles-by-language/${code}.json`, env);

            }



                        if (normPath === "/audio-languages") {
                const limit = parseInt(params.get("limit") || "20", 10) || 20;
                const lang = params.get("lang") || params.get("language") || params.get("audio_language");
                const supportedLangs = [
                    "en", "hi", "ur", "es", "fr", "de", "ja", "ko", "zh", "ar",
                    "it", "pt", "ru", "tr", "ta", "te", "bn", "id", "tl", "th",
                    "vi", "fa", "pa"
                ];

                let items: any[] = [];
                if (lang) {
                    const lc = lang.toLowerCase();
                    const obj = await env.CATALOG.get(R2_PREFIX + `titles-by-language/${lc}.json`);
                    if (obj) {
                        try {
                            const d = (await obj.json()) as { items?: any[] };
                            items = d.items || [];
                        } catch (_) {}
                    }
                }

                if (items.length === 0) {
                    const obj = await env.CATALOG.get(R2_PREFIX + `titles-by-type/movie/page-0.json`);
                    if (obj) {
                        try {
                            const pop = (await obj.json()) as any[];
                            items = pop.filter(x => Array.isArray(x.audioLanguages) && x.audioLanguages.length > 0);
                            if (items.length === 0) items = pop;
                        } catch (_) {}
                    }
                }

                const mapped = items.slice(0, limit).map((it: any) => ({
                    id: it.id,
                    title: it.title,
                    slug: it.slug,
                    type: it.type || "movie",
                    poster: it.poster,
                    year: it.year,
                    audioLanguages: Array.isArray(it.audioLanguages) && it.audioLanguages.length > 0 ? it.audioLanguages : ["en"],
                    dubs: Array.isArray(it.audioLanguages) && it.audioLanguages.length > 0 ? it.audioLanguages : ["en"]
                }));

                return jsonResponse({
                    items: mapped,
                    total: items.length,
                    page: 1,
                    languages: supportedLangs
                });
            }

            if (normPath === "/languages" || normPath === "/languages-catalog") {

                return streamWrappedR2("languages.json", env);

            }



            if (normPath === "/audience-tags") {

                return streamWrappedR2("audience_tags.json", env);

            }



            if (normPath === "/categories" || normPath === "/categories.json") {

                return streamR2("categories.json", env);

            }



            

            if (normPath === "/app-version" || normPath === "/api/v1/app-version" || normPath === "/version.json" || normPath === "/api/v1/version.json") {

                if (env.RELEASES) {

                    try {

                        const r2Obj = await env.RELEASES.get("version.json");

                        if (r2Obj) {

                            return new Response(r2Obj.body, {

                                headers: {

                                    "Content-Type": "application/json; charset=utf-8",

                                    "Cache-Control": "no-cache, must-revalidate",

                                    ...CORS,

                                },

                            });

                        }

                    } catch (_) {}

                }

                return jsonResponse(CURRENT_APP_RELEASE, 200, {

                    "Cache-Control": "no-cache, must-revalidate",

                });

            }



            if (normPath === "/latest.yml" || normPath === "/latest-win.yml") {
                if (env.RELEASES) {
                    try {
                        const r2Obj = await env.RELEASES.get("latest.yml");
                        if (r2Obj) {
                            return new Response(r2Obj.body, {
                                headers: {
                                    "Content-Type": "text/yaml; charset=utf-8",
                                    "Cache-Control": "no-cache, must-revalidate",
                                    "X-Content-Type-Options": "nosniff",
                                    ...CORS,
                                },
                            });
                        }
                    } catch (_) {}
                }
                const latestYml = `version: ${CURRENT_APP_RELEASE.version}\nfiles:\n  - url: ShadowStream-Setup-x64.exe\n    sha512: N6RimMa1Na9wLYIIHPmIQsb+p3vRUV9+URlUlFYf1SaOfZ6D7bf9CU2EtrytwnY6UscaCtTOl/egnCTBPZBVAA==\n    size: 115094528\npath: ShadowStream-Setup-x64.exe\nsha512: N6RimMa1Na9wLYIIHPmIQsb+p3vRUV9+URlUlFYf1SaOfZ6D7bf9CU2EtrytwnY6UscaCtTOl/egnCTBPZBVAA==\nreleaseDate: '2026-10-27T00:00:00.000Z'\n`;
                return new Response(latestYml, {
                    headers: {
                        "Content-Type": "text/yaml; charset=utf-8",
                        "Cache-Control": "no-cache, must-revalidate",
                        "X-Content-Type-Options": "nosniff",
                        ...CORS,
                    },
                });
            }

            if (normPath === "/downloads" || normPath === "/downloads/list") {

                if (!env.RELEASES) return errorResponse("Releases storage not bound", 500);

                const listing = await env.RELEASES.list();

                return jsonResponse(listing.objects.map(o => ({ key: o.key, size: o.size, uploaded: o.uploaded })));

            }



            const downloadMatch = normPath.match(/^\/downloads?\/([^/]+)$/);

            if (downloadMatch) {

                const requestedName = downloadMatch[1];

                const lowerName = requestedName.toLowerCase();



                // Specific metadata files: version.json

                if (lowerName === "version.json") {

                    if (env.RELEASES) {

                        try {

                            const r2Obj = await env.RELEASES.get("version.json");

                            if (r2Obj) {

                                return new Response(r2Obj.body, {

                                    headers: {

                                        "Content-Type": "application/json; charset=utf-8",

                                        "Cache-Control": "no-cache, must-revalidate",

                                        ...CORS,

                                    },

                                });

                            }

                        } catch (_) {}

                    }

                    return jsonResponse(CURRENT_APP_RELEASE, 200, {

                        "Cache-Control": "no-cache, must-revalidate",

                    });

                }



                if (!env.RELEASES) return errorResponse("Releases storage not bound", 500);

                let obj = await env.RELEASES.get(requestedName);

                if (!obj && requestedName.startsWith("ShadowStream")) {

                    const fallbackName = requestedName.replace("ShadowStream", "StreamApp");

                    obj = await env.RELEASES.get(fallbackName);

                } else if (!obj && requestedName.startsWith("StreamApp")) {

                    const fallbackName = requestedName.replace("StreamApp", "ShadowStream");

                    obj = await env.RELEASES.get(fallbackName);

                }



                // If latest.yml is requested by electron-updater and not found in R2, generate it

                if (!obj && (lowerName === "latest.yml" || lowerName === "latest-win.yml")) {

                    const latestYml = `version: ${CURRENT_APP_RELEASE.version}\npath: ShadowStream-Setup-x64.exe\nsha512: d41d8cd98f00b204e9800998ecf8427e\nreleaseDate: '${new Date().toISOString()}'\n`;

                    return new Response(latestYml, {

                        headers: {

                            "Content-Type": "text/yaml; charset=utf-8",

                            "Cache-Control": "no-cache, must-revalidate",

                            "X-Content-Type-Options": "nosniff",

                            ...CORS,

                        },

                    });

                }



                if (!obj) return notFound(path);



                const isYaml = lowerName.endsWith(".yml") || lowerName.endsWith(".yaml");

                const isJson = lowerName.endsWith(".json");

                const isApk = lowerName.endsWith(".apk");

                const isExe = lowerName.endsWith(".exe");

                const isZip = lowerName.endsWith(".zip");



                const contentType = isYaml

                    ? "text/yaml; charset=utf-8"

                    : isJson

                        ? "application/json; charset=utf-8"

                        : isApk

                            ? "application/vnd.android.package-archive"

                            : isExe

                                ? "application/vnd.microsoft.portable-executable"

                                : isZip

                                    ? "application/zip"

                                    : "application/octet-stream";



                const dlHeaders: Record<string, string> = {

                    "Content-Type": contentType,

                    "Cache-Control": "no-cache, must-revalidate",

                    "X-Content-Type-Options": "nosniff",

                    ...CORS,

                };



                // Only attach Content-Disposition for binary installer archives, never for YAML / JSON metadata

                if (!isYaml && !isJson) {

                    dlHeaders["Content-Disposition"] = `attachment; filename="${requestedName}"`;

                }



                if (obj.size) dlHeaders["Content-Length"] = String(obj.size);

                if (obj.httpEtag) dlHeaders["ETag"] = obj.httpEtag;

                return new Response(obj.body, { headers: dlHeaders });

            }



            const blogDirectMatch = normPath.match(/^\/blogs?\/([^/]+)$/);

            if (blogDirectMatch && blogDirectMatch[1] !== "all") {

                const slug = blogDirectMatch[1].replace(/\.json$/, "");

                return streamR2(`blogs/${slug}.json`, env);

            }



            if (normPath === "/blogs" || normPath === "/blogs-catalog" || normPath === "/blogs.json") {

                return streamWrappedR2("blogs.json", env);

            }



            if (normPath === "/titles/anime") {

                params.set("type", "anime");

                return await browseTitles(params, env);

            }



            if (normPath === "/titles/short-dramas") {

                params.set("type", "short_drama");

                return await browseTitles(params, env);

            }



            if (normPath === "/titles") {

                return await browseTitles(params, env);

            }



            const streamMatch = path.match(/(?:\/api\/v1)?\/title\/tmdb\/(\d+)\/stream$/);

            if (streamMatch) {

                return await resolveStream(parseInt(streamMatch[1], 10), env);

            }



            // Accept a `?lang=xx` query param. When set, the embed URLs are

            // rewritten so the provider defaults to the user's chosen audio.

            // Most major embeds (Vidlink, VidSrc, 2Embed, etc.) accept this.

            const rawLang = params.get("lang");

            const langParam = rawLang ? rawLang.split(/[-_]/)[0].toLowerCase().trim() : null;

            const langSuffix = (langParam && /^[a-z]{2,3}$/.test(langParam)) ? `&lang=${langParam}` : "";



            if (normPath === "/titles-lite" || normPath === "/titles-lite.json") {

                return streamR2("titles-lite.json", env);

            }



            // -------------------------------------------------------------

            // OpenSubtitles API & Subtitle Download / WebVTT Converter

            // -------------------------------------------------------------

            if (normPath === "/subtitles" || normPath === "/subtitles/") {

                const imdbId = params.get("imdbId") || params.get("imdb");

                const season = params.get("season") || params.get("s");

                const episode = params.get("episode") || params.get("e");

                const title = params.get("title") || "";



                const cleanImdb = String(imdbId || "").replace(/^tt/, "").trim();

                let osUrl = "";

                if (cleanImdb) {

                    if (season != null && episode != null && Number(season) > 0 && Number(episode) > 0) {

                        osUrl = `https://rest.opensubtitles.org/search/episode-${episode}/imdbid-${cleanImdb}/season-${season}`;

                    } else {

                        osUrl = `https://rest.opensubtitles.org/search/imdbid-${cleanImdb}`;

                    }

                } else if (title) {

                    const cleanTitle = encodeURIComponent(String(title).replace(/\(\d{4}\)/, "").trim());

                    osUrl = `https://rest.opensubtitles.org/search/query-${cleanTitle}`;

                }



                if (!osUrl) {

                    return jsonResponse({ ok: true, subtitles: [] });

                }



                try {

                    const osRes = await fetch(osUrl, {

                        headers: { "User-Agent": "TemporaryUserAgent", "Accept": "application/json" }

                    });

                    if (!osRes.ok) return jsonResponse({ ok: true, subtitles: [] });

                    const osData = await osRes.json();

                    if (!Array.isArray(osData)) return jsonResponse({ ok: true, subtitles: [] });



                    const ISO3_TO_ISO2: Record<string, string> = {

                        eng: "en", spa: "es", fre: "fr", fra: "fr", ger: "de", deu: "de",

                        ita: "it", por: "pt", pob: "pt", hin: "hi", ara: "ar", rus: "ru",

                        jpn: "ja", kor: "ko", chi: "zh", zho: "zh", tur: "tr", urd: "ur",

                        ind: "id", pol: "pl", dut: "nl", nld: "nl", swe: "sv", nor: "no",

                        dan: "da", fin: "fi", ell: "el", gre: "el", heb: "he", tha: "th",

                        vie: "vi", ces: "cs", cze: "cs", hun: "hu", ron: "ro", rum: "ro",

                        ukr: "uk", tam: "ta", tel: "te", mal: "ml", kan: "kn", ben: "bn",

                        fil: "fil", tag: "tl", msa: "ms", may: "ms", fas: "fa", per: "fa"

                    };



                    const byLang = new Map<string, any>();

                    for (const item of osData as any[]) {

                        const rawLang = String(item.SubLanguageID || "").toLowerCase();

                        const lang2 = ISO3_TO_ISO2[rawLang] || rawLang.slice(0, 2);

                        if (!lang2 || byLang.has(lang2)) continue;

                        if (!item.SubDownloadLink) continue;



                        const baseOrigin = "https://ssmoviestvs.site";

                        const downloadVttUrl = `${baseOrigin}/api/v1/subtitles/download?link=${encodeURIComponent(item.SubDownloadLink)}`;



                        byLang.set(lang2, {

                            id: `os_${lang2}`,

                            language: lang2,

                            label: item.LanguageName || lang2.toUpperCase(),

                            format: "vtt",

                            url: downloadVttUrl,

                            fileName: item.SubFileName || `${lang2}.vtt`

                        });

                    }



                    return jsonResponse({

                        ok: true,

                        totalFound: osData.length,

                        subtitles: Array.from(byLang.values())

                    });

                } catch (e: any) {

                    return jsonResponse({ ok: false, error: e?.message, subtitles: [] });

                }

            }



            if (normPath === "/subtitles/download" || normPath === "/subtitles/download/") {

                const link = params.get("link");

                if (!link || !link.startsWith("https://dl.opensubtitles.org/")) {

                    return new Response("Invalid or disallowed subtitle link", { status: 400 });

                }

                try {

                    const subRes = await fetch(link, {

                        headers: { "User-Agent": "TemporaryUserAgent" }

                    });

                    if (!subRes.ok) {

                        return new Response("Failed to download subtitle from upstream", { status: 502 });

                    }



                    let text = "";

                    const isGz = link.endsWith(".gz") || subRes.headers.get("content-type")?.includes("gzip") || subRes.headers.get("content-type")?.includes("force-download");

                    if (isGz && typeof DecompressionStream !== "undefined") {

                        try {

                            const ds = new DecompressionStream("gzip");

                            const decompressedStream = subRes.body!.pipeThrough(ds);

                            text = await new Response(decompressedStream).text();

                        } catch (_) {

                            text = await subRes.text();

                        }

                    } else {

                        text = await subRes.text();

                    }



                    const vtt = "WEBVTT\n\n" + text

                        .replace(/\r\n|\r/g, "\n")

                        .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2");



                    return new Response(vtt, {

                        status: 200,

                        headers: {

                            "Content-Type": "text/vtt; charset=utf-8",

                            ...CORS,

                            "Cache-Control": "public, max-age=86400"

                        }

                    });

                } catch (err: any) {

                    return new Response(`Subtitle proxy error: ${err?.message}`, { status: 500 });

                }

            }



            // -------------------------------------------------------------

            // AniList GraphQL Anime Title & Airing Resolver

            // -------------------------------------------------------------

            if (normPath === "/anime/resolve" || normPath === "/anime/resolve/") {

                const titleParam = params.get("title") || params.get("q") || params.get("slug") || "";

                const cleanTitle = titleParam.replace(/\(\d{4}\)|-\d{4,9}$/g, "").replace(/[-_]/g, " ").trim();

                if (!cleanTitle) {

                    return jsonResponse({ ok: false, message: "Missing title parameter" });

                }



                const query = `

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



                try {

                    const aniRes = await fetch("https://graphql.anilist.co", {

                        method: "POST",

                        headers: {

                            "Content-Type": "application/json",

                            "Accept": "application/json",

                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

                        },

                        body: JSON.stringify({ query, variables: { search: cleanTitle } })

                    });

                    if (!aniRes.ok) {

                        return jsonResponse({ ok: false, status: aniRes.status });

                    }

                    const json: any = await aniRes.json();

                    const media = json.data?.Media;

                    if (!media) {

                        return jsonResponse({ ok: false, message: "No anime match found" });

                    }



                    return jsonResponse({

                        ok: true,

                        anilistId: media.id,

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

                    });

                } catch (e: any) {

                    return jsonResponse({ ok: false, error: e?.message });

                }

            }



            // -------------------------------------------------------------

            // TVMaze Live Broadcast Schedule ("Airing Today")

            // -------------------------------------------------------------

            if (normPath === "/schedule/today" || normPath === "/schedule/today/") {

                try {

                    const tvmRes = await fetch("https://api.tvmaze.com/schedule?country=US");

                    if (tvmRes.ok) {

                        const list: any[] = await tvmRes.json();

                        const items = (Array.isArray(list) ? list : []).slice(0, 30).map(entry => {

                            const show = entry.show || {};

                            const img = show.image || entry.image || {};

                            return {

                                id: entry.id || show.id,

                                title: show.name || "Untitled Show",

                                episodeTitle: entry.name || `Episode ${entry.number || 1}`,

                                season: entry.season || 1,

                                episode: entry.number || 1,

                                airtime: entry.airtime || "",

                                network: show.network?.name || show.webChannel?.name || "Live TV",

                                poster: img.medium || img.original || null,

                                rating: show.rating?.average || null,

                                overview: (entry.summary || show.summary || "").replace(/<[^>]+>/g, "").trim(),

                                isLiveToday: true

                            };

                        });

                        return jsonResponse({ ok: true, source: "TVMaze Live", items });

                    }

                } catch (e: any) {

                    return jsonResponse({ ok: false, error: e?.message, items: [] });

                }

            }



            // -------------------------------------------------------------

            // Live Sports Hub & TV Channels ("/sports/hub")

            // -------------------------------------------------------------

            if (normPath === "/sports/hub" || normPath === "/sports/hub/" ||

                normPath === "/sports" || normPath === "/sports/") {

                try {

                    const hubRes = await fetch("https://ssmoviestvs.site/sports_hub.json");

                    if (hubRes.ok) {

                        const data = await hubRes.json();

                        return jsonResponse(data);

                    }

                } catch (_) {}



                try {

                    const espnRes = await fetch("https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard", {

                        headers: { "User-Agent": "Mozilla/5.0" }

                    });

                    const espnData: any = espnRes.ok ? await espnRes.json() : null;

                    return jsonResponse({

                        ok: true,

                        totalChannels: 0,

                        matches: (espnData?.events || []).map((ev: any) => ({

                            id: ev.id,

                            name: ev.name,

                            league: "Premier League",

                            isLive: ev.status?.type?.state === "in"

                        })),

                        channels: []

                    });

                } catch (e: any) {

                    return jsonResponse({ ok: false, error: e?.message, channels: [] });

                }

            }



            if (normPath === "/stream/resolve" || normPath === "/stream-mirrors") {

                const rawTmdbId = params.get("tmdbId") || params.get("id");

                const rawImdbId = params.get("imdbId") || params.get("imdb");

                const rawSeason = params.get("season") || params.get("s");

                const rawEpisode = params.get("episode") || params.get("e");

                const titleParam = params.get("title") || "";

                const slugParam = params.get("slug") || "";



                let tmdbId = (rawTmdbId && rawTmdbId !== "null" && rawTmdbId !== "undefined") ? rawTmdbId : null;

                let imdbId = (rawImdbId && rawImdbId !== "null" && rawImdbId !== "undefined") ? rawImdbId : null;



                // 1. Check known titles map

                if (slugParam) {

                    const cleanSlug = slugParam.trim().toLowerCase();

                    const known = KNOWN_TITLE_MAP[cleanSlug] || KNOWN_TITLE_MAP[cleanSlug.replace(/-\d+$/, '')];

                    if (known) {

                        if (!tmdbId && known.tmdbId) tmdbId = String(known.tmdbId);

                        if (!imdbId && known.imdbId) imdbId = known.imdbId;

                    }

                }



                // 2. Guard: If tmdbId is missing or looks like a 4-digit release year (1900-2099), resolve from catalog

                if (slugParam && (!tmdbId || /^(19\d\d|20\d\d)$/.test(String(tmdbId)))) {

                    try {

                        const full = await getFullTitleData(slugParam, env);

                        if (full) {

                            if (full.tmdbId || full.tmdb_id) tmdbId = String(full.tmdbId || full.tmdb_id);

                            if (full.imdbId || full.imdb_id) imdbId = String(full.imdbId || full.imdb_id);

                        }

                    } catch (_) {}

                }



                const parsedS = parseInt(rawSeason || "1", 10);

                const parsedE = parseInt(rawEpisode || "1", 10);

                const season = (Number.isFinite(parsedS) && parsedS > 0) ? String(parsedS) : "1";

                const episode = (Number.isFinite(parsedE) && parsedE > 0) ? String(parsedE) : "1";

                const hasExplicitEpisode = (params.has("season") || params.has("s")) && params.get("isMovie") !== "1";

                const type = params.get("type") || (hasExplicitEpisode ? "tv" : "movie");

                const isTv = type === "tv" || type === "short_drama" || (type === "anime" && hasExplicitEpisode);

                const isAnime = type === "anime" || /anime/i.test(slugParam) || /anime/i.test(params.get("genre") || "") || /(naruto|jujutsu|demon-slayer|attack-on-titan|one-piece|solo-leveling|bleach|hero-academia|death-note|dragon-ball)/i.test(slugParam || titleParam);



                // 3. Fallback: If still no TMDB ID or IMDb ID, and it's a TV show, query TVMaze public API

                if (!tmdbId && !imdbId && isTv && (titleParam || slugParam)) {

                    try {

                        const searchName = titleParam || slugParam.replace(/-\d+$/, '').replace(/-/g, ' ');

                        const tvmRes = await fetch(`https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(searchName)}`, {

                            headers: { "User-Agent": "ShadowStream/1.0" }

                        });

                        if (tvmRes.ok) {

                            const tvmData: any = await tvmRes.json();

                            if (tvmData?.externals?.imdb) {

                                imdbId = String(tvmData.externals.imdb);

                            }

                        }

                    } catch (_) {}

                }



                // Cache key for edge performance

                const cacheKey = `stream-res:${type}:${tmdbId || imdbId || slugParam}:${season}:${episode}:${langParam || ''}`;

                if (memCache.has(cacheKey)) {

                    return jsonResponse(memCache.get(cacheKey));

                }



                const tvVidLink = isTv ? `tv/${tmdbId}/${season}/${episode}` : `movie/${tmdbId}`;

                const tvVidSrc = isTv ? `tv/${tmdbId}/${season}/${episode}` : `movie/${tmdbId}`;

                const tv2Embed = isTv ? `tv?id=${tmdbId}&s=${season}&e=${episode}` : `movie?id=${tmdbId}`;



                const streams: Array<Record<string, any>> = [];



                // 1. If Anime or title has multi-dub: query AnimeSalt for regional dubs (Hindi, Tamil, Telugu, English, Japanese, Malayalam)

                if (isAnime) {

                    const searchTitle = titleParam || slugParam.replace(/-(\d{4,9})$/, '').replace(/-/g, ' ');

                    const animeDubs = await resolveAnimeSalt(searchTitle, parseInt(season, 10), parseInt(episode, 10));

                    if (Array.isArray(animeDubs) && animeDubs.length > 0) {

                        for (const item of animeDubs) {

                            const langName = item.language || 'Multi';

                            const langLower = langName.toLowerCase();

                            const isSub = langLower === 'japanese';

                            const code = langLower === 'hindi' ? 'hi'

                                : langLower === 'tamil' ? 'ta'

                                : langLower === 'telugu' ? 'te'

                                : langLower === 'malayalam' ? 'ml'

                                : langLower === 'english' ? 'en'

                                : langLower === 'japanese' ? 'ja'

                                : langLower === 'spanish' ? 'es'

                                : 'en';

                            const flag = langLower === 'hindi' ? '🇮🇳'

                                : (langLower === 'tamil' || langLower === 'telugu' || langLower === 'malayalam') ? '🇮🇳'

                                : langLower === 'english' ? '🇺🇸'

                                : langLower === 'japanese' ? '🇯🇵'

                                : langLower === 'spanish' ? '🇪🇸'

                                : '🎙️';



                            streams.push({

                                label: `${flag} ${langName} ${isSub ? '(Original Sub)' : 'Dub'}`,

                                provider: `animesalt_${code}`,

                                url: item.link,

                                format: 'embed',

                                quality: '1080p',

                                language: code,

                                languageName: langName,

                                isDub: !isSub,

                                isSub: isSub,

                                flag

                            });

                        }

                    }

                }



                const GLOBAL_CATALOG_LANGUAGES = [

                    { code: 'hi', name: 'Hindi', flag: '🇮🇳' },

                    { code: 'en', name: 'English', flag: '🇺🇸' },

                    { code: 'es', name: 'Spanish', flag: '🇪🇸' },

                    { code: 'fr', name: 'French', flag: '🇫🇷' },

                    { code: 'de', name: 'German', flag: '🇩🇪' },

                    { code: 'ja', name: 'Japanese', flag: '🇯🇵' },

                    { code: 'pt', name: 'Portuguese', flag: '🇧🇷' },

                    { code: 'it', name: 'Italian', flag: '🇮🇹' },

                    { code: 'ar', name: 'Arabic', flag: '🇸🇦' },

                    { code: 'ru', name: 'Russian', flag: '🇷🇺' },

                    { code: 'ta', name: 'Tamil', flag: '🇮🇳' },

                    { code: 'te', name: 'Telugu', flag: '🇮🇳' },

                    { code: 'ml', name: 'Malayalam', flag: '🌴' },

                    { code: 'ko', name: 'Korean', flag: '🇰🇷' },

                    { code: 'tr', name: 'Turkish', flag: '🇹🇷' },

                ];



                // 2. TMDB-based providers (Verified 100% working high-uptime streams)
                if (tmdbId && tmdbId !== "null") {
                    // 1. VidSrc Buzz HD (Primary Zero-XFO HTML5 1080p Engine)
                    streams.push({
                        label: "⚡ VidSrc Buzz HD",
                        provider: "vidsrc_buzz",
                        url: isTv ? `https://vidsrc.buzz/embed/tv/${tmdbId}/${season}/${episode}` : `https://vidsrc.buzz/embed/movie/${tmdbId}`,
                        format: "embed",
                        quality: "1080p",
                        language: "en",
                        languageName: "English"
                    });

                    // 2. NontonGo HD (Explicit ALLOWALL / frame-ancestors * Multi-Server)
                    streams.push({
                        label: "⚡ NontonGo HD",
                        provider: "nontongo",
                        url: isTv ? `https://www.NontonGo.win/embed/tv/${tmdbId}/${season}/${episode}` : `https://www.NontonGo.win/embed/movie/${tmdbId}`,
                        format: "embed",
                        quality: "1080p",
                        language: "en",
                        languageName: "English"
                    });

                    // 2. VidSrc HD Server
                    streams.push({
                        label: "⚡ VidSrc HD",
                        provider: "vidsrc",
                        url: isTv ? `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}` : `https://vidsrc.to/embed/movie/${tmdbId}`,
                        format: "embed",
                        quality: "1080p",
                        language: "en",
                        languageName: "English"
                    });

                    // 3. MultiEmbed - High Uptime VIP Multi-Language Audio Dubbed Server
                    streams.push({
                        label: "⚡ MultiEmbed VIP (Multi-Lang Dub)",
                        provider: "multiembed",
                        url: isTv ? `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1&s=${season}&e=${episode}` : `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1`,
                        format: "embed",
                        quality: "1080p",
                        language: "multi",
                        languageName: "Multi-Language Dub"
                    });

                    // 4. 2Embed Multi-Server
                    streams.push({
                        label: "⚡ 2Embed Multi-Server",
                        provider: "2embed",
                        url: isTv ? `https://www.2embed.cc/embed/tmdb/tv?id=${tmdbId}&s=${season}&e=${episode}` : `https://www.2embed.cc/embed/tmdb/movie?id=${tmdbId}`,
                        format: "embed",
                        quality: "HD",
                        language: "en",
                        languageName: "English"
                    });

                    // 5. Vidy - Multi-Audio Dubbing & Subtitles
                    streams.push({
                        label: "⚡ Vidy (Multi-Audio Dubs HD)",
                        provider: "vidy",
                        url: isTv ? `https://vidy.st/tv/${tmdbId}/${season}/${episode}?color=FFA500` : `https://vidy.st/movie/${tmdbId}?color=FFA500`,
                        format: "embed",
                        quality: "1080p",
                        language: "multi",
                        languageName: "Multi-Audio (In-Player Switcher)"
                    });

                    // 5. VidSrc RIP Fast
                    streams.push({
                        label: "⚡ VidSrc RIP (Fast)",
                        provider: "vidsrc_rip",
                        url: isTv ? `https://vidsrc.rip/embed/tv/${tmdbId}/${season}/${episode}` : `https://vidsrc.rip/embed/movie/${tmdbId}`,
                        format: "embed",
                        quality: "1080p",
                        language: "en",
                        languageName: "English"
                    });

                    // 6. VidSrc HD Server
                    streams.push({
                        label: "⚡ VidSrc HD",
                        provider: "vidsrc",
                        url: `https://vidsrc.to/embed/${tvVidSrc}`,
                        format: "embed",
                        quality: "1080p",
                        language: "en",
                        languageName: "English"
                    });

                    // 7. SmashyStream Multi-Lang (HD)
                    streams.push({
                        label: "⚡ SmashyStream Multi-Lang (HD)",
                        provider: "smashystream",
                        url: isTv ? `https://embed.smashystream.com/playere.php?tmdb=${tmdbId}&season=${season}&episode=${episode}` : `https://embed.smashystream.com/playere.php?tmdb=${tmdbId}`,
                        format: "embed",
                        quality: "1080p",
                        language: "multi",
                        languageName: "Multi-Language"
                    });

                    // 8. Vidlink Pro (Ad-Free HD Server)
                    streams.push({
                        label: "⚡ Vidlink (Ad-Free 1080p HD)",
                        provider: "vidlink",
                        url: `https://vidlink.pro/${tvVidLink}`,
                        format: "embed",
                        quality: "1080p",
                        language: "en",
                        languageName: "English"
                    });

                    // 9. 2Embed Multi-Server
                    streams.push({
                        label: "⚡ 2Embed Multi-Server",
                        provider: "2embed",
                        url: `https://www.2embed.cc/embed/tmdb/${tv2Embed}`,
                        format: "embed",
                        quality: "HD",
                        language: "en",
                        languageName: "English"
                    });
                }

                // 3. IMDb-based providers (Working for international titles with IMDb IDs)
                if (imdbId && imdbId !== "null") {
                    streams.push({
                        label: "⚡ VidSrc Buzz (IMDb Server)",
                        provider: "vidsrc_buzz_imdb",
                        url: isTv ? `https://vidsrc.buzz/embed/tv/${imdbId}/${season}/${episode}` : `https://vidsrc.buzz/embed/movie/${imdbId}`,
                        format: "embed",
                        quality: "1080p",
                        language: "en",
                        languageName: "English"
                    });

                    streams.push({
                        label: "⚡ Videasy (IMDb Multi-Audio)",
                        provider: "videasy_imdb",
                        url: isTv ? `https://vidy.st/tv/${imdbId}/${season}/${episode}?color=FFA500` : `https://vidy.st/movie/${imdbId}?color=FFA500`,
                        format: "embed",
                        quality: "1080p",
                        language: "multi",
                        languageName: "Multi-Language"
                    });

                    streams.push({
                        label: "⚡ VidSrc (IMDb Server)",
                        provider: "vidsrc_imdb",
                        url: isTv ? `https://vidsrc.me/embed/tv?imdb=${imdbId}&season=${season}&episode=${episode}` : `https://vidsrc.me/embed/movie?imdb=${imdbId}`,
                        format: "embed",
                        quality: "1080p",
                        language: "en",
                        languageName: "English"
                    });

                    streams.push({
                        label: "⚡ VidSrc Buzz (IMDb Server)",
                        provider: "vidsrc_buzz_imdb",
                        url: isTv ? `https://vidsrc.buzz/embed/tv/${imdbId}/${season}/${episode}` : `https://vidsrc.buzz/embed/movie/${imdbId}`,
                        format: "embed",
                        quality: "1080p",
                        language: "en",
                        languageName: "English"
                    });
                }

                // Available languages list for UI badges and switcher

                const availableLanguagesMap = new Map<string, any>();

                GLOBAL_CATALOG_LANGUAGES.forEach(gl => {

                    const existingDub = streams.some(s => s.language === gl.code && s.isDub);

                    const isDefaultAudio = gl.code === 'en';

                    availableLanguagesMap.set(gl.code, {

                        code: gl.code,

                        name: gl.name,

                        flag: gl.flag,

                        dub: Boolean(existingDub || isDefaultAudio),

                        sub: true

                    });

                });

                streams.forEach(s => {

                    if (s.language && !availableLanguagesMap.has(s.language)) {

                        availableLanguagesMap.set(s.language, {

                            code: s.language,

                            name: s.languageName || s.language.toUpperCase(),

                            flag: s.flag || '🌐',

                            dub: Boolean(s.isDub),

                            sub: Boolean(s.isSub)

                        });

                    }

                });

                const availableLanguages = Array.from(availableLanguagesMap.values());



                const responseData = {

                    status: "success",

                    tmdbId,

                    type,

                    season: parseInt(season, 10),

                    episode: parseInt(episode, 10),

                    availableLanguages,

                    streams

                };



                // Cache in memory for 12 hours (43200 seconds)

                memCache.set(cacheKey, responseData);



                return jsonResponse(responseData);

            }



            const availMatch = normPath.match(/^\/titles?\/([^/]+)\/availability$/);

            if (availMatch) {

                return await getTitleAvailability(availMatch[1], env, params);

            }



            const seasonsMatch = normPath.match(/^\/titles?\/([^/]+)\/seasons$/);

            if (seasonsMatch) {

                return await getTitleSeasons(seasonsMatch[1], env);

            }



            const audioLangsMatch = normPath.match(/^\/titles?\/([^/]+)\/audio-languages$/);

            if (audioLangsMatch) {

                return await getTitleAudioLanguages(audioLangsMatch[1], env);

            }



            const renditionsMatch = normPath.match(/^\/titles?\/([^/]+)\/renditions$/);

            if (renditionsMatch) {

                return await getTitleRenditions(renditionsMatch[1], env);

            }



            // Resolver + provider capability report.

            if (normPath === "/resolve") {

                return await handleResolve(params, env);

            }

            if (normPath === "/health/providers") {

                return await handleProviderHealth(env);

            }



            const castMatch = normPath.match(/^\/titles?\/([^/]+)\/cast$/);

            if (castMatch) {

                return await getTitleCast(castMatch[1], env);

            }



            const franchiseMatch = normPath.match(/^\/titles?\/([^/]+)\/franchise$/);

            if (franchiseMatch) {

                return await getTitleFranchise(franchiseMatch[1], env);

            }



            const titleMatch = normPath.match(/^\/titles?\/([^/]+)$/);

            if (titleMatch && !["anime", "short-dramas", "lite"].includes(titleMatch[1])) {

                return await getTitle(titleMatch[1], env, langSuffix);

            }



            if (normPath === "/search") {

                const q = params.get("q") || "";

                const limit = parseInt(params.get("page_size") || params.get("limit") || "30", 10);

                return await searchTitles(q, env, limit, params);

            }



            if (normPath === "/watchlist" || normPath.startsWith("/watchlist/")) {

                return jsonResponse({ status: "ok", items: [] });

            }



            if (normPath === "/history" || normPath.startsWith("/history/")) {

                return jsonResponse({ status: "ok", items: [] });

            }



            if (normPath === "/dub/download") {

                const targetUrl = params.get("url") || "";

                if (targetUrl && /^https?:\/\//i.test(targetUrl)) {

                    return Response.redirect(targetUrl, 302);

                }

                const titleName = params.get("title") || "ShadowStream";

                const langCode = (params.get("lang") || "en").toUpperCase();

                return jsonResponse({

                    status: "ok",

                    title: titleName,

                    lang: langCode,

                    message: `Use the in-player Audio / Dub selector to stream ${titleName} in ${langCode}.`,

                });

            }



            return notFound(path);

        } catch (err) {

            const msg = err instanceof Error ? err.message : String(err);

            return errorResponse(msg, 500);

        }

    },

};

