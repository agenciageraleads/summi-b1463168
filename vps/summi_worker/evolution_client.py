from __future__ import annotations

import base64
import json
from typing import Any, Dict, Optional

import requests


class EvolutionError(RuntimeError):
    pass


class EvolutionClient:
    """
    Cliente leve para Evolution API.

    Observacao: o endpoint exato de envio pode variar por versao/distribuicao.
    Estes metodos assumem endpoints comuns e sao configuraveis via env futuramente
    se necessario.
    """

    def __init__(self, base_url: str, api_key: str):
        self._url = base_url.rstrip("/")
        self._key = api_key

    def _headers(self) -> Dict[str, str]:
        return {"apikey": self._key, "Content-Type": "application/json"}

    def send_text(self, instance: str, remote_jid: str, text: str) -> None:
        # Tentativa 1 (comum): /message/sendText/{instance}
        url = f"{self._url}/message/sendText/{instance}"
        payload = {"number": remote_jid, "text": text}
        resp = requests.post(url, headers=self._headers(), data=json.dumps(payload), timeout=30)
        if resp.ok:
            return

        # Tentativa 2: /messages/sendText/{instance}
        url2 = f"{self._url}/messages/sendText/{instance}"
        resp2 = requests.post(url2, headers=self._headers(), data=json.dumps(payload), timeout=30)
        if resp2.ok:
            return

        raise EvolutionError(f"send_text failed: {resp.status_code} {resp.text} / {resp2.status_code} {resp2.text}")

    def send_audio_mp3(self, instance: str, remote_jid: str, mp3_bytes: bytes) -> None:
        # Muitos setups aceitam base64.
        b64 = base64.b64encode(mp3_bytes).decode("ascii")

        url = f"{self._url}/message/sendAudio/{instance}"
        payload = {"number": remote_jid, "audio": b64}
        resp = requests.post(url, headers=self._headers(), data=json.dumps(payload), timeout=60)
        if resp.ok:
            return

        url2 = f"{self._url}/messages/sendAudio/{instance}"
        resp2 = requests.post(url2, headers=self._headers(), data=json.dumps(payload), timeout=60)
        if resp2.ok:
            return

        raise EvolutionError(f"send_audio failed: {resp.status_code} {resp.text} / {resp2.status_code} {resp2.text}")

