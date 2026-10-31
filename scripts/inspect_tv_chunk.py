import urllib.request
import re

url = "https://player.videasy.to/_next/static/chunks/pages/tv/%5B...params%5D-b59b72f8b1988b1e.js"
headers = {'User-Agent': 'Mozilla/5.0'}
req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req) as r:
    code = r.read().decode('utf-8')

print("Length of tv params chunk:", len(code))
# Search for error text
for term in ['couldnt', 'searched', 'cannot find', 'we have searched', 'Go Back']:
    idx = code.lower().find(term.lower())
    if idx != -1:
        print(f"FOUND {term} at {idx}:")
        print(code[max(0, idx-100):min(len(code), idx+200)])

# Search for what backend it calls!
endpoints = re.findall(r'https?://[^"\'`\s)]+', code)
for ep in set(endpoints):
    print("Endpoint:", ep)

# Print first 2000 chars of logic
print("First 2000 chars:")
print(code[:2000])
