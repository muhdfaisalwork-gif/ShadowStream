import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, Platform } from 'react-native';
import { COLORS } from '../theme/colors';
import { getResponsiveLayout } from '../theme/scaling';

export default function MobileTabBar({ navigation, activeRoute }) {
    const { width, height } = useWindowDimensions();
    const responsive = getResponsiveLayout(width, height);

    // Only show on phone/mobile form-factors; tablets and desktops use header navigation + drawer
    if (responsive.isDesktop || responsive.isTablet) return null;

    const isCompact = responsive.isMobileLandscape;

    const tabs = [
        { label: 'Home', icon: '🏠', route: 'Home' },
        { label: 'Movies', icon: '🎬', route: 'Movies' },
        { label: 'TV', icon: '📺', route: 'TV' },
        { label: 'Anime', icon: '⚡', route: 'Anime' },
        { label: 'Search', icon: '🔍', route: 'Search' },
        { label: 'Library', icon: '📚', route: 'Watchlist' }
    ];

    return (
        <View style={[styles.tabBar, isCompact && styles.tabBarCompact]}>
            {tabs.map(tab => {
                const isActive = activeRoute === tab.route;
                return (
                    <TouchableOpacity
                        key={tab.route}
                        style={[styles.tabItem, isCompact && styles.tabItemCompact]}
                        onPress={() => navigation.navigate(tab.route)}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.tabIcon, isCompact && styles.tabIconCompact, isActive && styles.tabIconActive]}>
                            {tab.icon}
                        </Text>
                        <Text style={[styles.tabLabel, isCompact && styles.tabLabelCompact, isActive && styles.tabLabelActive]}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        minHeight: 56,
        paddingBottom: Platform.OS === 'web' ? 'max(6px, env(safe-area-inset-bottom, 6px))' : 6,
        paddingTop: 4,
        backgroundColor: 'rgba(18, 18, 22, 0.98)',
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 100,
        boxShadow: '0 -2px 10px rgba(0,0,0,0.4)',
    },
    tabBarCompact: {
        minHeight: 40,
        paddingTop: 2,
        paddingBottom: 2,
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 4,
        minHeight: 46,
    },
    tabItemCompact: {
        flexDirection: 'row',
        gap: 4,
        minHeight: 34,
        paddingVertical: 2,
    },
    tabIcon: {
        fontSize: 18,
        opacity: 0.75,
        marginBottom: 2
    },
    tabIconCompact: {
        fontSize: 14,
        marginBottom: 0
    },
    tabIconActive: {
        opacity: 1,
        transform: [{ scale: 1.1 }]
    },
    tabLabel: {
        color: COLORS.textMuted,
        fontSize: 10,
        fontWeight: '600'
    },
    tabLabelCompact: {
        fontSize: 10,
    },
    tabLabelActive: {
        color: COLORS.brandSecondary,
        fontWeight: '700'
    }
});
