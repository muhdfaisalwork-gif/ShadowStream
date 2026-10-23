import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { COLORS } from '../theme/colors';
import { applyAppUpdate } from '../utils/pwa';

const CURRENT_VERSION = '2.4.16';
const CURRENT_CODE = 256;

export default function UpdateBanner() {
    const [updateInfo, setUpdateInfo] = useState(null);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        if (Platform.OS !== 'web' || typeof window === 'undefined') return;

        // 1. Listen for PWA service-worker updates
        const handlePwaUpdate = () => {
            setUpdateInfo({
                type: 'pwa',
                version: 'Latest',
                title: 'New Web Update Available',
                subtitle: 'Tap update to reload and apply the newest player and catalog fixes.',
                action: () => applyAppUpdate(),
            });
        };
        window.addEventListener('shadowstream:update-available', handlePwaUpdate);

        // 2. Dynamic check against remote version API for ALL platforms
        const checkRemoteVersion = async () => {
            try {
                const res = await fetch('/api/v1/app-version', { cache: 'no-store' });
                if (!res.ok) return;
                const remote = await res.json();

                // If running inside Android APK wrapper
                if (window.ShadowStreamNative) {
                    const currentCode = typeof window.ShadowStreamNative.getAppVersionCode === 'function'
                        ? window.ShadowStreamNative.getAppVersionCode()
                        : CURRENT_CODE;

                    if (remote.versionCode && currentCode < remote.versionCode) {
                        setUpdateInfo({
                            type: 'apk',
                            version: remote.version || '2.4.4',
                            title: `Update Available (v${remote.version || '2.4.4'})`,
                            subtitle: remote.releaseNotes || 'Install the newest version for player fixes & performance improvements.',
                            action: () => {
                                const dlUrl = remote.apkUrl || 'https://ssmoviestvs.site/downloads/ShadowStream.apk';
                                if (typeof window.ShadowStreamNative.downloadUpdate === 'function') {
                                    window.ShadowStreamNative.downloadUpdate(dlUrl);
                                } else {
                                    window.location.href = dlUrl;
                                }
                            },
                        });
                        return;
                    }
                }

                // Web / PWA / Browser check
                if (remote.version && remote.version !== CURRENT_VERSION) {
                    setUpdateInfo({
                        type: 'web',
                        version: remote.version,
                        title: `ShadowStream v${remote.version} Available`,
                        subtitle: remote.releaseNotes || 'Tap to reload and apply the latest update.',
                        action: () => applyAppUpdate(),
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
                    <Text style={styles.subtitle}>{updateInfo.subtitle}</Text>
                </View>
            </View>
            <View style={styles.actions}>
                <TouchableOpacity style={styles.updateBtn} onPress={updateInfo.action} activeOpacity={0.8}>
                    <Text style={styles.updateBtnText}>Update Now</Text>
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
        minWidth: 220,
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
