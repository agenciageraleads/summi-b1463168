from __future__ import annotations

import base64
from dataclasses import dataclass
from io import BytesIO
import json
import math
import re
from typing import Any, Dict, Optional, Tuple

import requests
from mutagen import File as MutagenFile


class OpenAIError(RuntimeError):
    pass


GEMINI_TRANSCRIPTION_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"


# Modelos que NÃO suportam include[]=logprobs na API de transcrição.
# Whisper-1 usa endpoint legado e ignora/rejeita parâmetros extras.
_TRANSCRIPTION_MODELS_WITHOUT_LOGPROBS: frozenset[str] = frozenset({"whisper-1"})

# Modelos que NÃO suportam chunking_strategy na API de transcrição.
# Whisper-1 rejeita se for enviado.
_TRANSCRIPTION_MODELS_WITHOUT_CHUNKING: frozenset[str] = frozenset({"whisper-1"})

_TIMESTAMP_PREFIX_RE = re.compile(
    r"^\s*[\[(]?\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d{1,3})?[\])]?\s*"
    r"(?:-|–|—|-->|->|\sto\s)\s*"
    r"[\[(]?\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d{1,3})?[\])]?\s*[:\-–—]?\s*"
)
_TIMESTAMP_ONLY_RE = re.compile(
    r"^\s*[\[(]?\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d{1,3})?[\])]?\s*"
    r"(?:(?:-|–|—|-->|->|\sto\s)\s*"
    r"[\[(]?\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d{1,3})?[\])]?)?\s*$"
)


@dataclass(frozen=True)
class TranscriptionResult:
    text: str
    duration_seconds: Optional[float]
    model: str
    average_logprob: Optional[float] = None
    average_confidence: Optional[float] = None


@dataclass(frozen=True)
class OpenAIUsage:
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


@dataclass(frozen=True)
class ChatJsonResult:
    data: Dict[str, Any]
    usage: Optional[OpenAIUsage]


@dataclass(frozen=True)
class ChatTextResult:
    text: str
    usage: Optional[OpenAIUsage]


@dataclass(frozen=True)
class TTSResult:
    audio_bytes: bytes
    char_count: int


@dataclass(frozen=True)
class VisionResult:
    text: str
    usage: Optional[OpenAIUsage]


def strip_transcription_timestamps(text: str) -> str:
    cleaned_lines: list[str] = []
    for line in str(text or "").splitlines():
        if _TIMESTAMP_ONLY_RE.match(line):
            continue
        cleaned_line = _TIMESTAMP_PREFIX_RE.sub("", line).strip()
        if cleaned_line:
            cleaned_lines.append(cleaned_line)

    return "\n".join(cleaned_lines).strip()


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


def _to_float(value: Any) -> Optional[float]:
    try:
        return float(value)
    except Exception:
        return None


def _extract_logprob_values(node: Any) -> list[float]:
    values: list[float] = []
    if isinstance(node, dict):
        for key, value in node.items():
            if key == "logprob":
                parsed = _to_float(value)
                if parsed is not None:
                    values.append(parsed)
                continue
            values.extend(_extract_logprob_values(value))
    elif isinstance(node, list):
        for item in node:
            values.extend(_extract_logprob_values(item))
    return values


def _extract_usage(payload: Dict[str, Any]) -> Optional[OpenAIUsage]:
    usage = payload.get("usage")
    if not isinstance(usage, dict):
        return None
    prompt_tokens = int(_to_float(usage.get("prompt_tokens")) or 0)
    completion_tokens = int(_to_float(usage.get("completion_tokens")) or 0)
    total_tokens = int(_to_float(usage.get("total_tokens")) or (prompt_tokens + completion_tokens))
    return OpenAIUsage(
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        total_tokens=total_tokens,
    )


def _detect_audio_upload_meta(audio_bytes: bytes, default_filename: str = "audio.mp3") -> Tuple[str, str]:
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


def _probe_audio_duration_seconds(audio_bytes: bytes) -> Optional[float]:
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


def _extract_gemini_text(payload: Dict[str, Any]) -> str:
    candidates = payload.get("candidates")
    if not isinstance(candidates, list) or not candidates:
        raise OpenAIError(f"gemini transcription returned no candidates: {json.dumps(payload)[:500]}")
    content = candidates[0].get("content") if isinstance(candidates[0], dict) else None
    parts = content.get("parts") if isinstance(content, dict) else None
    if not isinstance(parts, list):
        raise OpenAIError(f"gemini transcription returned no parts: {json.dumps(payload)[:500]}")
    text_parts = [str(part.get("text") or "") for part in parts if isinstance(part, dict)]
    return "\n".join(part.strip() for part in text_parts if part.strip()).strip()


class GeminiTranscriptionClient:
    def __init__(self, api_key: str):
        self._api_key = api_key

    def transcribe_audio(
        self,
        audio_bytes: bytes,
        *,
        model: str = "gemini-2.5-flash-lite",
        filename: str = "audio.mp3",
        language: str | None = None,
        prompt: str | None = None,
    ) -> TranscriptionResult:
        _, mime_type = _detect_audio_upload_meta(audio_bytes, default_filename=filename)
        if mime_type == "audio/mpeg":
            mime_type = "audio/mp3"
        language_hint = f"Idioma esperado: {language}." if language else ""
        prompt_text = "\n".join(
            part
            for part in (
                "Transcreva este áudio para texto. Responda somente com a transcrição, sem comentários.",
                language_hint,
                prompt or "",
            )
            if part
        )
        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {"text": prompt_text},
                        {
                            "inline_data": {
                                "mime_type": mime_type,
                                "data": base64.b64encode(audio_bytes).decode("ascii"),
                            }
                        },
                    ],
                }
            ],
            "generationConfig": {
                "temperature": 0.0,
                "responseMimeType": "text/plain",
            },
        }
        url = GEMINI_TRANSCRIPTION_ENDPOINT.format(model=model)
        resp = requests.post(url, params={"key": self._api_key}, json=payload, timeout=180)
        if not resp.ok:
            raise OpenAIError(f"gemini transcribe failed: {resp.status_code} {resp.text}")
        return TranscriptionResult(
            text=strip_transcription_timestamps(_extract_gemini_text(resp.json())),
            duration_seconds=_probe_audio_duration_seconds(audio_bytes),
            model=model,
        )


class OpenAIClient:
    def __init__(self, api_key: str):
        self._api_key = api_key

    def _headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }

    def chat_json_response(self, model: str, system: str, user: str, temperature: float = 0.2) -> ChatJsonResult:
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
        return ChatJsonResult(data=_extract_json_object(text), usage=_extract_usage(data))

    def chat_json(self, model: str, system: str, user: str, temperature: float = 0.2) -> Dict[str, Any]:
        return self.chat_json_response(model=model, system=system, user=user, temperature=temperature).data

    def chat_text_response(self, model: str, system: str, user: str, temperature: float = 0.4) -> ChatTextResult:
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
        return ChatTextResult(
            text=data["choices"][0]["message"].get("content", "").strip(),
            usage=_extract_usage(data),
        )

    def chat_text(self, model: str, system: str, user: str, temperature: float = 0.4) -> str:
        return self.chat_text_response(model=model, system=system, user=user, temperature=temperature).text

    def tts_mp3_response(self, model: str, voice: str, text: str) -> TTSResult:
        url = "https://api.openai.com/v1/audio/speech"
        payload = {"model": model, "voice": voice, "input": text, "format": "mp3"}
        resp = requests.post(url, headers=self._headers(), data=json.dumps(payload), timeout=120)
        if not resp.ok:
            raise OpenAIError(f"tts failed: {resp.status_code} {resp.text}")
        return TTSResult(audio_bytes=resp.content, char_count=len(text))

    def tts_mp3(self, model: str, voice: str, text: str) -> bytes:
        return self.tts_mp3_response(model=model, voice=voice, text=text).audio_bytes

    def _detect_audio_upload_meta(self, audio_bytes: bytes, default_filename: str = "audio.mp3") -> Tuple[str, str]:
        """
        Detecta formato por magic bytes para enviar o MIME/filename corretos ao endpoint de transcricao.
        """
        return _detect_audio_upload_meta(audio_bytes, default_filename=default_filename)

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
        return _probe_audio_duration_seconds(audio_bytes)

    def transcribe_audio(
        self,
        audio_bytes: bytes,
        *,
        model: str = "whisper-1",
        filename: str = "audio.mp3",
        language: str | None = None,
        prompt: str | None = None,
        include_logprobs: bool = True,
        auto_chunking_min_seconds: int | None = None,
    ) -> TranscriptionResult:
        """
        Retorna texto, duração e sinais de confiança usando /audio/transcriptions.
        Apesar do nome historico, detecta formato real (ogg/opus, mp3, wav, etc.).
        """
        url = "https://api.openai.com/v1/audio/transcriptions"
        headers = {"Authorization": f"Bearer {self._api_key}"}
        upload_filename, mime_type = self._detect_audio_upload_meta(audio_bytes, default_filename=filename)
        files = {"file": (upload_filename, audio_bytes, mime_type)}
        estimated_duration = self._probe_audio_duration_seconds(audio_bytes)
        data: list[tuple[str, str]] = [
            ("model", model),
            ("response_format", "json"),
        ]
        if language:
            data.append(("language", language))
        if prompt:
            data.append(("prompt", prompt))
        # Whisper-1 não suporta include[]=logprobs — apenas modelos gpt-4o-*-transcribe suportam.
        if include_logprobs and model not in _TRANSCRIPTION_MODELS_WITHOUT_LOGPROBS:
            data.append(("include[]", "logprobs"))
        if (
            auto_chunking_min_seconds is not None
            and estimated_duration is not None
            and estimated_duration >= auto_chunking_min_seconds
            and model not in _TRANSCRIPTION_MODELS_WITHOUT_CHUNKING
        ):
            data.append(("chunking_strategy", "auto"))
        resp = requests.post(url, headers=headers, data=data, files=files, timeout=180)
        if not resp.ok:
            raise OpenAIError(f"transcribe failed: {resp.status_code} {resp.text}")
        payload = resp.json()
        text = strip_transcription_timestamps(str(payload.get("text") or ""))
        duration_num = _to_float(payload.get("duration"))
        if duration_num is None:
            duration_num = estimated_duration
        logprob_values = _extract_logprob_values(payload.get("logprobs"))
        average_logprob: Optional[float] = None
        average_confidence: Optional[float] = None
        if logprob_values:
            average_logprob = sum(logprob_values) / len(logprob_values)
            average_confidence = min(max(math.exp(average_logprob), 0.0), 1.0)
        return TranscriptionResult(
            text=text,
            duration_seconds=duration_num,
            model=model,
            average_logprob=average_logprob,
            average_confidence=average_confidence,
        )

    def transcribe_mp3(self, mp3_bytes: bytes, filename: str = "audio.mp3") -> Tuple[str, Optional[float]]:
        result = self.transcribe_audio(mp3_bytes, filename=filename)
        return result.text, result.duration_seconds

    def describe_image_base64_response(
        self,
        model: str,
        image_bytes: bytes,
        mime_type: str = "image/jpeg",
    ) -> VisionResult:
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
        return VisionResult(
            text=data["choices"][0]["message"].get("content", "").strip(),
            usage=_extract_usage(data),
        )

    def describe_image_base64(self, model: str, image_bytes: bytes, mime_type: str = "image/jpeg") -> str:
        return self.describe_image_base64_response(model=model, image_bytes=image_bytes, mime_type=mime_type).text
