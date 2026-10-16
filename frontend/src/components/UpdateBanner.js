import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { COLORS } from '../theme/colors';

const LATEST_APK_VERSION = '2.4.1';
const LATEST_APK_CODE = 241;

export default function UpdateBanner() {
    const [showUpdate, setShowUpdate] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        if (Platform.OS !== 'web' || typeof window === 'undefined') return;

        // Check if running inside Android APK wrapper
        const isAndroidApk = Boolean(window.ShadowStreamNative);
        if (isAndroidApk) {
            // Check if native bridge has latest orientation support or version code
            const currentCode = typeof window.ShadowStreamNative.getAppVersionCode === 'function'
                ? window.ShadowStreamNative.getAppVersionCode()
                : (window.ShadowStreamNative.setOrientation ? 241 : 240);

            if (currentCode < LATEST_APK_CODE) {
                setShowUpdate(true);
            }
        }
    }, []);

    if (!showUpdate || dismissed) return null;

    const handleUpdate = () => {
        if (typeof window !== 'undefined') {
            window.location.href = 'https://ssmoviestvs.site/downloads/ShadowStream.apk';
        }
    };

    return (
        <View style={styles.banner}>
            <View style={styles.content}>
                <Text style={styles.icon}>🚀</Text>
                <View style={styles.textWrap}>
                    <Text style={styles.title}>Update Available (v{LATEST_APK_VERSION})</Text>
                    <Text style={styles.subtitle}>
                        Install the latest version for automatic screen rotation & player fixes.
                    </Text>
                </View>
            </View>
            <View style={styles.actions}>
                <TouchableOpacity style={styles.updateBtn} onPress={handleUpdate} activeOpacity={0.8}>
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
        backgroundColor: COLORS.brand,
        paddingVertical: 5,
        paddingHorizontal: 12,
        borderRadius: 4,
    },
    updateBtnText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '700',
    },
    dismissBtn: {
        padding: 4,
    },
    dismissBtnText: {
        color: COLORS.textMuted,
        fontSize: 13,
        fontWeight: '700',
    },
});
