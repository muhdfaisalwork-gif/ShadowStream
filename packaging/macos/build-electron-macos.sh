#!/usr/bin/env bash
# ==============================================================================
# ShadowStream macOS Desktop App Builder (Electron DMG & ZIP)
# Produces universal macOS installers for Apple Silicon (arm64) and Intel (x64)
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/../windows/app" && pwd)"

echo "=================================================="
echo " ShadowStream macOS Desktop Application Builder"
echo "=================================================="

cd "$APP_DIR"

if [[ ! -d "node_modules" ]]; then
    echo "[*] Installing dependencies..."
    npm install
fi

echo "[*] Building macOS DMG and ZIP distributions..."
npx electron-builder --mac dmg zip

echo "=================================================="
echo " macOS desktop builds completed!"
echo " Artifacts located in: $APP_DIR/dist-v2447"
echo "=================================================="
