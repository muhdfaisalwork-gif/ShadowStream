const { app, BrowserWindow, Menu, shell, session } = require('electron');
const path = require('path');

const APP_URL = 'https://ssmoviestvs.site';

let autoUpdater = null;
try {
    ({ autoUpdater } = require('electron-updater'));
} catch (e) {
    autoUpdater = null;
}

let mainWindow;

// Comprehensive AdShield blocklist for known ad, casino, and tracking networks
const AD_DOMAINS = [
    'sodlessteargas.com', 'adsterra.com', 'popads.net', 'popcash.net',
    'monetag.com', 'propellerads.com', 'exoclick.com', 'bet365.com',
    '1xbet.com', 'trafficjunky.com', 'hilltopads.com', 'clickadu.com',
    'yllix.com', 'adcash.com', 'pubfuture.com', 'richaudience.com',
    'vdo.ai', 'infolinks.com', 'onclicktop.com', 'poppush.com',
    'ad-maven.com', 'admaven.com', 'juicyads.com', 'clicksor.com',
    'zergnet.com', 'outbrain.com', 'taboola.com', 'mgid.com',
    'revcontent.com', 'doubleclick.net', 'adnxs.com', 'criteo.com',
    'scorecardresearch.com', 'quantserve.com', 'googlesyndication.com',
    'adservice.google.com', 'googleadservices.com', 'adcolony.com',
    'highperformancegate.com', 'effectivegate.com', 'al5sm.com',
    'whomeverwhistle.com', 'profitablegatetocontent.com', 'onclickperformance.com',
    'deloton.com', 'glispa.com', 'adkeep.net', 'creativecdn.com',
    'cpmstar.com', 'adtrue.com', 'inpagepush.com', 'pushame.com',
    'propellerclick.com', 'propu.sh', 'onclickalgo.com', 'onclkds.com',
    'ad-delivery.net', 'trafficstars.com', 'bidgear.com', 'adsco.re',
    'adexc.net', 'adkernel.com', 'galaksion.com', 'adxadserv.com',
    'rollerads.com', 'clickaine.com', 'evadav.com', 'richpush.co',
    'coinhive.com', 'coin-hive.com', 'cryptoloot.pro', 'jscache.com',
    'adpushup.com', 'ezoic.com', 'a-ads.com', 'realsrv.com',
    'tsyndicate.com', 'serving-sys.com', 'adnxs-simple.com', 'media.net',
    'amazon-adsystem.com', 'rubiconproject.com', 'openx.net', 'pubmatic.com',
    'casalemedia.com', 'smartadserver.com', 'spotxchange.com', 'spotx.tv',
    'tremorhub.com', 'sovrn.com', 'lijit.com', 'yieldmo.com',
    'sharethrough.com', 'teads.tv', 'unruly.co', 'triplelift.com',
    'gumgum.com', 'undertone.com', 'kargo.com', 'inmobi.com',
    'ironsrc.com', 'applovin.com', 'vungle.com', 'chartboost.com',
    'fyber.com', 'mintegral.com', 'tapjoy.com', 'flurry.com',
    'adjust.com', 'appsflyer.com', 'branch.io', 'singular.net',
    'kochava.com', 'melbet.com', 'mostbet.com', 'parimatch.com',
    'dafabet.com', 'stake.com', 'betwinner.com', 'megapari.com',
    'linebet.com', 'mostbet-pk.com', 'pin-up.bet'
];

const AD_PATTERNS = [
    'adserver', 'adservice', 'adsystem', 'popcash', 'popads', 'propeller',
    'monetag', 'clickadu', 'hilltop', 'adsterra', 'exoclick', 'trafficjunky',
    'juicyads', 'onclick', 'highperformancegate', 'profitablegate',
    'effectivegate', 'al5sm', 'whomeverwhistle', 'deloton', 'galaksion',
    'richpush', 'evadav', 'rollerads', 'tsyndicate', 'realsrv', 'bet365',
    '1xbet', 'melbet', 'mostbet', 'parimatch', 'dafabet', 'stake'
];

const EMBED_HOST_HINTS = [
    'vidsrc',
    '2embed',
    'vidlink',
    'multiembed',
    'superembed',
    'moviebox',
    'archive.org',
    'smashystream',
    'embed.su',
    'moviesapi.club',
    'autoembed.co',
    'animesalt'
];

const TRUSTED_EXTERNAL = [
    'github.com',
    'themoviedb.org',
    'tmdb.org',
    'imdb.com',
    'discord.gg',
];

function isAdUrl(urlStr) {
    if (!urlStr || typeof urlStr !== 'string') return false;
    const lower = urlStr.toLowerCase();
    for (const d of AD_DOMAINS) {
        if (lower.includes(d)) return true;
    }
    for (const p of AD_PATTERNS) {
        if (lower.includes(p)) return true;
    }
    if (lower.includes('zoneid=') || lower.includes('bannerid=') || lower.includes('popunder') ||
        lower.includes('campaignid=') || lower.includes('aff_id=') || lower.includes('/pop/')) {
        return true;
    }
    return false;
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 680,
        title: 'ShadowStream — Cinematic Discovery',
        backgroundColor: '#0d0d0d',
        show: false,
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: true,
            allowRunningInsecureContent: false,
            plugins: true
        }
    });

    Menu.setApplicationMenu(null);

    mainWindow.loadURL(APP_URL);

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // 1. Strict Window Open Handler: Deny all popup/popunder creation from iframes
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (!url) return { action: 'deny' };

        // Drop known ad/tracker/betting URLs immediately
        if (isAdUrl(url)) {
            return { action: 'deny' };
        }

        // EMBED PLAYERS NEVER NEED NEW WINDOWS.
        // Third-party embed players call window.open solely for popunders/affiliate redirects.
        // Denying it leaves the player iframe running cleanly inside the main window!
        const isEmbed = EMBED_HOST_HINTS.some((h) => url.toLowerCase().includes(h));
        if (isEmbed) {
            return { action: 'deny' };
        }

        // Trusted external links (IMDb, TMDB, GitHub, Discord) -> open in user's default browser
        const isTrusted = TRUSTED_EXTERNAL.some((domain) => url.toLowerCase().includes(domain));
        if (isTrusted) {
            shell.openExternal(url);
            return { action: 'deny' };
        }

        // Same-origin routes -> navigate within mainWindow
        const isOurs =
            url.includes('ssmoviestvs.site') ||
            url.startsWith('/') ||
            url.startsWith('#');
        if (isOurs) {
            mainWindow.loadURL(url);
            return { action: 'deny' };
        }

        // Silently deny all other popup windows
        return { action: 'deny' };
    });

    // 2. Navigation Guard: prevent hostile ad redirects from hijacking the main window
    mainWindow.webContents.on('will-navigate', (event, url) => {
        if (isAdUrl(url)) {
            event.preventDefault();
            return;
        }
        let parsed;
        try {
            parsed = new URL(url);
        } catch (_) {
            event.preventDefault();
            return;
        }
        const host = (parsed.hostname || '').toLowerCase();
        const isOurs = host === 'ssmoviestvs.site' || host.endsWith('.ssmoviestvs.site') || host === 'localhost' || host === '127.0.0.1';
        if (!isOurs) {
            event.preventDefault();
            const isTrusted = TRUSTED_EXTERNAL.some((domain) => host.includes(domain));
            if (isTrusted) {
                shell.openExternal(url);
            }
        }
    });

    // 3. Subframe Guard: block unauthorized ad navigations inside subframes
    mainWindow.webContents.on('will-frame-navigate', (event) => {
        const url = event.url || '';
        if (isAdUrl(url)) {
            event.preventDefault();
        }
    });

    // 4. Fallback Child Window Guard: destroy any rogue child window immediately
    mainWindow.webContents.on('did-create-window', (childWindow) => {
        try {
            childWindow.destroy();
        } catch (_) {}
    });

    // 5. In-Page AdShield: neutralize window.open in all frames on DOM ready
    mainWindow.webContents.on('dom-ready', () => {
        const clientAdShield = `
            try {
                var mockWin = { closed: true, close: function(){}, focus: function(){}, blur: function(){}, postMessage: function(){} };
                Object.defineProperty(window, 'open', {
                    value: function() { return mockWin; },
                    writable: false,
                    configurable: false
                });
            } catch(e) {}
        `;
        mainWindow.webContents.executeJavaScript(clientAdShield).catch(() => {});
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });

    app.whenReady().then(() => {
        // Network-Level AdShield: cancel all requests to known ad networks before they transfer
        if (session.defaultSession && session.defaultSession.webRequest) {
            session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
                const url = (details.url || '').toLowerCase();
                if (isAdUrl(url)) {
                    return callback({ cancel: true });
                }
                callback({ cancel: false });
            });
        }

        createWindow();

        if (autoUpdater) {
            // Check for updates shortly after launch (5s), then every 2 hours
            setTimeout(() => {
                autoUpdater.checkForUpdatesAndNotify()
                    .catch((e) => console.log('[updater] check failed:', e && e.message));
            }, 5000);

            setInterval(() => {
                autoUpdater.checkForUpdatesAndNotify()
                    .catch((e) => console.log('[updater] periodic check failed:', e && e.message));
            }, 2 * 60 * 60 * 1000);
        }
    });
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
