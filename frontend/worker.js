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

      if (
        url.pathname === '/downloads' ||
        url.pathname.startsWith('/downloads/') ||
        url.pathname === '/api' ||
        url.pathname.startsWith('/api/')
      ) {
        const targetUrl = new URL(url.pathname + url.search, 'https://streamapp-catalog.muhd-faisal-work.workers.dev');
        const proxyRequest = new Request(targetUrl.toString(), request);
        return await fetch(proxyRequest);
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
