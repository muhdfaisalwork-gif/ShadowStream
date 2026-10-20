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

export default function LanguagesScreen({ navigation }) {
    const { width } = useWindowDimensions();
    const isDesktop = width >= 1024;
    const numCols = width >= 1400 ? 6 : width >= 1024 ? 5 : width >= 768 ? 4 : width >= 480 ? 3 : 2;

    useRouteMeta('Languages');
    const [languages, setLanguages] = useState([]);
    const [selectedLang, setSelectedLang] = useState('hi'); // Default to Hindi or English
    const [filterType, setFilterType] = useState('any'); // any, audio, sub
    const [titles, setTitles] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loadingLangs, setLoadingLangs] = useState(true);
    const [loadingTitles, setLoadingTitles] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    useEffect(() => {
        let cancelled = false;
        fetch(`${getApiBase()}/languages-catalog?with_counts=1`)
            .then(r => r.ok ? r.json() : fetch(`${getApiBase()}/languages`).then(r2 => r2.json()))
            .then(d => {
                if (!cancelled) {
                    const items = Array.isArray(d) ? d : (d.items || d.languages || []);
                    setLanguages(items);
                    if (items.length > 0 && !selectedLang) {
                        setSelectedLang(items[0].code);
                    }
                    setLoadingLangs(false);
                }
            })
            .catch(() => {
                if (!cancelled) setLoadingLangs(false);
            });
        return () => { cancelled = true; };
    }, []);

    const fetchTitles = useCallback(async (langCode, filter, pageNum = 1, append = false) => {
        if (!langCode) return;
        if (append) setLoadingMore(true);
        else setLoadingTitles(true);
        try {
            let url = `${getApiBase()}/titles?page=${pageNum}&page_size=24`;
            if (filter === 'audio') {
                // /api/v1/titles expects `audio_language` (matches the search endpoint)
                url += `&audio_language=${encodeURIComponent(langCode)}`;
            } else if (filter === 'sub') {
                url += `&subtitle_language=${encodeURIComponent(langCode)}`;
            } else {
                url += `&language=${encodeURIComponent(langCode)}`;
            }

            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                const nextItems = data.items || [];
                setTitles(prev => append ? [...prev, ...nextItems] : nextItems);
                setTotal(data.total || nextItems.length);
            }
        } catch (err) {
            console.error('[LanguagesScreen] fetchTitles error:', err);
        } finally {
            setLoadingTitles(false);
            setLoadingMore(false);
        }
    }, []);

    useEffect(() => {
        setPage(1);
        fetchTitles(selectedLang, filterType, 1, false);
    }, [selectedLang, filterType, fetchTitles]);

    const handleLoadMore = () => {
        if (loadingMore || titles.length >= total) return;
        const nextPage = page + 1;
        setPage(nextPage);
        fetchTitles(selectedLang, filterType, nextPage, true);
    };

    const activeLangObj = languages.find(l => l.code === selectedLang);

    return (
        <SafeAreaView style={styles.screen}>
            <AppHeader navigation={navigation} activeRoute="Languages" title="Languages Hub" />

            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.hubHero}>
                    <Text style={styles.hubTitle}>🗣️ Multi-Lingual & Dubbing Hub</Text>
                    <Text style={styles.hubSub}>
                        Browse titles across 26 global languages with verified audio dubbing and localized subtitles.
                    </Text>
                </View>

                {/* Filter Mode: Audio Dub vs Subtitles vs Original */}
                <View style={styles.filterModeRow}>
                    {[
                        { id: 'any', label: 'All Regional Releases' },
                        { id: 'audio', label: '🎙️ Audio Dub Available' },
                        { id: 'sub', label: '📝 Subtitles Available' }
                    ].map(f => (
                        <TouchableOpacity
                            key={f.id}
                            style={[styles.filterModeBtn, filterType === f.id && styles.filterModeBtnActive]}
                            onPress={() => setFilterType(f.id)}
                        >
                            <Text style={[styles.filterModeBtnText, filterType === f.id && styles.filterModeBtnTextActive]}>
                                {f.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Languages Carousel / Grid */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.langPillsRow}>
                    {languages.map(l => {
                        const isSel = selectedLang === l.code;
                        return (
                            <TouchableOpacity
                                key={l.code}
                                style={[styles.langPill, isSel && styles.langPillActive]}
                                onPress={() => setSelectedLang(l.code)}
                            >
                                <Text style={styles.langPillFlag}>{l.flag || '🌐'}</Text>
                                <Text style={[styles.langPillName, isSel && styles.langPillNameActive]}>
                                    {l.name}
                                </Text>
                                <View style={[styles.langCountBadge, isSel && styles.langCountBadgeActive]}>
                                    <Text style={[styles.langCountText, isSel && styles.langCountTextActive]}>
                                        {l.count || 0}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {/* Results Section Header */}
                <View style={styles.resultsHeader}>
                    <Text style={styles.resultsTitle}>
                        {activeLangObj ? `${activeLangObj.flag || ''} ${activeLangObj.name} Titles` : 'Titles'}
                    </Text>
                    <Text style={styles.resultsCount}>{total.toLocaleString()} titles available</Text>
                </View>

                {/* Grid */}
                {loadingTitles ? (
                    <SkeletonGrid count={8} numCols={numCols} />
                ) : (
                    <View style={styles.grid}>
                        {titles.map((t, idx) => (
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

                {!loadingTitles && titles.length < total && (
                    <TouchableOpacity
                        style={styles.loadMoreBtn}
                        onPress={handleLoadMore}
                        disabled={loadingMore}
                    >
                        {loadingMore ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <Text style={styles.loadMoreText}>
                                Load More Titles ({titles.length} of {total.toLocaleString()})
                            </Text>
                        )}
                    </TouchableOpacity>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>

            <MobileTabBar navigation={navigation} activeRoute="Languages" />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: COLORS.bg },
    hubHero: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14 },
    hubTitle: { color: COLORS.textPrimary, fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
    hubSub: { color: COLORS.textMuted, fontSize: 13, marginTop: 4 },
    filterModeRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingBottom: 12,
        gap: 8
    },
    filterModeBtn: {
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 6,
        backgroundColor: COLORS.surfaceAlt,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    filterModeBtnActive: {
        borderColor: COLORS.brand,
        backgroundColor: 'rgba(229, 9, 20, 0.15)'
    },
    filterModeBtnText: {
        color: COLORS.textSecondary,
        fontSize: 12,
        fontWeight: '600'
    },
    filterModeBtnTextActive: {
        color: COLORS.brandSecondary,
        fontWeight: '700'
    },
    langPillsRow: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        gap: 8
    },
    langPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 20,
        backgroundColor: COLORS.surfaceAlt,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    langPillActive: {
        backgroundColor: COLORS.brand,
        borderColor: COLORS.brand
    },
    langPillFlag: {
        fontSize: 16,
        marginRight: 8
    },
    langPillName: {
        color: COLORS.textSecondary,
        fontSize: 12,
        fontWeight: '700'
    },
    langPillNameActive: {
        color: '#FFFFFF'
    },
    langCountBadge: {
        marginLeft: 8,
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10
    },
    langCountBadgeActive: {
        backgroundColor: 'rgba(0,0,0,0.3)'
    },
    langCountText: {
        color: COLORS.textMuted,
        fontSize: 10,
        fontWeight: '700'
    },
    langCountTextActive: {
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
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 12
    },
    loadMoreBtn: {
        marginHorizontal: 20,
        marginTop: 16,
        paddingVertical: 14,
        borderRadius: 10,
        backgroundColor: COLORS.surfaceAlt,
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: 'center'
    },
    loadMoreText: {
        color: COLORS.textPrimary,
        fontSize: 13,
        fontWeight: '700'
    }
});



