import React from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Linking, Alert, Platform
} from 'react-native';
import { COLORS } from '../theme/colors';
import AppHeader from '../components/AppHeader';
import MobileTabBar from '../components/MobileTabBar';
import { useRouteMeta } from '../utils/useRouteMeta';
import { getApiBase } from '../utils/api';

export function getReleaseBase() {
    const api = getApiBase();
    if (api && (api.includes('localhost') || api.includes('127.0.0.1'))) {
        return api.replace(/\/api\/v1\/?$/, '') + '/downloads';
    }
    return 'https://ssmoviestvs.site/downloads';
}

// Where the desktop launcher binaries are hosted.
const RELEASE_BASE = 'https://ssmoviestvs.site/downloads';

// 2.4.1 / current live build identifier.
const BUILD_VERSION = '2.4.7';

const APPS = [
    {
        id: 'android',
        platform: 'Android (APK)',
        icon: '📱',
        arch: 'ARM64 & x86_64 (Phones, Tablets & Android TV)',
        size: '2.42 MB',
        fileName: 'ShadowStream.apk',
        url: `${RELEASE_BASE}/ShadowStream.apk`,
        status: 'ready',
        notes: 'Installable Android APK with crisp new brand icon, offline UI bundling, hardware acceleration, Picture-in-Picture (PiP), and Android TV support.',
        recommended: true,
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
        notes: 'Native Swift/SwiftUI application built with xtool (Xcode-free SwiftPM CLI) featuring PiP, safe-area gestures, and hardware video playback.',
    },
    {
        id: 'windows',
        platform: 'Windows (Desktop App)',
        icon: '🪟',
        arch: 'x64 (Windows 10/11)',
        size: '~115 MB',
        fileName: 'ShadowStream-Setup-x64.exe',
        url: `${RELEASE_BASE}/ShadowStream-Setup-x64.exe`,
        status: 'ready',
        notes: 'Native Electron desktop application with embedded media engine, shortcuts, and direct mirror streaming.',
    },
    {
        id: 'linux-x64',
        platform: 'Linux x64',
        icon: '🐧',
        arch: 'x64 (Ubuntu/Debian/Arch/Fedora)',
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
        arch: 'arm64 (Raspberry Pi/Linux ARM)',
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
        arch: 'arm64 (M1/M2/M3/M4)',
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
    {
        id: 'web',
        platform: 'Web App (PWA)',
        icon: '🌐',
        arch: 'Any modern browser',
        size: '0 MB',
        fileName: 'ShadowStream Web (this site)',
        url: 'https://ssmoviestvs.site',
        status: 'ready',
        notes: 'No install required. Tap "Install" in your browser address bar to add as a desktop app.',
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
            // If running inside Android APK and downloading an update
            if (typeof window !== 'undefined' && window.ShadowStreamNative && typeof window.ShadowStreamNative.downloadUpdate === 'function') {
                window.ShadowStreamNative.downloadUpdate(targetUrl);
                Alert.alert('Downloading', `Downloading ${app.fileName || 'ShadowStream.apk'} to your notification shade.`);
                return;
            }

            if (Platform.OS === 'web' && typeof window !== 'undefined') {
                // Direct navigation ensures mobile browsers (Chrome, Safari) trigger native file download prompt
                if (typeof document !== 'undefined') {
                    const a = document.createElement('a');
                    a.href = targetUrl;
                    a.download = app.fileName || 'ShadowStream.apk';
                    a.target = '_blank';
                    a.rel = 'noopener noreferrer';
                    document.body.appendChild(a);
                    a.click();
                    setTimeout(() => { if (document.body.contains(a)) document.body.removeChild(a); }, 300);
                    return;
                }
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

    return (
        <SafeAreaView style={styles.container}>
            <AppHeader title="Apps & Downloads" navigation={navigation} />
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.hero}>
                    <Text style={styles.heroTitle}>📦  Install ShadowStream</Text>
                    <Text style={styles.heroSub}>
                        Native mobile + desktop apps. Pick your platform — same catalog, same player, zero ads.
                    </Text>
                    <Text style={styles.heroMeta}>
                        Build {BUILD_VERSION} · {APPS.filter(a => a.status === 'ready').length} of {APPS.length} platforms verified
                    </Text>
                </View>

                {APPS.map((app) => (
                    <View key={app.id} style={styles.card}>
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

                <View style={styles.footerBox}>
                    <Text style={styles.footerTitle}>BUILD INFO</Text>
                    <Text style={styles.footerText}>
                        All launchers are thin wrappers — they open the deployed web app in your default browser and pin it to your system tray / Start Menu / dock. No backend bundled. Your catalog and player update automatically with the site.
                    </Text>
                    <Text style={styles.footerText}>
                        Issues? Open the web app — it works on every device with a browser.
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
        marginBottom: 14,
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
        color: COLORS.textMuted,
        fontSize: 11,
        marginTop: 8,
        fontWeight: '700',
        letterSpacing: 0.4,
    },
    card: {
        backgroundColor: COLORS.surfaceCard,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 10,
        padding: 14,
        marginBottom: 12,
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
    },
    cardFile: {
        color: COLORS.textMuted,
        fontSize: 10,
        fontFamily: 'monospace',
        marginTop: 6,
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