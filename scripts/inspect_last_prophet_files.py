import urllib.request
import json

for item in ["MuhammadTheLastProphet1", "muhammad-the-last-prophet-2002-azeem"]:
    url = f"https://archive.org/metadata/{item}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
        files = data.get("files", [])
        print(f"=== {item} ===")
        for f in files:
            name = f.get("name")
            if name.endswith((".mp4", ".m3u8", ".srt", ".vtt")):
                size_mb = int(f.get("size", 0)) / (1024 * 1024)
                print(f"  {name} ({size_mb:.1f} MB)")
    except Exception as e:
        print(f"Err {item}: {e}")
