import os
import sys
sys.path.insert(0, 'vps/summi_worker')

from dotenv import load_dotenv
from supabase_rest import SupabaseRest, to_postgrest_filter_eq

load_dotenv()

supabase = SupabaseRest(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
)

# Buscar profile de lucasborges_5285
profiles = supabase.select(
    "profiles",
    select="id,instance_name,numero,transcreve_audio_enviado,transcreve_audio_recebido,resume_audio",
    filters=[to_postgrest_filter_eq("instance_name", "lucasborges_5285")],
    limit=1
)

if profiles:
    profile = profiles[0]
    print("✅ Profile encontrado:")
    print(f"  ID: {profile.get('id')}")
    print(f"  Instance: {profile.get('instance_name')}")
    print(f"  Numero: {profile.get('numero')}")
    print(f"  Transcreve Audio Enviado: {profile.get('transcreve_audio_enviado')} (default: True)")
    print(f"  Transcreve Audio Recebido: {profile.get('transcreve_audio_recebido')} (default: True)")
    print(f"  Resume Audio: {profile.get('resume_audio')} (default: False)")
else:
    print("❌ Profile não encontrado")
