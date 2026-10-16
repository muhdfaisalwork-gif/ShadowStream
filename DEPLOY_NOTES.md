# Streaming Platform — Deploy & Operations Notes (2026-09-23)

## What's live

- **Public bundle**: https://obrm4w0row88o.space.minimax.io/ — CDN-deployed Expo Web bundle (1.98 MB), clean (0 vidsrc / multiembed refs).
- **Local backend**: Node :3000 (Express proxy + watchlist + admin).
- **Local catalog**: Python FastAPI :7801 (sqlite, 13,390 indexed titles, 42 countries, 68 collections, 18 audience tags).
- **Drive node**: `444589535179057` — `website_deploy` re-publishes in-place to the same URL.

## Known limitation: public backend URL

The deployed bundle's `api.js` resolves the API base in this order:
1. `window.__STREAMING_CONFIG__.apiBase` (set in `dist/index.html` `<script>` block)
2. Same-origin `${origin}/api/v1` (works only when backend is co-hosted)
3. `http://localhost:3000/api/v1` (local dev only)
4. Hardcoded tunnel fallback

**Today the public bundle hits same-origin which returns 404** — there's no backend hosted at `obrm4w0row88o.space.minimax.io`. Visitors see the bundle load but every API call fails.

## How to make the public site fully functional

Three options, in order of preference:

### Option A — Deploy backend to CloudRun (recommended)

`backend/src/index.js` is a plain Express server, and `backend/Dockerfile` + `backend/.dockerignore` are now ready for one-step CloudRun deploy. Run:

```
mcp__cloudbase-mcp__manageCloudRun(
  action="deploy",
  serverName="streamapp-backend",
  targetPath="G:\\streaming app\\backend",
  imageUrl=null,           // build from source via Dockerfile
  serverType="container",
  serverConfig={ MinNum: 1, MaxNum: 3, Cpu: 1, Mem: 2, Port: 3000, OpenAccessTypes: ["PUBLIC"] }
)
```

Wait for the resulting HTTPS URL (typically `https://streamapp-backend-<envId>.run.app`). Then update `frontend/dist/index.html`:

```html
<script>
  window.__STREAMING_CONFIG__ = {
    apiBase: 'https://streamapp-backend-<envId>.run.app/api/v1'
  };
</script>
```

…then `website_deploy --node_id 444589535179057` (in-place update).

Then either:
- Update the deployed bundle's `index.html` script block to point at the CloudRun URL and redeploy, OR
- Update the backend's CORS allowlist to include `https://obrm4w0row88o.space.minimax.io` and call the CloudRun URL from same-origin (won't work — different origin).

**Bottom line:** the cleanest path is to set `apiBase` to the CloudRun URL. Edit `frontend/dist/index.html`:
```html
<script>
  window.__STREAMING_CONFIG__ = {
    apiBase: 'https://streamapp-backend-<hash>.run.app/api/v1'
  };
</script>
```
…then `website_deploy --node_id 444589535179057` (in-place update).

### Option B — Stand up a tunnel

Any of these will expose `localhost:3000` to a public URL:
- **Cloudflare quick tunnel**: `cloudflared tunnel --url http://localhost:3000` (free, no account)
- **ngrok**: requires account (free tier)
- **Tunnelmole**: `npx tunnelmole 3000` (was on the old setup but tunnel URL went dead)
- **Serveo**: `ssh -R 80:127.0.0.1:3000 serveo.net` (no install; SSH-only). Tested this session — `streamapp` and `sultrix-streaming-2026` subdomains both reserved; pick a unique random name.

After tunnel is up, set `apiBase` to the tunnel URL and redeploy.

### Option C — Stand up CloudBase Functions

Convert `backend/src/index.js` into a cloud function or HTTP-trigger function, deploy via `mcp__cloudbase-mcp__manageFunctions`, set the function URL as `apiBase`. Lowest long-term cost but requires function refactor.

## Local development

Run locally with both services:
```bash
# Terminal 1 — catalog
cd "G:\streaming app\scraper"
C:\Users\Lucifer\AppData\Local\Python\pythoncore-3.14-64\python.exe -m uvicorn catalog_service:app --host 127.0.0.1 --port 7801

# Terminal 2 — backend (serves catalog proxy + watchlist + admin + frontend dev)
cd "G:\streaming app"
C:\Program Files\nodejs\node.exe backend/src/index.js
```

Hit `http://localhost:3000` for the full app (same-origin resolves correctly).
Hit `http://localhost:7801/api/v1/health` for catalog-only API.

## Rebuild the bundle

When source files change:
```bash
cd "G:\streaming app\frontend"
node node_modules/@expo/cli/main.js export --platform web
```
Then re-inject `dist/index.html` customizations (SEO meta, runtime config, a11y CSS, skip-link) and redeploy via `website_deploy --node_id 444589535179057`.

## Catalog health at session end

- 13,390 indexed titles (10 playable via lawful sources, 11,783 metadata stubs)
- 42 countries populated, only `XX International` placeholder empty
- Field coverage: poster 99.1%, original_title 100%, rating 99.4%, overview 8.3%, backdrop 7.4%
- 30+ API endpoints live: `/health`, `/api/v1/{stats,catalog/health,home,categories,titles/*,search,genres,categories,countries,languages,collections,years,sources,audience-tags,title/{slug},collections/{slug},genres/{slug},countries/{code},languages/{code}}`

## Out-of-scope items

- **TMDB auto-enrichment** (11,449 stub titles): needs `TMDB_API_KEY` env var. Pipeline is wired but disabled without a key.
- **Real-time ingestion jobs**: `live_service.py` (port 7800) is offline. Needs scheduled scraper jobs to keep catalog fresh.
