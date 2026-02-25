from __future__ import annotations

import json
import os
from typing import Any, Dict, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, Request

from .config import Settings, load_settings
from .evolution_client import EvolutionClient
from .evolution_webhook import normalize_message_event
from .openai_client import OpenAIClient
from .summi_jobs import analyze_user_chats, run_hourly_job
from .supabase_rest import SupabaseRest, to_postgrest_filter_eq


load_dotenv()

app = FastAPI(title="Summi Worker")


def _settings() -> Settings:
    # Recarrega a cada request para facilitar debug na VPS; pode cachear depois.
    return load_settings()


def _supabase(settings: Settings) -> SupabaseRest:
    return SupabaseRest(settings.supabase_url, settings.supabase_service_role_key)


def _openai(settings: Settings) -> OpenAIClient:
    return OpenAIClient(settings.openai_api_key)


def _evolution(settings: Settings) -> EvolutionClient:
    return EvolutionClient(settings.evolution_api_url, settings.evolution_api_key)


@app.get("/health")
def health() -> Dict[str, Any]:
    return {"ok": True}


@app.post("/api/analyze-messages")
async def api_analyze_messages(
    request: Request,
    authorization: Optional[str] = Header(default=None),
) -> Dict[str, Any]:
    """
    Substitui o webhook do n8n "Analisa-Mensagens".

    Espera um JWT do Supabase em Authorization: Bearer <token>.
    O corpo pode estar vazio; o userId e derivado do token.
    """
    settings = _settings()
    supabase = _supabase(settings)
    openai = _openai(settings)

    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing Authorization bearer token")

    token = authorization.split(" ", 1)[1].strip()

    # Validar usuario via Supabase Auth API (usa anon key se fornecida; caso nao, tenta via service role).
    apikey = settings.supabase_anon_key or settings.supabase_service_role_key
    auth_url = f"{settings.supabase_url}/auth/v1/user"
    import requests

    resp = requests.get(
        auth_url,
        headers={"apikey": apikey, "Authorization": f"Bearer {token}"},
        timeout=20,
    )
    if not resp.ok:
        raise HTTPException(status_code=401, detail=f"Invalid token: {resp.status_code}")
    user = resp.json()
    user_id = user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token (no user id)")

    # Executa analise imediatamente
    result = analyze_user_chats(settings, supabase, openai, user_id=user_id)
    return result


@app.post("/internal/run-hourly")
def internal_run_hourly(x_internal_token: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    """
    Executa o job horario manualmente.
    Protecao simples via env INTERNAL_TOKEN (opcional).
    """
    internal_token = os.getenv("INTERNAL_TOKEN")
    if internal_token and x_internal_token != internal_token:
        raise HTTPException(status_code=401, detail="unauthorized")

    settings = _settings()
    supabase = _supabase(settings)
    openai = _openai(settings)
    evolution = _evolution(settings)

    return run_hourly_job(settings, supabase, openai, evolution)


async def _handle_evolution_webhook(request: Request, *, analyze_after: bool) -> Dict[str, Any]:
    settings = _settings()
    supabase = _supabase(settings)
    openai = _openai(settings)

    payload = await request.json()
    normalized = normalize_message_event(payload)
    event_name = (normalized.get("event") or "").lower()
    if event_name and event_name != "messages.upsert":
        return {"ok": True, "stored": False, "reason": "ignored_event", "event": event_name}

    remote_jid = normalized.get("remote_jid")
    instance_name = normalized.get("instance_name")
    if not remote_jid:
        return {"ok": True, "stored": False, "reason": "missing_remote_jid"}
    if not instance_name:
        return {"ok": True, "stored": False, "reason": "missing_instance_name"}

    # Mapear instance -> usuario (profiles.instance_name)
    profiles = supabase.select(
        "profiles",
        select="id,instance_name,nome",
        filters=[to_postgrest_filter_eq("instance_name", instance_name)],
        limit=1,
    )
    if not profiles:
        return {"ok": True, "stored": False, "reason": "profile_not_found_for_instance"}
    user_id = profiles[0]["id"]

    # Encontrar chat do usuario por remote_jid
    chats = supabase.select(
        "chats",
        select="id,id_usuario,remote_jid,nome,conversa",
        filters=[
            to_postgrest_filter_eq("id_usuario", user_id),
            to_postgrest_filter_eq("remote_jid", remote_jid),
        ],
        limit=1,
    )

    if chats:
        chat = chats[0]
        conversa = chat.get("conversa") or []
        if not isinstance(conversa, list):
            conversa = []
        conversa.append(normalized)
        supabase.patch("chats", {"conversa": conversa}, filters=[to_postgrest_filter_eq("id", chat["id"])])
        chat_id = chat["id"]
    else:
        # Criar novo chat
        nome = normalized.get("push_name") or remote_jid
        inserted = supabase.insert(
            "chats",
            [
                {
                    "id_usuario": user_id,
                    "remote_jid": remote_jid,
                    "nome": nome,
                    "prioridade": "normal",
                    "conversa": [normalized],
                }
            ],
        )
        chat_id = inserted[0]["id"]

    if analyze_after:
        analyze_user_chats(settings, supabase, openai, user_id=user_id)

    return {"ok": True, "stored": True, "chat_id": chat_id, "analyzed": analyze_after}


@app.post("/webhooks/evolution")
async def webhook_evolution(request: Request) -> Dict[str, Any]:
    """
    Webhook para receber eventos da Evolution API (apenas ingestao).
    """
    return await _handle_evolution_webhook(request, analyze_after=False)


@app.post("/webhooks/evolution-analyze")
async def webhook_evolution_analyze(request: Request) -> Dict[str, Any]:
    """
    Webhook para receber eventos da Evolution API e disparar analise.
    Use esse endpoint para o fluxo "beta" (equivalente ao n8n).
    """
    return await _handle_evolution_webhook(request, analyze_after=True)
