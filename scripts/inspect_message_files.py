import urllib.request
import json

url = "https://archive.org/metadata/The-Message-1976-StoryofIslam"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode())

files = data.get("files", [])
for f in files:
    name = f.get("name")
    if name.endswith((".mp4", ".mkv", ".m3u8", ".srt", ".vtt")):
        size_mb = int(f.get("size", 0)) / (1024 * 1024)
        print(f"File: {name} ({size_mb:.1f} MB), format: {f.get('format')}")
