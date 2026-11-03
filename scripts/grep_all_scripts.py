import urllib.request
import re

url = 'https://vidstuck.cc/embed/tv/100088/1/1?loading=2&color=FFA500'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
html = urllib.request.urlopen(req).read().decode('utf-8')

scripts = re.findall(r'src=["\']([^"\']+\.js[^"\']*)["\']', html)
print(f"Total scripts: {len(scripts)}")

for s in scripts:
    s_url = 'https://vidstuck.cc' + s if s.startswith('/') else s
    try:
        data = urllib.request.urlopen(urllib.request.Request(s_url, headers={'User-Agent': 'Mozilla/5.0'}), timeout=5).read().decode('utf-8')
        for phrase in ['couldnt find', 'searched through', 'have searched through our providers', 'we couldnt find that']:
            if phrase in data.lower():
                print(f"FOUND PHRASE '{phrase}' in {s}")
    except Exception as e:
        print(f"Error loading {s}: {e}")
