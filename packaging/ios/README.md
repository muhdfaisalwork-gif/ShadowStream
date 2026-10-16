# StreamApp iOS — Build Instructions

## What this is
A native iOS scaffold that wraps the deployed StreamApp web app in a
WKWebView. Source files are structured for Xcode 15+ / iOS 16+.

## Status on this machine
**Source scaffold only.** iOS builds require macOS + Xcode. This folder
contains all the Swift/Objective-C sources, Info.plist, asset catalog,
and an Xcode project file. Build it on a Mac.

## Files in this scaffold

| File | Purpose |
|---|---|
| `StreamApp.xcodeproj/project.pbxproj` | Xcode project (single iOS app target) |
| `StreamApp/AppDelegate.swift` | App entry, opens WKWebView, loads `APP_URL` |
| `StreamApp/SceneDelegate.swift` | iOS 13+ scene-based lifecycle |
| `StreamApp/Info.plist` | ATS (HTTPS-only) + orientation + bundle id |
| `StreamApp/Assets.xcassets/AppIcon.appiconset/Contents.json` | App icon manifest |
| `StreamApp/Assets.xcassets/Contents.json` | Asset catalog root |
| `StreamApp/Base.lproj/LaunchScreen.storyboard` | Launch screen |
| `BUILD.md` | Build commands |

## Build on macOS

```bash
cd packaging/ios
open StreamApp.xcodeproj
# Xcode opens, pick "Any iOS Device" or a simulator, then:
#   Product → Archive → Distribute App → Ad Hoc / App Store
```

Or from command line:
```bash
xcodebuild -project StreamApp.xcodeproj -scheme StreamApp \
  -sdk iphoneos -configuration Release archive
```

## Bundle id
`com.streamapp.app` (change in Info.plist + xcodeproj before signing)

## Universal links / App Transport Security
The Info.plist sets `NSAppTransportSecurity → NSAllowsArbitraryLoads = NO`,
so all traffic must be HTTPS. The default `APP_URL` is
`https://ls7m73ztxvfc2.space.minimax.io` (HTTPS).
