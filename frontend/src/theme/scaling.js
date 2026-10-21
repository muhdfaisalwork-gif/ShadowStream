import { useWindowDimensions, PixelRatio, Platform } from 'react-native';

// Base guideline dimensions (iPhone 13 / modern standard phone)
const GUIDELINE_BASE_WIDTH = 375;
const GUIDELINE_BASE_HEIGHT = 812;

/**
 * Linear horizontal scale based on current width.
 */
export function scale(size, width = 375) {
    return Math.round((width / GUIDELINE_BASE_WIDTH) * size);
}

/**
 * Linear vertical scale based on current height.
 */
export function verticalScale(size, height = 812) {
    return Math.round((height / GUIDELINE_BASE_HEIGHT) * size);
}

/**
 * Moderate scale with dampening factor (0.5 default).
 * Prevents text and buttons from shrinking or ballooning too aggressively.
 */
export function moderateScale(size, factor = 0.5, width = 375) {
    return Math.round(size + (scale(size, width) - size) * factor);
}

/**
 * Determine current responsive tier and layout metrics.
 */
export function getResponsiveLayout(width, height) {
    const isSmallMobile = width < 400;
    const isMobile = width < 768;
    const isTablet = width >= 768 && width < 1024;
    const isDesktop = width >= 1024;
    const isLargeDesktop = width >= 1440;
    const isPortrait = height > width;

    // Grid columns based on viewport tier
    const gridColumns = isSmallMobile ? 2 : isMobile ? (width > 560 ? 3 : 2) : isTablet ? 4 : isLargeDesktop ? 6 : 5;

    // Hero banner metrics
    const heroHeight = isSmallMobile ? 320 : isMobile ? 360 : isTablet ? 440 : 560;
    const heroTitleSize = isSmallMobile ? 20 : isMobile ? 24 : isTablet ? 28 : 34;

    // Media card metrics
    const cardWidth = isSmallMobile ? 128 : isMobile ? 140 : isTablet ? 155 : 170;
    const posterHeight = Math.round(cardWidth * 1.5); // standard 2:3 aspect ratio

    // Screen content padding
    const horizontalPadding = isSmallMobile ? 12 : isMobile ? 16 : isTablet ? 24 : 32;

    return {
        width,
        height,
        isSmallMobile,
        isMobile,
        isTablet,
        isDesktop,
        isLargeDesktop,
        isPortrait,
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
