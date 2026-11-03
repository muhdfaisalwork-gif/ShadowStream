import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def inspect_item(item_id):
    url = f"https://archive.org/metadata/{item_id}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        res = urllib.request.urlopen(req, timeout=10, context=ctx)
        data = json.loads(res.read().decode('utf-8'))
        files = data.get('files', [])
        mp4_files = [f for f in files if f.get('name', '').lower().endswith('.mp4')]
        print(f"=== {item_id} ===")
        print(f"Total files: {len(files)}, MP4s: {len(mp4_files)}")
        for m in mp4_files[:5]:
            print(f"  - {m.get('name')} ({m.get('size')} bytes)")
    except Exception as e:
        print(f"ERR for {item_id}: {e}")

inspect_item("muhammad-the-last-prophet-2002-azeem")
inspect_item("MuhammadTheLastProphet1")
inspect_item("TheMessageEnglishVersion")
inspect_item("the-ashab-e-kahf-men-of-the-cave-movie-urdu-with-english-subtitles")
inspect_item("ashabekahfurdu")
