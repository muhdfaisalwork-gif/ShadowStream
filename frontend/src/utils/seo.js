/**
 * seo.js — Per-route SEO meta updater.
 * Sets document.title, meta description, and Open Graph tags based on the
 * current screen and its dynamic params (e.g. title name on TitleDetail).
 *
 * Works in React Native Web by writing directly to document.head. SSR is
 * not used in this Expo Web build, so dynamic updates via JS is the only
 * path; for production SEO at scale, a Next.js front-end would be needed.
 */

const DEFAULT_TITLE = 'ShadowStream - Cinematic Movie & TV Discovery Platform';
const DEFAULT_DESCRIPTION = 'ShadowStream is a global catalog of lawfully available movies, TV series, anime, and short dramas. Browse by genre, country, language, year, and dub.';
const SITE_NAME = 'ShadowStream';
const CANONICAL_BASE = 'https://ssmoviestvs.site';

function upsertMeta(selector, attr, value) {
    if (typeof document === 'undefined') return;
    let el = document.head.querySelector(selector);
    if (!el) {
        el = document.createElement(
            selector.startsWith('link[') ? 'link' : 'meta'
        );
        if (!selector.startsWith('link[')) {
            const [, key, val] = selector.match(/meta\[(\w+)="([^"]+)"\]/) || [];
            if (key) el.setAttribute(key, val);
        }
        document.head.appendChild(el);
    }
    el.setAttribute(attr, value);
}

function upsertLink(rel, href) {
    if (typeof document === 'undefined') return;
    let el = document.head.querySelector(`link[rel="${rel}"]`);
    if (!el) {
        el = document.createElement('link');
        el.setAttribute('rel', rel);
        document.head.appendChild(el);
    }
    el.setAttribute('href', href);
}

/**
 * Inject JSON-LD structured data for the current screen.
 * Replaces any previous __STREAMING_JSONLD__ script. Per spec §42.
 */
function upsertJsonLd(payload) {
    if (typeof document === 'undefined') return;
    const id = '__STREAMING_JSONLD__';
    let el = document.getElementById(id);
    if (!el) {
        el = document.createElement('script');
        el.type = 'application/ld+json';
        el.id = id;
        document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(payload);
}

function clearJsonLd() {
    if (typeof document === 'undefined') return;
    const el = document.getElementById('__STREAMING_JSONLD__');
    if (el) el.textContent = '';
}

function ensureBaseTags() {
    if (typeof document === 'undefined') return;
    upsertMeta('meta[name="description"]', 'content', DEFAULT_DESCRIPTION);
    upsertMeta('meta[name="keywords"]', 'content',
        'streaming, movies, TV shows, anime, short dramas, K-drama, Bollywood, Nollywood, Korean cinema, Pakistani dramas');
    upsertMeta('meta[property="og:site_name"]', 'content', SITE_NAME);
    upsertMeta('meta[property="og:type"]', 'content', 'website');
    upsertMeta('meta[name="twitter:card"]', 'content', 'summary_large_image');
}

/**
 * Set the document title and matching meta tags for the current screen.
 * @param {string} screen — route name (e.g. 'Movies', 'TitleDetail')
 * @param {object} params — dynamic params (e.g. { title, year, type })
 */
export function setRouteMeta(screen, params) {
    if (typeof document === 'undefined') return;

    // Support object-first invocation: useRouteMeta({ title, description, url, keywords, schema })
    if (typeof screen === 'object' && screen !== null) {
        ensureBaseTags();
        const obj = screen;
        const title = obj.title || DEFAULT_TITLE;
        const description = obj.description || DEFAULT_DESCRIPTION;
        const canonical = obj.url || obj.canonical || `${CANONICAL_BASE}/`;
        document.title = title;
        upsertMeta('meta[name="description"]', 'content', description);
        if (obj.keywords) {
            upsertMeta('meta[name="keywords"]', 'content', obj.keywords);
        }
        upsertMeta('meta[property="og:title"]', 'content', title);
        upsertMeta('meta[property="og:description"]', 'content', description);
        upsertMeta('meta[name="twitter:title"]', 'content', title);
        upsertMeta('meta[name="twitter:description"]', 'content', description);
        upsertLink('canonical', canonical);
        upsertMeta('meta[property="og:url"]', 'content', canonical);
        if (obj.schema) {
            upsertJsonLd(obj.schema);
        }
        return;
    }

    const safeParams = params || {};
    ensureBaseTags();

    let title = DEFAULT_TITLE;
    let description = DEFAULT_DESCRIPTION;
    let canonical = `${CANONICAL_BASE}/`;

    switch (screen) {
        case 'Blogs':
            title = 'Showbiz & Entertainment Editorial Guides | ShadowStream';
            description = 'In-depth film criticism, streaming release previews, box office analysis, and curated watch guides across Hollywood, anime, and international cinema.';
            canonical = `${CANONICAL_BASE}/blogs`;
            upsertJsonLd({
                '@context': 'https://schema.org',
                '@type': 'CollectionPage',
                name: 'ShadowStream Editorial & Showbiz Guides',
                url: canonical,
                description: description,
                isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: CANONICAL_BASE + '/' }
            });
            break;
        case 'BlogDetail': {
            const b = safeParams.blog || safeParams;
            const bTitle = b.title || 'Editorial Guide';
            const bDesc = b.meta_description || b.description || 'In-depth cinematic guide and streaming analysis.';
            const bSlug = b.slug || safeParams.slug || '';
            title = `${bTitle} | ShadowStream Showbiz`;
            description = bDesc;
            canonical = bSlug ? `${CANONICAL_BASE}/blog/${bSlug}` : `${CANONICAL_BASE}/blogs`;
            if (b.schema) {
                upsertJsonLd(b.schema);
            }
            break;
        }
        case 'Home':
            title = 'ShadowStream - Discover Movies, TV, Anime & Short Dramas';
            description = 'Browse 13,000+ lawfully catalogued titles across movies, TV series, anime, and short dramas. Free exploration, no account required.';
            canonical = `${CANONICAL_BASE}/`;
            break;
        case 'Movies':
            title = 'Movies Hub - ShadowStream';
            description = 'Movies sorted by popularity, year, genre, country, and language. Hollywood, Bollywood, Korean, Japanese, Chinese, French, and more.';
            canonical = `${CANONICAL_BASE}/movies`;
            break;
        case 'TV':
            title = 'TV Series Hub - ShadowStream';
            description = 'Television series from Korea, China, Pakistan, Turkey, India, UK, US, and Japan. Complete with season and episode breakdowns.';
            canonical = `${CANONICAL_BASE}/tv`;
            break;
        case 'Anime':
            title = 'Anime Ecosystem - ShadowStream';
            description = 'Anime series and films with English, Hindi, and Arabic dubs and localized subtitles.';
            canonical = `${CANONICAL_BASE}/anime`;
            break;
        case 'ShortDramas':
            title = 'Short Dramas - ShadowStream';
            description = 'Vertical short dramas: billionaire, revenge, romance, historical, family, action — Chinese, Korean, and Hindi originals.';
            canonical = `${CANONICAL_BASE}/short-dramas`;
            break;
        case 'Genres':
            title = 'Browse by Genre - ShadowStream';
            description = 'Action, Drama, Comedy, Thriller, Horror, Romance, Sci-Fi, Fantasy, Crime, Documentary, Animation, and more.';
            canonical = `${CANONICAL_BASE}/genres`;
            break;
        case 'Countries':
            title = 'Browse by Country - ShadowStream';
            description = 'Cinema from 42+ countries: Hollywood, Bollywood, Korean, Japanese, Nigerian, Turkish, Egyptian, Pakistani, Chinese, and more.';
            canonical = `${CANONICAL_BASE}/countries`;
            break;
        case 'Languages':
            title = 'Browse by Language - ShadowStream';
            description = 'Titles in 12+ languages: English, Hindi, Urdu, Arabic, French, Indonesian, Filipino, Korean, Chinese, Japanese, Thai, Turkish, Spanish.';
            canonical = `${CANONICAL_BASE}/languages`;
            break;
        case 'Collections':
            title = 'Collections & Franchises - ShadowStream';
            description = '68 curated cinematic universes and franchises: Marvel, DC, Star Wars, Harry Potter, Studio Ghibli, and more.';
            canonical = `${CANONICAL_BASE}/collections`;
            break;
        case 'Watchlist':
            title = 'My Watchlist - ShadowStream';
            description = 'Titles you have saved to watch later.';
            canonical = `${CANONICAL_BASE}/watchlist`;
            break;
        case 'History':
            title = 'Watch History - ShadowStream';
            description = 'Continue where you left off across movies, TV series, anime, and short dramas.';
            canonical = `${CANONICAL_BASE}/history`;
            break;
        case 'Search':
            title = 'Search - ShadowStream';
            description = 'Search across 13,000+ titles by name, genre, country, language, year, rating, and content type.';
            canonical = `${CANONICAL_BASE}/search`;
            break;
        case 'Settings':
            title = 'Settings - ShadowStream';
            description = 'ShadowStream preferences and configuration.';
            canonical = `${CANONICAL_BASE}/settings`;
            break;
        case 'TitleDetail': {
            const t = safeParams.title || safeParams.item?.title || 'Title';
            const year = safeParams.year || safeParams.item?.year || '';
            const type = safeParams.type || safeParams.item?.type || 'title';
            const overview = safeParams.overview || safeParams.item?.overview || '';
            const rating = safeParams.rating || safeParams.item?.rating;
            const slug = safeParams.slug || safeParams.item?.slug || safeParams.id || '';
            const poster = safeParams.poster || safeParams.item?.poster || '';
            const runtime = safeParams.runtime || safeParams.item?.runtime;
            const genres = safeParams.genres || safeParams.item?.genres || [];
            const typeLabel = type === 'tv' ? 'TV Series'
                : type === 'anime' ? 'Anime'
                : type === 'short_drama' ? 'Short Drama'
                : 'Movie';
            title = `${t}${year ? ` (${year})` : ''} - ${typeLabel} | ShadowStream`;
            description = overview
                ? `${overview.slice(0, 220)}${overview.length > 220 ? '…' : ''}`
                : `${t}${year ? ` (${year})` : ''} - ${typeLabel} on ShadowStream. ${rating ? `Rated ${Number(rating).toFixed(1)}.` : ''}`;
            canonical = slug ? `${CANONICAL_BASE}/${type === 'tv' ? 'tv' : type === 'anime' ? 'anime' : type === 'short_drama' ? 'short-drama' : 'movie'}/${slug}` : CANONICAL_BASE;

            // JSON-LD structured data (§42). Schema.org types: Movie, TVSeries, etc.
            const schemaType = type === 'tv' ? 'TVSeries'
                : type === 'anime' ? 'TVSeries'   // anime schema inherits from TVSeries
                : type === 'short_drama' ? 'Movie'
                : 'Movie';
            const jsonLd = {
                '@context': 'https://schema.org',
                '@type': schemaType,
                name: t,
                url: canonical,
                description: overview || description,
                image: poster || undefined,
                datePublished: year ? `${year}-01-01` : undefined,
                genre: Array.isArray(genres) ? genres.map(g => g.name || g).filter(Boolean) : undefined,
                aggregateRating: rating ? {
                    '@type': 'AggregateRating',
                    ratingValue: Number(rating).toFixed(1),
                    bestRating: '10',
                    worstRating: '1'
                } : undefined
            };
            if (runtime) {
                jsonLd.duration = `PT${Math.round(runtime)}M`;
            }
            // Strip undefined keys for clean output
            Object.keys(jsonLd).forEach(k => jsonLd[k] === undefined && delete jsonLd[k]);
            upsertJsonLd(jsonLd);
            break;
        }
        case 'CollectionDetail': {
            const c = params.name || params.collection?.name || 'Collection';
            const desc = params.description || params.collection?.description || '';
            const slug = params.slug || params.collection?.slug || '';
            const count = params.count || params.collection?.count;
            title = `${c} - Collection | ShadowStream`;
            description = desc ? `${desc.slice(0, 200)}…` : `Explore the ${c} collection on ShadowStream.`;
            canonical = slug ? `${CANONICAL_BASE}/collection/${slug}` : CANONICAL_BASE;
            if (slug) {
                upsertJsonLd({
                    '@context': 'https://schema.org',
                    '@type': 'CollectionPage',
                    name: c,
                    url: canonical,
                    description: description,
                    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: CANONICAL_BASE + '/' }
                });
            }
            break;
        }
        case 'GenreScreen':
        case 'CountryDetail': {
            const n = params.name || 'Browse';
            const slug = params.slug || params.code || '';
            title = `${n} - Browse | ShadowStream`;
            description = `Titles from ${n} on ShadowStream.`;
            canonical = slug ? `${CANONICAL_BASE}/${screen === 'GenreScreen' ? 'genre' : 'country'}/${slug}` : CANONICAL_BASE;
            if (slug) {
                upsertJsonLd({
                    '@context': 'https://schema.org',
                    '@type': 'CollectionPage',
                    name: n + (screen === 'GenreScreen' ? ' — Genre' : ' — Country'),
                    url: canonical,
                    description: description,
                    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: CANONICAL_BASE + '/' }
                });
            }
            break;
        }
        case 'Player': {
            const pTitle = safeParams.title || 'Watch Stream';
            title = `${pTitle} | ShadowStream`;
            description = `Stream ${pTitle} in high definition on ShadowStream.`;
            canonical = safeParams.slug ? `${CANONICAL_BASE}/play/${safeParams.slug}` : `${CANONICAL_BASE}/`;
            break;
        }
        default:
            title = safeParams.title || DEFAULT_TITLE;
            description = safeParams.description || DEFAULT_DESCRIPTION;
            canonical = `${CANONICAL_BASE}/`;
            clearJsonLd();
    }

    document.title = title;
    upsertMeta('meta[name="description"]', 'content', description);
    upsertMeta('meta[property="og:title"]', 'content', title);
    upsertMeta('meta[property="og:description"]', 'content', description);
    upsertMeta('meta[name="twitter:title"]', 'content', title);
    upsertMeta('meta[name="twitter:description"]', 'content', description);
    upsertLink('canonical', canonical);
    upsertMeta('meta[property="og:url"]', 'content', canonical);
}

export function resetMeta() {
    if (typeof document === 'undefined') return;
    setRouteMeta('Home');
}
