import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import router from './api/routes.js';
import catalogRouter from './api/catalog.routes.js';
import watchlistRouter from './api/watchlist.routes.js';
import adminRouter from './api/admin.routes.js';
import { liveClient } from './services/LiveClient.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const isDev = process.env.NODE_ENV !== 'production';

// Security: Disable Express fingerprinting
app.disable('x-powered-by');

// Security: Helmet headers with tailored Content Security Policy
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "blob:", "https:", "http:"],
            mediaSrc: ["'self'", "blob:", "data:", "https:", "http:"],
            connectSrc: ["'self'", "https:", "http:", "ws:", "wss:"],
            frameSrc: ["'self'", "https:", "http:"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
            frameAncestors: ["'self'"], // Block clickjacking via 3rd-party iframe embeds
        },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

// Security: Controlled CORS configuration
const rawCors = process.env.CORS_ORIGIN || '*';
const allowedOrigins = rawCors === '*' ? '*' : rawCors.split(',').map(o => o.trim());

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins === '*') return callback(null, true);
        if (Array.isArray(allowedOrigins) && allowedOrigins.includes(origin)) return callback(null, true);
        if (isDev && (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin))) return callback(null, true);
        return callback(new Error('CORS request blocked by security policy'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id', 'X-Admin-Token'],
    maxAge: 86400,
}));

app.use(express.json({ limit: '1mb' }));

// Catalog proxy routes (multi-facet discovery: genres, countries, languages, etc.)
// MUST be registered BEFORE /api/v1 router so catalog data wins for shared paths.
app.use('/', catalogRouter);
// Watchlist + history persistence (Phase 14) — uses node:sqlite directly.
app.use('/api/v1', watchlistRouter);
// Internal admin catalog endpoints (separate path so they don't pollute public API).
app.use('/internal/admin/v1', adminRouter);
// API Routes (search, stream extraction, etc.)
app.use('/api/v1', router);

// Health check
app.get('/health', async (req, res) => {
    await liveClient.probe();
    // Also probe catalog service
    let catalogAvailable = false;
    try {
        const r = await fetch('http://127.0.0.1:7801/health');
        catalogAvailable = r.ok;
    } catch {}
    res.status(200).json({
        status: 'healthy',
        message: 'Streaming Aggregator Backend is running',
        port: PORT,
        liveAvailable: liveClient.liveAvailable,
        liveTitlesCached: liveClient.liveTitlesCached,
        catalogAvailable,
        tmdbEnrichment: liveClient.tmdbEnabled,
        uptime: process.uptime(),
    });
});

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../../frontend/dist');

// Serve static frontend web build with dotfiles protection
if (fs.existsSync(distPath)) {
    app.use(express.static(distPath, {
        dotfiles: 'ignore', // Never serve hidden files (.env, .git, etc.)
        etag: true,
        maxAge: '1d',
    }));
}

// Serve native apps & downloads from downloads directory
const downloadsPath = path.resolve(__dirname, '../../downloads');
if (fs.existsSync(downloadsPath)) {
    app.use('/downloads', express.static(downloadsPath, {
        dotfiles: 'ignore',
        etag: true,
    }));
}
// Serve Windows native installer from packaging if requested
app.get('/downloads/ShadowStream-Setup-x64.exe', (req, res, next) => {
    const winExe = path.resolve(__dirname, '../../packaging/windows/ShadowStream-Setup-x64.exe');
    if (fs.existsSync(winExe)) {
        return res.sendFile(winExe);
    }
    next();
});

// Fallback SPA routing for web client (non-API GET requests)
app.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    if (req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/health')) {
        return next();
    }
    const indexHtml = path.join(distPath, 'index.html');
    if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
    } else {
        res.status(200).json({
            name: 'StreamApp Aggregator Backend',
            endpoints: {
                health: '/health',
                search: '/api/v1/search?q=<query>',
                stream: '/api/v1/stream  (POST {url, sourceName})',
            },
        });
    }
});

// 404 handler for unmatched API requests
app.use((req, res) => {
    res.status(404).json({ error: 'Not Found', path: req.originalUrl });
});

// Error handler (sanitizes error details in production)
app.use((err, req, res, _next) => {
    console.error('[backend] Unhandled error:', err);
    res.status(500).json({
        error: 'Internal server error',
        ...(isDev ? { detail: err.message } : {})
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Streaming Aggregator Backend running on http://localhost:${PORT}`);
    console.log(`   Health:  http://localhost:${PORT}/health`);
    console.log(`   API:     http://localhost:${PORT}/api/v1`);
});