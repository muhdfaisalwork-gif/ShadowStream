# Deployment Guide

## Prerequisites

1. **Cloudflare Account** with:
   - Cloudflare Pages enabled
   - Cloudflare Workers enabled
   - (Optional) Cloudflare D1 for database
   - (Optional) Cloudflare R2 for media storage
   - (Optional) Cloudflare KV for caching

2. **GitHub Repository** with secrets configured

3. **API Keys** (add to GitHub Secrets and Cloudflare Worker/Page environment variables):
   - `TMDB_API_KEY` - Get from https://www.themoviedb.org/settings/api
   - `TMDB_ACCESS_TOKEN` - JWT bearer token from TMDB
   - `TVDB_API_KEY` - Get from https://thetvdb.com/api-information
   - `MDBLIST_API_KEY` - Get from https://mdblist.com/preferences/

## GitHub Secrets

Go to your GitHub repository Settings > Secrets and variables > Actions and add:

| Secret | Description |
|--------|-------------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token with Pages:Edit and Workers:Edit permissions |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID (found on dashboard) |
| `TMDB_API_KEY` | TMDB v3 API key |
| `TMDB_ACCESS_TOKEN` | TMDB v4 JWT access token |
| `TVDB_API_KEY` | TheTVDB v4 API key |
| `MDBLIST_API_KEY` | MDBList API key |

## Cloudflare Setup

### 1. Create Cloudflare Pages Project

1. Go to Cloudflare Dashboard > Pages
2. Click "Create a project" > "Connect to Git"
3. Select your GitHub repository
4. Configure build settings:
   - **Project name**: `streamapp`
   - **Production branch**: `main`
   - **Build command**: `cd frontend && npm run build:web`
   - **Build output directory**: `frontend/dist`
   - **Root directory**: `/`
5. Add environment variables in Pages project settings:
   - `API_BASE_URL` = `https://streamapp-backend.your-subdomain.workers.dev/api/v1`

### 2. Create Cloudflare Worker for Backend

1. Go to Cloudflare Dashboard > Workers & Pages
2. Click "Create a Service" > "Build from Git"
3. Select your GitHub repository
4. Configure:
   - **Service name**: `streamapp-backend`
   - **Main entry point**: `src/index.js`
   - **Build command**: `cd backend && npm ci`
   - **Root directory**: `/backend`
5. Add bindings in Worker settings:
   - **D1 Database** (optional): `DB` binding to your D1 database
   - **KV Namespace** (optional): `CACHE` binding for rate limiting
   - **R2 Bucket** (optional): `MEDIA` binding for media storage
6. Add environment variables/secrets:
   - `TMDB_API_KEY`
   - `TMDB_ACCESS_TOKEN`
   - `TVDB_API_KEY`
   - `MDBLIST_API_KEY`
   - `DB_PATH` = `./streaming_app.db` (or D1 binding)

### 3. Configure Custom Domain (Optional)

1. In Cloudflare Pages project > Custom domains
2. Click "Set up a custom domain"
3. Enter your domain (e.g., `streamapp.example.com`)
4. Cloudflare will auto-configure DNS if using Cloudflare nameservers

2. For the backend worker, add a custom domain in Worker settings:
   - `api.streamapp.example.com` → Worker route

## Local Development

```bash
# Backend
cd backend
npm run dev

# Frontend (web)
cd frontend
npm run web

# Frontend (with Cloudflare dev)
cd frontend
npm run preview
```

## Manual Deployment

```bash
# Deploy frontend to Cloudflare Pages
cd frontend
npm run build:web
npx wrangler pages deploy dist --project-name=streamapp

# Deploy backend worker
cd backend
npx wrangler deploy
```

## Database Migration

The catalog database (`catalog.db`) is automatically initialized on first run. For production with 200K+ titles:

1. Run the ingestion scripts locally:
   ```bash
   cd scraper
   python ingest_tmdb_scale.py --target 200000
   ```

2. Copy `catalog.db` to your production environment (D1, R2, or persistent volume)

## Monitoring

- **Cloudflare Analytics**: Built-in for Pages and Workers
- **Observability**: Enabled in wrangler config
- **Health checks**: 
  - Frontend: `https://your-domain.com/health`
  - Backend: `https://api.your-domain.com/health`
  - Catalog: `https://api.your-domain.com/api/v1/stats`

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Build fails | Check Node.js version (22+) and npm cache |
| Worker deployment fails | Verify API keys in Cloudflare secrets |
| Pages 404 on refresh | Ensure `not_found_handling: "single-page-application"` |
| CORS errors | Check `CORS_ORIGIN` and `Access-Control-Allow-Origin` headers |
| Database not found | Verify `DB_PATH` or D1 binding |

## Rollback

```bash
# Rollback Pages deployment
npx wrangler pages deployment rollback --project-name=streamapp

# Rollback Worker
npx wrangler rollback --name=streamapp-backend
```