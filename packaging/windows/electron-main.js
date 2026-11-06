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
    'linebet.com', 'mostbet-pk.com', 'pin-up.bet',
    // Trackers and malicious hosts observed live on providers
    'meatusbyway.cfd', 'wonnotscroganisoin.cyou', 'speedracelight.com',
    'intelligenceadx.com', 'rtmark.net', 'luugy.com', 'googletagmanager.com',
    'google-analytics.com', 'static.cloudflareinsights.com', 'cloud.umami.is',
    'umami.is', 'soycdn.lol', 'adplox.com', 'crwdcntrl.net', 'lotame.com',
    'histats.com', 'counter.yadro.ru', 'top100.rambler.ru'
];

const AD_PATTERNS = [
    'adserver', 'adservice', 'adsystem', 'popcash', 'popads', 'propeller',
    'monetag', 'clickadu', 'hilltop', 'adsterra', 'exoclick', 'trafficjunky',
    'juicyads', 'onclick', 'highperformancegate', 'profitablegate',
    'effectivegate', 'al5sm', 'whomeverwhistle', 'deloton', 'galaksion',
    'richpush', 'evadav', 'rollerads', 'tsyndicate', 'realsrv', 'bet365',
    '1xbet', 'melbet', 'mostbet', 'parimatch', 'dafabet', 'stake',
    'betwinner', 'megapari', 'linebet', 'pin-up.bet'
];

// Throwaway rotating ad TLDs
const THROWAWAY_TLDS = [
    '.cfd', '.qpon', '.lol', '.top', '.click', '.buzz', '.cam',
    '.monster', '.sbs', '.cyou', '.icu', '.trade', '.bid', '.life'
];

// Allowlist of verified streaming hosts, CDNs, and media services
const ALLOWED_STREAM_HOSTS = [
    'ssmoviestvs.site',
    'vidstuck.cc',
    'nontongo.win',
    'vidsrc.to',
    'vidsrc.me',
    'vidsrc.rip',
    'vidsrc.sh',
    'vidsrc.pm',
    'vidsrc.net',
    'vidsrc.xyz',
    'vidsrc.in',
    '2embed.cc',
    '2embed.skin',
    '2embed.org',
    '2embed.to',
    'vidlink.pro',
    'vidlink.org',
    'multiembed.mov',
    'superembed.stream',
    'smashystream.xyz',
    'embed.su',
    'moviesapi.club',
    'autoembed.co',
    'autoembed.cc',
    'animesalt.cc',
    'archive.org',
    'stellarconductornexus.com',
    'cloudflarestream.com',
    'cloudflare.com',
    'r2.cloudflarestorage.com',
    'workers.dev',
    'pages.dev',
    'themoviedb.org',
    'tmdb.org',
    'imdb.com',
    'media-amazon.com',
    'googleapis.com',
    'googleusercontent.com',
    'youtube.com',
    'youtube-nocookie.com',
    'ytimg.com',
    'localhost',
    '127.0.0.1'
];

// Strict allowlist for opening external links in the default OS browser
const TRUSTED_EXTERNAL_HOSTS = [
    'github.com',
    'themoviedb.org',
    'tmdb.org',
    'imdb.com',
    'discord.gg',
    'discord.com',
    'youtube.com',
    'youtu.be',
];

// Allowed external application protocols (e.g. native media players)
const ALLOWED_SCHEMES = ['vlc:', 'potplayer:', 'mpv:'];

/**
 * Validates whether a URL strictly belongs to a trusted external service.
 * Uses strict URL parsing to prevent parameter-based host spoofing (e.g. ?ref=imdb.com).
 */
function isTrustedExternalUrl(urlStr) {
    if (!urlStr || typeof urlStr !== 'string') return false;
    try {
        const parsed = new URL(urlStr);
        const host = parsed.hostname.toLowerCase();
        return TRUSTED_EXTERNAL_HOSTS.some((trusted) => host === trusted || host.endsWith('.' + trusted));
    } catch (_) {
        return false;
    }
}

/**
 * True when a URL belongs to ad, tracker, or betting infrastructure.
 */
function isAdUrl(urlStr) {
    if (!urlStr || typeof urlStr !== 'string') return false;
    const lower = urlStr.toLowerCase();
    let host = '';
    try { host = new URL(urlStr).hostname.toLowerCase(); } catch (_) {}

    // Check rotating throwaway ad TLDs
    if (THROWAWAY_TLDS.some((tld) => host.endsWith(tld))) {
        // Special exemption for 2embed.skin which is our valid embed provider
        if (host === '2embed.skin' || host.endsWith('.2embed.skin')) {
            // Not an ad
        } else {
            return true;
        }
    }

    // Check ad domains
    for (const d of AD_DOMAINS) {
        if (host === d || host.endsWith('.' + d) || lower.includes(d)) return true;
    }

    // Check ad patterns
    for (const p of AD_PATTERNS) {
        if (lower.includes(p)) return true;
    }

    // Provider-side ad injectors & trackers by path
    if (lower.includes('/vidstuck.js')) return true;
    if (lower.includes('/__ads/')) return true;
    if (lower.includes('/cdn-cgi/rum')) return true;
    if (lower.includes('/scripts/vidy.js')) return true;
    if (lower.includes('/lt/shared/')) return true;
    if (lower.includes('/api/script.js') && host.indexOf('vidy.st') !== -1) return true;
    if (lower.includes('/prebid') || lower.includes('/tag/js/gpt.js')) return true;

    // Ad tracking query parameters
    if (lower.includes('zoneid=') || lower.includes('bannerid=') || lower.includes('popunder') ||
        lower.includes('campaignid=') || lower.includes('aff_id=') || lower.includes('/pop/') ||
        lower.includes('clickid=') || lower.includes('pixel=') || lower.includes('tracking_id=')) {
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
        if (!url || url === 'about:blank' || url === '') return { action: 'deny' };

        // Drop known ad/tracker/betting URLs immediately
        if (isAdUrl(url)) {
            console.log('[AdShield] Blocked ad popup:', url);
            return { action: 'deny' };
        }

        let parsed;
        try {
            parsed = new URL(url);
        } catch (_) {
            return { action: 'deny' };
        }

        const host = parsed.hostname.toLowerCase();

        // Same-origin in-app routes -> navigate within mainWindow
        if (host === 'ssmoviestvs.site' || host.endsWith('.ssmoviestvs.site') || host === 'localhost' || host === '127.0.0.1') {
            if (url.endsWith('.exe') || url.endsWith('.zip') || url.endsWith('.apk') || url.includes('/downloads/')) {
                shell.openExternal(url);
                return { action: 'deny' };
            }
            mainWindow.loadURL(url);
            return { action: 'deny' };
        }

        // Official release binary downloads from our GitHub or Workers CDN
        if ((host === 'github.com' || host.endsWith('.github.com') || host.endsWith('.workers.dev')) &&
            (url.endsWith('.exe') || url.endsWith('.zip') || url.endsWith('.apk') || url.includes('/releases/download/'))) {
            shell.openExternal(url);
            return { action: 'deny' };
        }

        // Trusted external metadata links (IMDb, TMDB, YouTube trailers, Discord, GitHub)
        if (isTrustedExternalUrl(url)) {
            shell.openExternal(url);
            return { action: 'deny' };
        }

        // Safe external player schemes (VLC, PotPlayer, MPV)
        if (ALLOWED_SCHEMES.some((s) => url.startsWith(s))) {
            shell.openExternal(url);
            return { action: 'deny' };
        }

        // ALL OTHER 3RD-PARTY POPUPS & POPUNDERS: DENY UNCONDITIONALLY
        console.warn('[AdShield] Denied 3rd-party popup attempt:', url);
        return { action: 'deny' };
    });

    // 2. Navigation Guard: prevent hostile ad redirects from hijacking the main window
    mainWindow.webContents.on('will-navigate', (event, url) => {
        if (!url) return;

        if (isAdUrl(url)) {
            event.preventDefault();
            console.warn('[AdShield] Blocked top-level ad navigation:', url);
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

        if (isOurs) {
            // Allow in-app download links to launch external download
            if (url.endsWith('.exe') || url.endsWith('.zip') || url.endsWith('.apk') || url.includes('/downloads/')) {
                event.preventDefault();
                shell.openExternal(url);
            }
            return;
        }

        // Prevent top-level hijacking by any third-party domain
        event.preventDefault();
        console.warn('[AdShield] Prevented top-level navigation outside app:', url);

        // Only open in external browser if it is an explicitly trusted destination
        if (isTrustedExternalUrl(url)) {
            shell.openExternal(url);
        }
    });

    // 3. Subframe Guard: block unauthorized navigations inside subframes
    mainWindow.webContents.on('will-frame-navigate', (event) => {
        const url = event.url || '';
        if (!url || url === 'about:blank') return;

        if (isAdUrl(url)) {
            event.preventDefault();
            console.warn('[AdShield] Blocked ad frame navigation:', url);
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
        const isAllowedHost = ALLOWED_STREAM_HOSTS.some((allowed) => host === allowed || host.endsWith('.' + allowed));
        if (!isAllowedHost) {
            event.preventDefault();
            console.warn('[AdShield] Blocked unauthorized 3rd-party subframe navigation:', url);
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
            try {
                window.ShadowStreamDesktop = {
                    version: '${app.getVersion()}',
                    versionCode: 287,
                    platform: 'win32',
                    isElectron: true,
                    triggerUpdate: function() {
                        window.location.href = 'https://ssmoviestvs.site/downloads/ShadowStream-Setup-x64.exe';
                    }
                };
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
                const url = details.url || '';
                if (isAdUrl(url)) {
                    return callback({ cancel: true });
                }

                // Subframe filter: prevent unauthorized ad frames from even initiating
                if (details.resourceType === 'subFrame') {
                    let parsed;
                    try { parsed = new URL(url); } catch (_) {}
                    if (parsed) {
                        const host = (parsed.hostname || '').toLowerCase();
                        const isAllowedHost = ALLOWED_STREAM_HOSTS.some((allowed) => host === allowed || host.endsWith('.' + allowed));
                        if (!isAllowedHost) {
                            console.warn('[AdShield] Blocked subFrame request to:', host);
                            return callback({ cancel: true });
                        }
                    }
                }

                callback({ cancel: false });
            });
        }

        createWindow();

        if (process.platform === 'win32') {
            try {
                app.setAppUserModelId('com.streamapp.app');
            } catch (_) {}
        }

        if (autoUpdater) {
            autoUpdater.autoDownload = true;
            autoUpdater.autoInstallOnAppQuit = true;

            autoUpdater.on('checking-for-update', () => {
                console.log('[updater] Checking for updates on https://ssmoviestvs.site/downloads/ ...');
            });

            autoUpdater.on('update-available', (info) => {
                console.log('[updater] New version available:', info && info.version);
            });

            autoUpdater.on('update-not-available', (info) => {
                console.log('[updater] Desktop app is up to date (current: ' + (info && info.version) + ')');
            });

            autoUpdater.on('error', (err) => {
                console.warn('[updater] Update error:', err && (err.stack || err.message));
            });

            autoUpdater.on('download-progress', (progressObj) => {
                console.log(`[updater] Downloading: ${progressObj.percent.toFixed(1)}% (${(progressObj.bytesPerSecond / 1024).toFixed(0)} KB/s)`);
            });

            autoUpdater.on('update-downloaded', (info) => {
                console.log('[updater] Update downloaded; prompting restart for v' + (info && info.version));
                const { dialog } = require('electron');
                if (dialog && mainWindow) {
                    dialog.showMessageBox(mainWindow, {
                        type: 'info',
                        buttons: ['Restart & Install Now', 'Later'],
                        defaultId: 0,
                        cancelId: 1,
                        title: 'ShadowStream Update Ready',
                        message: `ShadowStream v${info.version || '2.4.47'} has been downloaded and is ready to install.`,
                        detail: 'Restart the application now to apply the update and activate the hardened AdShield protection.'
                    }).then(({ response }) => {
                        if (response === 0) {
                            autoUpdater.quitAndInstall(false, true);
                        }
                    }).catch(() => {});
                }
            });

            // Check for updates shortly after launch (3s), then every hour
            setTimeout(() => {
                autoUpdater.checkForUpdatesAndNotify()
                    .catch((e) => console.log('[updater] check failed:', e && e.message));
            }, 3000);

            setInterval(() => {
                autoUpdater.checkForUpdatesAndNotify()
                    .catch((e) => console.log('[updater] periodic check failed:', e && e.message));
            }, 60 * 60 * 1000);
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
