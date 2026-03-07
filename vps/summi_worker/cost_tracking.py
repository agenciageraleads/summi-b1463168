"""
cost_tracking.py — Rastreamento de custos OpenAI por usuário.

Calcula e registra custos em tempo real após cada chamada à OpenAI.
Logging é assíncrono (fire-and-forget): erros de logging nunca bloqueiam
o fluxo principal de transcrição/análise.

Pricing sources (2025):
  - Whisper-1:              $0.006/min
  - gpt-4o-transcribe:      $0.006/min (input)
  - gpt-4o-mini (input):    $0.00015/1K tokens
  - gpt-4o-mini (output):   $0.0006/1K tokens
  - gpt-4o-mini-tts:        $0.000015/char
"""
from __future__ import annotations

import datetime as dt
import logging
from decimal import ROUND_HALF_UP, Decimal
from typing import Any, Dict, Optional

logger = logging.getLogger("summi_worker.cost_tracking")

# ---------------------------------------------------------------------------
# Tabela de preços OpenAI (USD)
# ---------------------------------------------------------------------------

# Transcrição: por minuto de áudio
WHISPER_1_COST_PER_MINUTE = Decimal("0.006")
GPT4O_TRANSCRIBE_COST_PER_MINUTE = Decimal("0.006")  # mesmo preço que whisper

# Chat/Análise: por 1K tokens
GPT4O_MINI_INPUT_PER_1K = Decimal("0.00015")
GPT4O_MINI_OUTPUT_PER_1K = Decimal("0.0006")

# TTS: por caractere
GPT4O_MINI_TTS_COST_PER_CHAR = Decimal("0.000015")

_TRANSCRIPTION_COST_MAP: Dict[str, Decimal] = {
    "whisper-1": WHISPER_1_COST_PER_MINUTE,
    "gpt-4o-transcribe": GPT4O_TRANSCRIBE_COST_PER_MINUTE,
    "gpt-4o-mini-transcribe": GPT4O_TRANSCRIBE_COST_PER_MINUTE,
}

_QUANTIZE = Decimal("0.00000001")  # 8 casas decimais


# ---------------------------------------------------------------------------
# Funções de cálculo
# ---------------------------------------------------------------------------

def calculate_transcription_cost(
    duration_seconds: float,
    model: str = "whisper-1",
) -> Decimal:
    """Custo de transcrição Whisper (por minuto, arredondado para cima para min=1)."""
    rate = _TRANSCRIPTION_COST_MAP.get(model, WHISPER_1_COST_PER_MINUTE)
    minutes = Decimal(str(duration_seconds)) / Decimal("60")
    # OpenAI cobra no mínimo 1 segundo (arredonda para cima no billing real)
    if minutes < Decimal("0"):
        minutes = Decimal("0")
    return (minutes * rate).quantize(_QUANTIZE, rounding=ROUND_HALF_UP)


def calculate_chat_cost(
    input_tokens: int,
    output_tokens: int,
    model: str = "gpt-4o-mini",
) -> Decimal:
    """Custo de chamada chat/completions (input + output tokens)."""
    input_cost = Decimal(input_tokens) * GPT4O_MINI_INPUT_PER_1K / Decimal("1000")
    output_cost = Decimal(output_tokens) * GPT4O_MINI_OUTPUT_PER_1K / Decimal("1000")
    return (input_cost + output_cost).quantize(_QUANTIZE, rounding=ROUND_HALF_UP)


def calculate_tts_cost(char_count: int) -> Decimal:
    """Custo TTS gpt-4o-mini-tts (por caractere)."""
    return (Decimal(char_count) * GPT4O_MINI_TTS_COST_PER_CHAR).quantize(
        _QUANTIZE, rounding=ROUND_HALF_UP
    )


# ---------------------------------------------------------------------------
# Logging no Supabase
# ---------------------------------------------------------------------------

def _safe_upsert_daily_cost(
    supabase: Any,
    user_id: str,
    date_str: str,
    operation: str,
    cost_usd: Decimal,
    call_count: int,
    tokens_total: int,
    audio_minutes: Decimal,
) -> None:
    """
    Upsert no user_costs agregado por dia.
    Usa RPC do Supabase para incremento atômico.
    """
    col_map = {
        "transcribe": "transcription_cost_usd",
        "analyze": "analysis_cost_usd",
        "vision": "analysis_cost_usd",
        "summary": "summary_cost_usd",
        "tts": "tts_cost_usd",
    }
    op_col = col_map.get(operation, "analysis_cost_usd")
    cost_float = float(cost_usd)

    # Tenta chamar a RPC de incremento (se não existir, faz insert/update manual)
    try:
        supabase.rpc(
            "increment_user_cost",
            {
                "p_user_id": user_id,
                "p_date": date_str,
                "p_operation_col": op_col,
                "p_cost": cost_float,
                "p_calls": call_count,
                "p_tokens": tokens_total,
                "p_audio_minutes": float(audio_minutes),
            },
        )
    except Exception:
        # RPC pode não existir — fallback: insert ou update manual
        try:
            existing = supabase.select(
                "user_costs",
                select="id,transcription_cost_usd,analysis_cost_usd,summary_cost_usd,tts_cost_usd,cost_openai_usd,call_count,tokens_used,audio_minutes",
                filters=[
                    ("user_id", f"eq.{user_id}"),
                    ("date", f"eq.{date_str}"),
                ],
                limit=1,
            )
            if existing:
                row = existing[0]
                new_op = float(Decimal(str(row.get(op_col) or 0)) + cost_usd)
                new_total = float(Decimal(str(row.get("cost_openai_usd") or 0)) + cost_usd)
                supabase.patch(
                    "user_costs",
                    data={
                        op_col: new_op,
                        "cost_openai_usd": new_total,
                        "cost_total_usd": new_total,
                        "call_count": int(row.get("call_count") or 0) + call_count,
                        "tokens_used": int(row.get("tokens_used") or 0) + tokens_total,
                        "audio_minutes": float(Decimal(str(row.get("audio_minutes") or 0)) + audio_minutes),
                        "updated_at": dt.datetime.now(dt.timezone.utc).isoformat(),
                    },
                    filters=[("id", f"eq.{row['id']}")],
                )
            else:
                supabase.insert(
                    "user_costs",
                    [{
                        "user_id": user_id,
                        "date": date_str,
                        op_col: cost_float,
                        "cost_openai_usd": cost_float,
                        "cost_total_usd": cost_float,
                        "call_count": call_count,
                        "tokens_used": tokens_total,
                        "audio_minutes": float(audio_minutes),
                    }],
                )
        except Exception as exc:
            logger.debug("cost_tracking.upsert_daily_failed user=%s error=%s", user_id, exc)


def log_transcription_cost(
    supabase: Any,
    user_id: str,
    *,
    model: str,
    duration_seconds: Optional[float],
) -> None:
    """
    Registra custo de transcrição de áudio.
    Fire-and-forget: nunca levanta exceção.
    """
    if not duration_seconds or duration_seconds <= 0:
        return
    try:
        cost = calculate_transcription_cost(duration_seconds, model=model)
        if cost <= Decimal("0"):
            return

        date_str = dt.date.today().isoformat()
        audio_minutes = Decimal(str(duration_seconds)) / Decimal("60")

        # Log detalhado
        try:
            supabase.insert(
                "cost_logs",
                [{
                    "user_id": user_id,
                    "operation": "transcribe",
                    "model": model,
                    "cost_usd": float(cost),
                    "audio_seconds": duration_seconds,
                }],
            )
        except Exception as exc:
            logger.debug("cost_tracking.log_insert_failed user=%s error=%s", user_id, exc)

        _safe_upsert_daily_cost(
            supabase,
            user_id=user_id,
            date_str=date_str,
            operation="transcribe",
            cost_usd=cost,
            call_count=1,
            tokens_total=0,
            audio_minutes=audio_minutes,
        )
        logger.debug(
            "cost_tracking.transcription user=%s model=%s seconds=%.1f cost_usd=%.8f",
            user_id, model, duration_seconds, float(cost),
        )
    except Exception as exc:
        logger.debug("cost_tracking.log_transcription_failed user=%s error=%s", user_id, exc)


def log_chat_cost(
    supabase: Any,
    user_id: str,
    *,
    operation: str,
    model: str,
    input_tokens: int = 0,
    output_tokens: int = 0,
) -> None:
    """
    Registra custo de chamada chat (analyze, summary).
    Fire-and-forget: nunca levanta exceção.
    """
    if not input_tokens and not output_tokens:
        return
    try:
        cost = calculate_chat_cost(input_tokens, output_tokens, model=model)
        if cost <= Decimal("0"):
            return

        date_str = dt.date.today().isoformat()
        tokens_total = input_tokens + output_tokens

        try:
            supabase.insert(
                "cost_logs",
                [{
                    "user_id": user_id,
                    "operation": operation,
                    "model": model,
                    "cost_usd": float(cost),
                    "tokens_input": input_tokens,
                    "tokens_output": output_tokens,
                    "tokens_total": tokens_total,
                }],
            )
        except Exception as exc:
            logger.debug("cost_tracking.log_insert_failed user=%s error=%s", user_id, exc)

        _safe_upsert_daily_cost(
            supabase,
            user_id=user_id,
            date_str=date_str,
            operation=operation,
            cost_usd=cost,
            call_count=1,
            tokens_total=tokens_total,
            audio_minutes=Decimal("0"),
        )
        logger.debug(
            "cost_tracking.chat user=%s op=%s model=%s tokens=%d cost_usd=%.8f",
            user_id, operation, model, tokens_total, float(cost),
        )
    except Exception as exc:
        logger.debug("cost_tracking.log_chat_failed user=%s error=%s", user_id, exc)


def log_tts_cost(
    supabase: Any,
    user_id: str,
    *,
    model: str,
    char_count: int,
) -> None:
    if char_count <= 0:
        return
    try:
        cost = calculate_tts_cost(char_count)
        if cost <= Decimal("0"):
            return

        date_str = dt.date.today().isoformat()
        try:
            supabase.insert(
                "cost_logs",
                [{
                    "user_id": user_id,
                    "operation": "tts",
                    "model": model,
                    "cost_usd": float(cost),
                    "char_count": char_count,
                }],
            )
        except Exception as exc:
            logger.debug("cost_tracking.log_insert_failed user=%s error=%s", user_id, exc)

        _safe_upsert_daily_cost(
            supabase,
            user_id=user_id,
            date_str=date_str,
            operation="tts",
            cost_usd=cost,
            call_count=1,
            tokens_total=0,
            audio_minutes=Decimal("0"),
        )
        logger.debug(
            "cost_tracking.tts user=%s model=%s chars=%d cost_usd=%.8f",
            user_id,
            model,
            char_count,
            float(cost),
        )
    except Exception as exc:
        logger.debug("cost_tracking.log_tts_failed user=%s error=%s", user_id, exc)
