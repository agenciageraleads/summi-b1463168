import datetime
import sys
import types
import unittest
from types import SimpleNamespace

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
        _summary_chat_filters,
        _summary_is_due,
        _unique_active_user_ids,
    )
except ImportError:
    from summi_jobs import (
        _build_summary_items,
        _summary_chat_filters,
        _summary_is_due,
        _unique_active_user_ids,
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


if __name__ == "__main__":
    unittest.main()
