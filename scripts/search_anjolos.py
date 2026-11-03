import urllib.request
import json
import urllib.parse
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

url = "https://archive.org/advancedsearch.php?q=title%3A%28Ashab-e-Kahf%29+OR+title%3A%28Men+of+Anjolos%29+OR+title%3A%28Companions+of+the+Cave%29&fl[]=identifier,title,downloads&sort[]=downloads+desc&rows=10&page=1&output=json"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode())
    docs = data.get("response", {}).get("docs", [])
    for d in docs:
        print(f"{d.get('identifier')} | {d.get('title')} ({d.get('downloads')} downloads)")
