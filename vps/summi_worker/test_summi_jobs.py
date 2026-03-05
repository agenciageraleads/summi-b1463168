import datetime
import sys
import types
import unittest
from types import SimpleNamespace
from unittest.mock import patch

if "requests" not in sys.modules:
    requests_stub = types.ModuleType("requests")
    requests_stub.post = None
    sys.modules["requests"] = requests_stub

if "mutagen" not in sys.modules:
    mutagen_stub = types.ModuleType("mutagen")
    mutagen_stub.File = lambda *args, **kwargs: None
    sys.modules["mutagen"] = mutagen_stub

try:
    from .summi_jobs import (
        _build_summary_items,
        _chat_has_new_event_since_analysis,
        _summary_chat_filters,
        _summary_is_due,
        _unique_active_user_ids,
        run_hourly_job,
    )
except ImportError:
    from summi_jobs import (
        _build_summary_items,
        _chat_has_new_event_since_analysis,
        _summary_chat_filters,
        _summary_is_due,
        _unique_active_user_ids,
        run_hourly_job,
    )


class SummiJobsTest(unittest.TestCase):
    def setUp(self) -> None:
        self.settings = SimpleNamespace(ignore_remote_jid="556293984600")

    def test_summary_chat_filters_use_last_summi_timestamp_when_available(self) -> None:
        filters = _summary_chat_filters(
            self.settings,
            user_id="user-1",
            ultimo_summi="2026-03-01T22:16:45.706361+00:00",
        )

        self.assertIn(("id_usuario", "eq.user-1"), filters)
        self.assertIn(("remote_jid", "neq.556293984600"), filters)
        self.assertIn(("contexto", "not.is.null"), filters)
        self.assertIn(("analisado_em", "gt.2026-03-01T22:16:45.706361+00:00"), filters)

    def test_summary_chat_filters_fall_back_to_any_analyzed_chat_on_first_run(self) -> None:
        filters = _summary_chat_filters(self.settings, user_id="user-1", ultimo_summi=None)
        self.assertIn(("analisado_em", "not.is.null"), filters)

    def test_build_summary_items_only_keeps_high_priority_chats(self) -> None:
        items = _build_summary_items(
            [
                {
                    "id": "a",
                    "prioridade": "3",
                    "nome": "Pablo",
                    "remote_jid": "556291292807",
                    "contexto": "Urgente",
                    "criado_em": "2026-03-01T16:14:47.968112+00:00",
                },
                {
                    "id": "b",
                    "prioridade": "1",
                    "nome": "Arthur",
                    "remote_jid": "556281441075",
                    "contexto": "Pode esperar",
                    "criado_em": "2026-03-01T16:30:58.892092+00:00",
                },
            ]
        )

        self.assertEqual(len(items), 1)
        self.assertEqual(items[0].chat_id, "a")
        self.assertEqual(items[0].nome, "Pablo")
        self.assertEqual(items[0].prioridade, "3")

    def test_unique_active_user_ids_ignores_duplicate_or_empty_users(self) -> None:
        user_ids = _unique_active_user_ids(
            [
                {"user_id": "user-1"},
                {"user_id": "user-1"},
                {"user_id": "user-2"},
                {"user_id": None},
                {},
            ]
        )

        self.assertEqual(user_ids, ["user-1", "user-2"])

    def test_summary_is_due_blocks_reentry_inside_frequency_window(self) -> None:
        profile = {
            "summi_frequencia": "1h",
            "ultimo_summi_em": "2026-03-02T11:18:02.308829+00:00",
        }

        self.assertFalse(
            _summary_is_due(
                profile,
                now_utc=datetime.datetime(2026, 3, 2, 11, 40, tzinfo=datetime.timezone.utc),
            )
        )

    def test_summary_is_due_allows_send_after_frequency_window(self) -> None:
        profile = {
            "summi_frequencia": "3h",
            "ultimo_summi_em": "2026-03-02T08:00:00+00:00",
        }

        self.assertTrue(
            _summary_is_due(
                profile,
                now_utc=datetime.datetime(2026, 3, 2, 11, 5, tzinfo=datetime.timezone.utc),
            )
        )

    def test_chat_has_new_event_since_analysis_uses_ultimo_evento_em(self) -> None:
        self.assertTrue(
            _chat_has_new_event_since_analysis(
                {
                    "analisado_em": "2026-03-05T10:00:00+00:00",
                    "ultimo_evento_em": "2026-03-05T10:01:00+00:00",
                    "modificado_em": "2026-03-05T10:10:00+00:00",
                }
            )
        )
        self.assertFalse(
            _chat_has_new_event_since_analysis(
                {
                    "analisado_em": "2026-03-05T10:01:00+00:00",
                    "ultimo_evento_em": "2026-03-05T10:00:00+00:00",
                    "modificado_em": "2026-03-05T10:30:00+00:00",
                }
            )
        )

    def test_run_hourly_job_skips_send_when_no_priority_items(self) -> None:
        settings = SimpleNamespace(
            ignore_remote_jid="556293984600",
            business_hours_start=8,
            business_hours_end=18,
            summi_sender_instance="Summi",
        )
        profile = {
            "id": "user-1",
            "numero": "5562999999999",
            "summi_frequencia": "1h",
            "ultimo_summi_em": "2026-03-05T09:00:00+00:00",
            "onboarding_completed": True,
            "Summi em Audio?": False,
        }
        summary_chats = [
            {
                "id": "chat-1",
                "nome": "Contato",
                "remote_jid": "5562911111111",
                "prioridade": "1",
                "contexto": "Pode esperar",
                "criado_em": "2026-03-05T09:10:00+00:00",
                "modificado_em": "2026-03-05T09:10:00+00:00",
                "analisado_em": "2026-03-05T09:10:00+00:00",
            }
        ]

        class _SupabaseFake:
            def __init__(self) -> None:
                self.patch_calls = []

            def select(self, table, select="*", filters=None, order=None, limit=None):
                if table == "subscribers":
                    return [{"user_id": "user-1", "subscription_end": "2099-01-01T00:00:00+00:00", "subscribed": True}]
                if table == "profiles":
                    return [profile]
                if table == "chats":
                    return summary_chats
                return []

            def patch(self, table, data, filters=None):
                self.patch_calls.append((table, data, filters))

            def delete(self, table, filters=None):
                return None

            def rpc(self, *args, **kwargs):
                return None

        class _EvolutionFake:
            def __init__(self) -> None:
                self.sent_text = 0

            def send_text(self, *args, **kwargs):
                self.sent_text += 1

        supabase = _SupabaseFake()
        evolution = _EvolutionFake()

        with patch.dict(
            run_hourly_job.__globals__,
            {"analyze_user_chats": lambda *args, **kwargs: {"success": True, "analyzed_count": 0}},
        ):
            result = run_hourly_job(settings, supabase, openai=object(), evolution=evolution)

        self.assertEqual(result["sent"], 0)
        self.assertEqual(result["skipped_no_priority_items"], 1)
        self.assertEqual(evolution.sent_text, 0)
        self.assertFalse(
            any(
                table == "profiles" and "ultimo_summi_em" in data
                for table, data, _filters in supabase.patch_calls
            )
        )


if __name__ == "__main__":
    unittest.main()
