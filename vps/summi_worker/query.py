import os, json, urllib.request, urllib.parse
from dotenv import load_dotenv

load_dotenv('.env')
url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

headers = {
    'apikey': key,
    'Authorization': f'Bearer {key}',
    'Accept': 'application/json'
}

# 1. Busca perfil (profiles)
req = urllib.request.Request(f"{url}/rest/v1/profiles?instance_name=eq.lucasborges_5286", headers=headers)
with urllib.request.urlopen(req) as resp:
    profiles = json.loads(resp.read().decode())

print("=== PROFILES ===")
print(json.dumps(profiles, indent=2))

if profiles:
    uid = profiles[0]['id']
    # 2. Busca assinatura
    req2 = urllib.request.Request(f"{url}/rest/v1/subscribers?user_id=eq.{uid}", headers=headers)
    try:
        with urllib.request.urlopen(req2) as resp:
            subs = json.loads(resp.read().decode())
        print("\n=== SUBSCRIBERS ===")
        print(json.dumps(subs, indent=2))
    except Exception as e:
        print("Subscribers fetch failed:", e)

    # 3. Busca chats recentes
    req3 = urllib.request.Request(f"{url}/rest/v1/chats?id_usuario=eq.{uid}&order=modificado_em.desc&limit=1", headers=headers)
    try:
        with urllib.request.urlopen(req3) as resp:
            chats = json.loads(resp.read().decode())
        print("\n=== RECENT CHATS ===")
        print(json.dumps(chats, indent=2))
    except Exception as e:
        print("Chats fetch failed:", e)

