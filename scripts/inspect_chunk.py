import urllib.request

c_url = 'https://vidstuck.cc/_next/static/chunks/0jvhpaew_uadu.js'
js = urllib.request.urlopen(urllib.request.Request(c_url, headers={'User-Agent': 'Mozilla/5.0'})).read().decode('utf-8')
idx = js.find('Reload to try again')
print(js[max(0, idx - 400):min(len(js), idx + 600)])
