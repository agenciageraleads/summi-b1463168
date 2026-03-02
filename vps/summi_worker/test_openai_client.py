import math
import sys
import types
import unittest
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
    from .openai_client import OpenAIClient
except ImportError:
    from pathlib import Path

    ROOT = Path(__file__).resolve().parents[1]
    if str(ROOT) not in sys.path:
        sys.path.insert(0, str(ROOT))
    from summi_worker.openai_client import OpenAIClient


REQUESTS_POST_TARGET = f"{OpenAIClient.__module__}.requests.post"


class _FakeResponse:
    def __init__(self, payload: dict[str, object], status_code: int = 200) -> None:
        self._payload = payload
        self.status_code = status_code
        self.text = ""
        self.ok = 200 <= status_code < 300

    def json(self) -> dict[str, object]:
        return self._payload


class OpenAIClientTranscriptionTest(unittest.TestCase):
    def test_transcribe_audio_sends_language_prompt_logprobs_and_chunking(self) -> None:
        client = OpenAIClient("key")

        with patch.object(client, "_probe_audio_duration_seconds", return_value=42.0):
            with patch(
                REQUESTS_POST_TARGET,
                return_value=_FakeResponse(
                    {
                        "text": "Me passa o CNPJ 12.345.678/0001-90.",
                        "duration": 42,
                        "logprobs": [
                            {"token": "Me", "logprob": -0.1},
                            {"token": "CNPJ", "logprob": -0.2},
                        ],
                    }
                ),
            ) as post:
                result = client.transcribe_audio(
                    b"fake-audio",
                    model="gpt-4o-mini-transcribe",
                    language="pt",
                    prompt="Preserve CNPJ e marcas.",
                    include_logprobs=True,
                    auto_chunking_min_seconds=20,
                )

        sent_pairs = post.call_args.kwargs["data"]
        self.assertIn(("model", "gpt-4o-mini-transcribe"), sent_pairs)
        self.assertIn(("response_format", "json"), sent_pairs)
        self.assertIn(("language", "pt"), sent_pairs)
        self.assertIn(("prompt", "Preserve CNPJ e marcas."), sent_pairs)
        self.assertIn(("include[]", "logprobs"), sent_pairs)
        self.assertIn(("chunking_strategy", "auto"), sent_pairs)
        self.assertEqual(result.text, "Me passa o CNPJ 12.345.678/0001-90.")
        self.assertEqual(result.duration_seconds, 42.0)
        self.assertAlmostEqual(result.average_logprob or 0.0, -0.15)
        self.assertAlmostEqual(result.average_confidence or 0.0, math.exp(-0.15))

    def test_transcribe_audio_omits_chunking_for_short_audio(self) -> None:
        client = OpenAIClient("key")

        with patch.object(client, "_probe_audio_duration_seconds", return_value=8.0):
            with patch(
                REQUESTS_POST_TARGET,
                return_value=_FakeResponse({"text": "audio curto"}),
            ) as post:
                result = client.transcribe_audio(
                    b"fake-audio",
                    model="gpt-4o-mini-transcribe",
                    include_logprobs=False,
                    auto_chunking_min_seconds=20,
                )

        sent_pairs = post.call_args.kwargs["data"]
        self.assertNotIn(("chunking_strategy", "auto"), sent_pairs)
        self.assertNotIn(("include[]", "logprobs"), sent_pairs)
        self.assertEqual(result.text, "audio curto")
        self.assertEqual(result.duration_seconds, 8.0)
        self.assertIsNone(result.average_confidence)


if __name__ == "__main__":
    unittest.main()
