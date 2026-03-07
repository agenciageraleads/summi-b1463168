from __future__ import annotations

import os
from dataclasses import dataclass

WEBHOOK_DEDUPE_TTL_SECONDS_FLOOR = 24 * 60 * 60


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


def _float(name: str, default: float) -> float:
    value = os.getenv(name)
    if value is None or value.strip() == "":
        return default
    return float(value)


def _webhook_dedupe_ttl_seconds() -> int:
    configured = _int("WEBHOOK_DEDUPE_TTL_SECONDS", WEBHOOK_DEDUPE_TTL_SECONDS_FLOOR)
    # A Evolution pode reemitir mensagens antigas durante sync/reconnect.
    # Mantemos o dedupe por pelo menos 24h para evitar reprocessar o mesmo message_id.
    return max(configured, WEBHOOK_DEDUPE_TTL_SECONDS_FLOOR)


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
    openai_transcription_model: str
    openai_transcription_fallback_model: str
    openai_transcription_language: str
    openai_transcription_prompt_extra: str | None
    openai_transcription_enable_fallback: bool
    openai_transcription_confidence_threshold: float
    openai_transcription_critical_confidence_threshold: float
    openai_transcription_chunking_min_seconds: int

    evolution_api_url: str
    evolution_api_key: str
    summi_sender_instance: str

    business_hours_start: int
    business_hours_end: int
    ignore_remote_jid: str

    enable_hourly_job: bool
    enable_daily_job: bool
    daily_summary_hour_utc: int
    daily_summary_timezone: str
    low_priority_cleanup_days: int
    redis_url: str | None
    require_redis: bool
    webhook_dedupe_ttl_seconds: int
    enable_analysis_queue: bool
    enable_summary_queue: bool
    queue_analysis_name: str
    queue_summary_name: str
    run_now_wait_seconds: int
    run_now_result_ttl_seconds: int
    enable_image_description: bool
    enable_summi_audio: bool
    default_seconds_to_summarize: int
    paid_ai_soft_cap_brl: float
    paid_ai_hard_cap_brl: float
    trial_ai_soft_cap_brl: float
    trial_ai_hard_cap_brl: float
    usd_brl_exchange_rate: float

    # Blog auto-posting
    blog_auto_post_enabled: bool
    blog_post_hour: int
    unsplash_access_key: str
    site_url: str


def load_settings() -> Settings:
    settings = Settings(
        supabase_url=_must("SUPABASE_URL").rstrip("/"),
        supabase_service_role_key=_must("SUPABASE_SERVICE_ROLE_KEY"),
        supabase_anon_key=os.getenv("SUPABASE_ANON_KEY"),
        openai_api_key=_must("OPENAI_API_KEY"),
        openai_model_analysis=os.getenv("OPENAI_MODEL_ANALYSIS", "gpt-4o-mini"),
        openai_model_summary=os.getenv("OPENAI_MODEL_SUMMARY", "gpt-4o-mini"),
        openai_tts_model=os.getenv("OPENAI_TTS_MODEL", "gpt-4o-mini-tts"),
        openai_tts_voice=os.getenv("OPENAI_TTS_VOICE", "alloy"),
        openai_transcription_model=os.getenv("OPENAI_TRANSCRIPTION_MODEL", "whisper-1"),  # era gpt-4o-mini-transcribe (40% mais caro)
        openai_transcription_fallback_model=os.getenv("OPENAI_TRANSCRIPTION_FALLBACK_MODEL", "gpt-4o-transcribe"),
        openai_transcription_language=os.getenv("OPENAI_TRANSCRIPTION_LANGUAGE", "pt"),
        openai_transcription_prompt_extra=os.getenv("OPENAI_TRANSCRIPTION_PROMPT_EXTRA"),
        openai_transcription_enable_fallback=_bool("OPENAI_TRANSCRIPTION_ENABLE_FALLBACK", True),
        openai_transcription_confidence_threshold=_float("OPENAI_TRANSCRIPTION_CONFIDENCE_THRESHOLD", 0.65),  # era 0.55 — threshold mais agressivo para fallback
        openai_transcription_critical_confidence_threshold=_float(
            "OPENAI_TRANSCRIPTION_CRITICAL_CONFIDENCE_THRESHOLD",
            0.80,
        ),
        openai_transcription_chunking_min_seconds=_int("OPENAI_TRANSCRIPTION_CHUNKING_MIN_SECONDS", 20),
        evolution_api_url=_must("EVOLUTION_API_URL").rstrip("/"),
        evolution_api_key=_must("EVOLUTION_API_KEY"),
        summi_sender_instance=os.getenv("SUMMI_SENDER_INSTANCE", "Summi"),
        business_hours_start=_int("BUSINESS_HOURS_START", 8),
        business_hours_end=_int("BUSINESS_HOURS_END", 18),
        ignore_remote_jid=os.getenv("IGNORE_REMOTE_JID", "556293984600"),
        enable_hourly_job=_bool("ENABLE_HOURLY_JOB", True),
        enable_daily_job=_bool("ENABLE_DAILY_JOB", False),
        daily_summary_hour_utc=_int("DAILY_SUMMARY_HOUR_UTC", 19),
        daily_summary_timezone=os.getenv("DAILY_SUMMARY_TIMEZONE", "UTC"),
        low_priority_cleanup_days=_int("LOW_PRIORITY_CLEANUP_DAYS", 0),
        redis_url=os.getenv("REDIS_URL"),
        require_redis=_bool("REQUIRE_REDIS", False),
        webhook_dedupe_ttl_seconds=_webhook_dedupe_ttl_seconds(),
        enable_analysis_queue=_bool("ENABLE_ANALYSIS_QUEUE", False),
        enable_summary_queue=_bool("ENABLE_SUMMARY_QUEUE", False),
        queue_analysis_name=os.getenv("QUEUE_ANALYSIS_NAME", "summi:queue:analysis"),
        queue_summary_name=os.getenv("QUEUE_SUMMARY_NAME", "summi:queue:summary"),
        run_now_wait_seconds=_int("RUN_NOW_WAIT_SECONDS", 12),
        run_now_result_ttl_seconds=_int("RUN_NOW_RESULT_TTL_SECONDS", 600),
        enable_image_description=_bool("ENABLE_IMAGE_DESCRIPTION", False),
        enable_summi_audio=_bool("ENABLE_SUMMI_AUDIO", False),
        default_seconds_to_summarize=_int("DEFAULT_SECONDS_TO_SUMMARIZE", 90),
        paid_ai_soft_cap_brl=_float("PAID_AI_SOFT_CAP_BRL", 4.0),
        paid_ai_hard_cap_brl=_float("PAID_AI_HARD_CAP_BRL", 5.0),
        trial_ai_soft_cap_brl=_float("TRIAL_AI_SOFT_CAP_BRL", 1.0),
        trial_ai_hard_cap_brl=_float("TRIAL_AI_HARD_CAP_BRL", 1.5),
        usd_brl_exchange_rate=_float("USD_BRL_EXCHANGE_RATE", 5.8),
        blog_auto_post_enabled=_bool("BLOG_AUTO_POST_ENABLED", False),
        blog_post_hour=_int("BLOG_POST_HOUR", 9),
        unsplash_access_key=os.getenv("UNSPLASH_ACCESS_KEY", ""),
        site_url=os.getenv("SITE_URL", "https://summi.gera-leads.com"),
    )

    if settings.require_redis and not settings.redis_url:
        raise RuntimeError("REDIS_URL is required when REQUIRE_REDIS=true")

    if (settings.enable_analysis_queue or settings.enable_summary_queue) and not settings.redis_url:
        raise RuntimeError("REDIS_URL is required when queue support is enabled")

    return settings
