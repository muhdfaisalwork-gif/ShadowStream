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

const COUNTRY_MAP = {
    US: { name: 'United States', flag: '🇺🇸' },
    GB: { name: 'United Kingdom', flag: '🇬🇧' },
    KR: { name: 'South Korea', flag: '🇰🇷' },
    JP: { name: 'Japan', flag: '🇯🇵' },
    CN: { name: 'China', flag: '🇨🇳' },
    IN: { name: 'India', flag: '🇮🇳' },
    PK: { name: 'Pakistan', flag: '🇵🇰' },
    BD: { name: 'Bangladesh', flag: '🇧🇩' },
    ID: { name: 'Indonesia', flag: '🇮🇩' },
    TH: { name: 'Thailand', flag: '🇹🇭' },
    MY: { name: 'Malaysia', flag: '🇲🇾' },
    PH: { name: 'Philippines', flag: '🇵🇭' },
    TR: { name: 'Turkey', flag: '🇹🇷' },
    NG: { name: 'Nigeria', flag: '🇳🇬' },
    EG: { name: 'Egypt', flag: '🇪🇬' },
    MA: { name: 'Morocco', flag: '🇲🇦' },
    SA: { name: 'Saudi Arabia', flag: '🇸🇦' },
    LB: { name: 'Lebanon', flag: '🇱🇧' },
    IQ: { name: 'Iraq', flag: '🇮🇶' },
    SY: { name: 'Syria', flag: '🇸🇾' },
    CI: { name: 'Ivory Coast', flag: '🇨🇮' },
    KE: { name: 'Kenya', flag: '🇰🇪' },
    ZA: { name: 'South Africa', flag: '🇿🇦' },
    FR: { name: 'France', flag: '🇫🇷' },
    DE: { name: 'Germany', flag: '🇩🇪' },
    IT: { name: 'Italy', flag: '🇮🇹' },
    ES: { name: 'Spain', flag: '🇪🇸' },
    MX: { name: 'Mexico', flag: '🇲🇽' },
    RU: { name: 'Russia', flag: '🇷🇺' },
    CA: { name: 'Canada', flag: '🇨🇦' },
    AU: { name: 'Australia', flag: '🇦🇺' },
    BR: { name: 'Brazil', flag: '🇧🇷' },
    AE: { name: 'United Arab Emirates', flag: '🇦🇪' },
    SE: { name: 'Sweden', flag: '🇸🇪' },
    NO: { name: 'Norway', flag: '🇳🇴' },
    DK: { name: 'Denmark', flag: '🇩🇰' },
    NL: { name: 'Netherlands', flag: '🇳🇱' },
    PL: { name: 'Poland', flag: '🇵🇱' },
    CO: { name: 'Colombia', flag: '🇨🇴' },
    AR: { name: 'Argentina', flag: '🇦🇷' },
    IR: { name: 'Iran', flag: '🇮🇷' },
    TW: { name: 'Taiwan', flag: '🇹🇼' },
    HK: { name: 'Hong Kong', flag: '🇭🇰' },
    GH: { name: 'Ghana', flag: '🇬🇭' }
};

export default function CountryDetailScreen({ route, navigation }) {
    const rawCountry = route?.params?.country;
    const rawSlug = route?.params?.slug || route?.params?.code || (typeof rawCountry === 'string' ? rawCountry : rawCountry?.code);
    const countryCode = String(rawSlug || 'PK').toUpperCase();

    const [countryInfo, setCountryInfo] = useState(() => {
        if (rawCountry && typeof rawCountry === 'object' && rawCountry.name) {
            return rawCountry;
        }
        const mapped = COUNTRY_MAP[countryCode] || {};
        return {
            code: countryCode,
            name: mapped.name || countryCode,
            flag: mapped.flag || '🏳️'
        };
    });

    const { width } = useWindowDimensions();
    const isDesktop = width >= 1024;
    const numCols = width >= 1400 ? 6 : width >= 1024 ? 5 : width >= 768 ? 4 : width >= 480 ? 3 : 2;

    useRouteMeta('CountryDetail', { name: countryInfo?.name, code: countryCode });
    const [activeTab, setActiveTab] = useState('all');
    const [titles, setTitles] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    useEffect(() => {
        if (rawCountry && typeof rawCountry === 'object' && rawCountry.name) {
            setCountryInfo(rawCountry);
        } else {
            const mapped = COUNTRY_MAP[countryCode] || {};
            setCountryInfo({
                code: countryCode,
                name: mapped.name || countryCode,
                flag: mapped.flag || '🏳️'
            });
        }
        setActiveTab('all');
    }, [countryCode]);

    const tabs = [
        { id: 'all', label: '📂 All Titles' },
        { id: 'movie', label: '🎬 Movies' },
        { id: 'tv', label: '📺 TV Series' },
        { id: 'popular', label: '🌟 Most Popular' },
        { id: 'latest', label: '⚡ Latest Releases' }
    ];

    const fetchTitles = useCallback(async (tab, pageNum, append = false) => {
        if (pageNum === 1) setLoading(true);
        else setLoadingMore(true);

        try {
            let url = `${getApiBase()}/titles?country=${encodeURIComponent(countryCode)}&page=${pageNum}&page_size=24`;

            if (tab === 'movie' || tab === 'tv') {
                url += `&type=${tab}`;
            } else if (tab === 'popular') {
                url += `&sort=popularity`;
            } else if (tab === 'latest') {
                url += `&sort=newest`;
            }

            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                const newItems = Array.isArray(data) ? data : (data.items || []);
                setTotal(data.total || newItems.length);
                if (data.name && (!countryInfo.name || countryInfo.name === countryCode)) {
                    setCountryInfo(prev => ({ ...prev, name: data.name }));
                }
                if (append) {
                    setTitles(prev => [...prev, ...newItems]);
                } else {
                    setTitles(newItems);
                }
            }
        } catch (err) {
            console.error('[CountryDetailScreen] fetch error:', err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [countryCode, countryInfo.name]);

    useEffect(() => {
        setPage(1);
        fetchTitles(activeTab, 1, false);
    }, [activeTab, fetchTitles]);

    const handleLoadMore = () => {
        if (loadingMore || titles.length >= total) return;
        const nextPage = page + 1;
        setPage(nextPage);
        fetchTitles(activeTab, nextPage, true);
    };

    return (
        <SafeAreaView style={styles.screen}>
            <AppHeader navigation={navigation} activeRoute="Countries" title={countryInfo.name} />

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Country Header */}
                <View style={styles.headerBox}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => {
                        if (navigation.canGoBack()) navigation.goBack();
                        else navigation.navigate('Countries');
                    }}>
                        <Text style={styles.backBtnText}>‹ All Countries</Text>
                    </TouchableOpacity>
                    <View style={styles.headerInfoRow}>
                        <Text style={styles.headerFlag}>{countryInfo.flag || '🏳️'}</Text>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.headerTitle}>{countryInfo.name}</Text>
                            <Text style={styles.headerSub}>
                                {total.toLocaleString()} titles cataloged from {countryInfo.name}
                            </Text>
                        </View>
                    </View>
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

                {/* Grid */}
                {loading ? (
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

                {/* Load More Button */}
                {titles.length < total && !loading && (
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

            <MobileTabBar navigation={navigation} activeRoute="Countries" />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: COLORS.bg },
    headerBox: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border
    },
    backBtn: { marginBottom: 10 },
    backBtnText: { color: COLORS.brand, fontSize: 13, fontWeight: '700' },
    headerInfoRow: { flexDirection: 'row', alignItems: 'center' },
    headerFlag: { fontSize: 44, marginRight: 16 },
    headerTitle: { color: COLORS.textPrimary, fontSize: 24, fontWeight: '900' },
    headerSub: { color: COLORS.textMuted, fontSize: 12, marginTop: 4 },
    tabsRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
    tabChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: COLORS.surfaceAlt,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    tabChipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
    tabChipText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
    tabChipTextActive: { color: '#FFFFFF', fontWeight: '700' },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
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



