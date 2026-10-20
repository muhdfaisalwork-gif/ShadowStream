'use strict';

const DEFAULT_API_BASE = 'https://ssmoviestvs.site/api/v1';

/**
 * ShadowStream Edge Catalog & Stream Resolution SDK Client.
 */
class ShadowStreamClient {
    /**
     * @param {{ apiBase?: string, fetchImpl?: typeof fetch }} [options]
     */
    constructor(options = {}) {
        this.apiBase = String(options.apiBase || DEFAULT_API_BASE).replace(/\/+$/, '');
        this.fetchImpl = options.fetchImpl || globalThis.fetch;
    }

    async _get(path, params = {}) {
        const url = new URL(`${this.apiBase}${path.startsWith('/') ? path : `/${path}`}`);
        for (const [k, v] of Object.entries(params)) {
            if (v !== undefined && v !== null && v !== '') {
                url.searchParams.set(k, String(v));
            }
        }
        const res = await this.fetchImpl(url.toString(), {
            headers: { Accept: 'application/json' },
        });
        if (!res.ok) {
            throw new Error(`ShadowStream API HTTP ${res.status} on ${url.pathname}`);
        }
        return res.json();
    }

    /** Check edge catalog health and total indexed counts. */
    async getHealth() {
        return this._get('/health');
    }

    /** Browse paginated titles by type, genre, country, audio_language, or sort. */
    async getTitles(filters = {}) {
        return this._get('/titles', filters);
    }

    /** Fetch full metadata and availability for a single title by ID or slug. */
    async getTitle(idOrSlug) {
        if (!idOrSlug) throw new Error('idOrSlug is required');
        return this._get(`/title/${encodeURIComponent(String(idOrSlug))}`);
    }

    /** Fetch seasons and episodes for an episodic TV series, anime, or short drama. */
    async getTitleSeasons(idOrSlug) {
        if (!idOrSlug) throw new Error('idOrSlug is required');
        return this._get(`/title/${encodeURIComponent(String(idOrSlug))}/seasons`);
    }

    /** Fetch 42-nation world cinema catalog metadata. */
    async getCountries() {
        return this._get('/countries');
    }

    /** Fetch curated studio hubs and franchise collections. */
    async getCollections() {
        return this._get('/collections');
    }

    /** Search the catalog by query string. */
    async search(query, limit = 30) {
        return this._get('/search', { q: query, limit });
    }
}

module.exports = {
     DEFAULT_API_BASE,
    ShadowStreamClient,
    default: ShadowStreamClient,
};
