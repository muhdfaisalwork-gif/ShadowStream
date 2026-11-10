# ShadowStream macOS Application — Build & Distribution Guide

ShadowStream offers three flexible build targets for macOS (Apple Silicon `arm64` and Intel `x64`):

---

## Target 1: Full-Featured Desktop Application (Electron DMG & ZIP)
Includes the native AdShield blocker, direct HLS/MP4 playback resolvers, proxy bypass, and custom frameless dark window.

### Quick Build:
- **On Windows (PowerShell):**
  ```powershell
  .\build-electron-macos.ps1
  ```
- **On macOS / Linux:**
  ```bash
  ./build-electron-macos.sh
  ```
Generated artifacts (`.dmg` and `.zip`) are saved in `packaging/windows/app/dist-v2447/`.

---

## Target 2: Native SwiftUI App (via SwiftPM & xtool)
High-performance native macOS app written in Swift with WKWebView, Picture-in-Picture, AirPlay, and system dark theme.

Located in `packaging/ios/ShadowStream-xtool/`:
```bash
cd ../ios/ShadowStream-xtool
swift build -c release
```

---

## Target 3: Ultra-Lightweight Web Launcher (pkg + .app wrapper)
Stand-alone single binary launcher without Chromium overhead.

```bash
cd packaging/macos
./build-app.sh    # Packages StreamApp.app
./build-dmg.sh    # Creates StreamApp-1.0.0.dmg
```

---

## Identifiers & Compatibility
- **Bundle ID:** `com.streamapp.app`
- **Supported macOS:** macOS 12 Monterey, macOS 13 Ventura, macOS 14 Sonoma, macOS 15 Sequoia+
- **Architectures:** Universal (Apple Silicon `arm64` + Intel `x86_64`)
