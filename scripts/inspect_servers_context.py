import urllib.request
import re

c_url = 'https://vidstuck.cc/_next/static/chunks/1f4kdvef1sb4u.js'
js = urllib.request.urlopen(urllib.request.Request(c_url, headers={'User-Agent': 'Mozilla/5.0'})).read().decode('utf-8')

idx = js.find('/backend/servers/${')
if idx != -1:
    print(js[max(0, idx - 300):min(len(js), idx + 300)])
