import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
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

export default function GenreScreen({ route, navigation }) {
    const responsive = useResponsive();
    const isDesktop = responsive.isDesktop;
    const numCols = responsive.gridColumns;

    const initialGenre = route?.params?.genreSlug || 'action';
    const [selectedGenre, setSelectedGenre] = useState(initialGenre);
    const [genres, setGenres] = useState([]);

    useRouteMeta('Genres', { slug: selectedGenre });
    const [selectedSort, setSelectedSort] = useState(route?.params?.sort || 'popularity');

    useEffect(() => {
        if (route?.params?.genreSlug) {
            setSelectedGenre(route.params.genreSlug);
        }
        if (route?.params?.sort) {
            setSelectedSort(route.params.sort);
        }
    }, [route?.params?.genreSlug, route?.params?.sort]);
    const [titles, setTitles] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loadingGenres, setLoadingGenres] = useState(true);
    const [loadingTitles, setLoadingTitles] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    useEffect(() => {
        let cancelled = false;
        fetch(`${getApiBase()}/genres-catalog?with_counts=1`)
            .then(r => r.ok ? r.json() : fetch(`${getApiBase()}/genres`).then(r2 => r2.json()))
            .then(d => {
                if (!cancelled) {
                    const items = Array.isArray(d) ? d : (d.items || d.genres || []);
                    setGenres(items);
                    if (items.length > 0 && !selectedGenre) {
                        setSelectedGenre(items[0].slug);
                    }
                    setLoadingGenres(false);
                }
            })
            .catch(() => {
                if (!cancelled) setLoadingGenres(false);
            });
        return () => { cancelled = true; };
    }, []);

    const fetchTitles = useCallback(async (genreSlug, sort, pageNum, append = false) => {
        if (!genreSlug) return;
        if (pageNum === 1) setLoadingTitles(true);
        else setLoadingMore(true);

        try {
            const url = `${getApiBase()}/titles?genre=${encodeURIComponent(genreSlug)}&sort=${sort}&page=${pageNum}&page_size=24`;
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                const newItems = data.items || [];
                setTotal(data.total || 0);
                if (append) {
                    setTitles(prev => [...prev, ...newItems]);
                } else {
                    setTitles(newItems);
                }
            }
        } catch (err) {
            console.error('[GenreScreen] fetchTitles error:', err);
        } finally {
            setLoadingTitles(false);
            setLoadingMore(false);
        }
    }, []);

    useEffect(() => {
        setPage(1);
        fetchTitles(selectedGenre, selectedSort, 1, false);
    }, [selectedGenre, selectedSort, fetchTitles]);

    const handleLoadMore = () => {
        if (loadingMore || titles.length >= total) return;
        const nextPage = page + 1;
        setPage(nextPage);
        fetchTitles(selectedGenre, selectedSort, nextPage, true);
    };

    const activeGenreObj = genres.find(g => g.slug === selectedGenre);

    return (
        <SafeAreaView style={styles.screen}>
            <AppHeader navigation={navigation} activeRoute="Genres" title="Genres Hub" />

            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.hubHero}>
                    <Text style={styles.hubTitle}>🏷️ 27 Canonical Genres</Text>
                    <Text style={styles.hubSub}>
                        Multi-genre taxonomy with real database title counts and comprehensive filtering.
                    </Text>
                </View>

                {/* Genre Pills Carousel */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.genrePillsRow}>
                    {genres.map(g => {
                        const isSel = selectedGenre === g.slug;
                        return (
                            <TouchableOpacity
                                key={g.slug}
                                style={[styles.genrePill, isSel && styles.genrePillActive]}
                                onPress={() => setSelectedGenre(g.slug)}
                            >
                                <Text style={[styles.genrePillText, isSel && styles.genrePillTextActive]}>
                                    {g.name}
                                </Text>
                                <View style={[styles.genreCountBadge, isSel && styles.genreCountBadgeActive]}>
                                    <Text style={[styles.genreCountText, isSel && styles.genreCountTextActive]}>
                                        {g.count || 0}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {/* Results Header + Sort */}
                <View style={styles.resultsHeader}>
                    <View>
                        <Text style={styles.resultsTitle}>
                            {activeGenreObj ? activeGenreObj.name : 'Genre'} Titles
                        </Text>
                        <Text style={styles.resultsCount}>{total.toLocaleString()} titles available</Text>
                    </View>

                    <View style={styles.sortRow}>
                        {[
                            { id: 'popularity', label: 'Popular' },
                            { id: 'rating', label: 'Rating' },
                            { id: 'year', label: 'Year' }
                        ].map(s => (
                            <TouchableOpacity
                                key={s.id}
                                style={[styles.sortBtn, selectedSort === s.id && styles.sortBtnActive]}
                                onPress={() => setSelectedSort(s.id)}
                            >
                                <Text style={[styles.sortBtnText, selectedSort === s.id && styles.sortBtnTextActive]}>
                                    {s.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Grid */}
                {loadingTitles ? (
                    <SkeletonGrid count={8} numCols={numCols} />
                ) : (
                    <View style={styles.grid}>
                        {titles.map((t, idx) => (
                            <View
                                key={`${t.id || idx}-${idx}`}
                                style={{ width: `calc(${100 / numCols}% - ${(12 * (numCols - 1)) / numCols}px)`, marginBottom: 16 }}
                            >
                                <MediaCard
                                    item={t}
                                    onPress={(it) => navigation.navigate('TitleDetail', { slug: it.slug || String(it.id), item: it })}
                                    width="100%"
                                    isLarge={isDesktop}
                                />
                            </View>
                        ))}
                    </View>
                )}

                {/* Load More Button */}
                {titles.length < total && !loadingTitles && (
                    <View style={styles.loadMoreRow}>
                        <TouchableOpacity
                            style={styles.loadMoreBtn}
                            onPress={handleLoadMore}
                            disabled={loadingMore}
                        >
                            {loadingMore ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <Text style={styles.loadMoreBtnText}>
                                    Load More ({titles.length} of {total.toLocaleString()})
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>

            <MobileTabBar navigation={navigation} activeRoute="Genres" />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: COLORS.bg },
    hubHero: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14 },
    hubTitle: { color: COLORS.textPrimary, fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
    hubSub: { color: COLORS.textMuted, fontSize: 13, marginTop: 4 },
    genrePillsRow: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        gap: 8
    },
    genrePill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 20,
        backgroundColor: COLORS.surfaceAlt,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    genrePillActive: {
        backgroundColor: COLORS.brand,
        borderColor: COLORS.brand
    },
    genrePillText: {
        color: COLORS.textSecondary,
        fontSize: 12,
        fontWeight: '700'
    },
    genrePillTextActive: {
        color: '#FFFFFF'
    },
    genreCountBadge: {
        marginLeft: 8,
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10
    },
    genreCountBadgeActive: {
        backgroundColor: 'rgba(0,0,0,0.3)'
    },
    genreCountText: {
        color: COLORS.textMuted,
        fontSize: 10,
        fontWeight: '700'
    },
    genreCountTextActive: {
        color: '#FFFFFF'
    },
    resultsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 8
    },
    resultsTitle: {
        color: COLORS.textPrimary,
        fontSize: 18,
        fontWeight: '800'
    },
    resultsCount: {
        color: COLORS.textMuted,
        fontSize: 12
    },
    sortRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    sortBtn: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4
    },
    sortBtnActive: {
        backgroundColor: 'rgba(255,255,255,0.12)'
    },
    sortBtnText: {
        color: COLORS.textMuted,
        fontSize: 11,
        fontWeight: '600'
    },
    sortBtnTextActive: {
        color: COLORS.textPrimary,
        fontWeight: '700'
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 12
    },
    loadMoreRow: { alignItems: 'center', paddingVertical: 24 },
    loadMoreBtn: {
        backgroundColor: COLORS.surfaceAlt,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8
    },
    loadMoreBtnText: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '700' }
});



