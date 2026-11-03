import urllib.request
import json

url = "https://archive.org/metadata/saint-mary-series"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode())
files = data.get("files", [])
for f in files:
    name = f.get("name")
    if name.endswith((".mp4", ".m3u8", ".srt", ".vtt")):
        size_mb = int(f.get("size", 0)) / (1024 * 1024)
        print(f"  {name} ({size_mb:.1f} MB)")
