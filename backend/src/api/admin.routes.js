/**
 * admin.routes.js — Internal catalog admin endpoints.
 * Honest CRUD over the canonical title/availability records.
 *
 * Auth: any caller with the X-Admin-Token header matching ADMIN_TOKEN env var
 * (or no token check when ADMIN_TOKEN is unset — dev mode).
 * No user-facing exposure: this router is mounted under /internal/admin/v1.
 */
import express from 'express';
import crypto from 'node:crypto';
import path from 'node:path';
import sqlite3 from 'node:sqlite';
import { fileURLToPath } from 'node:url';

const router = express.Router();

const CATALOG_DB = process.env.CATALOG_DB
    || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'scraper', 'catalog.db');
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

let db;
try {
    db = new sqlite3.DatabaseSync(CATALOG_DB);
    db.exec('PRAGMA journal_mode = WAL');
    console.log('[admin] catalog.db at', CATALOG_DB);
} catch (e) {
    console.error('[admin] cannot open catalog.db at', CATALOG_DB, e.message);
}

function safeCompare(a, b) {
    if (!a || !b) return false;
    const bufA = Buffer.from(String(a));
    const bufB = Buffer.from(String(b));
    if (bufA.length !== bufB.length) {
        crypto.timingSafeEqual(bufA, bufA);
        return false;
    }
    return crypto.timingSafeEqual(bufA, bufB);
}

function checkAdmin(req, res, next) {
    const isDev = process.env.NODE_ENV !== 'production' && !ADMIN_TOKEN;
    if (isDev) {
        // In local development when ADMIN_TOKEN is not configured, confine strictly to loopback/localhost
        const remoteIp = req.socket?.remoteAddress || req.ip || '';
        const isLoopback = remoteIp === '127.0.0.1' || remoteIp === '::1' || remoteIp === '::ffff:127.0.0.1';
        if (!isLoopback) {
            return res.status(403).json({ error: 'admin_access_restricted_to_localhost_in_dev_mode' });
        }
        return next();
    }

    if (!ADMIN_TOKEN || ADMIN_TOKEN.trim().length < 8) {
        return res.status(503).json({ error: 'admin_disabled_unconfigured_token' });
    }

    // Require token in header (never in query parameter to avoid log/referrer exposure)
    const token = req.headers['x-admin-token'];
    if (!token || !safeCompare(token, ADMIN_TOKEN)) {
        return res.status(401).json({ error: 'admin_auth_required' });
    }
    return next();
}

router.use(checkAdmin);

// =========================================================
// Catalog stats — truthful inventory
// =========================================================
router.get('/stats', (req, res) => {
    try {
        const totals = db.prepare(`
            SELECT COUNT(*) AS indexed,
                   SUM(CASE WHEN metadata_state = 'complete' THEN 1 ELSE 0 END) AS complete,
                   SUM(CASE WHEN metadata_state = 'partial' THEN 1 ELSE 0 END) AS partial,
                   SUM(CASE WHEN metadata_state = 'stub' THEN 1 ELSE 0 END) AS stub,
                   SUM(CASE WHEN rating IS NOT NULL THEN 1 ELSE 0 END) AS with_rating,
                   SUM(CASE WHEN overview IS NOT NULL AND length(overview) > 40 THEN 1 ELSE 0 END) AS with_overview,
                   SUM(CASE WHEN poster IS NOT NULL AND poster != '' THEN 1 ELSE 0 END) AS with_poster,
                   SUM(CASE WHEN backdrop IS NOT NULL AND backdrop != '' THEN 1 ELSE 0 END) AS with_backdrop
            FROM titles
        `).get();
        const byType = db.prepare(`
            SELECT type, COUNT(*) AS n FROM titles GROUP BY type ORDER BY n DESC
        `).all();
        const dupSlug = db.prepare(`
            SELECT slug, COUNT(*) AS n FROM titles GROUP BY slug HAVING n > 1
        `).all();
        res.json({
            ...totals,
            by_type: byType,
            duplicate_slugs: dupSlug.length,
            duplicates_sample: dupSlug.slice(0, 10)
        });
    } catch (e) {
        res.status(500).json({ error: 'stats_failed', detail: e.message });
    }
});

// =========================================================
// Duplicate detection
// =========================================================
router.get('/duplicates', (req, res) => {
    try {
        const limit = Math.min(200, Number(req.query.limit) || 50);
        const rows = db.prepare(`
            SELECT LOWER(title) AS canonical_title, year, COUNT(*) AS n, GROUP_CONCAT(id) AS ids, GROUP_CONCAT(slug) AS slugs
            FROM titles
            WHERE year IS NOT NULL AND year > 1900
            GROUP BY LOWER(title), year
            HAVING n > 1
            ORDER BY n DESC
            LIMIT ?
        `).all(limit);
        res.json({ count: rows.length, duplicates: rows });
    } catch (e) {
        res.status(500).json({ error: 'dup_check_failed', detail: e.message });
    }
});

// =========================================================
// Find a title by id/slug
// =========================================================
router.get('/title/:idOrSlug', (req, res) => {
    try {
        const key = req.params.idOrSlug;
        let row;
        if (/^\d+$/.test(key)) {
            row = db.prepare('SELECT * FROM titles WHERE id = ?').get(Number(key));
        } else {
            row = db.prepare('SELECT * FROM titles WHERE slug = ?').get(key);
        }
        if (!row) return res.status(404).json({ error: 'title_not_found' });
        // Hydrate relations
        const genres = db.prepare(`
            SELECT g.slug, g.name FROM genres g
            JOIN title_genres tg ON tg.genre_id = g.id
            WHERE tg.title_id = ?
        `).all(row.id);
        const countries = db.prepare(`
            SELECT c.code, c.name FROM countries c
            JOIN title_countries tc ON tc.country_id = c.id
            WHERE tc.title_id = ?
        `).all(row.id);
        const languages = db.prepare(`
            SELECT l.code, l.name FROM languages l
            JOIN title_languages tl ON tl.language_id = l.id
            WHERE tl.title_id = ?
        `).all(row.id);
        const audio = db.prepare(`
            SELECT l.code, l.name FROM languages l
            JOIN title_audio_languages al ON al.language_id = l.id
            WHERE al.title_id = ?
        `).all(row.id);
        const subs = db.prepare(`
            SELECT l.code, l.name FROM languages l
            JOIN title_subtitle_languages sl ON sl.language_id = l.id
            WHERE sl.title_id = ?
        `).all(row.id);
        const collections = db.prepare(`
            SELECT c.slug, c.name, c.type FROM collections c
            JOIN title_collections tc ON tc.collection_id = c.id
            WHERE tc.title_id = ?
        `).all(row.id);
        const availability = db.prepare(`
            SELECT s.slug AS source, s.name AS source_name, s.is_legal AS is_legal,
                   a.kind, a.status, a.external_url AS url, a.playback_url,
                   a.requires_auth, a.is_legal_verified, a.last_checked_at
            FROM availability a JOIN sources s ON s.id = a.source_id
            WHERE a.title_id = ?
        `).all(row.id);
        res.json({ ...row, genres, countries, languages, audio_languages: audio,
                  subtitle_languages: subs, collections, availability });
    } catch (e) {
        res.status(500).json({ error: 'lookup_failed', detail: e.message });
    }
});

// =========================================================
// Create a new title (POST). Required: title, slug, type, year.
// Optional: overview, rating, runtime, status, poster, backdrop, etc.
// If slug already exists -> 409 conflict.
// =========================================================
router.post('/title', (req, res) => {
    try {
        const body = req.body || {};
        const required = ['title', 'slug', 'type', 'year'];
        for (const f of required) {
            if (!body[f] || (typeof body[f] === 'string' && body[f].trim() === '')) {
                return res.status(400).json({ error: 'missing_field', field: f });
            }
        }
        const existing = db.prepare('SELECT id FROM titles WHERE slug = ?').get(body.slug);
        if (existing) return res.status(409).json({ error: 'slug_taken', id: existing.id });

        const insertable = ['title', 'original_title', 'slug', 'type', 'year', 'overview',
            'tagline', 'rating', 'poster', 'backdrop', 'trailer_url', 'runtime',
            'status', 'certification', 'popularity', 'metadata_state', 'data_quality_score'];
        const cols = [];
        const placeholders = [];
        const values = [];
        for (const k of insertable) {
            if (body[k] !== undefined) {
                cols.push(k);
                placeholders.push('?');
                values.push(body[k]);
            }
        }
        cols.push('created_at'); placeholders.push("strftime('%s','now')");
        cols.push('updated_at'); placeholders.push("strftime('%s','now')");
        const sql = `INSERT INTO titles (${cols.join(',')}) VALUES (${placeholders.join(',')})`;
        const info = db.prepare(sql).run(...values);
        const newRow = db.prepare('SELECT * FROM titles WHERE id = ?').get(info.lastInsertRowid);
        res.status(201).json({ ok: true, created: newRow });
    } catch (e) {
        res.status(500).json({ error: 'create_failed', detail: e.message });
    }
});

// =========================================================
// Merge duplicate titles into a single canonical record.
// Body: { keep: <idOrSlug>, remove: <idOrSlug>[] }
// All junction rows + availability from `remove` move to `keep`,
// then `remove` titles are deleted.
// =========================================================
router.post('/duplicate/merge', (req, res) => {
    try {
        const keepKey = (req.body || {}).keep;
        const removeKeys = Array.isArray((req.body || {}).remove) ? req.body.remove : [];
        if (!keepKey || removeKeys.length === 0) {
            return res.status(400).json({ error: 'missing_keep_or_remove' });
        }
        const resolve = (k) => /^\d+$/.test(k) ? Number(k)
            : (db.prepare('SELECT id FROM titles WHERE slug = ?').get(k) || {}).id;
        const keepId = resolve(keepKey);
        if (!keepId) return res.status(404).json({ error: 'keep_not_found' });
        const junctionTables = [
            'title_genres', 'title_countries', 'title_languages',
            'title_audio_languages', 'title_subtitle_languages',
            'title_collections', 'title_cast', 'title_crew',
            'title_audience_tags', 'title_aka', 'title_translations'
        ];
        let moved = 0;
        let deleted = 0;
        for (const removeKey of removeKeys) {
            const remId = resolve(removeKey);
            if (!remId || remId === keepId) continue;
            for (const t of junctionTables) {
                try {
                    const info = db.prepare(`UPDATE OR IGNORE ${t} SET title_id = ? WHERE title_id = ?`).run(keepId, remId);
                    moved += Number(info.changes || 0);
                    db.prepare(`DELETE FROM ${t} WHERE title_id = ?`).run(remId);
                } catch (_) {}
            }
            try {
                db.prepare('UPDATE OR IGNORE availability SET title_id = ? WHERE title_id = ?').run(keepId, remId);
                db.prepare('DELETE FROM availability WHERE title_id = ?').run(remId);
            } catch (_) {}
            const del = db.prepare('DELETE FROM titles WHERE id = ?').run(remId);
            deleted += Number(del.changes || 0);
        }
        res.json({ ok: true, keep_id: keepId, junction_rows_moved: moved, titles_deleted: deleted });
    } catch (e) {
        res.status(500).json({ error: 'merge_failed', detail: e.message });
    }
});

// =========================================================
// Manage taxonomy nodes (genre, country, language, collection).
// Body: { kind: 'genre'|'country'|'language'|'collection', ...fields }
// POST -> create; PATCH (id) -> update.
// `kind` selects the target table; row fields must not include `kind`.
// =========================================================
router.post('/taxonomy', (req, res) => {
    try {
        const body = req.body || {};
        const allowed = {
            genre: { table: 'genres', cols: ['slug', 'name'] },
            country: { table: 'countries', cols: ['code', 'name', 'slug'] },
            language: { table: 'languages', cols: ['code', 'name', 'slug'] },
            collection: { table: 'collections', cols: ['slug', 'name', 'type', 'description'] }
        };
        const meta = allowed[body.kind];
        if (!meta) return res.status(400).json({ error: 'invalid_kind', allowed: Object.keys(allowed) });
        const cols = []; const values = [];
        for (const c of meta.cols) {
            if (body[c] !== undefined && body[c] !== '') { cols.push(c); values.push(body[c]); }
        }
        if (cols.length === 0) return res.status(400).json({ error: 'no_fields' });
        const placeholders = cols.map(() => '?').join(',');
        const sql = `INSERT INTO ${meta.table} (${cols.join(',')}) VALUES (${placeholders})`;
        try {
            const info = db.prepare(sql).run(...values);
            const row = db.prepare(`SELECT * FROM ${meta.table} WHERE id = ?`).get(info.lastInsertRowid);
            res.status(201).json({ ok: true, created: row });
        } catch (e) {
            if (/UNIQUE/.test(e.message)) return res.status(409).json({ error: 'duplicate_node', detail: e.message });
            throw e;
        }
    } catch (e) {
        res.status(500).json({ error: 'taxonomy_create_failed', detail: e.message });
    }
});

// =========================================================
// Force-recheck availability for a single title (or all titles).
// Marks stale availability rows as 'unknown' so the next sync run picks them up.
// Body: { idOrSlug?: string, all?: boolean }
// =========================================================
router.post('/availability/check', (req, res) => {
    try {
        const body = req.body || {};
        let sql; let params = [];
        if (body.all === true) {
            const result = db.prepare(`
                UPDATE availability SET status = 'unknown', last_checked_at = NULL
                WHERE status IN ('unavailable', 'temporarily_unavailable') OR last_checked_at IS NULL
            `).run();
            return res.json({ ok: true, mode: 'all', marked: Number(result.changes || 0) });
        }
        if (!body.idOrSlug) return res.status(400).json({ error: 'missing_id_or_all' });
        const key = body.idOrSlug;
        let id;
        if (/^\d+$/.test(key)) id = Number(key);
        else {
            const r = db.prepare('SELECT id FROM titles WHERE slug = ?').get(key);
            if (!r) return res.status(404).json({ error: 'title_not_found' });
            id = r.id;
        }
        const result = db.prepare(`
            UPDATE availability SET status = 'unknown', last_checked_at = NULL
            WHERE title_id = ?
        `).run(id);
        res.json({ ok: true, mode: 'single', id, marked: Number(result.changes || 0) });
    } catch (e) {
        res.status(500).json({ error: 'recheck_failed', detail: e.message });
    }
});

// =========================================================
// Patch a title (admin override of any field)
// =========================================================
router.patch('/title/:idOrSlug', (req, res) => {
    try {
        const key = req.params.idOrSlug;
        const allowed = ['title', 'original_title', 'overview', 'tagline', 'rating',
                         'poster', 'backdrop', 'trailer_url', 'year', 'runtime',
                         'status', 'certification', 'popularity',
                         'metadata_state', 'data_quality_score'];
        const updates = [];
        const values = [];
        for (const [k, v] of Object.entries(req.body || {})) {
            if (allowed.includes(k)) { updates.push(`${k} = ?`); values.push(v); }
        }
        if (updates.length === 0) return res.status(400).json({ error: 'no_fields_to_update' });

        let id;
        if (/^\d+$/.test(key)) id = Number(key);
        else {
            const r = db.prepare('SELECT id FROM titles WHERE slug = ?').get(key);
            if (!r) return res.status(404).json({ error: 'title_not_found' });
            id = r.id;
        }
        values.push(id);
        db.prepare(`UPDATE titles SET ${updates.join(', ')}, updated_at = strftime('%s','now') WHERE id = ?`).run(...values);
        const updated = db.prepare('SELECT id, slug, title, year, rating, overview, poster, status, metadata_state FROM titles WHERE id = ?').get(id);
        res.json({ ok: true, updated });
    } catch (e) {
        res.status(500).json({ error: 'patch_failed', detail: e.message });
    }
});

// =========================================================
// Delete a title (and its junction rows + availability)
// =========================================================
router.delete('/title/:idOrSlug', (req, res) => {
    try {
        const key = req.params.idOrSlug;
        let id;
        if (/^\d+$/.test(key)) id = Number(key);
        else {
            const r = db.prepare('SELECT id FROM titles WHERE slug = ?').get(key);
            if (!r) return res.status(404).json({ error: 'title_not_found' });
            id = r.id;
        }
        // Junction tables
        const junctionTables = [
            'title_genres', 'title_countries', 'title_languages',
            'title_audio_languages', 'title_subtitle_languages',
            'title_collections', 'title_cast', 'title_crew',
            'title_audience_tags', 'title_aka', 'title_translations'
        ];
        let removedJunctions = 0;
        for (const t of junctionTables) {
            try {
                const info = db.prepare(`DELETE FROM ${t} WHERE title_id = ?`).run(id);
                removedJunctions += Number(info.changes || 0);
            } catch (_) { /* table might not exist */ }
        }
        // Availability may have episode_id links — best-effort
        let removedAvailability = 0;
        try {
            const info = db.prepare('DELETE FROM availability WHERE title_id = ?').run(id);
            removedAvailability = Number(info.changes || 0);
        } catch (_) {}
        const titleInfo = db.prepare('DELETE FROM titles WHERE id = ?').run(id);
        res.json({ ok: true, removed_title_id: id, removed_junctions: removedJunctions,
                  removed_availability: removedAvailability, removed_title_rows: Number(titleInfo.changes || 0) });
    } catch (e) {
        res.status(500).json({ error: 'delete_failed', detail: e.message });
    }
});

// =========================================================
// Source health
// =========================================================
router.get('/sources/health', (req, res) => {
    try {
        const rows = db.prepare(`
            SELECT s.slug, s.name, s.is_legal, s.enabled, s.type,
                   COUNT(a.id) AS availability_records,
                   SUM(CASE WHEN a.status = 'available' THEN 1 ELSE 0 END) AS available,
                   SUM(CASE WHEN a.status = 'unavailable' THEN 1 ELSE 0 END) AS unavailable,
                   SUM(CASE WHEN a.status = 'coming_soon' THEN 1 ELSE 0 END) AS coming_soon,
                   MAX(a.last_checked_at) AS last_checked
            FROM sources s
            LEFT JOIN availability a ON a.source_id = s.id
            GROUP BY s.id
            ORDER BY availability_records DESC
        `).all();
        res.json({ sources: rows });
    } catch (e) {
        res.status(500).json({ error: 'source_health_failed', detail: e.message });
    }
});

// =========================================================
// Audience tag backfill (best-effort heuristic)
// Maps existing title ratings/genres to audience_tag associations.
// =========================================================
router.post('/backfill/audience-tags', (req, res) => {
    try {
        // Deterministic mapping by content signals
        const rules = [
            { tag: 'family', sql: "EXISTS (SELECT 1 FROM title_genres tg JOIN genres g ON tg.genre_id=g.id WHERE tg.title_id=t.id AND g.slug='family')" },
            { tag: 'kids', sql: "EXISTS (SELECT 1 FROM title_genres tg JOIN genres g ON tg.genre_id=g.id WHERE tg.title_id=t.id AND g.slug IN ('animation','family')) AND (t.rating IS NULL OR t.rating < 7.5)" },
            { tag: 'teens', sql: "(t.year >= 2015 AND t.year <= 2026) AND EXISTS (SELECT 1 FROM title_genres tg JOIN genres g ON tg.genre_id=g.id WHERE tg.title_id=t.id AND g.slug IN ('action','adventure','science-fiction','fantasy','animation')) AND (t.rating IS NULL OR t.rating >= 5.5)" },
            { tag: 'young_adults', sql: "(t.rating IS NULL OR t.rating >= 6.5) AND (t.year >= 2010 OR t.type IN ('tv','anime')) AND EXISTS (SELECT 1 FROM title_genres tg JOIN genres g ON tg.genre_id=g.id WHERE tg.title_id=t.id AND g.slug IN ('drama','romance','crime','thriller','science-fiction','mystery'))" },
            { tag: 'adults', sql: "(t.rating IS NULL OR t.rating >= 7.0) AND EXISTS (SELECT 1 FROM title_genres tg JOIN genres g ON tg.genre_id=g.id WHERE tg.title_id=t.id AND g.slug IN ('crime','drama','mystery','thriller','war','documentary'))" },
            { tag: 'anime_fans', sql: "t.type = 'anime'" },
            { tag: 'k_drama_fans', sql: "t.type = 'tv' AND EXISTS (SELECT 1 FROM title_countries tc JOIN countries c ON tc.country_id=c.id WHERE tc.title_id=t.id AND c.code='KR')" },
            { tag: 'c_drama_fans', sql: "t.type = 'tv' AND EXISTS (SELECT 1 FROM title_countries tc JOIN countries c ON tc.country_id=c.id WHERE tc.title_id=t.id AND c.code='CN')" },
            { tag: 'j_drama_fans', sql: "t.type = 'tv' AND EXISTS (SELECT 1 FROM title_countries tc JOIN countries c ON tc.country_id=c.id WHERE tc.title_id=t.id AND c.code='JP')" },
            { tag: 'horror_fans', sql: "EXISTS (SELECT 1 FROM title_genres tg JOIN genres g ON tg.genre_id=g.id WHERE tg.title_id=t.id AND g.slug='horror')" },
            { tag: 'romance_fans', sql: "EXISTS (SELECT 1 FROM title_genres tg JOIN genres g ON tg.genre_id=g.id WHERE tg.title_id=t.id AND g.slug='romance')" },
            { tag: 'action_fans', sql: "EXISTS (SELECT 1 FROM title_genres tg JOIN genres g ON tg.genre_id=g.id WHERE tg.title_id=t.id AND g.slug='action')" },
            { tag: 'scifi_fans', sql: "EXISTS (SELECT 1 FROM title_genres tg JOIN genres g ON tg.genre_id=g.id WHERE tg.title_id=t.id AND g.slug='science-fiction')" },
            { tag: 'fantasy_fans', sql: "EXISTS (SELECT 1 FROM title_genres tg JOIN genres g ON tg.genre_id=g.id WHERE tg.title_id=t.id AND g.slug='fantasy')" },
            { tag: 'crime_fans', sql: "EXISTS (SELECT 1 FROM title_genres tg JOIN genres g ON tg.genre_id=g.id WHERE tg.title_id=t.id AND g.slug='crime')" },
            { tag: 'music_fans', sql: "EXISTS (SELECT 1 FROM title_genres tg JOIN genres g ON tg.genre_id=g.id WHERE tg.title_id=t.id AND g.slug IN ('music','musical'))" },
            { tag: 'documentary_fans', sql: "EXISTS (SELECT 1 FROM title_genres tg JOIN genres g ON tg.genre_id=g.id WHERE tg.title_id=t.id AND g.slug='documentary')" },
            { tag: 'sports_fans', sql: "EXISTS (SELECT 1 FROM title_genres tg JOIN genres g ON tg.genre_id=g.id WHERE tg.title_id=t.id AND g.slug='sport')" }
        ];

        // Pre-clear existing audience-tag assignments
        db.prepare('DELETE FROM title_audience_tags').run();

        let total = 0;
        const perTag = {};
        for (const rule of rules) {
            const tagRow = db.prepare('SELECT id FROM audience_tags WHERE slug = ?').get(rule.tag);
            if (!tagRow) { perTag[rule.tag] = 0; continue; }
            const result = db.prepare(`
                INSERT OR IGNORE INTO title_audience_tags (title_id, tag_id)
                SELECT t.id, ? FROM titles t WHERE ${rule.sql}
            `).run(tagRow.id);
            const added = Number(result.changes || 0);
            total += added;
            perTag[rule.tag] = added;
        }
        // Recount
        const counts = db.prepare(`
            SELECT at.slug, at.name, COUNT(*) AS n
            FROM audience_tags at LEFT JOIN title_audience_tags tat ON tat.tag_id = at.id
            GROUP BY at.id ORDER BY n DESC
        `).all();
        res.json({ ok: true, assignments_added: total, by_tag: counts });
    } catch (e) {
        res.status(500).json({ error: 'backfill_failed', detail: e.message });
    }
});

export default router;
