from __future__ import annotations

import json
from typing import Any, Dict, Optional

import requests


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

