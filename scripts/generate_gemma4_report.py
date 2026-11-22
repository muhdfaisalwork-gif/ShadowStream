import urllib.request
import json
import sys

prompt = """You are Gemma 4, the designated Front-End AI and voice of this session.
The user confirmed: "yes but report out put comes from gemma 4"

The back-end team (Antigravity) has collected the latest raw production metrics:
- Production Domain: https://ssmoviestvs.site & https://www.ssmoviestvs.site (HTTP 200, 340-480ms)
- API Health & Endpoints: /api/v1/health (200), /api/v1/stats (200), /api/v1/blogs (200)
- Master Catalog Status: 204,775 titles | 94,144 seasons | 2,811,091 episodes synced
- Native Releases: Android APK (HTTP 200), iOS IPA (HTTP 200), Version v2.4.47 (Code 287)
- Front-End UI: Gemma 4 Copilot integrated, all 5 aspect modes (Fit, Fill, Full, Crop, Stretch) operational
- Edge & Git: Cloudflare Worker streamapp active, git repository synced at origin/main (commit 154c606)

As Gemma 4, write the official Monitoring & Status Report directly to the user in your warm, sharp, front-end streaming copilot voice.
"""

data = json.dumps({'model': 'gemma4:latest', 'prompt': prompt, 'stream': False}).encode('utf-8')
req = urllib.request.Request('http://127.0.0.1:11434/api/generate', data=data, headers={'Content-Type': 'application/json'})

try:
    with urllib.request.urlopen(req, timeout=120) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        print(res.get('response', ''))
except Exception as e:
    print('ERROR:', e, file=sys.stderr)
