import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../theme/colors';
import Poster from './Poster';
import { Storage } from '../utils/storage';
import { ReleaseStatusBadge } from './ReleaseStatusFilter';

export default function MediaCard({ item, onPress, navigation, isLarge, showProgress, width, height }) {
    if (!item) return null;

    const handleCardPress = () => {
        if (typeof onPress === 'function') {
            onPress(item);
        } else if (navigation && typeof navigation.navigate === 'function') {
            navigation.navigate('TitleDetail', { slug: item.slug || String(item.id), item });
        }
    };

    const watchProgress = Storage.get(`progress_${item.id}`, 0);
    const isFluid = width === '100%' || width === 'fluid';
    const cardWidth = isFluid ? '100%' : (width || (isLarge ? 170 : 140));
    const posterStyle = isFluid
        ? { width: '100%', aspectRatio: 2 / 3 }
        : { height: height || Math.round((typeof cardWidth === 'number' ? cardWidth : 140) * 1.5) };

    // Type badge color and label
    const getTypeInfo = () => {
        const t = (item.type || '').toLowerCase();
        if (t === 'tv') return { label: 'TV', bg: COLORS.badgeTv };
        if (t === 'anime') return { label: 'ANIME', bg: COLORS.badgeAnime };
        if (t === 'short_drama') return { label: 'SHORT', bg: COLORS.badgeShort };
        return null;
    };

    const typeInfo = getTypeInfo();
    const hasPlayback = item.has_playback || 
        (Array.isArray(item.availability) && item.availability.some(a => a.kind === 'playback' || a.playbackUrl || a.playback_url));

    // Audio tags
    const audioList = Array.isArray(item.audioLanguages) ? item.audioLanguages : [];
    const subList   = Array.isArray(item.subtitleLanguages) ? item.subtitleLanguages : [];
    const hasDub = audioList.length > 0;
    const hasSub = subList.length > 0;

    // ShadowStream multi-lingual language badges. Show up to 2 audio dubs + 1 sub.
    const codeToLabel = (code) => {
        const raw = typeof code === 'string' ? code : (code?.code || code?.name || '');
        const c = String(raw || '').toLowerCase().trim();
        if (!c) return '';
        // Extract leading language code (e.g. 'fr-CA' -> 'fr', 'en-US' -> 'en')
        const iso = c.split(/[-_]/)[0].slice(0, 2);
        const map = {
            en:'EN', ja:'JA', ko:'KO', zh:'ZH', hi:'HI', ar:'AR', tr:'TR',
            es:'ES', fr:'FR', pt:'PT', de:'DE', ru:'RU', ur:'UR', fa:'FA',
            te:'TE', ta:'TA', ml:'ML', kn:'KN', bn:'BN', id:'ID', fil:'FIL'
        };
        return map[iso] || iso.toUpperCase();
    };
    const dubLabels = Array.from(new Set((audioList.length ? audioList : []).map(l => codeToLabel(l)).filter(Boolean))).slice(0, 2);
    const subLabels = Array.from(new Set((subList.length ? subList : []).map(l => codeToLabel(l)).filter(Boolean))).slice(0, 1);

    // Release status badge
    const releaseStatus = item.release_status || item.status || null;

    const ariaLabel = `${item.title || 'Untitled'}${
        item.year ? ', ' + item.year : ''
    }${typeInfo ? ', ' + typeInfo.label : ''}${
        item.rating ? ', rated ' + Number(item.rating).toFixed(1) + ' out of 10' : ''
    }${hasPlayback ? ', playable' : ''}`;

    return (
        <TouchableOpacity
            style={[styles.card, { width: cardWidth }]}
            onPress={handleCardPress}
            activeOpacity={0.82}
            accessible
            accessibilityRole="button"
            accessibilityLabel={ariaLabel}
            accessibilityHint={hasPlayback ? 'Opens title details. Playback available.' : 'Opens title details.'}
            // Performance — lets the browser skip rendering for off-screen cards.
            // The class is defined globally in index.html (a11y-focus style block).
            className="cv-auto"
        >
            <View style={[styles.posterContainer, posterStyle]}>
                <Poster
                    url={item.poster}
                    title={item.title}
                    style={StyleSheet.absoluteFill}
                />

                {/* Top left type badge */}
                {typeInfo && (
                    <View style={[styles.typeBadge, { backgroundColor: typeInfo.bg }]}>
                        <Text style={styles.typeBadgeText}>{typeInfo.label}</Text>
                    </View>
                )}

                {/* Release Status Badge - Top right (offset below rating badge when both present) */}
                {releaseStatus && (
                    <View style={[styles.releaseStatusBadge, item.rating ? { top: 32 } : null]}>
                        <ReleaseStatusBadge status={releaseStatus} type={item.type} />
                    </View>
                )}

                {/* Top right rating badge */}
                {item.rating ? (
                    <View style={styles.ratingBadge}>
                        <Text style={styles.ratingStar}>★</Text>
                        <Text style={styles.ratingText}>{Number(item.rating).toFixed(1)}</Text>
                    </View>
                ) : null}

                {/* Bottom badges (dub/sub/quality/playable) */}
                <View style={styles.bottomBadgesRow}>
                    {hasPlayback ? (
                        <View style={styles.playableBadge}>
                            <Text style={styles.playableDot}>●</Text>
                            <Text style={styles.playableText}>STREAM</Text>
                        </View>
                    ) : null}

                    {dubLabels.map(label => (
                        <View key={`dub-${label}`} style={[styles.tagBadge, styles.dubBadge]}>
                            <Text style={styles.tagBadgeText}>{label} DUB</Text>
                        </View>
                    ))}
                    {subLabels.map(label => (
                        <View key={`sub-${label}`} style={[styles.tagBadge, styles.subBadge]}>
                            <Text style={styles.tagBadgeText}>{label} SUB</Text>
                        </View>
                    ))}
                </View>

                {/* Watch progress indicator */}
                {showProgress && watchProgress > 0 && watchProgress < 98 && (
                    <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${watchProgress}%` }]} />
                    </View>
                )}
            </View>

            <View style={styles.cardInfo}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                    {item.title || 'Untitled'}
                </Text>
                <View style={styles.cardMetaRow}>
                    <Text style={styles.cardYear}>{item.year || ''}</Text>
                    {item.runtime ? (
                        <Text style={styles.cardMetaDot}>• {item.runtime}m</Text>
                    ) : item.durationMinutes ? (
                        <Text style={styles.cardMetaDot}>• {item.durationMinutes}m</Text>
                    ) : (item.seasons || item.seasonCount) ? (
                        <Text style={styles.cardMetaDot}>• {item.seasons || item.seasonCount}S</Text>
                    ) : null}
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        marginBottom: 16,
        backgroundColor: 'transparent'
    },
    posterContainer: {
        width: '100%',
        borderRadius: 8,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: COLORS.surfaceAlt,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)'
    },
    typeBadge: {
        position: 'absolute',
        top: 8,
        left: 8,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        zIndex: 2
    },
    typeBadgeText: {
        color: '#FFFFFF',
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 0.5
    },
    ratingBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(10,10,10,0.85)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: 'rgba(255,215,0,0.3)',
        zIndex: 2
    },
    ratingStar: {
        color: COLORS.gold,
        fontSize: 10,
        marginRight: 3
    },
    ratingText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '700'
    },
    // Release Status Badge
    releaseStatusBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 1,
        zIndex: 2
    },
    releaseStatusIcon: {
        fontSize: 10,
        marginRight: 2,
    },
    releaseStatusText: {
        fontSize: 8,
        fontWeight: '700',
    },
    bottomBadgesRow: {
        position: 'absolute',
        bottom: 8,
        left: 6,
        right: 6,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        zIndex: 2
    },
    playableBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(16, 185, 129, 0.9)',
        paddingHorizontal: 5,
        paddingVertical: 2,
        borderRadius: 3
    },
    playableDot: {
        color: '#FFFFFF',
        fontSize: 8,
        marginRight: 3
    },
    playableText: {
        color: '#FFFFFF',
        fontSize: 8,
        fontWeight: '800'
    },
    tagBadge: {
        backgroundColor: 'rgba(0,0,0,0.75)',
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 3,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)'
    },
    tagBadgeText: {
        color: '#E0E0E0',
        fontSize: 8,
        fontWeight: '700'
    },
    dubBadge: {
        backgroundColor: 'rgba(34, 211, 238, 0.85)',
        borderColor: 'rgba(34, 211, 238, 1)'
    },
    subBadge: {
        backgroundColor: 'rgba(167, 139, 250, 0.85)',
        borderColor: 'rgba(167, 139, 250, 1)'
    },
    progressBarBg: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 3,
        backgroundColor: 'rgba(255,255,255,0.2)',
        zIndex: 3
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: COLORS.brand
    },
    cardInfo: {
        paddingTop: 8,
        paddingHorizontal: 2
    },
    cardTitle: {
        color: COLORS.textPrimary,
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: -0.2
    },
    cardMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 3
    },
    cardYear: {
        color: COLORS.textMuted,
        fontSize: 11,
        fontWeight: '500'
    },
    cardMetaDot: {
        color: COLORS.textMuted,
        fontSize: 11,
        marginLeft: 4
    }
});
