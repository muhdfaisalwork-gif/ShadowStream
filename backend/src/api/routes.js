import express from 'express';
import { MovieBoxScraper } from '../scrapers/MovieBoxScraper.js';
import { LegalCatalogScraper } from '../scrapers/LegalCatalogScraper.js';
import { CatalogEnricher } from '../scrapers/CatalogEnricher.js';
import { AggregatorScraper } from '../scrapers/AggregatorScraper.js';
import { ScrapyFeedScraper } from '../scrapers/ScrapyFeedScraper.js';
import { UflixHtmlScraper } from '../scrapers/UflixHtmlScraper.js';
import { liveClient } from '../services/LiveClient.js';

const router = express.Router();

// Primary: Multi-source playback failover pool (VidSrc + 2Embed + Vidlink)
// Live: Python FastAPI micro-service on :7800 (Scrapling + Patchright 10-source scraper)
// Optional: per-site Playwright scrapers (enabled via ENABLED_SOURCES env)
// Fallback: Legal-only public-domain catalog (Blender + Archive.org + NASA)
const enricher = new CatalogEnricher();
const movieBox = new MovieBoxScraper();
const aggregator = new AggregatorScraper();
const scrapyFeed = new ScrapyFeedScraper();
const uflixHtml = new UflixHtmlScraper();
const legalCatalog = new LegalCatalogScraper();

const scrapers = [
    movieBox,
    aggregator,
    scrapyFeed,
    uflixHtml,       // live uflix HTML scrape — server-rendered, no SPA
    legalCatalog
];

// Warm the live caches at startup so first request isn't slow.
let liveWarmupPromise = null;
function warmLive() {
    if (liveWarmupPromise) return liveWarmupPromise;
    liveWarmupPromise = (async () => {
        console.log('[startup] warming live services (uflix + Python scraper :7800)...');
        const tasks = [
            liveClient.init()
                .then(ok => console.log(`[startup] LiveClient probe: ${ok ? 'online' : 'offline'}`))
                .catch(e => console.error('[startup] LiveClient probe failed:', e.message)),
            uflixHtml.fetchListings(4)
                .then(n => console.log(`[startup] uflix warm: ${n.length} listings`))
                .catch(e => console.error('[startup] uflix warm failed:', e.message))
        ];
        await Promise.allSettled(tasks);
    })();
    return liveWarmupPromise;
}
setImmediate(warmLive);

const ALL_GENRES = [
    'Action', 'Adventure', 'Animation', 'Biography', 'Comedy', 'Crime',
    'Drama', 'Fantasy', 'Horror', 'Music', 'Mystery', 'Romance',
    'Sci-Fi', 'Thriller', 'Documentary', 'Family', 'History', 'War'
];

const FALLBACK_POSTER = 'https://image.tmdb.org/t/p/w500/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg';

function sanitizeResults(results) {
    if (!Array.isArray(results)) return [];
    return results.filter(item => {
        if (!item || !item.title) return false;
        if (typeof item.title === 'string' && item.title.includes('Volume ')) return false;
        if (!item.tmdbId && !item.imdbId && (!item.streams || item.streams.length === 0)) return false;
        return true;
    }).map(item => {
        let poster = item.poster;
        if (!poster || !poster.startsWith('http') || poster.includes('_pk.jpg') || poster.includes('_tr.jpg') || poster.includes('_eg.jpg') || poster.includes('welad') || poster.includes('hashashin') || poster.includes('sang_e_mah') || poster.includes('/movies/poster/')) {
            poster = FALLBACK_POSTER;
        }
        let backdrop = item.backdrop;
        if (!backdrop || !backdrop.startsWith('http') || backdrop.includes('_pk.jpg')) {
            backdrop = poster;
        }
        return {
            ...item,
            poster,
            backdrop,
            durationMinutes: item.durationMinutes || item.runtime || 120
        };
    });
}

// (The /health route is registered below with the more detailed payload — see line ~279)

// Country buckets — curated TMDB/IMDb IDs grouped by origin language/country
// Each bucket acts like a "Country" filter on moviebox.ph (Korean Cinema, Bollywood, etc.)
// IDs verified against the actual catalog. Buckets with 0 matching titles are auto-suppressed.
const COUNTRY_BUCKETS = {
    'all':        { code: 'ALL', flag: '🌍', label: 'All Countries' },
    'hollywood':  { code: 'US',  flag: '🇺🇸', label: 'Hollywood / USA',
                    ids: ['shawshank-redemption-1994','the-godfather-1972','the-dark-knight-2008','forrest-gump-1994','fight-club-1999','pulp-fiction-1994','the-matrix-1999','inception-2010','interstellar-2014','se7en-1995','apocalypse-now-1979','toy-story-1995','star-wars-1977','terminator-2-1991','the-shining-1980','braveheart-1995','gladiator-2000','goodfellas-1990','joker-2019','django-unchained-2012','the-departed-2006','the-avengers-2012','avengers-infinity-war-2018','avengers-endgame-2019','black-panther-2018','black-panther-2-2022','the-batman-2022','frozen-2013','zootopia-2016','moana-2016','incredibles-2-2018','cars-2006','cars-3-2017','monsters-inc-2001','monsters-university-2013','up-2009','wall-e-2008','ratatouille-2007','finding-nemo-2003','the-wolf-of-wall-street-2013','catch-me-if-you-can-2002','shutter-island-2010','the-prestige-2006','memento-2000','gone-girl-2014','the-social-network-2010','there-will-be-blood-2007','the-hateful-eight-2015','once-upon-hollywood-2019','kill-bill-1-2003','kill-bill-2-2004','reservoir-dogs-1992','jackie-brown-1997','black-swan-2010','drive-2011','sicario-2015','blade-runner-2049-2017','mad-max-fury-road-2015','dune-2021','hereditary-2018','the-witch-2015','get-out-2017','us-2019','a-quiet-place-2018','the-conjuring-2013','it-2017','the-babadook-2014','the-exorcist-1973','psycho-1960','free-solo-2018','the-last-dance-2020','amy-2015','bohemian-rhapsody-2018','rocketman-2019','whiplash-2014','la-la-land-2016'] },
    'bollywood':  { code: 'IN',  flag: '🇮🇳', label: 'Bollywood / India',
                    ids: ['jawan-2023','pathaan-2023','dangal-2016','3-idiots-2009','lagaan-2001','pk-2014','sultan-2016','bajrangi-bhaijaan-2015','andhadhun-2018','sholay-1975','gangs-of-wasseypur-2012','gangs-of-wasseypur-2-2012','andhadhun-2018b','drishyam-2015','padmaavat-2018','drishyam-2-2022','rrr-2022','kantara-2022','kantara-2-2025','shershaah-2021','shershaah-2','brahmastra-2022','stree-2018','stree-2-2024','chhichhore-2019','83-2021','tumbbad-2018','swades-2004','rang-de-basanti-2006','barfi-2012','queen-2014','highway-2014','raazi-2018','don-2006','raees-2017','bhool-bhulaiyaa-2007','luka-chuppi-2019','badhaai-ho-2018','sardar-udham-2021','sam-bahadur-2023','masaan-2015','talvar-2015','neerja-2016','simmba-2018','uri-2019','gully-boy-2019','badla-2019','chameli-2003','black-friday-2007','manjhi-mountain-man-2015','pink-2016','talvar-2015','article-15-2019','mulk-2018','no-one-killed-jessica-2011','shootout-lokhandwala-2007','once-upon-mumbai-2010','d-day-2013','bhaag-milkha-2013','mary-kom-2014'] },
    'pakistani':  { code: 'PK',  flag: '🇵🇰', label: 'Pakistani Cinema & Serials',
                    ids: ['bin-roye-2015','wrong-no-2015','teefa-in-trouble-2018','manto-2015-pk','load-shedding-2010','naam-i-mumkin-2019','sultanat-2014-pk','quaid-e-azam-zindabad-2022','london-nahi-jaunga-2022','pareesa-2023'] },
    'korean':     { code: 'KR',  flag: '🇰🇷', label: 'Korean Cinema & K-Dramas',
                    ids: ['parasite-2019','oldboy-2003','train-to-busan-2016','handmaiden-2016','burning-2018','memories-of-murder-2003','decision-to-leave-2022','spring-summer-fall-winter-2003','minari-2020','snowpiercer-2013','the-man-from-nowhere-2010','i-saw-the-devil-2010','a-bittersweet-life-2005','joint-security-area-2000','poetry-2010','the-good-the-bad-the-weird-2008','castaway-on-the-moon-2009','the-chaser-2008','the-host-2006','a-tale-of-two-sisters-2003'] },
    'turkish':    { code: 'TR',  flag: '🇹🇷', label: 'Turkish Cinema & Diziler',
                    ids: [] },
    'nigerian':   { code: 'NG',  flag: '🇳🇬', label: 'Nollywood / Nigeria',
                    ids: [] },
    'egyptian':   { code: 'EG',  flag: '🇪🇬', label: 'Egyptian & Arab Musalsalat',
                    ids: [] },
    'indonesian': { code: 'ID',  flag: '🇮🇩', label: 'Indonesian Cinema & Sinetron',
                    ids: [] },
    'filipino':   { code: 'PH',  flag: '🇵🇭', label: 'Filipino Cinema & Teleseryes',
                    ids: [] },
    'mexican':    { code: 'MX',  flag: '🇲🇽', label: 'Mexican Cinema & Telenovelas',
                    ids: [] },
    'brazilian':  { code: 'BR',  flag: '🇧🇷', label: 'Brazilian Cinema & Telenovelas',
                    ids: [] },
    'iranian':    { code: 'IR',  flag: '🇮🇷', label: 'Iranian Cinema & Series',
                    ids: [] },
    'japanese':   { code: 'JP',  flag: '🇯🇵', label: 'Japanese Cinema & Anime',
                    ids: ['spirited-away-2001','princess-mononoke-1997','totoro-1988','howl-2004','akira-1988','drive-my-car-2021','shoplifters-2018','battle-royale-2000','sonatine-1993','hana-bi-1997','ringu-1998','dark-water-2002','house-1977','jujutsu-kaisen-0-2021','demon-slayer-mugen-train-2020','one-piece-film-red-2022','weathering-with-you-2019','silent-voice-2016','maquia-2018','ponyo-2008','kiki-delivery-1989','the-wind-rises-2013','5-centimeters-per-second-2007','the-cat-returns-2002','arrietty-2010','wolf-children-2012','paprika-2006','tokyo-godfathers-2003','millennium-actress-2001','perfect-blue-1997','the-red-turtle-2016','song-of-the-sea-2014'] },
    'chinese':    { code: 'CN',  flag: '🇨🇳', label: 'Chinese Cinema & C-Drama',
                    ids: ['hero-2002','house-flying-daggers-2004','crouching-tiger-2000','mood-for-love-2000','farewell-concubine-1993','chungking-express-1994','infernal-affairs-2002','police-story-1985'] },
    'british':    { code: 'GB',  flag: '🇬🇧', label: 'British Cinema & TV',
                    ids: ['doctor-who-2005','peaky-blinders-2013','the-crown-2016','1917-2019','dunkirk-2017','tenet-2020','ex-machina-2014','gravity-2013','imitation-game-2014','theory-of-everything-2014','notting-hill-1999','about-a-boy-2002','hot-fuzz-2007','28-days-later-2002','28-weeks-later-2007','casino-royale-2006','harry-potter-1-2001','127-hours-2010','dark-2017','shaun-of-the-dead-2004','love-actually-2003','skyfall-2012'] },
    'french':     { code: 'FR',  flag: '🇫🇷', label: 'French Cinema',
                    ids: ['intouchables-2011','amour-2012','the-artist-2011'] },
    'italian':    { code: 'IT',  flag: '🇮🇹', label: 'Italian Cinema',
                    ids: ['cinema-paradiso-1988','life-is-beautiful-1997','the-great-beauty-2013','la-strada-1954','il-postino-1994'] },
    'spanish':    { code: 'ES',  flag: '🇪🇸', label: 'Spanish Cinema & Series',
                    ids: ['pan-s-labyrinth-2006','the-others-2001','la-casa-de-papel-2017','narcos-2015'] },
    'german':     { code: 'DE',  flag: '🇩🇪', label: 'German Cinema & TV',
                    ids: ['dark-2017'] },
    'animation':  { code: 'ANIM', flag: '🎨', label: 'Animation Studios',
                    ids: ['spirited-away-2001','wall-e-2008','incredibles-2004','incredibles-2-2018','ratatouille-2007','finding-nemo-2003','toy-story-1995','toy-story-3-2010','toy-story-4-2019','princess-mononoke-1997','totoro-1988','howl-2004','akira-1988','frozen-2013','up-2009','cars-2006','monsters-inc-2001','zootopia-2016','moana-2016','silent-voice-2016','ponyo-2008','kiki-delivery-1989','the-wind-rises-2013','the-cat-returns-2002','arrietty-2010','wolf-children-2012','paprika-2006','tokyo-godfathers-2003','millennium-actress-2001','perfect-blue-1997','the-red-turtle-2016','song-of-the-sea-2014','jujutsu-kaisen-0-2021','demon-slayer-mugen-train-2020','one-piece-film-red-2022','weathering-with-you-2019','5-centimeters-per-second-2007'] },
    'horror':     { code: 'HORROR', flag: '👻', label: 'Horror',
                    ids: ['hereditary-2018','the-witch-2015','get-out-2017','us-2019','a-quiet-place-2018','the-conjuring-2013','it-2017','the-babadook-2014','the-exorcist-1973','psycho-1960','ringu-1998','dark-water-2002','house-1977','a-tale-of-two-sisters-2003','i-saw-the-devil-2010','28-days-later-2002','28-weeks-later-2007','the-shining-1980','the-others-2001'] },
    'thriller':   { code: 'THRILLER', flag: '🔪', label: 'Thriller / Crime',
                    ids: ['memento-2000','gone-girl-2014','shutter-island-2010','the-prestige-2006','se7en-1995','reservoir-dogs-1992','jackie-brown-1997','pulp-fiction-1994','kill-bill-1-2003','kill-bill-2-2004','drive-2011','sicario-2015','the-departed-2006','goodfellas-1990','the-hateful-eight-2015','django-unchained-2012','the-chaser-2008','i-saw-the-devil-2010','the-man-from-nowhere-2010','memories-of-murder-2003','decision-to-leave-2022','d-day-2013','talvar-2015','article-15-2019'] },
    'documentary': { code: 'DOC', flag: '📹', label: 'Documentary',
                    ids: ['free-solo-2018','the-last-dance-2020','amy-2015','our-planet-2019'] },
    'music':      { code: 'MUSIC', flag: '🎵', label: 'Music & Concert',
                    ids: ['bohemian-rhapsody-2018','rocketman-2019','whiplash-2014','la-la-land-2016','amy-2015'] },
    'classic':    { code: 'CLASSIC', flag: '🎞️', label: 'Classic Cinema (pre-1990)',
                    ids: ['the-godfather-1972','apocalypse-now-1979','star-wars-1977','terminator-2-1991','the-shining-1980','la-strada-1954','psycho-1960','the-exorcist-1973','halloween-1978','police-story-1985'] },
    'scifi':      { code: 'SCIFI', flag: '🚀', label: 'Sci-Fi & Fantasy',
                    ids: ['the-matrix-1999','inception-2010','interstellar-2014','blade-runner-2049-2017','mad-max-fury-road-2015','dune-2021','star-wars-1977','terminator-2-1991','snowpiercer-2013','battle-royale-2000','the-host-2006','stranger-things-2016','black-mirror-2011','the-mandalorian-2019','severance-2022','house-of-the-dragon-2022','the-last-of-us-2023','dark-2017','arcane-2021'] },
    'romance':    { code: 'ROMANCE', flag: '💕', label: 'Romance',
                    ids: ['mood-for-love-2000','notting-hill-1999','about-a-boy-2002','highway-2014','barfi-2012','queen-2014','raazi-2018','bin-roye-2015','wolf-children-2012','silent-voice-2016','ponyo-2008','5-centimeters-per-second-2007','la-la-land-2016'] },
    'family':     { code: 'FAMILY', flag: '👨‍👩‍👧', label: 'Family / Kids',
                    ids: ['spirited-away-2001','kiki-delivery-1989','ponyo-2008','the-cat-returns-2002','arrietty-2010','frozen-2013','moana-2016','zootopia-2016','finding-nemo-2003','toy-story-1995','toy-story-3-2010','toy-story-4-2019','cars-2006','cars-3-2017','up-2009','wall-e-2008','incredibles-2-2018','monsters-inc-2001','harry-potter-1-2001'] },
    'superhero':  { code: 'HERO', flag: '🦸', label: 'Superhero',
                    ids: ['the-avengers-2012','avengers-infinity-war-2018','avengers-endgame-2019','black-panther-2018','black-panther-2-2022','the-batman-2022','joker-2019','logan-2017','deadpool-2016','thor-ragnarok-2017','the-boys-2019','wandavision-2021','the-sandman-2022','arcane-2021'] },
};

router.get('/countries', async (req, res) => {
    try {
        const scraper = scrapers[0];
        const all = await scraper.search('');
        const allIds = new Set(all.map(m => m.id));

        // Aggregate live SQLite counts from Python :7800 (bounded 2s timeout)
        let liveCounts = {};
        try {
            liveCounts = await Promise.race([
                liveClient.getCountryCounts(),
                new Promise(r => setTimeout(() => r({}), 2000))
            ]);
        } catch (e) {}

        const liveTotal = liveClient.liveTitlesCached || 0;
        const liveUp = liveClient.liveAvailable;

        // Always show 'all' + the 8 high-traffic country buckets even when counts are 0.
        const ALWAYS_VISIBLE_CODES = new Set(['US', 'IN', 'PK', 'KR', 'TR', 'JP', 'GB', 'NG']);
        const countries = Object.entries(COUNTRY_BUCKETS)
            .map(([key, def]) => {
                const curatedCount = key === 'all'
                    ? all.length
                    : (def.ids ? def.ids.filter(id => allIds.has(id)).length : 0);
                const liveCount = key === 'all'
                    ? liveTotal
                    : (liveCounts[def.code] || liveCounts[def.code?.toUpperCase()] || 0);
                const totalCount = curatedCount + liveCount;
                const isAlways = key === 'all' || ALWAYS_VISIBLE_CODES.has(def.code);
                return { key, code: def.code, flag: def.flag, label: def.label, count: totalCount, alwaysVisible: isAlways };
            })
            .filter(c => c.alwaysVisible || c.count > 0);

        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
        res.json({ count: countries.length, countries, liveAvailable: liveUp, liveTitlesCached: liveTotal });
    } catch (error) {
        console.error('[countries] error:', error);
        res.status(500).json({ error: 'Failed to load countries' });
    }
});

// ==================== LIVE SCRAPER ROUTES (Python :7800) ====================
// Race a promise against a hard timeout so a stalled Python scraper never hangs the player.
const bounded = (promise, ms, fallback) => Promise.race([
    promise.catch(() => fallback),
    new Promise(r => setTimeout(() => r(fallback), ms))
]);

router.get('/live/search', async (req, res) => {
    const { q, genre, country, lang, language, page = '1', limit, pageSize } = req.query;
    const size = parseInt(pageSize || limit, 10) || 50;
    try {
        const data = await bounded(liveClient.search({
            q: typeof q === 'string' ? q : '',
            genre: typeof genre === 'string' ? genre : '',
            country: typeof country === 'string' ? country : '',
            language: typeof (language || lang) === 'string' ? (language || lang) : '',
            page: parseInt(page, 10) || 1,
            pageSize: size
        }), 3000, { results: [], sources: [], live: false });
        res.json(data);
    } catch (error) {
        console.error('[live/search] error:', error);
        res.status(500).json({ error: 'Live search failed', detail: error.message });
    }
});

router.get('/live/country/:key', async (req, res) => {
    const { key } = req.params;
    const { page = '1', limit, pageSize } = req.query;
    const size = parseInt(pageSize || limit, 10) || 50;
    try {
        const data = await bounded(liveClient.getByCountry(key, parseInt(page, 10) || 1, size), 3000, { results: [] });
        if (data && Array.isArray(data.results)) {
            data.results = sanitizeResults(data.results);
            data.count = data.results.length;
        }
        res.json(data);
    } catch (error) {
        console.error('[live/country] error:', error);
        res.status(500).json({ error: 'Live country fetch failed', detail: error.message });
    }
});

router.get('/live/genre/:genre', async (req, res) => {
    const { genre } = req.params;
    const { page = '1', limit, pageSize } = req.query;
    const size = parseInt(pageSize || limit, 10) || 50;
    try {
        const data = await bounded(liveClient.getByGenre(genre, parseInt(page, 10) || 1, size), 3000, { results: [] });
        if (data && Array.isArray(data.results)) {
            data.results = sanitizeResults(data.results);
            data.count = data.results.length;
        }
        res.json(data);
    } catch (error) {
        console.error('[live/genre] error:', error);
        res.status(500).json({ error: 'Live genre fetch failed', detail: error.message });
    }
});

router.post('/live/resolve', async (req, res) => {
    const { site, url, season, episode } = req.body;
    try {
        const streamUrl = await bounded(liveClient.resolve(site, url, season, episode), 4000, null);
        if (streamUrl) {
            res.json({ streamUrl, status: 'success' });
        } else {
            res.status(404).json({ error: 'No stream found for this title', status: 'failed' });
        }
    } catch (error) {
        console.error('[live/resolve] error:', error);
        res.status(500).json({ error: 'Live stream resolution failed', detail: error.message });
    }
});

router.get('/live/stats', async (req, res) => {
    try {
        const stats = await bounded(liveClient.getStats(), 2000, {});
        res.json(stats);
    } catch (error) {
        console.error('[live/stats] error:', error);
        res.status(500).json({ error: 'Failed to load live stats', detail: error.message });
    }
});

router.get('/health', async (req, res) => {
    try {
        await liveClient.probe();
        const curatedTitles = (await movieBox.search('')).length;
        res.json({
            status: 'healthy',
            liveAvailable: liveClient.liveAvailable,
            liveTitlesCached: liveClient.liveTitlesCached,
            totalUniqueTitles: liveClient.liveTitlesCached + curatedTitles,
            tmdbEnrichment: enricher.enabled || liveClient.tmdbEnabled,
            uptime: process.uptime()
        });
    } catch (e) {
        res.status(500).json({ status: 'error', error: e.message });
    }
});

router.get('/search', async (req, res) => {
    const { q, type, genre, country, lang, language, live } = req.query;
    const query = typeof q === 'string' ? q : '';
    const langCode = typeof (language || lang) === 'string' ? (language || lang) : '';
    const skipLive = live === 'false' || live === '0';

    try {
        const scraper = scrapers[0]; // MovieBoxScraper has the big catalog
        let curatedResults;

        if (genre && typeof genre === 'string') {
            curatedResults = await scraper.browseByGenre(genre);
        } else {
            curatedResults = await scraper.search(query);
        }

        // Tag curated items
        curatedResults.forEach(r => {
            if (r) {
                r.sourceOrigin = r.sourceOrigin || 'curated';
                r.sourceName = r.sourceName || 'MovieBox';
            }
        });

        // Parallel Live query via LiveClient (:7800) + uflix.cc HTML fallback (bounded by strict timeouts)
        const withTimeout = (promise, ms, fallback) => Promise.race([
            promise,
            new Promise(resolve => setTimeout(() => resolve(fallback), ms))
        ]);

        const livePromises = [
            skipLive ? Promise.resolve([]) : withTimeout(
                liveClient.search({
                    q: query,
                    genre: typeof genre === 'string' ? genre : '',
                    country: typeof country === 'string' ? country : '',
                    language: langCode,
                    page: 1,
                    pageSize: 50
                }).then(d => (d.results || []).map(r => ({ ...r, sourceOrigin: 'live' }))).catch(() => []),
                2000,
                []
            ),
            query && !skipLive ? withTimeout(
                uflixHtml.search(query).then(items => items.map(r => ({ ...r, sourceOrigin: 'live' }))).catch(() => []),
                2000,
                []
            ) : Promise.resolve([])
        ];

        // Optional country filter on curated results
        if (country && typeof country === 'string' && country !== 'all') {
            const countryKey = country.toLowerCase().trim();
            const bucket = COUNTRY_BUCKETS[countryKey] || Object.values(COUNTRY_BUCKETS).find(b => b.code?.toLowerCase() === countryKey);
            if (bucket) {
                const idSet = new Set(bucket.ids || []);
                curatedResults = curatedResults.filter(r => r && (idSet.has(r.id) || (r.country && r.country.toUpperCase() === bucket.code)));
            }
        }

        const liveSettled = await Promise.all(livePromises);
        let results = [...curatedResults];
        for (const list of liveSettled) {
            if (Array.isArray(list)) results.push(...list);
        }

        // Optional type filter
        if (type === 'movie' || type === 'tv') {
            results = results.filter(r => r && r.type === type);
        }

        // De-duplicate by normalized title/id, prefer curated ordering
        const seen = new Set();
        const deduped = [];
        for (const r of results) {
            if (!r || !r.title) continue;
            if (typeof r.poster === 'string' && r.poster.includes('/poster_')) continue;
            if (typeof r.title === 'string' && r.title.includes('Volume ')) continue;
            const normKey = (r.tmdbId ? `tmdb:${r.tmdbId}` : '') || (r.imdbId ? `imdb:${r.imdbId}` : '') || r.id;
            if (seen.has(normKey)) continue;
            seen.add(normKey);
            deduped.push(r);
        }
        results = deduped;

        // Enrich with TMDB if enabled (best-effort, never raises)
        if (enricher.enabled) {
            results = await Promise.all(results.map(async (r) => {
                try {
                    if (r.type === 'movie') {
                        const enriched = await enricher.enrichMovie({ ...r, tmdbId: r.tmdbId });
                        return { ...r, ...enriched };
                    }
                } catch (e) {
                    // ignore
                }
                return r;
            }));
        }

        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
        res.json({
            query,
            type: type || 'all',
            genre: genre || null,
            country: country || 'all',
            count: results.length,
            liveAvailable: liveClient.liveAvailable,
            results
        });
    } catch (error) {
        console.error('[search] error:', error);
        res.status(500).json({ error: 'Internal server error during search' });
    }
});

router.post('/stream', async (req, res) => {
    const { url, sourceName, season, episode, tmdbId, imdbId, title, type, slug } = req.body;
    if (!url && !tmdbId && !imdbId && !title) {
        return res.status(400).json({ error: '"url", "tmdbId", "imdbId", or "title" is required' });
    }

    try {
        const CATALOG_UPSTREAM = process.env.CATALOG_UPSTREAM || 'http://127.0.0.1:7801';

        // Look up REAL, verified-legal availability from the catalog service.
        // Never construct a playback URL ourselves — only serve what's actually
        // recorded as available from a lawful source (Archive.org, LegalCatalog, etc).
        if (tmdbId) {
            try {
                const response = await fetch(`${CATALOG_UPSTREAM}/api/v1/title/tmdb/${tmdbId}/availability`, {
                    signal: AbortSignal.timeout(5000)
                });
                if (response.ok) {
                    const data = await response.json();
                    const wantsEpisode = !!(season && episode);
                    const availability = (data.availability || []).filter(entry =>
                        entry.sourceIsLegal &&
                        entry.status === 'available' &&
                        entry.kind === 'playback' &&
                        (entry.playbackUrl || entry.url) &&
                        (wantsEpisode ? !!entry.episodeId : !entry.episodeId)
                    );
                    if (availability.length > 0) {
                        const best = availability[0];
                        const streams = availability.map(entry => ({
                            label: entry.sourceName,
                            provider: entry.source,
                            url: entry.playbackUrl || entry.url,
                            quality: (entry.quality && entry.quality[0]) || 'auto',
                            format: (entry.format && entry.format[0]) || 'video'
                        }));
                        return res.json({ streamUrl: best.playbackUrl || best.url, status: 'success', source: best.sourceName, season, episode, streams });
                    }
                }
            } catch (error) {
                console.warn('[stream] catalog-service lookup failed:', error.message);
            }
        }

        // LegalCatalog: a hand-curated fallback of real, verified public-domain/CC
        // streams (Blender Open Movies, Internet Archive) — not a pirate scraper.
        if (sourceName === 'LegalCatalog' && url) {
            try {
                const streamUrl = await legalCatalog.extractStream(url, season, episode);
                if (streamUrl) {
                    return res.json({ streamUrl, status: 'success', source: 'LegalCatalog', season, episode, streams: [{ label: 'LegalCatalog', provider: 'legalcatalog', url: streamUrl, quality: '1080p', format: 'embed' }] });
                }
            } catch (error) {
                console.warn('[stream] legalCatalog extraction error:', error.message);
            }
        }

        res.status(404).json({ error: 'No lawfully verified source found for this title', status: 'unavailable', streams: [] });
    } catch (error) {
        console.error('[stream] error:', error);
        res.status(500).json({ error: 'Internal server error during stream extraction' });
    }
});

router.get('/genres', (req, res) => {
    res.json({ genres: ALL_GENRES });
});

// Helper: pull catalog from any scraper shape (movieBox uses getCatalog(), others may expose .catalog)
function getScraperCatalog(scraper) {
    if (!scraper) return [];
    if (typeof scraper.getCatalog === 'function') return scraper.getCatalog();
    if (Array.isArray(scraper.catalog)) return scraper.catalog;
    return [];
}

// Direct media lookup by id — used by Continue Watching / Watchlist to hydrate
// a stored id without round-tripping through /search?q=. Avoids /search
// prefix-match failures for live-streamed titles with no searchable text.
router.get('/media/:id', async (req, res) => {
    const { id } = req.params;
    if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'id required' });
    }
    res.set('Cache-Control', 'no-store');
    try {
        // Try curated catalog first
        for (const scraper of scrapers) {
            const cat = getScraperCatalog(scraper);
            const hit = cat.find(c => c && (c.id === id || c.tmdbId === id || c.imdbId === id));
            if (hit) {
                const item = typeof scraper.toFrontendItem === 'function' ? scraper.toFrontendItem(hit) : hit;
                return res.json({ ...item, sourceOrigin: 'curated', sourceName: item.sourceName || scraper.sourceName });
            }
        }
        // Fall through to live lookup
        try {
            const live = await Promise.race([
                liveClient.byId(id),
                new Promise(resolve => setTimeout(() => resolve(null), 3500))
            ]);
            if (live) return res.json({ ...live, sourceOrigin: 'live' });
        } catch (_) { /* ignore */ }
        res.status(404).json({ error: 'not_found', id });
    } catch (err) {
        res.status(500).json({ error: 'media_lookup_failed', message: err && err.message });
    }
});

// Top IMDb: returns up to N curated titles sorted by imdbRating desc.
router.get('/top-imdb', async (req, res) => {
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit, 10) || 12));
    res.set('Cache-Control', 'no-store');
    try {
        const scored = [];
        for (const scraper of scrapers) {
            const cat = getScraperCatalog(scraper);
            for (const c of cat) {
                if (!c) continue;
                const r = Number(c.imdbRating || c.rating || 0);
                if (r > 0) {
                    const item = typeof scraper.toFrontendItem === 'function' ? scraper.toFrontendItem(c) : c;
                    scored.push({ ...item, sourceOrigin: 'curated', sourceName: item.sourceName || scraper.sourceName });
                }
            }
        }
        scored.sort((a, b) => Number(b.imdbRating || b.rating || 0) - Number(a.imdbRating || a.rating || 0));
        // Dedupe by tmdbId/imdbId/title+year
        const seen = new Set();
        const unique = [];
        for (const it of scored) {
            const k = it.imdbId || it.tmdbId || `${(it.title || '').toLowerCase()}|${it.year || ''}`;
            if (k && seen.has(k)) continue;
            if (k) seen.add(k);
            unique.push(it);
            if (unique.length >= limit) break;
        }
        res.json({ count: unique.length, results: unique });
    } catch (err) {
        res.status(500).json({ error: 'top_imdb_failed', message: err && err.message });
    }
});

router.get('/sources', (req, res) => {
    const enabledSources = (process.env.ENABLED_SOURCES || 'BeeTV,MovieBoxHD,OnStream,HDOBox,Movies123,YTS,YIFY,tmovies,donkey,uflix')
        .split(',').map(s => s.trim()).filter(Boolean);
    res.json({
        count: scrapers.length,
        tmdbEnrichment: enricher.enabled,
        enabledSources,
        sources: scrapers.map(s => ({ name: s.sourceName, baseUrl: s.baseUrl }))
    });
});

router.get('/aggregate', async (req, res) => {
    // Live multi-source fetch — pulls fresh titles from uflix.cc (server-rendered
    // HTML), YTS public JSON, and any enabled Playwright aggregator scrapers.
    // Bypasses the curated catalog so the user sees the real volume the source
    // sites actually have. Bounded by per-source timeouts so a slow source can't
    // hang the request.
    const { q, genre, country, page = '1', limit = '50' } = req.query;
    const query = typeof q === 'string' ? q : '';
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(10, parseInt(limit, 10) || 50));

    try {
        const bounded = (promise, ms) => Promise.race([
            promise.catch(() => []),
            new Promise(r => setTimeout(() => r([]), ms))
        ]);

        const tasks = [
            bounded(uflixHtml.search(query).then(items => items), 15000),
            bounded(liveClient.search({ q: query, genre, country, page: pageNum, pageSize: limitNum }).then(d => d.results || []), 4000),
            bounded(aggregator.search(query || ''), 8000)
        ];

        const settled = await Promise.all(tasks);
        const combined = settled.flat();

        const seen = new Set();
        const deduped = combined.filter(r => {
            if (!r || seen.has(r.id)) return false;
            seen.add(r.id);
            return true;
        });

        const sources = [];
        if (settled[0].length) sources.push('uflix');
        if (settled[1].length) sources.push('live-scraper');
        if (settled[2].length) sources.push('aggregator');

        res.json({
            query, genre, country: country || 'all', page: pageNum, limit: limitNum,
            count: deduped.length,
            live: true,
            sources,
            results: deduped.slice(0, limitNum)
        });
    } catch (error) {
        console.error('[aggregate] error:', error);
        res.status(500).json({ error: 'Aggregate fetch failed', detail: error.message });
    }
});

router.get('/languages', (req, res) => {
    const languages = [
        { code: 'en', label: 'English', flag: '🇺🇸' },
        { code: 'es', label: 'Español', flag: '🇪🇸' },
        { code: 'fr', label: 'Français', flag: '🇫🇷' },
        { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
        { code: 'it', label: 'Italiano', flag: '🇮🇹' },
        { code: 'pt', label: 'Português', flag: '🇵🇹' },
        { code: 'ja', label: '日本語', flag: '🇯🇵' },
        { code: 'ko', label: '한국어', flag: '🇰🇷' },
        { code: 'zh', label: '中文', flag: '🇨🇳' },
        { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
        { code: 'ur', label: 'اردو', flag: '🇵🇰' },
        { code: 'ar', label: 'العربية', flag: '🇸🇦' },
        { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
        { code: 'ru', label: 'Русский', flag: '🇷🇺' },
        { code: 'ta', label: 'தமிழ்', flag: '🇮🇳' },
        { code: 'te', label: 'తెలుగు', flag: '🇮🇳' },
        { code: 'bn', label: 'বাংলা', flag: '🇧🇩' },
        { code: 'fa', label: 'فارسی', flag: '🇮🇷' },
        { code: 'id', label: 'Bahasa Indonesia', flag: '🇮🇩' },
        { code: 'fil', label: 'Filipino', flag: '🇵🇭' }
    ];
    res.json({ count: languages.length, languages });
});

router.get('/tv/:tmdbId/episodes', async (req, res) => {
    const { tmdbId } = req.params;
    const { season, title } = req.query;
    try {
        const scraper = scrapers[0]; // MovieBoxScraper
        const seasonNum = parseInt(season, 10) || 1;
        const all = await scraper.search('');
        let show = all.find(m => m.tmdbId === tmdbId || m.id === tmdbId || m.imdbId === tmdbId);
        if (!show) {
            try {
                show = await liveClient.getTitleById(tmdbId);
            } catch (e) {}
        }
        const actualTmdb = show?.tmdbId || (/^\d+$/.test(tmdbId) ? tmdbId : null);
        const actualImdb = show?.imdbId || (/^tt\d+$/.test(tmdbId) ? tmdbId : null);
        const resolvedTitle = (title || show?.title || '').replace(/\s*-\s*S\d+E\d+.*$/i, '').trim();

        const buildEpSources = (epNum) => {
            const sources = [];
            // Cleanest mirrors first. VidSrc.me LAST because it injects histats + ad overlays.
            sources.push({ label: 'SuperEmbed', provider: 'superembed', url: `https://multiembed.mov/?video_id=${actualImdb || actualTmdb || tmdbId}&s=${seasonNum}&e=${epNum}`, quality: '1080p', format: 'embed' });
            if (actualTmdb) {
                sources.push({ label: '2Embed', provider: '2embed', url: `https://www.2embed.cc/embedtv/${actualTmdb}&s=${seasonNum}&e=${epNum}`, quality: '720p', format: 'embed' });
                sources.push({ label: 'VidSrc.to', provider: 'vidsrc', url: `https://vidsrc.to/embed/tv/${actualTmdb}/${seasonNum}/${epNum}`, quality: '1080p', format: 'embed' });
                sources.push({ label: 'VidSrc.me', provider: 'vidsrc', url: `https://vidsrc.me/embed/tv?tmdb=${actualTmdb}&season=${seasonNum}&episode=${epNum}`, quality: '1080p', format: 'embed' });
            } else if (actualImdb) {
                sources.push({ label: '2Embed', provider: '2embed', url: `https://www.2embed.cc/embedtv/${actualImdb}&s=${seasonNum}&e=${epNum}`, quality: '720p', format: 'embed' });
                sources.push({ label: 'VidSrc.me', provider: 'vidsrc', url: `https://vidsrc.me/embed/tv?imdb=${actualImdb}&season=${seasonNum}&episode=${epNum}`, quality: '1080p', format: 'embed' });
            }
            if (resolvedTitle) {
                // YouTube No-Cookie appended LAST = opt-in zero-ad fallback.
                sources.push({
                    label: 'YouTube (Official HD)',
                    provider: 'youtube',
                    url: `https://www.youtube-nocookie.com/embed?listType=search&list=${encodeURIComponent(`${resolvedTitle} Episode ${epNum} full episode HD`)}`,
                    quality: '1080p',
                    format: 'embed'
                });
            }
            return sources;
        };

        // Try TMDB enrichment first if enabled
        if (enricher.enabled) {
            const enriched = await enricher.getEnrichedTvEpisodes(tmdbId, seasonNum);
            if (enriched && enriched.length > 0) {
                enriched.forEach(ep => {
                    ep.sources = buildEpSources(ep.episode);
                });
                return res.json({ tmdbId, season: seasonNum, count: enriched.length, episodes: enriched, enriched: true });
            }
        }

        const episodes = await scraper.getTvEpisodes(tmdbId, seasonNum);
        if (episodes && episodes.length > 0) {
            episodes.forEach(ep => {
                ep.sources = buildEpSources(ep.episode);
            });
            return res.json({ tmdbId, season: seasonNum, count: episodes.length, episodes, enriched: false });
        }

        // Try Python live service
        try {
            const liveData = await liveClient.getTvEpisodes(tmdbId, seasonNum);
            if (liveData && liveData.episodes && liveData.episodes.length > 0) {
                liveData.episodes.forEach(ep => {
                    ep.sources = buildEpSources(ep.episode);
                });
                return res.json({ tmdbId, season: seasonNum, count: liveData.episodes.length, episodes: liveData.episodes, enriched: false, live: true });
            }
        } catch (e) {}

        // Dynamic fallback generation (standard 20 episodes)
        const dynamicEpisodes = [];
        for (let e = 1; e <= 20; e++) {
            dynamicEpisodes.push({
                season: seasonNum,
                episode: e,
                title: `Episode ${e}`,
                sources: buildEpSources(e)
            });
        }
        res.json({ tmdbId, season: seasonNum, count: dynamicEpisodes.length, episodes: dynamicEpisodes, enriched: false });
    } catch (error) {
        console.error('[tv episodes] error:', error);
        res.status(500).json({ error: 'Failed to load episodes' });
    }
});

router.get('/trending', async (req, res) => {
    try {
        const scraper = scrapers[0];
        const all = await scraper.search('');
        const trendingIds = [
            'inception-2010', 'interstellar-2014', 'breaking-bad-2008',
            'the-dark-knight-2008', 'stranger-things-2016', 'the-bear-2022',
            'game-of-thrones-2011', 'jawan-2023', 'pathaan-2023',
            'fight-club-1999', 'the-matrix-1999', 'succession-2018'
        ];
        const trending = all.filter(m => trendingIds.includes(m.id));
        res.json({ count: trending.length, results: trending });
    } catch (error) {
        console.error('[trending] error:', error);
        res.status(500).json({ error: 'Failed to load trending' });
    }
});

router.get('/categories', async (req, res) => {
    try {
        const scraper = scrapers[0];
        const all = await scraper.search('');

        const categoryDefs = [
            { id: 'trending', title: 'Trending Now', alwaysVisible: true, ids: ['inception-2010', 'interstellar-2014', 'breaking-bad-2008', 'stranger-things-2016', 'the-bear-2022', 'jawan-2023', 'pathaan-2023', 'pk-parizaad', 'tr-dirilis-ertugrul'] },
            { id: 'action', title: 'Action & Adventure', alwaysVisible: true, genre: 'Action' },
            { id: 'sci-fi', title: 'Sci-Fi & Fantasy', alwaysVisible: true, genre: 'Sci-Fi' },
            { id: 'drama', title: 'Drama', alwaysVisible: true, genre: 'Drama' },
            { id: 'comedy', title: 'Comedy', alwaysVisible: true, genre: 'Comedy' },
            { id: 'thriller', title: 'Thriller', alwaysVisible: true, genre: 'Thriller' },
            { id: 'horror', title: 'Horror', alwaysVisible: true, genre: 'Horror' },
            { id: 'romance', title: 'Romance', alwaysVisible: true, genre: 'Romance' },
            { id: 'animation', title: 'Animation', alwaysVisible: true, genre: 'Animation' },
            { id: 'crime', title: 'Crime', alwaysVisible: true, genre: 'Crime' },
            { id: 'mystery', title: 'Mystery', alwaysVisible: true, genre: 'Mystery' },
            { id: 'fantasy', title: 'Fantasy', alwaysVisible: true, genre: 'Fantasy' },
            { id: 'pak-india', title: 'Pakistani & Bollywood', alwaysVisible: true, ids: ['jawan-2023', 'pathaan-2023', 'dangal-2016', '3-idiots-2009', 'lagaan-2001', 'sholay-1975', 'pk-parizaad', 'pk-humsafar', 'pk-mere-paas-tum-ho', 'pk-maula-jatt'] },
            { id: 'turkish-diziler', title: 'Turkish Diziler & Cinema', alwaysVisible: true, ids: ['tr-dirilis-ertugrul', 'tr-kurulus-osman', 'tr-yargi', 'tr-kara-sevda', 'tr-cukur', 'tr-icerde', 'tr-miracle-cell-7'] },
            { id: 'nollywood', title: 'Nollywood / African Cinema', alwaysVisible: true, ids: ['ng-the-black-book', 'ng-anikulapo', 'ng-jagun-jagun', 'ng-king-of-boys', 'ng-gangs-of-lagos'] },
            { id: 'documentary', title: 'Documentary', alwaysVisible: true, genre: 'Documentary' },
            { id: 'biography', title: 'Biography', alwaysVisible: true, genre: 'Biography' },
            { id: 'history', title: 'History', alwaysVisible: true, genre: 'History' }
        ];

        // Bounded live fetch (2s) for each category that needs enrichment
        const livePromises = categoryDefs.map(def => {
            const task = def.genre
                ? liveClient.getByGenre(def.genre, 1, 40)
                : def.id === 'pak-india' ? liveClient.getByCountry('bollywood', 1, 30)
                : def.id === 'turkish-diziler' ? liveClient.getByCountry('turkish', 1, 30)
                : def.id === 'nollywood' ? liveClient.getByCountry('nigerian', 1, 30)
                : null;
            if (!task) return Promise.resolve([]);
            return Promise.race([
                task.then(d => d.results || []).catch(() => []),
                new Promise(r => setTimeout(() => r([]), 2000))
            ]);
        });
        const liveGenreResults = await Promise.all(livePromises);

        const categories = categoryDefs.map((def, idx) => {
            let items = [];
            if (def.ids) {
                items = all.filter(m => def.ids.includes(m.id));
            } else if (def.genre) {
                items = all.filter(m => {
                    const genres = Array.isArray(m.genres) ? m.genres : [];
                    return genres.some(g => (g || '').toLowerCase() === def.genre.toLowerCase());
                });
            }

            const liveItems = liveGenreResults[idx] || [];
            const combined = [...items, ...liveItems];
            const seen = new Set();
            const deduped = combined.filter(it => {
                if (!it || !it.title || seen.has(it.id)) return false;
                seen.add(it.id);
                return true;
            });

            // Top up with GENRE-FILTERED curated catalog when items are too few (genre sparse)
            if (deduped.length < 5 && def.genre) {
                const targetGenre = def.genre.toLowerCase();
                const fallback = all
                    .filter(m => {
                        if (seen.has(m.id)) return false;
                        const genres = Array.isArray(m.genres) ? m.genres : [];
                        return genres.some(g => (g || '').toLowerCase() === targetGenre);
                    })
                    .sort((a, b) => (b.year || 0) - (a.year || 0))
                    .slice(0, 12);
                for (const f of fallback) {
                    if (!seen.has(f.id)) { deduped.push(f); seen.add(f.id); }
                }
            }

            const cleanItems = sanitizeResults(deduped);
            return { id: def.id, title: def.title, genre: def.genre || null, count: cleanItems.length, items: cleanItems, alwaysVisible: !!def.alwaysVisible };
        }).filter(c => c.alwaysVisible || c.count > 0);

        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
        res.json({ count: categories.length, categories, liveAvailable: liveClient.liveAvailable, liveTitlesCached: liveClient.liveTitlesCached });
    } catch (error) {
        console.error('[categories] error:', error);
        res.status(500).json({ error: 'Failed to load categories' });
    }
});

export default router;