# ShadowStream - iOS & macOS App via xtool

This project builds the native **ShadowStream** Apple application (iOS 16+ and macOS 13+) using [xtool](https://github.com/xtool-org/xtool), an open-source toolchain that enables compiling, bundling, and testing Swift Package Manager (SwiftPM) applications without the bloated Xcode IDE GUI.

---

## Prerequisites

### On macOS
Install `xtool` via Homebrew:
```bash
brew tap xtool-org/tap
brew install xtool
```

### On Linux / WSL (Cross-compilation & CI)
Download the binary release or AppImage from [xtool Releases](https://github.com/xtool-org/xtool/releases) or build via Rust:
```bash
cargo install xtool
```

---

## Project Structure

```
packaging/ios/ShadowStream-xtool/
├── Package.swift           # Swift Package specification (iOS 16+, macOS 13+)
├── xtool.yml               # Bundle identifiers, display names, and capabilities
├── Resources/              # High-resolution brand icons and banners
│   ├── AppIcon.png         # 1024x1024 dark brand icon
│   ├── AppIcon-transparent.png
│   └── BrandBanner.png
├── Sources/
│   ├── ShadowStreamApp.swift # SwiftUI @main app entry point
│   └── ContentView.swift     # WKWebView wrapper configured for https://ssmoviestvs.site
├── build-xtool-ios.sh      # Automated build & package script
└── README.md
```

---

## Features

- **Direct Production Endpoint**: Embedded `https://ssmoviestvs.site` streaming core.
- **Hardware-Accelerated Playback**: Inline video playback, AirPlay, and Picture-in-Picture (PiP).
- **Dark Theme Polish**: Native `#0b0f19` deep-space background and safe-area padding.
- **Edge Navigation**: Full support for iOS swipe back/forward gestures.
- **Universal Apple Binary**: Supports iPhone, iPad, and Apple Silicon/Intel macOS.

---

## Building

### Quick Build (iOS)
```bash
xtool build --target ShadowStream --configuration release
```

### Run in iOS Simulator
```bash
xtool run --target ShadowStream --simulator "iPhone 15 Pro"
```

### Package `.ipa` for Distribution
```bash
xtool archive --target ShadowStream --output ./build/ShadowStream.ipa
```

### Build for macOS
```bash
xtool build --target ShadowStream-macOS --configuration release
```
