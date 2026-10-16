import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    SafeAreaView, ActivityIndicator, useWindowDimensions
} from 'react-native';
import { COLORS } from '../theme/colors';
import AppHeader from '../components/AppHeader';
import MobileTabBar from '../components/MobileTabBar';
import MediaCard from '../components/MediaCard';
import { getApiBase } from '../utils/api';
import { useRouteMeta } from '../utils/useRouteMeta';

export default function CountriesScreen({ navigation }) {
    const { width } = useWindowDimensions();
    const isDesktop = width >= 1024;
    const numCols = width >= 1200 ? 4 : width >= 768 ? 3 : 2;

    useRouteMeta('Countries');
    const [activeRegion, setActiveRegion] = useState('all');
    const [countries, setCountries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [regionTitles, setRegionTitles] = useState([]);
    const [loadingRegionTitles, setLoadingRegionTitles] = useState(false);

    const regions = [
        { id: 'all', label: '🌍 All 42 Nations' },
        { id: 'south_asia', label: '🇵🇰 South Asia' },
        { id: 'east_asia', label: '🌸 East Asia' },
        { id: 'middle_east', label: '🕌 Middle East' },
        { id: 'americas', label: '🗽 The Americas' },
        { id: 'europe', label: '🏰 Europe' },
        { id: 'africa', label: '🦁 Africa' },
        { id: 'oceania', label: '🦘 Oceania' }
    ];

    const REGION_MAP = {
        south_asia: ['PK', 'IN', 'BD'],
        east_asia: ['KR', 'CN', 'JP', 'TW', 'HK', 'ID', 'TH', 'MY', 'PH'],
        middle_east: ['TR', 'EG', 'SA', 'AE', 'IR', 'LB', 'MA', 'IQ', 'SY'],
        americas: ['US', 'CA', 'MX', 'BR', 'AR', 'CO'],
        europe: ['GB', 'FR', 'DE', 'ES', 'IT', 'SE', 'NO', 'DK', 'NL', 'PL', 'RU'],
        africa: ['NG', 'ZA', 'GH', 'KE', 'CI'],
        oceania: ['AU']
    };

    useEffect(() => {
        let cancelled = false;
        fetch(`${getApiBase()}/countries-catalog?with_counts=1`)
            .then(r => r.ok ? r.json() : fetch(`${getApiBase()}/countries`).then(r2 => r2.json()))
            .then(d => {
                if (!cancelled) {
                    const items = Array.isArray(d) ? d : (d.items || d.countries || []);
                    setCountries(items);
                    setLoading(false);
                }
            })
            .catch(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        if (activeRegion === 'all') {
            setRegionTitles([]);
            return;
        }
        let cancelled = false;
        setLoadingRegionTitles(true);
        fetch(`${getApiBase()}/titles?region=${activeRegion}&page=1&page_size=16`)
            .then(r => r.ok ? r.json() : null)
            .then(d => {
                if (!cancelled && d && Array.isArray(d.items)) {
                    setRegionTitles(d.items);
                }
            })
            .catch(() => {})
            .finally(() => {
                if (!cancelled) setLoadingRegionTitles(false);
            });
        return () => { cancelled = true; };
    }, [activeRegion]);

    const filteredCountries = countries.filter(c => {
        if (!c || !c.code || c.code === 'XX') return false;
        if (activeRegion === 'all') return true;
        const validCodes = REGION_MAP[activeRegion] || [];
        return validCodes.includes(c.code);
    });

    return (
        <SafeAreaView style={styles.screen}>
            <AppHeader navigation={navigation} activeRoute="Countries" title="Countries Hub" />

            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.hubHero}>
                    <Text style={styles.hubTitle}>🌍 World Cinema & Television</Text>
                    <Text style={styles.hubSub}>
                        Explore authentic cinematic productions across 42 nations with localized language tagging and verified metadata.
                    </Text>
                </View>

                {/* Region filter tabs */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
                    {regions.map(r => {
                        const isActive = activeRegion === r.id;
                        return (
                            <TouchableOpacity
                                key={r.id}
                                style={[styles.tabChip, isActive && styles.tabChipActive]}
                                onPress={() => setActiveRegion(r.id)}
                            >
                                <Text style={[styles.tabChipText, isActive && styles.tabChipTextActive]}>
                                    {r.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {/* Grid of Countries */}
                {loading ? (
                    <ActivityIndicator size="large" color={COLORS.brand} style={{ marginTop: 40 }} />
                ) : (
                    <View style={styles.grid}>
                        {filteredCountries.map(c => (
                            <TouchableOpacity
                                key={c.code}
                                style={[styles.countryCard, { width: `${100 / numCols - 2}%` }]}
                                onPress={() => navigation.navigate('CountryDetail', { slug: c.code, country: c, code: c.code })}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.flagIcon}>{c.flag || '🏳️'}</Text>
                                <View style={styles.cardTextCol}>
                                    <Text style={styles.countryName} numberOfLines={1}>{c.name}</Text>
                                    <Text style={styles.countryCount}>
                                        {c.count ? `${c.count.toLocaleString()} titles` : 'Cataloged'}
                                    </Text>
                                </View>
                                <Text style={styles.arrowIcon}>›</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* Regional Title Feed (When filtered by region) */}
                {activeRegion !== 'all' && (
                    <View style={{ marginTop: 24, paddingHorizontal: 16 }}>
                        <Text style={{ color: COLORS.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 4 }}>
                            Featured {regions.find(r => r.id === activeRegion)?.label || ''} Titles
                        </Text>
                        <Text style={{ color: COLORS.textMuted, fontSize: 12, marginBottom: 16 }}>
                            Top-rated productions streaming across this region
                        </Text>
                        {loadingRegionTitles ? (
                            <ActivityIndicator size="small" color={COLORS.brand} style={{ marginVertical: 24 }} />
                        ) : regionTitles.length > 0 ? (
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                                {regionTitles.map(t => (
                                    <View key={t.id} style={{ width: `${100 / numCols - 2}%`, marginBottom: 16 }}>
                                        <MediaCard item={t} navigation={navigation} />
                                    </View>
                                ))}
                            </View>
                        ) : (
                            <Text style={{ color: COLORS.textMuted, fontSize: 12, textAlign: 'center', marginVertical: 16 }}>
                                No specific titles found for this regional filter.
                            </Text>
                        )}
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
    countryCard: {
        backgroundColor: COLORS.surfaceAlt,
        borderRadius: 10,
        padding: 14,
        marginBottom: 14,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border
    },
    flagIcon: {
        fontSize: 28,
        marginRight: 12
    },
    cardTextCol: {
        flex: 1
    },
    countryName: {
        color: COLORS.textPrimary,
        fontSize: 14,
        fontWeight: '700'
    },
    countryCount: {
        color: COLORS.textMuted,
        fontSize: 11,
        marginTop: 2
    },
    arrowIcon: {
        color: COLORS.brand,
        fontSize: 18,
        fontWeight: '700',
        marginLeft: 6
    }
});
