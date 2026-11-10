#!/usr/bin/env bash
# ShadowStream iOS / macOS xtool Build Script
# Uses xtool (https://github.com/xtool-org/xtool) to build SwiftPM apps without full Xcode GUI
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=================================================="
echo " ShadowStream xtool iOS / macOS App Builder"
echo "=================================================="

# Check if xtool is available
if ! command -v xtool &> /dev/null; then
    echo "[!] xtool is not found on PATH."
    echo "    On macOS: brew install xtool-org/tap/xtool"
    echo "    On Linux / WSL: Download latest release from https://github.com/xtool-org/xtool/releases"
    echo "    Or run: bash ../../scripts/setup-xtool-wsl.sh"
    exit 1
fi

SIGN_FLAG=""
if [[ "${1:-}" == "--sign" ]]; then
    SIGN_FLAG="--sign"
    echo "[*] Code signing enabled via Apple Developer account."
fi

mkdir -p ./build

echo "[*] Building ShadowStream for iOS (.ipa bundle)..."
# xtool dev build compiles SwiftPM and packages directly to .ipa
xtool dev build --configuration release --ipa ${SIGN_FLAG}

echo "[*] Finding generated .ipa..."
IPA_FILE=$(find . -name "*.ipa" -type f | head -n 1 || true)
if [[ -n "$IPA_FILE" ]]; then
    cp "$IPA_FILE" ./build/ShadowStream.ipa
    echo "[✓] iOS .ipa ready at: $SCRIPT_DIR/build/ShadowStream.ipa"
else
    echo "[*] Checking for .app bundle..."
    APP_DIR=$(find . -name "*.app" -type d | head -n 1 || true)
    if [[ -n "$APP_DIR" ]]; then
        echo "[✓] App bundle built at: $APP_DIR"
    fi
fi

echo "=================================================="
echo " Build step completed! Artifacts in: ./build"
echo "=================================================="
