import urllib.request
import json
import urllib.parse

titles = [
    ("the-message-1976", "The Message 1976"),
    ("muhammad-the-messenger-of-god-2015", "Muhammad The Messenger of God 2015"),
    ("muhammad-the-last-prophet-2002", "Muhammad The Last Prophet 2002"),
    ("prophet-joseph-2008", "Prophet Joseph Yousuf"),
    ("the-kingdom-of-solomon-2010", "The Kingdom of Solomon 2010"),
    ("saint-mary-2000", "Saint Mary Maryam Moghaddas"),
    ("the-messiah-2007", "The Messiah 2007 Nader Talebzadeh"),
    ("bilal-a-new-breed-of-hero-2015", "Bilal A New Breed of Hero"),
    ("men-of-anjolos-1997", "Men of Anjolos Ashab e Kahf"),
    ("mokhtarnameh-2010", "Mokhtarnameh"),
    ("omar-series-2012", "Omar series 2012 Hatem Ali"),
    ("imam-ali-1997", "Imam Ali The Martyr of Kufa"),
]

for slug, query in titles:
    q = urllib.parse.quote(f"{query} AND mediatype:(movies)")
    url = f"https://archive.org/advancedsearch.php?q={q}&fl[]=identifier,title,downloads&sort[]=downloads+desc&rows=3&page=1&output=json"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode())
            docs = data.get("response", {}).get("docs", [])
            print(f"=== {slug} ===")
            for d in docs:
                print(f"  Identifier: {d.get('identifier')} | Title: {d.get('title')} | Downloads: {d.get('downloads')}")
    except Exception as e:
        print(f"=== {slug} ERR: {e} ===")
