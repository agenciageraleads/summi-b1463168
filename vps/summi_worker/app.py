from __future__ import annotations

import base64
import json
import logging
import os
import time
from typing import Any, Dict, Optional, Tuple

from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, Header, HTTPException, Request

from .config import Settings, load_settings
from .evolution_client import EvolutionClient, EvolutionError
from .evolution_webhook import normalize_message_event
from .openai_client import OpenAIClient, OpenAIError, TranscriptionResult
from .prompt_builders import (
    build_transcription_hint_terms,
    build_transcription_prompt,
    build_transcription_summary_prompt,
    choose_transcription_fallback_reason,
    is_internal_summi_thread,
)
from .redis_dedupe import RedisDedupe
from .redis_queue import RedisQueueClient
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


def _redis_queue(settings: Settings) -> Optional[RedisQueueClient]:
    if not settings.redis_url:
        return None
    try:
        return RedisQueueClient.from_url(settings.redis_url)
    except Exception:
        logger.exception("redis_queue.init_failed")
        return None


def _elapsed_ms(started_at: float) -> int:
    return int((time.perf_counter() - started_at) * 1000)


def _run_deferred_analysis(
    *,
    settings: Settings,
    user_id: str,
    instance_name: str,
    remote_jid: str,
    message_id: str,
) -> None:
    started_at = time.perf_counter()
    try:
        result = analyze_user_chats(
            settings,
            _supabase(settings),
            _openai(settings),
            user_id=user_id,
        )
        logger.info(
            "evolution_webhook.analysis_background_done instance=%s user_id=%s remote_jid=%s message_id=%s analyzed_count=%s elapsed_ms=%s",
            instance_name,
            user_id,
            remote_jid,
            message_id,
            result.get("analyzed_count"),
            _elapsed_ms(started_at),
        )
    except Exception as exc:
        logger.exception(
            "evolution_webhook.analysis_background_error instance=%s user_id=%s remote_jid=%s message_id=%s elapsed_ms=%s error=%s",
            instance_name,
            user_id,
            remote_jid,
            message_id,
            _elapsed_ms(started_at),
            exc,
        )


def _dispatch_analysis(
    *,
    settings: Settings,
    user_id: str,
    instance_name: str,
    remote_jid: str,
    message_id: str,
    supabase: SupabaseRest,
    openai: OpenAIClient,
    background_tasks: BackgroundTasks | None,
) -> Tuple[bool, bool, bool, Optional[str]]:
    analyze_ok = False
    analysis_enqueued = False
    analysis_deferred = False
    analyze_error: Optional[str] = None

    queue = _redis_queue(settings)
    if settings.enable_analysis_queue and queue is not None:
        try:
            queue.enqueue(
                settings.queue_analysis_name,
                {
                    "type": "analyze_user",
                    "user_id": user_id,
                    "instance_name": instance_name,
                    "remote_jid": remote_jid,
                    "message_id": message_id,
                },
            )
            analysis_enqueued = True
        except Exception as exc:
            analyze_error = f"analysis_queue_enqueue_failed: {str(exc)[:240]}"
            logger.exception(
                "evolution_webhook.analyze_enqueue_error instance=%s user_id=%s remote_jid=%s message_id=%s error=%s",
                instance_name,
                user_id,
                remote_jid,
                message_id,
                exc,
            )

    if not analysis_enqueued and background_tasks is not None:
        background_tasks.add_task(
            _run_deferred_analysis,
            settings=settings,
            user_id=user_id,
            instance_name=instance_name,
            remote_jid=remote_jid,
            message_id=message_id,
        )
        analysis_deferred = True
        logger.info(
            "evolution_webhook.analysis_background_scheduled instance=%s user_id=%s remote_jid=%s message_id=%s",
            instance_name,
            user_id,
            remote_jid,
            message_id,
        )
        return analyze_ok, analysis_enqueued, analysis_deferred, analyze_error

    if not analysis_enqueued:
        started_at = time.perf_counter()
        try:
            analyze_user_chats(settings, supabase, openai, user_id=user_id)
            analyze_ok = True
            logger.info(
                "evolution_webhook.analysis_inline_done instance=%s user_id=%s remote_jid=%s message_id=%s elapsed_ms=%s",
                instance_name,
                user_id,
                remote_jid,
                message_id,
                _elapsed_ms(started_at),
            )
        except Exception as exc:
            analyze_error = str(exc)[:300]
            logger.exception(
                "evolution_webhook.analyze_error instance=%s user_id=%s remote_jid=%s message_id=%s elapsed_ms=%s error=%s",
                instance_name,
                user_id,
                remote_jid,
                message_id,
                _elapsed_ms(started_at),
                exc,
            )

    return analyze_ok, analysis_enqueued, analysis_deferred, analyze_error

def _unwrap(val: Any) -> Any:
    if isinstance(val, list) and len(val) > 0:
        return val[0]
    return val


def _get_in(obj: Dict[str, Any], *path: str) -> Any:
    cur: Any = obj
    for key in path:
        cur = _unwrap(cur)
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


def _safe_positive_int(value: Any) -> Optional[int]:
    try:
        parsed = int(float(value))
    except Exception:
        return None
    return parsed if parsed > 0 else None


def _increment_audio_metrics(supabase: SupabaseRest, *, user_id: str, audio_seconds: Optional[int]) -> None:
    if not audio_seconds or audio_seconds <= 0:
        return
    try:
        supabase.rpc(
            "increment_profile_metrics",
            {
                "target_user_id": user_id,
                "inc_audio_segundos": int(audio_seconds),
                "inc_mensagens_analisadas": 0,
                "inc_conversas_priorizadas": 0,
            },
        )
    except Exception as exc:
        logger.warning("audio_metrics.increment_failed user_id=%s seconds=%s error=%s", user_id, audio_seconds, exc)


def _lightning_reaction(text: str) -> bool:
    return "⚡" in (text or "")


def _summarize_transcription(
    openai: OpenAIClient,
    model: str,
    transcription: str,
    profile: Dict[str, Any],
    *,
    audio_seconds: Optional[int] = None,
) -> str:
    temas_urgentes = profile.get("temas_urgentes") or "Nenhum específico"
    temas_importantes = profile.get("temas_importantes") or "Nenhum específico"

    system, user = build_transcription_summary_prompt(
        transcription,
        temas_urgentes=temas_urgentes,
        temas_importantes=temas_importantes,
        audio_seconds=audio_seconds,
    )

    return openai.chat_text(
        model=model,
        system=system,
        user=user,
        temperature=0.2,
    )


def _transcribe_audio_with_fallback(
    *,
    openai: OpenAIClient,
    settings: Settings,
    profile: Dict[str, Any],
    audio_bytes: bytes,
    filename: str = "audio.mp3",
) -> tuple[TranscriptionResult, Dict[str, Any]]:
    prompt_extra = settings.openai_transcription_prompt_extra
    transcription_prompt = build_transcription_prompt(profile, extra_context=prompt_extra)
    hint_terms = build_transcription_hint_terms(profile, extra_context=prompt_extra)
    base_result = openai.transcribe_audio(
        audio_bytes,
        model=settings.openai_transcription_model,
        filename=filename,
        language=settings.openai_transcription_language,
        prompt=transcription_prompt,
        include_logprobs=True,
        auto_chunking_min_seconds=settings.openai_transcription_chunking_min_seconds,
    )
    metadata: Dict[str, Any] = {
        "audio_transcription_model": base_result.model,
        "audio_transcription_confidence": base_result.average_confidence,
        "audio_transcription_used_fallback": False,
    }
    if base_result.average_logprob is not None:
        metadata["audio_transcription_avg_logprob"] = base_result.average_logprob

    if (
        not settings.openai_transcription_enable_fallback
        or settings.openai_transcription_fallback_model == base_result.model
    ):
        return base_result, metadata

    fallback_reason = choose_transcription_fallback_reason(
        base_result.text,
        average_confidence=base_result.average_confidence,
        confidence_threshold=settings.openai_transcription_confidence_threshold,
        critical_confidence_threshold=settings.openai_transcription_critical_confidence_threshold,
        hint_terms=hint_terms,
    )
    if not fallback_reason:
        return base_result, metadata

    logger.info(
        "openai.transcription_fallback_triggered base_model=%s fallback_model=%s reason=%s confidence=%s",
        base_result.model,
        settings.openai_transcription_fallback_model,
        fallback_reason,
        base_result.average_confidence,
    )
    fallback_result = openai.transcribe_audio(
        audio_bytes,
        model=settings.openai_transcription_fallback_model,
        filename=filename,
        language=settings.openai_transcription_language,
        prompt=transcription_prompt,
        include_logprobs=True,
        auto_chunking_min_seconds=settings.openai_transcription_chunking_min_seconds,
    )
    metadata.update(
        {
            "audio_transcription_fallback_attempted": True,
            "audio_transcription_fallback_reason": fallback_reason,
            "audio_transcription_base_model": base_result.model,
            "audio_transcription_base_confidence": base_result.average_confidence,
        }
    )
    chosen_result = fallback_result if fallback_result.text.strip() or not base_result.text.strip() else base_result
    if chosen_result is fallback_result:
        metadata["audio_transcription_used_fallback"] = True
    metadata["audio_transcription_model"] = chosen_result.model
    metadata["audio_transcription_confidence"] = chosen_result.average_confidence
    if chosen_result.average_logprob is not None:
        metadata["audio_transcription_avg_logprob"] = chosen_result.average_logprob
    else:
        metadata.pop("audio_transcription_avg_logprob", None)
    return chosen_result, metadata


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


def _normalize_jid(value: Any) -> Optional[str]:
    raw = str(value or "").strip()
    if not raw:
        return None
    if "@" in raw:
        return raw
    digits = _digits(raw)
    if not digits:
        return None
    return f"{digits}@s.whatsapp.net"


def _extract_quoted_remote_jid(payload: Dict[str, Any]) -> Optional[str]:
    return _normalize_jid(
        _get_in(payload, "body", "data", "key", "remoteJidAlt")
        or _get_in(payload, "data", "key", "remoteJidAlt")
        or _get_in(payload, "body", "data", "key", "remoteJid")
        or _get_in(payload, "data", "key", "remoteJid")
        or _get_in(payload, "key", "remoteJid")
    )


def _extract_quoted_participant(payload: Dict[str, Any]) -> Optional[str]:
    return _normalize_jid(
        _get_in(payload, "body", "data", "key", "participant")
        or _get_in(payload, "data", "key", "participant")
        or _get_in(payload, "key", "participant")
    )


def _extract_quoted_from_me(payload: Dict[str, Any]) -> Optional[bool]:
    for path in (
        ("body", "data", "key", "fromMe"),
        ("data", "key", "fromMe"),
        ("key", "fromMe"),
    ):
        value = _get_in(payload, *path)
        if isinstance(value, bool):
            return value
    return None


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
    quoted_message_id: Optional[str] = None,
    quoted_text: Optional[str] = None,
    source_author_name: Optional[str] = None,
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

    outbound_text = f"{text.rstrip()}\n\n_⚡️ Summi - Secretária Invisível_"
    if send_private_only:
        author_label = (source_author_name or "").strip()
        outbound_text = f"{author_label} disse:\n{text.rstrip()}" if author_label else text.rstrip()

    evolution.send_text(
        target_instance,
        target_number,
        outbound_text,
        quoted_message_id=quoted_message_id,
        quoted_text=quoted_text,
        quoted_remote_jid=_extract_quoted_remote_jid(payload),
        quoted_from_me=_extract_quoted_from_me(payload),
        quoted_participant=_extract_quoted_participant(payload),
    )
    return {
        "sent": True,
        "destination": destination,
        "target_instance": target_instance,
        "target_number": target_number,
        "quoted_message_id": quoted_message_id,
        "quoted_remote_jid": _extract_quoted_remote_jid(payload),
    }


def _detect_message_shape(payload: Dict[str, Any]) -> Tuple[str, Dict[str, Any]]:
    payload = _unwrap(payload) if isinstance(payload, list) else payload
    msg = (
        _get_in(payload, "body", "data", "message") 
        or _get_in(payload, "data", "message") 
        or _get_in(payload, "data", "update", "message")
        or payload.get("message") 
        or {}
    )
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
    return (
        _get_in(payload, "body", "data", "message", "reactionMessage", "key", "id") 
        or _get_in(payload, "data", "message", "reactionMessage", "key", "id")
        or _get_in(payload, "data", "update", "message", "reactionMessage", "key", "id")
    )


def _get_reaction_text(payload: Dict[str, Any]) -> str:
    return str(
        _get_in(payload, "body", "data", "message", "reactionMessage", "text")
        or _get_in(payload, "data", "message", "reactionMessage", "text")
        or _get_in(payload, "data", "update", "message", "reactionMessage", "text")
        or ""
    )


def _decode_b64_media(media_b64: str) -> bytes:
    raw = media_b64.strip()
    if "," in raw and raw.lower().startswith("data:"):
        raw = raw.split(",", 1)[1]
    return base64.b64decode(raw)


def _should_skip_transcription(conversa: Any, message_id: Optional[str]) -> bool:
    """
    Verifica se a transcrição do áudio deve ser pulada.

    Pula se o message_id já existe no conversa com audio_transcribed=True,
    indicando que este áudio já foi processado em um webhook anterior.
    Evita re-transcrição e gastos desnecessários com OpenAI.
    """
    if not message_id or not isinstance(conversa, list):
        return False

    for event in conversa:
        if isinstance(event, dict) and event.get("message_id") == message_id:
            # Mensagem já existe no conversa e foi transcrita: pula
            if event.get("audio_transcribed"):
                return True

    return False


def _is_audio(media_bytes: bytes) -> bool:
    if not media_bytes:
        return False
    header = media_bytes[:32]
    if header.startswith(b"OggS"):
        return True
    if header.startswith(b"ID3"):
        return True
    if len(header) > 2 and header[0] == 0xFF and (header[1] & 0xE0) == 0xE0:
        return True
    if b"ftypM4A" in header:
        return True
    return False


def _get_inline_media_base64(payload: Dict[str, Any]) -> Optional[str]:
    value = (
        _get_in(payload, "body", "data", "message", "base64")
        or _get_in(payload, "data", "message", "base64")
        or _get_in(payload, "message", "base64")
    )
    if isinstance(value, str) and value.strip():
        return value.strip()
    return None


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


async def _handle_evolution_webhook(
    request: Request,
    *,
    analyze_after: bool,
    background_tasks: BackgroundTasks | None = None,
) -> Dict[str, Any]:
    request_started_at = time.perf_counter()
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

    # Evolution costuma enviar eventos em formatos diferentes ("MESSAGES_UPSERT" vs "messages.upsert").
    # Normalizamos para um padrão com ponto e lowercase.
    event_raw = str(normalized.get("event") or "").strip()
    event_name = event_raw.lower()
    event_norm = event_name.replace("_", ".")

    # Detectar cedo o tipo da mensagem para ignorar updates de status (ruído).
    message_kind, _msg = _detect_message_shape(payload)

    allowed_events = {"messages.upsert", "messages.update"}
    if event_norm and event_norm not in allowed_events:
        logger.info("evolution_webhook.ignored reason=ignored_event event=%s", event_norm)
        return {"ok": True, "stored": False, "reason": "ignored_event", "event": event_norm}

    # `messages.update` é usado principalmente para reações. Outros updates geram muito ruído.
    if event_norm == "messages.update" and message_kind != "reaction":
        logger.info("evolution_webhook.ignored reason=ignored_update_event kind=%s", message_kind)
        return {"ok": True, "stored": False, "reason": "ignored_update_event", "event": event_norm, "kind": message_kind}

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

    if is_internal_summi_thread(chat_remote_jid, settings.ignore_remote_jid):
        logger.info(
            "evolution_webhook.ignored reason=internal_summi_thread instance=%s remote_jid=%s message_id=%s",
            instance_name,
            chat_remote_jid,
            message_id,
        )
        return {"ok": True, "stored": False, "reason": "internal_summi_thread"}

    if message_id and dedupe.enabled:
        dedupe_key = f"summi:webhook:{instance_name}:{message_id}"
        if dedupe.seen_or_mark(dedupe_key, settings.webhook_dedupe_ttl_seconds):
            logger.info("evolution_webhook.duplicate instance=%s message_id=%s", instance_name, message_id)
            return {"ok": True, "stored": False, "reason": "duplicate", "message_id": message_id}

    # Mapear instance -> usuario (profiles.instance_name)
    # Procuramos o perfil ignorando case para evitar falhas se a Evolution enviar LucasBorges vs lucasborges
    profiles = supabase.select(
        "profiles",
        select="*",
        filters=[to_postgrest_filter_eq("instance_name", instance_name.lower())],
        limit=1,
    )
    if not profiles:
        # Fallback para o case original se o lower falhar (caso o DB tenha algo misto)
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
        if not monitored and message_kind != "reaction":
            logger.info("evolution_webhook.ignored reason=group_not_monitored group_id=%s user_id=%s", raw_remote_jid, user_id)
            return {"ok": True, "stored": False, "reason": "group_not_monitored"}
        elif not monitored and message_kind == "reaction":
            # Se for reação ⚡ em grupo não monitorado, deixamos passar para processamento abaixo
            pass

    from_me = bool(normalized.get("from_me") is True)
    author_name = str(normalized.get("push_name") or "Sem nome")
    remote_jid_digits = _digits(remote_jid)
    text_for_chat: Optional[str] = None
    outbound: Dict[str, Any] = {"sent": False}
    processed_audio_seconds: Optional[int] = None
    extra: Dict[str, Any] = {}

    # Fetch existing chat early if we need to check for audio playback status
    # This helps us skip re-transcribing audio that user has already played
    existing_chat = None
    if message_kind == "audio":
        chats = supabase.select(
            "chats",
            select="id,conversa",
            filters=[
                to_postgrest_filter_eq("id_usuario", user_id),
                to_postgrest_filter_eq("remote_jid", chat_remote_jid),
            ],
            limit=1,
        )
        if chats:
            existing_chat = chats[0]

    try:
        if message_kind == "text":
            text_for_chat = _derive_message_content(payload, normalized)

        elif message_kind == "image":
            media_b64 = _get_inline_media_base64(payload)
            media_source = "inline" if media_b64 else "evolution"
            if not media_b64 and message_id:
                media_b64 = evolution.get_media_base64(instance_name, message_id)
            if media_b64:
                image_bytes = _decode_b64_media(media_b64)
                image_desc = openai.describe_image_base64("gpt-4o-mini", image_bytes)
                text_for_chat = _derive_message_content(payload, normalized, image_description=image_desc)
                extra["image_described"] = True
                extra["image_media_source"] = media_source

        elif message_kind == "audio":
            media_b64 = _get_inline_media_base64(payload)
            media_source = "inline" if media_b64 else "evolution"
            if not media_b64 and message_id:
                media_started_at = time.perf_counter()
                media_b64 = evolution.get_media_base64(instance_name, message_id)
                logger.info(
                    "evolution_webhook.audio_media_fetched instance=%s message_id=%s source=%s elapsed_ms=%s",
                    instance_name,
                    message_id,
                    media_source,
                    _elapsed_ms(media_started_at),
                )
            if media_b64:
                mp3_bytes = _decode_b64_media(media_b64)

                # --- Camada 1: Consulta Evolution API para checar se áudio já foi ouvido ---
                # Fail-open: se a API falhar, transcreve normalmente (nunca bloqueia).
                evo_audio_played = False
                if message_id and remote_jid:
                    try:
                        evo_status = evolution.find_message_status(
                            instance_name, message_id, f"{remote_jid_digits}@s.whatsapp.net"
                        )
                        if evo_status == 4:  # Baileys ACK_PLAYED: áudio foi ouvido
                            evo_audio_played = True
                            logger.info(
                                "evolution_webhook.audio_skipped_already_played instance=%s message_id=%s evo_status=%s",
                                instance_name, message_id, evo_status,
                            )
                    except Exception as exc:
                        logger.debug(
                            "evolution_webhook.audio_status_check_failed instance=%s message_id=%s error=%s",
                            instance_name, message_id, exc,
                        )

                # --- Camada 2: Verificar se já foi transcrito anteriormente (webhook duplicado) ---
                conversa = existing_chat.get("conversa") if existing_chat else None
                already_transcribed = _should_skip_transcription(conversa, message_id)

                should_skip = evo_audio_played or already_transcribed

                # --- Camada 3: Verificar se config do usuário permite transcrever ---
                can_send_based_on_origin = (
                    _profile_bool(profile, "transcreve_audio_enviado", True)
                    if from_me
                    else _profile_bool(profile, "transcreve_audio_recebido", True)
                )
                should_transcribe_based_on_config = can_send_based_on_origin

                transcript: Optional[str] = None
                transcription_meta: Dict[str, Any] = {}
                duration_seconds: Optional[float] = None

                if should_skip:
                    skip_reason = "already_played" if evo_audio_played else "already_transcribed"
                    logger.info(
                        "evolution_webhook.audio_skipped instance=%s message_id=%s reason=%s",
                        instance_name, message_id, skip_reason,
                    )
                    # Mark that we skipped transcription
                    extra["audio_transcription_skipped"] = True
                    extra["audio_transcription_skip_reason"] = skip_reason
                    # Try to find the existing transcription in conversa to use it
                    if conversa and isinstance(conversa, list):
                        for event in conversa:
                            if isinstance(event, dict) and event.get("message_id") == message_id:
                                existing_text = event.get("text")
                                if existing_text:
                                    transcript = existing_text
                                    # Reuse audio metadata from existing event
                                    for key, value in event.items():
                                        if key.startswith("audio_"):
                                            transcription_meta[key] = value
                                break
                    if not transcript:
                        transcript = ""
                else:
                    # --- Camada 4: Respeitar config do usuário antes de transcrever ---
                    if not should_transcribe_based_on_config:
                        # Config do usuário desabilita transcrição
                        transcript = ""
                        extra["audio_transcription_skipped"] = True
                        extra["audio_transcription_skip_reason"] = "config_disabled"
                        logger.info(
                            "evolution_webhook.audio_transcription_skipped instance=%s message_id=%s reason=config_disabled from_me=%s transcreve_audio_enviado=%s transcreve_audio_recebido=%s",
                            instance_name,
                            message_id,
                            from_me,
                            _profile_bool(profile, "transcreve_audio_enviado", True) if from_me else "N/A",
                            _profile_bool(profile, "transcreve_audio_recebido", True) if not from_me else "N/A",
                        )
                    else:
                        transcribe_started_at = time.perf_counter()
                        transcription, transcription_meta = _transcribe_audio_with_fallback(
                            openai=openai,
                            settings=settings,
                            profile=profile,
                            audio_bytes=mp3_bytes,
                        )
                        transcript = transcription.text
                        duration_seconds = transcription.duration_seconds
                        logger.info(
                            "evolution_webhook.audio_transcribed instance=%s message_id=%s elapsed_ms=%s transcript_chars=%s model=%s fallback=%s confidence=%s",
                            instance_name,
                            message_id,
                            _elapsed_ms(transcribe_started_at),
                            len(transcript),
                            transcription.model,
                            transcription_meta.get("audio_transcription_used_fallback"),
                            transcription.average_confidence,
                        )

                # Extrai duração do payload em múltiplos caminhos (versões diferentes da Evolution)
                seconds_from_payload = (
                    _get_in(payload, "body", "data", "message", "audioMessage", "seconds")
                    or _get_in(payload, "data", "message", "audioMessage", "seconds")
                    or _get_in(payload, "message", "audioMessage", "seconds")
                )
                audio_seconds: Optional[int] = None
                if seconds_from_payload is not None:
                    audio_seconds = _safe_positive_int(seconds_from_payload)
                if audio_seconds is None and duration_seconds is not None:
                    audio_seconds = _safe_positive_int(duration_seconds)

                resume_audio = _profile_bool(profile, "resume_audio", False)
                segundos_para_resumir = _profile_int(profile, "segundos_para_resumir", 45)
                should_summarize = bool(
                    resume_audio and audio_seconds is not None and audio_seconds > segundos_para_resumir
                )
                logger.info(
                    "evolution_webhook.audio_duration instance=%s message_id=%s seconds_payload=%s duration_openai=%s audio_seconds=%s should_summarize=%s",
                    instance_name, message_id, seconds_from_payload, duration_seconds, audio_seconds, should_summarize,
                )
                final_audio_text = transcript or ""
                processed_audio_seconds = audio_seconds
                if should_summarize and transcript and transcript.strip():
                    summarize_started_at = time.perf_counter()
                    final_audio_text = _summarize_transcription(
                        openai,
                        settings.openai_model_summary,
                        transcript,
                        profile,
                        audio_seconds=audio_seconds,
                    )
                    logger.info(
                        "evolution_webhook.audio_summarized instance=%s message_id=%s elapsed_ms=%s summary_chars=%s",
                        instance_name,
                        message_id,
                        _elapsed_ms(summarize_started_at),
                        len(final_audio_text),
                    )

                text_for_chat = final_audio_text.strip() if final_audio_text.strip() else None
                extra.update(
                    {
                        "audio_transcribed": bool(transcript and transcript.strip()),
                        "audio_summarized": should_summarize,
                        "audio_seconds": audio_seconds,
                        "audio_media_source": media_source,
                    }
                )
                extra.update(transcription_meta)

                send_on_reaction = _profile_bool(profile, "send_on_reaction", False)
                # Config já foi verificada na Camada 4: se desabilitada, transcript="" e text_for_chat=None
                # Então só envia se houver conteúdo e não estejamos esperando reação
                should_send_now = bool(text_for_chat and not send_on_reaction)

                if should_send_now:
                    send_started_at = time.perf_counter()
                    outbound = _send_aux_message(
                        evolution=evolution,
                        settings=settings,
                        profile=profile,
                        payload=payload,
                        instance_name=instance_name,
                        remote_jid_digits=remote_jid_digits,
                        text=text_for_chat,
                        quoted_message_id=message_id or None,
                        quoted_text="Áudio",
                        source_author_name=author_name,
                    )
                    logger.info(
                        "evolution_webhook.audio_reply_sent instance=%s message_id=%s sent=%s elapsed_ms=%s destination=%s",
                        instance_name,
                        message_id,
                        outbound.get("sent"),
                        _elapsed_ms(send_started_at),
                        outbound.get("destination"),
                    )

        elif message_kind == "reaction":
            reaction_text = _get_reaction_text(payload)
            target_id = _get_reaction_target_message_id(payload)
            extra["reaction_text"] = reaction_text
            extra["reaction_target_message_id"] = target_id

            send_on_reaction = _profile_bool(profile, "send_on_reaction", False)
            # Reacao com ⚡: transcreve o audio alvo independente de from_me,
            # pois adapters diferentes podem enviar from_me=False para reacoes proprias.
            # A condicao de seguranca e: send_on_reaction ativo + emoji ⚡ + target_id presente.
            if send_on_reaction and _lightning_reaction(reaction_text) and target_id:
                author_jid = str(normalized.get("author_jid") or _get_in(payload, "body", "sender") or "")
                profile_number = _digits(profile.get("numero", ""))
                reaction_is_from_owner = from_me or bool(profile_number and profile_number in _digits(author_jid))
                
                if not reaction_is_from_owner:
                    logger.warning(
                        "evolution_webhook.reaction_ignored reason=third_party instance=%s target_id=%s author=%s",
                        instance_name, target_id, author_jid,
                    )
                else:
                    media_b64 = evolution.get_media_base64(instance_name, target_id)
                    if media_b64:
                        mp3_bytes = _decode_b64_media(media_b64)
                        if not _is_audio(mp3_bytes):
                            logger.warning("evolution_webhook.reaction_ignored reason=media_not_audio instance=%s target_id=%s", instance_name, target_id)
                            extra["reaction_media_not_audio"] = True
                        else:
                            transcribe_started_at = time.perf_counter()
                            transcription, transcription_meta = _transcribe_audio_with_fallback(
                                openai=openai,
                                settings=settings,
                                profile=profile,
                                audio_bytes=mp3_bytes,
                            )
                            transcript = transcription.text
                            duration_seconds = transcription.duration_seconds
                            logger.info(
                                "evolution_webhook.reaction_audio_transcribed instance=%s target_id=%s elapsed_ms=%s transcript_chars=%s model=%s fallback=%s confidence=%s",
                                instance_name,
                                target_id,
                                _elapsed_ms(transcribe_started_at),
                                len(transcript),
                                transcription.model,
                                transcription_meta.get("audio_transcription_used_fallback"),
                                transcription.average_confidence,
                            )
                            final_text = transcript
                            audio_seconds = _safe_positive_int(duration_seconds)
                            resume_audio = _profile_bool(profile, "resume_audio", False)
                            segundos_para_resumir = _profile_int(profile, "segundos_para_resumir", 45)
                            should_summarize_reaction = bool(
                                resume_audio and audio_seconds is not None and audio_seconds > segundos_para_resumir
                            )
                            if should_summarize_reaction and transcript.strip():
                                summarize_started_at = time.perf_counter()
                                final_text = _summarize_transcription(
                                    openai,
                                    settings.openai_model_summary,
                                    transcript,
                                    profile,
                                    audio_seconds=audio_seconds,
                                )
                                extra["reaction_audio_summarized"] = True
                                logger.info(
                                    "evolution_webhook.reaction_audio_summarized instance=%s target_id=%s elapsed_ms=%s summary_chars=%s",
                                    instance_name,
                                    target_id,
                                    _elapsed_ms(summarize_started_at),
                                    len(final_text),
                                )
                            extra["reaction_audio_seconds"] = audio_seconds
                            for key, value in transcription_meta.items():
                                extra[f"reaction_{key}"] = value
                            processed_audio_seconds = audio_seconds
                            if final_text.strip():
                                send_started_at = time.perf_counter()
                                outbound = _send_aux_message(
                                    evolution=evolution,
                                    settings=settings,
                                    profile=profile,
                                    payload=payload,
                                    instance_name=instance_name,
                                    remote_jid_digits=remote_jid_digits,
                                    text=final_text.strip(),
                                    quoted_message_id=target_id,
                                    quoted_text="Áudio",
                                    source_author_name=author_name,
                                )
                                extra["reaction_audio_transcribed"] = True
                                logger.info(
                                    "evolution_webhook.reaction_audio_reply_sent instance=%s target_id=%s sent=%s elapsed_ms=%s destination=%s",
                                    instance_name,
                                    target_id,
                                    outbound.get("sent"),
                                    _elapsed_ms(send_started_at),
                                    outbound.get("destination"),
                                )
                    else:
                        logger.warning(
                            "evolution_webhook.reaction_no_media instance=%s target_id=%s",
                            instance_name, target_id,
                        )
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

    _increment_audio_metrics(supabase, user_id=user_id, audio_seconds=processed_audio_seconds)
    
    if from_me:
        # Inbox Zero: A resposta do usuário (ele mesmo respondendo o lead) limpa a conversa do dashboard.
        # Isso economiza tokens pois evita que a IA analise algo que o usuário já resolveu manualmente.
        logger.info("Inbox Zero: user response detected. Deleting chat for remote_jid=%s", chat_remote_jid)
        try:
            supabase.delete("chats", filters=[
                to_postgrest_filter_eq("id_usuario", user_id),
                to_postgrest_filter_eq("remote_jid", chat_remote_jid)
            ])
            # Incrementamos métricas para o usuário ver que a Summi "registrou" o trabalho dele como economia de tempo
            supabase.rpc("increment_profile_metrics", {
                "target_user_id": user_id,
                "inc_audio_segundos": 0,
                "inc_mensagens_analisadas": 1,
                "inc_conversas_priorizadas": 0,
            })
        except Exception as exc:
            logger.warning("Inbox Zero delete failed for %s: %s", chat_remote_jid, exc)
            
        return {
            "ok": True,
            "inbox_zero": True,
            "message_kind": message_kind,
            "outbound": outbound
        }

    should_store = bool((text_for_chat or "").strip()) and message_kind in ("text", "audio", "image")
    if should_store and text_for_chat:
        # Merge extra metadata (audio_transcribed, audio_seconds, etc.) no evento antes de salvar
        event_to_store = dict(normalized)
        event_to_store.update(extra)

        chat_id = _upsert_chat_message(
            supabase,
            user_id=user_id,
            remote_jid=chat_remote_jid,
            display_name=author_name or remote_jid_digits,
            is_group=is_group,
            author_name=author_name,
            normalized_event=event_to_store,
            message_text_for_chat=text_for_chat,
        )

    analyze_ok = False
    analysis_enqueued = False
    analysis_deferred = False
    analyze_error: Optional[str] = None
    if analyze_after:
        analyze_ok, analysis_enqueued, analysis_deferred, analyze_error = _dispatch_analysis(
            settings=settings,
            user_id=user_id,
            instance_name=instance_name,
            remote_jid=remote_jid,
            message_id=str(normalized.get("message_id") or ""),
            supabase=supabase,
            openai=openai,
            background_tasks=background_tasks,
        )

    logger.info(
        "evolution_webhook.completed chat_id=%s user_id=%s instance=%s remote_jid=%s message_id=%s analyzed=%s analysis_enqueued=%s analysis_deferred=%s total_ms=%s",
        chat_id,
        user_id,
        instance_name,
        remote_jid,
        normalized.get("message_id"),
        analyze_ok if analyze_after else False,
        analysis_enqueued,
        analysis_deferred,
        _elapsed_ms(request_started_at),
    )
    return {
        "ok": True,
        "stored": bool(chat_id),
        "chat_id": chat_id,
        "analyzed": analyze_ok,
        "message_kind": message_kind,
        "outbound": outbound,
        **({"analysis_enqueued": True} if analysis_enqueued else {}),
        **({"analysis_deferred": True} if analysis_deferred else {}),
        **({"analyze_error": analyze_error} if analyze_error else {}),
        **extra,
    }


@app.post("/webhooks/evolution")
async def webhook_evolution(request: Request) -> Dict[str, Any]:
    """
    Webhook para receber eventos da Evolution API (apenas ingestao).
    """
    return await _handle_evolution_webhook(request, analyze_after=False)


@app.post("/webhooks/evolution-analyze")
async def webhook_evolution_analyze(request: Request, background_tasks: BackgroundTasks) -> Dict[str, Any]:
    """
    Webhook para receber eventos da Evolution API e disparar analise.
    Use esse endpoint para o fluxo "beta" (equivalente ao n8n).
    """
    return await _handle_evolution_webhook(request, analyze_after=True, background_tasks=background_tasks)
