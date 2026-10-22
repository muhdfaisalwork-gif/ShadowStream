import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    SafeAreaView, ActivityIndicator, useWindowDimensions
} from 'react-native';
import { COLORS } from '../theme/colors';
import AppHeader from '../components/AppHeader';
import MobileTabBar from '../components/MobileTabBar';
import Poster from '../components/Poster';
import { getApiBase } from '../utils/api';
import { useRouteMeta } from '../utils/useRouteMeta';
import { useResponsive } from '../theme/scaling';

export default function CollectionsScreen({ route, navigation }) {
    const responsive = useResponsive();
    const isDesktop = responsive.isDesktop;
    const numCols = responsive.isDesktop ? (responsive.isLargeDesktop ? 4 : 3) : (responsive.isTablet || responsive.isMobileLandscape ? 2 : 1);

    useRouteMeta('Collections');

    const [activeTab, setActiveTab] = useState(route?.params?.tab || 'all');
    const [collections, setCollections] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (route?.params?.tab) {
            setActiveTab(route.params.tab);
        }
    }, [route?.params?.tab]);

    const tabs = [
        { id: 'all', label: '📦 All Collections' },
        { id: 'studios', label: '🏢 Studios & Networks' },
        { id: 'spiritual', label: '✨ Spiritual & Prophets' },
        { id: 'franchises', label: '🎬 Major Franchises' },
        { id: 'animation', label: '✨ Studio & Animation' },
        { id: 'regional', label: '🌍 Regional Cinema' },
        { id: 'thematic', label: '🔥 Thematic Universes' }
    ];

    useEffect(() => {
        let cancelled = false;
        fetch(`${getApiBase()}/collections?with_counts=1`)
            .then(r => r.json())
            .then(d => {
                if (!cancelled) {
                    const items = Array.isArray(d) ? d : (d.items || d.collections || []);
                    setCollections(items);
                    setLoading(false);
                }
            })
            .catch(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, []);

    const filteredCollections = collections.filter(c => {
        if (!c || (c.title_count === 0 && c.count === 0)) return false;
        if (activeTab === 'all') return true;
        const kind = (c.kind || c.type || '').toLowerCase();
        const slug = (c.slug || '').toLowerCase();
        if (activeTab === 'studios') {
            return kind === 'studio' || slug.includes('netflix') || slug.includes('disney') || slug.includes('max') || slug.includes('prime-video') || slug.includes('hulu') || slug.includes('apple-tv') || slug.includes('crunchyroll') || slug.includes('paramount') || slug.includes('peacock') || slug.includes('universal') || slug.includes('sony') || slug.includes('pixar') || slug.includes('warner') || slug.includes('marvel') || slug.includes('dc');
        }
        if (activeTab === 'spiritual') {
            return slug.includes('prophet') || slug.includes('islamic') || slug.includes('christian') || slug.includes('spiritual');
        }
        if (activeTab === 'franchises') return kind === 'franchise' || slug.includes('paramount') || slug.includes('universal') || slug.includes('sony');
        if (activeTab === 'animation') return kind === 'studio' || slug.includes('ghibli') || slug.includes('pixar') || slug.includes('anime') || slug.includes('disney') || slug.includes('crunchyroll');
        if (activeTab === 'regional') return kind === 'regional' || kind === 'region' || slug.includes('drama') || slug.includes('cinema') || slug.includes('bollywood') || slug.includes('dizi') || slug.includes('indian') || slug.includes('african') || slug.includes('asian');
        if (activeTab === 'thematic') return kind === 'thematic' || kind === 'curated' || kind === 'genre' || kind === 'editorial';
        return true;
    });

    return (
        <SafeAreaView style={styles.screen}>
            <AppHeader navigation={navigation} activeRoute="Collections" title="Collections" />

            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.hubHero}>
                    <Text style={styles.hubTitle}>📦 Collections & Franchises</Text>
                    <Text style={styles.hubSub}>
                        Hand-curated cinematic universes, spiritual & prophetic epics, iconic film franchises, auteur retrospectives, and regional television sagas.
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

                {/* Grid */}
                {loading ? (
                    <ActivityIndicator size="large" color={COLORS.brand} style={{ marginTop: 40 }} />
                ) : (
                    <View style={styles.grid}>
                        {filteredCollections.map(c => (
                            <TouchableOpacity
                                key={c.id}
                                style={[styles.collectionCard, { width: `${100 / numCols - 2}%` }]}
                                onPress={() => navigation.navigate('CollectionDetail', { slug: c.slug, collection: c })}
                                activeOpacity={0.82}
                            >
                                <View style={styles.cardCover}>
                                    <Poster
                                        url={c.cover_image || c.poster}
                                        title={c.name}
                                        style={StyleSheet.absoluteFill}
                                    />
                                    <View style={styles.cardCoverOverlay} />
                                    <View style={styles.countBadge}>
                                        <Text style={styles.countBadgeText}>
                                            {c.title_count || c.count || 0} TITLES
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.cardBody}>
                                    <Text style={styles.collectionTitle}>{c.name}</Text>
                                    <Text style={styles.collectionDesc} numberOfLines={2}>
                                        {c.description || 'Curated cinematic universe and saga.'}
                                    </Text>
                                    <View style={styles.exploreLink}>
                                        <Text style={styles.exploreLinkText}>Explore Collection</Text>
                                        <Text style={styles.exploreLinkArrow}>→</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))}
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
    collectionCard: {
        backgroundColor: COLORS.surfaceCard,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 20
    },
    cardCover: {
        height: 140,
        position: 'relative'
    },
    cardCoverOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(10, 10, 10, 0.45)'
    },
    countBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: 'rgba(10, 10, 10, 0.85)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)'
    },
    countBadgeText: {
        color: COLORS.brandSecondary,
        fontSize: 10,
        fontWeight: '800'
    },
    cardBody: {
        padding: 14
    },
    collectionTitle: {
        color: COLORS.textPrimary,
        fontSize: 16,
        fontWeight: '800',
        marginBottom: 4
    },
    collectionDesc: {
        color: COLORS.textMuted,
        fontSize: 12,
        lineHeight: 18,
        marginBottom: 10
    },
    exploreLink: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    exploreLinkText: {
        color: COLORS.brand,
        fontSize: 12,
        fontWeight: '700'
    },
    exploreLinkArrow: {
        color: COLORS.brand,
        fontSize: 14,
        marginLeft: 4
    }
});
