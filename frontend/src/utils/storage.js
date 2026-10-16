/**
 * storage.js — Dual persistence layer: localStorage with server-backed sync
 * for Watchlist, Watch History, and Continue Watching.
 */
import { getApiBase } from './api';

export const Storage = {
    get(key, fallback) {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                const v = window.localStorage.getItem(key);
                return v ? JSON.parse(v) : fallback;
            }
        } catch (e) { /* ignore */ }
        return fallback;
    },
    set(key, value) {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.setItem(key, JSON.stringify(value));
            }
        } catch (e) { /* ignore */ }
    },
    remove(key) {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.removeItem(key);
            }
        } catch (e) { /* ignore */ }
    },
    bump(key, by = 1) {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                const cur = Number(window.localStorage.getItem(key) || 0) + by;
                window.localStorage.setItem(key, String(cur));
                return cur;
            }
        } catch (e) { /* ignore */ }
        return 1;
    }
};

export const WatchlistAPI = {
    getUserId() {
        let uid = Storage.get('streamapp_user_id', null);
        if (!uid) {
            uid = 'user_' + Math.random().toString(36).slice(2, 11) + '_' + Date.now().toString(36);
            Storage.set('streamapp_user_id', uid);
        }
        return uid;
    },

    async list() {
        const localList = Storage.get('watchlist', []);
        const localItems = localList.map(id => Storage.get(`meta_${id}`, { id })).filter(it => it && it.id != null);
        try {
            const uid = this.getUserId();
            const res = await fetch(`${getApiBase()}/watchlist?user_id=${encodeURIComponent(uid)}`);
            if (res.ok) {
                const data = await res.json();
                const remoteItems = data.items || [];
                const byId = new Map();
                localItems.forEach(it => byId.set(String(it.id), it));
                remoteItems.forEach(it => {
                    if (it && it.id != null) {
                        byId.set(String(it.id), { ...(byId.get(String(it.id)) || {}), ...it });
                    }
                });
                const mergedItems = Array.from(byId.values());
                Storage.set('watchlist', mergedItems.map(it => it.id));
                return mergedItems;
            }
        } catch (e) {
            console.warn('[WatchlistAPI] Remote sync failed, using local:', e.message);
        }
        return localItems;
    },

    async add(item) {
        const id = item.id;
        const localList = Storage.get('watchlist', []);
        if (!localList.some(x => String(x) === String(id))) {
            Storage.set('watchlist', [...localList, id]);
        }
        Storage.set(`meta_${id}`, item);
        try {
            const uid = this.getUserId();
            await fetch(`${getApiBase()}/watchlist`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: uid,
                    titleId: id,
                    title: item.title,
                    type: item.type,
                    poster: item.poster,
                    year: item.year,
                    rating: item.rating
                })
            });
        } catch (e) {
            console.warn('[WatchlistAPI] Remote add failed:', e.message);
        }
    },

    async remove(titleId) {
        const localList = Storage.get('watchlist', []);
        Storage.set('watchlist', localList.filter(id => String(id) !== String(titleId)));
        try {
            const uid = this.getUserId();
            await fetch(`${getApiBase()}/watchlist/${encodeURIComponent(titleId)}?user_id=${encodeURIComponent(uid)}`, {
                method: 'DELETE'
            });
        } catch (e) {
            console.warn('[WatchlistAPI] Remote remove failed:', e.message);
        }
    },

    isSaved(titleId) {
        const list = Storage.get('watchlist', []);
        return list.some(id => String(id) === String(titleId));
    }
};

export const HistoryAPI = {
    async list() {
        const localHist = Storage.get('history', {});
        const localItems = Object.entries(localHist)
            .map(([id, val]) => ({ id, ...(val || {}) }))
            .sort((a, b) => Number(b.ts || 0) - Number(a.ts || 0));
        try {
            const uid = WatchlistAPI.getUserId();
            const res = await fetch(`${getApiBase()}/history?user_id=${encodeURIComponent(uid)}`);
            if (res.ok) {
                const data = await res.json();
                const remoteItems = data.items || [];
                if (remoteItems.length === 0) {
                    return localItems;
                }
                const byId = new Map();
                localItems.forEach(it => byId.set(String(it.id), it));
                remoteItems.forEach(it => {
                    if (it && it.id != null) {
                        byId.set(String(it.id), { ...(byId.get(String(it.id)) || {}), ...it });
                    }
                });
                return Array.from(byId.values()).sort((a, b) => Number(b.ts || 0) - Number(a.ts || 0));
            }
        } catch (e) {
            console.warn('[HistoryAPI] Remote history sync failed:', e.message);
        }
        return localItems;
    },

    async record(item, pct, currentTime = 0, duration = 0, season = null, episode = null) {
        if (!item || item.id == null) return;
        const id = item.id;
        const entry = {
            id,
            slug: item.slug,
            title: item.title,
            type: item.type || 'movie',
            poster: item.poster,
            backdrop: item.backdrop,
            year: item.year,
            rating: item.rating,
            pct: Math.round(pct),
            currentTime: Math.round(currentTime),
            duration: Math.round(duration),
            season,
            episode,
            ts: Date.now()
        };

        // Update local
        const localHist = Storage.get('history', {});
        localHist[id] = entry;
        Storage.set('history', localHist);
        Storage.set(`progress_${id}`, Math.round(pct));
        Storage.set(`meta_${id}`, entry);

        // Sync remote
        try {
            const uid = WatchlistAPI.getUserId();
            await fetch(`${getApiBase()}/history`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: uid,
                    titleId: id,
                    title: item.title,
                    type: item.type,
                    poster: item.poster,
                    progressPct: Math.round(pct),
                    currentTime: Math.round(currentTime),
                    duration: Math.round(duration),
                    season,
                    episode
                })
            });
        } catch (e) {
            console.warn('[HistoryAPI] Remote record failed:', e.message);
        }
    },

    async clear() {
        const localHist = Storage.get('history', {});
        Object.keys(localHist).forEach(id => Storage.remove(`progress_${id}`));
        Storage.set('history', {});
        try {
            const uid = WatchlistAPI.getUserId();
            await fetch(`${getApiBase()}/history?user_id=${encodeURIComponent(uid)}`, {
                method: 'DELETE'
            });
        } catch (e) {
            console.warn('[HistoryAPI] Remote clear failed:', e.message);
        }
    },

    async remove(titleId) {
        const localHist = Storage.get('history', {});
        delete localHist[titleId];
        Storage.set('history', localHist);
        Storage.remove(`progress_${titleId}`);
        try {
            const uid = WatchlistAPI.getUserId();
            await fetch(`${getApiBase()}/history/${encodeURIComponent(titleId)}?user_id=${encodeURIComponent(uid)}`, {
                method: 'DELETE'
            });
        } catch (e) {
            console.warn('[HistoryAPI] Remote remove failed:', e.message);
        }
    }
};
