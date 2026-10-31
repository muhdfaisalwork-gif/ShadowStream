import urllib.request
import re

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'}

# Let's search for the exact text on the web first!
# Query: "We couldnt find that" "We have searched through our providers"
try:
    search_url = "https://html.duckduckgo.com/html/?q=" + urllib.parse.quote('"We couldnt find that" "We have searched through our providers"')
    req = urllib.request.Request(search_url, headers=headers)
    with urllib.request.urlopen(req, timeout=10) as r:
        html = r.read().decode('utf-8', errors='ignore')
        print("DuckDuckGo results length:", len(html))
        snippets = re.findall(r'<a class="result__snippet"[^>]*>(.*?)</a>', html, re.DOTALL)
        urls = re.findall(r'<a class="result__url"[^>]*href="([^"]+)"', html)
        for u, snip in zip(urls[:5], snippets[:5]):
            print("URL:", u.strip())
            print("Snippet:", re.sub(r'<[^>]+>', '', snip).strip()[:150])
except Exception as e:
    print("DDG search error:", e)
