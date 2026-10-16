import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, Platform } from 'react-native';
import { COLORS } from '../theme/colors';

export default function MobileTabBar({ navigation, activeRoute }) {
    const { width } = useWindowDimensions();
    if (width >= 768) return null; // Only show on mobile devices / small viewports

    const tabs = [
        { label: 'Home', icon: '🏠', route: 'Home' },
        { label: 'Movies', icon: '🎬', route: 'Movies' },
        { label: 'TV', icon: '📺', route: 'TV' },
        { label: 'Anime', icon: '⚡', route: 'Anime' },
        { label: 'Search', icon: '🔍', route: 'Search' },
        { label: 'Library', icon: '📚', route: 'Watchlist' }
    ];

    return (
        <View style={styles.tabBar}>
            {tabs.map(tab => {
                const isActive = activeRoute === tab.route;
                return (
                    <TouchableOpacity
                        key={tab.route}
                        style={styles.tabItem}
                        onPress={() => navigation.navigate(tab.route)}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.tabIcon, isActive && styles.tabIconActive]}>
                            {tab.icon}
                        </Text>
                        <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
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
        minHeight: 58,
        paddingBottom: Platform.OS === 'web' ? 'max(6px, env(safe-area-inset-bottom, 6px))' : 6,
        paddingTop: 4,
        backgroundColor: 'rgba(18, 18, 22, 0.96)',
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 100,
        boxShadow: '0 -2px 10px rgba(0,0,0,0.4)',
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 4,
        minHeight: 48,
    },
    tabIcon: {
        fontSize: 18,
        opacity: 0.7,
        marginBottom: 2
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
    tabLabelActive: {
        color: COLORS.brandSecondary,
        fontWeight: '700'
    }
});
