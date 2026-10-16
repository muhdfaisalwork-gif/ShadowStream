import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, SafeAreaView } from 'react-native';
import { COLORS } from '../theme/colors';
import { useRouteMeta } from '../utils/useRouteMeta';
import { getApiBase } from '../utils/api';
import AppHeader from '../components/AppHeader';
import MobileTabBar from '../components/MobileTabBar';

async function fetchJson(path) {
    const r = await fetch(`${getApiBase()}/admin${path}`);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
}

function Stat({ label, value, hint }) {
    return (
        <View style={styles.statCard}>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
            {hint ? <Text style={styles.statHint}>{hint}</Text> : null}
        </View>
    );
}

function Section({ title, children, action, actionLabel }) {
    return (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{title}</Text>
                {action ? (
                    <TouchableOpacity onPress={action} accessibilityRole="button" style={styles.sectionAction}>
                        <Text style={styles.sectionActionText}>{actionLabel || 'Refresh'}</Text>
                    </TouchableOpacity>
                ) : null}
            </View>
            {children}
        </View>
    );
}

export default function AdminScreen({ navigation }) {
    useRouteMeta('Admin');
    const [stats, setStats] = useState(null);
    const [duplicates, setDuplicates] = useState(null);
    const [sources, setSources] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const reload = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [s, d, h] = await Promise.all([
                fetchJson('/stats'),
                fetchJson('/duplicates?limit=10'),
                fetchJson('/sources/health')
            ]);
            setStats(s); setDuplicates(d); setSources(h);
        } catch (e) {
            setError(e.message || 'Failed to load');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { reload(); }, [reload]);

    return (
        <SafeAreaView style={styles.container}>
            <AppHeader navigation={navigation} activeRoute="Admin" title="Admin Dashboard" />
            {loading && !stats ? (
                <View style={styles.center} accessible accessibilityRole="alert">
                    <ActivityIndicator size="large" color={COLORS.brand} />
                    <Text style={styles.loadingText}>Loading admin data…</Text>
                </View>
            ) : error ? (
                <View style={styles.center} accessible accessibilityRole="alert">
                    <Text style={styles.errorText}>Failed to load admin data</Text>
                    <Text style={styles.errorDetail}>{error}</Text>
                    <TouchableOpacity onPress={reload} style={styles.retryBtn} accessibilityRole="button">
                        <Text style={styles.retryBtnText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                    <Section title="Catalog stats" action={reload} actionLabel="Refresh">
                        <View style={styles.statGrid}>
                            <Stat label="Total indexed" value={(stats.indexed || 0).toLocaleString()} />
                            <Stat label="Complete" value={(stats.complete || 0).toLocaleString()} hint="poster + backdrop + overview + rating" />
                            <Stat label="Partial" value={(stats.partial || 0).toLocaleString()} hint="2 of 3 main fields" />
                            <Stat label="Stub" value={(stats.stub || 0).toLocaleString()} hint="needs enrichment" />
                            <Stat label="With rating" value={(stats.with_rating || 0).toLocaleString()} />
                            <Stat label="With overview" value={(stats.with_overview || 0).toLocaleString()} />
                            <Stat label="With poster" value={(stats.with_poster || 0).toLocaleString()} />
                            <Stat label="With backdrop" value={(stats.with_backdrop || 0).toLocaleString()} />
                        </View>
                        {Array.isArray(stats.by_type) && stats.by_type.length > 0 ? (
                            <View style={styles.byTypeRow}>
                                {stats.by_type.map(t => (
                                    <View key={t.type} style={styles.byTypeChip}>
                                        <Text style={styles.byTypeText}>{t.type}: {t.n.toLocaleString()}</Text>
                                    </View>
                                ))}
                            </View>
                        ) : null}
                    </Section>

                    <Section title={`Duplicate titles (${duplicates.count || 0} groups)`}>
                        {(duplicates.duplicates || []).length === 0 ? (
                            <Text style={styles.empty}>No duplicate title groups detected.</Text>
                        ) : (
                            duplicates.duplicates.map(d => (
                                <View key={d.canonical_title + d.year} style={styles.dupCard}>
                                    <Text style={styles.dupTitle}>{d.canonical_title} ({d.year || '?'})</Text>
                                    <Text style={styles.dupMeta}>×{d.n} ids: {d.ids}</Text>
                                    <Text style={styles.dupSlugs}>slugs: {d.slugs}</Text>
                                </View>
                            ))
                        )}
                    </Section>

                    <Section title="Source health">
                        {(sources.sources || []).map(s => {
                            const available = s.available || 0;
                            const total = s.availability_records || 0;
                            return (
                                <View key={s.slug} style={styles.sourceCard}>
                                    <View style={styles.sourceHeader}>
                                        <Text style={styles.sourceName}>{s.name}</Text>
                                        <Text style={[styles.sourceBadge, s.is_legal ? styles.legal : styles.illegal]}>
                                            {s.is_legal ? '✓ Legal' : '✗ Illegal'}
                                        </Text>
                                    </View>
                                    <Text style={styles.sourceMeta}>
                                        {s.type} · {available.toLocaleString()} / {total.toLocaleString()} available
                                    </Text>
                                    {s.last_checked ? (
                                        <Text style={styles.sourceMeta}>
                                            Last checked: {new Date(s.last_checked * 1000).toISOString().slice(0, 19).replace('T', ' ')}
                                        </Text>
                                    ) : null}
                                </View>
                            );
                        })}
                    </Section>
                </ScrollView>
            )}
            <MobileTabBar navigation={navigation} activeRoute="Admin" />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    content: { padding: 20, paddingBottom: 60 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg, padding: 20 },
    loadingText: { color: COLORS.textMuted, marginTop: 12 },
    errorText: { color: '#f87171', fontSize: 16, fontWeight: '700' },
    errorDetail: { color: COLORS.textMuted, marginTop: 6, marginBottom: 18, textAlign: 'center' },
    retryBtn: { backgroundColor: COLORS.brand, paddingHorizontal: 22, paddingVertical: 10, borderRadius: 8 },
    retryBtnText: { color: '#0E0E10', fontWeight: '700' },
    section: { marginBottom: 28 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    sectionTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
    sectionAction: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: COLORS.border },
    sectionActionText: { color: COLORS.brand, fontSize: 12, fontWeight: '700' },
    statGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
    statCard: { width: '46%', marginHorizontal: '2%', marginBottom: 12, padding: 14, backgroundColor: COLORS.surfaceCard, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border },
    statValue: { color: COLORS.textPrimary, fontSize: 22, fontWeight: '800' },
    statLabel: { color: COLORS.textSecondary, fontSize: 12, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
    statHint: { color: COLORS.textMuted, fontSize: 10, marginTop: 2 },
    byTypeRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
    byTypeChip: { backgroundColor: COLORS.surfaceAlt, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, marginRight: 6, marginBottom: 6 },
    byTypeText: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '600' },
    empty: { color: COLORS.textMuted, fontSize: 13, fontStyle: 'italic', paddingVertical: 8 },
    dupCard: { padding: 12, backgroundColor: 'rgba(248,113,113,0.07)', borderWidth: 1, borderColor: 'rgba(248,113,113,0.25)', borderRadius: 8, marginBottom: 8 },
    dupTitle: { color: COLORS.textPrimary, fontWeight: '700', fontSize: 14 },
    dupMeta: { color: COLORS.textMuted, fontSize: 11, marginTop: 4 },
    dupSlugs: { color: COLORS.textMuted, fontSize: 10, marginTop: 2, fontFamily: 'monospace' },
    sourceCard: { padding: 12, backgroundColor: COLORS.surfaceCard, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, marginBottom: 8 },
    sourceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    sourceName: { color: COLORS.textPrimary, fontWeight: '700', fontSize: 14 },
    sourceBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, fontSize: 10, fontWeight: '700' },
    legal: { backgroundColor: 'rgba(16,185,129,0.18)', color: '#34d399' },
    illegal: { backgroundColor: 'rgba(239,68,68,0.18)', color: '#f87171' },
    sourceMeta: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 }
});
