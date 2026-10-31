import urllib.request
import re

url = "https://vidstuck.cc/_next/static/chunks/0jvhpaew_uadu.js"
headers = {'User-Agent': 'Mozilla/5.0'}
req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req) as r:
    text = r.read().decode('utf-8', errors='ignore')

idx = text.find("searched through")
if idx != -1:
    print(text[max(0, idx - 200):min(len(text), idx + 300)])
else:
    print("Not found, searching 'couldnt find'")
    idx = text.find("couldnt find")
    if idx != -1:
        print(text[max(0, idx - 200):min(len(text), idx + 300)])
    else:
        print("Not found either")
