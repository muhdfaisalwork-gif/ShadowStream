import urllib.request
import re

url = "https://vidstuck.cc/embed/tv/100088/1/1?loading=2&color=FFA500"
headers = {'User-Agent': 'Mozilla/5.0'}
with urllib.request.urlopen(urllib.request.Request(url, headers=headers)) as r:
    html = r.read().decode('utf-8')

scripts = re.findall(r'src=["\']([^"\']+\.js[^"\']*)["\']', html)
for s in scripts:
    s_url = s if s.startswith('http') else 'https://vidstuck.cc' + s
    try:
        with urllib.request.urlopen(urllib.request.Request(s_url, headers=headers)) as sr:
            code = sr.read().decode('utf-8')
            for term in ['audioTrack', 'subtitles', 'caption', 'audio_track', 'languages']:
                if term in code:
                    print(f"Match '{term}' in {s_url}")
    except:
        pass
