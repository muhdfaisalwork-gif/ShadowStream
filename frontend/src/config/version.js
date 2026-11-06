// Single source of truth for app versioning across all frontend targets
export const CURRENT_VERSION = '2.4.47';
export const CURRENT_CODE = 287;
export const CURRENT_RELEASE_DATE = 'November 6, 2026';

/**
 * Returns true if remoteVer is strictly greater than currentVer using semver semantics.
 * E.g., isNewerVersion('2.4.47', '2.4.42') -> true
 */
export function isNewerVersion(remoteVer, currentVer) {
    if (!remoteVer || !currentVer) return false;
    const rParts = String(remoteVer).split('.').map(n => parseInt(n, 10) || 0);
    const cParts = String(currentVer).split('.').map(n => parseInt(n, 10) || 0);
    for (let i = 0; i < Math.max(rParts.length, cParts.length); i++) {
        const r = rParts[i] || 0;
        const c = cParts[i] || 0;
        if (r > c) return true;
        if (r < c) return false;
    }
    return false;
}
