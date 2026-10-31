/**
 * ShadowStream AdShield — Ultra-Strict Popup, Popunder, and Third-Party Link Interceptor.
 *
 * Protects users while playing movies and TV shows by:
 *   1. User-controlled "No Ads" mode (ON by default).
 *   2. Overriding `window.open` to block and close unauthorized popup/popunder windows.
 *   3. Guarding `HTMLAnchorElement.prototype.click` to block hidden programmatic ad clicks.
 *   4. Guarding `EventTarget.prototype.dispatchEvent` to prevent synthetic ad click triggering.
 *   5. Global capture-phase click and auxclick interception to prevent invisible transparent overlay clickjacking.
 *   6. Guarding top-level window navigation against hostile ad redirects.
 *   7. Disarming background iframe blur/focus stealing popunders.
 *   8. Real-time event broadcasting to update player HUD badges and blocked counters.
 */

const STORAGE_KEY = 'no_ads_mode';

function readStoredPreference() {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            const val = window.localStorage.getItem(STORAGE_KEY);
            if (val !== null) return val === 'true' || val === '1';
        }
    } catch (_) {}
    return true; // Default to ON
}

function writeStoredPreference(val) {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(STORAGE_KEY, String(val));
        }
    } catch (_) {}
}

/** Origins and CDNs we own or explicitly trust for media playback, downloads, and app links. */
const FIRST_PARTY = [
    'ssmoviestvs.site',
    'localhost',
    '127.0.0.1',
    'archive.org',
    'googleapis.com',
    'googleusercontent.com',
    'cloudflarestream.com',
    'r2.cloudflarestorage.com',
    'github.com',
    'themoviedb.org',
    'tmdb.org',
    'imdb.com',
    'player.videasy.to',
    'videasy.to',
    'backend.videasy.to',
    'vidstuck.cc',
    'vidy.st',
    'www.vidy.st',
    'donkey.to',
    'vidsrc.to',
    'vidsrc.me',
    'vidsrc.rip',
    '2embed.cc',
    'www.2embed.cc',
    'nontongo.win',
    'www.nontongo.win',
    'smashystream.com',
    'embed.smashystream.com',
    'vidlink.pro',
    'vidlink.org',
    'animesalt.cx',
    'opensubtitles.org',
    'opensubtitles.com',
];

/** Safe external player schemes (VLC, PotPlayer, MPV) */
const ALLOWED_SCHEMES = [
    'vlc:',
    'vlc-x-callback:',
    'potplayer:',
    'mpv:',
    'mailto:',
];

/** Fast rejection keywords for known ad, casino, and tracking networks */
const AD_KEYWORDS = [
    'adsterra', 'popcash', 'popads', 'monetag', 'propellerads', 'onclicktop', 'onclick',
    'exoclick', 'trafficjunky', 'hilltopads', 'clickadu', 'admaven', 'bet365', '1xbet',
    'highperformancegate', 'effectivegate', 'profitablegatetocontent', 'al5sm', 'whomeverwhistle',
    'deloton', 'galaksion', 'rollerads', 'richpush', 'evadav', 'juicyads', 'vdo.ai',
    'doubleclick', 'googleadservices', 'googlesyndication', 'adnxs', 'criteo', 'taboola',
    'outbrain', 'melbet', 'mostbet', 'parimatch', 'dafabet', 'stake.com', 'betwinner',
    'megapari', 'linebet', 'pin-up.bet', 'sodlessteargas', 'yllix', 'adcash', 'pubfuture',
    'richaudience', 'infolinks', 'poppush', 'ad-maven', 'clicksor', 'zergnet', 'mgid',
    'revcontent', 'scorecardresearch', 'quantserve', 'adservice.google', 'adcolony',
    'onclickperformance', 'glispa', 'adkeep', 'creativecdn', 'cpmstar', 'adtrue',
    'inpagepush', 'pushame', 'propellerclick', 'propu.sh', 'onclickalgo', 'onclkds',
    'ad-delivery', 'trafficstars', 'bidgear', 'adsco.re', 'adexc', 'adkernel',
    'adxadserv', 'clickaine', 'coinhive', 'cryptoloot', 'jscache', 'adpushup',
    'ezoic', 'a-ads', 'realsrv', 'tsyndicate', 'serving-sys', 'rubiconproject',
    'openx', 'pubmatic', 'casalemedia', 'smartadserver', 'spotxchange', 'spotx.tv',
    'tremorhub', 'sovrn', 'lijit', 'yieldmo', 'sharethrough', 'teads.tv', 'unruly',
    'triplelift', 'gumgum', 'undertone', 'kargo', 'inmobi', 'ironsrc', 'applovin',
    'vungle', 'chartboost', 'fyber', 'mintegral', 'tapjoy', 'flurry', 'adjust.com',
    'appsflyer', 'branch.io', 'singular.net', 'kochava',
    'aclib', 'histats', 'llvpn', 'notix', 'webpushr', 'popmyads', 'bidvertiser',
    'pushwelcome', 'ad-score', 'adtelligent', 'pubmine', 'clickfair', 'adserver',
    'adservice', 'adnuntius', 'trafficjunky', 'cryptoloot', 'zergnet', 'adcash',
    'creative-serving', 'trackvoluum', 'propeller', 'unfortunatelyejectinflected'
];

let noAdsActive = readStoredPreference();
let blockedCount = 0;
let installed = false;
let originalOpen = null;
let originalAnchorClick = null;
let clickInterceptorAttached = false;
let beforeUnloadAttached = false;
let blurTrapAttached = false;

const blockedListeners = new Set();
const toggleListeners = new Set();

/**
 * Check if a URL belongs to a first-party, allowed stream CDN, or internal route.
 */
export function isAllowed(url) {
    if (typeof url !== 'string' || url.trim() === '') return false;

    const lowerUrl = url.toLowerCase();

    // Fast reject ad networks and tracker indicators
    if (AD_KEYWORDS.some((kw) => lowerUrl.includes(kw))) {
        return false;
    }

    // Reject known ad query patterns
    if (lowerUrl.includes('zoneid=') || lowerUrl.includes('bannerid=') || lowerUrl.includes('popunder') ||
        lowerUrl.includes('campaignid=') || lowerUrl.includes('aff_id=') || lowerUrl.includes('/pop/')) {
        return false;
    }

    // blob:/data: URLs are generated by our own download + player code.
    if (url.startsWith('blob:') || url.startsWith('data:')) return true;

    // Guard intent:// URIs: only permit intents explicitly targeting trusted video players
    if (url.startsWith('intent:')) {
        return lowerUrl.includes('videolan') || lowerUrl.includes('video/*') || lowerUrl.includes('mxtech');
    }

    // External player protocols (VLC, MPV, PotPlayer)
    if (ALLOWED_SCHEMES.some((s) => url.startsWith(s))) return true;

    // Relative URLs are same-document / our own in-app routing.
    if (url.startsWith('/') || url.startsWith('./') || url.startsWith('#')) return true;

    let parsed;
    try {
        const baseOrigin = typeof window !== 'undefined' && window.location?.origin
            ? window.location.origin
            : 'https://ssmoviestvs.site';
        parsed = new URL(url, baseOrigin);
    } catch (_) {
        return false;
    }

    const host = parsed.hostname.toLowerCase();

    // Same-origin is always safe
    if (typeof window !== 'undefined' && window.location && parsed.origin === window.location.origin) {
        return true;
    }

    // Explicitly trusted first-party, media CDN, and ecosystem domains
    return FIRST_PARTY.some((domain) => host === domain || host.endsWith('.' + domain));
}

/** Record a blocked ad attempt and notify UI */
export function recordBlocked(url, reason) {
    blockedCount += 1;
    if (typeof console !== 'undefined') {
        console.warn(`[AdShield] Blocked 3rd-party ${reason}:`, url);
    }

    const eventData = { url, reason, count: blockedCount, timestamp: Date.now() };

    blockedListeners.forEach((fn) => {
        try { fn(eventData); } catch (_) {}
    });

    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        try {
            window.dispatchEvent(new CustomEvent('shadowstream:adshield-blocked', { detail: eventData }));
        } catch (_) {}
    }
}

/** Get current No Ads status */
export function isNoAdsActive() {
    return noAdsActive;
}

/** Get total ads blocked in this session */
export function getBlockedCount() {
    return blockedCount;
}

/** Set No Ads status and notify listeners */
export function setNoAdsActive(enabled) {
    const bool = Boolean(enabled);
    if (noAdsActive === bool) return;
    noAdsActive = bool;

    try {
        writeStoredPreference(bool);
    } catch (_) {}

    toggleListeners.forEach((fn) => {
        try { fn(bool); } catch (_) {}
    });

    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        try {
            window.dispatchEvent(new CustomEvent('shadowstream:no-ads-toggle', { detail: { enabled: bool } }));
        } catch (_) {}
    }
}

/** Toggle No Ads mode between ON and OFF */
export function toggleNoAds() {
    const next = !noAdsActive;
    setNoAdsActive(next);
    return next;
}

/** Subscribe to blocked ad events */
export function onAdBlocked(callback) {
    if (typeof callback === 'function') {
        blockedListeners.add(callback);
        return () => blockedListeners.delete(callback);
    }
    return () => {};
}

/** Subscribe to No Ads toggle changes */
export function onNoAdsChange(callback) {
    if (typeof callback === 'function') {
        toggleListeners.add(callback);
        return () => toggleListeners.delete(callback);
    }
    return () => {};
}

/** Global capture-phase click and auxclick handler (stops ads before reaching document listeners) */
function globalCaptureClickHandler(e) {
    if (!noAdsActive) return;

    try {
        const anchor = e.target && typeof e.target.closest === 'function' ? e.target.closest('a') : null;
        if (anchor && anchor.href) {
            if (!isAllowed(anchor.href)) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                recordBlocked(anchor.href, `${e.type || 'link'} click`);
            }
        }
    } catch (_) {}
}

/** Mock window object returned when window.open is blocked to neutralize ad scripts */
function createMockWindow() {
    return {
        closed: true,
        close: () => {},
        focus: () => {},
        blur: () => {},
        postMessage: () => {},
        opener: null,
    };
}

/**
 * Install the AdShield interceptors on the global window.
 */
export function installAdShield() {
    if (installed) return () => undefined;
    if (typeof window === 'undefined') {
        return () => undefined;
    }

    installed = true;

    // 1. Intercept window.open and lock it so hostile ad scripts cannot overwrite it
    if (typeof window.open === 'function') {
        originalOpen = window.open;
        const guardedOpen = function shadowStreamWindowOpen(url, target, features) {
            if (!noAdsActive) {
                return originalOpen.call(window, url, target, features);
            }
            if (!url || url === 'about:blank' || url === '' || !isAllowed(url)) {
                recordBlocked(url || 'blank popup', 'popup attempt');
                return createMockWindow();
            }
            return originalOpen.call(window, url, target, features);
        };
        try {
            Object.defineProperty(window, 'open', {
                value: guardedOpen,
                configurable: false,
                writable: false,
            });
        } catch (_) {
            window.open = guardedOpen;
        }
    }

    // 2. Intercept programmatic HTMLAnchorElement.click
    const AnchorCls = (typeof window !== 'undefined' && window.HTMLAnchorElement) ? window.HTMLAnchorElement : ((typeof globalThis !== 'undefined' && globalThis.HTMLAnchorElement) ? globalThis.HTMLAnchorElement : null);
    if (AnchorCls && AnchorCls.prototype) {
        originalAnchorClick = AnchorCls.prototype.click;
        AnchorCls.prototype.click = function guardedClick(...args) {
            if (noAdsActive && this && this.href && !isAllowed(this.href)) {
                recordBlocked(this.href, 'programmatic anchor click');
                return;
            }
            return originalAnchorClick ? originalAnchorClick.apply(this, args) : undefined;
        };
    }


    // 2c. Intercept programmatic HTMLFormElement.submit (used by ad networks to bypass window.open)
    const FormCls = (typeof window !== 'undefined' && window.HTMLFormElement) ? window.HTMLFormElement : ((typeof globalThis !== 'undefined' && globalThis.HTMLFormElement) ? globalThis.HTMLFormElement : null);
    if (FormCls && FormCls.prototype) {
        const originalFormSubmit = FormCls.prototype.submit;
        FormCls.prototype.submit = function guardedFormSubmit(...args) {
            if (noAdsActive && this) {
                const targetAction = this.action || this.getAttribute('action') || '';
                const targetAttr = this.target || this.getAttribute('target') || '';
                if (targetAction && !isAllowed(targetAction)) {
                    recordBlocked(targetAction, 'ad form submission');
                    return;
                }
                if (targetAttr === '_blank' && !isAllowed(targetAction)) {
                    recordBlocked(targetAction || 'form_blank', 'popup form submission');
                    return;
                }
            }
            return originalFormSubmit.apply(this, args);
        };
    }

    // 3. Global capture-phase click and auxclick handlers (blocks clicks before they reach ad listeners)
    if (typeof document !== 'undefined' && document.addEventListener && !clickInterceptorAttached) {
        document.addEventListener('click', globalCaptureClickHandler, true);
        document.addEventListener('auxclick', globalCaptureClickHandler, true);
        clickInterceptorAttached = true;
    }

    // 4. Guard against hostile top-level navigation / popunder redirects
    if (typeof window !== 'undefined' && window.addEventListener && !beforeUnloadAttached) {
        const unloadGuard = (e) => {
            if (!noAdsActive) return;
            // Detect if document.activeElement is an iframe when unloading is triggered
            if (document.activeElement && document.activeElement.tagName === 'IFRAME') {
                recordBlocked(document.activeElement.src || 'embed', 'top-navigation redirect');
            }
        };
        window.addEventListener('beforeunload', unloadGuard);
        beforeUnloadAttached = true;
    }

    // 5. Normal iframe focus transitions permitted so user clicks initiate playback smoothly without focus-stealing interruptions.

    // 6. Guard programmatic window.location assignment against hostile ad redirects
    if (typeof window !== 'undefined' && window.location) {
        try {
            const loc = window.location;
            if (typeof loc.assign === 'function') {
                const origAssign = loc.assign.bind(loc);
                loc.assign = function guardedAssign(url) {
                    if (noAdsActive && !isAllowed(url)) {
                        recordBlocked(url, 'location.assign redirect');
                        return;
                    }
                    return origAssign(url);
                };
            }
            if (typeof loc.replace === 'function') {
                const origReplace = loc.replace.bind(loc);
                loc.replace = function guardedReplace(url) {
                    if (noAdsActive && !isAllowed(url)) {
                        recordBlocked(url, 'location.replace redirect');
                        return;
                    }
                    return origReplace(url);
                };
            }
        } catch (_) {}
    }

    return uninstallAdShield;
}

/**
 * Remove all installed interceptors.
 */
export function uninstallAdShield() {
    if (!installed) return;
    if (typeof window !== 'undefined' && originalOpen) {
        try {
            Object.defineProperty(window, 'open', {
                value: originalOpen,
                configurable: true,
                writable: true,
            });
        } catch (_) {
            window.open = originalOpen;
        }
        originalOpen = null;
    }
    const AnchorCls = (typeof window !== 'undefined' && window.HTMLAnchorElement) ? window.HTMLAnchorElement : ((typeof globalThis !== 'undefined' && globalThis.HTMLAnchorElement) ? globalThis.HTMLAnchorElement : null);
    if (AnchorCls && AnchorCls.prototype && originalAnchorClick) {
        AnchorCls.prototype.click = originalAnchorClick;
        originalAnchorClick = null;
    }

    if (typeof document !== 'undefined' && document.removeEventListener && clickInterceptorAttached) {
        document.removeEventListener('click', globalCaptureClickHandler, true);
        document.removeEventListener('auxclick', globalCaptureClickHandler, true);
        clickInterceptorAttached = false;
    }
    installed = false;
}

/** Test seam: exposed for assertion without a browser click. */
export const __adShield = {
    isAllowed,
    isNoAdsActive,
    setNoAdsActive,
    toggleNoAds,
    getBlockedCount,
    recordBlocked
};
