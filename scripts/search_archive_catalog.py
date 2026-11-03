import urllib.request
import json
from urllib.parse import quote_plus
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

queries = [
    ("Muhammad The Messenger of God", 'title:("Muhammad The Messenger of God") AND mediatype:(movies)'),
    ("Abraham The Friend of God", 'title:("Abraham") AND title:("Friend of God") AND mediatype:(movies)'),
    ("The Messiah 2007", 'title:("The Messiah") AND mediatype:(movies)'),
    ("Testament The Story of Moses", 'title:("Moses") AND mediatype:(movies)'),
    ("Qamar Bani Hashim", 'title:("Qamar Bani Hashim") OR title:("Muhammad The Final Legacy") AND mediatype:(movies)'),
    ("Imam Ali Series", 'title:("Imam Ali") AND mediatype:(movies)'),
    ("Mokhtarnameh", 'title:("Mokhtarnameh") OR title:("Mokhtar Nameh") AND mediatype:(movies)'),
]

for label, q in queries:
    url = f"https://archive.org/advancedsearch.php?q={quote_plus(q)}&fl[]=identifier,title,downloads,year&sort[]=downloads+desc&rows=5&output=json"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        res = urllib.request.urlopen(req, timeout=10)
        data = json.loads(res.read().decode('utf-8'))
        docs = data.get('response', {}).get('docs', [])
        print(f"\n=== Query: {label} (Found {len(docs)}) ===")
        for d in docs:
            print(f"  Identifier: {d.get('identifier')} | Title: {d.get('title')} | Downloads: {d.get('downloads')}")
    except Exception as e:
        print(f"ERR {label}: {e}")
