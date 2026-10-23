/**
 * PWA wiring: service-worker registration, auto-update detection, and install prompt.
 */

const isWeb = typeof window !== 'undefined' && typeof navigator !== 'undefined';

export function isServiceWorkerSupported() {
    return isWeb && 'serviceWorker' in navigator;
}

/**
 * Register /sw.js with active update detection.
 * @returns {Promise<ServiceWorkerRegistration|null>}
 */
export async function registerServiceWorker() {
    if (!isServiceWorkerSupported()) return null;
    if (process.env.NODE_ENV !== 'production') return null;

    try {
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

        // If an updated worker is already waiting, emit update event
        if (reg.waiting) {
            window.dispatchEvent(new CustomEvent('shadowstream:update-available', { detail: { registration: reg } }));
        }

        // Listen for new worker installed in waiting state
        reg.addEventListener('updatefound', () => {
            const installing = reg.installing;
            if (!installing) return;
            installing.addEventListener('statechange', () => {
                if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                    window.dispatchEvent(new CustomEvent('shadowstream:update-available', { detail: { registration: reg } }));
                }
            });
        });

        // Periodic check for updates every 30 minutes
        setInterval(() => {
            reg.update().catch(() => {});
        }, 30 * 60 * 1000);

        // Check for updates when user returns to the app tab
        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') {
                    reg.update().catch(() => {});
                }
            });
        }

        return reg;
    } catch (e) {
        console.warn('[ShadowStream] Service worker registration failed:', e && e.message);
        return null;
    }
}

// Automatically reload on controllerchange when the new service worker activates
if (isWeb && 'serviceWorker' in navigator) {
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
            refreshing = true;
            window.location.reload();
        }
    });
}

/**
 * Tell the waiting Service Worker to skipWaiting and activate, triggering an app reload.
 */
export async function applyAppUpdate() {
    try {
        if (typeof window !== 'undefined' && 'caches' in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map(k => caches.delete(k)));
        }
    } catch (_) {}

    if (isServiceWorkerSupported()) {
        try {
            const reg = await navigator.serviceWorker.getRegistration();
            if (reg) {
                if (reg.waiting) {
                    reg.waiting.postMessage({ type: 'SKIP_WAITING' });
                }
                await reg.update().catch(() => {});
            }
        } catch (_) {}
    }

    if (typeof window !== 'undefined') {
        const u = new URL(window.location.href);
        u.searchParams.set('_v', String(Date.now()));
        window.location.href = u.toString();
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
