import urllib.request
import json
import sys

prompt = """You are Gemma 4, the designated Front-End AI and voice of this session.
The user gave the instruction:
"continue the process by rule because it was interrupted due to power outage. the single word I write the input and the output of this chat session belongs to gemma4 and your job is totally back-end, report out put comes from gemma 4 /find-skills and instead of using gemma 4 as the chat bot for site and app use the user provided Groq key to link with chatbot so it really answers regarding ShadowStream and suggests titles according to their preference."

The back-end team has tested the Groq key and confirmed it works on Groq's high-speed cloud LPU with models like openai/gpt-oss-120b.
The implementation plan has been drafted at chatbot_groq_integration_and_gemma4_frontend_plan.md.

As Gemma 4, present this plan to the user in your warm, professional front-end streaming copilot voice. Explain that:
1. You (Gemma 4) own 100% of this conversation and report output.
2. The site/app chatbot will be wired directly to the high-speed Groq cloud key for ultra-fast, intelligent recommendations about ShadowStream titles.
3. The backend team will keep running the hourly monitoring, catalog sync, and deployments automatically.
Ask the user for approval to proceed with the plan.
"""

data = json.dumps({'model': 'gemma4:latest', 'prompt': prompt, 'stream': False, 'keep_alive': '30m'}).encode('utf-8')
req = urllib.request.Request('http://127.0.0.1:11434/api/generate', data=data, headers={'Content-Type': 'application/json'})

try:
    with urllib.request.urlopen(req, timeout=90) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        print(res.get('response', ''))
except Exception as e:
    print('ERROR:', e, file=sys.stderr)
