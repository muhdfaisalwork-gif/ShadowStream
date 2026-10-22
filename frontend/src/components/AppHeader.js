import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, Image } from 'react-native';
import { COLORS } from '../theme/colors';
import { getResponsiveLayout } from '../theme/scaling';
import { Storage } from '../utils/storage';
import { isNoAdsActive, toggleNoAds, onNoAdsChange } from '../utils/adShield';

export default function AppHeader({ navigation, activeRoute, title }) {
    const { width, height } = useWindowDimensions();
    const responsive = getResponsiveLayout(width, height);
    const isDesktop = responsive.isDesktop;
    const isTablet = responsive.isTablet;
    const isMobile = responsive.isMobile;
    const isMobileLandscape = responsive.isMobileLandscape;

    const [watchlistCount, setWatchlistCount] = useState(0);
    const [noAdsOn, setNoAdsOn] = useState(isNoAdsActive());

    useEffect(() => {
        return onNoAdsChange(setNoAdsOn);
    }, []);

    useEffect(() => {
        const updateCount = () => {
            const list = Storage.get('watchlist', []);
            setWatchlistCount(Array.isArray(list) ? list.length : 0);
        };
        updateCount();
        const interval = setInterval(updateCount, 2500);
        return () => clearInterval(interval);
    }, []);

    const toggleDrawer = () => {
        try {
            navigation.toggleDrawer();
        } catch (e) {
            try {
                navigation.getParent('Drawer')?.toggleDrawer();
            } catch (e2) {
                navigation.getParent()?.toggleDrawer();
            }
        }
    };

    const navItems = [
        { label: 'Home', route: 'Home' },
        { label: 'Movies', route: 'Movies' },
        { label: 'TV Shows', route: 'TV' },
        { label: 'Anime', route: 'Anime' },
        { label: 'Short TV', route: 'ShortDramas' },
        { label: 'Countries', route: 'Countries' },
        { label: 'Languages', route: 'Languages' },
        { label: 'Collections', route: 'Collections' },
        { label: 'Blogs', route: 'Blogs' },
        { label: 'Apps', route: 'Apps' }
    ];

    return (
        <View style={styles.header}>
            <View style={styles.leftSection}>
                {!isDesktop && (
                    <TouchableOpacity
                        style={styles.hamburgerBtn}
                        onPress={toggleDrawer}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                        <Text style={styles.hamburgerIcon}>☰</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    style={styles.brandContainer}
                    onPress={() => navigation.navigate('Home')}
                    activeOpacity={0.8}
                    accessibilityLabel="ShadowStream Home"
                >
                    <Image
                        source={require('../../assets/shadowstream-banner.png')}
                        style={isDesktop ? styles.brandBannerDesktop : styles.brandBannerMobile}
                        resizeMode="contain"
                    />
                </TouchableOpacity>

                {title && (
                    <View style={styles.screenTag}>
                        <Text style={styles.screenTagText}>{title}</Text>
                    </View>
                )}
            </View>

            {/* Desktop Navigation Links */}
            {(isDesktop || isTablet) && (
                <View style={styles.navLinksRow}>
                    {navItems.slice(0, isTablet ? 5 : navItems.length).map(item => {
                        const isActive = activeRoute === item.route;
                        return (
                            <TouchableOpacity
                                key={item.route}
                                style={[styles.navLink, isActive && styles.navLinkActive]}
                                onPress={() => navigation.navigate(item.route)}
                            >
                                <Text style={[styles.navLinkText, isActive && styles.navLinkTextActive]}>
                                    {item.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}

            {/* Right Action Icons (Search, Watchlist, History) */}
            <View style={styles.rightSection}>
                {(isDesktop || isTablet) && (
                    <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => navigation.navigate('Search')}
                        accessibilityLabel="Search"
                    >
                        <Text style={styles.actionIcon}>🔍</Text>
                        <Text style={styles.actionBtnLabel}>Search</Text>
                    </TouchableOpacity>
                )}

                {(isDesktop || isTablet) && (
                    <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => navigation.navigate('Watchlist')}
                        accessibilityLabel="Watchlist"
                    >
                        <View style={{ position: 'relative' }}>
                            <Text style={styles.actionIcon}>🔖</Text>
                            {watchlistCount > 0 && (
                                <View style={styles.badgeCounter}>
                                    <Text style={styles.badgeCounterText}>
                                        {watchlistCount > 99 ? '99+' : watchlistCount}
                                    </Text>
                                </View>
                            )}
                        </View>
                        <Text style={styles.actionBtnLabel}>Watchlist</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    style={[styles.noAdsHeaderBtn, noAdsOn ? styles.noAdsHeaderBtnOn : styles.noAdsHeaderBtnOff]}
                    onPress={toggleNoAds}
                    accessibilityRole="switch"
                    accessibilityState={{ checked: noAdsOn }}
                    accessibilityLabel={`No Ads Shield ${noAdsOn ? 'ON' : 'OFF'}`}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Text style={styles.noAdsHeaderIcon}>🛡️</Text>
                    <Text style={[styles.noAdsHeaderLabel, noAdsOn ? styles.noAdsHeaderLabelOn : styles.noAdsHeaderLabelOff]}>
                        {noAdsOn ? (width < 460 ? 'ON' : 'No Ads: ON') : (width < 460 ? 'OFF' : 'Ads Allowed')}
                    </Text>
                </TouchableOpacity>

                {(isDesktop || isTablet) && (
                    <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => navigation.navigate('History')}
                        accessibilityLabel="History"
                    >
                        <Text style={styles.actionIcon}>🕒</Text>
                        <Text style={styles.actionBtnLabel}>History</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        height: 64,
        backgroundColor: COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 18,
        zIndex: 100
    },
    leftSection: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    hamburgerBtn: {
        paddingRight: 14,
        paddingVertical: 6
    },
    hamburgerIcon: {
        color: COLORS.textPrimary,
        fontSize: 22
    },
    brandContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 20
    },
    brandBannerDesktop: {
        width: 148,
        height: 40
    },
    brandBannerMobile: {
        width: 120,
        height: 32
    },
    screenTag: {
        marginLeft: 12,
        backgroundColor: COLORS.surfaceAlt,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    screenTagText: {
        color: COLORS.textSecondary,
        fontSize: 11,
        fontWeight: '600'
    },
    navLinksRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4
    },
    navLink: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6
    },
    navLinkActive: {
        backgroundColor: 'rgba(229, 9, 20, 0.15)'
    },
    navLinkText: {
        color: COLORS.textSecondary,
        fontSize: 13,
        fontWeight: '600'
    },
    navLinkTextActive: {
        color: COLORS.brandSecondary,
        fontWeight: '700'
    },
    rightSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
        backgroundColor: COLORS.surfaceAlt,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    actionIcon: {
        fontSize: 15
    },
    actionBtnLabel: {
        color: COLORS.textPrimary,
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 6
    },
    badgeCounter: {
        position: 'absolute',
        top: -6,
        right: -8,
        backgroundColor: COLORS.brand,
        borderRadius: 9,
        minWidth: 16,
        height: 16,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 3
    },
    badgeCounterText: {
        color: '#FFFFFF',
        fontSize: 9,
        fontWeight: '800'
    },
    noAdsHeaderBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 6,
        borderWidth: 1,
        gap: 5,
    },
    noAdsHeaderBtnOn: {
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        borderColor: 'rgba(16, 185, 129, 0.45)',
    },
    noAdsHeaderBtnOff: {
        backgroundColor: 'rgba(239, 68, 68, 0.12)',
        borderColor: 'rgba(239, 68, 68, 0.35)',
    },
    noAdsHeaderIcon: {
        fontSize: 14,
    },
    noAdsHeaderLabel: {
        fontSize: 11,
        fontWeight: '700',
    },
    noAdsHeaderLabelOn: {
        color: '#34D399',
    },
    noAdsHeaderLabelOff: {
        color: '#F87171',
    }
});
