import urllib.request
import re

headers = {'User-Agent': 'Mozilla/5.0'}
url = 'https://vidstuck.cc/embed/tv/100088/1/1?loading=2'
req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req) as r:
    html = r.read().decode('utf-8', errors='ignore')

scripts = re.findall(r'src=["\']([^"\']+\.js[^"\']*)["\']', html)
for s in scripts:
    s_url = s if s.startswith('http') else 'https://vidstuck.cc' + s
    try:
        with urllib.request.urlopen(urllib.request.Request(s_url, headers=headers), timeout=10) as sr:
            code = sr.read().decode('utf-8', errors='ignore')
            for phrase in ["couldnt find", "searched through", "We couldnt", "control over what is available"]:
                if phrase.lower() in code.lower():
                    print(f"FOUND '{phrase}' in {s_url}!")
                    pos = code.lower().find(phrase.lower())
                    print("Context:", code[max(0, pos - 150):min(len(code), pos + 250)])
    except Exception as e:
        pass
