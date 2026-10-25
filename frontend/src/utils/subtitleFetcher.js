/**
 * Subtitle Fetcher — fetches synchronized multi-language subtitles from OpenSubtitles via ShadowStream API.
 */

import { getApiBase } from './api';

export async function fetchOpenSubtitles({ imdbId, tmdbId, title, season, episode }) {
    if (!imdbId && !title) return [];
    try {
        const params = new URLSearchParams();
        if (imdbId) params.set('imdbId', String(imdbId));
        if (tmdbId) params.set('tmdbId', String(tmdbId));
        if (title) params.set('title', String(title));
        if (season != null) params.set('season', String(season));
        if (episode != null) params.set('episode', String(episode));

        const res = await fetch(`${getApiBase()}/subtitles?${params.toString()}`);
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data.subtitles) ? data.subtitles : [];
    } catch (e) {
        console.warn('[SubtitleFetcher] Error:', e);
        return [];
    }
}

/**
 * Converts a remote GZ-compressed SRT or raw SRT subtitle into a local WebVTT Blob URL
 * using client-side DecompressionStream. Runs directly in browser/webview with zero proxy hops.
 */
export async function convertSrtGzToVtt(url) {
    if (!url || typeof window === 'undefined') return url;
    if (url.startsWith('blob:') || url.startsWith('data:')) return url;

    try {
        const res = await fetch(url, { headers: { 'User-Agent': 'TemporaryUserAgent' } });
        if (!res.ok) return url;

        let text = '';
        const isGz = url.includes('.gz') || res.headers.get('content-type')?.includes('gzip') || res.headers.get('content-type')?.includes('force-download');
        if (isGz && typeof DecompressionStream !== 'undefined') {
            try {
                const ds = new DecompressionStream('gzip');
                const decompressed = res.body.pipeThrough(ds);
                text = await new Response(decompressed).text();
            } catch (_) {
                text = await res.text();
            }
        } else {
            text = await res.text();
        }

        // Convert SRT timecodes 00:00:00,000 to WebVTT 00:00:00.000
        const vtt = 'WEBVTT\n\n' + text
            .replace(/\r\n|\r/g, '\n')
            .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');

        const blob = new Blob([vtt], { type: 'text/vtt;charset=utf-8' });
        return URL.createObjectURL(blob);
    } catch (e) {
        console.warn('[SubtitleFetcher] convertSrtGzToVtt error:', e);
        return url;
    }
}
