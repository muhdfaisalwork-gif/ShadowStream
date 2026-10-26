// StreamApp Launcher — opens the deployed Cloudflare-hosted web app in a
// browser window with optional system-tray icon and start-with-Windows toggle.
// Packaged via `pkg` into a single Windows .exe at packaging/windows/dist/.

const { app, BrowserWindow, Tray, Menu, nativeImage, shell, session } = require('electron');
const path = require('path');

const APP_URL = process.env.STREAMAPP_URL || 'https://ssmoviestvs.site';

let mainWindow = null;
let tray = null;

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

const TRUSTED_EXTERNAL = ['github.com', 'themoviedb.org', 'tmdb.org', 'imdb.com', 'discord.gg'];

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

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 640,
        title: 'ShadowStream — Movies & TV. Free.',
        backgroundColor: '#0a0a0a',
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true
        }
    });

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (!url || isAdUrl(url)) return { action: 'deny' };
        const isTrusted = TRUSTED_EXTERNAL.some((domain) => url.toLowerCase().includes(domain));
        if (isTrusted) {
            shell.openExternal(url);
        }
        return { action: 'deny' };
    });

    mainWindow.webContents.on('will-navigate', (event, url) => {
        if (isAdUrl(url)) {
            event.preventDefault();
            return;
        }
        let parsed;
        try { parsed = new URL(url); } catch (_) { event.preventDefault(); return; }
        const host = (parsed.hostname || '').toLowerCase();
        if (host !== 'ssmoviestvs.site' && !host.endsWith('.ssmoviestvs.site') && host !== 'localhost') {
            event.preventDefault();
            if (TRUSTED_EXTERNAL.some((d) => host.includes(d))) shell.openExternal(url);
        }
    });

    mainWindow.webContents.on('did-create-window', (childWindow) => {
        try { childWindow.destroy(); } catch (_) {}
    });

    mainWindow.loadURL(APP_URL);

    mainWindow.on('close', (event) => {
        event.preventDefault();
        mainWindow.hide();
    });
}

function createTray() {
    const iconBuffer = Buffer.from([
        0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x10, 0x10, 0x00, 0x00, 0x01, 0x00, 0x20, 0x00, 0x68, 0x04,
        0x00, 0x00, 0x16, 0x00, 0x00, 0x00, 0x28, 0x00, 0x00, 0x00, 0x10, 0x00, 0x00, 0x00, 0x20, 0x00,
        0x00, 0x00, 0x01, 0x00, 0x20, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0xef, 0x1c, 0x1c, 0xef, 0xef, 0x1c, 0x1c, 0xef, 0xef, 0x1c, 0x1c, 0xef, 0xef, 0x1c, 0x1c, 0xef,
        0xef, 0x1c, 0x1c, 0xef, 0xef, 0x1c, 0x1c, 0xef, 0xef, 0x1c, 0x1c, 0xef, 0xef, 0x1c, 0x1c, 0xef,
        0xef, 0x1c, 0x1c, 0xef, 0xef, 0x1c, 0x1c, 0xef, 0xef, 0x1c, 0x1c, 0xef, 0xef, 0x1c, 0x1c, 0xef,
        0xef, 0x1c, 0x1c, 0xef, 0xef, 0x1c, 0x1c, 0xef, 0xef, 0x1c, 0x1c, 0xef, 0xef, 0x1c, 0x1c, 0xef,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
    ]);
    const icon = nativeImage.createFromBuffer(iconBuffer);
    tray = new Tray(icon);
    const menu = Menu.buildFromTemplate([
        { label: 'Open ShadowStream', click: () => { if (!mainWindow) createMainWindow(); else { mainWindow.show(); mainWindow.focus(); } } },
        { label: 'Visit in Browser', click: () => shell.openExternal(APP_URL) },
        { type: 'separator' },
        { label: 'Quit', click: () => { app.quit(); } }
    ]);
    tray.setToolTip('ShadowStream');
    tray.setContextMenu(menu);
    tray.on('click', () => { if (!mainWindow) createMainWindow(); else { mainWindow.show(); mainWindow.focus(); } });
}

app.whenReady().then(() => {
    if (session.defaultSession && session.defaultSession.webRequest) {
        session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
            const url = (details.url || '').toLowerCase();
            if (isAdUrl(url)) {
                return callback({ cancel: true });
            }
            callback({ cancel: false });
        });
    }
    createMainWindow();
    createTray();
});

app.on('window-all-closed', (event) => {
    event.preventDefault();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});
