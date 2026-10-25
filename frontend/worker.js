export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
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

      if (
        url.pathname === '/downloads' ||
        url.pathname.startsWith('/downloads/') ||
        url.pathname === '/api' ||
        url.pathname.startsWith('/api/') ||
        url.pathname === '/version.json' ||
        url.pathname === '/app-version' ||
        url.pathname === '/latest.yml'
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
      if (env.ASSETS) {
        let res = await env.ASSETS.fetch(request);
        if (res.status === 404 && request.method === 'GET' && !url.pathname.startsWith('/_expo/')) {
          // Prevent SPA index.html fallback on crawler & SEO files or binary assets
          const isCrawlerOrStatic = 
            url.pathname === '/sitemap.xml' ||
            url.pathname === '/robots.txt' ||
            url.pathname === '/llms.txt' ||
            url.pathname.endsWith('.xml') ||
            url.pathname.endsWith('.txt') ||
            url.pathname.endsWith('.ico') ||
            url.pathname.endsWith('.png') ||
            url.pathname.endsWith('.jpg') ||
            url.pathname.endsWith('.webp');

          if (!isCrawlerOrStatic) {
            res = await env.ASSETS.fetch(new Request(new URL('/index.html', request.url), request));
          }
        }

        // Cache-control headers:
        // HTML, Service Worker, and Manifest MUST NEVER be cached by edge or browser.
        // Content-hashed static JS/CSS can be cached immutably.
        const isHtmlOrSw = 
          url.pathname === '/' || 
          url.pathname === '/index.html' || 
          url.pathname === '/sw.js' || 
          url.pathname === '/manifest.webmanifest' ||
          url.pathname === '/version.json';

        if (isHtmlOrSw && res && res.ok) {
          const newHeaders = new Headers(res.headers);
          newHeaders.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
          newHeaders.set('Pragma', 'no-cache');
          newHeaders.set('Expires', '0');
          return new Response(res.body, {
            status: res.status,
            statusText: res.statusText,
            headers: newHeaders
          });
        }

        if (url.pathname.startsWith('/_expo/static/') && res && res.ok) {
          const newHeaders = new Headers(res.headers);
          newHeaders.set('Cache-Control', 'public, max-age=31536000, immutable');
          return new Response(res.body, {
            status: res.status,
            statusText: res.statusText,
            headers: newHeaders
          });
        }

        return res;
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
