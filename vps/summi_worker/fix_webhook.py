import os, json, urllib.request, urllib.parse
from dotenv import load_dotenv

load_dotenv('.env')
evo_url = os.getenv('EVOLUTION_API_URL')
evo_key = os.getenv('EVOLUTION_API_KEY')
instance = "lucasborges_5286"

headers = {
    'apikey': evo_key,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
}

data = {
    "url": "https://worker-summi.gera-leads.com/webhooks/evolution-analyze",
    "webhookByEvents": False,
    "webhookBase64": True,
    "events": [
        "MESSAGES_UPSERT",
        "MESSAGES_UPDATE"
    ]
}

req = urllib.request.Request(
    f"{evo_url}/webhook/set/{instance}", 
    data=json.dumps(data).encode('utf-8'), 
    headers=headers, 
    method='POST'
)

try:
    with urllib.request.urlopen(req) as resp:
        print("Webhook updated:")
        print(resp.read().decode())
except Exception as e:
    print("Error updating webhook:", e)
