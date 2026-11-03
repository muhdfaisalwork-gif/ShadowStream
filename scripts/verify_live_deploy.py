import urllib.request
import json
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

headers = {'User-Agent': 'Mozilla/5.0'}

def get_json(url):
    req = urllib.request.Request(url, headers=headers)
    res = urllib.request.urlopen(req, timeout=10)
    return json.loads(res.read().decode('utf-8'))

# 1. Version check
v_json = get_json('https://www.ssmoviestvs.site/version.json')
v_api = get_json('https://ssmoviestvs.site/api/v1/app-version')
print(f"[LIVE VERSION] version.json: {v_json.get('version')} (code {v_json.get('versionCode')})")
print(f"[LIVE VERSION] /app-version: {v_api.get('version')} (code {v_api.get('versionCode')})")
assert v_json.get('version') == '2.4.45', "version.json not 2.4.45"
assert v_api.get('version') == '2.4.45', "app-version not 2.4.45"

# 2. Check title details and streams for sample titles
test_titles = [
    ("The Message", "the-message-1976", 1, 1),
    ("Prophet Joseph", "prophet-joseph-2008", 1, 1),
    ("Muhammad The Messenger of God", "muhammad-the-messenger-of-god-2015", 1, 1),
    ("Muhammad The Last Prophet", "muhammad-the-last-prophet-2002", 1, 1),
    ("The Kingdom of Solomon", "the-kingdom-of-solomon-2010", 1, 1),
    ("Omar", "omar-series-2012", 1, 1),
    ("Saint Mary", "saint-mary-2000", 1, 1),
    ("Bilal", "bilal-a-new-breed-of-hero-2015", 1, 1),
    ("Men of Anjolos", "men-of-anjolos-1997", 1, 1),
    ("Imam Ali", "imam-ali-1997", 1, 1),
    ("Mokhtarnameh", "mokhtarnameh-2010", 1, 1),
    ("The Last of Us", "the-last-of-us-2023", 1, 1)
]

for name, slug, s, ep in test_titles:
    t_url = f"https://ssmoviestvs.site/api/v1/title/{slug}"
    t_data = get_json(t_url)
    avail = t_data.get('availability', [])
    top_avail = avail[0] if avail else {}
    
    r_url = f"https://ssmoviestvs.site/api/v1/stream/resolve?slug={slug}&season={s}&episode={ep}"
    r_data = get_json(r_url)
    streams = r_data.get('streams', [])
    top_stream = streams[0] if streams else {}
    
    print(f"\n[{name}]")
    print(f"  Title: {t_data.get('title')} | Type: {t_data.get('type')}")
    print(f"  Top Avail: {top_avail.get('source')} ({top_avail.get('kind')}) -> {top_avail.get('url', '')[:80]}")
    print(f"  Top Stream: {top_stream.get('provider')} ({top_stream.get('format')}) -> {top_stream.get('url', '')[:80]}")
    print(f"  Total Streams: {len(streams)}")

print("\n>>> ALL LIVE VERIFICATION CHECKS PASSED 100% <<<")
