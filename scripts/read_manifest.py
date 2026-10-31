import urllib.request
import json
import re

url_manifest = "https://player.videasy.to/_next/static/UQaXkN3tIqZ3UW1eDMz4-/_buildManifest.js"
headers = {'User-Agent': 'Mozilla/5.0'}
with urllib.request.urlopen(urllib.request.Request(url_manifest, headers=headers)) as r:
    manifest_js = r.read().decode('utf-8')

# extract the manifest JSON object
json_str = manifest_js[manifest_js.find('self.__BUILD_MANIFEST='):]
for m in re.finditer(r'"/tv/\[\.\.\.params\]":\[([^\]]+)\]', json_str):
    print("TV params chunks:", m.group(1))

for m in re.finditer(r'"/movie/\[\.\.\.params\]":\[([^\]]+)\]', json_str):
    print("Movie params chunks:", m.group(1))
