import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    SafeAreaView, useWindowDimensions
} from 'react-native';
import { COLORS } from '../theme/colors';
import AppHeader from '../components/AppHeader';
import MobileTabBar from '../components/MobileTabBar';
import MediaCard from '../components/MediaCard';
import { WatchlistAPI } from '../utils/storage';
import { useRouteMeta } from '../utils/useRouteMeta';
import { useResponsive } from '../theme/scaling';

export default function WatchlistScreen({ navigation }) {
    const responsive = useResponsive();
    const isDesktop = responsive.isDesktop;
    const numCols = responsive.gridColumns;

    useRouteMeta('Watchlist');
    const [items, setItems] = useState([]);
    const [activeTab, setActiveTab] = useState('all');
    const [loading, setLoading] = useState(true);

    const loadWatchlist = useCallback(async () => {
        setLoading(true);
        const list = await WatchlistAPI.list();
        setItems(list);
        setLoading(false);
    }, []);

    useEffect(() => {
        loadWatchlist();
        const unsub = navigation.addListener('focus', loadWatchlist);
        return unsub;
    }, [navigation, loadWatchlist]);

    const handleRemove = async (titleId) => {
        setItems(prev => prev.filter(i => String(i.id) !== String(titleId)));
        await WatchlistAPI.remove(titleId);
    };

    const tabs = [
        { id: 'all', label: 'All Saved' },
        { id: 'movie', label: 'Movies' },
        { id: 'tv', label: 'TV Series' },
        { id: 'anime', label: 'Anime' }
    ];

    const filteredItems = items.filter(it => {
        if (activeTab === 'all') return true;
        return (it.type || 'movie') === activeTab;
    });

    return (
        <SafeAreaView style={styles.screen}>
            <AppHeader navigation={navigation} activeRoute="Watchlist" title="Watchlist" />

            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.hubHero}>
                    <Text style={styles.hubTitle}>🔖 My Watchlist</Text>
                    <Text style={styles.hubSub}>
                        {items.length} titles saved to your synchronized library.
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
                {filteredItems.length > 0 ? (
                    <View style={styles.grid}>
                        {filteredItems.map((it, idx) => (
                            <View
                                key={`${it.id || idx}-${idx}`}
                                style={{ width: `${100 / numCols - 1.5}%`, marginBottom: 18, position: 'relative' }}
                            >
                                <MediaCard
                                    item={it}
                                    onPress={(item) => navigation.navigate('TitleDetail', { slug: item.slug || String(item.id), item })}
                                    width="100%"
                                    isLarge={isDesktop}
                                />
                                <TouchableOpacity
                                    style={styles.removeBtn}
                                    onPress={() => handleRemove(it.id)}
                                    accessibilityLabel="Remove from Watchlist"
                                >
                                    <Text style={styles.removeBtnText}>✕</Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                ) : (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyIcon}>🔖</Text>
                        <Text style={styles.emptyTitle}>Your Watchlist is Empty</Text>
                        <Text style={styles.emptySub}>
                            Save movies and shows you want to watch later by clicking the + Watchlist button on any title.
                        </Text>
                        <TouchableOpacity
                            style={styles.exploreBtn}
                            onPress={() => navigation.navigate('Home')}
                        >
                            <Text style={styles.exploreBtnText}>Discover Movies & Shows</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>

            <MobileTabBar navigation={navigation} activeRoute="Watchlist" />
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
        justifyContent: 'flex-start',
        gap: 12,
        paddingHorizontal: 16,
        paddingTop: 16
    },
    removeBtn: {
        position: 'absolute',
        top: 6,
        right: 6,
        backgroundColor: 'rgba(0,0,0,0.85)',
        width: 26,
        height: 26,
        borderRadius: 13,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        zIndex: 10
    },
    removeBtnText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700'
    },
    emptyState: {
        padding: 50,
        alignItems: 'center',
        marginTop: 40
    },
    emptyIcon: { fontSize: 44, marginBottom: 16, opacity: 0.8 },
    emptyTitle: { color: COLORS.textPrimary, fontSize: 20, fontWeight: '800', marginBottom: 8 },
    emptySub: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center', maxWidth: 360, lineHeight: 20, marginBottom: 24 },
    exploreBtn: {
        backgroundColor: COLORS.brand,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8
    },
    exploreBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700'
    }
});



