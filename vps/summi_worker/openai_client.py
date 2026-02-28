from __future__ import annotations

import base64
from io import BytesIO
import json
from typing import Any, Dict, Optional, Tuple

import requests
from mutagen import File as MutagenFile


class OpenAIError(RuntimeError):
    pass


def _extract_json_object(text: str) -> Dict[str, Any]:
    """
    Best-effort extraction of a JSON object from a model response.
    """
    if not text:
        raise OpenAIError("Empty model response")
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise OpenAIError(f"Could not locate JSON object in response: {text[:200]}")
    raw = text[start : end + 1]
    return json.loads(raw)


class OpenAIClient:
    def __init__(self, api_key: str):
        self._api_key = api_key

    def _headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }

    def chat_json(self, model: str, system: str, user: str, temperature: float = 0.2) -> Dict[str, Any]:
        url = "https://api.openai.com/v1/chat/completions"
        payload = {
            "model": model,
            "temperature": temperature,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        }
        resp = requests.post(url, headers=self._headers(), data=json.dumps(payload), timeout=60)
        if not resp.ok:
            raise OpenAIError(f"chat failed: {resp.status_code} {resp.text}")
        data = resp.json()
        text = data["choices"][0]["message"].get("content", "")
        return _extract_json_object(text)

    def chat_text(self, model: str, system: str, user: str, temperature: float = 0.4) -> str:
        url = "https://api.openai.com/v1/chat/completions"
        payload = {
            "model": model,
            "temperature": temperature,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        }
        resp = requests.post(url, headers=self._headers(), data=json.dumps(payload), timeout=60)
        if not resp.ok:
            raise OpenAIError(f"chat failed: {resp.status_code} {resp.text}")
        data = resp.json()
        return data["choices"][0]["message"].get("content", "").strip()

    def tts_mp3(self, model: str, voice: str, text: str) -> bytes:
        url = "https://api.openai.com/v1/audio/speech"
        payload = {"model": model, "voice": voice, "input": text, "format": "mp3"}
        resp = requests.post(url, headers=self._headers(), data=json.dumps(payload), timeout=120)
        if not resp.ok:
            raise OpenAIError(f"tts failed: {resp.status_code} {resp.text}")
        return resp.content

    def _detect_audio_upload_meta(self, audio_bytes: bytes, default_filename: str = "audio.mp3") -> Tuple[str, str]:
        """
        Detecta formato por magic bytes para enviar o MIME/filename corretos ao endpoint de transcricao.
        """
        head = audio_bytes[:32]
        if head.startswith(b"OggS"):
            return "audio.ogg", "audio/ogg"
        if head.startswith(b"ID3") or (len(head) >= 2 and head[0] == 0xFF and (head[1] & 0xE0) == 0xE0):
            return "audio.mp3", "audio/mpeg"
        if head.startswith(b"RIFF") and b"WAVE" in head:
            return "audio.wav", "audio/wav"
        if head.startswith(b"fLaC"):
            return "audio.flac", "audio/flac"
        if len(head) >= 12 and head[4:8] == b"ftyp":
            return "audio.m4a", "audio/mp4"
        return default_filename, "application/octet-stream"

    def _detect_image_mime(self, image_bytes: bytes, default_mime: str = "image/jpeg") -> str:
        head = image_bytes[:32]
        if head.startswith(b"\x89PNG\r\n\x1a\n"):
            return "image/png"
        if head.startswith(b"\xff\xd8\xff"):
            return "image/jpeg"
        if head.startswith(b"GIF87a") or head.startswith(b"GIF89a"):
            return "image/gif"
        if head.startswith(b"RIFF") and b"WEBP" in head[:16]:
            return "image/webp"
        return default_mime

    def _probe_audio_duration_seconds(self, audio_bytes: bytes) -> Optional[float]:
        try:
            audio_file = MutagenFile(BytesIO(audio_bytes))
        except Exception:
            return None
        if audio_file is None:
            return None
        info = getattr(audio_file, "info", None)
        length = getattr(info, "length", None)
        if length is None:
            return None
        try:
            duration = float(length)
        except Exception:
            return None
        return duration if duration > 0 else None

    def transcribe_mp3(self, mp3_bytes: bytes, filename: str = "audio.mp3") -> Tuple[str, Optional[float]]:
        """
        Retorna (texto, duracao_segundos?) usando /audio/transcriptions.
        Apesar do nome historico, detecta formato real (ogg/opus, mp3, wav, etc.).
        """
        url = "https://api.openai.com/v1/audio/transcriptions"
        headers = {"Authorization": f"Bearer {self._api_key}"}
        upload_filename, mime_type = self._detect_audio_upload_meta(mp3_bytes, default_filename=filename)
        files = {"file": (upload_filename, mp3_bytes, mime_type)}
        data = {"model": "gpt-4o-mini-transcribe"}
        resp = requests.post(url, headers=headers, data=data, files=files, timeout=180)
        if not resp.ok:
            raise OpenAIError(f"transcribe failed: {resp.status_code} {resp.text}")
        payload = resp.json()
        text = str(payload.get("text") or "").strip()
        duration = payload.get("duration")
        try:
            duration_num = float(duration) if duration is not None else None
        except Exception:
            duration_num = None
        if duration_num is None:
            duration_num = self._probe_audio_duration_seconds(mp3_bytes)
        return text, duration_num

    def describe_image_base64(self, model: str, image_bytes: bytes, mime_type: str = "image/jpeg") -> str:
        mime_type = self._detect_image_mime(image_bytes, default_mime=mime_type)
        b64 = base64.b64encode(image_bytes).decode("ascii")
        data_url = f"data:{mime_type};base64,{b64}"
        url = "https://api.openai.com/v1/chat/completions"
        payload = {
            "model": model,
            "temperature": 0.2,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": (
                                "Descreva a imagem de forma clara e objetiva, nada alem disso. "
                                "A descricao sera usada por outra IA para classificar prioridade de conversa."
                            ),
                        },
                        {"type": "image_url", "image_url": {"url": data_url}},
                    ],
                }
            ],
        }
        resp = requests.post(url, headers=self._headers(), data=json.dumps(payload), timeout=120)
        if not resp.ok:
            raise OpenAIError(f"vision failed: {resp.status_code} {resp.text}")
        data = resp.json()
        return data["choices"][0]["message"].get("content", "").strip()
