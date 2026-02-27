import os
import json
import urllib.request
from dotenv import load_dotenv

load_dotenv('.env')
evo_url = os.getenv('EVOLUTION_API_URL')
evo_key = os.getenv('EVOLUTION_API_KEY')
instance = "lucasborges_5286"

headers = {
    'apikey': evo_key,
    'Accept': 'application/json'
}

print(f"Buscando status de {instance} na Evolution...")

# 1. Connection status
try:
    req = urllib.request.Request(f"{evo_url}/instance/connectionState/{instance}", headers=headers)
    with urllib.request.urlopen(req) as resp:
        print("\n=== CONEXAO ===")
        print(json.dumps(json.loads(resp.read()), indent=2))
except Exception as e:
    print(f"Erro ao buscar estado da conexão: {e}")

# 2. Status geral (whatsapp info)
try:
    req = urllib.request.Request(f"{evo_url}/instance/fetchInstances?instanceName={instance}", headers=headers)
    with urllib.request.urlopen(req) as resp:
        print("\n=== INFO DA INSTANCIA ===")
        print(json.dumps(json.loads(resp.read()), indent=2))
except Exception as e:
    print(f"Erro ao buscar status: {e}")

# 3. Webhook configs
try:
    req = urllib.request.Request(f"{evo_url}/webhook/find/{instance}", headers=headers)
    with urllib.request.urlopen(req) as resp:
        print("\n=== WEBHOOK CONFIG ===")
        print(json.dumps(json.loads(resp.read()), indent=2))
except Exception as e:
    print(f"Erro ao buscar webhook: {e}")
