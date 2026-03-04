from __future__ import annotations

import sys
import unittest
from pathlib import Path
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from summi_worker.app import _dispatch_analysis
from summi_worker.config import Settings


class _FakeBackgroundTasks:
    def __init__(self) -> None:
        self.calls: list[tuple[object, tuple[object, ...], dict[str, object]]] = []

    def add_task(self, func: object, *args: object, **kwargs: object) -> None:
        self.calls.append((func, args, kwargs))


class _FakeQueue:
    def __init__(self) -> None:
        self.calls: list[tuple[str, dict[str, object]]] = []

    def enqueue(self, queue_name: str, payload: dict[str, object]) -> None:
        self.calls.append((queue_name, payload))


def _settings(*, enable_analysis_queue: bool = False) -> Settings:
    return Settings(
        supabase_url="https://supabase.example.com",
        supabase_service_role_key="service-role",
        supabase_anon_key="anon",
        openai_api_key="openai-key",
        openai_model_analysis="gpt-4o-mini",
        openai_model_summary="gpt-4o-mini",
        openai_tts_model="gpt-4o-mini-tts",
        openai_tts_voice="alloy",
        openai_transcription_model="gpt-4o-mini-transcribe",
        openai_transcription_fallback_model="gpt-4o-transcribe",
        openai_transcription_language="pt",
        openai_transcription_prompt_extra=None,
        openai_transcription_enable_fallback=True,
        openai_transcription_confidence_threshold=0.55,
        openai_transcription_critical_confidence_threshold=0.80,
        openai_transcription_chunking_min_seconds=20,
        evolution_api_url="https://evolution.example.com",
        evolution_api_key="evolution-key",
        summi_sender_instance="Summi",
        business_hours_start=8,
        business_hours_end=18,
        ignore_remote_jid="556293984600",
        enable_hourly_job=False,
        low_priority_cleanup_days=0,
        redis_url="redis://localhost:6379/0",
        webhook_dedupe_ttl_seconds=600,
        enable_analysis_queue=enable_analysis_queue,
        enable_summary_queue=False,
        queue_analysis_name="summi:queue:analysis",
        queue_summary_name="summi:queue:summary",
    )


class DispatchAnalysisTest(unittest.TestCase):
    def test_dispatch_analysis_schedules_background_work_when_queue_is_disabled(self) -> None:
        background_tasks = _FakeBackgroundTasks()

        with patch("summi_worker.app._redis_queue", return_value=None), patch(
            "summi_worker.app.analyze_user_chats"
        ) as analyze_user_chats:
            analyze_ok, analysis_enqueued, analysis_deferred, analyze_error = _dispatch_analysis(
                settings=_settings(enable_analysis_queue=False),
                user_id="user-1",
                instance_name="lucasborges_5286",
                remote_jid="551199999999@s.whatsapp.net",
                message_id="ABC123",
                supabase=object(),
                openai=object(),
                background_tasks=background_tasks,
            )

        self.assertFalse(analyze_ok)
        self.assertFalse(analysis_enqueued)
        self.assertTrue(analysis_deferred)
        self.assertIsNone(analyze_error)
        self.assertEqual(len(background_tasks.calls), 1)
        self.assertEqual(background_tasks.calls[0][2]["user_id"], "user-1")
        analyze_user_chats.assert_not_called()

    def test_dispatch_analysis_runs_inline_without_background_tasks(self) -> None:
        with patch("summi_worker.app._redis_queue", return_value=None), patch(
            "summi_worker.app.analyze_user_chats", return_value={"success": True, "analyzed_count": 3}
        ) as analyze_user_chats:
            analyze_ok, analysis_enqueued, analysis_deferred, analyze_error = _dispatch_analysis(
                settings=_settings(enable_analysis_queue=False),
                user_id="user-1",
                instance_name="lucasborges_5286",
                remote_jid="551199999999@s.whatsapp.net",
                message_id="ABC123",
                supabase=object(),
                openai=object(),
                background_tasks=None,
            )

        self.assertTrue(analyze_ok)
        self.assertFalse(analysis_enqueued)
        self.assertFalse(analysis_deferred)
        self.assertIsNone(analyze_error)
        analyze_user_chats.assert_called_once()

    def test_dispatch_analysis_enqueues_when_queue_is_enabled(self) -> None:
        fake_queue = _FakeQueue()
        background_tasks = _FakeBackgroundTasks()

        with patch("summi_worker.app._redis_queue", return_value=fake_queue), patch(
            "summi_worker.app.analyze_user_chats"
        ) as analyze_user_chats:
            analyze_ok, analysis_enqueued, analysis_deferred, analyze_error = _dispatch_analysis(
                settings=_settings(enable_analysis_queue=True),
                user_id="user-1",
                instance_name="lucasborges_5286",
                remote_jid="551199999999@s.whatsapp.net",
                message_id="ABC123",
                supabase=object(),
                openai=object(),
                background_tasks=background_tasks,
            )

        self.assertFalse(analyze_ok)
        self.assertTrue(analysis_enqueued)
        self.assertFalse(analysis_deferred)
        self.assertIsNone(analyze_error)
        self.assertEqual(len(fake_queue.calls), 1)
        self.assertEqual(fake_queue.calls[0][0], "summi:queue:analysis")
        self.assertEqual(fake_queue.calls[0][1]["message_id"], "ABC123")
        self.assertEqual(background_tasks.calls, [])
        analyze_user_chats.assert_not_called()


if __name__ == "__main__":
    unittest.main()
