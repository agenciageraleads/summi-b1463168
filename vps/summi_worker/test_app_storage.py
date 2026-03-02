import sys
import types
import unittest

if "dotenv" not in sys.modules:
    dotenv_stub = types.ModuleType("dotenv")
    dotenv_stub.load_dotenv = lambda *args, **kwargs: None
    sys.modules["dotenv"] = dotenv_stub

if "fastapi" not in sys.modules:
    fastapi_stub = types.ModuleType("fastapi")

    class _FastAPI:
        def __init__(self, *args, **kwargs) -> None:
            pass

        def get(self, *args, **kwargs):
            def decorator(func):
                return func

            return decorator

        def post(self, *args, **kwargs):
            def decorator(func):
                return func

            return decorator

    class _HTTPException(Exception):
        pass

    fastapi_stub.FastAPI = _FastAPI
    fastapi_stub.Header = lambda *args, **kwargs: None
    fastapi_stub.HTTPException = _HTTPException
    fastapi_stub.Request = object
    sys.modules["fastapi"] = fastapi_stub

if "redis" not in sys.modules:
    redis_stub = types.ModuleType("redis")

    class _Redis:
        @classmethod
        def from_url(cls, *args, **kwargs):
            return cls()

    redis_stub.Redis = _Redis
    sys.modules["redis"] = redis_stub

if "requests" not in sys.modules:
    requests_stub = types.ModuleType("requests")
    requests_stub.get = None
    requests_stub.post = None
    requests_stub.patch = None
    requests_stub.delete = None
    sys.modules["requests"] = requests_stub

if "mutagen" not in sys.modules:
    mutagen_stub = types.ModuleType("mutagen")
    mutagen_stub.File = lambda *args, **kwargs: None
    sys.modules["mutagen"] = mutagen_stub

try:
    from .app import _event_for_storage
except ImportError:
    from pathlib import Path

    ROOT = Path(__file__).resolve().parents[1]
    if str(ROOT) not in sys.path:
        sys.path.insert(0, str(ROOT))
    from summi_worker.app import _event_for_storage


class EventForStorageTest(unittest.TestCase):
    def test_merges_audio_metadata_into_persisted_event(self) -> None:
        normalized = {"message_id": "abc", "message_type": "audio", "text": "transcricao"}
        extra = {
            "audio_transcribed": True,
            "audio_transcription_model": "gpt-4o-mini-transcribe",
            "audio_transcription_used_fallback": False,
            "audio_transcription_confidence": 0.88,
        }

        merged = _event_for_storage(normalized, extra)

        self.assertEqual(merged["message_id"], "abc")
        self.assertTrue(merged["audio_transcribed"])
        self.assertEqual(merged["audio_transcription_model"], "gpt-4o-mini-transcribe")
        self.assertFalse(merged["audio_transcription_used_fallback"])
        self.assertEqual(merged["audio_transcription_confidence"], 0.88)

    def test_skips_none_values_but_keeps_false_flags(self) -> None:
        normalized = {"message_id": "abc"}
        extra = {
            "audio_transcription_confidence": None,
            "audio_transcription_used_fallback": False,
        }

        merged = _event_for_storage(normalized, extra)

        self.assertNotIn("audio_transcription_confidence", merged)
        self.assertIn("audio_transcription_used_fallback", merged)
        self.assertFalse(merged["audio_transcription_used_fallback"])


if __name__ == "__main__":
    unittest.main()
