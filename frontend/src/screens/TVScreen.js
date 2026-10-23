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

export default function TVScreen({ route, navigation }) {
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

    useRouteMeta('TV');
    const [selectedSort, setSelectedSort] = useState('popularity');
    const [selectedYearMin, setSelectedYearMin] = useState(null);
    const [selectedAudioLang, setSelectedAudioLang] = useState(null);
    const [series, setSeries] = useState([]);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    const audioLanguages = [
        { code: null,   label: '🎙️ Any Audio' },
        { code: 'ko',   label: '🇰🇷 Korean' },
        { code: 'zh',   label: '🇨🇳 Chinese' },
        { code: 'ja',   label: '🇯🇵 Japanese' },
        { code: 'tr',   label: '🇹🇷 Turkish' },
        { code: 'ar',   label: '🇸🇦 Arabic' },
        { code: 'hi',   label: '🇮🇳 Hindi' },
        { code: 'es',   label: '🇪🇸 Spanish' },
        { code: 'fr',   label: '🇫🇷 French' },
        { code: 'pt',   label: '🇧🇷 Portuguese' },
        { code: 'de',   label: '🇩🇪 German' },
        { code: 'en',   label: '🇺🇸 English' },
        { code: 'ur',   label: '🇵🇰 Urdu' },
        { code: 'fa',   label: '🇮🇷 Persian' },
        { code: 'id',   label: '🇮🇩 Indonesian' },
        { code: 'fil',  label: '🇵🇭 Filipino' }
    ];

    // "All Shows" used to mean every tv row, which meant talk shows, game
    // shows and news panels crowded out scripted fiction. Everything here is
    // now scripted-only (`scripted=1`), with dedicated tabs for episodic
    // browsing and drama.
    const tabs = [
        { id: 'popular',    label: '\u{1F4FA} Popular' },
        { id: 'latest',     label: '\u{1F3AC} Latest Shows' },
        { id: 'ongoing',    label: '\u{1F4E1} Ongoing Series' },
        { id: 'trending',   label: '\u{1F525} Trending' },
        { id: 'episodes',   label: '\u{1F5C2}\uFE0F Seasons & Episodes' },
        { id: 'drama',      label: '\u{1F3AD} Dramas' },
        { id: 'kdrama',     label: '\u{1F338} K-Drama' },
        { id: 'cdrama',     label: '\u{1F409} C-Drama' },
        { id: 'pakistani',  label: '\u{1F1F5}\u{1F1F0} Pakistani' },
        { id: 'indian',     label: '\u{1F1EE}\u{1F1F3} Indian' },
        { id: 'turkish',    label: '\u{1F1F9}\u{1F1F7} Turkish' },
        { id: 'top_rated',  label: '\u2B50 Top Rated' },
        { id: 'all',        label: '\u{1F4C1} All Series' },
    ];

    const sortOptions = [
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
        { id: 1990, label: '1990s' }
    ];

    const fetchSeries = useCallback(async (tab, sort, yearMin, audioLang, pageNum, append = false) => {
        if (pageNum === 1) setLoading(true);
        else setLoadingMore(true);

        try {
            // Scripted-only: talk shows, game shows and news panels are tagged
            // is_scripted=0 by classify_scripted.py and never appear here.
            let url = `${getApiBase()}/titles?type=tv&scripted=1&page=${pageNum}&page_size=24`;

            if (tab === 'latest') {
                url += `&sort=newest&year_min=2020&year_max=${new Date().getFullYear()}`;
            } else if (tab === 'ongoing') {
                url = `${getApiBase()}/titles?collection=ongoing-tv&type=tv&page=${pageNum}&page_size=24`;
            } else if (tab === 'episodes') {
                // Deep episodic browsing: multi-season shows first.
                url += `&min_seasons=2&sort=popularity`;
            } else if (tab === 'drama') {
                url += `&genre=drama&sort=popularity`;
            } else if (tab === 'kdrama') {
                url += `&country=KR&sort=${sort}`;
            } else if (tab === 'cdrama') {
                url += `&country=CN&sort=${sort}`;
            } else if (tab === 'pakistani') {
                url += `&country=PK&sort=${sort}`;
            } else if (tab === 'indian') {
                url += `&country=IN&sort=${sort}`;
            } else if (tab === 'turkish') {
                url += `&country=TR&sort=${sort}`;
            } else if (tab === 'top_rated') {
                url += `&sort=rating&min_rating=7.5`;
            } else if (tab === 'trending') {
                url += `&sort=popularity`;
            } else {
                url += `&sort=${sort}`;
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
                setTotal(data.total || newItems.length || 0);
                if (append) {
                    setSeries(prev => [...prev, ...newItems]);
                } else {
                    setSeries(newItems);
                }
            }
        } catch (err) {
            console.error('[TVScreen] fetch error:', err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, []);

    useEffect(() => {
        setPage(1);
        fetchSeries(activeTab, selectedSort, selectedYearMin, selectedAudioLang, 1, false);
    }, [activeTab, selectedSort, selectedYearMin, selectedAudioLang, fetchSeries]);

    const handleLoadMore = () => {
        if (loadingMore || series.length >= total) return;
        const nextPage = page + 1;
        setPage(nextPage);
        fetchSeries(activeTab, selectedSort, selectedYearMin, selectedAudioLang, nextPage, true);
    };

    const headerTitle =
        activeTab === 'episodes' ? 'Seasons & Episodes' :
        activeTab === 'drama' ? 'Dramas' :
        activeTab === 'latest' ? 'Latest TV Shows' :
        activeTab === 'ongoing' ? 'Ongoing TV Series' :
        'TV Series';

    return (
        <SafeAreaView style={styles.screen}>
            <AppHeader navigation={navigation} activeRoute="TV" title={headerTitle} />

            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.hubHero}>
                    <Text style={styles.hubTitle}>📺 Television & Web Series</Text>
                    <Text style={styles.hubSub}>
                        {total > 0 ? `${total.toLocaleString()} episodic series with verified seasonal breakdowns` : 'Stream ongoing and completed series across Korean, Chinese, Pakistani, and Western television'}
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

                {/* Filter Bar: Audio Language + Year + Sort */}
                <View style={styles.filterBar}>
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
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsRow}>
                        {sortOptions.map(s => {
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
                    </ScrollView>
                </View>

                {/* Content Grid */}
                {loading ? (
                    <SkeletonGrid count={12} numCols={numCols} />
                ) : (
                    <View style={styles.grid}>
                        {series.map((s, idx) => (
                            <View
                                key={`${s.id || idx}-${idx}`}
                                style={{ width: `calc(${100 / numCols}% - ${(12 * (numCols - 1)) / numCols}px)`, marginBottom: 16 }}
                            >
                                <MediaCard
                                    item={s}
                                    onPress={(it) => navigation.navigate('TitleDetail', { slug: it.slug || String(it.id), item: it })}
                                    width="100%"
                                    isLarge={isDesktop}
                                />
                            </View>
                        ))}
                    </View>
                )}

                {/* Load More Button */}
                {series.length < total && !loading && (
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
                                    Load More ({series.length} of {total.toLocaleString()})
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>

            <MobileTabBar navigation={navigation} activeRoute="TV" />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: COLORS.bg },
    hubHero: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14 },
    hubTitle: { color: COLORS.textPrimary, fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
    hubSub: { color: COLORS.textMuted, fontSize: 13, marginTop: 4 },
    tabsRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
    tabChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: COLORS.surfaceAlt,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    tabChipActive: { backgroundColor: COLORS.badgeTv, borderColor: COLORS.badgeTv },
    tabChipText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
    tabChipTextActive: { color: '#FFFFFF', fontWeight: '700' },
    filterBar: {
        paddingHorizontal: 18,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        gap: 6
    },
    filterChipsRow: { gap: 6 },
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
    filterChipText: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600' },
    filterChipTextActive: { color: COLORS.accent, fontWeight: '700' },
    sortBtn: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 4
    },
    sortBtnActive: {
        backgroundColor: 'rgba(255,255,255,0.1)'
    },
    sortBtnText: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600' },
    sortBtnTextActive: { color: COLORS.textPrimary, fontWeight: '700' },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        gap: 12,
        paddingHorizontal: 16,
        paddingTop: 16
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
