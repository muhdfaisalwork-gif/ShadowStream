import urllib.request
import json

for item in ["muhammad-the-messenger-of-god-2015-urdu", "muhammad-the-messenger-of-god-full-movie-in-urdu-hindi-original-hd-quality-2"]:
    url = f"https://archive.org/metadata/{item}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
        files = data.get("files", [])
        print(f"=== {item} ===")
        for f in files:
            name = f.get("name")
            print(f"  {name}")
    except Exception as e:
        print(f"Err {item}: {e}")
