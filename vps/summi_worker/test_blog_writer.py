from __future__ import annotations

import sys
import unittest
from pathlib import Path
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from summi_worker import blog_writer


class _FakeGeminiResult:
    def __init__(self, data: dict[str, object]) -> None:
        self.data = data


class _FakeGeminiClient:
    calls: list[dict[str, object]] = []

    def __init__(self, api_key: str) -> None:
        self.api_key = api_key

    def chat_json_response(self, **kwargs: object) -> _FakeGeminiResult:
        self.calls.append(kwargs)
        return _FakeGeminiResult(
            {
                "title": "Post de teste",
                "excerpt": "Resumo do post de teste",
                "slug": "post-de-teste",
                "category": "Tecnologia",
                "tags": ["IA"],
                "keywords": "ia",
                "reading_time": 5,
                "content": "## Intro",
            }
        )


class BlogWriterGeminiTest(unittest.TestCase):
    def setUp(self) -> None:
        _FakeGeminiClient.calls = []

    def test_generate_post_uses_configured_gemini_model(self) -> None:
        with patch("summi_worker.blog_writer.GeminiClient", _FakeGeminiClient):
            data = blog_writer._generate_post_gemini("ia whatsapp", "google-key", "gemini-2.5-flash-lite")

        self.assertEqual(data["slug"], "post-de-teste")
        self.assertEqual(_FakeGeminiClient.calls[0]["model"], "gemini-2.5-flash-lite")

    def test_generate_post_returns_none_on_provider_error(self) -> None:
        with patch("summi_worker.blog_writer.GeminiClient", side_effect=RuntimeError("quota")):
            data = blog_writer._generate_post_gemini("ia whatsapp", "google-key", "gemini-2.5-flash-lite")

        self.assertIsNone(data)


if __name__ == "__main__":
    unittest.main()
