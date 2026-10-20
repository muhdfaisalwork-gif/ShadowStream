import React, { useState, useEffect, useMemo } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    SafeAreaView, ActivityIndicator, useWindowDimensions
} from 'react-native';
import { COLORS } from '../theme/colors';
import AppHeader from '../components/AppHeader';
import MobileTabBar from '../components/MobileTabBar';
import Poster from '../components/Poster';
import MediaCard from '../components/MediaCard';
import SkeletonGrid from '../components/SkeletonGrid';
import { getApiBase } from '../utils/api';
import { useRouteMeta } from '../utils/useRouteMeta';

const PLATFORM_META = {
    'netflix': {
        name: '🔴 On Netflix',
        badge: 'STREAMING NETWORK',
        description: 'Global flagship series, Netflix Original films, prestige dramas, and international phenomena streaming on Netflix.'
    },
    'disney-plus': {
        name: '🏰 On Disney+',
        badge: 'STREAMING NETWORK',
        description: 'Disney+ Originals, Walt Disney Animation classics, Pixar masterpieces, Marvel Studios, and Star Wars series.'
    },
    'max': {
        name: '📺 On Max (HBO)',
        badge: 'STREAMING NETWORK',
        description: 'Landmark HBO Sunday-night prestige television, Max Originals, DC Universe blockbusters, and Warner Bros. cinema.'
    },
    'prime-video': {
        name: '📦 On Prime Video',
        badge: 'STREAMING NETWORK',
        description: 'Amazon MGM Studios blockbusters, Prime Video flagship series, global action thrillers, and acclaimed cinema.'
    },
    'hulu': {
        name: '💚 On Hulu',
        badge: 'STREAMING NETWORK',
        description: 'FX on Hulu prestige series, Hulu Original comedies and dramas, 20th Century Studios hits, and next-day network TV.'
    },
    'apple-tv-plus': {
        name: '🍎 On Apple TV+',
        badge: 'STREAMING NETWORK',
        description: 'Critically acclaimed Apple Original series, sci-fi epics, Emmy-winning comedies, and landmark theatrical films.'
    },
    'paramount-plus': {
        name: '⛰️ Paramount+ & Paramount Pictures',
        badge: 'STUDIO & NETWORK HUB',
        description: 'Flagship originals, the Star Trek universe, Taylor Sheridan sagas, and iconic Paramount Pictures blockbusters.'
    },
    'peacock': {
        name: '🦚 Peacock & NBCUniversal',
        badge: 'STUDIO & NETWORK HUB',
        description: 'Peacock Originals, legendary NBC sitcoms, gripping crime procedurals, and premier television dramas.'
    },
    'crunchyroll': {
        name: '🍥 On Crunchyroll',
        badge: 'ANIME NETWORK',
        description: 'Simulcast anime hits, shonen blockbusters, isekai adventures, and English/multi-language dubbed anime series.'
    },
    'universal-pictures': {
        name: '🌍 Universal Pictures Showcase',
        badge: 'STUDIO SHOWCASE',
        description: 'Over a century of cinematic landmarks: Jurassic World, Fast & Furious, Oppenheimer, Illumination animation, and classic thrillers.'
    },
    'sony-pictures': {
        name: '🎬 Sony Pictures & Columbia',
        badge: 'STUDIO SHOWCASE',
        description: 'The definitive Sony Pictures and Columbia Pictures library: Spider-Man universe, Ghostbusters, Jumanji, and action franchises.'
    }
};

function formatSlugTitle(s) {
    if (!s) return 'Collection';
    if (PLATFORM_META[s]) return PLATFORM_META[s].name;
    return s.replace(/^on-/, '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export default function CollectionDetailScreen({ route, navigation }) {
    const rawCollection = route?.params?.collection;
    const rawInitialItems = route?.params?.initialItems;
    const rawSlug = route?.params?.slug || (typeof rawCollection === 'string' ? rawCollection : rawCollection?.slug || rawCollection?.id) || '';
    const activeSlug = rawSlug.replace(/^on-apple-tv$/, 'apple-tv-plus').replace(/^on-(netflix|disney-plus|max|prime-video|hulu|paramount-plus|peacock|crunchyroll)$/, '$1');

    const [collection, setCollection] = useState(() => {
        const preset = PLATFORM_META[activeSlug] || {};
        if (rawCollection && typeof rawCollection === 'object') {
            return {
                ...preset,
                ...rawCollection,
                slug: activeSlug || rawCollection.slug,
                name: rawCollection.name || preset.name || formatSlugTitle(activeSlug),
                description: rawCollection.description || rawCollection.overview || preset.description
            };
        }
        return {
            slug: activeSlug,
            name: preset.name || formatSlugTitle(activeSlug),
            description: preset.description || 'Curated collection of cinematic titles.'
        };
    });

    const { width } = useWindowDimensions();
    const isDesktop = width >= 1024;
    const numCols = width >= 1400 ? 6 : width >= 1024 ? 5 : width >= 768 ? 4 : width >= 480 ? 3 : 2;

    useRouteMeta('CollectionDetail', collection);
    const [allTitles, setAllTitles] = useState(() => Array.isArray(rawInitialItems) ? rawInitialItems : []);
    const [loading, setLoading] = useState(() => !(Array.isArray(rawInitialItems) && rawInitialItems.length > 0));
    const [activeType, setActiveType] = useState('all');
    const [selectedSort, setSelectedSort] = useState('default');
    const [visibleCount, setVisibleCount] = useState(48);

    useEffect(() => {
        let cancelled = false;
        const slugToFetch = activeSlug || rawSlug;
        if (!slugToFetch) {
            setLoading(false);
            return;
        }

        const preset = PLATFORM_META[slugToFetch] || {};
        setActiveType('all');
        setSelectedSort('default');
        setVisibleCount(48);

        if (rawCollection && typeof rawCollection === 'object') {
            setCollection({
                ...preset,
                ...rawCollection,
                slug: slugToFetch,
                name: rawCollection.name || preset.name || formatSlugTitle(slugToFetch),
                description: rawCollection.description || rawCollection.overview || preset.description
            });
        } else {
            setCollection({
                slug: slugToFetch,
                name: preset.name || formatSlugTitle(slugToFetch),
                description: preset.description || 'Curated collection of cinematic titles.'
            });
        }

        const seeded = Array.isArray(rawInitialItems) && rawInitialItems.length > 0 ? rawInitialItems : [];
        if (seeded.length > 0) {
            setAllTitles(seeded);
            setLoading(false);
        } else {
            setAllTitles([]);
            setLoading(true);
        }

        fetch(`${getApiBase()}/titles?collection=${encodeURIComponent(slugToFetch)}&page_size=250`)
            .then(r => r.json())
            .then(d => {
                if (cancelled) return;
                if (d && d.collection) {
                    setCollection(prev => ({
                        ...prev,
                        ...d.collection,
                        name: d.collection.name || prev.name,
                        description: d.collection.description || d.collection.overview || prev.description,
                        cover_image: d.collection.cover_image || d.collection.backdrop || d.collection.poster || prev.cover_image
                    }));
                }
                const items = (d && d.items) || (Array.isArray(d) ? d : []);
                if (items.length > 0) {
                    setAllTitles(items);
                    setLoading(false);
                } else if (seeded.length === 0) {
                    fetch(`${getApiBase()}/search?q=${encodeURIComponent(slugToFetch.replace(/-/g, ' '))}&limit=60`)
                        .then(r2 => r2.json())
                        .then(d2 => {
                            if (!cancelled) {
                                setAllTitles(d2?.items || []);
                                setLoading(false);
                            }
                        })
                        .catch(() => {
                            if (!cancelled) setLoading(false);
                        });
                } else {
                    setLoading(false);
                }
            })
            .catch(() => {
                if (!cancelled) setLoading(false);
            });

        return () => { cancelled = true; };
    }, [activeSlug, rawSlug]);

    const filteredTitles = useMemo(() => {
        let list = allTitles.slice();
        if (activeType === 'movie') {
            list = list.filter(t => t.type === 'movie');
        } else if (activeType === 'tv') {
            list = list.filter(t => t.type === 'tv' || t.type === 'anime' || t.type === 'short_drama' || t.isAnime);
        }

        if (selectedSort === 'popularity') {
            list.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
        } else if (selectedSort === 'rating') {
            list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        } else if (selectedSort === 'year') {
            list.sort((a, b) => (b.year || 0) - (a.year || 0));
        }
        return list;
    }, [allTitles, activeType, selectedSort]);

    const displayedTitles = useMemo(() => filteredTitles.slice(0, visibleCount), [filteredTitles, visibleCount]);
    const movieCount = useMemo(() => allTitles.filter(t => t.type === 'movie').length, [allTitles]);
    const tvCount = useMemo(() => allTitles.filter(t => t.type === 'tv' || t.type === 'anime' || t.type === 'short_drama' || t.isAnime).length, [allTitles]);

    const badgeLabel = PLATFORM_META[activeSlug]?.badge || (collection.kind === 'studio' ? 'STUDIO & NETWORK HUB' : 'CURATED UNIVERSE');
    const heroImage = collection.cover_image || collection.backdrop || collection.poster || allTitles[0]?.backdrop || allTitles[0]?.poster;

    return (
        <SafeAreaView style={styles.screen}>
            <AppHeader navigation={navigation} activeRoute="Collections" title={collection.name || 'Collection'} />

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Collection Hero Header */}
                <View style={styles.headerHero}>
                    <Poster
                        url={heroImage}
                        title={collection.name}
                        style={StyleSheet.absoluteFill}
                    />
                    <View style={styles.heroOverlay}>
                        <View style={styles.backRow}>
                            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Collections')}>
                                <Text style={styles.backBtnText}>‹ Back</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.allCollectionsBtn} onPress={() => navigation.navigate('Collections')}>
                                <Text style={styles.allCollectionsBtnText}>📦 All Collections</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{badgeLabel}</Text>
                        </View>

                        <Text style={styles.heroTitle}>{collection.name}</Text>
                        <Text style={styles.heroDesc}>{collection.description || 'Curated collection of cinematic titles.'}</Text>
                        <Text style={styles.heroMeta}>
                            {filteredTitles.length} {filteredTitles.length === 1 ? 'title' : 'titles'} available
                        </Text>
                    </View>
                </View>

                {/* Filter & Sort Controls */}
                {allTitles.length > 0 && (
                    <View style={styles.controlsBar}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                            {[
                                { id: 'all', label: `📂 All (${allTitles.length})` },
                                ...(movieCount > 0 ? [{ id: 'movie', label: `🎬 Movies (${movieCount})` }] : []),
                                ...(tvCount > 0 ? [{ id: 'tv', label: `📺 Series (${tvCount})` }] : []),
                            ].map(tab => {
                                const isSel = activeType === tab.id;
                                return (
                                    <TouchableOpacity
                                        key={tab.id}
                                        style={[styles.filterChip, isSel && styles.filterChipActive]}
                                        onPress={() => { setActiveType(tab.id); setVisibleCount(48); }}
                                    >
                                        <Text style={[styles.filterChipText, isSel && styles.filterChipTextActive]}>{tab.label}</Text>
                                    </TouchableOpacity>
                                );
                            })}

                            <View style={styles.divider} />

                            {[
                                { id: 'default', label: '✨ Featured' },
                                { id: 'popularity', label: '🔥 Popular' },
                                { id: 'rating', label: '⭐ Top Rated' },
                                { id: 'year', label: '⚡ Latest' }
                            ].map(s => {
                                const isSel = selectedSort === s.id;
                                return (
                                    <TouchableOpacity
                                        key={s.id}
                                        style={[styles.sortChip, isSel && styles.sortChipActive]}
                                        onPress={() => { setSelectedSort(s.id); setVisibleCount(48); }}
                                    >
                                        <Text style={[styles.sortChipText, isSel && styles.sortChipTextActive]}>{s.label}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                )}

                {/* Titles Grid */}
                {loading ? (
                    <SkeletonGrid count={8} numCols={numCols} />
                ) : displayedTitles.length === 0 ? (
                    <View style={styles.emptyBox}>
                        <Text style={styles.emptyText}>No titles match the selected filter.</Text>
                    </View>
                ) : (
                    <View style={styles.grid}>
                        {displayedTitles.map((t, idx) => (
                            <View
                                key={`${t.id || idx}-${idx}`}
                                style={{ width: `${100 / numCols - 1.5}%`, marginBottom: 18 }}
                            >
                                <MediaCard
                                    item={t}
                                    onPress={(it) => navigation.navigate('TitleDetail', { slug: it.slug || String(it.id), item: it })}
                                    isLarge={isDesktop}
                                />
                            </View>
                        ))}
                    </View>
                )}

                {displayedTitles.length < filteredTitles.length && (
                    <View style={styles.loadMoreRow}>
                        <TouchableOpacity
                            style={styles.loadMoreBtn}
                            onPress={() => setVisibleCount(prev => prev + 48)}
                        >
                            <Text style={styles.loadMoreBtnText}>
                                Load More ({displayedTitles.length} of {filteredTitles.length})
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>

            <MobileTabBar navigation={navigation} activeRoute="Collections" />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: COLORS.bg },
    headerHero: {
        minHeight: 240,
        position: 'relative',
        justifyContent: 'flex-end',
        backgroundColor: COLORS.surface
    },
    heroOverlay: {
        padding: 20,
        backgroundColor: 'rgba(10, 10, 10, 0.82)',
        width: '100%'
    },
    backRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12
    },
    backBtn: {
        paddingVertical: 4,
        paddingRight: 12
    },
    backBtnText: { color: COLORS.brand, fontSize: 14, fontWeight: '800' },
    allCollectionsBtn: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)'
    },
    allCollectionsBtnText: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '700' },
    badge: {
        alignSelf: 'flex-start',
        backgroundColor: COLORS.brand,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
        marginBottom: 6
    },
    badgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
    heroTitle: { color: COLORS.textPrimary, fontSize: 26, fontWeight: '900', marginBottom: 4 },
    heroDesc: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 19, marginBottom: 8, maxWidth: 680 },
    heroMeta: { color: COLORS.textMuted, fontSize: 12, fontWeight: '700' },
    controlsBar: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        backgroundColor: COLORS.surface
    },
    chipsRow: {
        paddingHorizontal: 16,
        alignItems: 'center',
        gap: 8
    },
    filterChip: {
        paddingHorizontal: 13,
        paddingVertical: 7,
        borderRadius: 18,
        backgroundColor: COLORS.surfaceAlt,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    filterChipActive: {
        backgroundColor: COLORS.brand,
        borderColor: COLORS.brand
    },
    filterChipText: {
        color: COLORS.textSecondary,
        fontSize: 12,
        fontWeight: '700'
    },
    filterChipTextActive: {
        color: '#FFFFFF'
    },
    divider: {
        width: 1,
        height: 20,
        backgroundColor: COLORS.border,
        marginHorizontal: 4
    },
    sortChip: {
        paddingHorizontal: 11,
        paddingVertical: 6,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)'
    },
    sortChipActive: {
        backgroundColor: 'rgba(229, 9, 20, 0.2)',
        borderColor: COLORS.brand
    },
    sortChipText: {
        color: COLORS.textMuted,
        fontSize: 11,
        fontWeight: '600'
    },
    sortChipTextActive: {
        color: '#FFFFFF',
        fontWeight: '700'
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 16
    },
    emptyBox: {
        padding: 40,
        alignItems: 'center'
    },
    emptyText: {
        color: COLORS.textMuted,
        fontSize: 14
    },
    loadMoreRow: {
        paddingVertical: 20,
        alignItems: 'center'
    },
    loadMoreBtn: {
        backgroundColor: COLORS.surfaceAlt,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingHorizontal: 24,
        paddingVertical: 11,
        borderRadius: 8
    },
    loadMoreBtnText: {
        color: COLORS.textPrimary,
        fontSize: 13,
        fontWeight: '700'
    }
});
