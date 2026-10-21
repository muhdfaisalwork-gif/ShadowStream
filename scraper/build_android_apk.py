"""
build_android_apk.py — build a real, installable, standalone Android app with offline UI,
native Picture-in-Picture (PiP), Android DownloadManager, immersive video fullscreen,
and permanent keystore signing.

Features:
1. Offline Asset Bundling: Packages frontend/dist into assets/www/ so the app boots in 0ms
   even offline, with local asset interception while allowing live API & stream requests.
2. Picture-in-Picture (PiP): Video automatically floats over home screen on user leave.
3. System DownloadManager: Native download notifications with progress bars in notification shade.
4. Immersive Fullscreen: WebChromeClient custom view integration in sensor landscape.
5. Multi-Density Icons: Crisp launcher icons for mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi.
6. Permanent Keystore: Stable upload keystore (.secrets/shadowstream-upload.keystore).

Usage:
    python scraper/build_android_apk.py                 # build + bundle + sign
    python scraper/build_android_apk.py --verify APK    # inspect an existing apk
    python scraper/build_android_apk.py --keystore-info # where the key lives
"""

import argparse
import os
import shutil
import subprocess
import sys
import time
import zipfile
from pathlib import Path
from PIL import Image

SCRATCH = Path(r"C:\Users\Lucifer\.gemini\antigravity\brain\9b67df9c-ed18-47e9-89da-a96f43a473c9\scratch")
AAPT2 = SCRATCH / "aapt2.exe"
ANDROID_JAR = SCRATCH / "android.jar"
R8_JAR = SCRATCH / "r8.jar"

JDK = Path(r"C:\Users\Lucifer\.antigravity\extensions\redhat.java-1.54.0-win32-x64\jre\21.0.10-win32-x86_64\bin")

REPO = Path(r"G:\streaming app")

# Official Android build-tools (r34). jarsigner alone only produces a v1 (JAR) signature,
# which Android 11+ rejects for targetSdk >= 30 ("App not installed" / "package appears
# to be invalid"). zipalign + apksigner produce the required aligned v2/v3-signed APK.
BUILD_TOOLS = Path(os.environ.get("ANDROID_BUILD_TOOLS", str(REPO / ".android-tools" / "android-14")))
ZIPALIGN = BUILD_TOOLS / "zipalign.exe"
APKSIGNER_JAR = BUILD_TOOLS / "lib" / "apksigner.jar"
OUT_DIR = REPO / "packaging" / "android"
DOWNLOADS_DIR = REPO / "downloads"
BUILD = REPO / ".apkbuild"

# ---------------------------------------------------------------- identity
PACKAGE = "com.streamapp.app"
APP_NAME = "ShadowStream"
MIN_SDK = 24
TARGET_SDK = 34
VERSION_CODE = 242
VERSION_NAME = "2.4.2"
APP_URL = "https://ssmoviestvs.site"

# Signing material
KEYSTORE = Path(os.environ.get(
    "SHADOWSTREAM_KEYSTORE_PATH", str(REPO / ".secrets" / "shadowstream-upload.keystore")))
KEY_ALIAS = os.environ.get("SHADOWSTREAM_KEY_ALIAS", "shadowstream")
KEYSTORE_PASS = os.environ.get("SHADOWSTREAM_KEYSTORE_PASS", "")


def load_password():
    if KEYSTORE_PASS:
        return KEYSTORE_PASS
    note = KEYSTORE.parent / "keystore-password.txt"
    if note.is_file():
        for line in note.read_text(encoding="utf-8", errors="replace").splitlines():
            if line.strip().lower().startswith("password"):
                return line.split(":", 1)[1].strip()
    return ""


def run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8",
                          errors="replace", **kw)


def check_toolchain():
    global KEYSTORE_PASS
    KEYSTORE_PASS = load_password()
    missing = []
    for label, p in (("aapt2", AAPT2), ("android.jar", ANDROID_JAR), ("r8.jar", R8_JAR),
                     ("zipalign", ZIPALIGN), ("apksigner.jar", APKSIGNER_JAR)):
        if not p.exists():
            missing.append(label)
    for tool in ("java.exe", "javac.exe", "keytool.exe", "jarsigner.exe"):
        if not (JDK / tool).exists():
            missing.append(tool)
    if missing:
        print("FATAL: missing toolchain pieces: " + ", ".join(missing))
        sys.exit(2)


def ensure_keystore():
    if KEYSTORE.exists():
        print(f"  using existing keystore: {KEYSTORE}  ({KEYSTORE.stat().st_size:,} bytes)")
        return
    if not KEYSTORE_PASS:
        print("\nNo keystore yet and SHADOWSTREAM_KEYSTORE_PASS is not set.")
        sys.exit(3)
    KEYSTORE.parent.mkdir(parents=True, exist_ok=True)
    print(f"  creating upload keystore: {KEYSTORE}")
    r = run([str(JDK / "keytool.exe"), "-genkeypair",
             "-keystore", str(KEYSTORE), "-storetype", "PKCS12",
             "-storepass", KEYSTORE_PASS, "-keypass", KEYSTORE_PASS,
             "-alias", KEY_ALIAS, "-keyalg", "RSA", "-keysize", "4096",
             "-validity", "10950",
             "-dname", "CN=ShadowStream, OU=Mobile, O=ShadowStream, L=Karachi, ST=Sindh, C=PK"])
    if r.returncode != 0:
        print("FATAL: keytool failed\n", r.stdout, r.stderr)
        sys.exit(2)


JAVA_SOURCE = r'''package {pkg};

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.DownloadManager;
import android.app.PictureInPictureParams;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.content.res.Configuration;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.util.Rational;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.webkit.DownloadListener;
import android.webkit.JavascriptInterface;
import android.webkit.URLUtil;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;

import java.io.InputStream;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

public class MainActivity extends Activity {{

    private static final String DOMAIN = "ssmoviestvs.site";
    private static final String HOME_URL = "https://" + DOMAIN + "/";

    private WebView web;
    private FrameLayout rootLayout;
    private FrameLayout fullscreenContainer;
    private View customView;
    private WebChromeClient.CustomViewCallback customViewCallback;

    private boolean isVideoPlaying = false;
    private boolean forceOfflineFallback = false;
    private long lastBackPress = 0L;

    public class NativeBridge {{
        @JavascriptInterface
        public void setVideoPlaying(boolean playing) {{
            isVideoPlaying = playing;
        }}

        @JavascriptInterface
        public void triggerPiP() {{
            runOnUiThread(new Runnable() {{
                @Override
                public void run() {{
                    enterPiPMode();
                }}
            }});
        }}

        @JavascriptInterface
        public void setOrientation(final String mode) {{
            runOnUiThread(new Runnable() {{
                @Override
                public void run() {{
                    if ("landscape".equalsIgnoreCase(mode)) {{
                        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
                    }} else if ("portrait".equalsIgnoreCase(mode)) {{
                        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
                    }} else {{
                        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
                    }}
                }}
            }});
        }}

        @JavascriptInterface
        public void toggleOrientation() {{
            runOnUiThread(new Runnable() {{
                @Override
                public void run() {{
                    int current = getRequestedOrientation();
                    if (current == ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE ||
                        current == ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE) {{
                        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
                    }} else {{
                        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
                    }}
                }}
            }});
        }}

        @JavascriptInterface
        public String getAppVersion() {{
            return "2.4.2";
        }}

        @JavascriptInterface
        public int getAppVersionCode() {{
            return 242;
        }}

        @JavascriptInterface
        public void downloadMedia(final String downloadUrl, final String fileName) {{
            runOnUiThread(new Runnable() {{
                @Override
                public void run() {{
                    handleNativeDownload(downloadUrl, null, "attachment; filename=\"" + fileName + "\"", "video/mp4");
                }}
            }});
        }}

        @JavascriptInterface
        public void downloadUpdate(final String downloadUrl) {{
            runOnUiThread(new Runnable() {{
                @Override
                public void run() {{
                    handleNativeDownload(downloadUrl, null, null, "application/vnd.android.package-archive");
                }}
            }});
        }}
    }}

    @SuppressLint({{"SetJavaScriptEnabled", "JavascriptInterface"}})
    @Override
    protected void onCreate(Bundle savedInstanceState) {{
        super.onCreate(savedInstanceState);

        // Hardware acceleration keeps 1080p/4k video decode silky smooth
        getWindow().setFlags(
                WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
                WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        // Pitch-black window background prevents white flash on boot
        getWindow().getDecorView().setBackgroundColor(0xFF0D0D0D);

        rootLayout = new FrameLayout(this);
        rootLayout.setBackgroundColor(0xFF0D0D0D);

        web = new WebView(this);
        web.setBackgroundColor(0xFF0D0D0D);

        fullscreenContainer = new FrameLayout(this);
        fullscreenContainer.setBackgroundColor(0xFF000000);
        fullscreenContainer.setVisibility(View.GONE);

        rootLayout.addView(web, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        rootLayout.addView(fullscreenContainer, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        setContentView(rootLayout);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setSupportMultipleWindows(false);
        s.setJavaScriptCanOpenWindowsAutomatically(false);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {{
            s.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        }}

        web.addJavascriptInterface(new NativeBridge(), "ShadowStreamNative");

        // Download Listener: Route media downloads directly to Android system DownloadManager
        web.setDownloadListener(new DownloadListener() {{
            @Override
            public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimeType, long contentLength) {{
                handleNativeDownload(url, userAgent, contentDisposition, mimeType);
            }}
        }});

        web.setWebViewClient(new WebViewClient() {{
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {{
                if (req == null || req.getUrl() == null) return false;
                // Only intercept main frame navigation; let embed video players run inside iframes!
                if (!req.isForMainFrame()) {{
                    return false;
                }}
                return handleUrl(req.getUrl());
            }}

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {{
                return interceptLocalAsset(req);
            }}

            @Override
            public void onPageFinished(WebView view, String url) {{
                injectNativeHooks(view);
                // Keep orientation adaptive and allow vertical portrait playback
            }}

            @Override
            public void onReceivedError(WebView view, WebResourceRequest req, android.webkit.WebResourceError error) {{
                if (req != null && req.isForMainFrame()) {{
                    // Fall back to offline assets if network fails
                    forceOfflineFallback = true;
                    view.loadUrl(HOME_URL);
                }}
            }}

            @Override
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {{
                if (failingUrl != null && failingUrl.contains(DOMAIN)) {{
                    forceOfflineFallback = true;
                    view.loadUrl(HOME_URL);
                }}
            }}
        }});

        web.setWebChromeClient(new WebChromeClient() {{
            @Override
            public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, android.os.Message resultMsg) {{
                // Block all popup windows requested by pages or ad scripts
                return false;
            }}

            @Override
            public void onShowCustomView(View view, CustomViewCallback callback) {{
                if (customView != null) {{
                    callback.onCustomViewHidden();
                    return;
                }}
                customView = view;
                customViewCallback = callback;

                web.setVisibility(View.GONE);
                fullscreenContainer.addView(view, new FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
                fullscreenContainer.setVisibility(View.VISIBLE);

                setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
                setImmersiveFullscreen(true);
            }}

            @Override
            public void onHideCustomView() {{
                if (customView == null) return;

                fullscreenContainer.removeView(customView);
                fullscreenContainer.setVisibility(View.GONE);
                customView = null;
                if (customViewCallback != null) {{
                    customViewCallback.onCustomViewHidden();
                    customViewCallback = null;
                }}

                web.setVisibility(View.VISIBLE);
                setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
                setImmersiveFullscreen(false);
            }}
        }});

        web.loadUrl(HOME_URL);
    }}

    
    private boolean isNetworkAvailable() {{
        try {{
            android.net.ConnectivityManager cm = (android.net.ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
            if (cm == null) return false;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {{
                android.net.Network net = cm.getActiveNetwork();
                if (net == null) return false;
                android.net.NetworkCapabilities caps = cm.getNetworkCapabilities(net);
                return caps != null && (caps.hasCapability(android.net.NetworkCapabilities.NET_CAPABILITY_INTERNET));
            }} else {{
                android.net.NetworkInfo ni = cm.getActiveNetworkInfo();
                return ni != null && ni.isConnected();
            }}
        }} catch (Throwable ignored) {{
            return false;
        }}
    }}

    private WebResourceResponse interceptLocalAsset(WebResourceRequest req) {{
        if (req == null || req.getUrl() == null) return null;

        // When online and not in forced offline fallback, let requests load live from the web
        // so deploys take effect immediately and apps auto-update!
        if (isNetworkAvailable() && !forceOfflineFallback) {{
            return null;
        }}

        Uri uri = req.getUrl();
        String host = uri.getHost();

        // Only intercept requests destined for the app domain
        if (host != null && host.endsWith(DOMAIN)) {{
            String path = uri.getPath();
            if (path == null || path.isEmpty() || path.equals("/")) {{
                path = "/index.html";
            }}

            // Do NOT intercept live API or release download routes
            if (!path.startsWith("/api/") && !path.startsWith("/downloads/")) {{
                String cleanPath = path.startsWith("/") ? path.substring(1) : path;
                String assetPath = "www/" + cleanPath;
                try {{
                    InputStream is = getAssets().open(assetPath);
                    String mime = getMimeType(cleanPath);
                    Map<String, String> headers = new HashMap<String, String>();
                    headers.put("Access-Control-Allow-Origin", "*");
                    headers.put("Cache-Control", "no-cache");
                    return new WebResourceResponse(mime, "UTF-8", 200, "OK", headers, is);
                }} catch (IOException ignored) {{
                    // SPA route (e.g. /play/slug, /movies) -> serve local index.html
                    if (!cleanPath.contains(".") && "GET".equalsIgnoreCase(req.getMethod())) {{
                        try {{
                            InputStream is = getAssets().open("www/index.html");
                            Map<String, String> headers = new HashMap<String, String>();
                            headers.put("Access-Control-Allow-Origin", "*");
                            return new WebResourceResponse("text/html", "UTF-8", 200, "OK", headers, is);
                        }} catch (IOException ignored2) {{}}
                    }}
                }}
            }}
        }}
        return null;
    }}

    private static String getMimeType(String path) {{
        String lower = path.toLowerCase();
        if (lower.endsWith(".html") || lower.endsWith(".htm")) return "text/html";
        if (lower.endsWith(".js")) return "application/javascript";
        if (lower.endsWith(".json") || lower.endsWith(".webmanifest")) return "application/json";
        if (lower.endsWith(".css")) return "text/css";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".svg")) return "image/svg+xml";
        if (lower.endsWith(".ico")) return "image/x-icon";
        if (lower.endsWith(".woff2")) return "font/woff2";
        if (lower.endsWith(".woff")) return "font/woff";
        if (lower.endsWith(".ttf")) return "font/ttf";
        return "application/octet-stream";
    }}

    private void handleNativeDownload(String url, String userAgent, String contentDisposition, String mimeType) {{
        try {{
            if (url == null || url.isEmpty()) return;
            Uri uri = Uri.parse(url);
            String fileName = URLUtil.guessFileName(url, contentDisposition, mimeType);
            if (fileName == null || fileName.isEmpty() || fileName.endsWith(".bin")) {{
                fileName = "ShadowStream_Download.mp4";
            }}

            DownloadManager.Request request = new DownloadManager.Request(uri);
            if (mimeType != null && !mimeType.isEmpty()) {{
                request.setMimeType(mimeType);
            }}
            if (userAgent != null && !userAgent.isEmpty()) {{
                request.addRequestHeader("User-Agent", userAgent);
            }}
            request.setDescription("ShadowStream: " + fileName);
            request.setTitle(fileName);
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName);

            DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
            if (dm != null) {{
                dm.enqueue(request);
                Toast.makeText(getApplicationContext(), "⬇ Downloading: " + fileName, Toast.LENGTH_SHORT).show();
            }}
        }} catch (Throwable t) {{
            try {{
                startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
            }} catch (Throwable ignored) {{
                Toast.makeText(getApplicationContext(), "Could not launch download", Toast.LENGTH_SHORT).show();
            }}
        }}
    }}

    private boolean handleUrl(Uri uri) {{
        if (uri == null) return false;
        String scheme = uri.getScheme();
        String host = uri.getHost();

        // Let our app domain and workers load directly in WebView
        if (host != null && (host.endsWith(DOMAIN) || host.endsWith("workers.dev"))) {{
            return false;
        }}

        // Allow media stream CDNs and first-party services to load in WebView
        if (host != null && (host.contains("archive.org") || host.contains("cloudflare") || host.contains("google"))) {{
            return false;
        }}

        // Handle external player schemes (VLC, MX Player, market links, intents)
        if (scheme != null && (scheme.equals("vlc") || scheme.equals("vlc-x-callback") || scheme.equals("intent") || scheme.equals("market"))) {{
            try {{
                Intent intent = Intent.parseUri(uri.toString(), Intent.URI_INTENT_SCHEME);
                if (intent != null) {{
                    startActivity(intent);
                    return true;
                }}
            }} catch (Throwable ignored) {{}}
        }}

        // Only launch external browser for explicit trusted links (github, tmdb, imdb)
        if (host != null && (host.contains("github.com") || host.contains("themoviedb.org") || host.contains("imdb.com"))) {{
            try {{
                startActivity(new Intent(Intent.ACTION_VIEW, uri));
            }} catch (ActivityNotFoundException e) {{
                Toast.makeText(this, "No external app found for this link", Toast.LENGTH_SHORT).show();
            }}
            return true;
        }}

        // Silently block 3rd-party ad redirects and popups from hijacking the app
        return true;
    }}

    private void setImmersiveFullscreen(boolean fullscreen) {{
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {{
            int flags = fullscreen
                    ? (View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY)
                    : View.SYSTEM_UI_FLAG_VISIBLE;
            getWindow().getDecorView().setSystemUiVisibility(flags);
        }}
    }}

    private void enterPiPMode() {{
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {{
            try {{
                Rational aspectRatio = new Rational(16, 9);
                PictureInPictureParams.Builder builder = new PictureInPictureParams.Builder();
                builder.setAspectRatio(aspectRatio);
                enterPictureInPictureMode(builder.build());
            }} catch (Throwable ignored) {{}}
        }}
    }}

    @Override
    public void onUserLeaveHint() {{
        super.onUserLeaveHint();
        if (isVideoPlaying) {{
            enterPiPMode();
        }}
    }}

    @Override
    public void onPictureInPictureModeChanged(boolean isInPictureInPictureMode, Configuration newConfig) {{
        super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig);
        if (web != null) {{
            String script = isInPictureInPictureMode
                    ? "document.body.classList.add('pip-mode');"
                    : "document.body.classList.remove('pip-mode');";
            web.evaluateJavascript(script, null);
        }}
    }}

    private void injectNativeHooks(WebView view) {{
        try {{
            String js = "(function() {{"
                    + "  function bindVideoEvents() {{"
                    + "    var vids = document.querySelectorAll('video');"
                    + "    for (var i = 0; i < vids.length; i++) {{"
                    + "      var v = vids[i];"
                    + "      if (!v.__pip_bound) {{"
                    + "        v.__pip_bound = true;"
                    + "        v.addEventListener('play', function() {{ if (window.ShadowStreamNative) window.ShadowStreamNative.setVideoPlaying(true); }});"
                    + "        v.addEventListener('pause', function() {{ if (window.ShadowStreamNative) window.ShadowStreamNative.setVideoPlaying(false); }});"
                    + "        v.addEventListener('ended', function() {{ if (window.ShadowStreamNative) window.ShadowStreamNative.setVideoPlaying(false); }});"
                    + "      }}"
                    + "    }}"
                    + "  }}"
                    + "  bindVideoEvents();"
                    + "  setInterval(bindVideoEvents, 2000);"
                    + "}})();";
            view.evaluateJavascript(js, null);
        }} catch (Throwable ignored) {{}}
    }}

    @Override
    public void onBackPressed() {{
        if (customView != null) {{
            if (web != null && web.getWebChromeClient() != null) {{
                web.getWebChromeClient().onHideCustomView();
            }}
            return;
        }}
        if (web != null && web.canGoBack()) {{
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
            web.goBack();
            return;
        }}
        long now = System.currentTimeMillis();
        if (now - lastBackPress < 2000) {{
            finish();
        }} else {{
            lastBackPress = now;
            Toast.makeText(this, "Press back again to exit", Toast.LENGTH_SHORT).show();
        }}
    }}

    @Override
    protected void onPause() {{
        super.onPause();
        if (web != null && !isInPictureInPictureModeCompat()) {{
            web.onPause();
        }}
    }}

    @Override
    protected void onResume() {{
        super.onResume();
        if (web != null) {{
            web.onResume();
        }}
    }}

    @Override
    protected void onDestroy() {{
        if (web != null) {{
            web.loadUrl("about:blank");
            web.destroy();
            web = null;
        }}
        super.onDestroy();
    }}

    private boolean isInPictureInPictureModeCompat() {{
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {{
            return isInPictureInPictureMode();
        }}
        return false;
    }}
}}
'''


def build():
    check_toolchain()
    print("== ShadowStream Android build ==")
    print(f"  package  {PACKAGE}  v{VERSION_NAME} ({VERSION_CODE})")
    print(f"  sdk      min {MIN_SDK} target {TARGET_SDK}")
    print(f"  url      {APP_URL}")
    ensure_keystore()

    # Recreate disposable build dir
    if BUILD.exists():
        shutil.rmtree(BUILD)
    (BUILD / "res" / "values").mkdir(parents=True)
    (BUILD / "res" / "drawable").mkdir(parents=True)
    (BUILD / "java" / PACKAGE.replace(".", "/")).mkdir(parents=True)
    (BUILD / "out").mkdir(parents=True)
    (BUILD / "assets" / "www").mkdir(parents=True)

    # 1. Multi-density launcher icons
    icon_src = REPO / "frontend" / "assets" / "icon.png"
    if icon_src.exists():
        densities = {
            "mipmap-mdpi": 48,
            "mipmap-hdpi": 72,
            "mipmap-xhdpi": 96,
            "mipmap-xxhdpi": 144,
            "mipmap-xxxhdpi": 192,
        }
        with Image.open(icon_src) as img:
            for folder, sz in densities.items():
                d = BUILD / "res" / folder
                d.mkdir(parents=True, exist_ok=True)
                resized = img.resize((sz, sz), Image.Resampling.LANCZOS)
                resized.save(d / "ic_launcher.png")
        print("  generated multi-density launcher icons (mdpi -> xxxhdpi)")
    else:
        print("  WARNING: frontend/assets/icon.png not found; using fallback icon")

    # 2. Bundle frontend web distribution into assets/www
    dist_dir = REPO / "frontend" / "dist"
    if not (dist_dir / "index.html").exists():
        print("  running npm run build:web in frontend/...")
        subprocess.run(["npm", "run", "build:web"], cwd=str(REPO / "frontend"), check=True, shell=True)

    print("  bundling frontend/dist into assets/www/ ...")
    shutil.copytree(dist_dir, BUILD / "assets" / "www", dirs_exist_ok=True)
    asset_count = len(list((BUILD / "assets" / "www").rglob("*")))
    print(f"  packaged {asset_count} web distribution files into assets/www/")

    (BUILD / "res" / "values" / "strings.xml").write_text(
        '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n'
        f'  <string name="app_name">{APP_NAME}</string>\n'
        '</resources>\n', encoding="utf-8")
    (BUILD / "res" / "values" / "styles.xml").write_text(
        '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n'
        '  <style name="AppTheme" parent="@android:style/Theme.Material.NoActionBar.Fullscreen">\n'
        '    <item name="android:windowBackground">#0d0d0d</item>\n'
        '    <item name="android:colorBackground">#0d0d0d</item>\n'
        '  </style>\n'
        '</resources>\n', encoding="utf-8")

    (BUILD / "AndroidManifest.xml").write_text(f"""<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="{PACKAGE}">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />

    <!-- External video players handoff -->
    <queries>
        <intent>
            <action android:name="android.intent.action.VIEW" />
            <data android:scheme="https" />
        </intent>
        <package android:name="com.videolan.vlc" />
        <package android:name="org.mxplayer" />
    </queries>

    <uses-sdk android:minSdkVersion="{MIN_SDK}" android:targetSdkVersion="{TARGET_SDK}" />

    <application
        android:label="@string/app_name"
        android:icon="@mipmap/ic_launcher"
        android:theme="@style/AppTheme"
        android:hardwareAccelerated="true"
        android:usesCleartextTraffic="false"
        android:allowBackup="true"
        android:supportsRtl="true">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTop"
            android:screenOrientation="unspecified"
            android:supportsPictureInPicture="true"
            android:configChanges="orientation|keyboardHidden|screenSize|smallestScreenSize|screenLayout|uiMode"
            android:windowSoftInputMode="adjustResize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
""", encoding="utf-8")

    java_path = BUILD / "java" / PACKAGE.replace(".", "/") / "MainActivity.java"
    java_path.write_text(JAVA_SOURCE.format(pkg=PACKAGE), encoding="utf-8")

    print("  1/5  aapt2 compile resources")
    flat = BUILD / "out" / "resources.zip"
    r = run([str(AAPT2), "compile", "--dir", str(BUILD / "res"), "-o", str(flat)])
    if r.returncode != 0:
        print("aapt2 compile failed:\n", r.stdout, r.stderr)
        sys.exit(2)

    base = BUILD / "out" / "base.apk"
    r = run([str(AAPT2), "link", "-o", str(base), "-I", str(ANDROID_JAR),
             "--manifest", str(BUILD / "AndroidManifest.xml"),
             "--min-sdk-version", str(MIN_SDK), "--target-sdk-version", str(TARGET_SDK),
             "--version-code", str(VERSION_CODE), "--version-name", VERSION_NAME,
             str(flat)])
    if r.returncode != 0:
        print("aapt2 link failed:\n", r.stdout, r.stderr)
        sys.exit(2)

    print("  2/5  javac")
    classes = BUILD / "out" / "classes"
    classes.mkdir(parents=True, exist_ok=True)
    r = run([str(JDK / "javac.exe"), "-encoding", "UTF-8", "-source", "8", "-target", "8",
             "-bootclasspath", str(ANDROID_JAR), "-classpath", str(ANDROID_JAR),
             "-d", str(classes), str(java_path)])
    if r.returncode != 0:
        print("javac failed:\n", r.stdout, r.stderr)
        sys.exit(2)

    print("  3/5  d8 (dex)")
    dex_dir = BUILD / "out" / "dex"
    dex_dir.mkdir(parents=True, exist_ok=True)
    class_files = [str(p) for p in classes.rglob("*.class")]
    if not class_files:
        print(f"d8: no class files found under {classes}")
        sys.exit(2)

    r = run([str(JDK / "java.exe"), "-cp", str(R8_JAR), "com.android.tools.r8.D8",
             "--lib", str(ANDROID_JAR),
             "--min-api", str(MIN_SDK), "--output", str(dex_dir)] + class_files)
    if r.returncode != 0:
        print("d8 failed:\n", r.stdout, r.stderr)
        sys.exit(2)

    print("  4/5  assemble APK with local offline assets & DEX")
    unsigned = BUILD / "out" / "unsigned.apk"
    shutil.copy(base, unsigned)
    dex_files = sorted(dex_dir.glob("*.dex"))
    if not dex_files:
        print("d8 produced no .dex output")
        sys.exit(2)
    with zipfile.ZipFile(unsigned, "a", zipfile.ZIP_DEFLATED) as z:
        for d in dex_files:
            z.write(d, d.name)
        assets_root = BUILD / "assets"
        for item in assets_root.rglob("*"):
            if item.is_file():
                arc = str(item.relative_to(BUILD)).replace("\\", "/")
                z.write(item, arc)

    print("  5/5  zipalign + apksigner (v1 + v2 + v3, permanent keystore)")
    # zipalign MUST run before apksigner: v2/v3 signatures cover the whole file, so any
    # change afterwards (including alignment) invalidates them. -p page-aligns .so files.
    aligned = BUILD / "out" / "aligned.apk"
    r = run([str(ZIPALIGN), "-p", "-f", "4", str(unsigned), str(aligned)])
    if r.returncode != 0:
        print("zipalign failed:\n", r.stdout, r.stderr)
        sys.exit(2)

    signed = BUILD / "out" / "signed.apk"
    r = run([str(JDK / "java.exe"), "-jar", str(APKSIGNER_JAR), "sign",
             "--ks", str(KEYSTORE), "--ks-key-alias", KEY_ALIAS,
             "--ks-pass", f"pass:{KEYSTORE_PASS}", "--key-pass", f"pass:{KEYSTORE_PASS}",
             "--v1-signing-enabled", "true",
             "--v2-signing-enabled", "true",
             "--v3-signing-enabled", "true",
             "--min-sdk-version", str(MIN_SDK),
             "--out", str(signed), str(aligned)])
    if r.returncode != 0:
        print("apksigner sign failed:\n", r.stdout, r.stderr)
        sys.exit(2)

    # Hard gate: never publish an APK the Android package manager would reject.
    r = run([str(JDK / "java.exe"), "-jar", str(APKSIGNER_JAR), "verify",
             "--verbose", "--min-sdk-version", str(MIN_SDK), str(signed)])
    print("\n".join("     " + ln for ln in r.stdout.splitlines() if ln.startswith("Verified")))
    if r.returncode != 0:
        print("apksigner verify FAILED — refusing to publish:\n", r.stdout, r.stderr)
        sys.exit(2)
    r = run([str(ZIPALIGN), "-c", "-p", "4", str(signed)])
    if r.returncode != 0:
        print("zipalign check FAILED — refusing to publish:\n", r.stdout, r.stderr)
        sys.exit(2)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    DOWNLOADS_DIR.mkdir(parents=True, exist_ok=True)
    final = OUT_DIR / "ShadowStream.apk"
    shutil.copy(signed, final)

    # Sync to downloads directory for local distribution
    downloads_apk = DOWNLOADS_DIR / "ShadowStream.apk"
    shutil.copy(signed, downloads_apk)

    size = final.stat().st_size
    print(f"\n  built: {final}  ({size:,} bytes)")
    print(f"  copied to: {downloads_apk}")
    print(f"  signed with: {KEYSTORE.name}  alias={KEY_ALIAS}")
    print(f"  version: {VERSION_NAME} ({VERSION_CODE})  targetSdk {TARGET_SDK}")
    print(f"\n  install:  adb install -r {final}")
    verify(str(final))


def verify(path):
    print("\n== verify ==")
    with zipfile.ZipFile(path) as z:
        names = z.namelist()
        assets_names = [n for n in names if n.startswith("assets/")]
        print(f"  entries      {len(names)}")
        print(f"  manifest     {'AndroidManifest.xml' in names}")
        print(f"  dex          {any(n.endswith('.dex') for n in names)}")
        print(f"  assets count {len(assets_names)} (offline www bundle packaged)")
        signed = any(n.startswith("META-INF/") for n in names)
        print(f"  v1 signature {signed}")
        # Check PiP support in manifest
        try:
            manifest_bytes = z.read("AndroidManifest.xml")
            has_pip = b"supportsPictureInPicture" in manifest_bytes
            print(f"  PiP support  {has_pip}")
        except Exception:
            pass
    txt = Path(path).read_bytes()
    print(f"  size         {len(txt):,} bytes ({len(txt)/(1024*1024):.2f} MB)")

    # The checks that actually matter to Android's package installer.
    v2v3_ok = aligned_ok = False
    if APKSIGNER_JAR.exists():
        r = run([str(JDK / "java.exe"), "-jar", str(APKSIGNER_JAR), "verify",
                 "--verbose", "--min-sdk-version", str(MIN_SDK), path])
        schemes = {ln.split(":")[0].strip(): ln.split(":", 1)[1].strip()
                   for ln in r.stdout.splitlines() if ln.startswith("Verified using")}
        for k, v in schemes.items():
            print(f"  {k:<38} {v}")
        v2v3_ok = r.returncode == 0 and (
            schemes.get("Verified using v2 scheme (APK Signature Scheme v2)") == "true"
            or schemes.get("Verified using v3 scheme (APK Signature Scheme v3)") == "true")
        if r.returncode != 0:
            print("  apksigner:", (r.stderr or r.stdout).strip()[:400])
    else:
        print("  apksigner    MISSING (cannot verify v2/v3)")
    if ZIPALIGN.exists():
        aligned_ok = run([str(ZIPALIGN), "-c", "-p", "4", path]).returncode == 0
    print(f"  zipaligned   {aligned_ok}")
    print(f"  v2/v3 signed {v2v3_ok}")

    ok = (signed and v2v3_ok and aligned_ok
          and any(n.endswith(".dex") for n in names) and len(assets_names) > 0)
    print(f"  STATUS       {'OK - installable' if ok else 'PROBLEM - Android will refuse to install'}")
    return ok


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--verify", metavar="APK")
    ap.add_argument("--keystore-info", action="store_true")
    args = ap.parse_args()
    if args.verify:
        verify(args.verify)
    elif args.keystore_info:
        print(KEYSTORE)
        print("exists" if KEYSTORE.exists() else "NOT CREATED YET")
    else:
        build()
