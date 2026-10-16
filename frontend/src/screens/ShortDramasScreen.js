import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    SafeAreaView, useWindowDimensions
} from 'react-native';
import { COLORS } from '../theme/colors';
import AppHeader from '../components/AppHeader';
import MobileTabBar from '../components/MobileTabBar';
import MediaCard from '../components/MediaCard';
import SkeletonGrid from '../components/SkeletonGrid';
import { getApiBase } from '../utils/api';
import { useRouteMeta } from '../utils/useRouteMeta';

export default function ShortDramasScreen({ route, navigation }) {
    const { width } = useWindowDimensions();
    const isDesktop = width >= 1024;
    const numCols = width >= 1400 ? 6 : width >= 1024 ? 5 : width >= 768 ? 4 : width >= 480 ? 3 : 2;

    const [activeTab, setActiveTab] = useState(route?.params?.filter || 'all');
    const [dramas, setDramas] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (route?.params?.filter) {
            setActiveTab(route.params.filter);
        }
    }, [route?.params?.filter]);

    useRouteMeta('ShortDramas');
    const [selectedAudioLang, setSelectedAudioLang] = useState(null);

    const tabs = [
        { id: 'all', label: '🔥 All Short TV' },
        { id: 'billionaire', label: '💰 Billionaire & CEO' },
        { id: 'revenge', label: '🗡️ Reborn & Revenge' },
        { id: 'romance', label: '💕 Urban Romance' },
        { id: 'godofwar', label: '⚔️ Action & War' },
        { id: 'empress', label: '👑 Royal & Historical' }
    ];

    const audioLanguages = [
        { code: null, label: '🎙️ Any Audio' },
        { code: 'zh', label: '🇨🇳 Chinese' },
        { code: 'hi', label: '🇮🇳 Hindi' },
        { code: 'ko', label: '🇰🇷 Korean' },
        { code: 'en', label: '🇺🇸 English' },
        { code: 'ur', label: '🇵🇰 Urdu' }
    ];

    const fetchDramas = useCallback(async (tab, audioLang) => {
        setLoading(true);
        try {
            const tabCollectionMap = {
                billionaire: 'short-drama-billionaire',
                revenge: 'short-drama-revenge',
                romance: 'short-drama-romance',
                godofwar: 'short-drama-revenge',
                empress: 'short-drama-chinese',
            };
            const colSlug = tabCollectionMap[tab];
            let url = colSlug
                ? `${getApiBase()}/collection/${colSlug}?page=1&page_size=48`
                : `${getApiBase()}/titles/short-dramas?page=1&page_size=48`;
            if (audioLang) url += `&audio_language=${encodeURIComponent(audioLang)}`;
            let res = await fetch(url);
            if (!res.ok) {
                res = await fetch(`${getApiBase()}/titles?type=short_drama&page=0&page_size=48`);
            }
            if (res.ok) {
                const data = await res.json();
                let list = data.items || (Array.isArray(data) ? data : []);
                if (tab === 'godofwar' && list.length > 6) {
                    list = list.slice().reverse();
                }
                setDramas(list);
            }
        } catch (err) {
            console.error('[ShortDramasScreen] fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDramas(activeTab, selectedAudioLang);
    }, [activeTab, selectedAudioLang, fetchDramas]);

    return (
        <SafeAreaView style={styles.screen}>
            <AppHeader navigation={navigation} activeRoute="ShortDramas" title="Short Dramas" />

            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.hubHero}>
                    <View style={styles.heroBadge}>
                        <Text style={styles.heroBadgeText}>HOT SHORT TV • 1-2 MIN EPISODES</Text>
                    </View>
                    <Text style={styles.hubTitle}>📱 Hot Short TV Dramas</Text>
                    <Text style={styles.hubSub}>
                        Fast-paced vertical micro-dramas: Billionaire heirs, dramatic revenge, secret marriages, and modern empresses.
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

                {/* Audio language chip row */}
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
                                    <Text style={[styles.filterChipText, isSel && styles.filterChipTextActive]}>{l.label}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* Content Grid */}
                {loading ? (
                    <SkeletonGrid count={6} numCols={numCols} />
                ) : (
                    <View style={styles.grid}>
                        {dramas.map((d, idx) => (
                            <View
                                key={`${d.id || idx}-${idx}`}
                                style={{ width: `${100 / numCols - 1.5}%`, marginBottom: 18 }}
                            >
                                <MediaCard
                                    item={d}
                                    onPress={(it) => navigation.navigate('TitleDetail', { slug: it.slug || String(it.id), item: it })}
                                    isLarge={isDesktop}
                                />
                            </View>
                        ))}
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>

            <MobileTabBar navigation={navigation} activeRoute="ShortDramas" />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: COLORS.bg },
    hubHero: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14 },
    heroBadge: {
        backgroundColor: COLORS.badgeShort,
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
    tabChipActive: { backgroundColor: COLORS.badgeShort, borderColor: COLORS.badgeShort },
    tabChipText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
    tabChipTextActive: { color: '#FFFFFF', fontWeight: '700' },
    filterBar: {
        paddingHorizontal: 18,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border
    },
    filterChipsRow: { gap: 6 },
    filterChip: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 6,
        backgroundColor: COLORS.surfaceAlt,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    filterChipAudio: {
        borderColor: '#22d3ee',
        backgroundColor: 'rgba(34, 211, 238, 0.18)'
    },
    filterChipText: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600' },
    filterChipTextActive: { color: '#22d3ee', fontWeight: '700' },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 16
    }
});



