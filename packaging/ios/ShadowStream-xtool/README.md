# ShadowStream — iOS & macOS App via xtool

This project builds the native **ShadowStream** Apple application (iOS 16+ and macOS 13+) using [xtool](https://github.com/xtool-org/xtool) (v1.24.0), an open-source cross-platform toolchain that compiles, codesigns, and packages SwiftPM applications without requiring Xcode on macOS.

---

## Architecture & Features

- **Direct Production Endpoint:** Embedded `https://ssmoviestvs.site` streaming core.
- **Hardware-Accelerated Playback:** Full inline video playback, AirPlay, and Picture-in-Picture (PiP).
- **AdShield & Pop-up Trap:** Native `WKUIDelegate` captures and silences unwanted blank-target pop-ups.
- **Dark Theme Polish:** Native `#0b0f19` deep-space background and edge swipe navigation.
- **Universal Apple Compatibility:** Builds for iPhone, iPad, and macOS (Apple Silicon + Intel).

---

## Project Structure

```
packaging/ios/ShadowStream-xtool/
├── Package.swift           # Swift Package specification (swift-tools-version: 6.0)
├── xtool.yml               # xtool v1.24.0 packaging schema
├── Info.plist              # Native iOS entitlements, orientations, and background audio
├── Resources/              # High-resolution brand assets
│   ├── AppIcon.png         # 1024x1024 master icon
│   ├── AppIcon-transparent.png
│   └── BrandBanner.png
├── Sources/
│   ├── ShadowStreamApp.swift # SwiftUI @main app entry point
│   └── ContentView.swift     # WKWebView container with PiP, AirPlay, and pop-up trap
├── build-xtool-ios.sh      # Automated release .ipa packager
└── README.md
```

---

## Prerequisites & Installation

### Option 1: On Windows (via WSL2)
1. Run the automated setup script from the root repository:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\scripts\setup-xtool-windows.ps1
   ```
   Or inside WSL2 Ubuntu:
   ```bash
   bash scripts/setup-xtool-wsl.sh
   ```
2. Configure your Apple Developer credentials and Darwin SDK (one-time):
   ```bash
   xtool setup
   ```
   - **Mode 0 (Recommended for Developers):** App Store Connect API Key (Team Key + App Manager).
   - **Mode 1 (Free Personal):** Standard Apple ID (email + password + 2FA).
   - When prompted for `Path to Xcode.xip`, provide your downloaded `Xcode_*.xip` path.

### Option 2: On macOS
```bash
brew tap xtool-org/tap
brew install xtool
xtool setup
```

---

## Building the iOS Application (`.ipa`)

Inside the project directory:

```bash
cd packaging/ios/ShadowStream-xtool

# 1. Automated Release Build (Outputs .ipa to ./build/ShadowStream.ipa)
bash build-xtool-ios.sh

# 2. Signed Build with Apple ID
bash build-xtool-ios.sh --sign
```

Or using `xtool` directly:
```bash
xtool dev build --configuration release --ipa
```

---

## Installing & Sideloading

1. **Direct USB Install via xtool:**
   Connect your iPhone/iPad via USB and run:
   ```bash
   xtool install build/ShadowStream.ipa
   ```
2. **Sideloadly / AltStore:**
   Drag `build/ShadowStream.ipa` into Sideloadly or AltStore to install onto your device using your free Apple ID.
3. **TrollStore:**
   If running a supported iOS version, install `ShadowStream.ipa` directly with permanent entitlements.
