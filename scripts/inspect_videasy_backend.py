import urllib.request
import re

url = "https://player.videasy.to/tv/100088/1/1?color=FFA500"
headers = {'User-Agent': 'Mozilla/5.0'}
req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req) as r:
    html = r.read().decode('utf-8', errors='ignore')

# Search for any backend URL in html
urls = re.findall(r'https?://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:/[a-zA-Z0-9._~:/?#[\]@!$&\'()*+,;=-]*)?', html)
for u in set(urls):
    if 'next' not in u and 'w3.org' not in u:
        print("Found URL in videasy html:", u)

# Let's also check all chunk URLs in videasy
scripts = re.findall(r'src=["\']([^"\']+\.js[^"\']*)["\']', html)
for s in scripts:
    s_url = s if s.startswith('http') else 'https://player.videasy.to' + s
    try:
        with urllib.request.urlopen(urllib.request.Request(s_url, headers=headers), timeout=5) as sr:
            code = sr.read().decode('utf-8', errors='ignore')
            for phrase in ["couldnt find", "searched through", "We couldnt", "control over what"]:
                if phrase.lower() in code.lower():
                    print(f"FOUND '{phrase}' in videasy chunk {s_url}!")
            found_apis = re.findall(r'https?://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/(?:api|stream|source)[^\'"\s]*', code)
            for a in set(found_apis):
                print("API in chunk:", a)
    except:
        pass
