/**
 * Stream resolver.
 *
 * Goal: turn a provider's page into a direct HLS/MP4 URL so our own player
 * engine decodes it. When that is not possible, hand back the mirror URL so the
 * provider's own player runs inside our chrome. Playback is never lost.
 *
 * The contract is deliberately forgiving. Every failure path still returns a
 * usable `mirror`, because a player that shows a broken frame is far worse than
 * one that shows the provider's own player.
 *
 * We do NOT attempt to defeat bot protection. vidlink in particular is gated
 * behind a 2.4 MB WASM challenge; it is recorded as iframe_only and stays that
 * way unless the provider itself changes.
 */

import type { ProviderEntry, ResolveMode } from './providers';

export interface ResolveResult {
    direct: { url: string; type: 'hls' | 'mp4' | 'webm'; quality?: string } | null;
    mirror: string | null;
    provider: string;
    resolveMode: ResolveMode;
    latencyMs: number;
    degraded?: boolean;
    reason?: string;
}

/** Total budget for a single resolve. Past this we return the mirror. */
const TOTAL_BUDGET_MS = 6000;
/** Per-hop timeout. */
const HOP_TIMEOUT_MS = 2000;
const MAX_REDIRECTS = 2;

const DESKTOP_UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

/** Reject anything that is obviously not a media manifest. */
function classify(url: string): 'hls' | 'mp4' | 'webm' | null {
    if (/\.m3u8(\?|$)/i.test(url)) return 'hls';
    if (/\.mp4(\?|$)/i.test(url)) return 'mp4';
    if (/\.webm(\?|$)/i.test(url)) return 'webm';
    return null;
}

/**
 * Pull candidate media URLs out of a provider page.
 * Deliberately conservative: we only accept URLs that are clearly media, and
 * we ignore anything that looks like an ad or a tracking pixel.
 */
export function extractFromHtml(html: string): { url: string; type: 'hls' | 'mp4' | 'webm' } | null {
    const AD_HINTS = [
        'doubleclick',
        'googlesyndication',
        'googleadservices',
        '/ads/',
        'popads',
        'propellerads',
        'adsterra',
        'exoclick',
        'juicyads',
        'onclicka',
        'trafficjunky',
    ];

    const candidates: string[] = [];
    const patterns = [
        /["'](https?:\\?\/\\?\/[^"'\s<>]+?\.m3u8(?:\?[^"'\s<>]*)?)["']/gi,
        /["'](https?:\\?\/\\?\/[^"'\s<>]+?\.(?:mp4|webm)(?:\?[^"'\s<>]*)?)["']/gi,
        /["'](https?:\\?\/\\?\/[^"'\s<>]+?\/master(?:\.[^"'\s<>]*)?\.m3u8[^"'\s<>]*)["']/gi,
        /\\?u\\?=\\?(https?:[^"'&\s]+?\.m3u8[^"'&\s]*)/gi,
    ];

    for (const re of patterns) {
        let m: RegExpExecArray | null;
        while ((m = re.exec(html)) !== null) {
            candidates.push(m[1]);
        }
    }

    for (const raw of candidates) {
        const url = raw.replace(/\\\//g, '/').replace(/\\u002F/g, '/').trim();
        const lower = url.toLowerCase();
        if (AD_HINTS.some((h) => lower.includes(h))) continue;
        const type = classify(url);
        if (type) return { url, type };
    }
    return null;
}

async function fetchWithBudget(url: string, budgetMs: number): Promise<Response | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.min(HOP_TIMEOUT_MS, budgetMs));
    try {
        return await fetch(url, {
            redirect: 'follow',
            signal: controller.signal,
            headers: {
                'User-Agent': DESKTOP_UA,
                Accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
            },
        });
    } catch (_) {
        return null;
    } finally {
        clearTimeout(timer);
    }
}

/**
 * Attempt to resolve a provider to a direct stream.
 * Never throws. Always returns a ResolveResult with `mirror` populated.
 */
export async function resolveProvider(
    provider: ProviderEntry,
    args: { tmdbId: number; type: string; season?: number | null; episode?: number | null }
): Promise<ResolveResult> {
    const started = Date.now();
    const mirror = provider.buildUrl(args.tmdbId, args.type, args.season, args.episode);
    const base: ResolveResult = {
        direct: null,
        mirror,
        provider: provider.slug,
        resolveMode: provider.resolveMode,
        latencyMs: 0,
    };

    if (provider.resolveMode === 'disabled') {
        return { ...base, degraded: true, reason: 'provider disabled' };
    }

    // A provider marked iframe_only is not scraped by default. We still allow
    // the attempt when it declares a second-stage API, because that API is the
    // only honest chance of a direct stream and it costs one request.
    if (provider.resolveMode === 'iframe_only' && !provider.secondStage) {
        return { ...base, reason: 'no server-side resolution for this provider' };
    }

    const elapsed = () => Date.now() - started;
    const remaining = () => TOTAL_BUDGET_MS - elapsed();

    // Attempt 1: declared second-stage API.
    if (provider.secondStage && remaining() > HOP_TIMEOUT_MS) {
        const endpoint = provider.secondStage(args.tmdbId, args.type, args.season, args.episode);
        if (endpoint) {
            const res = await fetchWithBudget(endpoint, remaining());
            if (res && res.ok) {
                try {
                    const payload = await res.json();
                    const parsed = provider.parseSecondStage?.(payload) ?? extractFromHtml(JSON.stringify(payload));
                    if (parsed && classify(parsed.url)) {
                        return { ...base, direct: parsed, resolveMode: 'direct', latencyMs: elapsed() };
                    }
                } catch (_) {
                    // fall through to HTML attempt
                }
            }
        }
    }

    // Attempt 2: fetch the player page and look for a manifest.
    if (remaining() > HOP_TIMEOUT_MS) {
        const res = await fetchWithBudget(mirror, remaining());
        if (res && res.ok) {
            const ctype = res.headers.get('content-type') || '';
            if (!/text\/html|application\/xhtml/i.test(ctype)) {
                // The page itself is media — use it directly.
                const type = classify(mirror);
                if (type) {
                    return { ...base, direct: { url: mirror, type }, resolveMode: 'direct', latencyMs: elapsed() };
                }
            } else {
                let html = '';
                try {
                    html = await res.text();
                } catch (_) {
                    html = '';
                }
                const found = extractFromHtml(html);
                if (found) {
                    return { ...base, direct: found, resolveMode: 'direct', latencyMs: elapsed() };
                }
            }
        }
    }

    return {
        ...base,
        latencyMs: elapsed(),
        degraded: true,
        reason: 'no direct stream exposed by provider',
    };
}

/**
 * Resolve several providers at once, with a hard concurrency cap so one slow
 * provider cannot exhaust the Worker's subrequest budget.
 */
export async function resolveMany(
    providers: ProviderEntry[],
    args: { tmdbId: number; type: string; season?: number | null; episode?: number | null },
    concurrency = 3
): Promise<ResolveResult[]> {
    const results: ResolveResult[] = new Array(providers.length);
    let cursor = 0;

    async function worker() {
        for (;;) {
            const i = cursor++;
            if (i >= providers.length) return;
            results[i] = await resolveProvider(providers[i], args);
        }
    }

    await Promise.all(
        Array.from({ length: Math.min(concurrency, providers.length || 1) }, () => worker())
    );
    return results.filter(Boolean);
}

export const __resolverInternals = { classify, MAX_REDIRECTS };
