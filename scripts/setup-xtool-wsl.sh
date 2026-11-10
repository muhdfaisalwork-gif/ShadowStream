#!/usr/bin/env bash
# ==============================================================================
# ShadowStream xtool & Swift 6 Toolchain Setup for WSL / Ubuntu Linux
# Project: https://github.com/xtool-org/xtool (v1.24.0)
# ==============================================================================
set -euo pipefail

echo "=================================================================="
echo " ShadowStream: xtool & Swift 6 iOS Cross-Compiler Setup for WSL"
echo "=================================================================="

# 1. System packages
echo "[1/4] Installing system dependencies (usbmuxd, libimobiledevice)..."
sudo apt-get update -qq
sudo apt-get install -y -qq \
    curl \
    wget \
    binutils \
    git \
    unzip \
    gnupg2 \
    libc6-dev \
    libcurl4-openssl-dev \
    libedit2 \
    libgcc-s1 \
    libpython3-dev \
    libsqlite3-0 \
    libstdc++-11-dev \
    libxml2-dev \
    zlib1g-dev \
    pkg-config \
    usbmuxd \
    libimobiledevice-utils

# 2. Check or Install Swift 6.4
echo "[2/4] Verifying Swift toolchain..."
if command -v swift &> /dev/null && swift --version | grep -q "Swift version 6"; then
    echo "  [✓] Swift 6 toolchain already installed: $(swift --version | head -n 1)"
else
    echo "  [*] Installing Swift 6.4 for Ubuntu..."
    SWIFT_TAR="swift-6.4-RELEASE-ubuntu24.04.tar.gz"
    SWIFT_URL="https://download.swift.org/swift-6.4-release/ubuntu2404/swift-6.4-RELEASE/${SWIFT_TAR}"
    
    TMP_DIR=$(mktemp -d)
    cd "$TMP_DIR"
    wget -q --show-progress "$SWIFT_URL"
    sudo tar -xzf "$SWIFT_TAR" -C /usr/local --strip-components=1
    rm -rf "$TMP_DIR"
    echo "  [✓] Swift installed: $(swift --version | head -n 1)"
fi

# 3. Download & Install xtool binary
echo "[3/4] Fetching latest xtool release binary..."
ARCH="$(uname -m)"
XTOOL_URL="https://github.com/xtool-org/xtool/releases/latest/download/xtool-${ARCH}.AppImage"

TMP_XTOOL=$(mktemp)
curl -fL "$XTOOL_URL" -o "$TMP_XTOOL"
chmod +x "$TMP_XTOOL"
sudo mv "$TMP_XTOOL" /usr/local/bin/xtool

echo "  [✓] xtool installed successfully: $(/usr/local/bin/xtool --help | head -n 2)"

# 4. Next Step Instructions for xtool setup
echo "=================================================================="
echo " [4/4] Installation Succeeded!"
echo " Next step: Configure your Apple ID / Developer credentials & SDK:"
echo ""
echo " Run:"
echo "   xtool setup"
echo ""
echo " When prompted:"
echo " 1. Select Mode 0 (Apple Developer API Key) or Mode 1 (Apple ID Password)"
echo " 2. Provide the local path to your Xcode.xip (e.g. /mnt/c/Users/.../Xcode_16.xip)"
echo ""
echo " Then build the ShadowStream iOS app via:"
echo "   cd /mnt/g/streaming\\ app/packaging/ios/ShadowStream-xtool"
echo "   bash build-xtool-ios.sh"
echo "=================================================================="
