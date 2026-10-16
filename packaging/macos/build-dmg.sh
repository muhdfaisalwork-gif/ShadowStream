#!/usr/bin/env bash
# Build a distributable .dmg from the universal StreamApp.app bundle.
# Run on macOS.

set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
APP="$HERE/dist/StreamApp.app"
OUT="$HERE/dist/StreamApp-1.0.0.dmg"

if [[ ! -d "$APP" ]]; then
    echo "ERROR: $APP not found. Run build-app.sh first." >&2
    exit 1
fi

rm -f "$OUT"

# hdiutil is macOS-native
hdiutil create -volname "StreamApp" \
    -srcfolder "$APP" \
    -ov -format UDZO \
    "$OUT"

echo "Built: $OUT"
