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

export default function AnimeScreen({ route, navigation }) {
    const responsive = useResponsive();
    const isDesktop = responsive.isDesktop;
    const numCols = responsive.gridColumns;

    const [activeTab, setActiveTab] = useState(route?.params?.filter || 'all');

    useEffect(() => {
        if (route?.params?.filter) {
            setActiveTab(route.params.filter);
        }
    }, [route?.params?.filter]);

    useRouteMeta('Anime');
    const [selectedYearMin, setSelectedYearMin] = useState(null);
    const [selectedAudioLang, setSelectedAudioLang] = useState(null);
    const [selectedSubLang, setSelectedSubLang] = useState(null);
    const [selectedSort, setSelectedSort] = useState('popularity');
    const [animeList, setAnimeList] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    const tabs = [
        { id: 'all', label: '⚡ All Anime' },
        { id: 'trending', label: '🔥 Trending Now' },
        { id: 'dub_en', label: '🎙️ English Dub' },
        { id: 'dub_hi', label: '🇮🇳 Hindi Dub' },
        { id: 'dub_ar', label: '🌍 Arabic Dub' },
        { id: 'subbed', label: '📝 Subbed' },
        { id: 'top_rated', label: '⭐ Top Rated' },
        { id: 'movies', label: '🎬 Anime Films' }
    ];

    const dubLanguages = [
        { code: null, label: '🎙️ Any Dub' },
        { code: 'ja', label: '🇯🇵 Japanese Original' },
        { code: 'en', label: '🇺🇸 English Dub' },
        { code: 'hi', label: '🇮🇳 Hindi Dub' },
        { code: 'ar', label: '🇸🇦 Arabic Dub' }
    ];

    const subLanguages = [
        { code: null, label: '📝 Any Sub' },
        { code: 'en', label: '🇺🇸 English Sub' },
        { code: 'es', label: '🇪🇸 Spanish Sub' },
        { code: 'fr', label: '🇫🇷 French Sub' },
        { code: 'ar', label: '🇸🇦 Arabic Sub' },
        { code: 'pt', label: '🇧🇷 Portuguese Sub' },
        { code: 'de', label: '🇩🇪 German Sub' }
    ];

    const yearBuckets = [
        { id: null, label: 'Any Year' },
        { id: 2024, label: '2024+' },
        { id: 2020, label: '2020+' },
        { id: 2015, label: '2015+' },
        { id: 2010, label: '2010+' },
        { id: 2000, label: '2000s' },
        { id: 1990, label: '1990s' },
        { id: 1980, label: '1980s' }
    ];

    const sortOptions = [
        { id: 'popularity', label: 'Most Popular' },
        { id: 'rating', label: 'Highest Rated' },
        { id: 'year', label: 'Newest First' }
    ];

    const fetchAnime = useCallback(async (tab, yearMin, sort, audioLang, subLang) => {
        setLoading(true);
        try {
            let url = `${getApiBase()}/titles/anime?page=1&page_size=30`;
            const extraParams = [];

            if (tab === 'dub_en') {
                extraParams.push(`audio_language=en`);
            } else if (tab === 'dub_hi') {
                extraParams.push(`audio_language=hi`);
            } else if (tab === 'dub_ar') {
                extraParams.push(`audio_language=ar`);
            } else if (tab === 'subbed') {
                extraParams.push(`subtitle_language=en`);
            } else if (tab === 'top_rated') {
                extraParams.push(`sort=rating`);
            } else if (tab === 'movies') {
                url = `${getApiBase()}/titles?type=movie&genre=animation&country=JP&page_size=30`;
            }
            if (yearMin) extraParams.push(`year_min=${yearMin}`);
            if (audioLang && tab !== 'dub_en' && tab !== 'dub_hi' && tab !== 'dub_ar') {
                extraParams.push(`audio_language=${encodeURIComponent(audioLang)}`);
            }
            if (subLang && tab !== 'subbed') {
                extraParams.push(`subtitle_language=${encodeURIComponent(subLang)}`);
            }
            if (sort && tab !== 'top_rated') extraParams.push(`sort=${sort}`);

            if (extraParams.length > 0) {
                url += (url.includes('?') ? '&' : '?') + extraParams.join('&');
            }

            let res = await fetch(url);
            if (!res.ok) {
                res = await fetch(`${getApiBase()}/titles?type=anime&page=0&page_size=30`);
            }
            if (res.ok) {
                const data = await res.json();
                setAnimeList(data.items || (Array.isArray(data) ? data : []));
                setTotal(data.total || (data.items || []).length);
            }
        } catch (err) {
            console.error('[AnimeScreen] fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAnime(activeTab, selectedYearMin, selectedSort, selectedAudioLang, selectedSubLang);
    }, [activeTab, selectedYearMin, selectedSort, selectedAudioLang, selectedSubLang, fetchAnime]);

    return (
        <SafeAreaView style={styles.screen}>
            <AppHeader navigation={navigation} activeRoute="Anime" title="Anime Ecosystem" />

            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.hubHero}>
                    <View style={styles.heroBadge}>
                        <Text style={styles.heroBadgeText}>JAPANESE ANIMATION</Text>
                    </View>
                    <Text style={styles.hubTitle}>⚡ Dedicated Anime Ecosystem</Text>
                    <Text style={styles.hubSub}>
                        Stream authentic seasonal anime with English, Hindi, and Arabic audio dubs and localized subtitles.
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

                {/* Filter Bar: Dubs + Subs + Year + Sort */}
                <View style={styles.filterBar}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsRow}>
                        {dubLanguages.map(l => {
                            const isSel = selectedAudioLang === l.code;
                            return (
                                <TouchableOpacity
                                    key={l.label}
                                    style={[styles.filterChip, isSel && styles.filterChipDub]}
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
                        {subLanguages.map(l => {
                            const isSel = selectedSubLang === l.code;
                            return (
                                <TouchableOpacity
                                    key={l.label}
                                    style={[styles.filterChip, isSel && styles.filterChipSub]}
                                    onPress={() => setSelectedSubLang(l.code)}
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
                    <SkeletonGrid count={8} numCols={numCols} />
                ) : (
                    <View style={styles.grid}>
                        {animeList.map((a, idx) => (
                            <View
                                key={`${a.id || idx}-${idx}`}
                                style={{ width: `${100 / numCols - 1.5}%`, marginBottom: 18 }}
                            >
                                <MediaCard
                                    item={a}
                                    onPress={(it) => navigation.navigate('TitleDetail', { slug: it.slug || String(it.id), item: it })}
                                    isLarge={isDesktop}
                                />
                            </View>
                        ))}
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>

            <MobileTabBar navigation={navigation} activeRoute="Anime" />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: COLORS.bg },
    hubHero: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14 },
    heroBadge: {
        backgroundColor: COLORS.badgeAnime,
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
        marginBottom: 8
    },
    heroBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
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
    tabChipActive: { backgroundColor: COLORS.badgeAnime, borderColor: COLORS.badgeAnime },
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
    filterChipDub: {
        borderColor: '#22d3ee',
        backgroundColor: 'rgba(34, 211, 238, 0.18)'
    },
    filterChipSub: {
        borderColor: '#a78bfa',
        backgroundColor: 'rgba(167, 139, 250, 0.18)'
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
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 16
    }
});



