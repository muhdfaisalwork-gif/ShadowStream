#!/bin/bash
# Uploads the fresh worker_export snapshot to the streamapp-catalog R2 bucket.
# Run from downloads/streamapp-worker/ so wrangler.toml is picked up.
set -e
SRC="../../scraper/worker_export"
BUCKET="streamapp-catalog"
COUNT=0
TOTAL=$(find "$SRC" -type f | wc -l)

find "$SRC" -type f | while read -r filepath; do
  key="${filepath#$SRC/}"
  COUNT=$((COUNT+1))
  npx wrangler r2 object put "$BUCKET/$key" --file "$filepath" --content-type "application/json" --remote 2>&1 | grep -v "^$" || true
  if [ $((COUNT % 25)) -eq 0 ]; then
    echo "Progress: $COUNT files uploaded"
  fi
done

echo "Upload complete."
