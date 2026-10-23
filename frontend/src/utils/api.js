/**
 * api.js — Centralized API configuration and endpoints.
 * Resolution order:
 *   1. window.__STREAMING_CONFIG__.apiBase  (runtime override, set in dist/index.html)
 *   2. Same-origin (only when served from a known LOCAL backend host, e.g. localhost:3000)
 *   3. http://localhost:3000/api/v1         (local dev)
 *   4. PRODUCTION_API                       (deployed Cloudflare Worker catalog API)
 */

export const PRODUCTION_API = 'https://ssmoviestvs.site/api/v1';

function readRuntimeConfig() {
    if (typeof window === 'undefined') return null;
    const cfg = window.__STREAMING_CONFIG__;
    if (cfg && typeof cfg === 'object' && typeof cfg.apiBase === 'string' && cfg.apiBase.length) {
        return cfg.apiBase.replace(/\/+$/, '');
    }
    return null;
}

export function getApiBase() {
    const override = readRuntimeConfig();
    if (override) return override;

    if (typeof window !== 'undefined' && window.location) {
        const origin = window.location.origin || '';
        const host = window.location.hostname || '';
        if (host === 'localhost' || host === '127.0.0.1') {
            const port = window.location.port || '';
            return port === '3000' ? `${origin}/api/v1` : 'http://localhost:3000/api/v1';
        }
        // If served from ssmoviestvs.site or any production web domain, use same-origin /api/v1
        if (origin && (origin.startsWith('http://') || origin.startsWith('https://'))) {
            return `${origin}/api/v1`;
        }
    }
    return PRODUCTION_API;
}

export const API_BASE = getApiBase();

/**
 * Fetch wrapper with timeout and JSON parsing
 */
export async function apiFetch(endpoint, options = {}, timeoutMs = 8000) {
    const base = getApiBase();
    const url = endpoint.startsWith('http') ? endpoint : `${base}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    if (options.signal) {
        if (options.signal.aborted) {
            controller.abort();
        } else {
            options.signal.addEventListener('abort', () => controller.abort(), { once: true });
        }
    }
    
    try {
        const res = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                ...(options.headers || {})
            }
        });
        clearTimeout(timer);
        if (!res.ok) {
            const errBody = await res.text().catch(() => '');
            throw new Error(`API error ${res.status}: ${errBody || res.statusText}`);
        }
        return await res.json();
    } catch (err) {
        clearTimeout(timer);
        throw err;
    }
}
