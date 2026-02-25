from __future__ import annotations

import base64
import json
import logging
import os
from typing import Any, Dict, Optional, Tuple

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, Request

from .config import Settings, load_settings
from .evolution_client import EvolutionClient, EvolutionError
from .evolution_webhook import normalize_message_event
from .openai_client import OpenAIClient, OpenAIError
from .redis_dedupe import RedisDedupe
from .summi_jobs import analyze_user_chats, run_hourly_job
from .supabase_rest import SupabaseRest, to_postgrest_filter_eq


load_dotenv()

app = FastAPI(title="Summi Worker")
logger = logging.getLogger("summi_worker")
if not logger.handlers:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")


def _settings() -> Settings:
    # Recarrega a cada request para facilitar debug na VPS; pode cachear depois.
    return load_settings()


def _supabase(settings: Settings) -> SupabaseRest:
    return SupabaseRest(settings.supabase_url, settings.supabase_service_role_key)


def _openai(settings: Settings) -> OpenAIClient:
    return OpenAIClient(settings.openai_api_key)


def _evolution(settings: Settings) -> EvolutionClient:
    return EvolutionClient(settings.evolution_api_url, settings.evolution_api_key)


def _redis_dedupe(settings: Settings) -> RedisDedupe:
    return RedisDedupe(settings.redis_url)


def _get_in(obj: Dict[str, Any], *path: str) -> Any:
    cur: Any = obj
    for key in path:
        if isinstance(cur, dict) and key in cur:
            cur = cur[key]
        else:
            return None
    return cur


def _digits(value: Any) -> str:
    return "".join(ch for ch in str(value or "") if ch.isdigit())


def _profile_bool(profile: Dict[str, Any], key: str, default: bool = False) -> bool:
    value = profile.get(key)
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in ("1", "true", "sim", "yes", "y", "on")


def _profile_int(profile: Dict[str, Any], key: str, default: int) -> int:
    value = profile.get(key)
    try:
        return int(value) if value is not None else default
    except Exception:
        return default


def _lightning_reaction(text: str) -> bool:
    return "⚡" in (text or "")


def _summarize_transcription(openai: OpenAIClient, model: str, transcription: str) -> str:
    return openai.chat_text(
        model=model,
        system="Voce resume transcricoes de audio em portugues. Seja objetivo.",
        user=(
            "Resuma a transcricao a seguir de forma direta e objetiva, trazendo apenas os pontos mais importantes.\n\n"
            f"Transcricao:\n{transcription}"
        ),
        temperature=0.2,
    )


def _derive_message_content(payload: Dict[str, Any], normalized: Dict[str, Any], *, image_description: str | None = None, audio_text: str | None = None) -> Optional[str]:
    if audio_text:
        return audio_text.strip()
    if image_description:
        return f"Imagem: {image_description.strip()}"

    text = (normalized.get("text") or "").strip()
    if text:
        return text
    return None


def _append_legacy_line(existing: str, author_name: str, text: str) -> str:
    line = f"- {author_name}: {text}".strip()
    if not existing or not existing.strip():
        return line
    return f"{existing.rstrip()}\n{line}"


def _upsert_chat_message(
    supabase: SupabaseRest,
    *,
    user_id: str,
    remote_jid: str,
    display_name: str,
    is_group: bool,
    author_name: str,
    normalized_event: Dict[str, Any],
    message_text_for_chat: str,
) -> str:
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
        conversa = chat.get("conversa")
        if isinstance(conversa, list):
            event_copy = dict(normalized_event)
            event_copy["text"] = message_text_for_chat
            conversa.append(event_copy)
            supabase.patch("chats", {"conversa": conversa}, filters=[to_postgrest_filter_eq("id", chat["id"])])
        elif isinstance(conversa, str):
            new_conversa = _append_legacy_line(conversa, author_name, message_text_for_chat)
            supabase.patch("chats", {"conversa": new_conversa}, filters=[to_postgrest_filter_eq("id", chat["id"])])
        else:
            event_copy = dict(normalized_event)
            event_copy["text"] = message_text_for_chat
            supabase.patch("chats", {"conversa": [event_copy]}, filters=[to_postgrest_filter_eq("id", chat["id"])])
        return str(chat["id"])

    event_copy = dict(normalized_event)
    event_copy["text"] = message_text_for_chat
    inserted = supabase.insert(
        "chats",
        [
            {
                "id_usuario": user_id,
                "remote_jid": remote_jid,
                "nome": display_name,
                "grupo": f"{remote_jid}@g.us" if is_group and not str(remote_jid).endswith("@g.us") else (remote_jid if is_group else None),
                "prioridade": "0",
                "conversa": [event_copy],
            }
        ],
    )
    return str(inserted[0]["id"])


def _send_aux_message(
    *,
    evolution: EvolutionClient,
    settings: Settings,
    profile: Dict[str, Any],
    payload: Dict[str, Any],
    instance_name: str,
    remote_jid_digits: str,
    text: str,
) -> Dict[str, Any]:
    send_private_only = _profile_bool(profile, "send_private_only", False)
    destination = "conversation"
    target_instance = instance_name
    target_number = remote_jid_digits

    if send_private_only:
        sender_jid = _get_in(payload, "body", "sender") or payload.get("sender") or profile.get("numero")
        sender_digits = _digits(sender_jid)
        profile_number = _digits(profile.get("numero"))
        target_number = sender_digits or profile_number or target_number
        target_instance = settings.summi_sender_instance
        destination = "private"

    if not text.strip() or not target_number:
        return {"sent": False, "destination": destination}

    evolution.send_text(target_instance, target_number, text)
    return {"sent": True, "destination": destination, "target_instance": target_instance, "target_number": target_number}


def _detect_message_shape(payload: Dict[str, Any]) -> Tuple[str, Dict[str, Any]]:
    msg = _get_in(payload, "body", "data", "message") or _get_in(payload, "data", "message") or payload.get("message") or {}
    if not isinstance(msg, dict):
        msg = {}
    if "audioMessage" in msg:
        return "audio", msg
    if "imageMessage" in msg:
        return "image", msg
    if "reactionMessage" in msg:
        return "reaction", msg
    if "extendedTextMessage" in msg or "conversation" in msg:
        return "text", msg
    return "unknown", msg


def _get_reaction_target_message_id(payload: Dict[str, Any]) -> Optional[str]:
    return _get_in(payload, "body", "data", "message", "reactionMessage", "key", "id") or _get_in(
        payload, "data", "message", "reactionMessage", "key", "id"
    )


def _get_reaction_text(payload: Dict[str, Any]) -> str:
    return str(
        _get_in(payload, "body", "data", "message", "reactionMessage", "text")
        or _get_in(payload, "data", "message", "reactionMessage", "text")
        or ""
    )


def _decode_b64_media(media_b64: str) -> bytes:
    raw = media_b64.strip()
    if "," in raw and raw.lower().startswith("data:"):
        raw = raw.split(",", 1)[1]
    return base64.b64decode(raw)


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
    evolution = _evolution(settings)
    dedupe = _redis_dedupe(settings)

    payload = await request.json()
    normalized = normalize_message_event(payload)
    logger.info(
        "evolution_webhook.received path=%s event=%s instance=%s remote_jid=%s message_id=%s message_type=%s from_me=%s analyze_after=%s",
        request.url.path,
        normalized.get("event"),
        normalized.get("instance_name"),
        normalized.get("remote_jid"),
        normalized.get("message_id"),
        normalized.get("message_type"),
        normalized.get("from_me"),
        analyze_after,
    )
    event_name = (normalized.get("event") or "").lower()
    if event_name and event_name != "messages.upsert":
        logger.info("evolution_webhook.ignored reason=ignored_event event=%s", event_name)
        return {"ok": True, "stored": False, "reason": "ignored_event", "event": event_name}

    raw_remote_jid = str(_get_in(payload, "body", "data", "key", "remoteJid") or _get_in(payload, "data", "key", "remoteJid") or "")
    raw_remote_jid_alt = str(
        _get_in(payload, "body", "data", "key", "remoteJidAlt") or _get_in(payload, "data", "key", "remoteJidAlt") or ""
    )
    is_group = raw_remote_jid.endswith("@g.us")
    remote_jid = normalized.get("remote_jid")
    chat_remote_jid = raw_remote_jid if is_group and raw_remote_jid else str(remote_jid or "")
    if (raw_remote_jid or "").endswith("@lid") and raw_remote_jid_alt:
        chat_remote_jid = _digits(raw_remote_jid_alt)
    instance_name = normalized.get("instance_name")
    message_id = str(normalized.get("message_id") or "").strip()
    if not remote_jid:
        logger.warning("evolution_webhook.ignored reason=missing_remote_jid")
        return {"ok": True, "stored": False, "reason": "missing_remote_jid"}
    if not instance_name:
        logger.warning("evolution_webhook.ignored reason=missing_instance_name remote_jid=%s", remote_jid)
        return {"ok": True, "stored": False, "reason": "missing_instance_name"}

    if message_id and dedupe.enabled:
        dedupe_key = f"summi:webhook:{instance_name}:{message_id}"
        if dedupe.seen_or_mark(dedupe_key, settings.webhook_dedupe_ttl_seconds):
            logger.info("evolution_webhook.duplicate instance=%s message_id=%s", instance_name, message_id)
            return {"ok": True, "stored": False, "reason": "duplicate", "message_id": message_id}

    # Mapear instance -> usuario (profiles.instance_name)
    profiles = supabase.select(
        "profiles",
        select="*",
        filters=[to_postgrest_filter_eq("instance_name", instance_name)],
        limit=1,
    )
    if not profiles:
        logger.warning("evolution_webhook.ignored reason=profile_not_found_for_instance instance=%s", instance_name)
        return {"ok": True, "stored": False, "reason": "profile_not_found_for_instance"}
    profile = profiles[0]
    user_id = str(profile["id"])

    if is_group:
        monitored = supabase.select(
            "monitored_whatsapp_groups",
            select="id,group_id,user_id",
            filters=[
                to_postgrest_filter_eq("group_id", raw_remote_jid),
                to_postgrest_filter_eq("user_id", user_id),
            ],
            limit=1,
        )
        if not monitored:
            logger.info("evolution_webhook.ignored reason=group_not_monitored group_id=%s user_id=%s", raw_remote_jid, user_id)
            return {"ok": True, "stored": False, "reason": "group_not_monitored"}

    from_me = bool(normalized.get("from_me") is True)
    author_name = str(normalized.get("push_name") or "Sem nome")
    remote_jid_digits = _digits(remote_jid)
    message_kind, _msg = _detect_message_shape(payload)

    text_for_chat: Optional[str] = None
    outbound: Dict[str, Any] = {"sent": False}
    extra: Dict[str, Any] = {}

    try:
        if message_kind == "text":
            text_for_chat = _derive_message_content(payload, normalized)

        elif message_kind == "image":
            if message_id:
                media_b64 = evolution.get_media_base64(instance_name, message_id)
                image_bytes = _decode_b64_media(media_b64)
                image_desc = openai.describe_image_base64("gpt-4o-mini", image_bytes)
                text_for_chat = _derive_message_content(payload, normalized, image_description=image_desc)
                extra["image_described"] = True

        elif message_kind == "audio":
            if message_id:
                media_b64 = evolution.get_media_base64(instance_name, message_id)
                mp3_bytes = _decode_b64_media(media_b64)
                transcript, duration_seconds = openai.transcribe_mp3(mp3_bytes)
                seconds_from_payload = _get_in(payload, "body", "data", "message", "audioMessage", "seconds")
                audio_seconds = None
                try:
                    audio_seconds = int(seconds_from_payload) if seconds_from_payload is not None else None
                except Exception:
                    audio_seconds = int(duration_seconds) if duration_seconds else None

                resume_audio = _profile_bool(profile, "resume_audio", False)
                segundos_para_resumir = _profile_int(profile, "segundos_para_resumir", 45)
                should_summarize = bool(resume_audio and (audio_seconds or 0) > segundos_para_resumir)
                final_audio_text = transcript
                if should_summarize and transcript.strip():
                    final_audio_text = _summarize_transcription(openai, settings.openai_model_summary, transcript)

                text_for_chat = final_audio_text.strip() if final_audio_text.strip() else None
                extra.update(
                    {
                        "audio_transcribed": bool(transcript.strip()),
                        "audio_summarized": should_summarize,
                        "audio_seconds": audio_seconds,
                    }
                )

                send_on_reaction = _profile_bool(profile, "send_on_reaction", False)
                can_send_based_on_origin = (
                    _profile_bool(profile, "transcreve_audio_enviado", True)
                    if from_me
                    else _profile_bool(profile, "transcreve_audio_recebido", True)
                )
                should_send_now = can_send_based_on_origin and (not send_on_reaction)
                if should_send_now and text_for_chat:
                    outbound = _send_aux_message(
                        evolution=evolution,
                        settings=settings,
                        profile=profile,
                        payload=payload,
                        instance_name=instance_name,
                        remote_jid_digits=remote_jid_digits,
                        text=text_for_chat,
                    )

        elif message_kind == "reaction":
            reaction_text = _get_reaction_text(payload)
            target_id = _get_reaction_target_message_id(payload)
            extra["reaction_text"] = reaction_text
            extra["reaction_target_message_id"] = target_id

            send_on_reaction = _profile_bool(profile, "send_on_reaction", False)
            if from_me and send_on_reaction and _lightning_reaction(reaction_text) and target_id:
                media_b64 = evolution.get_media_base64(instance_name, target_id)
                mp3_bytes = _decode_b64_media(media_b64)
                transcript, duration_seconds = openai.transcribe_mp3(mp3_bytes)
                final_text = transcript
                resume_audio = _profile_bool(profile, "resume_audio", False)
                segundos_para_resumir = _profile_int(profile, "segundos_para_resumir", 45)
                if resume_audio and (duration_seconds or 0) > segundos_para_resumir and transcript.strip():
                    final_text = _summarize_transcription(openai, settings.openai_model_summary, transcript)
                    extra["reaction_audio_summarized"] = True
                if final_text.strip():
                    outbound = _send_aux_message(
                        evolution=evolution,
                        settings=settings,
                        profile=profile,
                        payload=payload,
                        instance_name=instance_name,
                        remote_jid_digits=remote_jid_digits,
                        text=final_text.strip(),
                    )
                    extra["reaction_audio_transcribed"] = True
            # Reacoes nao entram no historico de conversa para analise
            text_for_chat = None

    except (EvolutionError, OpenAIError, ValueError) as exc:
        logger.exception(
            "evolution_webhook.processing_error instance=%s remote_jid=%s message_id=%s kind=%s error=%s",
            instance_name,
            remote_jid,
            message_id,
            message_kind,
            exc,
        )
        # Mantem ingestao basica se possivel
        if message_kind in ("text", "unknown"):
            text_for_chat = _derive_message_content(payload, normalized)

    chat_id: Optional[str] = None
    should_store = (not from_me) and bool((text_for_chat or "").strip()) and message_kind in ("text", "audio", "image")
    if should_store and text_for_chat:
        chat_id = _upsert_chat_message(
            supabase,
            user_id=user_id,
            remote_jid=chat_remote_jid,
            display_name=author_name or remote_jid_digits,
            is_group=is_group,
            author_name=author_name,
            normalized_event=normalized,
            message_text_for_chat=text_for_chat,
        )

    if analyze_after:
        analyze_user_chats(settings, supabase, openai, user_id=user_id)

    logger.info(
        "evolution_webhook.stored chat_id=%s user_id=%s instance=%s remote_jid=%s message_id=%s analyzed=%s",
        chat_id,
        user_id,
        instance_name,
        remote_jid,
        normalized.get("message_id"),
        analyze_after,
    )
    return {
        "ok": True,
        "stored": bool(chat_id),
        "chat_id": chat_id,
        "analyzed": analyze_after,
        "message_kind": message_kind,
        "outbound": outbound,
        **extra,
    }


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
