/**
 * catalog.routes.js — Proxy endpoints to the Python catalog service (port 7801).
 * The frontend keeps hitting :3000/api/v1/* without knowing about the split.
 */
import express from 'express';
import http from 'http';
import https from 'https';
import { URL } from 'url';

const router = express.Router();
const CATALOG_UPSTREAM = process.env.CATALOG_UPSTREAM || 'http://127.0.0.1:7801';

function proxy(path) {
    return (req, res) => {
        // Use the full original URL so sub-paths (e.g. /collections/{slug}) are preserved.
        // Strip only the host prefix; keep query string.
        const url = new URL(CATALOG_UPSTREAM + req.originalUrl);
        const transport = url.protocol === 'https:' ? https : http;
        const opts = {
            method: req.method,
            headers: { ...req.headers, host: url.host },
        };
        const upstream = transport.request(url, opts, (upRes) => {
            res.status(upRes.statusCode || 502);
            for (const [k, v] of Object.entries(upRes.headers)) {
                if (typeof v === 'string') res.setHeader(k, v);
            }
            upRes.pipe(res);
        });
        upstream.on('error', (e) => {
            res.status(502).json({ error: 'catalog_upstream_error', detail: e.message, upstream: CATALOG_UPSTREAM });
        });
        // For GET, we don't need to pipe the request body.
        if (req.method === 'GET' || req.method === 'HEAD') {
            upstream.end();
        } else {
            req.pipe(upstream);
        }
    };
}

// Catalog endpoints — only the NEW multi-facet discovery endpoints go through
// the proxy. Existing /api/v1/genres, /api/v1/countries, /api/v1/languages
// continue to serve legacy shapes from the Node backend (so the existing
// frontend screens don't break).
const PATHS = [
    '/api/v1/categories',
    '/api/v1/home',
    '/api/v1/catalog/health',
    '/api/v1/genres',
    '/api/v1/countries',
    '/api/v1/languages',
    '/api/v1/stats',
    '/api/v1/collections',
    '/api/v1/years',
    '/api/v1/sources',
    '/api/v1/audience-tags',
    '/api/v1/surprise',
    '/api/v1/titles',
    '/api/v1/titles/movies',
    '/api/v1/titles/tv',
    '/api/v1/titles/anime',
    '/api/v1/titles/short-dramas',
    '/api/v1/titles/trending',
    '/api/v1/titles/top-rated',
    '/api/v1/titles/latest',
    '/api/v1/titles/coming-soon',
    '/api/v1/search',
    '/api/v1/genres-catalog',
    '/api/v1/countries-catalog',
    '/api/v1/languages-catalog',
    '/api/v1/sitemap.xml',
    '/api/v1/dub/download',
    '/api/v1/dub/stream',
    '/api/v1/blogs',
    '/health',
];
// Generated SVG poster / backdrop endpoints (no sub-path so list them separately)
const POSTER_PATHS = [
    '/api/v1/poster/',
    '/api/v1/backdrop/',
];
// Detail-by-slug routes — collection / genre / country detail pages
const DETAIL_PATHS = [
    '/api/v1/collections/',
    '/api/v1/genres/',
    '/api/v1/countries/',
    '/api/v1/languages/',
    '/api/v1/blogs/',
];
for (const p of PATHS) {
    router.get(p, proxy(p));
}
// Generated SVG poster/backdrop — only numeric ids allowed
for (const base of POSTER_PATHS) {
    router.get(base + ':id', (req, res, next) => {
        if (!/^\d+$/.test(req.params.id || '')) return next();
        return proxy(base)(req, res);
    });
}
// Detail-by-slug routes (collection/genre/country/language) — only GET, only short slugs
for (const base of DETAIL_PATHS) {
    router.get(base + ':slug', (req, res, next) => {
        const slug = (req.params.slug || '').trim();
        // Reject slugs with weird characters or that look like other sub-paths
        if (!slug || /[^a-zA-Z0-9_\-]/.test(slug)) return next();
        return proxy(base)(req, res);
    });
}
// Detail routes with sub-paths need wildcard matching
// Phase 2-15: includes /seasons, /availability, /translations, /cast, /assets, /season/:num/episodes
router.get(/^\/api\/v1\/title\/[^/]+.*$/, (req, res) => {
    const upstreamUrl = CATALOG_UPSTREAM + req.originalUrl;
    console.log(`[catalog-proxy] ${req.method} ${req.originalUrl} -> ${upstreamUrl}`);
    const url = new URL(upstreamUrl);
    const transport = url.protocol === 'https:' ? https : http;
    const upstream = transport.request(url, { method: req.method }, (upRes) => {
        res.status(upRes.statusCode || 502);
        for (const [k, v] of Object.entries(upRes.headers)) {
            if (typeof v === 'string') res.setHeader(k, v);
        }
        upRes.pipe(res);
    });
    upstream.on('error', (e) => {
        console.error(`[catalog-proxy] error: ${e.message}`);
        res.status(502).json({ error: 'catalog_upstream_error', detail: e.message });
    });
    upstream.on('timeout', () => {
        upstream.destroy(new Error('upstream timeout'));
    });
    upstream.end();
});

export default router;