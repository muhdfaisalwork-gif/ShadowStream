---
name: xtool
description: Build, codesign, and package native iOS (.ipa) and macOS (.app / .dmg) applications without Xcode using xtool (xtool-org/xtool) and SwiftPM across Linux, Windows (via WSL2), and macOS. Use whenever the user asks about xtool, building iOS apps, packaging .ipa files, cross-compiling Apple binaries, or deploying to iPhone/iPad from Windows.
user-invocable: true
---

# `xtool` Apple Build & Deployment Skill

This skill provides an automated workflow to cross-compile, codesign, and package native **iOS (`.ipa`)** and **macOS (`.app` / `.dmg`)** applications using [`xtool`](https://github.com/xtool-org/xtool) without requiring a physical Mac or the Xcode IDE GUI.

---

## When to Use This Skill

Activate this skill when the user:
- Asks: *"build iOS app"*, *"build ipa"*, *"package iOS with xtool"*, *"compile for iPhone"*, or *"deploy to Apple device"*
- Invokes `/xtool`
- Asks how to build or update macOS `.dmg` / `.app` packages from Windows
- Needs to configure `xtool.yml`, `Info.plist`, or Apple developer credentials

---

## 1. Toolchain Overview

`xtool` (v1.24.0+) replicates Xcode build system and code signing on Linux, Windows (WSL2), and macOS using:
- **Swift 6.4 Linux Toolchain**: Modern SwiftPM compiler.
- **Darwin SDK Extractor**: Extracts official Darwin SDK headers from Apple's `Xcode.xip`.
- **Packaging Engine**: Builds standalone `.ipa` and `.app` bundles with ad-hoc or Apple ID provisioning.
- **Device Relay**: USB communication via `usbmuxd` and `libimobiledevice`.

---

## 2. One-Time Setup on Windows (via WSL2)

On Windows hosts, run the automated setup wrapper:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-xtool-windows.ps1
```

Or execute directly inside WSL2 Ubuntu:
```bash
bash scripts/setup-xtool-wsl.sh
```

### Apple Developer Login & SDK Registration:
Run the interactive setup inside WSL:
```bash
xtool setup
```
- **Mode 0:** Apple Developer Program API Key (Team Key + App Manager).
- **Mode 1:** Standard Apple ID (email + password + 2FA) using free personal provisioning.
- When prompted for `Path to Xcode.xip`, provide the path to your downloaded `Xcode_*.xip` file.

Verify SDK installation:
```bash
swift sdk list
# Expected: darwin
```

---

## 3. Project Configuration (`xtool.yml`)

The root `xtool.yml` must adhere to the v1.24.0 schema:

```yaml
version: 1
bundleID: com.streamapp.app
product: ShadowStream
infoPath: Info.plist
iconPath: Resources/AppIcon.png

resources:
  - Resources/BrandBanner.png
  - Resources/AppIcon-transparent.png
```

---

## 4. Building the iOS Application (`.ipa`)

To build the release `.ipa` bundle:

```bash
cd packaging/ios/ShadowStream-xtool

# Method 1: Using automated build script
bash build-xtool-ios.sh

# Method 2: With Apple ID code signing
bash build-xtool-ios.sh --sign

# Method 3: Using xtool directly
xtool dev build --configuration release --ipa
```

The compiled binary will be placed at:
`packaging/ios/ShadowStream-xtool/build/ShadowStream.ipa`

### Installation & Sideloading:
- **Direct USB Install:** Connect your device and run `xtool install build/ShadowStream.ipa`
- **Sideloadly / AltStore:** Drag and drop `ShadowStream.ipa` into Sideloadly on Windows.
- **TrollStore:** Direct permanent install if device iOS version is supported.

---

## 5. Building the macOS Application (`.dmg` / `.zip`)

ShadowStream supports full desktop multi-target packaging:

### Method A: Full-Featured Desktop (Electron DMG & ZIP with AdShield)
```powershell
cd packaging\macos
.\build-electron-macos.ps1
```
Output located at: `packaging/windows/app/dist-v2447/`

### Method B: Native SwiftUI macOS App (via SwiftPM)
```bash
cd packaging/ios/ShadowStream-xtool
swift build -c release
```
