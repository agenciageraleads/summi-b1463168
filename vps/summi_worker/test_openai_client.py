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
    from .openai_client import GeminiClient, GeminiTranscriptionClient, OpenAIClient, strip_transcription_timestamps
except ImportError:
    from pathlib import Path

    ROOT = Path(__file__).resolve().parents[1]
    if str(ROOT) not in sys.path:
        sys.path.insert(0, str(ROOT))
    from summi_worker.openai_client import GeminiClient, GeminiTranscriptionClient, OpenAIClient, strip_transcription_timestamps


REQUESTS_POST_TARGET = f"{OpenAIClient.__module__}.requests.post"


class _FakeResponse:
    def __init__(self, payload: dict[str, object], status_code: int = 200) -> None:
        self._payload = payload
        self.status_code = status_code
        self.text = ""
        self.content = b""
        self.ok = 200 <= status_code < 300

    def json(self) -> dict[str, object]:
        return self._payload


class OpenAIClientTranscriptionTest(unittest.TestCase):
    def test_strip_transcription_timestamps_removes_ranges_but_preserves_clock_times(self) -> None:
        text = (
            "00:01 - 00:05\n"
            "Lucas, se apressa, eu já preciso ter uma ideia do que é.\n\n"
            "00:06 - 00:11\n"
            "Entrega às 10:00 amanhã."
        )

        self.assertEqual(
            strip_transcription_timestamps(text),
            "Lucas, se apressa, eu já preciso ter uma ideia do que é.\nEntrega às 10:00 amanhã.",
        )

    def test_transcribe_audio_strips_timestamp_ranges_from_response_text(self) -> None:
        client = OpenAIClient("key")

        with patch.object(client, "_probe_audio_duration_seconds", return_value=13.0):
            with patch(
                REQUESTS_POST_TARGET,
                return_value=_FakeResponse(
                    {
                        "text": (
                            "00:01 - 00:05\n"
                            "Lucas, se apressa, eu já preciso ter uma ideia do que é.\n\n"
                            "00:06 - 00:11\n"
                            "Vocês aí com 6 metros inteira."
                        )
                    }
                ),
            ):
                result = client.transcribe_audio(
                    b"fake-audio",
                    model="whisper-1",
                    include_logprobs=False,
                )

        self.assertEqual(
            result.text,
            "Lucas, se apressa, eu já preciso ter uma ideia do que é.\nVocês aí com 6 metros inteira.",
        )

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

    def test_transcribe_audio_omits_chunking_for_whisper_even_when_audio_is_long(self) -> None:
        client = OpenAIClient("key")

        with patch.object(client, "_probe_audio_duration_seconds", return_value=42.0):
            with patch(
                REQUESTS_POST_TARGET,
                return_value=_FakeResponse({"text": "audio longo"}),
            ) as post:
                result = client.transcribe_audio(
                    b"fake-audio",
                    model="whisper-1",
                    include_logprobs=False,
                    auto_chunking_min_seconds=20,
                )

        sent_pairs = post.call_args.kwargs["data"]
        self.assertNotIn(("chunking_strategy", "auto"), sent_pairs)
        self.assertNotIn(("include[]", "logprobs"), sent_pairs)
        self.assertEqual(result.text, "audio longo")
        self.assertEqual(result.duration_seconds, 42.0)

    def test_chat_text_response_exposes_usage(self) -> None:
        client = OpenAIClient("key")

        with patch(
            REQUESTS_POST_TARGET,
            return_value=_FakeResponse(
                {
                    "choices": [{"message": {"content": "Resumo pronto"}}],
                    "usage": {"prompt_tokens": 120, "completion_tokens": 30, "total_tokens": 150},
                }
            ),
        ):
            result = client.chat_text_response(
                model="gpt-4o-mini",
                system="system",
                user="user",
                temperature=0.2,
            )

        self.assertEqual(result.text, "Resumo pronto")
        self.assertIsNotNone(result.usage)
        self.assertEqual(result.usage.prompt_tokens, 120)
        self.assertEqual(result.usage.completion_tokens, 30)
        self.assertEqual(result.usage.total_tokens, 150)

    def test_tts_mp3_response_tracks_char_count(self) -> None:
        client = OpenAIClient("key")

        with patch(REQUESTS_POST_TARGET, return_value=_FakeResponse({}, status_code=200)) as post:
            post.return_value.content = b"fake-mp3"
            result = client.tts_mp3_response("gpt-4o-mini-tts", "alloy", "Resumo em audio")

        self.assertEqual(result.audio_bytes, b"fake-mp3")
        self.assertEqual(result.char_count, len("Resumo em audio"))


class GeminiTranscriptionClientTest(unittest.TestCase):
    def test_chat_json_response_extracts_json_and_usage(self) -> None:
        client = GeminiClient("google-key")

        with patch(
            REQUESTS_POST_TARGET,
            return_value=_FakeResponse(
                {
                    "candidates": [
                        {
                            "content": {
                                "parts": [
                                    {"text": '{"Prioridade":"2","Contexto":"Responder hoje"}'},
                                ]
                            }
                        }
                    ],
                    "usageMetadata": {
                        "promptTokenCount": 100,
                        "candidatesTokenCount": 20,
                        "totalTokenCount": 120,
                    },
                }
            ),
        ) as post:
            result = client.chat_json_response("gemini-2.5-flash-lite", "system", "user", temperature=0.2)

        self.assertEqual(result.data["Prioridade"], "2")
        self.assertEqual(result.usage.total_tokens if result.usage else None, 120)
        payload = post.call_args.kwargs["json"]
        self.assertEqual(payload["generationConfig"]["responseMimeType"], "application/json")
        self.assertEqual(post.call_args.kwargs["params"], {"key": "google-key"})

    def test_chat_text_response_extracts_text(self) -> None:
        client = GeminiClient("google-key")

        with patch(
            REQUESTS_POST_TARGET,
            return_value=_FakeResponse(
                {
                    "candidates": [
                        {
                            "content": {
                                "parts": [{"text": "Resumo pronto"}],
                            }
                        }
                    ]
                }
            ),
        ):
            result = client.chat_text_response("gemini-2.5-flash-lite", "system", "user")

        self.assertEqual(result.text, "Resumo pronto")

    def test_transcribe_audio_posts_inline_audio_and_extracts_text(self) -> None:
        client = GeminiTranscriptionClient("google-key")

        with patch(
            REQUESTS_POST_TARGET,
            return_value=_FakeResponse(
                {
                    "candidates": [
                        {
                            "content": {
                                "parts": [
                                    {"text": "00:00 - 00:05\nMe passa o CNPJ 12.345.678/0001-90."},
                                ]
                            }
                        }
                    ]
                }
            ),
        ) as post:
            result = client.transcribe_audio(
                b"ID3fake-audio",
                model="gemini-2.5-flash-lite",
                language="pt",
                prompt="Preserve CNPJ e marcas.",
            )

        self.assertEqual(result.text, "Me passa o CNPJ 12.345.678/0001-90.")
        self.assertEqual(result.model, "gemini-2.5-flash-lite")
        self.assertEqual(post.call_args.kwargs["params"], {"key": "google-key"})
        payload = post.call_args.kwargs["json"]
        parts = payload["contents"][0]["parts"]
        self.assertIn("Transcreva este áudio", parts[0]["text"])
        self.assertEqual(parts[1]["inline_data"]["mime_type"], "audio/mp3")


if __name__ == "__main__":
    unittest.main()
