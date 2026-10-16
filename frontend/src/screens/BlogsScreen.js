import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
    ActivityIndicator, useWindowDimensions, TextInput, SafeAreaView
} from 'react-native';
import { COLORS } from '../theme/colors';
import AppHeader from '../components/AppHeader';
import MobileTabBar from '../components/MobileTabBar';
import { getApiBase } from '../utils/api';
import { useRouteMeta } from '../utils/useRouteMeta';

const CATEGORIES = [
    { id: 'all', label: 'All Guides' },
    { id: 'world-cinema', label: 'World Cinema' },
    { id: 'latest-releases', label: '2026 Releases' },
    { id: 'anime', label: 'Anime Classics' },
    { id: 'short-dramas', label: 'Short TV Dramas' },
    { id: 'classics', label: '40 Years of Film' },
    { id: 'tv-series', label: 'Ongoing Global TV' }
];

export default function BlogsScreen({ navigation }) {
    const { width } = useWindowDimensions();
    const isDesktop = width >= 1024;
    const isTablet = width >= 768 && width < 1024;
    const numColumns = isDesktop ? 3 : (isTablet ? 2 : 1);

    const [blogs, setBlogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    useRouteMeta({
        title: 'Editorial Streaming Guides & Cinematic Deep Dives — ShadowStream',
        description: 'Explore expert editorial guides, 40-year cinema retrospectives, anime evolutions, Pakistani drama renaissance, and 2026 anticipated streaming previews.',
        keywords: 'streaming blogs, cinematic guides, anime history, short dramas, 2026 movies, ShadowStream editorial',
        url: 'https://ssmoviestvs.site/blogs'
    });

    useEffect(() => {
        let cancelled = false;
        const fetchBlogs = async () => {
            try {
                const base = getApiBase();
                const res = await fetch(`${base}/blogs`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                const items = data.items || data.blogs || (Array.isArray(data) ? data : []);
                if (!cancelled) {
                    setBlogs(items);
                    setLoading(false);
                }
            } catch (err) {
                console.warn('Failed to load blogs from API, loading fallback:', err);
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        fetchBlogs();
        return () => { cancelled = true; };
    }, []);

    const filteredBlogs = blogs.filter(b => {
        const matchesCategory = selectedCategory === 'all' || b.category === selectedCategory;
        const matchesSearch = !searchQuery.trim() ||
            b.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            b.meta_description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            b.region?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const heroBlog = filteredBlogs.length > 0 ? filteredBlogs[0] : null;
    const gridBlogs = filteredBlogs.length > 1 ? filteredBlogs.slice(1) : [];

    const onOpenBlog = (slug) => {
        navigation.navigate('BlogDetail', { slug });
    };

    return (
        <SafeAreaView style={styles.container}>
            <AppHeader navigation={navigation} activeRoute="Blogs" title="Editorial" />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Header Banner */}
                <View style={styles.heroBanner}>
                    <View style={styles.heroBadgeRow}>
                        <View style={styles.heroBadge}>
                            <Text style={styles.heroBadgeText}>EDITORIAL INTELLIGENCE</Text>
                        </View>
                        <Text style={styles.heroDot}>•</Text>
                        <Text style={styles.heroSubText}>138,000+ Titles Analyzed Across 42 Nations</Text>
                    </View>
                    <Text style={styles.heroTitle}>
                        Cinematic Editorial & <Text style={{ color: COLORS.brand }}>Streaming Guides</Text>
                    </Text>
                    <Text style={styles.heroLead}>
                        In-depth cultural critiques, historical deep dives, and curated viewing roadmaps powered by Gemma 4 Intelligence and ShadowStream's multi-mirror catalog.
                    </Text>

                    {/* Search & Filter Bar */}
                    <View style={styles.searchBarContainer}>
                        <View style={styles.searchInputWrap}>
                            <Text style={styles.searchIcon}>🔍</Text>
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search editorial guides, topics, countries, or franchises..."
                                placeholderTextColor={COLORS.textMuted}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn}>
                                    <Text style={styles.clearBtnText}>✕</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {/* Category Filter Chips */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll} contentContainerStyle={styles.categoryContent}>
                        {CATEGORIES.map(cat => {
                            const isSelected = selectedCategory === cat.id;
                            return (
                                <TouchableOpacity
                                    key={cat.id}
                                    style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
                                    onPress={() => setSelectedCategory(cat.id)}
                                >
                                    <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextActive]}>
                                        {cat.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                {loading ? (
                    <View style={styles.loadingWrap}>
                        <ActivityIndicator size="large" color={COLORS.brand} />
                        <Text style={styles.loadingText}>Loading editorial archives...</Text>
                    </View>
                ) : filteredBlogs.length === 0 ? (
                    <View style={styles.emptyWrap}>
                        <Text style={styles.emptyIcon}>📚</Text>
                        <Text style={styles.emptyTitle}>No Guides Found</Text>
                        <Text style={styles.emptySub}>No editorial articles match your selected filter or query.</Text>
                        <TouchableOpacity style={styles.resetBtn} onPress={() => { setSelectedCategory('all'); setSearchQuery(''); }}>
                            <Text style={styles.resetBtnText}>Reset Filters</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.contentWrap}>
                        {/* Featured Hero Guide */}
                        {heroBlog && (
                            <TouchableOpacity
                                style={styles.featuredCard}
                                activeOpacity={0.88}
                                onPress={() => onOpenBlog(heroBlog.slug)}
                            >
                                <View style={[styles.featuredImageWrap, isDesktop && styles.featuredImageWrapDesktop]}>
                                    <Image
                                        source={{ uri: heroBlog.cover_image }}
                                        style={styles.featuredImage}
                                        resizeMode="cover"
                                    />
                                    <View style={styles.featuredBadgeOverlay}>
                                        <Text style={styles.featuredPill}>FEATURED LEAD GUIDE</Text>
                                        <Text style={styles.readingTimePill}>⏱️ {heroBlog.reading_time || '6 min read'}</Text>
                                    </View>
                                </View>

                                <View style={styles.featuredContent}>
                                    <View style={styles.metaRow}>
                                        <Text style={styles.categoryTag}>{heroBlog.category?.toUpperCase()}</Text>
                                        <Text style={styles.metaDot}>•</Text>
                                        <Text style={styles.regionTag}>{heroBlog.region}</Text>
                                    </View>
                                    <Text style={styles.featuredTitle}>{heroBlog.title}</Text>
                                    <Text style={styles.featuredDesc} numberOfLines={3}>
                                        {heroBlog.meta_description}
                                    </Text>

                                    <View style={styles.featuredFooter}>
                                        <View style={styles.authorRow}>
                                            <View style={styles.authorAvatar}>
                                                <Text style={styles.avatarIcon}>🎬</Text>
                                            </View>
                                            <View>
                                                <Text style={styles.authorName}>{heroBlog.author || 'ShadowStream Editorial'}</Text>
                                                <Text style={styles.publishDate}>Verified Editorial</Text>
                                            </View>
                                        </View>
                                        <View style={styles.readMoreBtn}>
                                            <Text style={styles.readMoreText}>Read Guide</Text>
                                            <Text style={styles.readMoreArrow}> →</Text>
                                        </View>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        )}

                        {/* Editorial Guides Grid */}
                        {gridBlogs.length > 0 && (
                            <View style={styles.gridSection}>
                                <Text style={styles.sectionHeading}>Latest Editorial Deep Dives</Text>
                                <View style={[styles.grid, { gap: 20 }]}>
                                    {gridBlogs.map((b) => (
                                        <TouchableOpacity
                                            key={b.slug}
                                            style={[
                                                styles.blogCard,
                                                { width: numColumns === 1 ? '100%' : (numColumns === 2 ? '48.5%' : '31.8%') }
                                            ]}
                                            activeOpacity={0.85}
                                            onPress={() => onOpenBlog(b.slug)}
                                        >
                                            <View style={styles.cardImageWrap}>
                                                <Image
                                                    source={{ uri: b.cover_image }}
                                                    style={styles.cardImage}
                                                    resizeMode="cover"
                                                />
                                                <View style={styles.cardCategoryOverlay}>
                                                    <Text style={styles.cardCategoryText}>{b.category?.toUpperCase()}</Text>
                                                </View>
                                                <View style={styles.cardTimeOverlay}>
                                                    <Text style={styles.cardTimeText}>⏱️ {b.reading_time || '5 min'}</Text>
                                                </View>
                                            </View>

                                            <View style={styles.cardBody}>
                                                <Text style={styles.cardRegion}>{b.region}</Text>
                                                <Text style={styles.cardTitle} numberOfLines={2}>{b.title}</Text>
                                                <Text style={styles.cardDesc} numberOfLines={3}>{b.meta_description}</Text>

                                                <View style={styles.cardFooter}>
                                                    <Text style={styles.cardAuthor}>ShadowStream Intelligence</Text>
                                                    <Text style={styles.cardCta}>Read →</Text>
                                                </View>
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        )}
                    </View>
                )}

                {/* Footer Citation Banner */}
                <View style={styles.seoFooter}>
                    <Text style={styles.seoFooterTitle}>STREAMAPP EDITORIAL STANDARDS</Text>
                    <Text style={styles.seoFooterText}>
                        All guides and analyses are generated in compliance with global streaming standards, cross-referenced with 138,000+ catalog titles, official TMDB metadata, and multi-mirror streaming verification.
                    </Text>
                </View>
            </ScrollView>

            <MobileTabBar navigation={navigation} activeRoute="Blogs" />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg
    },
    scrollContent: {
        paddingBottom: 90
    },
    heroBanner: {
        paddingHorizontal: 24,
        paddingTop: 32,
        paddingBottom: 24,
        backgroundColor: COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border
    },
    heroBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12
    },
    heroBadge: {
        backgroundColor: 'rgba(229, 9, 20, 0.15)',
        borderColor: COLORS.brand,
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 4
    },
    heroBadgeText: {
        color: COLORS.brand,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.8
    },
    heroDot: {
        color: COLORS.textMuted,
        marginHorizontal: 8
    },
    heroSubText: {
        color: COLORS.textMuted,
        fontSize: 12
    },
    heroTitle: {
        color: COLORS.text,
        fontSize: 28,
        fontWeight: '900',
        letterSpacing: -0.5,
        marginBottom: 10
    },
    heroLead: {
        color: COLORS.textMuted,
        fontSize: 15,
        lineHeight: 22,
        maxWidth: 800,
        marginBottom: 20
    },
    searchBarContainer: {
        marginBottom: 16
    },
    searchInputWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surfaceAlt,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingHorizontal: 14,
        height: 46
    },
    searchIcon: {
        fontSize: 16,
        marginRight: 10
    },
    searchInput: {
        flex: 1,
        color: COLORS.text,
        fontSize: 14
    },
    clearBtn: {
        padding: 6
    },
    clearBtnText: {
        color: COLORS.textMuted,
        fontSize: 14
    },
    categoryScroll: {
        marginTop: 4
    },
    categoryContent: {
        flexDirection: 'row',
        gap: 8,
        paddingRight: 16
    },
    categoryChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: COLORS.surfaceAlt,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    categoryChipActive: {
        backgroundColor: COLORS.brand,
        borderColor: COLORS.brand
    },
    categoryChipText: {
        color: COLORS.textMuted,
        fontSize: 13,
        fontWeight: '600'
    },
    categoryChipTextActive: {
        color: '#FFFFFF',
        fontWeight: '700'
    },
    loadingWrap: {
        padding: 60,
        alignItems: 'center'
    },
    loadingText: {
        color: COLORS.textMuted,
        marginTop: 12,
        fontSize: 14
    },
    emptyWrap: {
        padding: 60,
        alignItems: 'center'
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: 12
    },
    emptyTitle: {
        color: COLORS.text,
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 8
    },
    emptySub: {
        color: COLORS.textMuted,
        fontSize: 14,
        marginBottom: 20
    },
    resetBtn: {
        backgroundColor: COLORS.brand,
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 6
    },
    resetBtnText: {
        color: '#FFFFFF',
        fontWeight: '700'
    },
    contentWrap: {
        paddingHorizontal: 24,
        paddingTop: 24
    },
    featuredCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: 'hidden',
        marginBottom: 32
    },
    featuredImageWrap: {
        width: '100%',
        height: 280,
        position: 'relative'
    },
    featuredImageWrapDesktop: {
        height: 380
    },
    featuredImage: {
        width: '100%',
        height: '100%'
    },
    featuredBadgeOverlay: {
        position: 'absolute',
        top: 14,
        left: 14,
        flexDirection: 'row',
        gap: 8
    },
    featuredPill: {
        backgroundColor: COLORS.brand,
        color: '#FFF',
        fontSize: 11,
        fontWeight: '800',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 4,
        letterSpacing: 0.5
    },
    readingTimePill: {
        backgroundColor: 'rgba(0,0,0,0.75)',
        color: '#FFF',
        fontSize: 11,
        fontWeight: '600',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 4
    },
    featuredContent: {
        padding: 24
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8
    },
    categoryTag: {
        color: COLORS.brand,
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.5
    },
    metaDot: {
        color: COLORS.textMuted,
        marginHorizontal: 8
    },
    regionTag: {
        color: COLORS.textMuted,
        fontSize: 12
    },
    featuredTitle: {
        color: COLORS.text,
        fontSize: 22,
        fontWeight: '800',
        lineHeight: 28,
        marginBottom: 10
    },
    featuredDesc: {
        color: COLORS.textMuted,
        fontSize: 14,
        lineHeight: 22,
        marginBottom: 20
    },
    featuredFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: COLORS.border
    },
    authorRow: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    authorAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.surfaceAlt,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10
    },
    avatarIcon: {
        fontSize: 16
    },
    authorName: {
        color: COLORS.text,
        fontSize: 13,
        fontWeight: '600'
    },
    publishDate: {
        color: COLORS.textMuted,
        fontSize: 11
    },
    readMoreBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.brand,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 6
    },
    readMoreText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 13
    },
    readMoreArrow: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700'
    },
    gridSection: {
        marginBottom: 24
    },
    sectionHeading: {
        color: COLORS.text,
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 16
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap'
    },
    blogCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: 'hidden',
        marginBottom: 12
    },
    cardImageWrap: {
        width: '100%',
        height: 180,
        position: 'relative'
    },
    cardImage: {
        width: '100%',
        height: '100%'
    },
    cardCategoryOverlay: {
        position: 'absolute',
        top: 10,
        left: 10,
        backgroundColor: 'rgba(0,0,0,0.75)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4
    },
    cardCategoryText: {
        color: COLORS.brand,
        fontSize: 10,
        fontWeight: '700'
    },
    cardTimeOverlay: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: 'rgba(0,0,0,0.75)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4
    },
    cardTimeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '600'
    },
    cardBody: {
        padding: 16
    },
    cardRegion: {
        color: COLORS.textMuted,
        fontSize: 11,
        fontWeight: '500',
        marginBottom: 6
    },
    cardTitle: {
        color: COLORS.text,
        fontSize: 15,
        fontWeight: '700',
        lineHeight: 20,
        marginBottom: 8
    },
    cardDesc: {
        color: COLORS.textMuted,
        fontSize: 13,
        lineHeight: 18,
        marginBottom: 14
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: COLORS.border
    },
    cardAuthor: {
        color: COLORS.textMuted,
        fontSize: 11
    },
    cardCta: {
        color: COLORS.brand,
        fontSize: 12,
        fontWeight: '700'
    },
    seoFooter: {
        marginHorizontal: 24,
        marginTop: 20,
        padding: 20,
        backgroundColor: COLORS.surfaceAlt,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    seoFooterTitle: {
        color: COLORS.textMuted,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.8,
        marginBottom: 6
    },
    seoFooterText: {
        color: COLORS.textMuted,
        fontSize: 12,
        lineHeight: 18
    }
});
