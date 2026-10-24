/*
 * ShadowStream service worker.
 *
 * IMPORTANT — navigations are NETWORK-FIRST, not cache-first.
 *
 * The shell is an Expo web export, so index.html points at a content-hashed
 * bundle like index-<hash>.js. When a deploy ships a new bundle the old hash
 * disappears. Serving a cached index.html therefore references a bundle that
 * is no longer there, that request 404s, and the visitor gets a white screen.
 * That is exactly what happened: a `shadowstream-shell-v1` cache was pinning a
 * stale index.html, the version was never bumped, and every returning visitor
 * kept the broken shell while first-time visitors saw a working site.
 *
 * Network-first for navigations means a deploy is picked up immediately, and
 * the cache only covers genuinely offline use. Content-hashed bundles stay
 * cache-first because their URL changes whenever the content does.
 *
 * Bump VERSION on every deploy so old shells are purged on activate.
 *
 * Other tiers are unchanged: catalogue JSON is stale-while-revalidate, and
 * stream/embed/resolver URLs are never cached — a cached dead mirror is worse
 * than a visible network error the player can retry.
 */

const VERSION = 'v31';
const SHELL_CACHE = `shadowstream-shell-${VERSION}`;
const STATIC_CACHE = `shadowstream-static-${VERSION}`;
const CATALOG_CACHE = `shadowstream-catalog-${VERSION}`;

const SHELL_ASSETS = [
    '/',
    '/index.html',
    '/offline.html',
    '/manifest.webmanifest',
    '/featured.json',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
    '/apple-touch-icon.png',
    '/favicon.ico',
];

const CATALOG_ORIGINS = [
    'https://streamapp-catalog.muhd-faisal-work.workers.dev',
];


self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches
            .open(SHELL_CACHE)
            .then((cache) => cache.addAll(SHELL_ASSETS))
            .catch(() => undefined)
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) =>
                Promise.all(
                    keys
                        .filter((k) => k.startsWith('shadowstream-') && !k.endsWith(VERSION))
                        .map((k) => caches.delete(k))
                )
            )
            .then(() => self.clients.claim())
    );
});

/**
 * Catalog endpoints are filtered heavily (country, type, genre, year, page,
 * audio_language, etc.). The query string IS the filter, so the cache key
 * must include it — otherwise the first response for /api/v1/titles is
 * served for every subsequent country/language/genre call. Use the full
 * Request as the cache key (Cache.match/put on a Request keys on URL +
 * method + headers, which gives us query-string fidelity for free).
 *
 * Endpoints that mutate the body (resolve, stream, .m3u8/.ts/.mp4) are
 * filtered out earlier with the network-only branch, so they never reach
 * this cache.
 */

function isCatalog(request, url) {
    if (request.method !== 'GET') return false;
    if (request.mode === 'navigate') return false;
    if (url.pathname.startsWith('/api/')) return true;
    return CATALOG_ORIGINS.includes(url.origin);
}

function isStaticBundle(url) {
    return url.origin === self.location.origin && url.pathname.startsWith('/_expo/static/');
}

self.addEventListener('fetch', (event) => {
    const request = event.request;

    // Never interfere with anything but plain GETs.
    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    // Tier 3: network-only. Never cache stream, embed or resolver traffic.
    if (
        url.pathname === '/sw.js' ||
        url.pathname.startsWith('/api/v1/resolve') ||
        url.pathname.startsWith('/stream/resolve') ||
        url.pathname.startsWith('/health/providers') ||
        url.pathname.startsWith('/version.json') ||
        url.pathname.startsWith('/api/v1/version.json') ||
        url.pathname.startsWith('/app-version') ||
        url.pathname.startsWith('/api/v1/app-version') ||
        url.pathname.startsWith('/latest.yml') ||
        /\.(m3u8|ts|m4s|mp4|webm|mkv|apk|exe|zip|dmg)(\?|$)/i.test(url.pathname) ||
        url.pathname.startsWith('/downloads')
    ) {
        return;
    }

    // Tier 1: navigations — NETWORK-FIRST.
    //
    // A cached index.html pins a bundle hash that a new deploy has already
    // replaced, so the app 404s its own JS and the visitor sees a white
    // screen. Going to the network first costs one request and makes deploys
    // take effect immediately; the cache is the offline fallback only.
    if (request.mode === 'navigate' || url.pathname === '/' || url.pathname === '/index.html') {
        event.respondWith(
            fetch(new Request(request, { cache: 'no-store' }))
                .then((res) => {
                    if (res && res.ok) {
                        const copy = res.clone();
                        caches.open(SHELL_CACHE).then(c => c.put('/index.html', copy)).catch(() => {});
                    }
                    return res;
                })
                .catch(async () => {
                    const cache = await caches.open(SHELL_CACHE);
                    return (await cache.match('/index.html'))
                        || (await cache.match('/'))
                        || (await cache.match('/offline.html'))
                        || new Response('Offline', {
                            status: 503,
                            headers: { 'Content-Type': 'text/plain' },
                        });
                })
        );
        return;
    }

    // Tier 2b: content-hashed bundle, cache-first (immutable).
    if (isStaticBundle(url)) {
        event.respondWith(
            caches.open(STATIC_CACHE).then(async (cache) => {
                const hit = await cache.match(request);
                if (hit) return hit;
                try {
                    const res = await fetch(request);
                    if (res && res.ok) cache.put(request, res.clone());
                    return res;
                } catch (_) {
                    return hit || Response.error();
                }
            })
        );
        return;
    }

    // Tier 2a: Seasons endpoints — NETWORK-FIRST.
    // Never serve stale or empty seasons caches to visitors.
    if (url.pathname.includes('/seasons')) {
        event.respondWith(
            fetch(request)
                .then((res) => {
                    if (res && res.ok) {
                        const copy = res.clone();
                        caches.open(CATALOG_CACHE).then((cache) => cache.put(request, copy));
                    }
                    return res;
                })
                .catch(() => caches.match(request).then((hit) => hit || offlineFallback()))
        );
        return;
    }

    // Tier 2b: catalog JSON, stale-while-revalidate.
    // Key on the full Request (URL + method + headers), NOT a normalised
    // origin+pathname, so country/language/genre/page filters don't share
    // cache entries. The 200 responses here are immutable-from-the-client's-
    // perspective snapshots of R2 files, so a stale hit during revalidation is
    // fine; new query strings always hit the network.
    if (isCatalog(request, url)) {
        event.respondWith(
            caches.open(CATALOG_CACHE).then(async (cache) => {
                const hit = await cache.match(request);
                const network = fetch(request)
                    .then((res) => {
                        if (res && res.ok) cache.put(request, res.clone());
                        return res;
                    })
                    .catch(() => null);
                return hit || network.then((res) => res || offlineFallback());
            })
        );
        return;
    }

    // Everything else same-origin: stale-while-revalidate into the shell cache.
    if (url.origin === self.location.origin) {
        event.respondWith(
            caches.open(SHELL_CACHE).then(async (cache) => {
                const hit = await cache.match(request);
                const network = fetch(request)
                    .then((res) => {
                        if (res && res.ok) cache.put(request, res.clone());
                        return res;
                    })
                    .catch(() => null);
                return hit || network.then((res) => res || Response.error());
            })
        );
    }
});

function offlineFallback() {
    return new Response(JSON.stringify({ error: 'offline', message: 'Catalog unavailable offline.' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
    });
}
