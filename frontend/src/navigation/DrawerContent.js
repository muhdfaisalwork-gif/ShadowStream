import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Image } from 'react-native';
import { COLORS } from '../theme/colors';
import { getApiBase } from '../utils/api';

export default function DrawerContent({ navigation }) {
    // Keys here MUST match the `type` query param used by fetchTypeCount below,
    // because that writes `setStats(prev => ({...prev, [type]: total}))`. This
    // was `movies`, so the key written was `movie` while the badge read
    // `stats.movies` — the Movies Hub count never populated and the badge sat
    // on its '…' fallback forever, while TV and Anime worked fine.
    const [stats, setStats] = useState({
        indexed: 104261, movie: 0, tv: 0, anime: 0, collections: 85
    });

    useEffect(() => {
        let cancelled = false;
        const base = getApiBase();
        // /stats gives the global totals
        fetch(`${base}/stats`)
            .then(r => r.json())
            .then(d => {
                if (!cancelled && d) {
                    setStats(prev => ({
                        ...prev,
                        indexed: d.indexed || prev.indexed,
                        collections: d.collections || prev.collections,
                    }));
                }
            })
            .catch(() => {});
        // Fetch a single page per type to read the real total — the API
        // returns total/title_count in the body so we don't need to paginate.
        const fetchTypeCount = (type) => {
            fetch(`${base}/titles?type=${type}&page=1&page_size=1`)
                .then(r => r.json())
                .then(d => {
                    if (!cancelled && d) {
                        const total = d.total ?? d.count ?? (d.items ? d.items.length : 0);
                        setStats(prev => ({ ...prev, [type]: total }));
                    }
                })
                .catch(() => {});
        };
        fetchTypeCount('movie');
        fetchTypeCount('tv');
        fetchTypeCount('anime');
        return () => { cancelled = true; };
    }, []);

    const onNav = (screenName, params = {}) => {
        try {
            navigation.closeDrawer();
        } catch (_) {}
        navigation.navigate(screenName, params);
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.logoRow}>
                    <Image
                        source={require('../../assets/shadowstream-banner.png')}
                        style={styles.drawerBrandBanner}
                        resizeMode="contain"
                    />
                </View>
                <View style={styles.statusPill}>
                    <Text style={styles.statusDot}>●</Text>
                    <Text style={styles.statusText}>{stats.indexed.toLocaleString()} Titles</Text>
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* DISCOVER */}
                <Text style={styles.sectionHeader}>DISCOVER</Text>
                <TouchableOpacity style={styles.navRow} onPress={() => onNav('Home')}>
                    <Text style={styles.navIcon}>🏠</Text>
                    <Text style={styles.navLabel}>Home</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navRow} onPress={() => onNav('Search')}>
                    <Text style={styles.navIcon}>🔍</Text>
                    <Text style={styles.navLabel}>Global Search</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navRow} onPress={() => onNav('Blogs')}>
                    <Text style={styles.navIcon}>📰</Text>
                    <Text style={styles.navLabel}>Editorial Blogs & Guides</Text>
                    <View style={[styles.rowBadge, { backgroundColor: COLORS.brand }]}>
                        <Text style={styles.rowBadgeText}>NEW</Text>
                    </View>
                </TouchableOpacity>

                {/* ENTERTAINMENT CATALOGS */}
                <Text style={styles.sectionHeader}>CATALOG</Text>
                <TouchableOpacity style={styles.navRow} onPress={() => onNav('Movies', { filter: 'popular' })}>
                    <Text style={styles.navIcon}>🎬</Text>
                    <Text style={styles.navLabel}>Movies Hub</Text>
                    <View style={styles.rowBadge}><Text style={styles.rowBadgeText}>{stats.movie ? Math.round(stats.movie / 100) / 10 + 'K' : '…'}</Text></View>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navRow} onPress={() => onNav('TV', { filter: 'popular' })}>
                    <Text style={styles.navIcon}>📺</Text>
                    <Text style={styles.navLabel}>TV Series</Text>
                    <View style={styles.rowBadge}><Text style={styles.rowBadgeText}>{stats.tv ? Math.round(stats.tv / 100) / 10 + 'K' : '…'}</Text></View>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navRow} onPress={() => onNav('TV', { filter: 'episodes' })}>
                    <Text style={styles.navIcon}>🗂️</Text>
                    <Text style={styles.navLabel}>Seasons & Episodes</Text>
                    <View style={styles.rowBadge}><Text style={styles.rowBadgeText}>S1…Sn</Text></View>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navRow} onPress={() => onNav('TV', { filter: 'drama' })}>
                    <Text style={styles.navIcon}>🎭</Text>
                    <Text style={styles.navLabel}>Dramas</Text>
                    <View style={styles.rowBadge}><Text style={styles.rowBadgeText}>ALL</Text></View>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navRow} onPress={() => onNav('Anime')}>
                    <Text style={styles.navIcon}>⚡</Text>
                    <Text style={styles.navLabel}>Anime Ecosystem</Text>
                    <View style={[styles.rowBadge, { backgroundColor: COLORS.badgeAnime }]}>
                        <Text style={styles.rowBadgeText}>{stats.anime ? stats.anime.toLocaleString() : 'DUB/SUB'}</Text>
                    </View>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navRow} onPress={() => onNav('ShortDramas')}>
                    <Text style={styles.navIcon}>📱</Text>
                    <Text style={styles.navLabel}>Short TV Dramas</Text>
                    <View style={[styles.rowBadge, { backgroundColor: COLORS.badgeShort }]}>
                        <Text style={styles.rowBadgeText}>HOT</Text>
                    </View>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navRow} onPress={() => onNav('Sports')}>
                    <Text style={styles.navIcon}>🏆</Text>
                    <Text style={styles.navLabel}>Live Sports & Channels</Text>
                    <View style={[styles.rowBadge, { backgroundColor: '#EF4444' }]}>
                        <Text style={styles.rowBadgeText}>LIVE</Text>
                    </View>
                </TouchableOpacity>

                {/* EXPLORE TAXONOMY */}
                <Text style={styles.sectionHeader}>EXPLORE</Text>
                <TouchableOpacity style={styles.navRow} onPress={() => onNav('Genres')}>
                    <Text style={styles.navIcon}>🏷️</Text>
                    <Text style={styles.navLabel}>Genres</Text>
                    <Text style={styles.rowMeta}>27 Categories</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navRow} onPress={() => onNav('Countries')}>
                    <Text style={styles.navIcon}>🌍</Text>
                    <Text style={styles.navLabel}>Countries & Regions</Text>
                    <Text style={styles.rowMeta}>42 Nations</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navRow} onPress={() => onNav('Languages')}>
                    <Text style={styles.navIcon}>🗣️</Text>
                    <Text style={styles.navLabel}>Languages & Dubs</Text>
                    <Text style={styles.rowMeta}>26 Languages</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navRow} onPress={() => onNav('Collections')}>
                    <Text style={styles.navIcon}>📦</Text>
                    <Text style={styles.navLabel}>Collections & Franchises</Text>
                    <Text style={styles.rowMeta}>{stats.collections} Curated</Text>
                </TouchableOpacity>

                {/* USER LIBRARY */}
                <Text style={styles.sectionHeader}>MY LIBRARY</Text>
                <TouchableOpacity style={styles.navRow} onPress={() => onNav('Watchlist')}>
                    <Text style={styles.navIcon}>🔖</Text>
                    <Text style={styles.navLabel}>Watchlist</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navRow} onPress={() => onNav('History')}>
                    <Text style={styles.navIcon}>🕒</Text>
                    <Text style={styles.navLabel}>Watch History</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navRow} onPress={() => onNav('Settings')}>
                    <Text style={styles.navIcon}>⚙️</Text>
                    <Text style={styles.navLabel}>Settings & System Info</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navRow} onPress={() => onNav('Apps')}>
                    <Text style={styles.navIcon}>📦</Text>
                    <Text style={styles.navLabel}>Apps & Downloads</Text>
                    <View style={[styles.rowBadge, { backgroundColor: COLORS.brand }]}>
                        <Text style={styles.rowBadgeText}>NEW</Text>
                    </View>
                </TouchableOpacity>

                {/* SOURCE MIRRORS INFO */}
                <View style={styles.sourcesBox}>
                    <Text style={styles.sourcesTitle}>SOURCE MIRRORS</Text>
                    <Text style={styles.sourcesBody}>
                        Personal multi-mirror aggregator. Player picks from any of the registered sources automatically — aggregator mirrors first, fallback to whatever streams. No legal/illegal gating; you choose what to watch.
                    </Text>
                    <View style={styles.auditRow}>
                        <Text style={styles.auditItem}>📡 {stats.indexed.toLocaleString()} Indexed</Text>
                        <Text style={styles.auditItem}>🪞 Multi-Mirror Player</Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.surface
    },
    header: {
        paddingHorizontal: 16,
        paddingVertical: 18,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    logoRow: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    drawerBrandBanner: {
        width: 140,
        height: 38
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.3)'
    },
    statusDot: {
        color: COLORS.success,
        fontSize: 7,
        marginRight: 4
    },
    statusText: {
        color: COLORS.success,
        fontSize: 10,
        fontWeight: '700'
    },
    scrollContent: {
        paddingHorizontal: 14,
        paddingVertical: 16
    },
    sectionHeader: {
        color: COLORS.textMuted,
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1.2,
        marginTop: 18,
        marginBottom: 8,
        paddingHorizontal: 6
    },
    navRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 10,
        borderRadius: 8,
        marginBottom: 2
    },
    navIcon: {
        fontSize: 16,
        marginRight: 12,
        width: 22,
        textAlign: 'center'
    },
    navLabel: {
        color: COLORS.textPrimary,
        fontSize: 14,
        fontWeight: '600',
        flex: 1
    },
    rowBadge: {
        backgroundColor: COLORS.brand,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4
    },
    rowBadgeText: {
        color: '#FFFFFF',
        fontSize: 9,
        fontWeight: '800'
    },
    rowMeta: {
        color: COLORS.textMuted,
        fontSize: 11
    },
    sourcesBox: {
        marginTop: 24,
        marginBottom: 20,
        backgroundColor: COLORS.surfaceCard,
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    sourcesTitle: {
        color: COLORS.textSecondary,
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.8,
        marginBottom: 6
    },
    sourcesBody: {
        color: COLORS.textMuted,
        fontSize: 11,
        lineHeight: 18
    },
    auditRow: {
        marginTop: 10,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    auditItem: {
        color: COLORS.textSecondary,
        fontSize: 10,
        fontWeight: '600'
    },
    adminLink: {
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        alignItems: 'center'
    },
    adminLinkText: {
        color: '#a5b4fc',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.4
    },
});
