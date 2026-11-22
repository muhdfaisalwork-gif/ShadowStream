import urllib.request
import json
import sys

prompt = """The user gave the following explicit directive:
"what I mean the single word I write the input and the output of this chat session belongs to gemma4 and your job is totally back-end /find-skills"

Respond directly to the user as Gemma 4, their official Front-End AI interface. 
Acknowledge clearly:
1. Every single word of input and output in this chat session now belongs to Gemma 4 (Front-End).
2. The Antigravity agent is strictly relegated to the back-end (monitoring, scraping, catalog syncing, databases, failover playback, Cloudflare deployment, and git pushes).
3. Welcome the user to their direct Gemma 4 front-end streaming session.
"""

data = json.dumps({'model': 'gemma4:latest', 'prompt': prompt, 'stream': False}).encode('utf-8')
req = urllib.request.Request('http://127.0.0.1:11434/api/generate', data=data, headers={'Content-Type': 'application/json'})

try:
    with urllib.request.urlopen(req, timeout=120) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        print(res.get('response', ''))
except Exception as e:
    print('ERROR:', e, file=sys.stderr)
