/**
 * PWA wiring: service-worker registration and the install prompt.
 *
 * Registration is intentionally NOT done from index.js on native. Expo's entry
 * point also runs for Android/iOS where `navigator.serviceWorker` does not
 * exist, and we must not register a service worker inside a native WebView —
 * it would serve stale content over a build that is already local.
 */

const isWeb = typeof window !== 'undefined' && typeof navigator !== 'undefined';

export function isServiceWorkerSupported() {
    return isWeb && 'serviceWorker' in navigator;
}

/**
 * Register /sw.js. Safe to call more than once.
 * @returns {Promise<ServiceWorkerRegistration|null>}
 */
export async function registerServiceWorker() {
    if (!isServiceWorkerSupported()) return null;
    // In dev the bundle is served from Metro; a cached shell would be worse
    // than no shell at all.
    if (process.env.NODE_ENV !== 'production') return null;

    try {
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        return reg;
    } catch (e) {
        console.warn('[ShadowStream] Service worker registration failed:', e && e.message);
        return null;
    }
}

/**
 * Wire the browser install prompt so we can offer "Install app" in-app.
 * @returns {() => void} cleanup
 */
export function watchInstallPrompt() {
    if (!isWeb) return () => undefined;

    const onBeforeInstall = (e) => {
        e.preventDefault();
        window.__shadowStreamInstallPrompt = e;
        window.dispatchEvent(new CustomEvent('shadowstream:installable'));
    };
    const onInstalled = () => {
        window.__shadowStreamInstallPrompt = null;
        window.dispatchEvent(new CustomEvent('shadowstream:installed'));
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
        window.removeEventListener('beforeinstallprompt', onBeforeInstall);
        window.removeEventListener('appinstalled', onInstalled);
    };
}

export async function promptInstall() {
    if (!isWeb || typeof window.__shadowStreamInstallPrompt === 'undefined') return false;
    const p = window.__shadowStreamInstallPrompt;
    if (!p) return false;
    p.prompt();
    const choice = await p.userChoice;
    window.__shadowStreamInstallPrompt = null;
    return choice && choice.outcome === 'accepted';
}
