import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    SafeAreaView, ActivityIndicator, Platform, useWindowDimensions
} from 'react-native';
import { COLORS } from '../theme/colors';
import Poster from '../components/Poster';
import ShadowStreamPlayer from '../components/ShadowStreamPlayer';
import { getApiBase } from '../utils/api';
import { resolveMirrors, toPlayerProps } from '../utils/resolver';
import { WatchlistAPI, HistoryAPI, Storage } from '../utils/storage';
import { useRouteMeta } from '../utils/useRouteMeta';

export function resolveCanonicalSeasonAndEpisode(seasonsList, reqSeason, reqEpisode) {
    if (!Array.isArray(seasonsList) || seasonsList.length === 0) {
        return {
            season: reqSeason != null ? reqSeason : 1,
            episode: reqEpisode != null ? reqEpisode : 1,
        };
    }
    const regular = seasonsList
        .filter(s => s && s.season_number != null && s.season_number > 0)
        .sort((a, b) => a.season_number - b.season_number);

    if (regular.length === 0) {
        return {
            season: reqSeason != null ? reqSeason : 1,
            episode: reqEpisode != null ? reqEpisode : 1,
        };
    }

    const sNum = parseInt(reqSeason, 10);
    const eNum = parseInt(reqEpisode, 10);

    // If season is 0 (Specials) or invalid, map requested episode across regular seasons
    if (sNum === 0 || !Number.isFinite(sNum)) {
        if (Number.isFinite(eNum) && eNum > 0) {
            let running = 0;
            for (const s of regular) {
                const count = (Array.isArray(s.episodes) && s.episodes.length > 0)
                    ? s.episodes.length
                    : (s.episode_count || 0);
                if (eNum <= running + count) {
                    return { season: s.season_number, episode: eNum - running };
                }
                running += count;
            }
        }
        return { season: regular[0].season_number, episode: Number.isFinite(eNum) && eNum > 0 ? eNum : 1 };
    }

    // If requested season exists, check if eNum exceeds its episode count (absolute episode reference)
    const matchedSeason = regular.find(s => s.season_number === sNum);
    if (matchedSeason) {
        const count = (Array.isArray(matchedSeason.episodes) && matchedSeason.episodes.length > 0)
            ? matchedSeason.episodes.length
            : (matchedSeason.episode_count || 0);
        if (count > 0 && Number.isFinite(eNum) && eNum > count) {
            let running = 0;
            for (const s of regular) {
                const sCount = (Array.isArray(s.episodes) && s.episodes.length > 0)
                    ? s.episodes.length
                    : (s.episode_count || 0);
                if (eNum <= running + sCount) {
                    return { season: s.season_number, episode: eNum - running };
                }
                running += sCount;
            }
        }
        return { season: sNum, episode: Number.isFinite(eNum) && eNum > 0 ? eNum : 1 };
    }

    return { season: regular[0].season_number, episode: Number.isFinite(eNum) && eNum > 0 ? eNum : 1 };
}

export default function PlayerScreen({ route, navigation }) {
    const { item: rawItem, slug: routeSlug, season: routeSeason, episode: routeEpisode } = route.params || {};
    const initialItem = (rawItem && typeof rawItem === 'object') ? rawItem : null;
    const [item, setItem] = useState(initialItem);
    const slug = routeSlug || initialItem?.slug || (initialItem?.id ? String(initialItem.id) : null);
    const prevKeyRef = useRef(slug || (initialItem?.id ? String(initialItem.id) : null));

    const isTv = (item?.type || initialItem?.type) === 'tv' ||
        (item?.type || initialItem?.type) === 'short_drama' ||
        ((item?.type || initialItem?.type) === 'anime' && (
            (item?.seasonCount != null && item.seasonCount > 0) ||
            (initialItem?.seasonCount != null && initialItem.seasonCount > 0) ||
            (Array.isArray(item?.seasons) && item.seasons.length > 0)
        ));
    const webQuery = useMemo(() => {
        if (typeof window === 'undefined' || !window.location) return {};
        try {
            return new URLSearchParams(window.location.search || '');
        } catch (e) {
            return {};
        }
    }, []);

    const initialSeason = routeSeason != null ? routeSeason : (webQuery.get ? webQuery.get('season') : null);
    const initialEpisode = routeEpisode != null ? routeEpisode : (webQuery.get ? webQuery.get('episode') : null);

    const parsedSeason = parseInt(initialSeason, 10);
    const parsedEpisode = parseInt(initialEpisode, 10);

    const [currentSeason, setCurrentSeason] = useState(
        Number.isFinite(parsedSeason) ? parsedSeason : (isTv ? (item?.season != null ? item.season : 1) : null)
    );
    const [currentEpisode, setCurrentEpisode] = useState(
        Number.isFinite(parsedEpisode) ? parsedEpisode : (isTv ? (item?.episode != null ? item.episode : 1) : null)
    );

    const [seasons, setSeasons] = useState(item?.seasons || []);
    const [dubs, setDubs] = useState(
        initialItem?.audioLanguages ||
        initialItem?.audio_languages ||
        initialItem?.spoken_languages ||
        initialItem?.languages ||
        []
    );
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [streamUrl, setStreamUrl] = useState(item?.streamUrl || item?.playbackUrl || null);
    const [streamKind, setStreamKind] = useState(null); // 'direct' | 'embed' | 'metadata'
    const [sourceName, setSourceName] = useState(null);
    const [mirrorList, setMirrorList] = useState([]); // [{label, provider, url, quality, direct, resolveMode}]
    const [activeMirrorIdx, setActiveMirrorIdx] = useState(0);
    const [resolveNote, setResolveNote] = useState(null);
    const [renditions, setRenditions] = useState([]);

    // Sync route.params when PlayerScreen stays mounted in Drawer.Navigator
    useEffect(() => {
        const nextKey = routeSlug || (rawItem?.slug) || (rawItem?.id ? String(rawItem.id) : null);
        const titleChanged = nextKey && nextKey !== prevKeyRef.current;
        if (rawItem && typeof rawItem === 'object') {
            setItem(rawItem);
        }
        const sVal = parseInt(routeSeason, 10);
        const eVal = parseInt(routeEpisode, 10);
        if (titleChanged) {
            prevKeyRef.current = nextKey;
            setLoadError(null);
            setStreamUrl(rawItem?.streamUrl || rawItem?.playbackUrl || null);
            setMirrorList([]);
            setSeasons(rawItem?.seasons || []);
            setDubs(
                rawItem?.audioLanguages ||
                rawItem?.audio_languages ||
                rawItem?.spoken_languages ||
                rawItem?.languages ||
                []
            );
            const nextIsTv = rawItem?.type === 'tv' ||
                rawItem?.type === 'short_drama' ||
                (rawItem?.type === 'anime' && ((rawItem?.seasonCount != null && rawItem.seasonCount > 0) || (Array.isArray(rawItem?.seasons) && rawItem.seasons.length > 0)));
            setCurrentSeason(Number.isFinite(sVal) ? sVal : (nextIsTv ? (rawItem?.season != null ? rawItem.season : 1) : null));
            setCurrentEpisode(Number.isFinite(eVal) ? eVal : (nextIsTv ? (rawItem?.episode != null ? rawItem.episode : 1) : null));
        } else {
            if (Number.isFinite(sVal) && sVal !== currentSeason) {
                setCurrentSeason(sVal);
            }
            if (Number.isFinite(eVal) && eVal !== currentEpisode) {
                setCurrentEpisode(eVal);
            }
        }
    }, [rawItem, routeSlug, routeSeason, routeEpisode]);

    // Keep the address bar honest so a reload or a shared link lands on the
    // episode actually being watched.
    useEffect(() => {
        if (typeof window === 'undefined' || !window.history?.replaceState) return;
        if (!isTv || currentSeason == null || currentEpisode == null) return;
        const url = new URL(window.location.href);
        if (url.searchParams.get('season') === String(currentSeason)
            && url.searchParams.get('episode') === String(currentEpisode)) return;
        url.searchParams.set('season', String(currentSeason));
        url.searchParams.set('episode', String(currentEpisode));
        window.history.replaceState({}, '', url.toString());
    }, [isTv, currentSeason, currentEpisode]);


    // NOTE: the global popup guard lives in src/utils/adShield.js, installed
    // once by App.js. This screen used to install a second, stricter override
    // that swallowed the app's own navigation — that conflict is gone.

    // Resolve title data if navigated directly or refreshed via URL
    useEffect(() => {
        if (!slug) return;
        if (item && (item.slug === slug || String(item.id) === String(slug))) return;
        let cancelled = false;
        async function fetchTitleData() {
            try {
                const res = await fetch(`${getApiBase()}/title/${encodeURIComponent(slug)}`);
                if (res.ok && !cancelled) {
                    const data = await res.json();
                    setItem(data);
                    const titleIsTv = data.type === 'tv' ||
                        data.type === 'short_drama' ||
                        (data.type === 'anime' && ((data.seasonCount != null && data.seasonCount > 0) || (Array.isArray(data.seasons) && data.seasons.length > 0)));
                    if (titleIsTv) {
                        if (currentSeason == null) setCurrentSeason(1);
                        if (currentEpisode == null) setCurrentEpisode(1);
                    }
                    const seasonsList = Array.isArray(data) ? data : (Array.isArray(data?.seasons) ? data.seasons : []);
                    if (seasonsList.length > 0) {
                        setSeasons(seasonsList);
                    }
                    const detectedDubs = data.audioLanguages || data.audio_languages || data.spoken_languages || data.languages;
                    if (Array.isArray(detectedDubs) && detectedDubs.length > 0) {
                        setDubs(detectedDubs);
                    }
                } else if (!cancelled) {
                    setLoadError(
                        res.status === 404
                            ? `We couldn't find "${slug}" in the catalogue.`
                            : `The catalogue is not responding (HTTP ${res.status}).`
                    );
                }
            } catch (e) {
                if (!cancelled) {
                    setLoadError(`Couldn't reach the catalogue: ${e.message}`);
                }
                console.warn('[PlayerScreen] fetchTitleData error:', e.message);
            }
        }
        fetchTitleData();
        return () => { cancelled = true; };
    // Season/episode used to be deps here, so every episode click refetched the
    // whole title payload and re-set `seasons`, re-rendering the drawer
    // mid-selection. Title metadata does not depend on the play position.
    }, [item?.id, item?.slug, slug]);

    useRouteMeta('Player', {
        title: isTv && currentSeason
            ? `${item?.title || 'Watch'} (S${currentSeason}:E${currentEpisode})`
            : (item?.title || 'Watch')
    });



    // Player orientation lifecycle: allow natural vertical/portrait playback, reset on leave
    useEffect(() => {
        return () => {
            if (typeof window !== 'undefined') {
                if (window.ShadowStreamNative && typeof window.ShadowStreamNative.setOrientation === 'function') {
                    try {
                        if (typeof window.ShadowStreamNative.unlockOrientation === 'function') {
                            window.ShadowStreamNative.unlockOrientation();
                        } else {
                            window.ShadowStreamNative.setOrientation('unspecified');
                        }
                    } catch (_) {}
                }
                if (window.screen && window.screen.orientation && typeof window.screen.orientation.unlock === 'function') {
                    try { window.screen.orientation.unlock(); } catch (_) {}
                }
            }
        };
    }, []);

    // Apply a mirror to the player. `direct` wins when the resolver produced
    // one, so our own engine decodes; otherwise the provider iframe plays.
    const applyMirror = useCallback((mirror, idx = 0) => {
        if (!mirror) return;
        const props = toPlayerProps(mirror);
        setStreamUrl(props.streamUrl);
        setStreamKind(props.streamKind);
        setSourceName(props.sourceName);
        setActiveMirrorIdx(idx);
    }, []);

    // Fetch seasons/episodes structure for TV series, and dubs for all titles
    useEffect(() => {
        if (!item) return;
        let cancelled = false;
        async function fetchSeasons() {
            try {
                const res = await fetch(`${getApiBase()}/title/${encodeURIComponent(item.id || item.slug)}/seasons`);
                if (res.ok && !cancelled) {
                    const data = await res.json();
                    const seasonsList = Array.isArray(data) ? data : (Array.isArray(data?.seasons) ? data.seasons : []);
                    if (seasonsList.length > 0) {
                        setSeasons(seasonsList);
                        const canonical = resolveCanonicalSeasonAndEpisode(seasonsList, currentSeason, currentEpisode);
                        if (canonical.season !== currentSeason || canonical.episode !== currentEpisode) {
                            setCurrentSeason(canonical.season);
                            setCurrentEpisode(canonical.episode);
                        }
                    } else if (!Array.isArray(item.seasons) || item.seasons.length === 0) {
                        const sCount = Math.max(1, Number(item.seasonCount) || 1);
                        const synths = Array.from({ length: sCount }, (_, i) => ({
                            id: ((Number(item.id) || 1) * 100) + (i + 1),
                            season_number: i + 1,
                            name: `Season ${i + 1}`,
                            episode_count: 8,
                            episodes: Array.from({ length: 8 }, (__, j) => ({
                                id: ((Number(item.id) || 1) * 1000) + ((i + 1) * 100) + (j + 1),
                                episode_number: j + 1,
                                name: `Episode ${j + 1}`,
                                runtime: item.runtime || 45,
                            })),
                        }));
                        setSeasons(synths);
                    }
                }
            } catch (e) {
                console.warn('[PlayerScreen] fetchSeasons error:', e.message);
            }
        }
        async function fetchDubs() {
            try {
                const res = await fetch(`${getApiBase()}/title/${encodeURIComponent(item.id || item.slug)}/audio-languages`);
                if (res.ok && !cancelled) {
                    const data = await res.json();
                    if (Array.isArray(data.languages) && data.languages.length > 0) {
                        setDubs(data.languages);
                    }
                }
            } catch (e) {
                console.warn('[PlayerScreen] fetchDubs error:', e.message);
            }
        }
        if (isTv) fetchSeasons();
        fetchDubs();
        return () => { cancelled = true; };
    }, [item?.id, item?.slug, isTv]);

    // Resolve playback stream and mirrors, then ask the worker which of them we
    // can actually decode ourselves.
    const resolveStream = useCallback(async () => {
        if (!item) {
            // Previously this returned early without ever clearing `loading`,
            // so a title that failed to load left the player spinning on
            // "Initializing ShadowStream Player..." forever. Now we surface a
            // real error the user can act on.
            setLoading(false);
            setStreamKind('metadata');
            return;
        }
        setLoading(true);

        // Check if stream was passed directly in route params
        if (item.streamUrl || item.playbackUrl) {
            setStreamUrl(item.streamUrl || item.playbackUrl);
            setStreamKind('direct');
            setSourceName(item.sourceName || 'Direct Stream');
            setLoading(false);
            return;
        }

        try {
            let activeS = currentSeason;
            let activeE = currentEpisode;
            if (isTv && Array.isArray(seasons) && seasons.length > 0) {
                const canonical = resolveCanonicalSeasonAndEpisode(seasons, currentSeason, currentEpisode);
                activeS = canonical.season;
                activeE = canonical.episode;
                if (activeS !== currentSeason || activeE !== currentEpisode) {
                    setCurrentSeason(activeS);
                    setCurrentEpisode(activeE);
                }
            }

            const queryParams = new URLSearchParams();
            if (activeS != null) queryParams.set('season', String(activeS));
            if (activeE != null) queryParams.set('episode', String(activeE));

            const res = await fetch(`${getApiBase()}/title/${encodeURIComponent(item.id || item.slug)}/availability?${queryParams.toString()}`);
            let avList = [];
            if (res.ok) {
                const data = await res.json();
                avList = data.availability || [];
            }

            const playableSources = avList.filter(a =>
                (a.kind === 'playback' || a.kind === 'embed') && (a.playbackUrl || a.url || a.external_url)
            );

            let sourcesToUse = playableSources;
            const effectiveTmdb = item.tmdbId || item.tmdb_id || (typeof item.slug === 'string' ? item.slug.match(/-(\d{4,9})$/)?.[1] : null);
            const effectiveImdb = item.imdbId || item.imdb_id;

            if (sourcesToUse.length === 0 && (effectiveTmdb || effectiveImdb)) {
                const isMovie = item.type === 'movie';
                const dyn = [];
                if (effectiveTmdb) {
                    if (isMovie) {
                        dyn.push({ source: 'vidlink', sourceName: 'Vidlink (Ad-Free HD)', kind: 'embed', playbackUrl: `https://vidlink.pro/movie/${effectiveTmdb}` });
                        dyn.push({ source: 'vidsrc', sourceName: 'VidSrc HD', kind: 'embed', playbackUrl: `https://vidsrc.to/embed/movie/${effectiveTmdb}` });
                        dyn.push({ source: '2embed', sourceName: '2Embed Multi-Server', kind: 'embed', playbackUrl: `https://www.2embed.cc/embed/tmdb/movie?id=${effectiveTmdb}` });
                    } else {
                        dyn.push({ source: 'vidlink', sourceName: 'Vidlink (Ad-Free HD)', kind: 'embed', playbackUrl: `https://vidlink.pro/tv/${effectiveTmdb}/${activeS || 1}/${activeE || 1}` });
                        dyn.push({ source: 'vidsrc', sourceName: 'VidSrc HD', kind: 'embed', playbackUrl: `https://vidsrc.to/embed/tv/${effectiveTmdb}/${activeS || 1}/${activeE || 1}` });
                        dyn.push({ source: '2embed', sourceName: '2Embed Multi-Server', kind: 'embed', playbackUrl: `https://www.2embed.cc/embed/tmdb/tv?id=${effectiveTmdb}&s=${activeS || 1}&e=${activeE || 1}` });
                    }
                }
                if (effectiveImdb) {
                    if (isMovie) {
                        dyn.push({ source: 'vidsrc_imdb', sourceName: 'VidSrc (IMDb)', kind: 'embed', playbackUrl: `https://vidsrc.me/embed/movie?imdb=${effectiveImdb}` });
                    } else {
                        dyn.push({ source: 'vidsrc_imdb', sourceName: 'VidSrc (IMDb)', kind: 'embed', playbackUrl: `https://vidsrc.me/embed/tv?imdb=${effectiveImdb}&season=${activeS || 1}&episode=${activeE || 1}` });
                    }
                }
                sourcesToUse = dyn;
            }

            if (sourcesToUse.length > 0) {
                const PROVIDER_RANK = ['vidlink_sub', 'vidlink_dub', 'vidlink', 'vidsrc', 'vidsrc_imdb', '2embed', 'vid_src'];
                const MAX_MIRRORS = 4;

                const byProvider = new Map();
                for (const a of sourcesToUse) {
                    const key = String(a.source || a.sourceName || 'unknown').toLowerCase();
                    if (!byProvider.has(key)) byProvider.set(key, a);
                }
                const ranked = Array.from(byProvider.values()).sort((a, b) => {
                    const ra = PROVIDER_RANK.indexOf(String(a.source || '').toLowerCase());
                    const rb = PROVIDER_RANK.indexOf(String(b.source || '').toLowerCase());
                    return (ra === -1 ? 99 : ra) - (rb === -1 ? 99 : rb);
                });
                const kept = ranked.slice(0, MAX_MIRRORS);

                const mirrors = kept.map(a => ({
                    label: a.sourceName || a.source || 'Mirror',
                    provider: a.source || 'embed',
                    url: a.kind === 'playback' ? (a.playbackUrl || a.url) : (a.url || a.external_url || a.playbackUrl),
                    format: a.kind === 'playback' ? 'video' : 'embed',
                    quality: 'HD'
                }));

                const { playable, mirrors: resolved, anyDirect } = await resolveMirrors(mirrors, {
                    tmdbId: effectiveTmdb,
                    type: item.type,
                    season: activeS,
                    episode: activeE,
                });

                setMirrorList(resolved);
                setResolveNote(
                    anyDirect
                        ? null
                        : 'Playing via the provider’s own player — no direct stream was available to decode.'
                );
                const idx = Math.max(0, resolved.indexOf(playable));
                applyMirror(playable, idx);
                setLoading(false);
                return;
            }

            // Fallback to metadata-only discovery state
            setStreamKind('metadata');
        } catch (e) {
            console.warn('[PlayerScreen] resolveStream error:', e.message);
            setStreamKind('metadata');
        } finally {
            setLoading(false);
        }
        // Alternate encodes for the quality menu. Progressive files have no
        // HLS levels, so without this the menu is empty on almost every title.
        if (item) {
            try {
                const key = item.id || item.slug;
                const r = await fetch(`${getApiBase()}/title/${encodeURIComponent(key)}/renditions`);
                if (r.ok) {
                    const d = await r.json();
                    const list = [];
                    for (const src of d.renditions || []) {
                        for (const o of src.options || []) list.push(o);
                    }
                    setRenditions(list);
                }
            } catch (_) { /* quality options are optional */ }
        }
    }, [applyMirror, item, currentSeason, currentEpisode]);

    useEffect(() => {
        resolveStream();
    }, [resolveStream]);

    // Record watch history so Continue Watching and HistoryScreen stay up to date
    useEffect(() => {
        if (!item || !item.id || !streamUrl) return;
        const savedPct = Storage.get(`progress_${item.id}`, 0);
        const pct = (savedPct > 5 && savedPct < 95) ? savedPct : 15;
        HistoryAPI.record(
            item,
            pct,
            0,
            0,
            isTv ? (currentSeason || 1) : null,
            isTv ? (currentEpisode || 1) : null
        );
    }, [item?.id, streamUrl, isTv, currentSeason, currentEpisode]);

    // Handle user selecting an episode from the in-player drawer
    const handleSelectEpisode = useCallback((seasonNum, episodeNum) => {
        const s = parseInt(seasonNum, 10);
        const e = parseInt(episodeNum, 10);
        // Episode rows from the catalogue carry no season of their own. This
        // used to be called with `undefined` and set the season to null, which
        // drops `season` from the availability query and pins the player to
        // S1E1 forever. Ignore anything non-numeric instead.
        if (!Number.isFinite(s) || !Number.isFinite(e)) {
            console.warn('[PlayerScreen] ignored episode selection', { seasonNum, episodeNum });
            return;
        }
        if (s === currentSeason && e === currentEpisode) return;
        setCurrentSeason(s);
        setCurrentEpisode(e);
    }, [currentSeason, currentEpisode]);

    // Handle auto-advancing or clicking "Next Episode"
    const handleNextEpisode = useCallback(() => {
        const curSeasonObj = seasons.find(s => s.season_number === (currentSeason != null ? currentSeason : 1)) || seasons[0];
        const epList = curSeasonObj?.episodes || [];
        const curIdx = epList.findIndex(e => e.episode_number === currentEpisode);

        if (curIdx !== -1 && curIdx < epList.length - 1) {
            // Next episode in current season
            const nextEp = epList[curIdx + 1];
            setCurrentEpisode(nextEp.episode_number);
        } else {
            // Check next season
            const curSeasonIdx = seasons.findIndex(s => s.season_number === (currentSeason != null ? currentSeason : 1));
            if (curSeasonIdx !== -1 && curSeasonIdx < seasons.length - 1) {
                const nextSeason = seasons[curSeasonIdx + 1];
                setCurrentSeason(nextSeason.season_number);
                setCurrentEpisode(nextSeason.episodes?.[0]?.episode_number || 1);
            }
        }
    }, [seasons, currentSeason, currentEpisode]);

    const handleBack = useCallback(() => {
        if (navigation.canGoBack()) {
            navigation.goBack();
        } else if (item?.slug || slug || item?.id) {
            navigation.navigate('TitleDetail', { slug: item?.slug || slug || String(item.id), item });
        } else {
            navigation.navigate('Home');
        }
    }, [navigation, item, slug]);

    const activeSeasonObj = (seasons || []).find(s => s && s.season_number === currentSeason);
    const activeEpObj = (activeSeasonObj?.episodes || []).find(e => e && e.episode_number === currentEpisode);
    const isUpcomingEpisode = Boolean(activeEpObj?.air_date && new Date(activeEpObj.air_date) > new Date());

    const releasedSeasons = useMemo(() => {
        if (!Array.isArray(seasons) || seasons.length === 0) return [];
        const now = new Date();
        return seasons.filter(s => {
            if (!s || s.season_number <= 0) return false;
            const eps = s.episodes || [];
            if (eps.length === 0) return true;
            return eps.some(e => !e.air_date || new Date(e.air_date) <= now);
        }).sort((a, b) => a.season_number - b.season_number);
    }, [seasons]);

    if (loading) {
        return (
            <SafeAreaView style={styles.screen}>
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={COLORS.brand} />
                    <Text style={styles.loadingText}>
                        {loadError ? 'Something went wrong' : 'Initializing ShadowStream Player...'}
                    </Text>
                    <Text style={styles.loadingSub}>
                        {loadError || (isTv && currentSeason
                            ? `Connecting to ${item?.title} (S${currentSeason}:E${currentEpisode})...`
                            : 'Connecting to high-speed stream server...')}
                    </Text>
                    {loadError ? (
                        <TouchableOpacity
                            style={styles.retryBtn}
                            onPress={() => { setLoadError(null); setLoading(true); resolveStream(); }}
                        >
                            <Text style={styles.retryBtnText}>Try again</Text>
                        </TouchableOpacity>
                    ) : null}
                </View>
            </SafeAreaView>
        );
    }

    // Main Player: Full Screen, Edge-to-Edge
    if (streamUrl && (streamKind === 'direct' || streamKind === 'embed')) {
        return (
            <SafeAreaView style={styles.screen}>
                <ShadowStreamPlayer
                    title={item?.title}
                    season={currentSeason}
                    episode={currentEpisode}
                    streamUrl={streamUrl}
                    streamKind={streamKind}
                    sourceName={sourceName}
                    seasons={seasons}
                    mirrorList={mirrorList}
                    activeMirrorIdx={activeMirrorIdx}
                    dubs={dubs}
                    onSelectMirror={applyMirror}
                    onSelectEpisode={handleSelectEpisode}
                    onNextEpisode={handleNextEpisode}
                    onBack={handleBack}
                    mediaId={item?.id || item?.slug}
                    renditions={renditions}
                    notice={resolveNote}
                />
            </SafeAreaView>
        );
    }

    // Metadata / Discovery State (Only shown if no playable stream is found)
    return (
        <SafeAreaView style={styles.screen}>
            <View style={styles.metadataStateContainer}>
                <Poster
                    url={item?.backdrop || item?.poster}
                    title={item?.title}
                    style={StyleSheet.absoluteFill}
                />
                <View style={styles.metadataStateOverlay}>
                    <TouchableOpacity style={styles.backBtnFloating} onPress={handleBack}>
                        <Text style={styles.backBtnText}>‹ Back</Text>
                    </TouchableOpacity>

                    <View style={[styles.metadataBadge, isUpcomingEpisode && styles.metadataBadgeUpcoming]}>
                        <Text style={styles.metadataBadgeText}>
                            {isUpcomingEpisode ? '⏳ UPCOMING RELEASE' : 'SHADOWSTREAM'}
                        </Text>
                    </View>
                    <Text style={styles.metadataTitle}>
                        {item?.title} {isTv && currentSeason != null && `(S${currentSeason}:E${currentEpisode || 1})`}
                    </Text>
                    {activeEpObj?.name ? (
                        <Text style={styles.metadataEpTitle}>"{activeEpObj.name}"</Text>
                    ) : null}
                    <Text style={styles.metadataNotice}>
                        {isUpcomingEpisode
                            ? `This episode has not aired yet. It is scheduled to premiere on ${new Date(activeEpObj.air_date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}. You can stream available seasons below:`
                            : 'No active stream source was found for this episode right now. You can try earlier seasons or explore related titles.'}
                    </Text>

                    {/* Quick 1-Tap Watch Available Seasons */}
                    {isTv && releasedSeasons.length > 0 && (
                        <View style={styles.availableSeasonsBox}>
                            <Text style={styles.availableSeasonsHeading}>AVAILABLE SEASONS TO STREAM NOW:</Text>
                            <View style={styles.availableSeasonsRow}>
                                {releasedSeasons.map(s => (
                                    <TouchableOpacity
                                        key={s.season_number}
                                        style={[
                                            styles.availableSeasonPill,
                                            s.season_number === currentSeason && styles.availableSeasonPillActive
                                        ]}
                                        onPress={() => {
                                            setLoadError(null);
                                            setLoading(true);
                                            setCurrentSeason(s.season_number);
                                            setCurrentEpisode(1);
                                        }}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={styles.availableSeasonPillText}>
                                            ▶ Season {s.season_number} Episode 1
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}
                    <View style={styles.officialLinksRow}>
                        <TouchableOpacity
                            style={styles.officialLinkBtn}
                            onPress={() => { setLoadError(null); setLoading(true); resolveStream(); }}
                        >
                            <Text style={styles.officialLinkText}>↻ Retry Source</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.officialLinkBtn}
                            onPress={() => navigation.navigate('Search', { initialQuery: item?.title || '' })}
                        >
                            <Text style={styles.officialLinkText}>🔍 Search StreamApp</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.officialLinkBtn}
                            onPress={() => navigation.navigate('Browse')}
                        >
                            <Text style={styles.officialLinkText}>🎬 Browse Catalog</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#000000',
        width: '100%',
        height: '100%',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '700', marginTop: 16 },
    loadingSub: { color: COLORS.textMuted, fontSize: 12, marginTop: 4 },
    retryBtn: {
        marginTop: 20,
        backgroundColor: COLORS.brand,
        borderRadius: 6,
        paddingHorizontal: 22,
        paddingVertical: 11,
    },
    retryBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
    metadataStateContainer: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: COLORS.surface,
    },
    metadataStateOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(10, 10, 10, 0.92)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
    },
    backBtnFloating: {
        position: 'absolute',
        top: 20,
        left: 20,
        paddingHorizontal: 14,
        paddingVertical: 8,
        backgroundColor: 'rgba(20, 20, 20, 0.8)',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
    },
    backBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
    metadataBadge: {
        backgroundColor: 'rgba(229, 9, 20, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(229, 9, 20, 0.4)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 4,
        marginBottom: 14,
    },
    metadataBadgeUpcoming: {
        backgroundColor: 'rgba(234, 179, 8, 0.2)',
        borderColor: 'rgba(234, 179, 8, 0.6)',
    },
    metadataBadgeText: { color: COLORS.brand, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
    metadataTitle: {
        color: COLORS.textPrimary,
        fontSize: 26,
        fontWeight: '900',
        textAlign: 'center',
        marginBottom: 6,
    },
    metadataEpTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 10,
    },
    availableSeasonsBox: {
        marginTop: 14,
        marginBottom: 18,
        padding: 14,
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        alignItems: 'center',
        width: '100%',
        maxWidth: 520,
    },
    availableSeasonsHeading: {
        color: '#E50914',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.8,
        marginBottom: 10,
    },
    availableSeasonsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 8,
    },
    availableSeasonPill: {
        backgroundColor: 'rgba(229, 9, 20, 0.85)',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 6,
    },
    availableSeasonPillActive: {
        backgroundColor: '#10B981',
    },
    availableSeasonPillText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    metadataNotice: {
        color: COLORS.textSecondary,
        fontSize: 13,
        textAlign: 'center',
        maxWidth: 500,
        lineHeight: 20,
        marginBottom: 20,
    },
    officialLinksRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 12,
    },
    officialLinkBtn: {
        backgroundColor: COLORS.surfaceAlt,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    officialLinkText: {
        color: COLORS.textPrimary,
        fontSize: 13,
        fontWeight: '700',
    },
});
