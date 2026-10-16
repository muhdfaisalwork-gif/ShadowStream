/**
 * watchlist.routes.js — Server-side persistence for user watchlist and history.
 *
 * Storage: catalog.db `user_watchlist` and `user_history` tables.
 * Anonymous auth via X-User-Id header or `user_id` query/body param (generated
 * client-side and stored in localStorage). No PII stored.
 *
 * Endpoints:
 *   GET    /api/v1/watchlist?user_id=...
 *   POST   /api/v1/watchlist       { user_id, title: { id, slug, title, type, year, poster, ... } }
 *   DELETE /api/v1/watchlist?user_id=...&title_id=...
 *   GET    /api/v1/history?user_id=...&limit=50
 *   POST   /api/v1/history         { user_id, title_id, position_sec, duration_sec, pct, episode_id, completed }
 *
 * All endpoints are write-or-read with simple INSERT OR REPLACE / DELETE semantics.
 * Failure returns 4xx with a JSON error — never silently drops writes.
 */
import express from 'express';
import sqlite3 from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const router = express.Router();
const CATALOG_DB = process.env.CATALOG_DB
    || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'scraper', 'catalog.db');
let db;
try {
    db = new sqlite3.DatabaseSync(CATALOG_DB);
    db.exec('PRAGMA journal_mode = WAL');
    console.log('[watchlist] catalog.db at', CATALOG_DB);
} catch (e) {
    console.error('[watchlist] cannot open catalog.db at', CATALOG_DB, e.message);
}

function getDb() {
    if (!db) throw new Error('catalog.db unavailable');
    return db;
}

function getUserId(req) {
    const raw = req.headers['x-user-id'] || req.query.user_id || req.body?.user_id || req.body?.userId || 'anonymous';
    const trimmed = String(raw).trim().slice(0, 64);
    return /^[a-zA-Z0-9_\-]+$/.test(trimmed) ? trimmed : 'anonymous';
}

/**
 * Resolve a title identifier — accept either a numeric id or a slug.
 * Returns the numeric id from the titles table, or null if not found.
 * If the slug doesn't exist yet but the request includes title metadata,
 * we upsert a placeholder row so the user_watchlist FK doesn't fail.
 */
function resolveTitleId(rawId, fallbackMeta) {
    if (rawId == null) return null;
    const trimmed = String(rawId).trim();
    if (!trimmed) return null;

    const db = getDb();
    // Numeric id — use as-is.
    if (/^\d+$/.test(trimmed)) {
        const row = db.prepare('SELECT id FROM titles WHERE id = ?').get(Number(trimmed));
        return row ? row.id : null;
    }
    // Slug — look up.
    const row = db.prepare('SELECT id FROM titles WHERE slug = ?').get(trimmed);
    if (row) return row.id;
    // Not in catalog yet — best-effort upsert of a stub so the FK succeeds.
    if (fallbackMeta) {
        const m = fallbackMeta;
        const slug = trimmed;
        const insert = db.prepare(`
            INSERT INTO titles (slug, title, type, year, poster, rating, popularity,
                                is_anime, is_short_drama, data_quality_score, metadata_state, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'stub', strftime('%s','now'))
        `);
        insert.run(
            slug, m.title || slug, m.type || 'movie',
            m.year || null, m.poster || null, m.rating || null,
            0, m.type === 'anime' ? 1 : 0, m.type === 'short_drama' ? 1 : 0
        );
        const r = db.prepare('SELECT id FROM titles WHERE slug = ?').get(slug);
        return r ? r.id : null;
    }
    return null;
}

router.get('/watchlist', (req, res) => {
    try {
        const uid = getUserId(req);
        const rows = getDb().prepare(`
            SELECT t.id, t.slug, t.title, t.type, t.year, t.poster, t.rating, w.added_at
            FROM user_watchlist w
            JOIN titles t ON t.id = w.title_id
            WHERE w.user_id = ?
            ORDER BY w.added_at DESC
        `).all(uid);
        res.json({ user_id: uid, items: rows });
    } catch (e) {
        res.status(500).json({ error: 'watchlist_read_failed', detail: e.message });
    }
});

router.post('/watchlist', (req, res) => {
    try {
        const uid = getUserId(req);
        const titleObj = (req.body?.title && typeof req.body.title === 'object')
            ? req.body.title
            : {
                id: req.body?.title_id || req.body?.titleId,
                slug: req.body?.slug,
                title: typeof req.body?.title === 'string' ? req.body.title : 'Untitled',
                type: req.body?.type || 'movie',
                year: req.body?.year,
                poster: req.body?.poster,
                rating: req.body?.rating
            };

        // Accept slug-only payloads: resolve the slug before the missing-id check.
        const resolveKey = titleObj.id || titleObj.slug;
        if (!resolveKey) {
            return res.status(400).json({ error: 'missing_title_id_or_slug' });
        }
        // Resolve slug → numeric id (also handles fresh-from-catalog rows).
        const numericId = resolveTitleId(resolveKey, {
            title: titleObj.title,
            type: titleObj.type,
            year: titleObj.year,
            poster: titleObj.poster,
            rating: titleObj.rating
        });
        if (!numericId) {
            return res.status(404).json({ error: 'title_not_in_catalog', title_id: resolveKey });
        }
        // Optional: patch fields if the caller provided richer metadata.
        if (titleObj.poster || titleObj.year || titleObj.rating || titleObj.title) {
            getDb().prepare(`
                UPDATE titles
                SET poster = COALESCE(?, poster),
                    year = COALESCE(?, year),
                    rating = COALESCE(?, rating),
                    title = COALESCE(?, title),
                    updated_at = strftime('%s','now')
                WHERE id = ?
            `).run(titleObj.poster || null, titleObj.year || null,
                   titleObj.rating || null, titleObj.title || null, numericId);
        }
        getDb().prepare(`
            INSERT OR REPLACE INTO user_watchlist (user_id, title_id, added_at)
            VALUES (?, ?, strftime('%s','now'))
        `).run(uid, numericId);
        res.json({ ok: true, user_id: uid, title_id: numericId });
    } catch (e) {
        res.status(500).json({ error: 'watchlist_add_failed', detail: e.message });
    }
});

router.delete(['/watchlist', '/watchlist/:titleId'], (req, res) => {
    try {
        const uid = getUserId(req);
        const rawTid = req.params?.titleId || req.query?.title_id || req.query?.id;
        if (!rawTid) return res.status(400).json({ error: 'missing_title_id' });
        const numericId = resolveTitleId(rawTid, null);
        if (!numericId) return res.status(404).json({ error: 'title_not_in_catalog', title_id: rawTid });
        getDb().prepare('DELETE FROM user_watchlist WHERE user_id = ? AND title_id = ?')
            .run(uid, numericId);
        res.json({ ok: true, user_id: uid, title_id: numericId });
    } catch (e) {
        res.status(500).json({ error: 'watchlist_remove_failed', detail: e.message });
    }
});

router.get('/history', (req, res) => {
    try {
        const uid = getUserId(req);
        const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 50));
        const rows = getDb().prepare(`
            SELECT t.id AS id, h.title_id, h.id AS history_id, h.episode_id, h.position_sec, h.duration_sec, h.pct, h.completed, h.ts,
                   t.slug, t.title, t.type, t.year, t.poster, t.backdrop
            FROM user_history h
            JOIN titles t ON t.id = h.title_id
            WHERE h.user_id = ?
            ORDER BY h.ts DESC
            LIMIT ?
        `).all(uid, limit);
        res.json({ user_id: uid, items: rows });
    } catch (e) {
        res.status(500).json({ error: 'history_read_failed', detail: e.message });
    }
});

router.post('/history', (req, res) => {
    try {
        const uid = getUserId(req);
        const raw_title_id = req.body?.title_id || req.body?.titleId || req.body?.slug;
        const episode_id = req.body?.episode_id || req.body?.episodeId;
        const position_sec = req.body?.position_sec ?? req.body?.currentTime ?? 0;
        const duration_sec = req.body?.duration_sec ?? req.body?.duration ?? 0;
        const pct = req.body?.pct ?? req.body?.progressPct ?? 0;
        const completed = req.body?.completed || false;

        if (!raw_title_id) return res.status(400).json({ error: 'missing_title_id_or_slug' });
        const numericId = resolveTitleId(raw_title_id, {
            title: req.body?.title,
            type: req.body?.type,
            year: req.body?.year,
            poster: req.body?.poster,
            rating: req.body?.rating
        });
        if (!numericId) return res.status(404).json({ error: 'title_not_in_catalog', title_id: raw_title_id });
        getDb().prepare(`
            INSERT INTO user_history
              (user_id, title_id, episode_id, position_sec, duration_sec, pct, completed, ts)
            VALUES (?, ?, ?, ?, ?, ?, ?, strftime('%s','now'))
        `).run(uid, numericId, episode_id ? Number(episode_id) : null,
               Number(position_sec) || 0, Number(duration_sec) || 0,
               Number(pct) || 0, completed ? 1 : 0);
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: 'history_write_failed', detail: e.message });
    }
});

router.delete(['/history', '/history/:titleId'], (req, res) => {
    try {
        const uid = getUserId(req);
        if (req.query.all === 'true' || req.query.clear === 'true') {
            getDb().prepare('DELETE FROM user_history WHERE user_id = ?').run(uid);
            return res.json({ ok: true, cleared: 'all' });
        }
        const rawTid = req.params?.titleId || req.query?.title_id || req.query?.id;
        if (rawTid) {
            const numericId = resolveTitleId(rawTid, null);
            if (!numericId) return res.status(404).json({ error: 'title_not_in_catalog', title_id: rawTid });
            getDb().prepare('DELETE FROM user_history WHERE user_id = ? AND title_id = ?')
                .run(uid, numericId);
            return res.json({ ok: true, removed: numericId });
        }
        res.status(400).json({ error: 'specify ?all=true or ?title_id=N' });
    } catch (e) {
        res.status(500).json({ error: 'history_delete_failed', detail: e.message });
    }
});

export default router;