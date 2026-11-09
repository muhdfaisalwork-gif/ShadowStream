export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);

      // CORS Preflight & Local API handlers
      if (
        url.pathname === '/api/v1/history' ||
        url.pathname.startsWith('/api/v1/history/') ||
        url.pathname === '/api/v1/watchlist' ||
        url.pathname.startsWith('/api/v1/watchlist/')
      ) {
        const corsHeaders = {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Id'
        };
        if (request.method === 'OPTIONS') {
          return new Response(null, { status: 204, headers: corsHeaders });
        }
        if (request.method === 'GET') {
          return new Response(JSON.stringify({ ok: true, items: [] }), {
            headers: corsHeaders
          });
        }
        return new Response(JSON.stringify({ ok: true }), {
          headers: corsHeaders
        });
      }

      // -------------------------------------------------------------
      // 1. OpenSubtitles API & Subtitle Download / WebVTT Converter
      // -------------------------------------------------------------
      if (url.pathname === '/api/v1/subtitles' || url.pathname === '/api/v1/subtitles/') {
        const corsHeaders = {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Cache-Control': 'public, max-age=3600'
        };
        if (request.method === 'OPTIONS') {
          return new Response(null, { status: 204, headers: corsHeaders });
        }

        const imdbId = url.searchParams.get('imdbId') || url.searchParams.get('imdb');
        const season = url.searchParams.get('season') || url.searchParams.get('s');
        const episode = url.searchParams.get('episode') || url.searchParams.get('e');
        const title = url.searchParams.get('title') || '';

        let cleanImdb = String(imdbId || '').replace(/^tt/, '').trim();
        let osUrl = '';
        if (cleanImdb) {
          if (season != null && episode != null && Number(season) > 0 && Number(episode) > 0) {
            osUrl = `https://rest.opensubtitles.org/search/episode-${episode}/imdbid-${cleanImdb}/season-${season}`;
          } else {
            osUrl = `https://rest.opensubtitles.org/search/imdbid-${cleanImdb}`;
          }
        } else if (title) {
          const cleanTitle = encodeURIComponent(String(title).replace(/\(\d{4}\)/, '').trim());
          osUrl = `https://rest.opensubtitles.org/search/query-${cleanTitle}`;
        }

        if (!osUrl) {
          return new Response(JSON.stringify({ ok: true, subtitles: [] }), { headers: corsHeaders });
        }

        try {
          const osRes = await fetch(osUrl, {
            headers: { 'User-Agent': 'TemporaryUserAgent', 'Accept': 'application/json' }
          });
          if (!osRes.ok) {
            return new Response(JSON.stringify({ ok: true, subtitles: [] }), { headers: corsHeaders });
          }
          const osData = await osRes.json();
          if (!Array.isArray(osData)) {
            return new Response(JSON.stringify({ ok: true, subtitles: [] }), { headers: corsHeaders });
          }

          const ISO3_TO_ISO2 = {
            eng: 'en', spa: 'es', fre: 'fr', fra: 'fr', ger: 'de', deu: 'de',
            ita: 'it', por: 'pt', pob: 'pt', hin: 'hi', ara: 'ar', rus: 'ru',
            jpn: 'ja', kor: 'ko', chi: 'zh', zho: 'zh', tur: 'tr', urd: 'ur',
            ind: 'id', pol: 'pl', dut: 'nl', nld: 'nl', swe: 'sv', nor: 'no',
            dan: 'da', fin: 'fi', ell: 'el', gre: 'el', heb: 'he', tha: 'th',
            vie: 'vi', ces: 'cs', cze: 'cs', hun: 'hu', ron: 'ro', rum: 'ro',
            ukr: 'uk', tam: 'ta', tel: 'te', mal: 'ml', kan: 'kn', ben: 'bn',
            fil: 'fil', tag: 'tl', msa: 'ms', may: 'ms', fas: 'fa', per: 'fa'
          };

          const byLang = new Map();
          for (const item of osData) {
            const rawLang = String(item.SubLanguageID || '').toLowerCase();
            const lang2 = ISO3_TO_ISO2[rawLang] || rawLang.slice(0, 2);
            if (!lang2 || byLang.has(lang2)) continue;
            if (!item.SubDownloadLink) continue;

            const baseOrigin = url.origin;
            const downloadVttUrl = `${baseOrigin}/api/v1/subtitles/download?link=${encodeURIComponent(item.SubDownloadLink)}`;

            byLang.set(lang2, {
              id: `os_${lang2}`,
              language: lang2,
              label: item.LanguageName || lang2.toUpperCase(),
              format: 'vtt',
              url: downloadVttUrl,
              fileName: item.SubFileName || `${lang2}.vtt`
            });
          }

          return new Response(JSON.stringify({
            ok: true,
            totalFound: osData.length,
            subtitles: Array.from(byLang.values())
          }), { headers: corsHeaders });
        } catch (e) {
          return new Response(JSON.stringify({ ok: false, error: e.message, subtitles: [] }), {
            status: 200,
            headers: corsHeaders
          });
        }
      }

      if (url.pathname === '/api/v1/subtitles/download' || url.pathname === '/api/v1/subtitles/download/') {
        const link = url.searchParams.get('link');
        if (!link || !link.startsWith('https://dl.opensubtitles.org/')) {
          return new Response('Invalid or disallowed subtitle link', { status: 400 });
        }
        try {
          const subRes = await fetch(link, {
            headers: { 'User-Agent': 'TemporaryUserAgent' }
          });
          if (!subRes.ok) {
            return new Response('Failed to download subtitle from upstream', { status: 502 });
          }

          let text = '';
          const isGz = link.endsWith('.gz') || subRes.headers.get('content-type')?.includes('gzip') || subRes.headers.get('content-type')?.includes('force-download');
          if (isGz && typeof DecompressionStream !== 'undefined') {
            try {
              const ds = new DecompressionStream('gzip');
              const decompressedStream = subRes.body.pipeThrough(ds);
              text = await new Response(decompressedStream).text();
            } catch (_) {
              text = await subRes.text();
            }
          } else {
            text = await subRes.text();
          }

          // Convert SRT to WebVTT
          const vtt = 'WEBVTT\n\n' + text
            .replace(/\r\n|\r/g, '\n')
            .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');

          return new Response(vtt, {
            status: 200,
            headers: {
              'Content-Type': 'text/vtt; charset=utf-8',
              'Access-Control-Allow-Origin': '*',
              'Cache-Control': 'public, max-age=86400'
            }
          });
        } catch (err) {
          return new Response(`Subtitle proxy error: ${err.message}`, { status: 500 });
        }
      }

      // -------------------------------------------------------------
      // 2. AniList GraphQL Anime Title & Airing Resolver
      // -------------------------------------------------------------
      if (url.pathname === '/api/v1/anime/resolve' || url.pathname === '/api/v1/anime/resolve/') {
        const corsHeaders = {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Cache-Control': 'public, max-age=3600'
        };
        if (request.method === 'OPTIONS') {
          return new Response(null, { status: 204, headers: corsHeaders });
        }

        const titleParam = url.searchParams.get('title') || url.searchParams.get('q') || url.searchParams.get('slug') || '';
        const cleanTitle = titleParam.replace(/\(\d{4}\)|-\d{4,9}$/g, '').replace(/[-_]/g, ' ').trim();
        if (!cleanTitle) {
          return new Response(JSON.stringify({ ok: false, message: 'Missing title parameter' }), { headers: corsHeaders });
        }

        const query = `
        query ($search: String) {
          Media(search: $search, type: ANIME, sort: POPULARITY_DESC) {
            id
            idMal
            title {
              romaji
              english
              native
            }
            synonyms
            status
            episodes
            nextAiringEpisode {
              airingAt
              timeUntilAiring
              episode
            }
            coverImage {
              large
              medium
            }
          }
        }`;

        try {
          const aniRes = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            body: JSON.stringify({ query, variables: { search: cleanTitle } })
          });
          if (!aniRes.ok) {
            return new Response(JSON.stringify({ ok: false, status: aniRes.status }), { headers: corsHeaders });
          }
          const json = await aniRes.json();
          const media = json.data?.Media;
          if (!media) {
            return new Response(JSON.stringify({ ok: false, message: 'No anime match found' }), { headers: corsHeaders });
          }

          return new Response(JSON.stringify({
            ok: true,
            anilistId: media.id,
            malId: media.idMal,
            romaji: media.title?.romaji || null,
            english: media.title?.english || null,
            native: media.title?.native || null,
            synonyms: media.synonyms || [],
            status: media.status,
            episodes: media.episodes,
            nextAiringEpisode: media.nextAiringEpisode ? {
              episode: media.nextAiringEpisode.episode,
              airingAt: media.nextAiringEpisode.airingAt,
              timeUntilAiring: media.nextAiringEpisode.timeUntilAiring
            } : null,
            coverImage: media.coverImage?.large || media.coverImage?.medium
          }), { headers: corsHeaders });
        } catch (e) {
          return new Response(JSON.stringify({ ok: false, error: e.message }), { headers: corsHeaders });
        }
      }

      // -------------------------------------------------------------
      // 3. TVMaze Live Broadcast Schedule ("Airing Today")
      // -------------------------------------------------------------
      if (url.pathname === '/api/v1/schedule/today' || url.pathname === '/api/v1/schedule/today/') {
        const corsHeaders = {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Cache-Control': 'public, max-age=600'
        };
        if (request.method === 'OPTIONS') {
          return new Response(null, { status: 204, headers: corsHeaders });
        }

        if (env.ASSETS) {
          try {
            const assetRes = await env.ASSETS.fetch(new Request(new URL('/airing_today.json', request.url), request));
            if (assetRes && assetRes.ok) {
              const body = await assetRes.json();
              return new Response(JSON.stringify(body), { headers: corsHeaders });
            }
          } catch (_) {}
        }

        try {
          const tvmRes = await fetch('https://api.tvmaze.com/schedule?country=US');
          if (tvmRes.ok) {
            const list = await tvmRes.json();
            const items = (Array.isArray(list) ? list : []).slice(0, 30).map(entry => {
              const show = entry.show || {};
              const img = show.image || entry.image || {};
              return {
                id: entry.id || show.id,
                title: show.name || 'Untitled Show',
                episodeTitle: entry.name || `Episode ${entry.number || 1}`,
                season: entry.season || 1,
                episode: entry.number || 1,
                airtime: entry.airtime || '',
                network: show.network?.name || show.webChannel?.name || 'Live TV',
                poster: img.medium || img.original || null,
                rating: show.rating?.average || null,
                overview: (entry.summary || show.summary || '').replace(/<[^>]+>/g, '').trim(),
                isLiveToday: true
              };
            });
            return new Response(JSON.stringify({ ok: true, source: 'TVMaze Live', items }), { headers: corsHeaders });
          }
        } catch (e) {
          return new Response(JSON.stringify({ ok: false, error: e.message, items: [] }), { headers: corsHeaders });
        }
      }

      // -------------------------------------------------------------
      // 4. Live Sports Hub & TV Channels ("/api/v1/sports/hub")
      // -------------------------------------------------------------
      if (url.pathname === '/api/v1/sports/hub' || url.pathname === '/api/v1/sports/hub/' ||
          url.pathname === '/api/v1/sports' || url.pathname === '/api/v1/sports/') {
        const corsHeaders = {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Cache-Control': 'public, max-age=300'
        };
        if (request.method === 'OPTIONS') {
          return new Response(null, { status: 204, headers: corsHeaders });
        }

        if (env.ASSETS) {
          try {
            const assetRes = await env.ASSETS.fetch(new Request(new URL('/sports_hub.json', request.url), request));
            if (assetRes && assetRes.ok) {
              const body = await assetRes.json();
              return new Response(JSON.stringify(body), { headers: corsHeaders });
            }
          } catch (_) {}
        }

        try {
          const espnRes = await fetch('https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard', {
            headers: { 'User-Agent': 'Mozilla/5.0' }
          });
          const espnData = espnRes.ok ? await espnRes.json() : null;
          return new Response(JSON.stringify({
            ok: true,
            totalChannels: 0,
            matches: (espnData?.events || []).map(ev => ({
              id: ev.id,
              name: ev.name,
              league: 'Premier League',
              isLive: ev.status?.type?.state === 'in'
            })),
            channels: []
          }), { headers: corsHeaders });
        } catch (e) {
          return new Response(JSON.stringify({ ok: false, error: e.message, channels: [] }), { headers: corsHeaders });
        }
      }

      // -------------------------------------------------------------
      // 5. Backend Proxy: Downloads, API, Version, Releases
      // -------------------------------------------------------------
      if (
        url.pathname === '/downloads' ||
        url.pathname.startsWith('/downloads/') ||
        url.pathname === '/api' ||
        url.pathname.startsWith('/api/') ||
        url.pathname === '/version.json' ||
        url.pathname === '/app-version' ||
        url.pathname === '/latest.yml' ||
        url.pathname === '/ShadowStream.apk' ||
        url.pathname === '/ShadowStream-Setup-x64.exe'
      ) {
        const targetUrl = new URL(url.pathname + url.search, 'https://streamapp-catalog.muhd-faisal-work.workers.dev');
        const proxyRequest = new Request(targetUrl.toString(), request);
        const proxyResponse = await fetch(proxyRequest);
        if (
          url.pathname === '/version.json' ||
          url.pathname === '/app-version' ||
          url.pathname === '/api/v1/app-version' ||
          url.pathname === '/api/v1/version.json'
        ) {
          const freshHeaders = new Headers(proxyResponse.headers);
          freshHeaders.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
          freshHeaders.set('Pragma', 'no-cache');
          freshHeaders.set('Expires', '0');
          return new Response(proxyResponse.body, {
            status: proxyResponse.status,
            statusText: proxyResponse.statusText,
            headers: freshHeaders,
          });
        }
        return proxyResponse;
      }

      // -------------------------------------------------------------
      // 6. Direct SEO & AI-Search Discovery Files (robots.txt & llms.txt)
      // -------------------------------------------------------------
      if (url.pathname === '/robots.txt') {
        const robotsTxt = `User-agent: *
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: GPTBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Claude-SearchBot
Allow: /

User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

Sitemap: https://www.ssmoviestvs.site/sitemap_index.xml
`;
        return new Response(robotsTxt, {
          status: 200,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, max-age=86400',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }

      if (url.pathname === '/llms.txt') {
        const llmsTxt = `# ShadowStream (ssmoviestvs.site)

> ShadowStream is a free, instant-access global streaming discovery platform, multi-mirror movie/TV aggregator, and real-time Live TV & Sports schedule indexing over 104,261 movies, series, anime, and regional broadcasts with zero sign-up required.

## Core Features
- **104,261+ Indexed Catalog:** Comprehensive library of Hollywood, International, Korean, Turkish, Indonesian, Pakistani, and Anime movies and TV series.
- **Regional Dubs & Dual Audio:** Dedicated hubs for Hindi Dubbed, Urdu, Tamil, Telugu, Dual-Audio, and multi-subtitle streams.
- **Multi-Mirror Playback:** High-availability streaming with instant fallback mirrors and HD playback.
- **Live TV & Sports Guide:** Real-time schedule for live cricket, football, PPV events, and international TV networks airing today.
- **Frictionless Access:** No account registration, no paywalls, and instant cross-device watchlist syncing.

## Primary Category Hubs
- Homepage & Trending: https://www.ssmoviestvs.site/
- Movies Catalog: https://www.ssmoviestvs.site/movies
- TV Series Catalog: https://www.ssmoviestvs.site/series
- Anime (Sub & Dub): https://www.ssmoviestvs.site/anime
- Hindi & Regional Dubs: https://www.ssmoviestvs.site/dubs
- Live TV & Sports Airing Now: https://www.ssmoviestvs.site/live
`;
        return new Response(llmsTxt, {
          status: 200,
          headers: {
            'Content-Type': 'text/markdown; charset=utf-8',
            'Cache-Control': 'public, max-age=86400',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }

      // -------------------------------------------------------------
      // 7. Segmented XML Sitemaps (sitemap_index.xml + 25k chunks)
      // -------------------------------------------------------------
      if (
        url.pathname === '/sitemap_index.xml' ||
        url.pathname === '/sitemap.xml' ||
        url.pathname === '/sitemap-static.xml' ||
        url.pathname === '/sitemap-movies-1.xml' ||
        url.pathname === '/sitemap-movies-2.xml' ||
        url.pathname === '/sitemap-series-1.xml' ||
        url.pathname === '/sitemap-anime-1.xml'
      ) {
        if (env.ASSETS) {
          const sitemapRes = await env.ASSETS.fetch(request);
          if (sitemapRes && sitemapRes.ok) {
            const h = new Headers(sitemapRes.headers);
            h.set('Content-Type', 'application/xml; charset=utf-8');
            h.set('Cache-Control', 'public, max-age=86400');
            return new Response(sitemapRes.body, {
              status: sitemapRes.status,
              headers: h
            });
          }
        }

        // Resilient fallback sitemap index if static asset not compiled yet
        const now = new Date().toISOString().split('T')[0];
        const indexXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>https://www.ssmoviestvs.site/sitemap-static.xml</loc><lastmod>${now}</lastmod></sitemap>
  <sitemap><loc>https://www.ssmoviestvs.site/sitemap-movies-1.xml</loc><lastmod>${now}</lastmod></sitemap>
  <sitemap><loc>https://www.ssmoviestvs.site/sitemap-movies-2.xml</loc><lastmod>${now}</lastmod></sitemap>
  <sitemap><loc>https://www.ssmoviestvs.site/sitemap-series-1.xml</loc><lastmod>${now}</lastmod></sitemap>
  <sitemap><loc>https://www.ssmoviestvs.site/sitemap-anime-1.xml</loc><lastmod>${now}</lastmod></sitemap>
</sitemapindex>
`;
        return new Response(indexXml, {
          status: 200,
          headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=86400',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }

      // -------------------------------------------------------------
      // 8. Static Content-Hashed Assets & Non-HTML Files
      // -------------------------------------------------------------
      const isStaticFile = 
        url.pathname.startsWith('/_expo/static/') ||
        url.pathname.startsWith('/icons/') ||
        url.pathname.startsWith('/assets/') ||
        url.pathname.endsWith('.js') ||
        url.pathname.endsWith('.css') ||
        url.pathname.endsWith('.png') ||
        url.pathname.endsWith('.jpg') ||
        url.pathname.endsWith('.jpeg') ||
        url.pathname.endsWith('.webp') ||
        url.pathname.endsWith('.ico') ||
        url.pathname.endsWith('.json') ||
        url.pathname.endsWith('.webmanifest') ||
        url.pathname.endsWith('.woff') ||
        url.pathname.endsWith('.woff2') ||
        url.pathname.endsWith('.ttf');

      if (isStaticFile && env.ASSETS) {
        const assetRes = await env.ASSETS.fetch(request);
        if (assetRes && assetRes.ok) {
          const newHeaders = new Headers(assetRes.headers);
          if (url.pathname.startsWith('/_expo/static/')) {
            newHeaders.set('Cache-Control', 'public, max-age=31536000, immutable');
          } else if (url.pathname === '/sw.js' || url.pathname === '/manifest.webmanifest') {
            newHeaders.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
          }
          return new Response(assetRes.body, {
            status: assetRes.status,
            statusText: assetRes.statusText,
            headers: newHeaders
          });
        }
      }

      // -------------------------------------------------------------
      // 9. Edge SSR & Dynamic HTML Prerendering Middleware
      //    Solves CSR Bottleneck for Bots, AI Crawlers & Web Users
      // -------------------------------------------------------------
      if (env.ASSETS) {
        // Fetch raw template index.html
        let baseRes = await env.ASSETS.fetch(new Request(new URL('/index.html', request.url), request));
        if (!baseRes || !baseRes.ok) {
          baseRes = await env.ASSETS.fetch(request);
        }

        const pathname = url.pathname.replace(/\/$/, '') || '/';
        const meta = await resolvePageMetadata(pathname, url);

        // Build HTMLRewriter to inject SEO, Schemas, Titles & Semantic Content
        const rewriter = new HTMLRewriter()
          .on('title', {
            element(e) {
              e.setInnerContent(meta.title);
            }
          })
          .on('meta[name="description"]', {
            element(e) {
              e.setAttribute('content', meta.description);
            }
          })
          .on('meta[property="og:title"]', {
            element(e) {
              e.setAttribute('content', meta.title);
            }
          })
          .on('meta[property="og:description"]', {
            element(e) {
              e.setAttribute('content', meta.description);
            }
          })
          .on('meta[property="og:url"]', {
            element(e) {
              e.setAttribute('content', meta.canonical);
            }
          })
          .on('meta[name="twitter:title"]', {
            element(e) {
              e.setAttribute('content', meta.title);
            }
          })
          .on('meta[name="twitter:description"]', {
            element(e) {
              e.setAttribute('content', meta.description);
            }
          })
          .on('head', {
            element(e) {
              // Inject Canonical Link & JSON-LD Structured Data
              e.append(`\n    <link rel="canonical" href="${meta.canonical}" />`, { html: true });
              if (meta.schema) {
                e.append(`\n    <script type="application/ld+json">${JSON.stringify(meta.schema)}</script>`, { html: true });
              }
            }
          })
          .on('noscript', {
            element(e) {
              e.setInnerContent(meta.semanticHtml, { html: true });
            }
          })
          .on('#root', {
            element(e) {
              e.setInnerContent(meta.semanticHtml, { html: true });
            }
          });

        const transformedRes = rewriter.transform(baseRes);
        const headers = new Headers(transformedRes.headers);
        headers.set('Content-Type', 'text/html; charset=utf-8');
        headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
        headers.set('Pragma', 'no-cache');
        headers.set('Expires', '0');

        return new Response(transformedRes.body, {
          status: 200,
          headers
        });
      }

      return new Response('Not found', { status: 404 });
    } catch (err) {
      return new Response(`Worker Error: ${err.message}\n${err.stack}`, {
        status: 500,
        headers: { 'Content-Type': 'text/plain' },
      });
    }
  }
};

/**
 * Curated spotlight titles for SSR navigation & semantic crawler discovery.
 */
const SPOTLIGHT_TITLES = [
  { slug: 'the-shawshank-redemption-1994', title: 'The Shawshank Redemption', year: 1994, type: 'movie', rating: 9.3, poster: 'https://image.tmdb.org/t/p/w500/9cqNxx0GxF0bflZmeSMuL5tnGzr.jpg', overview: 'Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.' },
  { slug: 'the-godfather-1972', title: 'The Godfather', year: 1972, type: 'movie', rating: 9.2, poster: 'https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg', overview: 'The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant youngest son.' },
  { slug: 'the-dark-knight-2008', title: 'The Dark Knight', year: 2008, type: 'movie', rating: 9.0, poster: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg', overview: 'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological tests.' },
  { slug: 'inception-2010', title: 'Inception', year: 2010, type: 'movie', rating: 8.8, poster: 'https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg', overview: 'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.' },
  { slug: 'fight-club-1999', title: 'Fight Club', year: 1999, type: 'movie', rating: 8.8, poster: 'https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg', overview: 'An insomniac office worker and a devil-may-care soap maker form an underground fight club that evolves into much more.' },
  { slug: 'interstellar-2014', title: 'Interstellar', year: 2014, type: 'movie', rating: 8.7, poster: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg', overview: 'When Earth becomes uninhabitable in the future, a farmer and ex-NASA pilot is tasked to pilot a spacecraft along with a team of researchers.' },
  { slug: 'breaking-bad-2008', title: 'Breaking Bad', year: 2008, type: 'tv', rating: 9.5, poster: 'https://image.tmdb.org/t/p/w500/ztkUQFLlC19CCMYHW9o1zWhJAGq.jpg', overview: 'A chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine with a former student.' },
  { slug: 'reacher-2022', title: 'Reacher', year: 2022, type: 'tv', rating: 8.1, poster: 'https://image.tmdb.org/t/p/w500/j1LXW46h410kK8T2eDq4l2D7M0b.jpg', overview: 'Jack Reacher, a veteran military police investigator, enters civilian life and is falsely accused of murder.' },
  { slug: 'attack-on-titan-2013', title: 'Attack on Titan', year: 2013, type: 'anime', rating: 9.1, poster: 'https://image.tmdb.org/t/p/w500/hTP1DtLGFamjfu8WqjnuQdP1n4i.jpg', overview: 'After his hometown is destroyed and his mother is killed, young Eren Jaeger vows to cleanse the earth of the giant humanoid Titans.' },
  { slug: 'bleach-2004', title: 'Bleach', year: 2004, type: 'anime', rating: 8.3, poster: 'https://image.tmdb.org/t/p/w500/2Eewgp7o5AUjovmuuBgNVjnnNo9.jpg', overview: 'High school student Ichigo Kurosaki gains the abilities of a Soul Reaper and dedicates his life to protecting the innocent.' },
  { slug: 'rrr-2022', title: 'RRR', year: 2022, type: 'movie', rating: 8.0, poster: 'https://image.tmdb.org/t/p/w500/nEufeZlyAOLqO2brrs0yeMu1Q3n.jpg', overview: 'A fearless revolutionary and an officer in the British force decide to join forces for a legendary journey against the ruling oppressors.' },
  { slug: 'parizaad-2021', title: 'Parizaad', year: 2021, type: 'tv', rating: 9.2, poster: 'https://image.tmdb.org/t/p/w500/d5W27bY7F02T5Y5T7C6k9mQ0p.jpg', overview: 'An insightful exploration of the trials and resilience of a sensitive man with a pure soul whose unconventional looks define his path.' },
];

/**
 * Builds metadata, Schema.org JSON-LD, and pre-rendered semantic HTML for any route.
 */
async function resolvePageMetadata(pathname, url) {
  const BASE = 'https://www.ssmoviestvs.site';
  const canonical = `${BASE}${pathname === '/' ? '' : pathname}`;
  const unescaped = decodeURIComponent(pathname);

  // Common Header & Navigation HTML for Crawlers
  const headerNavHtml = `
    <header class="ssr-header" style="background:#111;padding:16px 24px;border-bottom:1px solid #222;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
      <a href="/" class="ssr-logo" style="color:#e50914;font-size:24px;font-weight:900;text-decoration:none;letter-spacing:0.5px;">ShadowStream</a>
      <nav class="ssr-nav" style="display:flex;gap:16px;flex-wrap:wrap;font-size:14px;">
        <a href="/movies" style="color:#ffffff;text-decoration:none;font-weight:600;">Movies (104,261+)</a>
        <a href="/series" style="color:#ffffff;text-decoration:none;font-weight:600;">TV Series</a>
        <a href="/anime" style="color:#ffffff;text-decoration:none;font-weight:600;">Anime</a>
        <a href="/dubs/hindi-dubbed" style="color:#ffffff;text-decoration:none;font-weight:600;">Hindi Dubbed</a>
        <a href="/regional/pakistani-turkish-dramas" style="color:#ffffff;text-decoration:none;font-weight:600;">Pakistani &amp; Turkish Dramas</a>
        <a href="/live" style="color:#ffffff;text-decoration:none;font-weight:600;">Live TV &amp; Sports</a>
        <a href="/collections" style="color:#ffffff;text-decoration:none;font-weight:600;">Collections</a>
        <a href="/blogs" style="color:#ffffff;text-decoration:none;font-weight:600;">Showbiz Guides</a>
      </nav>
    </header>
  `;

  const footerHtml = `
    <footer class="ssr-footer" style="background:#0a0a0a;border-top:1px solid #222;padding:32px 24px;color:#777;font-size:13px;text-align:center;line-height:1.8;">
      <p style="margin:0 0 8px 0;color:#aaa;">ShadowStream is a free global streaming discovery platform indexing over 104,261 movies, TV series, anime, and live sports broadcasts.</p>
      <p style="margin:0;">Instant access &bull; Multi-mirror playback &bull; Synchronized subtitles &bull; Zero sign-up required &bull; 42 Countries &bull; 26 Languages</p>
    </footer>
  `;

  // Render Grid of Title Cards
  function renderGrid(titles, heading) {
    const cards = titles.map(t => `
      <article class="ssr-card" style="background:#181818;border-radius:8px;overflow:hidden;border:1px solid #262626;display:flex;flex-direction:column;">
        <a href="/watch/${t.type || 'movie'}/${t.slug}" style="text-decoration:none;color:inherit;display:block;">
          <img src="${t.poster || '/icons/icon-512.png'}" alt="${t.title} (${t.year}) poster" style="width:100%;height:320px;object-fit:cover;background:#222;" loading="lazy" />
          <div style="padding:14px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
              <span style="background:#e50914;color:#fff;font-size:11px;font-weight:bold;padding:2px 6px;border-radius:3px;text-transform:uppercase;">${t.type || 'movie'}</span>
              <span style="color:#ffd700;font-size:12px;font-weight:bold;">★ ${t.rating ? Number(t.rating).toFixed(1) : '8.5'}</span>
            </div>
            <h3 style="margin:0 0 6px 0;font-size:16px;color:#fff;font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${t.title}</h3>
            <p style="margin:0;font-size:12px;color:#888;">${t.year} &bull; Stream Online Free</p>
          </div>
        </a>
      </article>
    `).join('\n');

    return `
      <section style="padding:32px 24px;max-width:1200px;margin:0 auto;">
        <h2 style="color:#fff;font-size:22px;margin:0 0 20px 0;border-left:4px solid #e50914;padding-left:12px;">${heading}</h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(200px, 1fr));gap:20px;">
          ${cards}
        </div>
      </section>
    `;
  }

  // -------------------------------------------------------------
  // Route 1: Individual Title Detail & Watch Page (/watch/*, /title/*)
  // -------------------------------------------------------------
  if (unescaped.startsWith('/watch/') || unescaped.startsWith('/title/')) {
    const parts = unescaped.split('/').filter(Boolean);
    let slug = parts[parts.length - 1] || '';
    let type = parts.length > 2 ? parts[1] : 'movie';

    let item = SPOTLIGHT_TITLES.find(t => t.slug === slug || t.slug === slug.replace(/-\d+$/, ''));
    if (!item) {
      try {
        const cleanSlug = slug.replace(/-\d+$/, '');
        const apiRes = await fetch(`https://streamapp-catalog.muhd-faisal-work.workers.dev/api/v1/title/${encodeURIComponent(cleanSlug)}`);
        if (apiRes.ok) {
          item = await apiRes.json();
        }
      } catch (_) {}
    }

    const titleName = item?.title || slug.replace(/-\d{4}.*$/, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const year = item?.year || '2026';
    const mediaType = (item?.type || type) === 'tv' ? 'TVSeries' : ((item?.type || type) === 'anime' ? 'TVSeries' : 'Movie');
    const typeLabel = mediaType === 'TVSeries' ? 'TV Series' : 'Movie';
    const overview = item?.overview || `Watch ${titleName} (${year}) online in Full HD with multiple fallback mirrors, original audio, and synchronized subtitles on ShadowStream.`;
    const rating = item?.rating ? Number(item.rating).toFixed(1) : '8.5';
    const poster = item?.poster || 'https://www.ssmoviestvs.site/icons/shadowstream-banner.png';

    const title = `${titleName} (${year}) - Watch Free Online | ShadowStream`;
    const description = `Stream ${titleName} (${year}) ${typeLabel} online in HD with multi-mirror playback and zero sign-up. ${overview.slice(0, 140)}`;

    const schema = {
      '@context': 'https://schema.org',
      '@type': mediaType,
      'name': titleName,
      'url': canonical,
      'description': overview,
      'datePublished': `${year}-01-01`,
      'image': poster,
      'aggregateRating': {
        '@type': 'AggregateRating',
        'ratingValue': rating,
        'bestRating': '10',
        'worstRating': '1'
      }
    };

    const semanticHtml = `
      <div class="ssr-shell" style="background:#0d0d0d;color:#fff;min-height:100vh;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        ${headerNavHtml}
        <main style="max-width:1100px;margin:32px auto;padding:0 24px;">
          <div style="display:flex;gap:32px;flex-wrap:wrap;background:#181818;border-radius:12px;padding:28px;border:1px solid #282828;">
            <img src="${poster}" alt="${titleName} Poster" style="width:260px;height:380px;object-fit:cover;border-radius:8px;background:#222;" />
            <div style="flex:1;min-width:300px;">
              <div style="display:flex;gap:8px;align-items:center;margin-bottom:12px;">
                <span style="background:#e50914;color:#fff;font-size:12px;font-weight:bold;padding:4px 8px;border-radius:4px;text-transform:uppercase;">${typeLabel}</span>
                <span style="background:#333;color:#ffd700;font-size:13px;font-weight:bold;padding:4px 8px;border-radius:4px;">★ ${rating} / 10</span>
                <span style="color:#aaa;font-size:14px;">${year}</span>
              </div>
              <h1 style="font-size:32px;margin:0 0 16px 0;color:#fff;font-weight:800;">${titleName} (${year})</h1>
              <p style="font-size:16px;line-height:1.6;color:#ccc;margin-bottom:24px;">${overview}</p>
              <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:24px;">
                <a href="/play/${slug}" style="background:#e50914;color:#fff;font-weight:bold;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:15px;display:inline-block;">▶ Watch Stream Online</a>
                <a href="/movies" style="background:#262626;color:#fff;font-weight:bold;padding:12px 20px;border-radius:6px;text-decoration:none;font-size:15px;display:inline-block;">Browse Catalog</a>
              </div>
              <p style="font-size:13px;color:#888;margin:0;">Features: 10 Instant Multi-Mirror Sources &bull; Original Audio &bull; Synchronized Multilingual Subtitles &bull; Zero Sign-Up Required</p>
            </div>
          </div>
          ${renderGrid(SPOTLIGHT_TITLES.slice(0, 6), 'Recommended Titles Airing on ShadowStream')}
        </main>
        ${footerHtml}
      </div>
    `;

    return { title, description, canonical, schema, semanticHtml };
  }

  // -------------------------------------------------------------
  // Route 2: Movies Catalog (/movies)
  // -------------------------------------------------------------
  if (unescaped === '/movies') {
    const title = 'Movies Catalog - Watch 104,261+ Movies Online Free | ShadowStream';
    const description = 'Explore 104,261+ indexed movies across Hollywood, Bollywood, international cinema, and independent releases with multi-mirror HD playback on ShadowStream.';
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      'name': 'Movies Catalog',
      'url': canonical,
      'description': description,
      'isPartOf': { '@type': 'WebSite', 'name': 'ShadowStream', 'url': `${BASE}/` }
    };
    const movieTitles = SPOTLIGHT_TITLES.filter(t => t.type === 'movie');
    const semanticHtml = `
      <div class="ssr-shell" style="background:#0d0d0d;color:#fff;min-height:100vh;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        ${headerNavHtml}
        <main style="padding:40px 24px;max-width:1200px;margin:0 auto;">
          <h1 style="font-size:32px;color:#fff;margin:0 0 12px 0;">Movies Catalog (104,261+ Indexed Titles)</h1>
          <p style="font-size:16px;color:#aaa;max-width:800px;margin-bottom:32px;line-height:1.6;">Browse and discover over 104,261 movies across all eras and genres. Stream with multiple fallback mirrors, synchronized subtitles, and zero account registration required.</p>
          ${renderGrid(movieTitles, 'Top Rated & Popular Movies')}
        </main>
        ${footerHtml}
      </div>
    `;
    return { title, description, canonical, schema, semanticHtml };
  }

  // -------------------------------------------------------------
  // Route 3: TV Series Catalog (/series, /tv)
  // -------------------------------------------------------------
  if (unescaped === '/series' || unescaped === '/tv') {
    const title = 'TV Series Catalog - Binge Hit Shows & Dramas | ShadowStream';
    const description = 'Discover and stream global television series, hit crime thrillers, K-dramas, Pakistani dramas, and prime-time TV shows across 104,261+ indexed titles on ShadowStream.';
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      'name': 'TV Series Catalog',
      'url': canonical,
      'description': description,
      'isPartOf': { '@type': 'WebSite', 'name': 'ShadowStream', 'url': `${BASE}/` }
    };
    const tvTitles = SPOTLIGHT_TITLES.filter(t => t.type === 'tv');
    const semanticHtml = `
      <div class="ssr-shell" style="background:#0d0d0d;color:#fff;min-height:100vh;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        ${headerNavHtml}
        <main style="padding:40px 24px;max-width:1200px;margin:0 auto;">
          <h1 style="font-size:32px;color:#fff;margin:0 0 12px 0;">TV Series Catalog - Global Prime-Time Shows</h1>
          <p style="font-size:16px;color:#aaa;max-width:800px;margin-bottom:32px;line-height:1.6;">Explore television series from the US, UK, South Korea, Pakistan, Turkey, and Japan complete with season and episode breakdowns on ShadowStream.</p>
          ${renderGrid(tvTitles, 'Binge-Worthy TV Series & Crime Dramas')}
        </main>
        ${footerHtml}
      </div>
    `;
    return { title, description, canonical, schema, semanticHtml };
  }

  // -------------------------------------------------------------
  // Route 4: Anime Ecosystem (/anime)
  // -------------------------------------------------------------
  if (unescaped === '/anime') {
    const title = 'Anime Hub - Watch Subbed & Dubbed Anime Online | ShadowStream';
    const description = 'Stream top anime series and movies with dual-audio, Japanese vocal tracks, English and Hindi dubs, and synchronized subtitles on ShadowStream.';
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      'name': 'Anime Hub',
      'url': canonical,
      'description': description,
      'isPartOf': { '@type': 'WebSite', 'name': 'ShadowStream', 'url': `${BASE}/` }
    };
    const animeTitles = SPOTLIGHT_TITLES.filter(t => t.type === 'anime');
    const semanticHtml = `
      <div class="ssr-shell" style="background:#0d0d0d;color:#fff;min-height:100vh;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        ${headerNavHtml}
        <main style="padding:40px 24px;max-width:1200px;margin:0 auto;">
          <h1 style="font-size:32px;color:#fff;margin:0 0 12px 0;">Anime Hub - Dual-Audio &amp; Subbed Masterpieces</h1>
          <p style="font-size:16px;color:#aaa;max-width:800px;margin-bottom:32px;line-height:1.6;">Shonen classics, seasonal anime releases, original Japanese vocal tracks, and multilingual subtitles with instant streaming fallback mirrors.</p>
          ${renderGrid(animeTitles, 'Legendary Anime Series & Movies')}
        </main>
        ${footerHtml}
      </div>
    `;
    return { title, description, canonical, schema, semanticHtml };
  }

  // -------------------------------------------------------------
  // Route 5: Hindi Dubbed & Regional Hub (/dubs, /dubs/hindi-dubbed)
  // -------------------------------------------------------------
  if (unescaped.startsWith('/dubs')) {
    const title = 'Hindi Dubbed & Dual-Audio Movies Hub | ShadowStream';
    const description = 'Watch Hollywood blockbusters, South Indian cinema, and international films dubbed in Hindi, Urdu, Tamil, Telugu, and Dual-Audio on ShadowStream.';
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      'name': 'Hindi Dubbed Movies Hub',
      'url': canonical,
      'description': description,
      'isPartOf': { '@type': 'WebSite', 'name': 'ShadowStream', 'url': `${BASE}/` }
    };
    const dubTitles = [SPOTLIGHT_TITLES[10], SPOTLIGHT_TITLES[2], SPOTLIGHT_TITLES[3], SPOTLIGHT_TITLES[5]];
    const semanticHtml = `
      <div class="ssr-shell" style="background:#0d0d0d;color:#fff;min-height:100vh;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        ${headerNavHtml}
        <main style="padding:40px 24px;max-width:1200px;margin:0 auto;">
          <h1 style="font-size:32px;color:#fff;margin:0 0 12px 0;">Hindi Dubbed &amp; Dual-Audio Cinema Hub</h1>
          <p style="font-size:16px;color:#aaa;max-width:800px;margin-bottom:32px;line-height:1.6;">Stream Hollywood blockbusters, Marvel &amp; DC franchises, and South Indian cinema with high quality Hindi, Urdu, and Dual-Audio stream feeds.</p>
          ${renderGrid(dubTitles, 'Trending Hindi Dubbed & Dual-Audio Releases')}
        </main>
        ${footerHtml}
      </div>
    `;
    return { title, description, canonical, schema, semanticHtml };
  }

  // -------------------------------------------------------------
  // Route 6: Regional Pakistani & Turkish Dramas (/regional/*)
  // -------------------------------------------------------------
  if (unescaped.startsWith('/regional')) {
    const title = 'Pakistani & Turkish Dramas Hub | ShadowStream';
    const description = 'Binge acclaimed Pakistani television serials and epic Turkish historical dramas with full HD multi-mirror streaming and English subtitles on ShadowStream.';
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      'name': 'Pakistani & Turkish Dramas Hub',
      'url': canonical,
      'description': description,
      'isPartOf': { '@type': 'WebSite', 'name': 'ShadowStream', 'url': `${BASE}/` }
    };
    const regTitles = [SPOTLIGHT_TITLES[11], SPOTLIGHT_TITLES[6]];
    const semanticHtml = `
      <div class="ssr-shell" style="background:#0d0d0d;color:#fff;min-height:100vh;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        ${headerNavHtml}
        <main style="padding:40px 24px;max-width:1200px;margin:0 auto;">
          <h1 style="font-size:32px;color:#fff;margin:0 0 12px 0;">Pakistani &amp; Turkish Dramas Hub</h1>
          <p style="font-size:16px;color:#aaa;max-width:800px;margin-bottom:32px;line-height:1.6;">Experience prime Pakistani television serials like Parizaad and Suno Chanda, alongside epic historical Turkish sagas with high-definition multi-source playback.</p>
          ${renderGrid(regTitles, 'Popular Regional Dramas')}
        </main>
        ${footerHtml}
      </div>
    `;
    return { title, description, canonical, schema, semanticHtml };
  }

  // -------------------------------------------------------------
  // Route 7: Live TV & Sports Guide (/live, /sports)
  // -------------------------------------------------------------
  if (unescaped === '/live' || unescaped === '/sports') {
    const title = 'Live TV & Sports Guide - Real-Time Broadcast Schedule | ShadowStream';
    const description = 'Check real-time live TV broadcasts, live football, cricket, PPV sports schedules, and international television networks airing today on ShadowStream.';
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'BroadcastService',
      'name': 'ShadowStream Live TV & Sports Broadcast Guide',
      'url': canonical,
      'description': description
    };
    const semanticHtml = `
      <div class="ssr-shell" style="background:#0d0d0d;color:#fff;min-height:100vh;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        ${headerNavHtml}
        <main style="padding:40px 24px;max-width:1200px;margin:0 auto;">
          <h1 style="font-size:32px;color:#fff;margin:0 0 12px 0;">Live TV &amp; Sports Guide - Real-Time Schedule</h1>
          <p style="font-size:16px;color:#aaa;max-width:800px;margin-bottom:32px;line-height:1.6;">Real-time schedule for live Premier League, Champions League, cricket matches, and international broadcast television networks airing today.</p>
          <div style="background:#181818;border-radius:10px;padding:24px;border:1px solid #282828;margin-bottom:32px;">
            <h2 style="color:#e50914;font-size:20px;margin:0 0 12px 0;">🔴 Live Sports &amp; Television Airing Today</h2>
            <p style="color:#ccc;font-size:14px;line-height:1.6;">Access live matches and prime television broadcasts with multi-mirror streams. Updated every 5 minutes from global live feed syndications.</p>
          </div>
          ${renderGrid(SPOTLIGHT_TITLES.slice(0, 4), 'Popular Broadcasts & Shows')}
        </main>
        ${footerHtml}
      </div>
    `;
    return { title, description, canonical, schema, semanticHtml };
  }

  // -------------------------------------------------------------
  // Route 8: Homepage & Default Fallback (/)
  // -------------------------------------------------------------
  const title = 'ShadowStream - Free Movies, TV Shows, Anime & Live Sports';
  const description = 'Stream 104,261+ indexed movies, TV series, anime, and live channels with multi-mirror playback and zero sign-up on ShadowStream.';

  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${BASE}/#website`,
        'url': `${BASE}/`,
        'name': 'ShadowStream',
        'alternateName': ['SSMoviesTVs', 'ShadowStream Movies & Live TV'],
        'description': 'Stream and discover 104,261+ movies, TV series, dual-audio anime, regional dubs, and live sports schedules with multi-mirror playback and no sign-up.',
        'publisher': {
          '@id': `${BASE}/#organization`
        },
        'potentialAction': {
          '@type': 'SearchAction',
          'target': `${BASE}/search?q={search_term_string}`,
          'query-input': 'required name=search_term_string'
        }
      },
      {
        '@type': 'Organization',
        '@id': `${BASE}/#organization`,
        'name': 'ShadowStream',
        'url': `${BASE}/`,
        'logo': {
          '@type': 'ImageObject',
          'url': `${BASE}/icons/shadowstream-banner.png`,
          'width': 1387,
          'height': 381
        }
      }
    ]
  };

  const semanticHtml = `
    <div class="ssr-shell" style="background:#0d0d0d;color:#fff;min-height:100vh;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      ${headerNavHtml}
      <main>
        <!-- Hero Section -->
        <section style="padding:60px 24px;text-align:center;background:radial-gradient(circle at 50% 20%, #1e1112 0%, #0d0d0d 80%);border-bottom:1px solid #222;">
          <h1 style="font-size:38px;color:#fff;margin:0 0 16px 0;font-weight:900;letter-spacing:-0.5px;">Stream 104,261+ Movies, TV Series, Anime &amp; Live Sports</h1>
          <p style="font-size:18px;color:#bbb;max-width:760px;margin:0 auto 28px auto;line-height:1.6;">ShadowStream is a free, instant-access global streaming discovery platform, multi-mirror movie/TV aggregator, and real-time Live TV &amp; Sports schedule indexing over 104,261 titles with zero sign-up required.</p>
          <div style="display:flex;justify-content:center;gap:16px;flex-wrap:wrap;">
            <a href="/movies" style="background:#e50914;color:#fff;font-weight:bold;padding:14px 32px;border-radius:6px;text-decoration:none;font-size:16px;">Explore Movies Catalog</a>
            <a href="/series" style="background:#262626;color:#fff;font-weight:bold;padding:14px 28px;border-radius:6px;text-decoration:none;font-size:16px;">Browse TV Series</a>
            <a href="/live" style="background:#262626;color:#fff;font-weight:bold;padding:14px 28px;border-radius:6px;text-decoration:none;font-size:16px;">Live Sports Airing Now</a>
          </div>
        </section>

        <!-- Feature Badges -->
        <section style="display:flex;justify-content:center;gap:32px;flex-wrap:wrap;padding:32px 24px;background:#111;border-bottom:1px solid #222;font-size:14px;color:#aaa;">
          <div><strong style="color:#fff;">104,261+</strong> Indexed Catalog</div>
          <div><strong style="color:#fff;">10 Fast Mirrors</strong> Per Title</div>
          <div><strong style="color:#fff;">Zero Account</strong> Registration</div>
          <div><strong style="color:#fff;">AdShield</strong> Link Protection</div>
          <div><strong style="color:#fff;">Dual Audio &amp; Dubs</strong> (Hindi, Urdu, English)</div>
        </section>

        <!-- Spotlight Catalog Grids -->
        ${renderGrid(SPOTLIGHT_TITLES, 'Trending & Top Rated on ShadowStream')}
      </main>
      ${footerHtml}
    </div>
  `;

  return { title, description, canonical, schema, semanticHtml };
}
