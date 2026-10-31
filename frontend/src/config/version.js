// Single source of truth for app versioning across all frontend targets
export const CURRENT_VERSION = '2.4.40';
export const CURRENT_CODE = 280;
export const CURRENT_RELEASE_DATE = '2026-11-01';

/**
 * Compare two semver strings (e.g. '2.4.28' vs '2.4.27').
 * Returns true if remote is strictly greater than local.
 */
export function isNewerVersion(remote, local) {
    if (!remote || !local) return false;
    const cleanRemote = String(remote).replace(/^v/, '').trim();
    const cleanLocal = String(local).replace(/^v/, '').trim();
    if (cleanRemote === cleanLocal) return false;

    const rParts = cleanRemote.split('.').map(n => parseInt(n, 10) || 0);
    const lParts = cleanLocal.split('.').map(n => parseInt(n, 10) || 0);

    for (let i = 0; i < Math.max(rParts.length, lParts.length); i++) {
        const r = rParts[i] || 0;
        const l = lParts[i] || 0;
        if (r > l) return true;
        if (r < l) return false;
    }
    return false;
}
