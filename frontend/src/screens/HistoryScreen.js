import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    SafeAreaView, Alert, useWindowDimensions
} from 'react-native';
import { COLORS } from '../theme/colors';
import AppHeader from '../components/AppHeader';
import MobileTabBar from '../components/MobileTabBar';
import Poster from '../components/Poster';
import { HistoryAPI } from '../utils/storage';
import { useRouteMeta } from '../utils/useRouteMeta';
import { useResponsive } from '../theme/scaling';

export default function HistoryScreen({ navigation }) {
    const responsive = useResponsive();
    const isDesktop = responsive.isDesktop;

    useRouteMeta('History');
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadHistory = useCallback(async () => {
        setLoading(true);
        const list = await HistoryAPI.list();
        setHistory(list);
        setLoading(false);
    }, []);

    useEffect(() => {
        loadHistory();
        const unsub = navigation.addListener('focus', loadHistory);
        return unsub;
    }, [navigation, loadHistory]);

    const handleClear = () => {
        Alert.alert(
            'Clear History',
            'Are you sure you want to clear your entire watch history?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear All',
                    style: 'destructive',
                    onPress: async () => {
                        setHistory([]);
                        await HistoryAPI.clear();
                    }
                }
            ]
        );
    };

    const handleRemove = async (titleId) => {
        setHistory(prev => prev.filter(h => String(h.id) !== String(titleId)));
        await HistoryAPI.remove(titleId);
    };

    const formatTimestamp = (ts) => {
        if (!ts) return '';
        const diff = Date.now() - Number(ts);
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        return `${days}d ago`;
    };

    return (
        <SafeAreaView style={styles.screen}>
            <AppHeader navigation={navigation} activeRoute="History" title="Watch History" />

            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.hubHeader}>
                    <View>
                        <Text style={styles.hubTitle}>🕒 Watch History</Text>
                        <Text style={styles.hubSub}>
                            {history.length} titles in your viewing record. Resume right where you left off.
                        </Text>
                    </View>
                    {history.length > 0 && (
                        <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
                            <Text style={styles.clearBtnText}>Clear All</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {history.length > 0 ? (
                    <View style={styles.listContainer}>
                        {history.map(item => {
                            const pct = Math.max(2, Math.min(100, item.pct || 0));
                            return (
                                <View key={item.id} style={styles.historyRow}>
                                    {/* Thumbnail */}
                                    <View style={styles.posterWrapper}>
                                        <Poster
                                            url={item.backdrop || item.poster}
                                            title={item.title}
                                            style={StyleSheet.absoluteFill}
                                        />
                                        <View style={styles.progressBg}>
                                            <View style={[styles.progressFill, { width: `${pct}%` }]} />
                                        </View>
                                    </View>

                                    {/* Info */}
                                    <View style={styles.rowInfo}>
                                        <View style={styles.titleRow}>
                                            <Text style={styles.titleText} numberOfLines={1}>{item.title}</Text>
                                            <TouchableOpacity
                                                style={styles.deleteBtn}
                                                onPress={() => handleRemove(item.id)}
                                            >
                                                <Text style={styles.deleteBtnText}>✕</Text>
                                            </TouchableOpacity>
                                        </View>

                                        <Text style={styles.metaText}>
                                            {item.type === 'tv' || item.type === 'anime' ? 'Series' : 'Movie'}
                                            {item.season ? ` • S${item.season}:E${item.episode}` : ''}
                                            {item.year ? ` • ${item.year}` : ''}
                                            {item.ts ? ` • ${formatTimestamp(item.ts)}` : ''}
                                        </Text>

                                        <View style={styles.statusRow}>
                                            <Text style={styles.pctText}>{pct}% watched</Text>
                                            <TouchableOpacity
                                                style={styles.resumeBtn}
                                                onPress={() => navigation.navigate('Player', {
                                                    slug: item.slug || String(item.id),
                                                    item,
                                                    season: item.season || undefined,
                                                    episode: item.episode || undefined,
                                                })}
                                                activeOpacity={0.8}
                                            >
                                                <Text style={styles.resumeIcon}>▶</Text>
                                                <Text style={styles.resumeBtnText}>Resume</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                ) : (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyIcon}>🕒</Text>
                        <Text style={styles.emptyTitle}>No Watch History</Text>
                        <Text style={styles.emptySub}>
                            Titles you start watching will automatically appear here with exact completion progress.
                        </Text>
                        <TouchableOpacity
                            style={styles.exploreBtn}
                            onPress={() => navigation.navigate('Home')}
                        >
                            <Text style={styles.exploreBtnText}>Start Watching</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>

            <MobileTabBar navigation={navigation} activeRoute="History" />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: COLORS.bg },
    hubHeader: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border
    },
    hubTitle: { color: COLORS.textPrimary, fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
    hubSub: { color: COLORS.textMuted, fontSize: 13, marginTop: 4 },
    clearBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        backgroundColor: 'rgba(229, 9, 20, 0.15)',
        borderWidth: 1,
        borderColor: COLORS.brand
    },
    clearBtnText: { color: COLORS.brandSecondary, fontSize: 12, fontWeight: '700' },
    listContainer: {
        paddingHorizontal: 16,
        paddingTop: 16
    },
    historyRow: {
        flexDirection: 'row',
        backgroundColor: COLORS.surfaceCard,
        borderRadius: 10,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    posterWrapper: {
        width: 120,
        height: 72,
        borderRadius: 6,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: COLORS.surfaceAlt
    },
    progressBg: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.2)'
    },
    progressFill: {
        height: '100%',
        backgroundColor: COLORS.brand
    },
    rowInfo: {
        flex: 1,
        marginLeft: 14,
        justifyContent: 'space-between'
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
    },
    titleText: {
        color: COLORS.textPrimary,
        fontSize: 15,
        fontWeight: '700',
        flex: 1,
        marginRight: 8
    },
    deleteBtn: {
        padding: 4
    },
    deleteBtnText: {
        color: COLORS.textMuted,
        fontSize: 13
    },
    metaText: {
        color: COLORS.textMuted,
        fontSize: 12
    },
    statusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 6
    },
    pctText: {
        color: COLORS.brandSecondary,
        fontSize: 11,
        fontWeight: '700'
    },
    resumeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surfaceAlt,
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    resumeIcon: {
        color: COLORS.brand,
        fontSize: 10,
        marginRight: 4
    },
    resumeBtnText: {
        color: COLORS.textPrimary,
        fontSize: 11,
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
    exploreBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' }
});
