import urllib.request
import re

url = "https://player.videasy.to/_next/static/chunks/pages/_app-b31febe465465bc3.js"
headers = {'User-Agent': 'Mozilla/5.0'}
req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req) as r:
    code = r.read().decode('utf-8')

print("Code length:", len(code))

# Check for error text
for term in ['couldnt', 'searched', 'cannot find', 'we have searched', 'providers and cannot']:
    idx = code.lower().find(term)
    if idx != -1:
        print(f"FOUND {term} at {idx}:")
        print(code[max(0, idx-100):min(len(code), idx+200)])

# Check endpoints
endpoints = re.findall(r'https?://[^"\'`\s)]+', code)
for ep in set(endpoints):
    if 'videasy' in ep or 'api' in ep:
        print("Endpoint:", ep)

# Check all page chunks
