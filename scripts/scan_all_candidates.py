import urllib.request
import re
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

urls = [
    'https://vidstuck.cc/embed/tv/100088/1/1?loading=2&color=FFA500',
    'https://www.vidy.st/tv/100088/1/1?color=FFA500',
    'https://www.NontonGo.win/embed/tv/100088/1/1',
    'https://vidsrc.to/embed/tv/100088/1/1',
    'https://vidsrc.sh/embed/tv/100088/1-1',
    'https://www.2embed.cc/embed/tmdb/tv?id=100088&s=1&e=1',
    'https://vidlink.pro/tv/100088/1/1',
    'https://vidsrc.me/embed/tv?imdb=tt3581920&season=1&episode=1',
    'https://vidsrc.in/embed/tv/100088/1/1',
    'https://vidsrc.net/embed/tv/100088/1/1',
    'https://cineby.app',
    'https://cineby.ru',
    'https://zxcstream.cc',
    'https://zxcstream.icu',
    'https://zxcstream.com'
]

target_phrases = ['we have searched through our providers', 'searched through our providers', 'couldnt find that']

for u in urls:
    try:
        req = urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'})
        res = urllib.request.urlopen(req, timeout=5, context=ctx)
        html = res.read().decode('utf-8', errors='replace')
        for phrase in target_phrases:
            if phrase in html.lower():
                print(f"!!! MATCH IN HTML OF {u}: '{phrase}'")
        scripts = re.findall(r'src=["\']([^"\']+\.js[^"\']*)["\']', html)
        for s in scripts:
            from urllib.parse import urljoin
            s_url = urljoin(u, s)
            try:
                s_res = urllib.request.urlopen(urllib.request.Request(s_url, headers={'User-Agent': 'Mozilla/5.0'}), timeout=5, context=ctx)
                s_text = s_res.read().decode('utf-8', errors='replace')
                for phrase in target_phrases:
                    if phrase in s_text.lower():
                        print(f"!!! MATCH IN SCRIPT {s_url} OF {u}: '{phrase}'")
            except Exception:
                pass
    except Exception as e:
        # print(f"{u} err: {e}")
        pass

print("Scan complete.")
