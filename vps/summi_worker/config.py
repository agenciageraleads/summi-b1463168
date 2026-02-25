from __future__ import annotations

import os
from dataclasses import dataclass


def _must(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing required env var: {name}")
    return value


def _bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in ("1", "true", "yes", "y", "on")


def _int(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None or value.strip() == "":
        return default
    return int(value)


@dataclass(frozen=True)
class Settings:
    supabase_url: str
    supabase_service_role_key: str
    supabase_anon_key: str | None

    openai_api_key: str
    openai_model_analysis: str
    openai_model_summary: str
    openai_tts_model: str
    openai_tts_voice: str

    evolution_api_url: str
    evolution_api_key: str
    summi_sender_instance: str

    business_hours_start: int
    business_hours_end: int
    ignore_remote_jid: str

    enable_hourly_job: bool
    low_priority_cleanup_days: int
    redis_url: str | None
    webhook_dedupe_ttl_seconds: int


def load_settings() -> Settings:
    return Settings(
        supabase_url=_must("SUPABASE_URL").rstrip("/"),
        supabase_service_role_key=_must("SUPABASE_SERVICE_ROLE_KEY"),
        supabase_anon_key=os.getenv("SUPABASE_ANON_KEY"),
        openai_api_key=_must("OPENAI_API_KEY"),
        openai_model_analysis=os.getenv("OPENAI_MODEL_ANALYSIS", "gpt-4o-mini"),
        openai_model_summary=os.getenv("OPENAI_MODEL_SUMMARY", "gpt-4o-mini"),
        openai_tts_model=os.getenv("OPENAI_TTS_MODEL", "gpt-4o-mini-tts"),
        openai_tts_voice=os.getenv("OPENAI_TTS_VOICE", "alloy"),
        evolution_api_url=_must("EVOLUTION_API_URL").rstrip("/"),
        evolution_api_key=_must("EVOLUTION_API_KEY"),
        summi_sender_instance=os.getenv("SUMMI_SENDER_INSTANCE", "Summi"),
        business_hours_start=_int("BUSINESS_HOURS_START", 8),
        business_hours_end=_int("BUSINESS_HOURS_END", 18),
        ignore_remote_jid=os.getenv("IGNORE_REMOTE_JID", "556293984600"),
        enable_hourly_job=_bool("ENABLE_HOURLY_JOB", True),
        low_priority_cleanup_days=_int("LOW_PRIORITY_CLEANUP_DAYS", 0),
        redis_url=os.getenv("REDIS_URL"),
        webhook_dedupe_ttl_seconds=_int("WEBHOOK_DEDUPE_TTL_SECONDS", 600),
    )
