import urllib.request
import re

url = "https://www.vidy.st/_next/static/chunks/pages/_app-871d74e5a2c1171f.js"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as r:
    code = r.read().decode('utf-8')

# Search for s= or backend
for m in re.finditer(r'https?://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', code):
    print("Vidy URL:", m.group(0))

pos = code.find('users.vidy.st')
if pos != -1:
    print("Around users.vidy.st:", code[max(0, pos-100):min(len(code), pos+200)])
