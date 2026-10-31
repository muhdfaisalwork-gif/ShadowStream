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
    vidy: {
        slug: 'vidy',
        displayName: 'Vidy (Multi-Audio HD)',
        resolveMode: 'iframe_only',
        buildUrl: (id, type, s, e) =>
            isTv(type, s) ? `https://www.vidy.st/tv/${id}/${cleanS(s)}/${cleanE(e)}?color=FFA500` : `https://www.vidy.st/movie/${id}?color=FFA500`,
        note: 'Donkey.to verified high-speed engine with multi-audio dubbing & subtitle switcher.',
    },

    videasy: {
        slug: 'videasy',
        displayName: 'Videasy HD',
        resolveMode: 'disabled',
        buildUrl: (id, type, s, e) =>
            isTv(type, s)
                ? `https://vidstuck.cc/embed/tv/${id}/${cleanS(s)}/${cleanE(e)}?loading=2&color=FFA500`
                : `https://vidstuck.cc/embed/movie/${id}?loading=2&color=FFA500`,
        note: 'Disabled (v2.4.41): player.videasy.to refuses to play inside a sandboxed iframe ("Iframe Sandbox Detected"), answers HTTP 200 with its own "We couldn\'t find that" page for titles it does not host, and loads popunder + hostile-redirect trackers whose payload embeds our own domain. Superseded by vidstuck.cc.',
    },

    vidstuck: {
        slug: 'vidstuck',
        displayName: 'VidStuck Ultra Fast',
        resolveMode: 'iframe_only',
        buildUrl: (id, type, s, e) =>
            isTv(type, s) ? `https://vidstuck.cc/embed/tv/${id}/${cleanS(s)}/${cleanE(e)}?loading=2` : `https://vidstuck.cc/embed/movie/${id}?loading=2`,
        note: 'Sub-300ms ultra-low-latency provider with smooth HTML5 streaming.',
    },

    multiembed: {
        slug: 'multiembed',
        displayName: 'MultiEmbed (VIP Audio Dub)',
        resolveMode: 'disabled',
        buildUrl: (id, type, s, e) =>
            isTv(type, s)
                ? `https://player.videasy.to/tv/${id}/${cleanS(s)}/${cleanE(e)}?color=FFA500`
                : `https://player.videasy.to/movie/${id}?color=FFA500`,
        note: 'Disabled: ad scripts (aclib.runPop); superseded by player.videasy.to.',
    },

    vidsrc_buzz: {
        slug: 'vidsrc_buzz',
        displayName: 'VidSrc Buzz HD',
        resolveMode: 'disabled',
        buildUrl: (id, type, s, e) =>
            isTv(type, s)
                ? `https://vidsrc.to/embed/tv/${id}/${cleanS(s)}/${cleanE(e)}`
                : `https://vidsrc.to/embed/movie/${id}`,
        note: 'Disabled: ad injection and hostile redirect scripts.',
    },

    nontongo: {
        slug: 'nontongo',
        displayName: 'NontonGo HD',
        resolveMode: 'iframe_only',
        buildUrl: (id, type, s, e) =>
            isTv(type, s)
                ? `https://www.NontonGo.win/embed/tv/${id}/${cleanS(s)}/${cleanE(e)}`
                : `https://www.NontonGo.win/embed/movie/${id}`,
        note: 'Explicitly permits iframe embedding (X-Frame-Options: ALLOWALL, frame-ancestors *).',
    },

    autoembed: {
        slug: 'autoembed',
        displayName: 'AutoEmbed HD',
        resolveMode: 'disabled',
        buildUrl: (id, type, s, e) =>
            isTv(type, s)
                ? `https://vidsrc.buzz/embed/tv/${id}/${cleanS(s)}/${cleanE(e)}`
                : `https://vidsrc.buzz/embed/movie/${id}`,
        note: 'Disabled: autoembed.me sends X-Frame-Options: SAMEORIGIN which blocks iframe embedding.',
    },

    vidsrc_rip: {
        slug: 'vidsrc_rip',
        displayName: 'VidSrc RIP (Fast)',
        resolveMode: 'iframe_only',
        buildUrl: (id, type, s, e) =>
            isTv(type, s) ? `https://vidsrc.rip/embed/tv/${id}/${cleanS(s)}/${cleanE(e)}` : `https://vidsrc.rip/embed/movie/${id}`,
        note: 'Fast VidSrc alternate with responsive HTML5 player.',
    },

    vidlink: {
        slug: 'vidlink',
        displayName: 'Vidlink (Ad-Free HD)',
        resolveMode: 'iframe_only',
        buildUrl: (id, type, s, e) =>
            isTv(type, s) ? `https://vidlink.pro/tv/${id}/${cleanS(s)}/${cleanE(e)}` : `https://vidlink.pro/movie/${id}`,
        note: 'Client is a Next.js app with a 2.4 MB WASM challenge. Iframe-only.',
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
        note: 'Serves a nested iframe; reliable backup.',
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

    // Removed from rotation: embedsu is offline in DNS.
    embedsu: {
        slug: 'embedsu',
        displayName: 'EmbedSu VIP',
        resolveMode: 'disabled',
        buildUrl: (id, type, s, e) =>
            isTv(type) ? `https://embed.su/embed/tv/${id}/${s ?? 1}/${e ?? 1}` : `https://embed.su/embed/movie/${id}`,
        note: 'Disabled: DNS NXDOMAIN.',
    },

    superembed: {
        slug: 'superembed',
        displayName: 'MultiEmbed (VIP Audio Dub)',
        resolveMode: 'disabled',
        buildUrl: (id, type, s, e) =>
            isTv(type, s)
                ? `https://player.videasy.to/tv/${id}/${cleanS(s)}/${cleanE(e)}?color=FFA500`
                : `https://player.videasy.to/movie/${id}?color=FFA500`,
        note: 'Disabled: ad scripts (aclib.runPop); superseded by player.videasy.to.',
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

/**
 * Order the user sees. Disabled providers are filtered out of this list.
 *
 * smashystream was removed in v2.4.41: embed.smashystream.com no longer
 * resolves in DNS (NXDOMAIN), so it could only ever hand the player a dead
 * host.
 */
export const DEFAULT_MIRROR_ORDER = ['vidstuck', 'nontongo', 'vidsrc', '2embed', 'vidlink'];

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
