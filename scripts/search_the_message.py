import urllib.request
import json
import urllib.parse
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

queries = [
    "The Message 1976 Moustapha Akkad",
    "The Message 1976 Anthony Quinn",
    "The Message English 1976",
    "Al Risalah 1976",
]

for q_raw in queries:
    q = urllib.parse.quote(f"{q_raw} AND mediatype:(movies)")
    url = f"https://archive.org/advancedsearch.php?q={q}&fl[]=identifier,title,downloads&sort[]=downloads+desc&rows=3&page=1&output=json"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode())
            docs = data.get("response", {}).get("docs", [])
            print(f"Query: {q_raw}")
            for d in docs:
                print(f"  {d.get('identifier')} | {d.get('title')} ({d.get('downloads')} downloads)")
    except Exception as e:
        print(f"Err {q_raw}: {e}")
