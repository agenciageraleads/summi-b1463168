from __future__ import annotations

import base64
import datetime as dt
import json
import logging
import os
import threading
import time
import uuid
from typing import Any, Dict, Optional, Tuple

from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, Header, HTTPException, Request
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

from .budget_guard import get_user_budget_state
from .config import Settings, load_settings
from .cost_tracking import log_chat_cost, log_transcription_cost
from .evolution_client import EvolutionClient, EvolutionError
from .evolution_webhook import normalize_message_event
from .growth_tracking import record_trial_budget_events
from .openai_client import GeminiTranscriptionClient, OpenAIClient, OpenAIError, OpenAIUsage, TranscriptionResult
from .prompt_builders import (
    build_footer,
    build_transcription_hint_terms,
    build_transcription_prompt,
    build_transcription_summary_prompt,
    choose_transcription_fallback_reason,
    is_internal_summi_thread,
)
from .redis_dedupe import RedisDedupe
from .redis_queue import RedisQueueClient, run_now_result_key
from .summi_jobs import (
    analyze_user_chats,
    run_daily_summary_job,
    run_hourly_job,
    run_user_summi_now,
    send_checkout_reminder,
)
from .supabase_rest import SupabaseRest, to_postgrest_filter_eq


load_dotenv()

app = FastAPI(title="Summi Worker")
logger = logging.getLogger("summi_worker")
if not logger.handlers:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")


_RUN_NOW_RESULT_CACHE: dict[str, tuple[float, dict[str, Any]]] = {}
_RUN_NOW_RESULT_CACHE_LOCK = threading.Lock()


@app.on_event("startup")
def validate_runtime_settings() -> None:
    load_settings()


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


def _now_utc_iso() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat()


def _prune_run_now_cache(now_ts: float) -> None:
    expired = [job_id for job_id, (expires_at, _) in _RUN_NOW_RESULT_CACHE.items() if expires_at <= now_ts]
    for job_id in expired:
        _RUN_NOW_RESULT_CACHE.pop(job_id, None)


def _set_run_now_result(
    *,
    settings: Settings,
    job_id: str,
    payload: Dict[str, Any],
) -> None:
    queue = _redis_queue(settings)
    if queue is not None:
        try:
            queue.set_json(run_now_result_key(job_id), payload, settings.run_now_result_ttl_seconds)
            return
        except Exception:
            logger.exception("run_now.result_store_redis_failed job_id=%s", job_id)

    now_ts = time.time()
    with _RUN_NOW_RESULT_CACHE_LOCK:
        _prune_run_now_cache(now_ts)
        _RUN_NOW_RESULT_CACHE[job_id] = (now_ts + settings.run_now_result_ttl_seconds, payload)


def _get_run_now_result(
    *,
    settings: Settings,
    job_id: str,
) -> Optional[Dict[str, Any]]:
    queue = _redis_queue(settings)
    if queue is not None:
        try:
            cached = queue.get_json(run_now_result_key(job_id))
            if isinstance(cached, dict):
                return cached
        except Exception:
            logger.exception("run_now.result_read_redis_failed job_id=%s", job_id)

    now_ts = time.time()
    with _RUN_NOW_RESULT_CACHE_LOCK:
        _prune_run_now_cache(now_ts)
        item = _RUN_NOW_RESULT_CACHE.get(job_id)
        if not item:
            return None
        expires_at, payload = item
        if expires_at <= now_ts:
            _RUN_NOW_RESULT_CACHE.pop(job_id, None)
            return None
        return payload


def _poll_run_now_result(
    *,
    settings: Settings,
    job_id: str,
    timeout_seconds: int,
    interval_seconds: float = 0.35,
) -> Optional[Dict[str, Any]]:
    deadline = time.perf_counter() + max(0, timeout_seconds)
    while time.perf_counter() < deadline:
        result = _get_run_now_result(settings=settings, job_id=job_id)
        if result and str(result.get("status") or "") != "processing":
            return result
        time.sleep(interval_seconds)
    result = _get_run_now_result(settings=settings, job_id=job_id)
    if result and str(result.get("status") or "") != "processing":
        return result
    return None


def _extract_user_id_from_authorization(settings: Settings, authorization: Optional[str]) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing Authorization bearer token")

    token = authorization.split(" ", 1)[1].strip()

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
    return str(user_id)


def _run_user_summi_now_job(
    *,
    settings: Settings,
    user_id: str,
    job_id: str,
) -> None:
    started_at = time.perf_counter()
    supabase = _supabase(settings)
    openai = _openai(settings)
    evolution = _evolution(settings)

    try:
        result = run_user_summi_now(settings, supabase, openai, evolution, user_id=user_id)
    except Exception as exc:
        logger.exception("run_now.job_error user_id=%s job_id=%s error=%s", user_id, job_id, exc)
        result = {
            "success": False,
            "status": "error",
            "summary_sent": False,
            "fallback_sent": False,
            "onboarding_sent": False,
            "analyzed_count": 0,
            "reason": "unexpected_error",
            "error": str(exc)[:300],
        }

    payload = {
        **result,
        "job_id": job_id,
        "user_id": user_id,
        "completed_at": _now_utc_iso(),
        "elapsed_ms": _elapsed_ms(started_at),
    }
    _set_run_now_result(settings=settings, job_id=job_id, payload=payload)


def _spawn_local_run_now_thread(
    *,
    settings: Settings,
    user_id: str,
    job_id: str,
) -> None:
    thread = threading.Thread(
        target=_run_user_summi_now_job,
        kwargs={"settings": settings, "user_id": user_id, "job_id": job_id},
        daemon=True,
    )
    thread.start()


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


def _should_skip_audio_summary_for_budget(
    settings: Settings,
    supabase: SupabaseRest,
    *,
    user_id: str,
) -> tuple[bool, Optional[str]]:
    try:
        state = get_user_budget_state(settings, supabase, user_id=user_id)
    except Exception as exc:
        logger.warning("audio_summary_budget_check_failed user_id=%s error=%s", user_id, exc)
        return False, None
    try:
        record_trial_budget_events(supabase, user_id=user_id, state=state)
    except Exception as exc:
        logger.warning("trial_budget_event_logging_failed user_id=%s error=%s", user_id, exc)
    if not state.soft_cap_reached:
        return False, None
    return (
        True,
        f"budget_soft_cap_reached:{state.plan_kind}:{state.current_cost_brl:.2f}/{state.soft_cap_brl:.2f}",
    )


def _maybe_log_chat_usage(
    supabase: SupabaseRest,
    *,
    user_id: str,
    operation: str,
    model: str,
    usage: Optional[OpenAIUsage],
) -> None:
    if usage is None:
        return
    log_chat_cost(
        supabase,
        user_id,
        operation=operation,
        model=model,
        input_tokens=usage.prompt_tokens,
        output_tokens=usage.completion_tokens,
    )


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
) -> tuple[str, Optional[OpenAIUsage]]:
    temas_urgentes = profile.get("temas_urgentes") or "Nenhum específico"
    temas_importantes = profile.get("temas_importantes") or "Nenhum específico"

    system, user = build_transcription_summary_prompt(
        transcription,
        temas_urgentes=temas_urgentes,
        temas_importantes=temas_importantes,
        audio_seconds=audio_seconds,
    )

    response = openai.chat_text_response(
        model=model,
        system=system,
        user=user,
        temperature=0.2,
    )
    return response.text, response.usage


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

    if settings.transcription_provider == "google":
        google = GeminiTranscriptionClient(settings.google_api_key or "")
        result = google.transcribe_audio(
            audio_bytes,
            model=settings.google_transcription_model,
            filename=filename,
            language=settings.openai_transcription_language,
            prompt=transcription_prompt,
        )
        metadata: Dict[str, Any] = {
            "audio_transcription_provider": "google",
            "audio_transcription_model": result.model,
            "audio_transcription_confidence": result.average_confidence,
            "audio_transcription_used_fallback": False,
        }
        return result, metadata

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
        "audio_transcription_provider": "openai",
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
    now_event_iso = _now_utc_iso()
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
            supabase.patch(
                "chats",
                {"conversa": conversa, "ultimo_evento_em": now_event_iso},
                filters=[to_postgrest_filter_eq("id", chat["id"])],
            )
        elif isinstance(conversa, str):
            new_conversa = _append_legacy_line(conversa, author_name, message_text_for_chat)
            supabase.patch(
                "chats",
                {"conversa": new_conversa, "ultimo_evento_em": now_event_iso},
                filters=[to_postgrest_filter_eq("id", chat["id"])],
            )
        else:
            event_copy = dict(normalized_event)
            event_copy["text"] = message_text_for_chat
            supabase.patch(
                "chats",
                {"conversa": [event_copy], "ultimo_evento_em": now_event_iso},
                filters=[to_postgrest_filter_eq("id", chat["id"])],
            )
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
                "ultimo_evento_em": now_event_iso,
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
    is_trial: bool = True,
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

    outbound_text = f"{text.rstrip()}\n\n{build_footer(is_trial)}"
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


# ---------------------------------------------------------------------------
# Social preview endpoint — called by nginx for social media bot requests.
# Returns minimal HTML with og: / twitter: meta tags for a specific blog post
# so that WhatsApp, Telegram, Facebook etc. show a rich link preview.
# ---------------------------------------------------------------------------

_SOCIAL_PREVIEW_HTML = """\
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>{title} | Summi</title>
  <meta name="description" content="{excerpt}">
  <meta property="og:title" content="{title} | Summi">
  <meta property="og:description" content="{excerpt}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="{site_url}/blog/{slug}">
  <meta property="og:image" content="{image_url}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:locale" content="pt_BR">
  <meta property="og:site_name" content="Summi">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{title} | Summi">
  <meta name="twitter:description" content="{excerpt}">
  <meta name="twitter:image" content="{image_url}">
  <meta property="article:published_time" content="{published_at}">
  <link rel="canonical" href="{site_url}/blog/{slug}">
</head>
<body>
  <h1>{title}</h1>
  <p>{excerpt}</p>
  <a href="{site_url}/blog/{slug}">Ler artigo completo</a>
</body>
</html>
"""

_DEFAULT_OG_IMAGE = "https://summi.gera-leads.com/lovable-uploads/8d37281c-dfb2-4e98-93c9-888cccd6a706.png"


@app.get("/social/blog/{slug}")
async def social_blog_preview(slug: str, request: Request):
    from fastapi.responses import HTMLResponse
    settings = _settings()
    supabase = _supabase(settings)
    site_url = os.getenv("SITE_URL", "https://summi.gera-leads.com").rstrip("/")

    try:
        rows = supabase.select(
            "blog_posts",
            select="slug,title,excerpt,published_at,cover_image_url",
            filters=[("slug", f"eq.{slug}"), ("published", "eq.true")],
            limit=1,
        )
    except Exception:
        rows = []

    if not rows:
        from fastapi.responses import RedirectResponse
        return RedirectResponse(url=f"{site_url}/blog", status_code=302)

    post = rows[0]
    image_url = post.get("cover_image_url") or _DEFAULT_OG_IMAGE

    html = _SOCIAL_PREVIEW_HTML.format(
        title=post["title"].replace('"', "&quot;"),
        excerpt=(post.get("excerpt") or "").replace('"', "&quot;"),
        slug=post["slug"],
        site_url=site_url,
        image_url=image_url,
        published_at=post.get("published_at", ""),
    )
    return HTMLResponse(content=html, status_code=200)


@app.post("/api/analyze-messages")
async def api_analyze_messages(
    authorization: Optional[str] = Header(default=None),
) -> Dict[str, Any]:
    """
    Executa o Summi da Hora sob demanda para o usuário autenticado.
    O endpoint mantém compatibilidade de rota, mas agora dispara análise+resumo.
    """
    settings = _settings()
    user_id = _extract_user_id_from_authorization(settings, authorization)
    job_id = str(uuid.uuid4())

    processing_payload: Dict[str, Any] = {
        "success": True,
        "status": "processing",
        "summary_sent": False,
        "fallback_sent": False,
        "onboarding_sent": False,
        "analyzed_count": 0,
        "job_id": job_id,
        "user_id": user_id,
        "reason": "queued",
        "queued_at": _now_utc_iso(),
    }
    _set_run_now_result(settings=settings, job_id=job_id, payload=processing_payload)

    queue = _redis_queue(settings)
    started_mode = "local_thread"
    if settings.enable_summary_queue and queue is not None:
        try:
            queue.enqueue(
                settings.queue_summary_name,
                {
                    "type": "run_user_summi_now",
                    "user_id": user_id,
                    "job_id": job_id,
                },
            )
            started_mode = "queue"
        except Exception:
            logger.exception("run_now.enqueue_failed user_id=%s job_id=%s", user_id, job_id)
            _spawn_local_run_now_thread(settings=settings, user_id=user_id, job_id=job_id)
    else:
        _spawn_local_run_now_thread(settings=settings, user_id=user_id, job_id=job_id)

    logger.info("run_now.started user_id=%s job_id=%s mode=%s", user_id, job_id, started_mode)

    result = _poll_run_now_result(
        settings=settings,
        job_id=job_id,
        timeout_seconds=settings.run_now_wait_seconds,
    )
    if result and result.get("status") != "processing":
        return result

    logger.info("run_now.processing user_id=%s job_id=%s mode=%s", user_id, job_id, started_mode)
    return {
        **processing_payload,
        "reason": "processing_timeout",
        "processing_via": started_mode,
    }


@app.get("/api/analyze-messages/status/{job_id}")
async def api_analyze_messages_status(
    job_id: str,
    authorization: Optional[str] = Header(default=None),
) -> Dict[str, Any]:
    settings = _settings()
    user_id = _extract_user_id_from_authorization(settings, authorization)
    result = _get_run_now_result(settings=settings, job_id=job_id)
    if not result:
        return {
            "success": True,
            "status": "processing",
            "job_id": job_id,
        }
    if str(result.get("user_id") or "") != user_id:
        raise HTTPException(status_code=404, detail="job_not_found")
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


class OnboardingReminderRequest(BaseModel):
    phone: str
    name: Optional[str] = None


@app.post("/internal/send-onboarding-reminder")
def internal_send_onboarding_reminder(
    req_data: OnboardingReminderRequest,
    x_internal_token: Optional[str] = Header(default=None)
) -> Dict[str, Any]:
    """
    Envia manualmente uma mensagem de lembrete de onboarding (pós-checkout).
    """
    internal_token = os.getenv("INTERNAL_TOKEN")
    if internal_token and x_internal_token != internal_token:
        raise HTTPException(status_code=401, detail="unauthorized")

    settings = _settings()
    evolution = _evolution(settings)
    
    numero = "".join(c for c in req_data.phone if c.isdigit())
    if not numero:
        raise HTTPException(status_code=400, detail="invalid_phone")

    send_checkout_reminder(
        evolution, 
        settings.summi_sender_instance, 
        numero, 
        req_data.name or ""
    )
    
    return {"success": True}


async def _handle_evolution_webhook(
    request: Request,
    *,
    analysis_disabled: bool = False,
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
        "evolution_webhook.received path=%s event=%s instance=%s remote_jid=%s message_id=%s message_type=%s from_me=%s analysis_disabled=%s",
        request.url.path,
        normalized.get("event"),
        normalized.get("instance_name"),
        normalized.get("remote_jid"),
        normalized.get("message_id"),
        normalized.get("message_type"),
        normalized.get("from_me"),
        analysis_disabled,
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

    # Determinar status de trial para customização do rodapé
    try:
        budget_state = get_user_budget_state(settings, supabase, user_id=user_id)
        is_trial = budget_state.plan_kind == "trial"
    except Exception:
        is_trial = True  # Fallback seguro para trial se houver erro

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
                if settings.enable_image_description:
                    image_bytes = _decode_b64_media(media_b64)
                    vision_result = openai.describe_image_base64_response("gpt-4o-mini", image_bytes)
                    _maybe_log_chat_usage(
                        supabase,
                        user_id=user_id,
                        operation="vision",
                        model="gpt-4o-mini",
                        usage=vision_result.usage,
                    )
                    text_for_chat = _derive_message_content(payload, normalized, image_description=vision_result.text)
                    extra["image_described"] = True
                else:
                    text_for_chat = _derive_message_content(payload, normalized)
                    extra["image_ai_disabled"] = True
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
                        # Log custo da transcrição (fire-and-forget)
                        log_transcription_cost(
                            supabase, user_id,
                            model=transcription.model,
                            duration_seconds=duration_seconds,
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
                segundos_para_resumir = _profile_int(
                    profile,
                    "segundos_para_resumir",
                    settings.default_seconds_to_summarize,
                )
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
                    skip_summary, skip_reason = _should_skip_audio_summary_for_budget(
                        settings,
                        supabase,
                        user_id=user_id,
                    )
                    if skip_summary:
                        extra["audio_summary_skipped"] = True
                        extra["audio_summary_skip_reason"] = skip_reason
                        logger.info(
                            "evolution_webhook.audio_summary_skipped instance=%s message_id=%s reason=%s",
                            instance_name,
                            message_id,
                            skip_reason,
                        )
                    else:
                        summarize_started_at = time.perf_counter()
                        final_audio_text, summary_usage = _summarize_transcription(
                            openai,
                            settings.openai_model_summary,
                            transcript,
                            profile,
                            audio_seconds=audio_seconds,
                        )
                        _maybe_log_chat_usage(
                            supabase,
                            user_id=user_id,
                            operation="summary",
                            model=settings.openai_model_summary,
                            usage=summary_usage,
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
                        "audio_summarized": bool(
                            should_summarize and extra.get("audio_summary_skipped") is not True
                        ),
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
                        is_trial=is_trial,
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
                            # Log custo da transcrição por reação (fire-and-forget)
                            log_transcription_cost(
                                supabase, user_id,
                                model=transcription.model,
                                duration_seconds=duration_seconds,
                            )
                            final_text = transcript
                            audio_seconds = _safe_positive_int(duration_seconds)
                            resume_audio = _profile_bool(profile, "resume_audio", False)
                            segundos_para_resumir = _profile_int(
                                profile,
                                "segundos_para_resumir",
                                settings.default_seconds_to_summarize,
                            )
                            should_summarize_reaction = bool(
                                resume_audio and audio_seconds is not None and audio_seconds > segundos_para_resumir
                            )
                            if should_summarize_reaction and transcript.strip():
                                skip_summary, skip_reason = _should_skip_audio_summary_for_budget(
                                    settings,
                                    supabase,
                                    user_id=user_id,
                                )
                                if skip_summary:
                                    extra["reaction_audio_summary_skipped"] = True
                                    extra["reaction_audio_summary_skip_reason"] = skip_reason
                                    logger.info(
                                        "evolution_webhook.reaction_audio_summary_skipped instance=%s target_id=%s reason=%s",
                                        instance_name,
                                        target_id,
                                        skip_reason,
                                    )
                                else:
                                    summarize_started_at = time.perf_counter()
                                    final_text, summary_usage = _summarize_transcription(
                                        openai,
                                        settings.openai_model_summary,
                                        transcript,
                                        profile,
                                        audio_seconds=audio_seconds,
                                    )
                                    _maybe_log_chat_usage(
                                        supabase,
                                        user_id=user_id,
                                        operation="summary",
                                        model=settings.openai_model_summary,
                                        usage=summary_usage,
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
                                    is_trial=is_trial,
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

    logger.info(
        "evolution_webhook.completed chat_id=%s user_id=%s instance=%s remote_jid=%s message_id=%s analysis_disabled=%s total_ms=%s",
        chat_id,
        user_id,
        instance_name,
        remote_jid,
        normalized.get("message_id"),
        analysis_disabled,
        _elapsed_ms(request_started_at),
    )
    return {
        "ok": True,
        "stored": bool(chat_id),
        "chat_id": chat_id,
        "analyzed": False,
        "analysis_disabled": analysis_disabled,
        "message_kind": message_kind,
        "outbound": outbound,
        **extra,
    }


@app.post("/webhooks/evolution")
async def webhook_evolution(request: Request) -> Dict[str, Any]:
    """
    Webhook para receber eventos da Evolution API (apenas ingestao).
    """
    return await _handle_evolution_webhook(request, analysis_disabled=False)


@app.post("/webhooks/evolution-analyze")
async def webhook_evolution_analyze(request: Request) -> Dict[str, Any]:
    """
    Endpoint legado mantido por compatibilidade.
    Processa apenas ingestão/transcrição, sem análise por mensagem.
    """
    logger.info("webhook.analysis_disabled path=/webhooks/evolution-analyze")
    return await _handle_evolution_webhook(request, analysis_disabled=True)


@app.get("/social/blog/{slug}", response_class=HTMLResponse)
async def social_blog_preview(slug: str, request: Request):
    """
    Endpoint usado como proxy reverso pelo Nginx para injetar Meta Tags (OGP)
    quando crawlers de redes sociais (WhatsApp, Facebook, Twitter) leem o link do blog.
    """
    settings = _settings()
    supabase = _supabase(settings)
    
    try:
        rows = supabase.select(
            "blog_posts", 
            select="title, excerpt, cover_image_url",
            filters=[to_postgrest_filter_eq("slug", slug)],
            limit=1
        )
    except Exception as e:
        logger.error("Failed to fetch blog post %s: %s", slug, e)
        rows = []

    site_name = "Summi - Assistente de WhatsApp com IA"
    if rows:
        post = rows[0]
        title = post.get("title") or site_name
        description = post.get("excerpt") or ""
        image = post.get("cover_image_url") or f"{settings.site_url}/lovable-uploads/8d37281c-dfb2-4e98-93c9-888cccd6a706.png"
    else:
        title = site_name
        description = "Transcreva áudios, receba resumos das conversas mais importantes e nunca mais perca uma mensagem relevante no WhatsApp."
        image = f"{settings.site_url}/lovable-uploads/8d37281c-dfb2-4e98-93c9-888cccd6a706.png"
    
    url = f"{settings.site_url}/blog/{slug}"
    
    html = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>{title}</title>
    <meta property="og:title" content="{title}" />
    <meta property="og:description" content="{description}" />
    <meta property="og:type" content="article" />
    <meta property="og:url" content="{url}" />
    <meta property="og:image" content="{image}" />
    <meta property="og:site_name" content="Summi" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="{title}" />
    <meta name="twitter:description" content="{description}" />
    <meta name="twitter:image" content="{image}" />
    <meta http-equiv="refresh" content="0; url={url}" />
</head>
<body>
    <script>window.location.href = "{url}";</script>
</body>
</html>
"""
    return html

