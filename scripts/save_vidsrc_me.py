with open('scripts/test_vidsrc_me.py', 'w', encoding='utf-8') as f:
    f.write('''import urllib.request
url = "https://vidsrc.me/embed/movie?imdb=tt0074896"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", "Referer": "https://ssmoviestvs.site/"})
with urllib.request.urlopen(req) as resp:
    html = resp.read().decode("utf-8", errors="ignore")
with open("scripts/vidsrc_me.html", "w", encoding="utf-8") as out:
    out.write(html)
print("Saved vidsrc_me.html, length:", len(html))
''')
