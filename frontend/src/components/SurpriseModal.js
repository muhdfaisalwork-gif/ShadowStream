/**
 * SurpriseModal.js — ShadowStream random title picker & discoverer.
 * Backend: GET /api/v1/surprise?type=&min_rating=
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    ScrollView,
    Pressable,
} from 'react-native';
import Poster from './Poster';
import { getApiBase } from '../utils/api';
import { WatchlistAPI } from '../utils/storage';

const TYPE_LABEL = {
    movie: 'FILM',
    tv: 'TV SERIES',
    anime: 'ANIME',
    short_drama: 'SHORT TV',
};

export default function SurpriseModal({ visible, onClose, navigation, initialType = 'any' }) {
    const [pick, setPick] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [typeFilter, setTypeFilter] = useState(initialType);
    const [inWatchlist, setInWatchlist] = useState(false);

    const fetchPick = useCallback(async (t) => {
        setLoading(true);
        setError(null);
        try {
            const url = `${getApiBase()}/surprise?type=${t || 'any'}&min_rating=7.0`;
            const res = await fetch(url, { headers: { Accept: 'application/json' } });
            if (!res.ok) throw new Error(`API ${res.status}`);
            const data = await res.json();
            const nextPick = data.item || null;
            setPick(nextPick);
            setInWatchlist(nextPick ? WatchlistAPI.isSaved(nextPick.id) : false);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (visible) fetchPick(typeFilter);
    }, [visible, typeFilter, fetchPick]);

    const onWatchNow = () => {
        if (!pick) return;
        onClose();
        navigation.navigate('Player', { item: pick, slug: pick.slug || String(pick.id) });
    };
    const onDetails = () => {
        if (!pick) return;
        onClose();
        navigation.navigate('TitleDetail', { slug: pick.slug || String(pick.id), item: pick });
    };
    const onAnother = () => fetchPick(typeFilter);
    const onAddWatchlist = () => {
        if (!pick) return;
        try {
            if (WatchlistAPI.isSaved(pick.id)) {
                WatchlistAPI.remove(pick.id);
                setInWatchlist(false);
            } else {
                WatchlistAPI.add(pick);
                setInWatchlist(true);
            }
        } catch (e) {
            /* watchlist module optional */
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close surprise picker" />
            <View style={styles.card} accessibilityViewIsModal>
                <View style={styles.header}>
                    <Text style={styles.headerEyebrow}>🎲 SURPRISE ME</Text>
                    <Text style={styles.headerTitle}>Tonight's random pick</Text>
                    <TouchableOpacity
                        onPress={onClose}
                        style={styles.closeBtn}
                        accessibilityLabel="Close"
                        accessibilityRole="button"
                    >
                        <Text style={styles.closeBtnText}>×</Text>
                    </TouchableOpacity>
                </View>

                {/* Type filter chips */}
                <View style={styles.chipsRow}>
                    {[
                        { v: 'any', label: '🎲 Any' },
                        { v: 'movie', label: '🎬 Movie' },
                        { v: 'tv', label: '📺 TV' },
                        { v: 'anime', label: '⚡ Anime' },
                        { v: 'short_drama', label: '📱 Short' },
                    ].map((c) => (
                        <TouchableOpacity
                            key={c.v}
                            onPress={() => setTypeFilter(c.v)}
                            style={[styles.chip, typeFilter === c.v && styles.chipActive]}
                            accessibilityRole="button"
                            accessibilityLabel={`Filter ${c.label}`}
                            accessibilityState={{ selected: typeFilter === c.v }}
                        >
                            <Text style={[styles.chipText, typeFilter === c.v && styles.chipTextActive]}>{c.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <ScrollView
                    style={styles.body}
                    contentContainerStyle={styles.bodyContent}
                    showsVerticalScrollIndicator={false}
                >
                    {loading && (
                        <View style={styles.loadingBox}>
                            <ActivityIndicator size="large" color="#ff5b6b" />
                            <Text style={styles.loadingText}>Picking something good...</Text>
                        </View>
                    )}

                    {error && !loading && (
                        <View style={styles.errorBox}>
                            <Text style={styles.errorTitle}>Couldn't pick</Text>
                            <Text style={styles.errorBody}>{error}</Text>
                            <TouchableOpacity onPress={onAnother} style={styles.btnSecondary}>
                                <Text style={styles.btnSecondaryText}>🔄 Try again</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {pick && !loading && (
                        <View style={styles.pickWrap}>
                            <View style={styles.posterWrap}>
                                <Poster url={pick.poster} title={pick.title} style={styles.poster} resizeMode="cover" />
                            </View>
                            <View style={styles.pickMeta}>
                                <View style={styles.pickBadgeRow}>
                                    <View style={styles.pickTypeBadge}>
                                        <Text style={styles.pickTypeBadgeText}>
                                            {TYPE_LABEL[pick.type] || (pick.type || '').toUpperCase()}
                                        </Text>
                                    </View>
                                    {pick.rating ? (
                                        <View style={styles.pickRatingBadge}>
                                            <Text style={styles.pickRatingStar}>★</Text>
                                            <Text style={styles.pickRatingVal}>{Number(pick.rating).toFixed(1)}</Text>
                                        </View>
                                    ) : null}
                                </View>
                                <Text style={styles.pickTitle} numberOfLines={3}>{pick.title}</Text>
                                <Text style={styles.pickSub}>
                                    {pick.year || '—'}{pick.runtime ? `  •  ${pick.runtime}m` : ''}
                                    {pick.type === 'tv' && pick.seasons ? `  •  ${pick.seasons} seasons` : ''}
                                </Text>
                                {pick.overview ? (
                                    <Text style={styles.pickOverview} numberOfLines={6}>{pick.overview}</Text>
                                ) : null}

                                <View style={styles.actionsRow}>
                                    <TouchableOpacity style={styles.btnPrimary} onPress={onWatchNow} accessibilityRole="button" accessibilityLabel={`Play ${pick.title}`}>
                                        <Text style={styles.btnPrimaryIcon}>▶</Text>
                                        <Text style={styles.btnPrimaryText}>Watch Now</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.btnSecondary} onPress={onDetails} accessibilityRole="button" accessibilityLabel={`Open details for ${pick.title}`}>
                                        <Text style={styles.btnSecondaryIcon}>ℹ</Text>
                                        <Text style={styles.btnSecondaryText}>Details</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.actionsRow}>
                                    <TouchableOpacity style={styles.btnGhost} onPress={onAnother} accessibilityRole="button" accessibilityLabel="Pick another title">
                                        <Text style={styles.btnGhostIcon}>🎲</Text>
                                        <Text style={styles.btnGhostText}>Another</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.btnGhost} onPress={onAddWatchlist} accessibilityRole="button" accessibilityLabel="Save to watchlist">
                                        <Text style={styles.btnGhostIcon}>{inWatchlist ? '✓' : '🔖'}</Text>
                                        <Text style={styles.btnGhostText}>{inWatchlist ? 'Saved' : 'Watchlist'}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    )}
                </ScrollView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.78)',
    },
    card: {
        position: 'absolute',
        left: '5%', right: '5%', top: '8%', bottom: '8%',
        backgroundColor: '#15161d',
        borderRadius: 18,
        borderWidth: 1, borderColor: 'rgba(255,91,107,0.35)',
        overflow: 'hidden',
        maxWidth: 880,
        alignSelf: 'center',
        width: '90%',
    },
    header: {
        paddingTop: 18, paddingHorizontal: 22, paddingBottom: 10,
        borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
    },
    headerEyebrow: { color: '#ff5b6b', fontSize: 11, letterSpacing: 2, fontWeight: '700' },
    headerTitle: { color: '#ffffff', fontSize: 22, fontWeight: '800', marginTop: 4 },
    closeBtn: {
        position: 'absolute', right: 14, top: 14,
        width: 34, height: 34, borderRadius: 17,
        backgroundColor: 'rgba(255,255,255,0.08)',
        alignItems: 'center', justifyContent: 'center',
    },
    closeBtnText: { color: '#ffffff', fontSize: 22, lineHeight: 24, fontWeight: '600' },
    chipsRow: {
        flexDirection: 'row', flexWrap: 'wrap', gap: 8,
        paddingHorizontal: 18, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    chip: {
        paddingHorizontal: 12, paddingVertical: 7,
        borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.06)',
        borderWidth: 1, borderColor: 'transparent',
    },
    chipActive: { backgroundColor: '#ff5b6b', borderColor: '#ff5b6b' },
    chipText: { color: '#aaa', fontSize: 12, fontWeight: '600' },
    chipTextActive: { color: '#fff' },
    body: { flex: 1 },
    bodyContent: { padding: 22 },
    loadingBox: { alignItems: 'center', paddingVertical: 60, gap: 12 },
    loadingText: { color: '#aaa', fontSize: 14 },
    errorBox: { paddingVertical: 40, gap: 14, alignItems: 'center' },
    errorTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
    errorBody: { color: '#aaa', fontSize: 13, textAlign: 'center' },
    pickWrap: { flexDirection: 'row', gap: 22, flexWrap: 'wrap' },
    posterWrap: { width: 220, alignSelf: 'flex-start' },
    poster: { width: 220, height: 320, borderRadius: 12 },
    pickMeta: { flex: 1, minWidth: 280, gap: 10 },
    pickBadgeRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
    pickTypeBadge: { backgroundColor: '#ff5b6b', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 4 },
    pickTypeBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 0.6 },
    pickRatingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,215,0,0.12)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 4, borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)' },
    pickRatingStar: { color: '#ffd700', fontSize: 11, marginRight: 4 },
    pickRatingVal: { color: '#fff', fontSize: 11, fontWeight: '700' },
    pickTitle: { color: '#fff', fontSize: 26, fontWeight: '800', lineHeight: 30 },
    pickSub: { color: '#9aa', fontSize: 13, marginTop: 2 },
    pickOverview: { color: '#cbd', fontSize: 14, lineHeight: 21, marginTop: 8 },
    actionsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
    btnPrimary: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#ff5b6b',
        paddingHorizontal: 18, paddingVertical: 11, borderRadius: 8,
    },
    btnPrimaryIcon: { color: '#fff', fontSize: 14 },
    btnPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '700' },
    btnSecondary: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: 'rgba(255,255,255,0.08)',
        paddingHorizontal: 18, paddingVertical: 11, borderRadius: 8,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    },
    btnSecondaryIcon: { color: '#fff', fontSize: 14 },
    btnSecondaryText: { color: '#fff', fontSize: 14, fontWeight: '600' },
    btnGhost: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: 'transparent',
        paddingHorizontal: 18, paddingVertical: 11, borderRadius: 8,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    },
    btnGhostIcon: { fontSize: 14 },
    btnGhostText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
