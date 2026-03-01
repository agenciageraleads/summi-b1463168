import unittest
from unittest.mock import patch

from evolution_client import EvolutionClient, EvolutionError


class _FakeResponse:
    def __init__(self, status_code: int, text: str = ""):
        self.status_code = status_code
        self.text = text
        self.ok = 200 <= status_code < 300


class EvolutionClientTest(unittest.TestCase):
    def test_send_audio_prefers_whatsapp_audio_endpoint(self):
        client = EvolutionClient("https://evolution.example.com", "key")

        with patch("evolution_client.requests.post", return_value=_FakeResponse(201, '{"ok":true}')) as post:
            client.send_audio_mp3("Summi", "556282435286", b"fake-mp3")

        self.assertEqual(post.call_count, 1)
        self.assertEqual(
            post.call_args.kwargs["headers"]["apikey"],
            "key",
        )
        self.assertEqual(
            post.call_args.args[0],
            "https://evolution.example.com/message/sendWhatsAppAudio/Summi",
        )

    def test_send_audio_falls_back_to_legacy_endpoints(self):
        client = EvolutionClient("https://evolution.example.com", "key")
        responses = [
            _FakeResponse(404, "missing new route"),
            _FakeResponse(404, "missing plural new route"),
            _FakeResponse(201, '{"ok":true}'),
        ]

        with patch("evolution_client.requests.post", side_effect=responses) as post:
            client.send_audio_mp3("Summi", "556282435286", b"fake-mp3")

        called_urls = [call.args[0] for call in post.call_args_list]
        self.assertEqual(
            called_urls,
            [
                "https://evolution.example.com/message/sendWhatsAppAudio/Summi",
                "https://evolution.example.com/messages/sendWhatsAppAudio/Summi",
                "https://evolution.example.com/message/sendAudio/Summi",
            ],
        )

    def test_send_audio_raises_after_all_attempts_fail(self):
        client = EvolutionClient("https://evolution.example.com", "key")
        responses = [
            _FakeResponse(404, "a"),
            _FakeResponse(404, "b"),
            _FakeResponse(404, "c"),
            _FakeResponse(404, "d"),
        ]

        with patch("evolution_client.requests.post", side_effect=responses):
            with self.assertRaises(EvolutionError) as ctx:
                client.send_audio_mp3("Summi", "556282435286", b"fake-mp3")

        self.assertIn("404 a / 404 b / 404 c / 404 d", str(ctx.exception))


if __name__ == "__main__":
    unittest.main()
