from __future__ import annotations

import datetime as dt
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from typing import Any

from .config import Settings
from .supabase_rest import SupabaseRest, to_postgrest_filter_eq, to_postgrest_filter_gte

_BRL_QUANTIZE = Decimal("0.01")


@dataclass(frozen=True)
class UserBudgetState:
    plan_kind: str
    current_cost_usd: Decimal
    current_cost_brl: Decimal
    soft_cap_brl: Decimal
    hard_cap_brl: Decimal

    @property
    def soft_cap_reached(self) -> bool:
        return self.current_cost_brl >= self.soft_cap_brl

    @property
    def hard_cap_reached(self) -> bool:
        return self.current_cost_brl >= self.hard_cap_brl


def _month_start_date(now_utc: dt.datetime) -> str:
    return now_utc.date().replace(day=1).isoformat()


def _is_trialing(subscriber: dict[str, Any] | None, now_utc: dt.datetime) -> bool:
    if not subscriber:
        return True

    status = str(subscriber.get("subscription_status") or "").strip().lower()
    if status == "trialing":
        return True

    trial_ends_at = str(subscriber.get("trial_ends_at") or "").strip()
    if not trial_ends_at:
        return False

    try:
        trial_end = dt.datetime.fromisoformat(trial_ends_at.replace("Z", "+00:00"))
    except Exception:
        return False

    if trial_end.tzinfo is None:
        trial_end = trial_end.replace(tzinfo=dt.timezone.utc)
    return trial_end >= now_utc


def _load_current_cost_usd(
    supabase: SupabaseRest,
    *,
    user_id: str,
    since_date: str,
) -> Decimal:
    rows = supabase.select(
        "user_costs",
        select="cost_openai_usd,date",
        filters=[
            to_postgrest_filter_eq("user_id", user_id),
            to_postgrest_filter_gte("date", since_date),
        ],
        order="date.desc",
        limit=100,
    )
    total = Decimal("0")
    for row in rows:
        total += Decimal(str(row.get("cost_openai_usd") or 0))
    return total


def get_user_budget_state(
    settings: Settings,
    supabase: SupabaseRest,
    *,
    user_id: str,
    now_utc: dt.datetime | None = None,
) -> UserBudgetState:
    now_utc = now_utc or dt.datetime.now(dt.timezone.utc)
    since_date = _month_start_date(now_utc)
    subscriber_rows = supabase.select(
        "subscribers",
        select="subscription_status,trial_ends_at,subscribed",
        filters=[to_postgrest_filter_eq("user_id", user_id)],
        order="updated_at.desc",
        limit=1,
    )
    subscriber = subscriber_rows[0] if subscriber_rows else None
    is_trial = _is_trialing(subscriber, now_utc)
    current_cost_usd = _load_current_cost_usd(supabase, user_id=user_id, since_date=since_date)
    current_cost_brl = (current_cost_usd * Decimal(str(settings.usd_brl_exchange_rate))).quantize(
        _BRL_QUANTIZE,
        rounding=ROUND_HALF_UP,
    )
    soft_cap = Decimal(
        str(settings.trial_ai_soft_cap_brl if is_trial else settings.paid_ai_soft_cap_brl)
    )
    hard_cap = Decimal(
        str(settings.trial_ai_hard_cap_brl if is_trial else settings.paid_ai_hard_cap_brl)
    )
    return UserBudgetState(
        plan_kind="trial" if is_trial else "paid",
        current_cost_usd=current_cost_usd,
        current_cost_brl=current_cost_brl,
        soft_cap_brl=soft_cap,
        hard_cap_brl=hard_cap,
    )
