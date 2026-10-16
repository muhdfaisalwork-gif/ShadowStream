/**
 * Resolver client.
 *
 * The catalog's `availability` entries only tell us where a provider *might*
 * serve a title. The resolver tells us whether we can actually get a direct
 * stream URL that our own engine can decode, or whether we have to fall back to
 * the provider's own iframe.
 *
 * Contract (see plan): /resolve NEVER fails the playback request. It always
 * returns a usable `mirror` so a provider outage degrades the experience
 * instead of breaking it.
 */

import { getApiBase } from './api';

/** How long a single resolve call may take before we give up and use the mirror. */
const RESOLVE_TIMEOUT_MS = 6000;

/** Per-mirror resolution is best-effort and runs concurrently. */
function withTimeout(promise, ms) {
    return new Promise((resolve) => {
        let done = false;
        const timer = setTimeout(() => {
            if (!done) {
                done = true;
                resolve(null);
            }
        }, ms);
        promise.then(
            (v) => {
                if (!done) {
                    done = true;
                    clearTimeout(timer);
                    resolve(v);
                }
            },
            () => {
                if (!done) {
                    done = true;
                    clearTimeout(timer);
                    resolve(null);
                }
            }
        );
    });
}

/**
 * Ask the worker to turn one provider's page into a direct stream URL.
 * @returns {Promise<{direct: {url,type,quality}|null, mirror: string|null, resolveMode: string}>}
 */
export async function resolveMirror({ tmdbId, type, season, episode, provider, mirrorUrl }) {
    const fallback = {
        direct: null,
        mirror: mirrorUrl || null,
        resolveMode: 'iframe_only',
    };
    if (!tmdbId) return fallback;

    const params = new URLSearchParams();
    params.set('tmdbId', String(tmdbId));
    if (type) params.set('type', type);
    if (season != null) params.set('season', String(season));
    if (episode != null) params.set('episode', String(episode));
    if (provider) params.set('provider', provider);
    if (mirrorUrl) params.set('mirror', mirrorUrl);

    const url = `${getApiBase()}/resolve?${params.toString()}`;

    try {
        const res = await withTimeout(fetch(url), RESOLVE_TIMEOUT_MS);
        if (!res || !res.ok) return fallback;
        const data = await res.json();
        return {
            direct: data.direct || null,
            mirror: data.mirror || mirrorUrl || null,
            resolveMode: data.resolveMode || 'iframe_only',
            provider: data.provider || provider,
        };
    } catch (e) {
        return fallback;
    }
}

/**
 * Resolve a whole mirror list concurrently.
 *
 * Every mirror is enriched with `direct`/`resolveMode`; the *playable* mirror
 * is the first one that produced a direct stream, otherwise the first mirror
 * overall. The full list is always returned so the server switcher keeps
 * working and the user can always fall back manually.
 *
 * @param {Array} mirrors  [{label, provider, url, format, quality}]
 * @param {Object} ctx     {tmdbId, type, season, episode}
 * @returns {Promise<{playable: Object|null, mirrors: Array, anyDirect: boolean}>}
 */
export async function resolveMirrors(mirrors, ctx) {
    if (!Array.isArray(mirrors) || mirrors.length === 0) {
        return { playable: null, mirrors: [], anyDirect: false };
    }

    const enriched = await Promise.all(
        mirrors.map(async (m) => {
            // Only aggregate-looking mirrors are worth resolving. A row that
            // already carries a real direct URL is used as-is.
            if (m.format === 'video' && m.url) {
                return { ...m, direct: { url: m.url, type: guessType(m.url) }, resolveMode: 'direct' };
            }
            const r = await resolveMirror({
                tmdbId: ctx?.tmdbId,
                type: ctx?.type,
                season: ctx?.season,
                episode: ctx?.episode,
                provider: m.provider,
                mirrorUrl: m.url,
            });
            return { ...m, direct: r.direct, resolveMode: r.resolveMode, mirror: r.mirror };
        })
    );

    const firstDirect = enriched.find((m) => m.direct && m.direct.url);
    const playable = firstDirect || enriched[0] || null;

    return { playable, mirrors: enriched, anyDirect: Boolean(firstDirect) };
}

export function guessType(url) {
    if (typeof url !== 'string') return 'unknown';
    if (url.includes('.m3u8')) return 'hls';
    if (url.endsWith('.mp4') || url.includes('.mp4?')) return 'mp4';
    if (url.endsWith('.webm') || url.includes('.webm?')) return 'webm';
    return 'unknown';
}

/** Map a resolved mirror to the props ShadowStreamPlayer expects. */
export function toPlayerProps(mirror) {
    if (!mirror) return null;
    if (mirror.direct && mirror.direct.url) {
        return {
            streamUrl: mirror.direct.url,
            streamKind: 'direct',
            sourceName: mirror.label,
        };
    }
    return {
        streamUrl: mirror.mirror || mirror.url,
        streamKind: 'embed',
        sourceName: mirror.label,
    };
}
