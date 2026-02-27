import json
import urllib.request
import os

# Usamos a URL pública do worker
url = "https://worker-summi.gera-leads.com/webhooks/evolution-analyze"
instance = "lucasborges_5286"

# Payload simulado de mensagem recebida (formato Evolution v2)
payload = {
    "event": "messages.upsert",
    "instance": instance,
    "data": {
        "key": {
            "remoteJid": "556299999999@s.whatsapp.net",
            "fromMe": False,
            "id": "SIMULATED_TEST_ID_2"
        },
        "pushName": "Teste Debug",
        "message": {
            "conversation": "Mensagem de teste para debug"
        },
        "messageType": "conversation",
        "messageTimestamp": 1709000000,
        "owner": instance,
        "source": "ios"
    }
}

data = json.dumps(payload).encode('utf-8')
req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})

try:
    with urllib.request.urlopen(req) as resp:
        print(f"Status: {resp.status}")
        print(f"Response: {resp.read().decode()}")
except Exception as e:
    if hasattr(e, 'read'):
        print(f"Error: {e.read().decode()}")
    else:
        print(f"Error: {e}")
