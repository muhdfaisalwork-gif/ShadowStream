import { useWindowDimensions, PixelRatio, Platform } from 'react-native';

// Base guideline dimensions (iPhone 13 / modern standard phone)
const GUIDELINE_BASE_WIDTH = 375;
const GUIDELINE_BASE_HEIGHT = 812;

/**
 * Safe horizontal linear scale based on current width.
 * Clamped between 0.8x and 1.35x to prevent extreme ballooning on wide screens or landscape.
 */
export function scale(size, width = 375) {
    const ratio = Math.min(Math.max(width / GUIDELINE_BASE_WIDTH, 0.8), 1.35);
    return Math.round(size * ratio);
}

/**
 * Safe vertical linear scale based on current height.
 * Clamped between 0.8x and 1.35x to prevent extreme compression or expansion.
 */
export function verticalScale(size, height = 812) {
    const ratio = Math.min(Math.max(height / GUIDELINE_BASE_HEIGHT, 0.8), 1.35);
    return Math.round(size * ratio);
}

/**
 * Moderate scale with dampening factor (0.5 default).
 * Prevents text and buttons from shrinking or ballooning aggressively.
 */
export function moderateScale(size, factor = 0.5, width = 375) {
    return Math.round(size + (scale(size, width) - size) * factor);
}

/**
 * Font scale clamped to prevent text truncation on small or rotated displays.
 */
export function fontScale(size, width = 375) {
    const ratio = Math.min(Math.max(width / GUIDELINE_BASE_WIDTH, 0.85), 1.25);
    return Math.round(size * ratio);
}

/**
 * Determine current responsive tier and layout metrics based on physical device form factor
 * and active orientation (portrait vs landscape).
 */
export function getResponsiveLayout(width, height) {
    const minDim = Math.min(width, height);
    const maxDim = Math.max(width, height);
    const isLandscape = width > height;
    const isPortrait = !isLandscape;

    // Responsive tiers based on current viewport width (seamless, zero gaps):
    // Phone / Mobile: width < 600
    // Tablet: width >= 600 && width < 1024
    // Desktop: width >= 1024
    // Large Desktop: width >= 1440
    const isPhone = width < 600;
    const isTablet = width >= 600 && width < 1024;
    const isDesktop = width >= 1024;
    const isLargeDesktop = width >= 1440;

    // Mobile viewport classification
    const isMobile = isPhone;
    const isMobileLandscape = isPhone && isLandscape;
    const isSmallMobile = width < 380;
    const isTabletPortrait = isTablet && isPortrait;
    const isTabletLandscape = isTablet && isLandscape;

    // Grid columns based on usable width and orientation
    let gridColumns = 2;
    if (isLargeDesktop) {
        gridColumns = 6;
    } else if (isDesktop) {
        gridColumns = 5;
    } else if (isTablet) {
        gridColumns = isLandscape ? 4 : 3;
    } else if (isMobileLandscape) {
        gridColumns = width >= 740 ? 4 : 3;
    } else {
        gridColumns = width >= 480 ? 3 : 2;
    }

    // Hero banner metrics: adapt height to screen height in landscape!
    let heroHeight;
    if (isDesktop) {
        heroHeight = 520;
    } else if (isTablet) {
        heroHeight = isLandscape ? 380 : 440;
    } else if (isMobileLandscape) {
        heroHeight = Math.min(Math.round(height * 0.76), 270);
    } else if (isSmallMobile) {
        heroHeight = 310;
    } else {
        heroHeight = 350;
    }

    let heroTitleSize = isDesktop ? 32 : (isTablet ? 26 : (isMobileLandscape ? 20 : 22));

    // Media card metrics
    const cardWidth = isDesktop ? 170 : (isTablet ? 155 : (isMobileLandscape ? 132 : 140));
    const posterHeight = Math.round(cardWidth * 1.5); // standard 2:3 aspect ratio

    // Screen content horizontal padding
    const horizontalPadding = isDesktop ? 28 : (isTablet ? 20 : (isMobileLandscape ? 16 : 14));

    return {
        width,
        height,
        minDim,
        maxDim,
        isPortrait,
        isLandscape,
        isPhone,
        isSmallMobile,
        isMobile,
        isMobileLandscape,
        isTablet,
        isTabletPortrait,
        isTabletLandscape,
        isDesktop,
        isLargeDesktop,
        gridColumns,
        heroHeight,
        heroTitleSize,
        cardWidth,
        posterHeight,
        horizontalPadding,
    };
}

/**
 * React hook to access responsive metrics in any component.
 */
export function useResponsive() {
    const { width, height } = useWindowDimensions();
    return getResponsiveLayout(width, height);
}
