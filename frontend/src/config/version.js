/**
 * Single source of truth for app version and build numbers across the frontend.
 */
export const CURRENT_VERSION = '2.4.27';
export const CURRENT_CODE = 267;
export const CURRENT_RELEASE_DATE = '2026-10-27';

/**
 * Compare two semver strings (e.g. '2.4.27' vs '2.4.26').
 * Returns true only if `remote` is strictly newer than `local`.
 */
export function isNewerVersion(remote, local) {
    if (!remote || !local) return false;
    const rParts = String(remote).split('.').map(n => parseInt(n, 10) || 0);
    const lParts = String(local).split('.').map(n => parseInt(n, 10) || 0);
    for (let i = 0; i < Math.max(rParts.length, lParts.length); i++) {
        const r = rParts[i] || 0;
        const l = lParts[i] || 0;
        if (r > l) return true;
        if (r < l) return false;
    }
    return false;
}
