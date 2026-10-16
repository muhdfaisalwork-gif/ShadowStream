# StreamApp macOS — Build Instructions

## What this is
A native macOS .app bundle that wraps the deployed StreamApp web app.
Built with `pkg` (Node.js → standalone executable) + a thin .app shell.

## Built artifacts (already on this machine)

| File | Arch | Size |
|---|---|---|
| `dist/StreamApp-macos-x64` | Intel | 51 MB |
| `dist/StreamApp-macos-arm64` | Apple Silicon | 46 MB |

## Wrap into a .app bundle (on a Mac)

```bash
cd packaging/macos
./build-app.sh           # wraps the pkg binaries into StreamApp.app
./build-dmg.sh           # creates StreamApp-1.0.0.dmg for distribution
```

The `build-app.sh` script places the pkg-built binary inside
`StreamApp.app/Contents/MacOS/StreamApp` and adds the required
`Info.plist` + `PkgInfo` so macOS treats it as a proper app bundle.

## Why not Electron / Tauri?
The launcher is intentionally a tiny pkg-bundled Node binary that opens
the deployed URL in the user's default browser. No Chromium download,
no 200 MB Electron runtime. Same UX as a native app from the user's
perspective.

## Bundle id
`com.streamapp.app` (set in Info.plist)
