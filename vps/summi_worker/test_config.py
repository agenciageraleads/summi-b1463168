from __future__ import annotations

import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from summi_worker.config import WEBHOOK_DEDUPE_TTL_SECONDS_FLOOR, load_settings


def _base_env() -> dict[str, str]:
    return {
        "SUPABASE_URL": "https://supabase.example.com",
        "SUPABASE_SERVICE_ROLE_KEY": "service-role",
        "GOOGLE_API_KEY": "google-key",
        "EVOLUTION_API_URL": "https://evolution.example.com",
        "EVOLUTION_API_KEY": "evolution-key",
    }


class LoadSettingsTest(unittest.TestCase):
    def test_load_settings_disables_daily_job_by_default(self) -> None:
        with patch.dict(os.environ, _base_env(), clear=True):
            settings = load_settings()

        self.assertFalse(settings.enable_daily_job)
        self.assertEqual(settings.default_seconds_to_summarize, 90)
        self.assertEqual(settings.llm_provider, "google")
        self.assertEqual(settings.transcription_provider, "google")
        self.assertIsNone(settings.openai_api_key)
        self.assertEqual(settings.blog_model, "gemini-2.5-flash-lite")
        self.assertEqual(settings.blog_post_timezone, "UTC")
        self.assertTrue(settings.blog_use_pytrends)

    def test_webhook_dedupe_ttl_enforces_floor(self) -> None:
        with patch.dict(
            os.environ,
            {**_base_env(), "WEBHOOK_DEDUPE_TTL_SECONDS": "600"},
            clear=True,
        ):
            settings = load_settings()

        self.assertEqual(settings.webhook_dedupe_ttl_seconds, WEBHOOK_DEDUPE_TTL_SECONDS_FLOOR)

    def test_webhook_dedupe_ttl_preserves_larger_value(self) -> None:
        with patch.dict(
            os.environ,
            {**_base_env(), "WEBHOOK_DEDUPE_TTL_SECONDS": "172800"},
            clear=True,
        ):
            settings = load_settings()

        self.assertEqual(settings.webhook_dedupe_ttl_seconds, 172800)

    def test_require_redis_raises_without_redis_url(self) -> None:
        with patch.dict(
            os.environ,
            {**_base_env(), "REQUIRE_REDIS": "true"},
            clear=True,
        ):
            with self.assertRaisesRegex(RuntimeError, "REDIS_URL is required"):
                load_settings()

    def test_openai_key_is_required_only_when_openai_provider_is_selected(self) -> None:
        with patch.dict(
            os.environ,
            {**_base_env(), "LLM_PROVIDER": "openai", "TRANSCRIPTION_PROVIDER": "google"},
            clear=True,
        ):
            with self.assertRaisesRegex(RuntimeError, "OPENAI_API_KEY is required"):
                load_settings()


if __name__ == "__main__":
    unittest.main()
