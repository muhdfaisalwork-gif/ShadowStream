/**
 * Provider registry.
 *
 * This is the single source of truth for which stream providers exist, how they
 * behave, and whether we can decode them ourselves. It is deliberately data,
 * not code: a provider's state changes by editing providers.json in R2, not by
 * redeploying the Worker. Providers break constantly — embed.su stopped
 * resolving in DNS entirely — and a registry is what makes that a config change
 * instead of an emergency code edit.
 *
 * `resolveMode`:
 *   'direct'      — we can extract a real stream URL and decode it ourselves
 *   'iframe_only' — the provider only exposes a player page; we embed it
 *   'disabled'    — provider is dead or removed from rotation
 *
 * Measured on 2026-09-28 (see plan §8):
 *   vidlink   — Next.js + RSC, API returns literal null, gated behind a 2.4 MB
 *               /fu.wasm challenge. Not server-resolvable.
 *   embed.su  — DNS NXDOMAIN. Removed from rotation.
 *   vidsrc    — nested iframe, no direct stream.
 *   2embed    — nested iframe, no direct stream.
 *   multiembed— unreachable.
 *   archive.org / blender / pixabay / pexels / commons — genuinely direct MP4.
 */

export type ResolveMode = 'direct' | 'iframe_only' | 'disabled';

export interface ProviderEntry {
    slug: string;
    displayName: string;
    resolveMode: ResolveMode;
    /** Build the embed/mirror page URL for a title. */
    buildUrl: (tmdbId: number, type: string, season?: number | null, episode?: number | null) => string;
    /**
     * Optional second-stage endpoint. If a provider exposes a plain API that
     * returns a stream manifest, put it here and the resolver will try it
     * before falling back to HTML scraping.
     */
    secondStage?: (tmdbId: number, type: string, season?: number | null, episode?: number | null) => string;
    /** How to interpret a second-stage payload. */
    parseSecondStage?: (payload: any) => { url: string; type: 'hls' | 'mp4' | 'webm' } | null;
    note?: string;
}

const isTv = (type: string, s?: number | null) =>
    type === 'tv' || type === 'short_drama' || (type === 'anime' && s !== undefined && s !== null);

const cleanS = (s?: number | null) => (s != null && s > 0 ? s : 1);
const cleanE = (e?: number | null) => (e != null && e > 0 ? e : 1);

export const DEFAULT_PROVIDERS: Record<string, ProviderEntry> = {
    vidlink: {
        slug: 'vidlink',
        displayName: 'Vidlink (Ad-Free HD)',
        resolveMode: 'iframe_only',
        buildUrl: (id, type, s, e) =>
            isTv(type, s) ? `https://vidlink.pro/tv/${id}/${cleanS(s)}/${cleanE(e)}` : `https://vidlink.pro/movie/${id}`,
        // Verified 2026-09-28: returns literal `null`, with or without
        // Referer/Origin, and the player is gated behind a 2.4 MB WASM module.
        secondStage: (id, type, s, e) =>
            isTv(type, s) ? `https://vidlink.pro/api/b/tv/${id}/${cleanS(s)}/${cleanE(e)}` : '',
        parseSecondStage: (payload) => {
            const url = typeof payload === 'string' ? payload : payload?.url || payload?.file || payload?.src;
            if (typeof url !== 'string' || !/^https?:\/\//.test(url)) return null;
            return { url, type: /\.m3u8/i.test(url) ? 'hls' : 'mp4' };
        },
        note: 'Client is a Next.js app with a 2.4 MB WASM challenge. Currently iframe-only.',
    },

    vidlink_sub: {
        slug: 'vidlink_sub',
        displayName: 'Vidlink (🇯🇵 Japanese SUB)',
        resolveMode: 'iframe_only',
        buildUrl: (id, type, s, e) =>
            isTv(type, s) ? `https://vidlink.pro/tv/${id}/${cleanS(s)}/${cleanE(e)}` : `https://vidlink.pro/movie/${id}`,
        note: 'Vidlink sub stream with original Japanese audio and subtitles.',
    },

    vidlink_dub: {
        slug: 'vidlink_dub',
        displayName: 'Vidlink (🎙️ English DUB)',
        resolveMode: 'iframe_only',
        buildUrl: (id, type, s, e) =>
            isTv(type, s) ? `https://vidlink.pro/tv/${id}/${cleanS(s)}/${cleanE(e)}?fallback=true` : `https://vidlink.pro/movie/${id}?fallback=true`,
        note: 'Vidlink dubbed stream with English voice audio.',
    },

    vidsrc: {
        slug: 'vidsrc',
        displayName: 'VidSrc HD',
        resolveMode: 'iframe_only',
        buildUrl: (id, type, s, e) =>
            isTv(type, s) ? `https://vidsrc.to/embed/tv/${id}/${cleanS(s)}/${cleanE(e)}` : `https://vidsrc.to/embed/movie/${id}`,
        note: 'Serves a nested iframe; no plain manifest in the page.',
    },

    '2embed': {
        slug: '2embed',
        displayName: '2Embed Multi-Server',
        resolveMode: 'iframe_only',
        buildUrl: (id, type, s, e) =>
            isTv(type, s)
                ? `https://www.2embed.cc/embed/tmdb/tv?id=${id}&s=${cleanS(s)}&e=${cleanE(e)}`
                : `https://www.2embed.cc/embed/tmdb/movie?id=${id}`,
        note: 'Serves a nested iframe to /embed/.',
    },

    // Removed from rotation 2026-09-28: embed.su no longer resolves in DNS.
    // Kept here disabled rather than deleted so the history is visible and it
    // can be re-enabled if the domain comes back.
    embedsu: {
        slug: 'embedsu',
        displayName: 'EmbedSu VIP',
        resolveMode: 'disabled',
        buildUrl: (id, type, s, e) =>
            isTv(type) ? `https://embed.su/embed/tv/${id}/${s ?? 1}/${e ?? 1}` : `https://embed.su/embed/movie/${id}`,
        note: 'Disabled: DNS NXDOMAIN as of 2026-09-28.',
    },

    superembed: {
        slug: 'superembed',
        displayName: 'SuperEmbed',
        resolveMode: 'disabled',
        buildUrl: (id, type, s, e) =>
            isTv(type)
                ? `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${s ?? 1}&e=${e ?? 1}`
                : `https://multiembed.mov/?video_id=${id}&tmdb=1`,
        note: 'Disabled: host unreachable as of 2026-09-28.',
    },

    // Genuinely direct public-domain / CC sources. These are the only rows in
    // the catalogue that our own engine decodes without any fragility.
    archive_org: {
        slug: 'archive_org',
        displayName: 'Internet Archive',
        resolveMode: 'direct',
        buildUrl: (id) => `https://archive.org/details/${id}`,
        note: 'Public domain. playback_url comes from the availability row, not the resolver.',
    },
    blender_open: {
        slug: 'blender_open',
        displayName: 'Blender Open Movies',
        resolveMode: 'direct',
        buildUrl: (id) => `https://studio.blender.org/films/${id}`,
        note: 'CC-BY. playback_url comes from the availability row.',
    },
};

/** Order the user sees. Disabled providers are filtered out of this list. */
export const DEFAULT_MIRROR_ORDER = ['vidlink', 'vidsrc', '2embed'];

/** Merge an R2-published override over the compiled defaults. */
export function mergeProviders(override: any): Record<string, ProviderEntry> {
    const out: Record<string, ProviderEntry> = { ...DEFAULT_PROVIDERS };
    if (!override || typeof override !== 'object') return out;

    const entries = Array.isArray(override) ? override : override.providers;
    if (!Array.isArray(entries)) return out;

    for (const raw of entries) {
        if (!raw || typeof raw !== 'object' || typeof raw.slug !== 'string') continue;
        const base = out[raw.slug];
        if (!base) continue;
        out[raw.slug] = {
            ...base,
            resolveMode: (raw.resolveMode as ResolveMode) || base.resolveMode,
            note: raw.note ?? base.note,
        };
    }
    return out;
}
