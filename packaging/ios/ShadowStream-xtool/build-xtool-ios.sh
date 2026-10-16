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
    echo "    Or install via: cargo install xtool"
    exit 1
fi

echo "[*] Building ShadowStream for iOS (Release)..."
xtool build --target ShadowStream --configuration release

echo "[*] Packaging iOS .ipa bundle..."
xtool archive --target ShadowStream --output ./build/ShadowStream.ipa

echo "[*] Building ShadowStream for macOS (Release)..."
xtool build --target ShadowStream-macOS --configuration release

echo "=================================================="
echo " Build completed! Artifacts located in: ./build"
echo "=================================================="
