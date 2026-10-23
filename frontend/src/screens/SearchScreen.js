import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity,
    SafeAreaView, ActivityIndicator, useWindowDimensions
} from 'react-native';
import { COLORS } from '../theme/colors';
import AppHeader from '../components/AppHeader';
import MobileTabBar from '../components/MobileTabBar';
import MediaCard from '../components/MediaCard';
import SkeletonGrid from '../components/SkeletonGrid';
import { getApiBase } from '../utils/api';
import { useRouteMeta } from '../utils/useRouteMeta';
import { useResponsive } from '../theme/scaling';

export default function SearchScreen({ route, navigation }) {
    const responsive = useResponsive();
    const isDesktop = responsive.isDesktop;
    const numCols = responsive.gridColumns;

    // Support both navigation params AND deep-link query strings (?q=foo)
    const urlQuery = (typeof window !== 'undefined'
        && window.location
        && window.location.search
        ? new URLSearchParams(window.location.search).get('q') || ''
        : '');
    const initialQuery = route?.params?.initialQuery ?? route?.params?.query ?? route?.params?.q ?? urlQuery ?? '';
    const [query, setQuery] = useState(initialQuery);

    useEffect(() => {
        const nextQ = route?.params?.initialQuery ?? route?.params?.query ?? route?.params?.q;
        if (nextQ !== undefined) {
            setQuery(nextQ);
        }
    }, [route?.params?.initialQuery, route?.params?.query, route?.params?.q]);

    useRouteMeta('Search', { q: query });
    const [activeType, setActiveType] = useState('all');
    const [selectedGenre, setSelectedGenre] = useState(null);
    const [selectedCountry, setSelectedCountry] = useState(null);
    const [selectedRating, setSelectedRating] = useState(null);
    const [playableOnly, setPlayableOnly] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    const [results, setResults] = useState([]);
    const [facets, setFacets] = useState({});
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const abortRef = useRef(null);

    const types = [
        { id: 'all', label: 'All Content' },
        { id: 'movie', label: '🎬 Movies' },
        { id: 'tv', label: '📺 TV Series' },
        { id: 'anime', label: '⚡ Anime' },
        { id: 'short_drama', label: '📱 Short TV' }
    ];

    const genresList = ['action', 'drama', 'comedy', 'science-fiction', 'romance', 'thriller', 'horror', 'crime', 'animation'];
    const countriesList = [
        { code: 'US', label: '🇺🇸 US' },
        { code: 'IN', label: '🇮🇳 India' },
        { code: 'KR', label: '🇰🇷 Korea' },
        { code: 'CN', label: '🇨🇳 China' },
        { code: 'PK', label: '🇵🇰 Pakistan' },
        { code: 'GB', label: '🇬🇧 UK' },
        { code: 'JP', label: '🇯🇵 Japan' }
    ];
    const ratingOptions = [
        { id: null, label: 'Any Rating' },
        { id: 7.0, label: '★ 7.0+' },
        { id: 8.0, label: '★ 8.0+' },
        { id: 8.5, label: '★ 8.5+' }
    ];

    const executeSearch = useCallback(async (q, type, genre, country, minRating, playable) => {
        if (abortRef.current) {
            abortRef.current.abort();
        }
        const controller = new AbortController();
        abortRef.current = controller;

        setLoading(true);
        try {
            let url = `${getApiBase()}/search?q=${encodeURIComponent(q.trim())}&page=1&page_size=30`;
            if (type !== 'all') url += `&type=${encodeURIComponent(type)}`;
            if (genre) url += `&genre=${encodeURIComponent(genre)}`;
            if (country) url += `&country=${encodeURIComponent(country)}`;
            if (minRating) url += `&min_rating=${minRating}`;
            if (playable) url += `&playable_only=1`;

            const res = await fetch(url, { signal: controller.signal });
            if (res.ok) {
                const data = await res.json();
                setResults(data.items || []);
                setFacets(data.facets || {});
                setTotal(data.total || (data.items || []).length);
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('[SearchScreen] search error:', err);
            }
        } finally {
            if (abortRef.current === controller) {
                setLoading(false);
            }
        }
    }, []);

    // Debounced search trigger (300ms)
    useEffect(() => {
        const timer = setTimeout(() => {
            executeSearch(query, activeType, selectedGenre, selectedCountry, selectedRating, playableOnly);
        }, 300);
        return () => clearTimeout(timer);
    }, [query, activeType, selectedGenre, selectedCountry, selectedRating, playableOnly, executeSearch]);

    const clearFilters = () => {
        setSelectedGenre(null);
        setSelectedCountry(null);
        setSelectedRating(null);
        setPlayableOnly(false);
        setActiveType('all');
    };

    const hasActiveFilters = selectedGenre || selectedCountry || selectedRating || playableOnly || activeType !== 'all';

    return (
        <SafeAreaView style={styles.screen}>
            <AppHeader navigation={navigation} activeRoute="Search" title="Search" />

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Search Bar Input */}
                <View style={styles.searchBarWrapper}>
                    <View style={styles.searchInputContainer}>
                        <Text style={styles.searchIcon}>🔍</Text>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search movies, series, anime, actors, directors..."
                            placeholderTextColor={COLORS.textMuted}
                            value={query}
                            onChangeText={setQuery}
                            autoFocus={false}
                            returnKeyType="search"
                        />
                        {query.length > 0 && (
                            <TouchableOpacity onPress={() => setQuery('')} style={styles.clearBtn}>
                                <Text style={styles.clearBtnText}>✕</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    <TouchableOpacity
                        style={[styles.filterToggleBtn, (hasActiveFilters || showFilters) && styles.filterToggleBtnActive]}
                        onPress={() => setShowFilters(!showFilters)}
                    >
                        <Text style={[styles.filterToggleText, (hasActiveFilters || showFilters) && styles.filterToggleTextActive]}>
                            ⚡ Filters {hasActiveFilters ? '●' : ''}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Content Type Filter Pills */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeRow}>
                    {types.map(t => {
                        const isSel = activeType === t.id;
                        const facetCount = facets[t.id];
                        return (
                            <TouchableOpacity
                                key={t.id}
                                style={[styles.typeChip, isSel && styles.typeChipActive]}
                                onPress={() => setActiveType(t.id)}
                            >
                                <Text style={[styles.typeChipText, isSel && styles.typeChipTextActive]}>
                                    {t.label}
                                </Text>
                                {facetCount !== undefined && (
                                    <View style={[styles.facetBadge, isSel && styles.facetBadgeActive]}>
                                        <Text style={[styles.facetBadgeText, isSel && styles.facetBadgeTextActive]}>
                                            {facetCount}
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {/* Advanced Filter Panel (Collapsible) */}
                {showFilters && (
                    <View style={styles.advancedFiltersPanel}>
                        <View style={styles.filterSection}>
                            <Text style={styles.filterSectionTitle}>GENRE</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                                {genresList.map(g => (
                                    <TouchableOpacity
                                        key={g}
                                        style={[styles.chip, selectedGenre === g && styles.chipActive]}
                                        onPress={() => setSelectedGenre(selectedGenre === g ? null : g)}
                                    >
                                        <Text style={[styles.chipText, selectedGenre === g && styles.chipTextActive]}>
                                            {g.replace('-', ' ')}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        <View style={styles.filterSection}>
                            <Text style={styles.filterSectionTitle}>COUNTRY OF ORIGIN</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                                {countriesList.map(c => (
                                    <TouchableOpacity
                                        key={c.code}
                                        style={[styles.chip, selectedCountry === c.code && styles.chipActive]}
                                        onPress={() => setSelectedCountry(selectedCountry === c.code ? null : c.code)}
                                    >
                                        <Text style={[styles.chipText, selectedCountry === c.code && styles.chipTextActive]}>
                                            {c.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        <View style={styles.filterSection}>
                            <Text style={styles.filterSectionTitle}>MINIMUM RATING</Text>
                            <View style={styles.chipsRow}>
                                {ratingOptions.map(r => (
                                    <TouchableOpacity
                                        key={r.label}
                                        style={[styles.chip, selectedRating === r.id && styles.chipActive]}
                                        onPress={() => setSelectedRating(r.id)}
                                    >
                                        <Text style={[styles.chipText, selectedRating === r.id && styles.chipTextActive]}>
                                            {r.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={styles.filterActionsRow}>
                            <TouchableOpacity
                                style={[styles.playableToggle, playableOnly && styles.playableToggleActive]}
                                onPress={() => setPlayableOnly(!playableOnly)}
                            >
                                <Text style={[styles.playableToggleText, playableOnly && styles.playableToggleTextActive]}>
                                    {playableOnly ? '✅ Instant Stream Ready Only' : '⚪ Show All (Including Metadata)'}
                                </Text>
                            </TouchableOpacity>

                            {hasActiveFilters && (
                                <TouchableOpacity style={styles.resetBtn} onPress={clearFilters}>
                                    <Text style={styles.resetBtnText}>Clear All Filters</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                )}

                {/* Results Count Header */}
                <View style={styles.resultsBar}>
                    <Text style={styles.resultsCountText}>
                        {loading ? 'Searching catalog...' : (query.trim().length === 0 ? '✨ Popular & Trending Discoveries' : `${total.toLocaleString()} results found`)}
                    </Text>
                </View>

                {/* Results Grid */}
                {loading ? (
                    <SkeletonGrid count={8} numCols={numCols} />
                ) : results.length > 0 ? (
                    <View style={styles.grid}>
                        {results.map((item, idx) => (
                            <View
                                key={`${item.id || idx}-${idx}`}
                                style={{ width: `${100 / numCols - 1.5}%`, marginBottom: 18 }}
                            >
                                <MediaCard
                                    item={item}
                                    onPress={(it) => navigation.navigate('TitleDetail', { slug: it.slug || String(it.id), item: it })}
                                    width="100%"
                                    isLarge={isDesktop}
                                />
                            </View>
                        ))}
                    </View>
                ) : (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyIcon}>🔍</Text>
                        <Text style={styles.emptyTitle}>No Matching Titles</Text>
                        <Text style={styles.emptySub}>
                            Try searching with broader terms or clear filter restrictions.
                        </Text>
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>

            <MobileTabBar navigation={navigation} activeRoute="Search" />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: COLORS.bg },
    searchBarWrapper: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10
    },
    searchInputContainer: {
        flex: 1,
        height: 48,
        backgroundColor: COLORS.surfaceAlt,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    searchIcon: { fontSize: 16, marginRight: 10 },
    searchInput: {
        flex: 1,
        color: COLORS.textPrimary,
        fontSize: 14,
        height: '100%'
    },
    clearBtn: { padding: 6 },
    clearBtnText: { color: COLORS.textMuted, fontSize: 14 },
    filterToggleBtn: {
        height: 48,
        paddingHorizontal: 14,
        borderRadius: 8,
        backgroundColor: COLORS.surfaceAlt,
        borderWidth: 1,
        borderColor: COLORS.border,
        justifyContent: 'center',
        alignItems: 'center'
    },
    filterToggleBtnActive: {
        borderColor: COLORS.accent,
        backgroundColor: 'rgba(0, 229, 255, 0.1)'
    },
    filterToggleText: {
        color: COLORS.textSecondary,
        fontSize: 12,
        fontWeight: '700'
    },
    filterToggleTextActive: {
        color: COLORS.accent
    },
    typeRow: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        gap: 8
    },
    typeChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: COLORS.surfaceAlt,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    typeChipActive: {
        backgroundColor: COLORS.brand,
        borderColor: COLORS.brand
    },
    typeChipText: {
        color: COLORS.textSecondary,
        fontSize: 12,
        fontWeight: '600'
    },
    typeChipTextActive: {
        color: '#FFFFFF',
        fontWeight: '700'
    },
    facetBadge: {
        marginLeft: 6,
        backgroundColor: 'rgba(255,255,255,0.12)',
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderRadius: 10
    },
    facetBadgeActive: {
        backgroundColor: 'rgba(0,0,0,0.3)'
    },
    facetBadgeText: {
        color: COLORS.textMuted,
        fontSize: 9,
        fontWeight: '700'
    },
    facetBadgeTextActive: {
        color: '#FFFFFF'
    },
    advancedFiltersPanel: {
        marginHorizontal: 16,
        marginTop: 6,
        marginBottom: 12,
        backgroundColor: COLORS.surfaceCard,
        borderRadius: 10,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    filterSection: { marginBottom: 12 },
    filterSectionTitle: {
        color: COLORS.textMuted,
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1,
        marginBottom: 6
    },
    chipsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
    chip: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 6,
        backgroundColor: COLORS.surfaceAlt,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    chipActive: {
        borderColor: COLORS.accent,
        backgroundColor: 'rgba(0, 229, 255, 0.15)'
    },
    chipText: {
        color: COLORS.textSecondary,
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'capitalize'
    },
    chipTextActive: {
        color: COLORS.accent,
        fontWeight: '700'
    },
    filterActionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 6,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: COLORS.border
    },
    playableToggle: {
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 6,
        backgroundColor: COLORS.surfaceAlt
    },
    playableToggleActive: {
        backgroundColor: 'rgba(16, 185, 129, 0.2)'
    },
    playableToggleText: {
        color: COLORS.textSecondary,
        fontSize: 11,
        fontWeight: '600'
    },
    playableToggleTextActive: {
        color: COLORS.success,
        fontWeight: '700'
    },
    resetBtn: { padding: 6 },
    resetBtnText: {
        color: COLORS.brand,
        fontSize: 11,
        fontWeight: '700'
    },
    resultsBar: {
        paddingHorizontal: 20,
        paddingVertical: 8
    },
    resultsCountText: {
        color: COLORS.textMuted,
        fontSize: 12,
        fontWeight: '600'
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 8
    },
    emptyState: {
        padding: 40,
        alignItems: 'center'
    },
    emptyIcon: { fontSize: 36, marginBottom: 12 },
    emptyTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800', marginBottom: 6 },
    emptySub: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center' }
});



