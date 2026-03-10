from __future__ import annotations

import datetime as dt
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from summi_worker.budget_guard import get_user_budget_state


class _SupabaseFake:
    def __init__(self, *, subscriber: dict | None, user_cost_rows: list[dict]) -> None:
        self.subscriber = subscriber
        self.user_cost_rows = user_cost_rows

    def select(self, table, select="*", filters=None, order=None, limit=None):
        if table == "subscribers":
            return [self.subscriber] if self.subscriber else []
        if table == "user_costs":
            return self.user_cost_rows
        raise AssertionError(f"Unexpected table {table}")


class BudgetGuardTest(unittest.TestCase):
    def setUp(self) -> None:
        self.settings = SimpleNamespace(
            usd_brl_exchange_rate=5.8,
            paid_ai_soft_cap_brl=4.0,
            paid_ai_hard_cap_brl=5.0,
            trial_ai_soft_cap_brl=1.0,
            trial_ai_hard_cap_brl=1.5,
        )

    def test_trial_users_use_trial_caps(self) -> None:
        supabase = _SupabaseFake(
            subscriber={
                "subscription_status": "trialing",
                "trial_ends_at": "2099-03-10T00:00:00+00:00",
                "subscribed": True,
            },
            user_cost_rows=[{"cost_openai_usd": 0.20, "date": "2099-03-01"}],
        )

        state = get_user_budget_state(
            self.settings,
            supabase,
            user_id="user-1",
            now_utc=dt.datetime(2099, 3, 5, tzinfo=dt.timezone.utc),
        )

        self.assertEqual(state.plan_kind, "trial")
        self.assertEqual(float(state.current_cost_brl), 1.16)
        self.assertTrue(state.soft_cap_reached)
        self.assertFalse(state.hard_cap_reached)

    def test_paid_users_use_paid_caps(self) -> None:
        supabase = _SupabaseFake(
            subscriber={
                "subscription_status": "active",
                "trial_ends_at": None,
                "subscribed": True,
            },
            user_cost_rows=[{"cost_openai_usd": 0.50, "date": "2099-03-01"}],
        )

        state = get_user_budget_state(
            self.settings,
            supabase,
            user_id="user-2",
            now_utc=dt.datetime(2099, 3, 5, tzinfo=dt.timezone.utc),
        )

        self.assertEqual(state.plan_kind, "paid")
        self.assertFalse(state.soft_cap_reached)
        self.assertFalse(state.hard_cap_reached)


if __name__ == "__main__":
    unittest.main()
