import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Linking, Alert, Platform, useWindowDimensions
} from 'react-native';
import { COLORS } from '../theme/colors';
import AppHeader from '../components/AppHeader';
import MobileTabBar from '../components/MobileTabBar';
import { useRouteMeta } from '../utils/useRouteMeta';
import { getApiBase } from '../utils/api';
import { applyAppUpdate } from '../utils/pwa';

export function getReleaseBase() {
    const api = getApiBase();
    if (api && (api.includes('localhost') || api.includes('127.0.0.1'))) {
        return api.replace(/\/api\/v1\/?$/, '') + '/downloads';
    }
    return 'https://ssmoviestvs.site/downloads';
}

const RELEASE_BASE = 'https://ssmoviestvs.site/downloads';

const APPS = [
    {
        id: 'android',
        platform: 'Android (APK)',
        icon: '📱',
        arch: 'ARM64 & x86_64 (Phones, Tablets & TV)',
        size: '2.85 MB',
        fileName: 'ShadowStream.apk',
        url: `${RELEASE_BASE}/ShadowStream.apk`,
        status: 'ready',
        notes: 'Standalone installable Android APK with in-app auto-installer, PiP, hardware acceleration, and full TV remote control support.',
        recommended: true,
    },
    {
        id: 'web',
        platform: 'Web App (PWA)',
        icon: '🌐',
        arch: 'Any modern browser (Chrome, Safari, Edge)',
        size: '0 MB',
        fileName: 'ShadowStream Web App',
        url: 'https://ssmoviestvs.site',
        status: 'ready',
        notes: 'Zero install needed. Tap "Install" or "Add to Home Screen" in your browser address bar for full offline caching.',
    },
    {
        id: 'windows',
        platform: 'Windows (Desktop App)',
        icon: '🪟',
        arch: 'x64 (Windows 10 / 11)',
        size: '~115 MB',
        fileName: 'ShadowStream-Setup-x64.exe',
        url: `${RELEASE_BASE}/ShadowStream-Setup-x64.exe`,
        status: 'ready',
        notes: 'Native Windows desktop launcher with embedded media engine, shortcuts, and direct mirror streaming.',
    },
    {
        id: 'apple-xtool',
        platform: 'Apple iOS & macOS (xtool / SwiftPM)',
        icon: '🍏',
        arch: 'iOS 16+ (iPhone/iPad) & macOS 13+ (Universal)',
        size: 'Native Swift App',
        fileName: 'ShadowStream-xtool',
        url: 'https://github.com/xtool-org/xtool',
        status: 'ready',
        notes: 'Native Swift/SwiftUI application built with xtool featuring PiP, safe-area gestures, and hardware video playback.',
    },
    {
        id: 'linux-x64',
        platform: 'Linux x64',
        icon: '🐧',
        arch: 'x64 (Ubuntu / Debian / Arch / Fedora)',
        size: '~46 MB',
        fileName: 'StreamApp-linux-x64',
        url: `${RELEASE_BASE}/StreamApp-linux-x64`,
        status: 'ready',
        notes: 'chmod +x StreamApp-linux-x64 && ./StreamApp-linux-x64',
    },
    {
        id: 'linux-arm64',
        platform: 'Linux ARM64',
        icon: '🐧',
        arch: 'arm64 (Raspberry Pi / Linux ARM)',
        size: '~45 MB',
        fileName: 'StreamApp-linux-arm64',
        url: `${RELEASE_BASE}/StreamApp-linux-arm64`,
        status: 'ready',
        notes: 'chmod +x StreamApp-linux-arm64 && ./StreamApp-linux-arm64',
    },
    {
        id: 'macos-arm64',
        platform: 'macOS Apple Silicon',
        icon: '🍎',
        arch: 'arm64 (M1 / M2 / M3 / M4)',
        size: '~46 MB',
        fileName: 'StreamApp-macos-arm64',
        url: `${RELEASE_BASE}/StreamApp-macos-arm64`,
        status: 'ready',
        notes: 'Native Apple Silicon binary for macOS 12+.',
    },
    {
        id: 'macos-x64',
        platform: 'macOS Intel',
        icon: '🍎',
        arch: 'x64 (Intel)',
        size: '~51 MB',
        fileName: 'StreamApp-macos-x64',
        url: `${RELEASE_BASE}/StreamApp-macos-x64`,
        status: 'ready',
        notes: 'Native Intel x64 binary for macOS 10.15+.',
    },
];

function StatusBadge({ status }) {
    const colorMap = {
        ready: COLORS.success,
        experimental: '#fbbf24',
        broken: COLORS.brand,
    };
    const labelMap = {
        ready: 'READY',
        experimental: 'EXPERIMENTAL',
        broken: 'BROKEN',
    };
    const c = colorMap[status] || COLORS.textMuted;
    return (
        <View style={[styles.badge, { backgroundColor: c + '22', borderColor: c + '88' }]}>
            <Text style={[styles.badgeText, { color: c }]}>{labelMap[status] || status.toUpperCase()}</Text>
        </View>
    );
}

export default function AppsScreen({ navigation }) {
    useRouteMeta('Apps');
    const { width } = useWindowDimensions();

    const [liveRelease, setLiveRelease] = useState({
        version: '2.4.17',
        versionCode: 257,
        releaseDate: '2026-10-24',
        releaseNotes: 'Direct APK in-app installer prompt, background download receiver, zero-cache version sync, and responsive global scaling.',
    });
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetch('/api/v1/app-version?_t=' + Date.now(), { cache: 'no-store' })
            .then(r => r.json())
            .then(data => {
                if (data && data.version) {
                    setLiveRelease(data);
                }
            })
            .catch(() => {});
    }, []);

    // Responsive grid column calculation
    const numCols = width >= 1024 ? 3 : (width >= 640 ? 2 : 1);
    const gap = 12;
    const cardWidthStyle = numCols === 1
        ? { width: '100%' }
        : { width: `calc(${100 / numCols}% - ${(gap * (numCols - 1)) / numCols}px)` };

    const onDownload = async (app) => {
        if (app.status === 'broken') {
            Alert.alert('Not available', 'This build failed packaging. Use the web app or another platform.');
            return;
        }
        if (app.id === 'web') {
            if (typeof window !== 'undefined') {
                window.location.href = app.url;
            }
            return;
        }
        if (app.url && !app.url.includes('/downloads/') && (app.url.startsWith('http://') || app.url.startsWith('https://'))) {
            if (typeof window !== 'undefined') {
                window.open(app.url, '_blank');
            } else {
                Linking.openURL(app.url);
            }
            return;
        }

        const targetUrl = (app.fileName && !app.url?.startsWith('http'))
            ? `${getReleaseBase()}/${app.fileName}`
            : (app.url || `${getReleaseBase()}/${app.fileName}`);

        try {
            // If running inside Android APK wrapper
            if (typeof window !== 'undefined' && window.ShadowStreamNative && typeof window.ShadowStreamNative.downloadUpdate === 'function') {
                window.ShadowStreamNative.downloadUpdate(targetUrl);
                if (typeof alert !== 'undefined') {
                    alert('ShadowStream update is downloading. When finished, the package installer will open automatically.');
                } else {
                    Alert.alert('Download Started', 'Downloading ShadowStream update. When download completes, the package installer will open automatically.');
                }
                return;
            }

            // Web/Browser: direct navigation triggers native browser download prompt cleanly without popup blocker interference
            if (typeof window !== 'undefined') {
                window.location.href = targetUrl;
                return;
            }

            const supported = await Linking.canOpenURL(targetUrl);
            if (supported) {
                await Linking.openURL(targetUrl);
            }
        } catch (e) {
            Alert.alert('Download failed', String(e?.message || e));
        }
    };

    const handleForceRefresh = async () => {
        setRefreshing(true);
        try {
            await applyAppUpdate();
        } catch (_) {
            if (typeof window !== 'undefined') {
                window.location.reload();
            }
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <AppHeader title="Apps & Downloads" navigation={navigation} />
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.hero}>
                    <View style={styles.heroHeaderRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.heroTitle}>📦  Install ShadowStream</Text>
                            <Text style={styles.heroSub}>
                                Native mobile + desktop apps. Pick your platform — same catalog, same player, zero ads.
                            </Text>
                            <Text style={styles.heroMeta}>
                                Current Live Build v{liveRelease.version} (Code {liveRelease.versionCode}) · Updated {liveRelease.releaseDate}
                            </Text>
                            {liveRelease.releaseNotes ? (
                                <Text style={styles.heroNotes}>
                                    ✨ What's new: {liveRelease.releaseNotes}
                                </Text>
                            ) : null}
                        </View>
                        <TouchableOpacity
                            style={[styles.refreshCacheBtn, refreshing && styles.refreshCacheBtnActive]}
                            onPress={handleForceRefresh}
                            disabled={refreshing}
                        >
                            <Text style={styles.refreshCacheText}>
                                {refreshing ? 'Purging Cache...' : '🔄 Refresh Cache'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Responsive Grid for mobile, tablet, and desktop */}
                <View style={[styles.grid, { gap }]}>
                    {APPS.map((app) => (
                        <View key={app.id} style={[styles.card, cardWidthStyle]}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.cardIcon}>{app.icon}</Text>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.cardPlatform}>{app.platform}</Text>
                                    <Text style={styles.cardArch}>{app.arch} · {app.size}</Text>
                                </View>
                                <StatusBadge status={app.status} />
                            </View>
                            <Text style={styles.cardNotes}>{app.notes}</Text>
                            <Text style={styles.cardFile}>{app.fileName}</Text>
                            <TouchableOpacity
                                style={[styles.downloadBtn, app.status === 'broken' && styles.downloadBtnDisabled]}
                                onPress={() => onDownload(app)}
                                disabled={app.status === 'broken'}
                                accessibilityRole="button"
                                accessibilityLabel={`Download ${app.platform}`}
                            >
                                <Text style={styles.downloadBtnText}>
                                    {app.status === 'broken' ? 'Unavailable' :
                                     app.id === 'web' ? 'Open Web App →' :
                                     app.id === 'apple-xtool' ? 'View Guide on GitHub →' :
                                     `Download ${app.fileName?.endsWith('.apk') ? 'APK' : app.fileName?.endsWith('.exe') ? 'Installer' : 'App'} →`}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>

                <View style={styles.footerBox}>
                    <Text style={styles.footerTitle}>AUTOMATIC UPDATER & CACHE SYNC</Text>
                    <Text style={styles.footerText}>
                        • Android APK includes automatic download notifications and direct installer prompts upon completion.
                    </Text>
                    <Text style={styles.footerText}>
                        • Web App (PWA) auto-updates with network-first version synchronization. Tap "Refresh Cache" above at any time to purge stale browser caches.
                    </Text>
                    <Text style={styles.footerText}>
                        • Desktop launchers stream the newest live build seamlessly.
                    </Text>
                </View>
            </ScrollView>
            <MobileTabBar navigation={navigation} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 80,
    },
    hero: {
        paddingVertical: 18,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        marginBottom: 16,
    },
    heroHeaderRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
    },
    heroTitle: {
        color: COLORS.textPrimary,
        fontSize: 22,
        fontWeight: '900',
        marginBottom: 6,
    },
    heroSub: {
        color: COLORS.textSecondary,
        fontSize: 13,
        lineHeight: 19,
    },
    heroMeta: {
        color: COLORS.brandSecondary,
        fontSize: 11,
        marginTop: 8,
        fontWeight: '700',
        letterSpacing: 0.4,
    },
    heroNotes: {
        color: COLORS.textMuted,
        fontSize: 11,
        marginTop: 4,
        lineHeight: 16,
    },
    refreshCacheBtn: {
        backgroundColor: COLORS.surfaceAlt,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 6,
        alignSelf: 'flex-start',
    },
    refreshCacheBtnActive: {
        opacity: 0.6,
    },
    refreshCacheText: {
        color: COLORS.textPrimary,
        fontSize: 12,
        fontWeight: '700',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'stretch',
    },
    card: {
        backgroundColor: COLORS.surfaceCard,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 10,
        padding: 14,
        marginBottom: 12,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    cardIcon: {
        fontSize: 26,
        marginRight: 12,
        width: 36,
        textAlign: 'center',
    },
    cardPlatform: {
        color: COLORS.textPrimary,
        fontSize: 15,
        fontWeight: '800',
    },
    cardArch: {
        color: COLORS.textMuted,
        fontSize: 11,
        fontWeight: '600',
        marginTop: 2,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
        borderWidth: 1,
    },
    badgeText: {
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    cardNotes: {
        color: COLORS.textSecondary,
        fontSize: 12,
        lineHeight: 17,
        marginTop: 6,
        flex: 1,
    },
    cardFile: {
        color: COLORS.textMuted,
        fontSize: 10,
        fontFamily: 'monospace',
        marginTop: 8,
    },
    downloadBtn: {
        marginTop: 12,
        backgroundColor: COLORS.brand,
        paddingVertical: 11,
        borderRadius: 6,
        alignItems: 'center',
    },
    downloadBtnDisabled: {
        backgroundColor: COLORS.surface,
    },
    downloadBtnText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '900',
        letterSpacing: 0.6,
    },
    footerBox: {
        marginTop: 18,
        padding: 14,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
    },
    footerTitle: {
        color: COLORS.textSecondary,
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1,
        marginBottom: 6,
    },
    footerText: {
        color: COLORS.textMuted,
        fontSize: 11,
        lineHeight: 17,
        marginBottom: 6,
    },
});
