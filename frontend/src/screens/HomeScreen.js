import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    SafeAreaView, ActivityIndicator, Alert, useWindowDimensions
} from 'react-native';
import { COLORS } from '../theme/colors';
import AppHeader from '../components/AppHeader';
import MobileTabBar from '../components/MobileTabBar';
import Poster from '../components/Poster';
import MediaCard from '../components/MediaCard';
import CategoryRow from '../components/CategoryRow';
import SkeletonGrid from '../components/SkeletonGrid';
import SurpriseModal from '../components/SurpriseModal';
import { getApiBase } from '../utils/api';
import { Storage, HistoryAPI, WatchlistAPI } from '../utils/storage';
import { useRouteMeta } from '../utils/useRouteMeta';
import { useResponsive } from '../theme/scaling';

export default function HomeScreen({ navigation }) {
    const { width } = useWindowDimensions();
    const isDesktop = width >= 1024;
    const responsive = useResponsive();

    const [categories, setCategories] = useState([]);
    const [heroSlides, setHeroSlides] = useState([]);
    const [heroIndex, setHeroIndex] = useState(0);
    const [continueWatching, setContinueWatching] = useState([]);
    const [featured, setFeatured] = useState([]); // bundled picks used when API is unreachable
    const [loading, setLoading] = useState(true);
    const [apiStatus, setApiStatus] = useState('loading'); // 'loading' | 'ok' | 'unreachable'
    const [surpriseOpen, setSurpriseOpen] = useState(false);

    useRouteMeta('Home');

    // Load static "Top Picks" baked into /featured.json — used when API is unreachable
    // so the offline hub always has real movie cards instead of just empty tiles.
    useEffect(() => {
        let cancelled = false;
        fetch((typeof window !== 'undefined' ? window.location.origin : '') + '/featured.json', { cache: 'no-store' })
            .then(r => r.ok ? r.json() : null)
            .then(j => {
                if (cancelled || !j || !Array.isArray(j.picks)) return;
                setFeatured(j.picks.slice(0, 24));
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, []);

    const loadHome = useCallback(async () => {
        setLoading(true);
        setApiStatus('loading');
        try {
            const res = await fetch(`${getApiBase()}/categories`);
            if (res.ok) {
                const data = await res.json();
                const cats = Array.isArray(data) ? data : (data.categories || []);
                setCategories(cats);
                setApiStatus('ok');

                // Build hero slides from trending or top popular titles
                const slides = [];
                const seen = new Set();
                const addSlide = (it) => {
                    if (it && it.id && !seen.has(it.id)) {
                        seen.add(it.id);
                        slides.push(it);
                    }
                };

                const trending = cats.find(c => c.id === 'trending-today' || c.id === 'trending');
                if (trending && Array.isArray(trending.items)) {
                    trending.items.slice(0, 5).forEach(addSlide);
                }
                cats.forEach(c => {
                    if (slides.length < 5 && Array.isArray(c.items)) {
                        c.items.slice(0, 2).forEach(addSlide);
                    }
                });
                setHeroSlides(slides);
            } else {
                setApiStatus('unreachable');
            }
        } catch (err) {
            console.error('[HomeScreen] loadHome error:', err);
            setApiStatus('unreachable');
        } finally {
            setLoading(false);
        }
    }, []);

    // Load continue watching entries
    const loadContinueWatching = useCallback(async () => {
        try {
            const hist = await HistoryAPI.list();
            const inProgress = hist.filter(h => h.pct > 3 && h.pct < 95).slice(0, 10);
            setContinueWatching(inProgress);
        } catch (e) {
            console.warn('[HomeScreen] ContinueWatching error:', e);
        }
    }, []);

    useEffect(() => {
        loadHome();
        loadContinueWatching();
    }, [loadHome, loadContinueWatching]);

    useEffect(() => {
        if (!navigation?.addListener) return;
        const unsubscribe = navigation.addListener('focus', () => {
            loadContinueWatching();
        });
        return unsubscribe;
    }, [navigation, loadContinueWatching]);

    // Auto rotate hero slides every 6s
    useEffect(() => {
        if (heroSlides.length <= 1) return;
        const interval = setInterval(() => {
            setHeroIndex(prev => (prev + 1) % heroSlides.length);
        }, 6000);
        return () => clearInterval(interval);
    }, [heroSlides.length]);

    const hero = heroSlides[heroIndex] || null;

    const handleSelectMedia = (item) => {
        // Franchise / saga cards (from /api/v1/home): open the LATEST film in the saga.
        if (item && item.is_franchise && item.latest_film && item.latest_film.slug) {
            navigation.navigate('TitleDetail', {
                slug: item.latest_film.slug,
                item: { id: item.id, slug: item.latest_film.slug, title: item.latest_film.title, year: item.latest_film.year, type: 'movie', poster: item.poster, popularity: item.in_catalog, rating: 0 },
            });
            return;
        }
        navigation.navigate('TitleDetail', { slug: (item.slug || String(item.id)), item });
    };

    const handleSelectCategory = (cat) => {
        if (!cat) return;
        const id = cat.id || '';

        const PLATFORM_MAP = {
            'on-max': 'max',
            'max': 'max',
            'on-disney-plus': 'disney-plus',
            'disney-plus': 'disney-plus',
            'on-netflix': 'netflix',
            'netflix': 'netflix',
            'on-prime-video': 'prime-video',
            'prime-video': 'prime-video',
            'on-hulu': 'hulu',
            'hulu': 'hulu',
            'on-apple-tv': 'apple-tv-plus',
            'on-apple-tv-plus': 'apple-tv-plus',
            'apple-tv-plus': 'apple-tv-plus',
            'on-paramount-plus': 'paramount-plus',
            'paramount-plus': 'paramount-plus',
            'on-peacock': 'peacock',
            'peacock': 'peacock',
            'on-crunchyroll': 'crunchyroll',
            'crunchyroll': 'crunchyroll',
            'universal-pictures': 'universal-pictures',
            'sony-pictures': 'sony-pictures',
            'marvel': 'marvel',
            'dc': 'dc',
            'pixar': 'pixar',
            'disney': 'disney'
        };

        if (PLATFORM_MAP[id]) {
            const targetSlug = PLATFORM_MAP[id];
            navigation.navigate('CollectionDetail', {
                slug: targetSlug,
                collection: {
                    slug: targetSlug,
                    name: cat.title || targetSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                    kind: 'studio',
                    cover_image: cat.items?.[0]?.backdrop || cat.items?.[0]?.poster
                },
                initialItems: cat.items || []
            });
        } else if (id === 'latest-movies' || id === 'popular-movies') {
            navigation.navigate('Movies', { filter: id === 'latest-movies' ? 'latest' : 'popular' });
        } else if (id === 'latest-tv') {
            navigation.navigate('TV', { filter: 'latest' });
        } else if (id === 'ongoing-tv') {
            navigation.navigate('TV', { filter: 'ongoing' });
        } else if (id === 'popular-series') {
            navigation.navigate('TV', { filter: 'popular' });
        } else if (id === 'anime' || id === 'anime-picks') {
            navigation.navigate('Anime', { filter: 'all' });
        } else if (id === 'short-dramas' || id === 'hot-short-dramas') {
            navigation.navigate('ShortDramas', { filter: 'all' });
        } else if (id === 'latest-animation') {
            navigation.navigate('Genres', { genreSlug: 'animation', sort: 'year' });
        } else if (id === 'k-drama' || id === 'c-drama' || id === 'pakistani-dramas' || id === 'indian-cinema' || id === 'arabic-cinema') {
            const targetSlug = cat.viewAllValue || id;
            navigation.navigate('CollectionDetail', {
                slug: targetSlug,
                collection: { slug: targetSlug, name: cat.title || targetSlug },
                initialItems: cat.items || []
            });
        } else if (['action', 'adventure', 'animation', 'comedy', 'crime', 'documentary', 'drama', 'family', 'fantasy', 'history', 'horror', 'mystery', 'romance', 'science-fiction', 'thriller', 'war', 'western'].includes(id)) {
            navigation.navigate('Genres', { genreSlug: id });
        } else {
            navigation.navigate('Browse', {
                categoryId: id,
                categoryTitle: cat.title,
                initialItems: cat.items || []
            });
        }
    };

    const toggleHeroWatchlist = () => {
        if (!hero) return;
        if (WatchlistAPI.isSaved(hero.id)) {
            WatchlistAPI.remove(hero.id);
            Alert.alert('Removed', `${hero.title} removed from Watchlist`);
        } else {
            WatchlistAPI.add(hero);
            Alert.alert('Saved', `${hero.title} added to Watchlist`);
        }
    };

    return (
        <SafeAreaView style={styles.screen}>
            <AppHeader navigation={navigation} activeRoute="Home" />

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Hero Banner */}
                {hero && (
                    <View style={[styles.heroContainer, { height: responsive.heroHeight }]}>
                        <Poster
                            url={hero.backdrop || hero.poster}
                            title={hero.title}
                            style={StyleSheet.absoluteFill}
                            resizeMode="cover"
                        />
                        <View style={[styles.heroOverlay, { padding: responsive.isMobile ? 14 : 24, paddingBottom: responsive.isMobile ? 24 : 40 }]}>
                            <View style={styles.heroBadgeRow}>
                                <View style={styles.heroTypeBadge}>
                                    <Text style={styles.heroTypeBadgeText}>
                                        {hero.type === 'anime' ? 'ANIME' : hero.type === 'tv' ? 'TV SERIES' : hero.type === 'short_drama' ? 'SHORT TV' : 'FEATURED FILM'}
                                    </Text>
                                </View>
                                {hero.rating && (
                                    <View style={styles.heroRatingBadge}>
                                        <Text style={styles.heroRatingStar}>★</Text>
                                        <Text style={styles.heroRatingVal}>{Number(hero.rating).toFixed(1)}</Text>
                                    </View>
                                )}
                            </View>

                            <Text style={[styles.heroTitle, { fontSize: responsive.heroTitleSize }]} numberOfLines={2}>{hero.title}</Text>

                            <Text style={styles.heroMeta}>
                                {hero.year} {hero.runtime ? `• ${hero.runtime}m` : ''} {hero.seasons ? `• ${hero.seasons} Seasons` : ''}
                            </Text>

                            <Text style={styles.heroOverview} numberOfLines={3}>
                                {hero.overview || hero.description || 'Watch now on ShadowStream cinematic catalog.'}
                            </Text>

                            <View style={styles.heroActionsRow}>
                                <TouchableOpacity
                                    style={styles.heroPrimaryBtn}
                                    onPress={() => navigation.navigate('Player', { slug: hero.slug || String(hero.id), item: hero })}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.heroPrimaryBtnIcon}>▶</Text>
                                    <Text style={styles.heroPrimaryBtnText}>Watch Now</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.heroSecondaryBtn}
                                    onPress={() => handleSelectMedia(hero)}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.heroSecondaryBtnIcon}>ℹ️</Text>
                                    <Text style={styles.heroSecondaryBtnText}>Details</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.heroSecondaryBtn}
                                    onPress={toggleHeroWatchlist}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.heroSecondaryBtnIcon}>🔖</Text>
                                    <Text style={styles.heroSecondaryBtnText}>Watchlist</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Slide Indicators */}
                        {heroSlides.length > 1 && (
                            <View style={styles.heroDotsRow}>
                                {heroSlides.map((_, idx) => (
                                    <TouchableOpacity
                                        key={idx}
                                        style={[styles.heroDot, idx === heroIndex && styles.heroDotActive]}
                                        onPress={() => setHeroIndex(idx)}
                                    />
                                ))}
                            </View>
                        )}
                    </View>
                )}

                {/* 🎲 Surprise Me — Random title discovery picker */}
                <View style={styles.surpriseRow}>
                    <TouchableOpacity
                        style={styles.surpriseCard}
                        onPress={() => setSurpriseOpen(true)}
                        accessibilityRole="button"
                        accessibilityLabel="Open Surprise Me random title picker"
                        activeOpacity={0.85}
                    >
                        <Text style={styles.surpriseDice}>🎲</Text>
                        <View style={styles.surpriseTextCol}>
                            <Text style={styles.surpriseEyebrow}>CAN'T DECIDE?</Text>
                            <Text style={styles.surpriseTitle}>Surprise Me</Text>
                            <Text style={styles.surpriseSub}>Random pick across 13k+ titles — rated 7.0+</Text>
                        </View>
                        <Text style={styles.surpriseArrow}>›</Text>
                    </TouchableOpacity>
                </View>

                {/* Continue Watching Section */}
                {continueWatching.length > 0 && (
                    <View style={styles.continueSection}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Continue Watching</Text>
                            <Text style={styles.sectionMeta}>{continueWatching.length} in progress</Text>
                        </View>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.continueList}
                        >
                            {continueWatching.map((item, idx) => (
                                <View key={`${item.id}-${idx}`} style={styles.continueCardSlot}>
                                    <MediaCard
                                        item={item}
                                        onPress={(it) => navigation.navigate('Player', {
                                            slug: it.slug || String(it.id),
                                            item: it,
                                            season: it.season || undefined,
                                            episode: it.episode || undefined,
                                        })}
                                        showProgress
                                    />
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* Discovery Categories (16 Rows) — or Offline Hub when API is unreachable */}
                {loading ? (
                    <SkeletonGrid count={8} numCols={responsive.gridColumns} />
                ) : apiStatus !== 'ok' || categories.length === 0 ? (
                    <View style={styles.offlineHub}>
                        <View style={styles.offlineHeroCard}>
                            <Text style={styles.offlineHeroBadge}>⚠ CATALOG UNREACHABLE</Text>
                            <Text style={styles.offlineHeroTitle}>
                                ShadowStream Cinematic Discovery is offline
                            </Text>
                            <Text style={styles.offlineHeroSub}>
                                The discovery engine behind this site can't be reached from this origin right now.
                                You can still browse the full structure of the catalog using the sections below —
                                they pull directly from local data and will surface real titles once the backend is reachable.
                            </Text>
                            <TouchableOpacity
                                style={styles.offlineRetryBtn}
                                onPress={loadHome}
                                activeOpacity={0.8}
                                accessibilityRole="button"
                                accessibilityLabel="Retry loading discovery data"
                            >
                                <Text style={styles.offlineRetryBtnText}>↻ Retry Discovery</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.offlineSectionHeader}>
                            <Text style={styles.sectionTitle}>Browse by Section</Text>
                            <Text style={styles.sectionMeta}>Curated rails</Text>
                        </View>
                        <View style={styles.offlineGrid}>
                            {[
                                { id: 'movies', label: 'Movies Hub', sub: 'Theatrical features', screen: 'Movies', emoji: '🎬' },
                                { id: 'tv', label: 'TV Shows', sub: 'Series & seasons', screen: 'TV', emoji: '📺' },
                                { id: 'anime', label: 'Anime Ecosystem', sub: 'Sub & dub', screen: 'Anime', emoji: '⚡' },
                                { id: 'short', label: 'Short TV Dramas', sub: 'Vertical & reels', screen: 'ShortDramas', emoji: '📱' },
                                { id: 'genres', label: 'Genres', sub: '27 categories', screen: 'Genres', emoji: '🏷️' },
                                { id: 'countries', label: 'Countries', sub: '42 nations', screen: 'Countries', emoji: '🌍' },
                                { id: 'collections', label: 'Collections', sub: '68 franchises', screen: 'Collections', emoji: '📦' },
                                { id: 'search', label: 'Global Search', sub: 'Find a title', screen: 'Search', emoji: '🔍' }
                            ].map(tile => (
                                <TouchableOpacity
                                    key={tile.id}
                                    style={styles.offlineTile}
                                    onPress={() => navigation.navigate(tile.screen)}
                                    activeOpacity={0.85}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Open ${tile.label}`}
                                >
                                    <Text style={styles.offlineTileEmoji}>{tile.emoji}</Text>
                                    <Text style={styles.offlineTileLabel}>{tile.label}</Text>
                                    <Text style={styles.offlineTileSub}>{tile.sub}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.offlineSourcesCard}>
                            <Text style={styles.cardTitle}>Source Mirrors</Text>
                            <Text style={styles.cardLine}>• Internet Archive • Blender Open Movies • Wikimedia Commons</Text>
                            <Text style={styles.cardLine}>• Creative Commons • Prelinger Archives</Text>
                        </View>

                        {featured.length > 0 ? (
                            <View style={styles.featuredSection}>
                                <View style={styles.offlineSectionHeader}>
                                    <Text style={styles.sectionTitle}>Top Picks (offline-ready)</Text>
                                    <Text style={styles.sectionMeta}>{featured.length} titles</Text>
                                </View>
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.featuredRail}
                                >
                                    {featured.map(p => (
                                        <TouchableOpacity
                                            key={p.id}
                                            style={styles.featuredCard}
                                            onPress={() => navigation.navigate('TitleDetail', { slug: p.slug || String(p.id), item: p })}
                                            activeOpacity={0.85}
                                            accessibilityRole="button"
                                            accessibilityLabel={`Open ${p.title}`}
                                        >
                                            <Poster url={p.poster} title={p.title} style={styles.featuredPoster} resizeMode="cover" />
                                            <View style={styles.featuredOverlay}>
                                                <Text style={styles.featuredTitle} numberOfLines={2}>{p.title}</Text>
                                                <Text style={styles.featuredMeta}>
                                                    {p.year ? `${p.year} · ` : ''}{p.rating ? `★ ${Number(p.rating).toFixed(1)}` : ''}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        ) : null}
                    </View>
                ) : (
                    categories.map(cat => (
                        <CategoryRow
                            key={cat.id}
                            category={cat}
                            onSelectMedia={handleSelectMedia}
                            onSelectCategory={handleSelectCategory}
                        />
                    ))
                )}

                {/* Bottom Legal Notice */}
                <View style={styles.footerNotice}>
                    <Text style={styles.footerTitle}>STREAMAPP CINEMATIC AGGREGATOR</Text>
                    <Text style={styles.footerSub}>
                        Free, all-access personal aggregator. Player tries multiple verified legal sources
                        {'\n'}(Archive.org, Creative Commons, and Public Domain content).
                    </Text>
                </View>
            </ScrollView>

            <SurpriseModal
                visible={surpriseOpen}
                onClose={() => setSurpriseOpen(false)}
                navigation={navigation}
            />

            <MobileTabBar navigation={navigation} activeRoute="Home" />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: COLORS.bg
    },
    heroContainer: {
        height: 480,
        position: 'relative',
        marginBottom: 24,
        justifyContent: 'flex-end',
        backgroundColor: COLORS.surface
    },
    heroContainerDesktop: {
        height: 560
    },
    heroOverlay: {
        padding: 24,
        paddingBottom: 40,
        backgroundColor: 'rgba(10, 10, 10, 0.75)',
        width: '100%',
        maxWidth: 720
    },
    heroBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        gap: 8
    },
    heroTypeBadge: {
        backgroundColor: COLORS.brand,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4
    },
    heroTypeBadgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5
    },
    heroRatingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 4
    },
    heroRatingStar: {
        color: COLORS.gold,
        fontSize: 10,
        marginRight: 3
    },
    heroRatingVal: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '700'
    },
    heroTitle: {
        color: COLORS.textPrimary,
        fontSize: 32,
        fontWeight: '900',
        letterSpacing: -0.5,
        marginBottom: 6
    },
    heroMeta: {
        color: COLORS.textSecondary,
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 10
    },
    heroOverview: {
        color: COLORS.textMuted,
        fontSize: 13,
        lineHeight: 20,
        marginBottom: 18
    },
    heroActionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },
    heroPrimaryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.brand,
        paddingHorizontal: 20,
        paddingVertical: 11,
        borderRadius: 6
    },
    heroPrimaryBtnIcon: {
        color: '#FFFFFF',
        fontSize: 14,
        marginRight: 6
    },
    heroPrimaryBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700'
    },
    heroSecondaryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.12)',
        paddingHorizontal: 16,
        paddingVertical: 11,
        borderRadius: 6
    },
    heroSecondaryBtnIcon: {
        fontSize: 13,
        marginRight: 6
    },
    heroSecondaryBtnText: {
        color: COLORS.textPrimary,
        fontSize: 13,
        fontWeight: '600'
    },
    heroDotsRow: {
        position: 'absolute',
        bottom: 12,
        right: 24,
        flexDirection: 'row',
        gap: 6
    },
    heroDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.3)'
    },
    heroDotActive: {
        width: 22,
        backgroundColor: COLORS.brand
    },
    continueSection: {
        marginBottom: 28
    },
    surpriseRow: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    surpriseCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingVertical: 18,
        paddingHorizontal: 22,
        borderRadius: 14,
        backgroundColor: 'rgba(255,91,107,0.10)',
        borderWidth: 1,
        borderColor: 'rgba(255,91,107,0.45)',
    },
    surpriseDice: { fontSize: 36 },
    surpriseTextCol: { flex: 1 },
    surpriseEyebrow: { color: '#ff5b6b', fontSize: 10, letterSpacing: 1.5, fontWeight: '700' },
    surpriseTitle: { color: COLORS.textPrimary, fontSize: 22, fontWeight: '800', marginTop: 2 },
    surpriseSub: { color: COLORS.textSecondary, fontSize: 12, marginTop: 3 },
    surpriseArrow: { color: '#ff5b6b', fontSize: 32, fontWeight: '300' },
    sectionHeader: {
        paddingHorizontal: 20,
        marginBottom: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    sectionTitle: {
        color: COLORS.textPrimary,
        fontSize: 19,
        fontWeight: '800'
    },
    sectionMeta: {
        color: COLORS.brand,
        fontSize: 12,
        fontWeight: '600'
    },
    continueList: {
        paddingLeft: 20,
        paddingRight: 8
    },
    continueCardSlot: {
        marginRight: 14
    },
    footerNotice: {
        padding: 30,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        marginTop: 20,
        marginBottom: 40
    },
    footerTitle: {
        color: COLORS.textSecondary,
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1,
        marginBottom: 6
    },
    footerSub: {
        color: COLORS.textMuted,
        fontSize: 11,
        textAlign: 'center',
        lineHeight: 18
    },
    offlineHub: {
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 24
    },
    offlineHeroCard: {
        backgroundColor: 'rgba(245, 158, 11, 0.08)',
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.35)',
        borderRadius: 12,
        padding: 20,
        marginBottom: 24
    },
    offlineHeroBadge: {
        color: '#fbbf24',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1,
        marginBottom: 8
    },
    offlineHeroTitle: {
        color: COLORS.textPrimary,
        fontSize: 22,
        fontWeight: '900',
        marginBottom: 8,
        letterSpacing: -0.3
    },
    offlineHeroSub: {
        color: COLORS.textSecondary,
        fontSize: 13,
        lineHeight: 20,
        marginBottom: 14
    },
    offlineRetryBtn: {
        backgroundColor: 'rgba(251, 191, 36, 0.18)',
        borderColor: '#fbbf24',
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 9,
        borderRadius: 6,
        alignSelf: 'flex-start'
    },
    offlineRetryBtnText: {
        color: '#fbbf24',
        fontSize: 13,
        fontWeight: '700'
    },
    offlineSectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 14
    },
    offlineGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -6,
        marginBottom: 24
    },
    offlineTile: {
        width: '46%',
        marginHorizontal: '2%',
        marginBottom: 12,
        backgroundColor: COLORS.surfaceCard,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 16
    },
    offlineTileEmoji: {
        fontSize: 24,
        marginBottom: 8
    },
    offlineTileLabel: {
        color: COLORS.textPrimary,
        fontSize: 15,
        fontWeight: '800',
        marginBottom: 2
    },
    offlineTileSub: {
        color: COLORS.textMuted,
        fontSize: 11,
        fontWeight: '600'
    },
    offlineSourcesCard: {
        backgroundColor: COLORS.surfaceCard,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 10,
        padding: 18,
        marginBottom: 20
    },
    cardTitle: {
        color: COLORS.textMuted,
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1,
        marginBottom: 10
    },
    cardLine: {
        color: COLORS.textSecondary,
        fontSize: 12,
        lineHeight: 20
    },
    featuredSection: {
        marginTop: 18,
        marginBottom: 28
    },
    featuredRail: {
        paddingHorizontal: 4,
        paddingVertical: 4
    },
    featuredCard: {
        width: 140,
        marginRight: 12,
        backgroundColor: COLORS.surfaceCard,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: 'hidden',
        position: 'relative'
    },
    featuredPoster: {
        width: '100%',
        height: 200
    },
    featuredOverlay: {
        position: 'absolute',
        left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(10,10,10,0.85)',
        paddingHorizontal: 8,
        paddingVertical: 6
    },
    featuredTitle: {
        color: COLORS.textPrimary,
        fontSize: 11,
        fontWeight: '700',
        marginBottom: 2
    },
    featuredMeta: {
        color: COLORS.textMuted,
        fontSize: 10,
        fontWeight: '600'
    }
});

