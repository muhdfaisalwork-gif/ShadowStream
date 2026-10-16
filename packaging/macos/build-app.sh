#!/usr/bin/env bash
# Wrap the pkg-built macOS binary into a .app bundle.
# Run on macOS. Requires StreamApp-macos-x64 and/or StreamApp-macos-arm64
# already built (cross-compile from Windows via pkg, or build on Mac).

set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
WIN_LAUNCHER="$ROOT/packaging/windows/launcher/dist"

APP_NAME="ShadowStream"
BUNDLE_ID="com.streamapp.app"
VERSION="1.0.0"

mkdir_app() {
    local arch="$1"  # x64 or arm64
    local src_bin="$2"
    local app_dir="$HERE/dist/ShadowStream-$arch.app"

    rm -rf "$app_dir"
    mkdir -p "$app_dir/Contents/MacOS"
    mkdir -p "$app_dir/Contents/Resources"

    if [ -f "$HERE/../ios/ShadowStream-xtool/Resources/AppIcon.png" ]; then
        cp "$HERE/../ios/ShadowStream-xtool/Resources/AppIcon.png" "$app_dir/Contents/Resources/AppIcon.png"
    fi

    cp "$src_bin" "$app_dir/Contents/MacOS/$APP_NAME"
    chmod +x "$app_dir/Contents/MacOS/$APP_NAME"

    cat > "$app_dir/Contents/Info.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleName</key>
    <string>${APP_NAME}</string>
    <key>CFBundleDisplayName</key>
    <string>${APP_NAME}</string>
    <key>CFBundleIdentifier</key>
    <string>${BUNDLE_ID}</string>
    <key>CFBundleVersion</key>
    <string>${VERSION}</string>
    <key>CFBundleShortVersionString</key>
    <string>${VERSION}</string>
    <key>CFBundleExecutable</key>
    <string>${APP_NAME}</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.13</string>
    <key>NSHighResolutionCapable</key>
    <true/>
    <key>CFBundleArchs</key>
    <string>${arch}</string>
</dict>
</plist>
EOF

    echo "APPL????" > "$app_dir/Contents/PkgInfo"
    echo "Built: $app_dir"
}

mkdir_app "x64"   "$WIN_LAUNCHER/StreamApp-macos-x64"
mkdir_app "arm64" "$WIN_LAUNCHER/StreamApp-macos-arm64"

# Universal (fat) build via lipo on macOS
if command -v lipo >/dev/null 2>&1; then
    UNI="$HERE/dist/ShadowStream.app"
    rm -rf "$UNI"
    mkdir -p "$UNI/Contents/MacOS"
    mkdir -p "$UNI/Contents/Resources"
    if [ -f "$HERE/../ios/ShadowStream-xtool/Resources/AppIcon.png" ]; then
        cp "$HERE/../ios/ShadowStream-xtool/Resources/AppIcon.png" "$UNI/Contents/Resources/AppIcon.png"
    fi
    lipo -create \
        "$WIN_LAUNCHER/StreamApp-macos-x64" \
        "$WIN_LAUNCHER/StreamApp-macos-arm64" \
        -output "$UNI/Contents/MacOS/$APP_NAME"
    cat > "$UNI/Contents/Info.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleName</key><string>${APP_NAME}</string>
    <key>CFBundleDisplayName</key><string>${APP_NAME}</string>
    <key>CFBundleIdentifier</key><string>${BUNDLE_ID}</string>
    <key>CFBundleVersion</key><string>${VERSION}</string>
    <key>CFBundleShortVersionString</key><string>${VERSION}</string>
    <key>CFBundleExecutable</key><string>${APP_NAME}</string>
    <key>CFBundlePackageType</key><string>APPL</string>
    <key>LSMinimumSystemVersion</key><string>10.13</string>
    <key>NSHighResolutionCapable</key><true/>
    <key>CFBundleArchs</key><array><string>x86_64</string><string>arm64</string></array>
</dict>
</plist>
EOF
    echo "APPL????" > "$UNI/Contents/PkgInfo"
    echo "Built: $UNI (universal)"
fi
