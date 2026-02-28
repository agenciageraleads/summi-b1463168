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

    def _try_json_post(self, paths: list[str], payloads: list[Dict[str, Any]], timeout: int = 30) -> Dict[str, Any]:
        last = None
        for path in paths:
            url = f"{self._url}{path}"
            for payload in payloads:
                try:
                    resp = requests.post(url, headers=self._headers(), data=json.dumps(payload), timeout=timeout)
                except Exception as exc:
                    last = f"{url} request_error={exc}"
                    continue
                if resp.ok:
                    try:
                        return resp.json()
                    except Exception:
                        return {"raw_text": resp.text}
                last = f"{url} {resp.status_code} {resp.text}"
        raise EvolutionError(f"request failed: {last}")

    def _try_json_get(self, paths: list[str], query_params: list[Dict[str, Any]], timeout: int = 30) -> Dict[str, Any]:
        last = None
        for path in paths:
            url = f"{self._url}{path}"
            for params in query_params:
                try:
                    resp = requests.get(url, headers={"apikey": self._key}, params=params, timeout=timeout)
                except Exception as exc:
                    last = f"{url} request_error={exc}"
                    continue
                if resp.ok:
                    try:
                        return resp.json()
                    except Exception:
                        return {"raw_text": resp.text}
                last = f"{url} {resp.status_code} {resp.text}"
        raise EvolutionError(f"request failed: {last}")

    def send_text(
        self,
        instance: str,
        remote_jid: str,
        text: str,
        quoted_message_id: str | None = None,
        quoted_text: str | None = None,
    ) -> None:
        url = f"{self._url}/message/sendText/{instance}"
        payload: Dict[str, Any] = {"number": remote_jid, "text": text}
        if quoted_message_id:
            # Estrutura completa exigida pela Evolution API v2 para renderizar o quote
            payload["quoted"] = {
                "key": {"id": quoted_message_id},
                "message": {"conversation": quoted_text or "Áudio/Mensagem"},
            }
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

    def get_media_base64(self, instance: str, message_id: str) -> str:
        """
        Best-effort para Evolution 2.x (endpoint varia por build).
        """
        errors: list[str] = []
        data: Dict[str, Any] | None = None
        try:
            data = self._try_json_post(
                paths=[
                    f"/chat/getBase64FromMediaMessage/{instance}",
                    f"/chat/get-base64-from-media-message/{instance}",
                    f"/chat/get-media-base64/{instance}",
                    f"/message/getBase64FromMediaMessage/{instance}",
                ],
                payloads=[
                    {"messageId": message_id},
                    {"id": message_id},
                    {"message": {"key": {"id": message_id}}},
                    {"key": {"id": message_id}},
                ],
                timeout=60,
            )
        except EvolutionError as exc:
            errors.append(str(exc))

        if data is None:
            try:
                data = self._try_json_get(
                    paths=[
                        f"/chat/getBase64FromMediaMessage/{instance}",
                        f"/message/getBase64FromMediaMessage/{instance}",
                        f"/chat/get-media-base64/{instance}",
                    ],
                    query_params=[
                        {"messageId": message_id},
                        {"id": message_id},
                    ],
                    timeout=60,
                )
            except EvolutionError as exc:
                errors.append(str(exc))

        if data is None:
            raise EvolutionError(" | ".join(errors))

        for path in (
            ("data", "base64"),
            ("base64",),
            ("data", "message", "base64"),
        ):
            cur: Any = data
            ok = True
            for k in path:
                if isinstance(cur, dict) and k in cur:
                    cur = cur[k]
                else:
                    ok = False
                    break
            if ok and isinstance(cur, str) and cur.strip():
                return cur.strip()

        raise EvolutionError(f"media base64 not found in response: {str(data)[:500]}")
