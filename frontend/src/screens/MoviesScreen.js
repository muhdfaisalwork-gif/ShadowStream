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

export default function MoviesScreen({ route, navigation }) {
    const responsive = useResponsive();
    const isDesktop = responsive.isDesktop;
    const numCols = responsive.gridColumns;

    const initialFilter = route?.params?.filter || 'popular';
    const [activeTab, setActiveTab] = useState(initialFilter);

    useEffect(() => {
        if (route?.params?.filter) {
            setActiveTab(route.params.filter);
        }
    }, [route?.params?.filter]);

    useRouteMeta('Movies');
    const [selectedCountry, setSelectedCountry] = useState(null);
    const [selectedAudioLang, setSelectedAudioLang] = useState(null);
    const [selectedSort, setSelectedSort] = useState('popularity');
    const [selectedYearMin, setSelectedYearMin] = useState(null);
    const [movies, setMovies] = useState([]);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    const tabs = [
        { id: 'popular', label: '🌟 Popular' },
        { id: 'latest', label: '🎬 Latest Releases' },
        { id: 'top_rated', label: '⭐ Top Rated' },
        { id: 'free_legal', label: '✨ Free Stream' },
        { id: 'action', label: '💥 Action' },
        { id: 'science-fiction', label: '🚀 Sci-Fi' },
        { id: 'comedy', label: '😂 Comedy' },
        { id: 'horror', label: '👻 Horror' },
        { id: 'romance', label: '💕 Romance' },
        { id: 'all', label: '📂 All' }
    ];

    const countries = [
        { code: null, label: 'All Origins' },
        { code: 'US', label: '🇺🇸 US' },
        { code: 'IN', label: '🇮🇳 India' },
        { code: 'KR', label: '🇰🇷 Korea' },
        { code: 'GB', label: '🇬🇧 UK' },
        { code: 'FR', label: '🇫🇷 France' },
        { code: 'JP', label: '🇯🇵 Japan' }
    ];

    const sorts = [
        { id: 'popularity', label: 'Most Popular' },
        { id: 'rating', label: 'Highest Rated' },
        { id: 'year', label: 'Newest First' },
        { id: 'newest', label: 'Recently Added' }
    ];

    const yearBuckets = [
        { id: null, label: 'Any Year' },
        { id: 2025, label: '2025+' },
        { id: 2020, label: '2020+' },
        { id: 2015, label: '2015+' },
        { id: 2010, label: '2010+' },
        { id: 2000, label: '2000s' },
        { id: 1990, label: '1990s' },
        { id: 1980, label: '1980s' }
    ];

    const audioLanguages = [
        { code: null,    label: '🎙️ Any Audio' },
        { code: 'en',   label: '🇺🇸 English' },
        { code: 'hi',   label: '🇮🇳 Hindi' },
        { code: 'ar',   label: '🇸🇦 Arabic' },
        { code: 'ja',   label: '🇯🇵 Japanese' },
        { code: 'ko',   label: '🇰🇷 Korean' },
        { code: 'zh',   label: '🇨🇳 Chinese' },
        { code: 'tr',   label: '🇹🇷 Turkish' },
        { code: 'es',   label: '🇪🇸 Spanish' },
        { code: 'fr',   label: '🇫🇷 French' },
        { code: 'pt',   label: '🇧🇷 Portuguese' },
        { code: 'de',   label: '🇩🇪 German' },
        { code: 'ur',   label: '🇵🇰 Urdu' },
        { code: 'fa',   label: '🇮🇷 Persian' },
        { code: 'id',   label: '🇮🇩 Indonesian' },
        { code: 'fil',  label: '🇵🇭 Filipino' }
    ];

    const fetchMovies = useCallback(async (tab, country, sort, yearMin, audioLang, pageNum, append = false) => {
        if (pageNum === 1) setLoading(true);
        else setLoadingMore(true);

        try {
            let url = `${getApiBase()}/titles?type=movie&page=${pageNum}&page_size=24`;

            if (tab === 'latest') {
                url += `&sort=newest&year_min=2020&year_max=${new Date().getFullYear()}`;
            } else if (tab === 'top_rated') {
                url += `&sort=rating&min_rating=7.5`;
            } else if (tab === 'free_legal') {
                url = `${getApiBase()}/titles?collection=free-content&type=movie&page=${pageNum}&page_size=24`;
            } else if (tab !== 'all' && tab !== 'popular') {
                url += `&genre=${encodeURIComponent(tab)}&sort=${sort}`;
            } else {
                url += `&sort=${sort}`;
            }

            if (country) {
                url += `&country=${encodeURIComponent(country)}`;
            }
            if (yearMin) {
                url += `&year_min=${yearMin}`;
            }
            if (audioLang) {
                url += `&audio_language=${encodeURIComponent(audioLang)}`;
            }

            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                const newItems = data.items || [];
                setTotal(data.total || 0);
                if (append) {
                    setMovies(prev => [...prev, ...newItems]);
                } else {
                    setMovies(newItems);
                }
            }
        } catch (err) {
            console.error('[MoviesScreen] fetch error:', err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, []);

    useEffect(() => {
        setPage(1);
        fetchMovies(activeTab, selectedCountry, selectedSort, selectedYearMin, selectedAudioLang, 1, false);
    }, [activeTab, selectedCountry, selectedSort, selectedYearMin, selectedAudioLang, fetchMovies]);

    const handleLoadMore = () => {
        if (loadingMore || movies.length >= total) return;
        const nextPage = page + 1;
        setPage(nextPage);
        fetchMovies(activeTab, selectedCountry, selectedSort, selectedYearMin, selectedAudioLang, nextPage, true);
    };

    return (
        <SafeAreaView style={styles.screen}>
            <AppHeader navigation={navigation} activeRoute="Movies" title="Movies Hub" />

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Hub Header */}
                <View style={styles.hubHero}>
                    <Text style={styles.hubTitle}>🎬 Movies Hub</Text>
                    <Text style={styles.hubSub}>
                        {total > 0 ? `${total.toLocaleString()} feature films indexed with full metadata & verified streams` : 'Explore cinema across all genres, years, and nations'}
                    </Text>
                </View>

                {/* Sub-tabs Row */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
                    {tabs.map(tab => {
                        const isActive = activeTab === tab.id;
                        return (
                            <TouchableOpacity
                                key={tab.id}
                                style={[styles.tabChip, isActive && styles.tabChipActive]}
                                onPress={() => setActiveTab(tab.id)}
                            >
                                <Text style={[styles.tabChipText, isActive && styles.tabChipTextActive]}>
                                    {tab.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {/* Filter & Sort Bar */}
                <View style={styles.filterBar}>
                    {/* Audio language filter (First-class multi-audio dubs) */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsRow}>
                        {audioLanguages.map(l => {
                            const isSel = selectedAudioLang === l.code;
                            return (
                                <TouchableOpacity
                                    key={l.label}
                                    style={[styles.filterChip, isSel && styles.filterChipAudio]}
                                    onPress={() => setSelectedAudioLang(l.code)}
                                >
                                    <Text style={[styles.filterChipText, isSel && styles.filterChipTextActive]}>
                                        {l.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    {/* Country Pills */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsRow}>
                        {countries.map(c => {
                            const isSel = selectedCountry === c.code;
                            return (
                                <TouchableOpacity
                                    key={c.label}
                                    style={[styles.filterChip, isSel && styles.filterChipActive]}
                                    onPress={() => setSelectedCountry(c.code)}
                                >
                                    <Text style={[styles.filterChipText, isSel && styles.filterChipTextActive]}>
                                        {c.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    {/* Year Pills */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsRow}>
                        {yearBuckets.map(y => {
                            const isSel = selectedYearMin === y.id;
                            return (
                                <TouchableOpacity
                                    key={y.label}
                                    style={[styles.filterChip, isSel && styles.filterChipActive]}
                                    onPress={() => setSelectedYearMin(y.id)}
                                >
                                    <Text style={[styles.filterChipText, isSel && styles.filterChipTextActive]}>
                                        {y.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    {/* Sort Selector */}
                    <View style={styles.sortWrapper}>
                        {sorts.map(s => {
                            const isSort = selectedSort === s.id;
                            return (
                                <TouchableOpacity
                                    key={s.id}
                                    style={[styles.sortBtn, isSort && styles.sortBtnActive]}
                                    onPress={() => setSelectedSort(s.id)}
                                >
                                    <Text style={[styles.sortBtnText, isSort && styles.sortBtnTextActive]}>
                                        {s.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* Content Grid */}
                {loading ? (
                    <SkeletonGrid count={12} numCols={numCols} />
                ) : (
                    <View style={styles.grid}>
                        {movies.map((m, idx) => (
                            <View
                                key={`${m.id || idx}-${idx}`}
                                style={{ width: `${100 / numCols - 1.5}%`, marginBottom: 18 }}
                            >
                                <MediaCard
                                    item={m}
                                    onPress={(it) => navigation.navigate('TitleDetail', { slug: it.slug || String(it.id), item: it })}
                                    isLarge={isDesktop}
                                />
                            </View>
                        ))}
                    </View>
                )}

                {/* Load More Button */}
                {movies.length < total && !loading && (
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
                                    Load More ({movies.length} of {total.toLocaleString()})
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>

            <MobileTabBar navigation={navigation} activeRoute="Movies" />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: COLORS.bg
    },
    hubHero: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 14
    },
    hubTitle: {
        color: COLORS.textPrimary,
        fontSize: 26,
        fontWeight: '900',
        letterSpacing: -0.5
    },
    hubSub: {
        color: COLORS.textMuted,
        fontSize: 13,
        marginTop: 4
    },
    tabsRow: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        gap: 8
    },
    tabChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: COLORS.surfaceAlt,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    tabChipActive: {
        backgroundColor: COLORS.brand,
        borderColor: COLORS.brand
    },
    tabChipText: {
        color: COLORS.textSecondary,
        fontSize: 12,
        fontWeight: '600'
    },
    tabChipTextActive: {
        color: '#FFFFFF',
        fontWeight: '700'
    },
    filterBar: {
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        gap: 10
    },
    filterChipsRow: {
        gap: 6
    },
    filterChip: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 6,
        backgroundColor: COLORS.surfaceCard,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    filterChipActive: {
        borderColor: COLORS.accent,
        backgroundColor: 'rgba(0, 229, 255, 0.1)'
    },
    filterChipAudio: {
        borderColor: '#22d3ee',
        backgroundColor: 'rgba(34, 211, 238, 0.18)'
    },
    filterChipText: {
        color: COLORS.textMuted,
        fontSize: 11,
        fontWeight: '600'
    },
    filterChipTextActive: {
        color: COLORS.accent,
        fontWeight: '700'
    },
    sortWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    sortBtn: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 4
    },
    sortBtnActive: {
        backgroundColor: 'rgba(255,255,255,0.1)'
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
        paddingTop: 16
    },
    loadMoreRow: {
        alignItems: 'center',
        paddingVertical: 24
    },
    loadMoreBtn: {
        backgroundColor: COLORS.surfaceAlt,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8
    },
    loadMoreBtnText: {
        color: COLORS.textPrimary,
        fontSize: 13,
        fontWeight: '700'
    }
});



