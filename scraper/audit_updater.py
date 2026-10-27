import urllib.request

UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36'
bases = [
    "https://ssmoviestvs.site/downloads",
    "https://streamapp-catalog.muhd-faisal-work.workers.dev/downloads",
]
for base in bases:
    url = base + "/latest.yml"
    try:
        r = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=20)
        b = r.read()
        print(url)
        print("   ->", r.status, "len", len(b), repr(b[:70]))
    except Exception as e:
        print(url)
        print("   ->", type(e).__name__, e)