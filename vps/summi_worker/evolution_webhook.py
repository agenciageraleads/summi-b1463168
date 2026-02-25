from __future__ import annotations

import datetime as dt
from typing import Any, Dict, List, Optional


def _now_utc_iso() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat()


def _extract_remote_jid(payload: Dict[str, Any]) -> Optional[str]:
    # Tentativas comuns (varia por versao/adapter)
    for path in (
        ("body", "data", "key", "remoteJid"),
        ("body", "data", "remoteJid"),
        ("data", "key", "remoteJid"),
        ("data", "remoteJid"),
        ("remoteJid",),
        ("key", "remoteJid"),
    ):
        cur: Any = payload
        ok = True
        for k in path:
            if isinstance(cur, dict) and k in cur:
                cur = cur[k]
            else:
                ok = False
                break
        if ok and isinstance(cur, str) and cur.strip():
            jid = cur.strip()
            # Normaliza formatos comuns: "551199...@s.whatsapp.net"
            if "@" in jid:
                jid = jid.split("@", 1)[0]
            return jid
    return None


def _extract_push_name(payload: Dict[str, Any]) -> Optional[str]:
    for path in (
        ("body", "data", "pushName"),
        ("data", "pushName"),
        ("data", "sender", "pushName"),
        ("pushName",),
    ):
        cur: Any = payload
        ok = True
        for k in path:
            if isinstance(cur, dict) and k in cur:
                cur = cur[k]
            else:
                ok = False
                break
        if ok and isinstance(cur, str) and cur.strip():
            return cur.strip()
    return None


def _extract_instance_name(payload: Dict[str, Any]) -> Optional[str]:
    for path in (
        ("body", "instance"),
        ("body", "instanceName"),
        ("instance",),
        ("instanceName",),
        ("data", "instance"),
        ("data", "instanceName"),
        ("data", "instance", "instanceName"),
        ("data", "instance", "name"),
    ):
        cur: Any = payload
        ok = True
        for k in path:
            if isinstance(cur, dict) and k in cur:
                cur = cur[k]
            else:
                ok = False
                break
        if ok and isinstance(cur, str) and cur.strip():
            return cur.strip()
    return None


def _extract_text(payload: Dict[str, Any]) -> Optional[str]:
    # Baileys-like payloads
    for path in (
        ("body", "data", "message", "conversation"),
        ("body", "data", "message", "extendedTextMessage", "text"),
        ("body", "data", "message", "imageMessage", "caption"),
        ("data", "message", "conversation"),
        ("data", "message", "extendedTextMessage", "text"),
        ("data", "message", "imageMessage", "caption"),
        ("message", "conversation"),
    ):
        cur: Any = payload
        ok = True
        for k in path:
            if isinstance(cur, dict) and k in cur:
                cur = cur[k]
            else:
                ok = False
                break
        if ok and isinstance(cur, str) and cur.strip():
            return cur.strip()
    return None


def _extract_event(payload: Dict[str, Any]) -> Optional[str]:
    for path in (
        ("body", "event"),
        ("event",),
    ):
        cur: Any = payload
        ok = True
        for k in path:
            if isinstance(cur, dict) and k in cur:
                cur = cur[k]
            else:
                ok = False
                break
        if ok and isinstance(cur, str) and cur.strip():
            return cur.strip()
    return None


def _extract_from_me(payload: Dict[str, Any]) -> Optional[bool]:
    for path in (
        ("body", "data", "key", "fromMe"),
        ("data", "key", "fromMe"),
        ("key", "fromMe"),
    ):
        cur: Any = payload
        ok = True
        for k in path:
            if isinstance(cur, dict) and k in cur:
                cur = cur[k]
            else:
                ok = False
                break
        if ok and isinstance(cur, bool):
            return cur
    return None


def normalize_message_event(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Retorna um registro "minimo" para ser armazenado em chats.conversa[].
    Mantemos um campo `raw` para debug, porque o schema do webhook varia.
    """
    return {
        "received_at": _now_utc_iso(),
        "event": _extract_event(payload),
        "instance_name": _extract_instance_name(payload),
        "remote_jid": _extract_remote_jid(payload),
        "push_name": _extract_push_name(payload),
        "from_me": _extract_from_me(payload),
        "text": _extract_text(payload),
        "raw": payload,
    }
