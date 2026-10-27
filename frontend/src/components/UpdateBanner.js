import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Alert } from 'react-native';
import { COLORS } from '../theme/colors';
import { applyAppUpdate } from '../utils/pwa';
import { CURRENT_VERSION, CURRENT_CODE, isNewerVersion } from '../config/version';

export default function UpdateBanner() {
    const [updateInfo, setUpdateInfo] = useState(null);
    const [dismissed, setDismissed] = useState(false);
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        if (Platform.OS !== 'web' || typeof window === 'undefined') return;

        // 1. Listen for PWA service-worker updates
        const handlePwaUpdate = () => {
            setUpdateInfo({
                type: 'pwa',
                version: 'Latest',
                title: 'New Web Update Available',
                subtitle: 'Tap update to reload and apply the newest player and catalog fixes.',
                action: () => {
                    setDownloading(true);
                    applyAppUpdate();
                },
            });
        };
        window.addEventListener('shadowstream:update-available', handlePwaUpdate);

        // 2. Dynamic check against remote version API for ALL platforms
        const checkRemoteVersion = async () => {
            try {
                const res = await fetch('/api/v1/app-version?_t=' + Date.now(), { cache: 'no-store' });
                if (!res.ok) return;
                const remote = await res.json();

                // Environment A: Android APK wrapper
                if (window.ShadowStreamNative) {
                    const currentCode = typeof window.ShadowStreamNative.getAppVersionCode === 'function'
                        ? window.ShadowStreamNative.getAppVersionCode()
                        : CURRENT_CODE;

                    if (remote.versionCode && currentCode < remote.versionCode) {
                        setUpdateInfo({
                            type: 'apk',
                            version: remote.version || CURRENT_VERSION,
                            title: `Update Available (v${remote.version || CURRENT_VERSION})`,
                            subtitle: remote.releaseNotes || 'Install the newest version for player fixes & performance improvements.',
                            action: () => {
                                const dlUrl = remote.apkUrl || 'https://ssmoviestvs.site/downloads/ShadowStream.apk';
                                setDownloading(true);
                                if (typeof window.ShadowStreamNative.downloadUpdate === 'function') {
                                    window.ShadowStreamNative.downloadUpdate(dlUrl);
                                    if (typeof alert !== 'undefined') {
                                        alert('ShadowStream update is downloading. When finished, the package installer will open automatically.');
                                    } else {
                                        Alert.alert('Downloading Update', 'ShadowStream update is downloading. When finished, the package installer will open automatically.');
                                    }
                                } else {
                                    window.location.href = dlUrl;
                                }
                            },
                        });
                    }
                    return; // Android wrapper handled, do not fall through to desktop/web check
                }

                // Environment B: Windows Desktop App (Electron)
                const isElectronDesktop = !!(
                    window.ShadowStreamDesktop ||
                    (typeof navigator !== 'undefined' && /electron/i.test(navigator.userAgent || ''))
                );
                if (isElectronDesktop) {
                    const desktopCode = window.ShadowStreamDesktop?.versionCode || CURRENT_CODE;
                    const desktopVersion = window.ShadowStreamDesktop?.version || CURRENT_VERSION;
                    const hasNewerDesktop = (remote.versionCode && desktopCode < remote.versionCode) ||
                                            isNewerVersion(remote.version, desktopVersion);

                    if (hasNewerDesktop) {
                        setUpdateInfo({
                            type: 'desktop',
                            version: remote.version || CURRENT_VERSION,
                            title: `ShadowStream Desktop v${remote.version} Available`,
                            subtitle: remote.releaseNotes || 'Download the newest installer for desktop performance improvements.',
                            action: () => {
                                const dlUrl = remote.desktopUrl || 'https://ssmoviestvs.site/downloads/ShadowStream-Setup-x64.exe';
                                setDownloading(true);
                                window.location.href = dlUrl;
                            },
                        });
                    }
                    return; // Desktop app handled, do not fall through to web check
                }

                // Environment C: Standard Web / PWA / Browser
                const hasNewerWeb = (remote.versionCode && CURRENT_CODE < remote.versionCode) ||
                                    isNewerVersion(remote.version, CURRENT_VERSION);

                if (hasNewerWeb) {
                    setUpdateInfo({
                        type: 'web',
                        version: remote.version,
                        title: `ShadowStream v${remote.version} Available`,
                        subtitle: remote.releaseNotes || 'Tap to reload and apply the latest update.',
                        action: () => {
                            setDownloading(true);
                            applyAppUpdate();
                        },
                    });
                }
            } catch (_) {}
        };

        checkRemoteVersion();

        return () => {
            window.removeEventListener('shadowstream:update-available', handlePwaUpdate);
        };
    }, []);

    if (!updateInfo || dismissed) return null;

    return (
        <View style={styles.banner}>
            <View style={styles.content}>
                <Text style={styles.icon}>🚀</Text>
                <View style={styles.textWrap}>
                    <Text style={styles.title}>{updateInfo.title}</Text>
                    <Text style={styles.subtitle} numberOfLines={2}>{updateInfo.subtitle}</Text>
                </View>
            </View>
            <View style={styles.actions}>
                <TouchableOpacity
                    style={[styles.updateBtn, downloading && styles.updateBtnActive]}
                    onPress={updateInfo.action}
                    disabled={downloading}
                    activeOpacity={0.8}
                >
                    <Text style={styles.updateBtnText}>
                        {downloading ? 'Updating...' : 'Update Now'}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dismissBtn} onPress={() => setDismissed(true)}>
                    <Text style={styles.dismissBtnText}>✕</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    banner: {
        backgroundColor: '#1E1E2E',
        borderBottomWidth: 1,
        borderBottomColor: '#E50914',
        paddingVertical: 8,
        paddingHorizontal: 14,
        paddingTop: Platform.OS === 'web' ? 'max(8px, env(safe-area-inset-top, 8px))' : 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 8,
        zIndex: 9999,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
        minWidth: 200,
    },
    icon: {
        fontSize: 18,
    },
    textWrap: {
        flex: 1,
    },
    title: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    subtitle: {
        color: COLORS.textMuted,
        fontSize: 11,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    updateBtn: {
        backgroundColor: '#E50914',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 6,
    },
    updateBtnActive: {
        backgroundColor: '#7f1d1d',
    },
    updateBtnText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    dismissBtn: {
        padding: 4,
    },
    dismissBtnText: {
        color: COLORS.textMuted,
        fontSize: 14,
    },
});
