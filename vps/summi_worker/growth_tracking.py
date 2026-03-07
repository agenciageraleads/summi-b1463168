from __future__ import annotations

import datetime as dt
from decimal import Decimal
from typing import Optional

from .budget_guard import UserBudgetState
from .supabase_rest import SupabaseRest


def log_growth_event(
    supabase: SupabaseRest,
    *,
    event_type: str,
    user_id: str,
    dedupe_key: Optional[str] = None,
    metadata: Optional[dict[str, object]] = None,
) -> None:
    row = {
        "event_type": event_type,
        "user_id": user_id,
        "dedupe_key": dedupe_key,
        "metadata": metadata or {},
        "occurred_at": dt.datetime.now(dt.timezone.utc).isoformat(),
    }
    supabase.upsert("growth_events", [row], on_conflict="dedupe_key")


def record_trial_budget_events(
    supabase: SupabaseRest,
    *,
    user_id: str,
    state: UserBudgetState,
    now_utc: Optional[dt.datetime] = None,
) -> None:
    if state.plan_kind != "trial":
        return

    now = now_utc or dt.datetime.now(dt.timezone.utc)
    month_key = now.strftime("%Y-%m")
    base_metadata = {
        "current_cost_brl": float(Decimal(state.current_cost_brl)),
        "soft_cap_brl": float(Decimal(state.soft_cap_brl)),
        "hard_cap_brl": float(Decimal(state.hard_cap_brl)),
        "month": month_key,
    }

    if state.soft_cap_reached:
        log_growth_event(
            supabase,
            event_type="trial_soft_cap_hit",
            user_id=user_id,
            dedupe_key=f"trial_soft_cap_hit:{user_id}:{month_key}",
            metadata=base_metadata,
        )

    if state.hard_cap_reached:
        log_growth_event(
            supabase,
            event_type="trial_hard_cap_hit",
            user_id=user_id,
            dedupe_key=f"trial_hard_cap_hit:{user_id}:{month_key}",
            metadata=base_metadata,
        )
