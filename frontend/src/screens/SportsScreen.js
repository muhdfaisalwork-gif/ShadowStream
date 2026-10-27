import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    SafeAreaView, ActivityIndicator, TextInput, Image, RefreshControl
} from 'react-native';
import { COLORS } from '../theme/colors';
import AppHeader from '../components/AppHeader';
import MobileTabBar from '../components/MobileTabBar';
import { getApiBase } from '../utils/api';
import { useRouteMeta } from '../utils/useRouteMeta';
import { useResponsive } from '../theme/scaling';

const DEFAULT_CATEGORIES = [
    { id: 'all', label: 'All Sports', icon: '🏆' },
    { id: 'cricket', label: 'Cricket', icon: '🏏' },
    { id: 'football', label: 'Football / Soccer', icon: '⚽' },
    { id: 'racing', label: 'Motorsports & Racing', icon: '🏎️' },
    { id: 'combat', label: 'Combat & MMA', icon: '🥊' },
    { id: 'basketball', label: 'Basketball', icon: '🏀' },
    { id: 'tennis_golf', label: 'Tennis & Golf', icon: '🎾' },
    { id: 'extreme', label: 'Extreme Sports', icon: '🏂' },
    { id: 'general', label: 'Sports Networks', icon: '📺' }
];

function SportsChannelCard({ channel, onPress, cardWidth }) {
    const [imgError, setImgError] = useState(!channel.logo);

    const categoryIcon = useMemo(() => {
        switch (channel.category) {
            case 'cricket': return '🏏';
            case 'football': return '⚽';
            case 'racing': return '🏎️';
            case 'combat': return '🥊';
            case 'basketball': return '🏀';
            case 'tennis_golf': return '🎾';
            case 'extreme': return '🏂';
            default: return '📺';
        }
    }, [channel.category]);

    return (
        <TouchableOpacity
            style={[styles.channelCard, { width: cardWidth }]}
            onPress={() => onPress(channel)}
            activeOpacity={0.8}
        >
            <View style={styles.cardHeader}>
                <View style={styles.liveBadge}>
                    <View style={styles.livePulseDot} />
                    <Text style={styles.liveBadgeText}>LIVE</Text>
                </View>
                {channel.quality ? (
                    <View style={styles.qualityBadge}>
                        <Text style={styles.qualityBadgeText}>{channel.quality}</Text>
                    </View>
                ) : null}
            </View>

            <View style={styles.logoContainer}>
                {!imgError && channel.logo ? (
                    <Image
                        source={{ uri: channel.logo }}
                        style={styles.channelLogo}
                        resizeMode="contain"
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <View style={styles.logoFallback}>
                        <Text style={styles.logoFallbackIcon}>{categoryIcon}</Text>
                        <Text style={styles.logoFallbackText} numberOfLines={1}>{channel.name}</Text>
                    </View>
                )}
            </View>

            <View style={styles.cardInfo}>
                <Text style={styles.channelName} numberOfLines={1}>
                    {channel.name}
                </Text>
                <View style={styles.cardMetaRow}>
                    <View style={styles.countryTag}>
                        <Text style={styles.countryTagText}>{channel.country || 'GLOBAL'}</Text>
                    </View>
                    <Text style={styles.categoryTagText} numberOfLines={1}>
                        {categoryIcon} {channel.category ? channel.category.toUpperCase() : 'SPORTS'}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );
}

function MatchScoreCard({ match, onChannelSearch }) {
    const isLive = match.isLive || match.state === 'in';
    const isPost = match.state === 'post';

    return (
        <View style={styles.matchCard}>
            <View style={styles.matchCardTop}>
                <View style={styles.matchLeaguePill}>
                    <Text style={styles.matchLeagueIcon}>{match.icon || '🏆'}</Text>
                    <Text style={styles.matchLeagueText}>{match.league}</Text>
                </View>
                <View style={[styles.matchStatusBadge, isLive && styles.matchStatusLive, isPost && styles.matchStatusPost]}>
                    {isLive && <View style={styles.livePulseDot} />}
                    <Text style={[styles.matchStatusText, isLive && styles.matchStatusLiveText]}>
                        {isLive ? 'LIVE' : match.status || 'Scheduled'}
                    </Text>
                </View>
            </View>

            <View style={styles.teamsRow}>
                {/* Home Team */}
                <View style={styles.teamCol}>
                    {match.homeTeam?.logo ? (
                        <Image source={{ uri: match.homeTeam.logo }} style={styles.teamLogo} resizeMode="contain" />
                    ) : (
                        <View style={styles.teamLogoFallback}><Text style={styles.teamFallbackText}>H</Text></View>
                    )}
                    <Text style={styles.teamName} numberOfLines={1}>{match.homeTeam?.shortName || match.homeTeam?.name || 'Home'}</Text>
                    <Text style={styles.teamScore}>{match.homeTeam?.score != null ? match.homeTeam.score : '-'}</Text>
                </View>

                <View style={styles.vsContainer}>
                    <Text style={styles.vsText}>VS</Text>
                </View>

                {/* Away Team */}
                <View style={styles.teamCol}>
                    {match.awayTeam?.logo ? (
                        <Image source={{ uri: match.awayTeam.logo }} style={styles.teamLogo} resizeMode="contain" />
                    ) : (
                        <View style={styles.teamLogoFallback}><Text style={styles.teamFallbackText}>A</Text></View>
                    )}
                    <Text style={styles.teamName} numberOfLines={1}>{match.awayTeam?.shortName || match.awayTeam?.name || 'Away'}</Text>
                    <Text style={styles.teamScore}>{match.awayTeam?.score != null ? match.awayTeam.score : '-'}</Text>
                </View>
            </View>

            <View style={styles.matchCardFooter}>
                <Text style={styles.broadcastText} numberOfLines={1}>
                    📺 {match.broadcast || 'Live Sports Broadcast'}
                </Text>
                {onChannelSearch && (
                    <TouchableOpacity
                        style={styles.findStreamBtn}
                        onPress={() => onChannelSearch(match.league || match.sport)}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.findStreamText}>Find Feeds ❯</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

export default function SportsScreen({ navigation }) {
    const responsive = useResponsive();
    useRouteMeta('Sports');

    const [hubData, setHubData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLeague, setSelectedLeague] = useState('all');

    const fetchSportsData = useCallback(async () => {
        try {
            // First attempt to reach API or worker route
            const apiRes = await fetch(`${getApiBase()}/sports/hub`).catch(() => null);
            if (apiRes && apiRes.ok) {
                const data = await apiRes.json();
                if (data && Array.isArray(data.channels)) {
                    setHubData(data);
                    setLoading(false);
                    return;
                }
            }

            // Fallback to static bundled sports_hub.json
            const staticRes = await fetch('/sports_hub.json').catch(() => null);
            if (staticRes && staticRes.ok) {
                const data = await staticRes.json();
                if (data && Array.isArray(data.channels)) {
                    setHubData(data);
                    setLoading(false);
                    return;
                }
            }
        } catch (e) {
            console.warn('[SportsScreen] Failed to load sports data:', e.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchSportsData();
    }, [fetchSportsData]);

    const handleRefresh = useCallback(() => {
        setRefreshing(true);
        fetchSportsData();
    }, [fetchSportsData]);

    const categories = useMemo(() => {
        return hubData?.categories && hubData.categories.length > 0
            ? hubData.categories
            : DEFAULT_CATEGORIES;
    }, [hubData]);

    const leagues = useMemo(() => {
        const matches = hubData?.matches || [];
        const unique = Array.from(new Set(matches.map(m => m.league).filter(Boolean)));
        return ['all', ...unique];
    }, [hubData]);

    const filteredMatches = useMemo(() => {
        const matches = hubData?.matches || [];
        if (selectedLeague === 'all') return matches;
        return matches.filter(m => m.league === selectedLeague);
    }, [hubData, selectedLeague]);

    const filteredChannels = useMemo(() => {
        const channels = hubData?.channels || [];
        return channels.filter(ch => {
            const matchesCat = selectedCategory === 'all' || ch.category === selectedCategory;
            if (!matchesCat) return false;

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const nameMatch = ch.name?.toLowerCase().includes(q);
                const countryMatch = ch.country?.toLowerCase().includes(q);
                const catMatch = ch.category?.toLowerCase().includes(q);
                return nameMatch || countryMatch || catMatch;
            }
            return true;
        });
    }, [hubData, selectedCategory, searchQuery]);

    const handlePlayChannel = useCallback((channel) => {
        navigation.navigate('Player', {
            item: {
                id: channel.id,
                title: channel.name,
                type: 'live_tv',
                streamUrl: channel.url,
                poster: channel.logo,
                quality: channel.quality,
                category: channel.category,
                isLive: true,
                sourceName: `${channel.name} (Live HLS)`
            }
        });
    }, [navigation]);

    // Responsive columns and widths
    const cardWidth = useMemo(() => {
        const hPad = responsive.horizontalPadding * 2;
        const totalW = responsive.width - hPad;
        const cols = responsive.isDesktop ? 4 : (responsive.isTablet ? 3 : (responsive.isMobileLandscape ? 3 : 2));
        const gap = 12;
        return Math.floor((totalW - ((cols - 1) * gap)) / cols);
    }, [responsive]);

    return (
        <SafeAreaView style={styles.screen}>
            <AppHeader navigation={navigation} activeRoute="Sports" title="Live Sports" />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[styles.scrollContent, { paddingHorizontal: responsive.horizontalPadding }]}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor={COLORS.brand}
                        colors={[COLORS.brand]}
                    />
                }
            >
                {/* Hero / Header Section */}
                <View style={styles.heroSection}>
                    <View style={styles.heroTopRow}>
                        <View style={styles.heroLiveBadge}>
                            <View style={styles.livePulseDot} />
                            <Text style={styles.heroLiveText}>LIVE SPORTS ARENA</Text>
                        </View>
                        <Text style={styles.heroChannelCount}>
                            {hubData?.channels?.length || 400}+ Live Streams
                        </Text>
                    </View>
                    <Text style={styles.heroTitle}>Free Live Sports & Matches</Text>
                    <Text style={styles.heroSubtitle}>
                        Direct HLS television feeds for Cricket, Premier League, NBA, Motorsports, Combat, Tennis & Golf with live ESPN scoreboards.
                    </Text>
                </View>

                {/* ESPN Live Scoreboards & Fixtures */}
                {hubData?.matches && hubData.matches.length > 0 && (
                    <View style={styles.sectionContainer}>
                        <View style={styles.sectionHeaderRow}>
                            <View style={styles.sectionTitleRow}>
                                <Text style={styles.sectionIcon}>⚡</Text>
                                <Text style={styles.sectionTitle}>Match Scoreboards & Fixtures</Text>
                            </View>
                            <Text style={styles.sectionMeta}>{filteredMatches.length} Matches</Text>
                        </View>

                        {/* League Filter Pills */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll}>
                            {leagues.map(lg => {
                                const active = selectedLeague === lg;
                                return (
                                    <TouchableOpacity
                                        key={lg}
                                        style={[styles.leaguePill, active && styles.leaguePillActive]}
                                        onPress={() => setSelectedLeague(lg)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[styles.leaguePillText, active && styles.leaguePillTextActive]}>
                                            {lg === 'all' ? '🏆 All Leagues' : lg}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        {/* Matches Carousel */}
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.matchesCarousel}
                        >
                            {filteredMatches.map(match => (
                                <MatchScoreCard
                                    key={match.id}
                                    match={match}
                                    onChannelSearch={(kw) => {
                                        setSearchQuery(kw);
                                    }}
                                />
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* Category Filter Pills */}
                <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeaderRow}>
                        <View style={styles.sectionTitleRow}>
                            <Text style={styles.sectionIcon}>📡</Text>
                            <Text style={styles.sectionTitle}>Sports Channels</Text>
                        </View>
                        <Text style={styles.sectionMeta}>{filteredChannels.length} Channels</Text>
                    </View>

                    {/* Search & Fast Filter Bar */}
                    <View style={styles.searchBarContainer}>
                        <Text style={styles.searchIcon}>🔍</Text>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Filter channels by name, sport, or country..."
                            placeholderTextColor={COLORS.textTertiary || '#888'}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.searchClearBtn}>
                                <Text style={styles.searchClearText}>✕</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Category Pills */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll}>
                        {categories.map(cat => {
                            const active = selectedCategory === cat.id;
                            return (
                                <TouchableOpacity
                                    key={cat.id}
                                    style={[styles.categoryPill, active && styles.categoryPillActive]}
                                    onPress={() => setSelectedCategory(cat.id)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.categoryPillIcon}>{cat.icon}</Text>
                                    <Text style={[styles.categoryPillText, active && styles.categoryPillTextActive]}>
                                        {cat.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    {/* Channels Grid */}
                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={COLORS.brand} />
                            <Text style={styles.loadingText}>Loading Live Sports Streams...</Text>
                        </View>
                    ) : filteredChannels.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyIcon}>🏟️</Text>
                            <Text style={styles.emptyTitle}>No sports channels found</Text>
                            <Text style={styles.emptySub}>
                                Try clearing your search or switching to another category.
                            </Text>
                            {searchQuery.length > 0 && (
                                <TouchableOpacity
                                    style={styles.clearFilterBtn}
                                    onPress={() => setSearchQuery('')}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.clearFilterText}>Clear Search Filter</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    ) : (
                        <View style={styles.channelsGrid}>
                            {filteredChannels.map(channel => (
                                <SportsChannelCard
                                    key={channel.id}
                                    channel={channel}
                                    cardWidth={cardWidth}
                                    onPress={handlePlayChannel}
                                />
                            ))}
                        </View>
                    )}
                </View>
            </ScrollView>

            <MobileTabBar navigation={navigation} activeRoute="Sports" />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: COLORS.background || '#0D1117',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingTop: 16,
        paddingBottom: 80,
    },
    heroSection: {
        backgroundColor: '#161B22',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.25)',
    },
    heroTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    heroLiveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#EF4444',
    },
    livePulseDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#EF4444',
        marginRight: 6,
    },
    heroLiveText: {
        color: '#EF4444',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    heroChannelCount: {
        color: COLORS.brand || '#22C55E',
        fontSize: 12,
        fontWeight: '700',
    },
    heroTitle: {
        color: '#FFFFFF',
        fontSize: 22,
        fontWeight: '900',
        marginBottom: 6,
    },
    heroSubtitle: {
        color: COLORS.textSecondary || '#8B949E',
        fontSize: 13,
        lineHeight: 18,
    },
    sectionContainer: {
        marginBottom: 24,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sectionIcon: {
        fontSize: 18,
        marginRight: 8,
    },
    sectionTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '800',
    },
    sectionMeta: {
        color: COLORS.textSecondary || '#8B949E',
        fontSize: 12,
        fontWeight: '600',
    },
    pillScroll: {
        marginBottom: 16,
    },
    leaguePill: {
        backgroundColor: '#1E242C',
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
        marginRight: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    leaguePillActive: {
        backgroundColor: COLORS.brand || '#3B82F6',
        borderColor: COLORS.brand || '#3B82F6',
    },
    leaguePillText: {
        color: '#C9D1D9',
        fontSize: 12,
        fontWeight: '600',
    },
    leaguePillTextActive: {
        color: '#FFFFFF',
        fontWeight: '800',
    },
    categoryPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E242C',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    categoryPillActive: {
        backgroundColor: '#DC2626',
        borderColor: '#DC2626',
    },
    categoryPillIcon: {
        fontSize: 14,
        marginRight: 6,
    },
    categoryPillText: {
        color: '#C9D1D9',
        fontSize: 12,
        fontWeight: '600',
    },
    categoryPillTextActive: {
        color: '#FFFFFF',
        fontWeight: '800',
    },
    matchesCarousel: {
        paddingRight: 16,
        paddingBottom: 8,
    },
    matchCard: {
        width: 250,
        backgroundColor: '#161B22',
        borderRadius: 14,
        padding: 12,
        marginRight: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    matchCardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    matchLeaguePill: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    matchLeagueIcon: {
        fontSize: 12,
        marginRight: 4,
    },
    matchLeagueText: {
        color: '#8B949E',
        fontSize: 11,
        fontWeight: '700',
    },
    matchStatusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    matchStatusLive: {
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        borderWidth: 1,
        borderColor: '#EF4444',
    },
    matchStatusPost: {
        backgroundColor: 'rgba(34, 197, 94, 0.15)',
    },
    matchStatusText: {
        color: '#8B949E',
        fontSize: 10,
        fontWeight: '700',
    },
    matchStatusLiveText: {
        color: '#EF4444',
    },
    teamsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 6,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        marginBottom: 8,
    },
    teamCol: {
        flex: 1,
        alignItems: 'center',
    },
    teamLogo: {
        width: 32,
        height: 32,
        marginBottom: 4,
    },
    teamLogoFallback: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#21262D',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    teamFallbackText: {
        color: '#8B949E',
        fontWeight: 'bold',
        fontSize: 12,
    },
    teamName: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '700',
        textAlign: 'center',
        maxWidth: 80,
    },
    teamScore: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '900',
        marginTop: 2,
    },
    vsContainer: {
        paddingHorizontal: 8,
        alignItems: 'center',
    },
    vsText: {
        color: '#8B949E',
        fontSize: 11,
        fontWeight: '800',
    },
    matchCardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    broadcastText: {
        color: '#8B949E',
        fontSize: 10,
        maxWidth: 140,
    },
    findStreamBtn: {
        paddingVertical: 2,
    },
    findStreamText: {
        color: COLORS.brand || '#3B82F6',
        fontSize: 10,
        fontWeight: '700',
    },
    searchBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#161B22',
        borderRadius: 12,
        paddingHorizontal: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        height: 44,
    },
    searchIcon: {
        fontSize: 14,
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        color: '#FFFFFF',
        fontSize: 13,
        paddingVertical: 8,
    },
    searchClearBtn: {
        padding: 4,
    },
    searchClearText: {
        color: '#8B949E',
        fontSize: 14,
        fontWeight: 'bold',
    },
    channelsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    channelCard: {
        backgroundColor: '#161B22',
        borderRadius: 12,
        padding: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    liveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.6)',
    },
    liveBadgeText: {
        color: '#EF4444',
        fontSize: 9,
        fontWeight: '800',
    },
    qualityBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        paddingHorizontal: 5,
        paddingVertical: 2,
        borderRadius: 4,
    },
    qualityBadgeText: {
        color: '#8B949E',
        fontSize: 9,
        fontWeight: '700',
    },
    logoContainer: {
        height: 64,
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 4,
    },
    channelLogo: {
        width: '80%',
        height: '100%',
    },
    logoFallback: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoFallbackIcon: {
        fontSize: 28,
        marginBottom: 2,
    },
    logoFallbackText: {
        color: '#8B949E',
        fontSize: 10,
        fontWeight: '600',
    },
    cardInfo: {
        marginTop: 4,
    },
    channelName: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '800',
        marginBottom: 4,
    },
    cardMetaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    countryTag: {
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 4,
    },
    countryTagText: {
        color: '#8B949E',
        fontSize: 9,
        fontWeight: '700',
    },
    categoryTagText: {
        color: '#8B949E',
        fontSize: 9,
        fontWeight: '600',
    },
    loadingContainer: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    loadingText: {
        color: '#8B949E',
        marginTop: 12,
        fontSize: 13,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 40,
        paddingHorizontal: 20,
    },
    emptyIcon: {
        fontSize: 40,
        marginBottom: 10,
    },
    emptyTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
    },
    emptySub: {
        color: '#8B949E',
        fontSize: 12,
        textAlign: 'center',
        marginBottom: 16,
    },
    clearFilterBtn: {
        backgroundColor: COLORS.brand || '#3B82F6',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    clearFilterText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 12,
    },
});
