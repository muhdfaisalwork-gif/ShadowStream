import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
    ActivityIndicator, useWindowDimensions, SafeAreaView, Platform, Linking
} from 'react-native';
import { COLORS } from '../theme/colors';
import AppHeader from '../components/AppHeader';
import MobileTabBar from '../components/MobileTabBar';
import { getApiBase } from '../utils/api';
import { useRouteMeta } from '../utils/useRouteMeta';

export default function BlogDetailScreen({ route, navigation }) {
    const { slug } = route.params || {};
    const { width } = useWindowDimensions();
    const isDesktop = width >= 1024;
    const isTablet = width >= 768 && width < 1024;

    const [blog, setBlog] = useState(null);
    const [relatedBlogs, setRelatedBlogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expandedFaq, setExpandedFaq] = useState({});

    useRouteMeta({
        title: blog ? `${blog.title} — ShadowStream Editorial` : 'Editorial Guide — ShadowStream',
        description: blog?.meta_description || 'In-depth cinematic guide and streaming analysis.',
        keywords: blog?.tags?.join(', ') || 'streaming, cinema, movies, tv, anime',
        url: `https://ssmoviestvs.site/blog/${slug}`
    });

    const handleLinkPress = (url) => {
        if (!url) return;
        try {
            const parsed = new URL(url, 'https://ssmoviestvs.site');
            const pathname = parsed.pathname;
            if (pathname.startsWith('/title/')) {
                const targetSlug = pathname.replace('/title/', '');
                navigation.navigate('TitleDetail', { slug: targetSlug });
                return;
            }
            if (pathname.startsWith('/blog/')) {
                const targetSlug = pathname.replace('/blog/', '');
                if (navigation.push) {
                    navigation.push('BlogDetail', { slug: targetSlug });
                } else {
                    navigation.navigate('BlogDetail', { slug: targetSlug });
                }
                return;
            }
            if (pathname === '/movies') {
                navigation.navigate('Movies');
                return;
            }
            if (pathname === '/tv') {
                navigation.navigate('TV');
                return;
            }
            if (pathname.startsWith('/collection/')) {
                const targetSlug = pathname.replace('/collection/', '');
                navigation.navigate('CollectionDetail', { slug: targetSlug });
                return;
            }
            if (pathname.startsWith('/country/')) {
                const targetSlug = pathname.replace('/country/', '');
                navigation.navigate('CountryDetail', { slug: targetSlug });
                return;
            }
            if (pathname === '/anime') {
                navigation.navigate('Anime');
                return;
            }
            if (pathname === '/short-dramas') {
                navigation.navigate('ShortDramas');
                return;
            }
            if (pathname === '/genres') {
                navigation.navigate('Genres');
                return;
            }
            if (pathname === '/collections') {
                navigation.navigate('Collections');
                return;
            }
            Linking.openURL(url);
        } catch (_) {
            Linking.openURL(url);
        }
    };

    useEffect(() => {
        if (!slug) return;
        let cancelled = false;
        const fetchDetail = async () => {
            setLoading(true);
            try {
                const base = getApiBase();
                const res = await fetch(`${base}/blogs/${slug}`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                if (!cancelled) {
                    setBlog(data);
                    setLoading(false);
                }
            } catch (err) {
                console.warn('Failed to load blog detail:', err);
                if (!cancelled) {
                    setError('Article could not be loaded.');
                    setLoading(false);
                }
            }
        };

        const fetchRelated = async () => {
            try {
                const base = getApiBase();
                const res = await fetch(`${base}/blogs`);
                if (!res.ok) return;
                const data = await res.json();
                const list = Array.isArray(data) ? data : (data.items || data.blogs || []);
                if (!cancelled) {
                    setRelatedBlogs(list.filter(b => b.slug !== slug).slice(0, 3));
                }
            } catch (_) {}
        };

        fetchDetail();
        fetchRelated();
        return () => { cancelled = true; };
    }, [slug]);

    // Inject JSON-LD Schema on web
    useEffect(() => {
        if (Platform.OS === 'web' && blog?.schema && typeof document !== 'undefined') {
            const scriptId = 'streamapp-blog-jsonld';
            let el = document.getElementById(scriptId);
            if (!el) {
                el = document.createElement('script');
                el.id = scriptId;
                el.type = 'application/ld+json';
                document.head.appendChild(el);
            }
            el.text = JSON.stringify(blog.schema);
        }
    }, [blog]);

    const toggleFaq = (index) => {
        setExpandedFaq(prev => ({ ...prev, [index]: !prev[index] }));
    };

    const renderInlineFormatted = (text, keyPrefix) => {
        if (!text) return null;
        const regex = /(\*\*\[[^\]]+\]\([^)]+\)\*\*|\[\*\*[^*]+\*\*\]\([^)]+\)|\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|\*[^*]+\*)/g;
        const parts = text.split(regex);

        return parts.map((part, pIdx) => {
            if (!part) return null;
            const uniqueKey = `${keyPrefix}-${pIdx}`;

            // Bold link: **[label](url)**
            if (part.startsWith('**[') && part.endsWith(')**')) {
                const inner = part.slice(2, -2);
                const m = inner.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
                if (m) {
                    const [, label, url] = m;
                    return (
                        <Text
                            key={uniqueKey}
                            accessibilityRole="link"
                            href={url}
                            onPress={() => handleLinkPress(url)}
                            style={[styles.inlineLink, styles.inlineBold]}
                        >
                            {label}
                        </Text>
                    );
                }
            }

            // Bold link: [**label**](url)
            if (part.startsWith('[**') && part.includes('**](') && part.endsWith(')')) {
                const m = part.match(/^\[\*\*([^*]+)\*\*\]\(([^)]+)\)$/);
                if (m) {
                    const [, label, url] = m;
                    return (
                        <Text
                            key={uniqueKey}
                            accessibilityRole="link"
                            href={url}
                            onPress={() => handleLinkPress(url)}
                            style={[styles.inlineLink, styles.inlineBold]}
                        >
                            {label}
                        </Text>
                    );
                }
            }

            // Standard link: [label](url)
            if (part.startsWith('[') && part.endsWith(')')) {
                const m = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
                if (m) {
                    const [, label, url] = m;
                    return (
                        <Text
                            key={uniqueKey}
                            accessibilityRole="link"
                            href={url}
                            onPress={() => handleLinkPress(url)}
                            style={styles.inlineLink}
                        >
                            {label}
                        </Text>
                    );
                }
            }

            // Bold: **text**
            if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
                return (
                    <Text key={uniqueKey} style={styles.inlineBold}>
                        {part.slice(2, -2)}
                    </Text>
                );
            }

            // Italic: *text*
            if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
                return (
                    <Text key={uniqueKey} style={styles.inlineItalic}>
                        {part.slice(1, -1)}
                    </Text>
                );
            }

            return part;
        });
    };

    const renderMarkdownContent = (markdown, middleImage, middleAlt) => {
        if (!markdown) return null;
        const paragraphs = markdown.split('\n\n');
        const total = paragraphs.length;
        const midIndex = Math.max(2, Math.floor(total / 2));
        let midInserted = false;

        const elements = [];

        paragraphs.forEach((p, idx) => {
            const trimmed = p.trim();
            if (!trimmed) return;

            // Middle image injection
            if (idx >= midIndex && !midInserted && middleImage) {
                elements.push(
                    <View key="middle-img-box" style={styles.middleImageContainer}>
                        <Image
                            source={{ uri: middleImage }}
                            style={styles.middleImage}
                            resizeMode="cover"
                        />
                        <View style={styles.imageCaptionBar}>
                            <Text style={styles.imageCaptionText}>
                                📷 Visual Spotlight: {middleAlt || 'Production Still & Scene Analysis'}
                            </Text>
                        </View>
                    </View>
                );
                midInserted = true;
            }

            if (trimmed.startsWith('### ')) {
                elements.push(
                    <Text key={`h3-${idx}`} style={styles.contentH3}>
                        {renderInlineFormatted(trimmed.replace(/^###\s+/, ''), `h3-${idx}`)}
                    </Text>
                );
            } else if (trimmed.startsWith('## ')) {
                elements.push(
                    <Text key={`h2-${idx}`} style={styles.contentH2}>
                        {renderInlineFormatted(trimmed.replace(/^##\s+/, ''), `h2-${idx}`)}
                    </Text>
                );
            } else if (trimmed.startsWith('# ')) {
                elements.push(
                    <Text key={`h1-${idx}`} style={styles.contentH1}>
                        {renderInlineFormatted(trimmed.replace(/^#\s+/, ''), `h1-${idx}`)}
                    </Text>
                );
            } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                const lines = trimmed.split('\n');
                elements.push(
                    <View key={`list-${idx}`} style={styles.bulletList}>
                        {lines.map((li, lIdx) => (
                            <View key={`li-${idx}-${lIdx}`} style={styles.bulletItem}>
                                <Text style={styles.bulletDot}>•</Text>
                                <Text style={styles.bulletText}>
                                    {renderInlineFormatted(li.replace(/^[-*]\s+/, ''), `li-${idx}-${lIdx}`)}
                                </Text>
                            </View>
                        ))}
                    </View>
                );
            } else {
                elements.push(
                    <Text key={`p-${idx}`} style={styles.contentParagraph}>
                        {renderInlineFormatted(trimmed, `p-${idx}`)}
                    </Text>
                );
            }
        });

        if (!midInserted && middleImage) {
            elements.push(
                <View key="middle-img-box-end" style={styles.middleImageContainer}>
                    <Image
                        source={{ uri: middleImage }}
                        style={styles.middleImage}
                        resizeMode="cover"
                    />
                    <View style={styles.imageCaptionBar}>
                        <Text style={styles.imageCaptionText}>
                            📷 Visual Spotlight: {middleAlt || 'Production Still & Scene Analysis'}
                        </Text>
                    </View>
                </View>
            );
        }

        return elements;
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <AppHeader navigation={navigation} activeRoute="Blogs" title="Editorial" />
                <View style={styles.centeredState}>
                    <ActivityIndicator size="large" color={COLORS.brand} />
                    <Text style={styles.loadingText}>Retrieving cinematic editorial analysis...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (error || !blog) {
        return (
            <SafeAreaView style={styles.container}>
                <AppHeader navigation={navigation} activeRoute="Blogs" title="Editorial" />
                <View style={styles.centeredState}>
                    <Text style={styles.errorIcon}>⚠️</Text>
                    <Text style={styles.errorTitle}>Article Not Found</Text>
                    <Text style={styles.errorSub}>{error || 'The requested guide could not be located.'}</Text>
                    <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('Blogs')}>
                        <Text style={styles.backBtnText}>← Return to All Guides</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <AppHeader navigation={navigation} activeRoute="Blogs" title="Editorial" />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Breadcrumbs & Navigation */}
                <View style={styles.breadcrumbBar}>
                    <TouchableOpacity onPress={() => navigation.navigate('Home')}>
                        <Text style={styles.breadcrumbLink}>Home</Text>
                    </TouchableOpacity>
                    <Text style={styles.breadcrumbSep}>/</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Blogs')}>
                        <Text style={styles.breadcrumbLink}>Editorial Blogs</Text>
                    </TouchableOpacity>
                    <Text style={styles.breadcrumbSep}>/</Text>
                    <Text style={styles.breadcrumbCurrent} numberOfLines={1}>{blog.title}</Text>
                </View>

                {/* Article Header */}
                <View style={styles.articleHeader}>
                    <View style={styles.categoryBadgeRow}>
                        <View style={styles.categoryPill}>
                            <Text style={styles.categoryPillText}>{blog.category?.toUpperCase()}</Text>
                        </View>
                        <Text style={styles.metaDot}>•</Text>
                        <Text style={styles.readingTimeText}>⏱️ {blog.reading_time || '6 min read'}</Text>
                        <Text style={styles.metaDot}>•</Text>
                        <Text style={styles.regionText}>{blog.region}</Text>
                    </View>

                    <Text style={styles.articleTitle}>{blog.title}</Text>
                    <Text style={styles.articleLead}>{blog.meta_description}</Text>

                    {/* Author & Attribution Meta */}
                    <View style={styles.authorMetaBox}>
                        <View style={styles.authorAvatar}>
                            <Text style={styles.avatarIcon}>✍️</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.authorTitle}>{blog.author || 'ShadowStream Editorial & SEO Intelligence'}</Text>
                            <Text style={styles.authorSub}>
                                Evaluated against Global Streaming SEO Framework • 138K Catalog Index
                            </Text>
                        </View>
                        <View style={styles.seoBadge}>
                            <Text style={styles.seoBadgeText}>E-E-A-T VERIFIED</Text>
                        </View>
                    </View>
                </View>

                {/* 1. TOP HERO COVER PHOTO (Mandatory 1st Photo) */}
                <View style={styles.heroCoverWrapper}>
                    <Image
                        source={{ uri: blog.cover_image }}
                        style={[styles.heroCoverImage, isDesktop && styles.heroCoverImageDesktop]}
                        resizeMode="cover"
                    />
                    <View style={styles.heroCaptionBar}>
                        <Text style={styles.heroCaptionText}>
                            🌟 Lead Key Art: {blog.cover_image_alt || `${blog.title} official visual key art`}
                        </Text>
                    </View>
                </View>

                {/* Main Article Content */}
                <View style={[styles.mainContentLayout, isDesktop && styles.mainContentLayoutDesktop]}>
                    <View style={styles.articleBodyColumn}>
                        {renderMarkdownContent(blog.content_markdown, blog.middle_image, blog.middle_image_alt)}

                        {/* ShadowStream Streaming Callout */}
                        <View style={styles.streamAppCallout}>
                            <View style={styles.calloutHeader}>
                                <Text style={styles.calloutIcon}>🍿</Text>
                                <Text style={styles.calloutTitle}>Stream Seamlessly on ShadowStream</Text>
                            </View>
                            <Text style={styles.calloutBody}>
                                All mentioned titles are indexed and streamable with verified lawful mirrors, responsive subtitles, and multi-resolution playback across desktop and mobile.
                            </Text>
                        </View>

                        {/* Featured Titles Grid / Links */}
                        {blog.featured_titles && blog.featured_titles.length > 0 && (
                            <View style={styles.featuredTitlesSection}>
                                <Text style={styles.featuredSectionHeading}>Featured In This Guide</Text>
                                <View style={styles.featuredTitlesGrid}>
                                    {blog.featured_titles.map((t) => (
                                        <TouchableOpacity
                                            key={t.id || t.slug}
                                            style={styles.featuredTitleCard}
                                            activeOpacity={0.8}
                                            onPress={() => navigation.navigate('TitleDetail', { slug: t.slug, id: t.id })}
                                        >
                                            {t.poster && (
                                                <Image
                                                    source={{ uri: t.poster }}
                                                    style={styles.featuredTitlePoster}
                                                    resizeMode="cover"
                                                />
                                            )}
                                            <View style={styles.featuredTitleInfo}>
                                                <Text style={styles.featuredTitleName} numberOfLines={1}>{t.title}</Text>
                                                <Text style={styles.featuredTitleYear}>{t.year} • ⭐ {t.rating || 'N/A'}</Text>
                                                <Text style={styles.streamCtaText}>Stream on ShadowStream →</Text>
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* Google FAQ Rich Snippets Section */}
                        {blog.faqs && blog.faqs.length > 0 && (
                            <View style={styles.faqSection}>
                                <Text style={styles.faqHeading}>Frequently Asked Questions</Text>
                                <Text style={styles.faqSub}>Verified insights and streaming availability answers.</Text>
                                <View style={styles.faqList}>
                                    {blog.faqs.map((faq, index) => {
                                        const isOpen = !!expandedFaq[index];
                                        return (
                                            <TouchableOpacity
                                                key={index}
                                                style={styles.faqCard}
                                                activeOpacity={0.85}
                                                onPress={() => toggleFaq(index)}
                                            >
                                                <View style={styles.faqQuestionRow}>
                                                    <Text style={styles.faqQuestionText}>{faq.question}</Text>
                                                    <Text style={styles.faqToggleIcon}>{isOpen ? '−' : '+'}</Text>
                                                </View>
                                                {isOpen && (
                                                    <View style={styles.faqAnswerBox}>
                                                        <Text style={styles.faqAnswerText}>{faq.answer}</Text>
                                                    </View>
                                                )}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        )}

                        {/* Related Editorial & Showbiz Guides */}
                        {relatedBlogs && relatedBlogs.length > 0 && (
                            <View style={styles.relatedGuidesSection}>
                                <Text style={styles.relatedSectionHeading}>🎬 Related Showbiz & Streaming Guides</Text>
                                <Text style={styles.relatedSectionSub}>Explore further editorial analysis and verified watchlist picks.</Text>
                                <View style={styles.relatedCardsGrid}>
                                    {relatedBlogs.map((rel) => (
                                        <TouchableOpacity
                                            key={rel.slug}
                                            style={styles.relatedBlogCard}
                                            activeOpacity={0.8}
                                            accessibilityRole="link"
                                            href={`https://ssmoviestvs.site/blog/${rel.slug}`}
                                            onPress={() => {
                                                if (navigation.push) {
                                                    navigation.push('BlogDetail', { slug: rel.slug });
                                                } else {
                                                    navigation.navigate('BlogDetail', { slug: rel.slug });
                                                }
                                            }}
                                        >
                                            {rel.cover_image && (
                                                <Image
                                                    source={{ uri: rel.cover_image }}
                                                    style={styles.relatedBlogCover}
                                                    resizeMode="cover"
                                                />
                                            )}
                                            <View style={styles.relatedBlogContent}>
                                                <View style={styles.relatedMetaRow}>
                                                    <View style={styles.relatedCategoryBadge}>
                                                        <Text style={styles.relatedCategoryText}>{rel.category?.toUpperCase() || 'SHOWBIZ'}</Text>
                                                    </View>
                                                    <Text style={styles.relatedReadTime}>⏱️ {rel.reading_time || '5 min'}</Text>
                                                </View>
                                                <Text style={styles.relatedBlogTitle} numberOfLines={2}>{rel.title}</Text>
                                                <Text style={styles.relatedBlogDesc} numberOfLines={2}>{rel.meta_description}</Text>
                                                <Text style={styles.relatedCtaText}>Read Guide →</Text>
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        )}
                    </View>
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
    centeredState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40
    },
    loadingText: {
        color: COLORS.textMuted,
        marginTop: 14,
        fontSize: 14
    },
    errorIcon: {
        fontSize: 44,
        marginBottom: 10
    },
    errorTitle: {
        color: COLORS.text,
        fontSize: 22,
        fontWeight: '800',
        marginBottom: 8
    },
    errorSub: {
        color: COLORS.textMuted,
        fontSize: 14,
        marginBottom: 20,
        textAlign: 'center'
    },
    backBtn: {
        backgroundColor: COLORS.brand,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 6
    },
    backBtnText: {
        color: '#FFFFFF',
        fontWeight: '700'
    },
    breadcrumbBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        backgroundColor: COLORS.surface
    },
    breadcrumbLink: {
        color: COLORS.textMuted,
        fontSize: 13
    },
    breadcrumbSep: {
        color: COLORS.textMuted,
        marginHorizontal: 8,
        fontSize: 13
    },
    breadcrumbCurrent: {
        color: COLORS.text,
        fontSize: 13,
        fontWeight: '600',
        flex: 1
    },
    articleHeader: {
        paddingHorizontal: 24,
        paddingTop: 28,
        paddingBottom: 24,
        backgroundColor: COLORS.surface
    },
    categoryBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12
    },
    categoryPill: {
        backgroundColor: COLORS.brand,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 4
    },
    categoryPillText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.6
    },
    metaDot: {
        color: COLORS.textMuted,
        marginHorizontal: 8
    },
    readingTimeText: {
        color: COLORS.textMuted,
        fontSize: 12,
        fontWeight: '600'
    },
    regionText: {
        color: COLORS.textMuted,
        fontSize: 12
    },
    articleTitle: {
        color: COLORS.text,
        fontSize: 32,
        fontWeight: '900',
        letterSpacing: -0.5,
        lineHeight: 40,
        marginBottom: 14
    },
    articleLead: {
        color: COLORS.textMuted,
        fontSize: 16,
        lineHeight: 24,
        maxWidth: 880,
        marginBottom: 20
    },
    authorMetaBox: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        backgroundColor: COLORS.surfaceAlt,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    authorAvatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: COLORS.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12
    },
    avatarIcon: {
        fontSize: 18
    },
    authorTitle: {
        color: COLORS.text,
        fontSize: 13,
        fontWeight: '700'
    },
    authorSub: {
        color: COLORS.textMuted,
        fontSize: 11,
        marginTop: 2
    },
    seoBadge: {
        backgroundColor: 'rgba(46, 213, 115, 0.15)',
        borderColor: '#2ed573',
        borderWidth: 1,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4
    },
    seoBadgeText: {
        color: '#2ed573',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5
    },
    heroCoverWrapper: {
        width: '100%',
        backgroundColor: '#000'
    },
    heroCoverImage: {
        width: '100%',
        height: 320
    },
    heroCoverImageDesktop: {
        height: 520
    },
    heroCaptionBar: {
        backgroundColor: COLORS.surfaceAlt,
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border
    },
    heroCaptionText: {
        color: COLORS.textMuted,
        fontSize: 12,
        fontStyle: 'italic'
    },
    mainContentLayout: {
        paddingHorizontal: 20,
        paddingTop: 28
    },
    mainContentLayoutDesktop: {
        paddingHorizontal: 60,
        maxWidth: 1000,
        alignSelf: 'center',
        width: '100%'
    },
    articleBodyColumn: {
        width: '100%'
    },
    contentH1: {
        color: COLORS.text,
        fontSize: 26,
        fontWeight: '800',
        marginTop: 24,
        marginBottom: 14
    },
    contentH2: {
        color: COLORS.text,
        fontSize: 22,
        fontWeight: '800',
        marginTop: 28,
        marginBottom: 12,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.brand,
        paddingLeft: 12
    },
    contentH3: {
        color: COLORS.text,
        fontSize: 18,
        fontWeight: '700',
        marginTop: 20,
        marginBottom: 10
    },
    contentParagraph: {
        color: '#D8D8D8',
        fontSize: 15,
        lineHeight: 25,
        marginBottom: 18
    },
    bulletList: {
        marginBottom: 18,
        paddingLeft: 8
    },
    bulletItem: {
        flexDirection: 'row',
        marginBottom: 8
    },
    bulletDot: {
        color: COLORS.brand,
        fontSize: 16,
        marginRight: 10
    },
    bulletText: {
        color: '#D8D8D8',
        fontSize: 15,
        lineHeight: 22,
        flex: 1
    },
    middleImageContainer: {
        marginVertical: 28,
        borderRadius: 10,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: '#000'
    },
    middleImage: {
        width: '100%',
        height: 300
    },
    imageCaptionBar: {
        backgroundColor: COLORS.surfaceAlt,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: COLORS.border
    },
    imageCaptionText: {
        color: COLORS.textMuted,
        fontSize: 12,
        fontWeight: '500'
    },
    streamAppCallout: {
        backgroundColor: 'rgba(229, 9, 20, 0.08)',
        borderColor: COLORS.brand,
        borderWidth: 1,
        borderRadius: 10,
        padding: 20,
        marginVertical: 28
    },
    calloutHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8
    },
    calloutIcon: {
        fontSize: 20,
        marginRight: 10
    },
    calloutTitle: {
        color: COLORS.brand,
        fontSize: 16,
        fontWeight: '800'
    },
    calloutBody: {
        color: '#E0E0E0',
        fontSize: 14,
        lineHeight: 22
    },
    featuredTitlesSection: {
        marginVertical: 24,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: COLORS.border
    },
    featuredSectionHeading: {
        color: COLORS.text,
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 16
    },
    featuredTitlesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12
    },
    featuredTitleCard: {
        flexDirection: 'row',
        backgroundColor: COLORS.surface,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 10,
        width: '100%',
        maxWidth: 440,
        alignItems: 'center'
    },
    featuredTitlePoster: {
        width: 50,
        height: 75,
        borderRadius: 4,
        marginRight: 12
    },
    featuredTitleInfo: {
        flex: 1
    },
    featuredTitleName: {
        color: COLORS.text,
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 4
    },
    featuredTitleYear: {
        color: COLORS.textMuted,
        fontSize: 12,
        marginBottom: 6
    },
    streamCtaText: {
        color: COLORS.brand,
        fontSize: 12,
        fontWeight: '700'
    },
    faqSection: {
        marginTop: 32,
        paddingTop: 24,
        borderTopWidth: 1,
        borderTopColor: COLORS.border
    },
    faqHeading: {
        color: COLORS.text,
        fontSize: 22,
        fontWeight: '800',
        marginBottom: 6
    },
    faqSub: {
        color: COLORS.textMuted,
        fontSize: 13,
        marginBottom: 18
    },
    faqList: {
        gap: 12
    },
    faqCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: 'hidden'
    },
    faqQuestionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16
    },
    faqQuestionText: {
        color: COLORS.text,
        fontSize: 15,
        fontWeight: '700',
        flex: 1,
        marginRight: 10
    },
    faqToggleIcon: {
        color: COLORS.brand,
        fontSize: 20,
        fontWeight: '700'
    },
    faqAnswerBox: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingTop: 12
    },
    faqAnswerText: {
        color: '#D8D8D8',
        fontSize: 14,
        lineHeight: 22
    },
    inlineLink: {
        color: COLORS.brand,
        fontWeight: '700',
        textDecorationLine: 'underline',
    },
    inlineBold: {
        fontWeight: '700',
        color: '#FFFFFF',
    },
    inlineItalic: {
        fontStyle: 'italic',
        color: '#E0E0E0',
    },
    relatedGuidesSection: {
        marginTop: 36,
        paddingTop: 24,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    relatedSectionHeading: {
        color: COLORS.text,
        fontSize: 22,
        fontWeight: '800',
        marginBottom: 6,
    },
    relatedSectionSub: {
        color: COLORS.textMuted,
        fontSize: 13,
        marginBottom: 18,
    },
    relatedCardsGrid: {
        gap: 14,
    },
    relatedBlogCard: {
        flexDirection: 'row',
        backgroundColor: COLORS.surface,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: 'hidden',
        alignItems: 'center',
    },
    relatedBlogCover: {
        width: 110,
        height: '100%',
        minHeight: 110,
    },
    relatedBlogContent: {
        flex: 1,
        padding: 14,
    },
    relatedMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    relatedCategoryBadge: {
        backgroundColor: COLORS.surfaceAlt,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        marginRight: 8,
    },
    relatedCategoryText: {
        color: COLORS.brand,
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    relatedReadTime: {
        color: COLORS.textMuted,
        fontSize: 11,
    },
    relatedBlogTitle: {
        color: COLORS.text,
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 4,
        lineHeight: 18,
    },
    relatedBlogDesc: {
        color: COLORS.textMuted,
        fontSize: 12,
        lineHeight: 16,
        marginBottom: 8,
    },
    relatedCtaText: {
        color: COLORS.brand,
        fontSize: 12,
        fontWeight: '700',
    }
});
