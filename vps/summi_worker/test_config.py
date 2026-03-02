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
        "OPENAI_API_KEY": "openai-key",
        "EVOLUTION_API_URL": "https://evolution.example.com",
        "EVOLUTION_API_KEY": "evolution-key",
    }


class LoadSettingsTest(unittest.TestCase):
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


if __name__ == "__main__":
    unittest.main()
