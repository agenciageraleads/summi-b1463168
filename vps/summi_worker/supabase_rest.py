from __future__ import annotations

import datetime as dt
import json
from typing import Any, Dict, Iterable, List, Optional, Tuple
from urllib.parse import urlencode

import requests


class SupabaseError(RuntimeError):
    pass


def _iso_now() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat()


class SupabaseRest:
    """
    Minimal Supabase PostgREST wrapper using service role to bypass RLS.
    """

    def __init__(self, supabase_url: str, service_role_key: str):
        self._url = supabase_url.rstrip("/")
        self._key = service_role_key

    def _headers(self) -> Dict[str, str]:
        return {
            "apikey": self._key,
            "Authorization": f"Bearer {self._key}",
            "Content-Type": "application/json",
        }

    def select(
        self,
        table: str,
        select: str = "*",
        filters: Optional[List[Tuple[str, str]]] = None,
        order: Optional[str] = None,
        limit: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        params: Dict[str, str] = {"select": select}
        if order:
            params["order"] = order
        if limit is not None:
            params["limit"] = str(limit)

        if filters:
            for k, v in filters:
                params[k] = v

        url = f"{self._url}/rest/v1/{table}?{urlencode(params, doseq=True)}"
        resp = requests.get(url, headers=self._headers(), timeout=30)
        if not resp.ok:
            raise SupabaseError(f"select failed: {resp.status_code} {resp.text}")
        return resp.json()

    def patch(
        self,
        table: str,
        data: Dict[str, Any],
        filters: List[Tuple[str, str]],
    ) -> int:
        params: Dict[str, str] = {}
        for k, v in filters:
            params[k] = v

        url = f"{self._url}/rest/v1/{table}?{urlencode(params, doseq=True)}"
        resp = requests.patch(
            url,
            headers={**self._headers(), "Prefer": "return=minimal"},
            data=json.dumps(data),
            timeout=30,
        )
        if not resp.ok:
            raise SupabaseError(f"patch failed: {resp.status_code} {resp.text}")
        # PostgREST doesn't return affected rows reliably without return=representation; keep it simple.
        return 1

    def insert(self, table: str, rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        url = f"{self._url}/rest/v1/{table}"
        resp = requests.post(
            url,
            headers={**self._headers(), "Prefer": "return=representation"},
            data=json.dumps(rows),
            timeout=30,
        )
        if not resp.ok:
            raise SupabaseError(f"insert failed: {resp.status_code} {resp.text}")
        return resp.json()

    def upsert(
        self,
        table: str,
        rows: List[Dict[str, Any]],
        on_conflict: str,
    ) -> None:
        url = f"{self._url}/rest/v1/{table}?{urlencode({'on_conflict': on_conflict})}"
        resp = requests.post(
            url,
            headers={**self._headers(), "Prefer": "resolution=merge-duplicates,return=minimal"},
            data=json.dumps(rows),
            timeout=30,
        )
        if not resp.ok:
            raise SupabaseError(f"upsert failed: {resp.status_code} {resp.text}")

    def rpc(self, fn: str, payload: Dict[str, Any]) -> Any:
        url = f"{self._url}/rest/v1/rpc/{fn}"
        resp = requests.post(url, headers=self._headers(), data=json.dumps(payload), timeout=30)
        if not resp.ok:
            raise SupabaseError(f"rpc failed: {resp.status_code} {resp.text}")
        return resp.json()


def to_postgrest_filter_eq(column: str, value: str) -> Tuple[str, str]:
    return (column, f"eq.{value}")


def to_postgrest_filter_neq(column: str, value: str) -> Tuple[str, str]:
    return (column, f"neq.{value}")


def to_postgrest_filter_gte(column: str, value: str) -> Tuple[str, str]:
    return (column, f"gte.{value}")


def to_postgrest_filter_is(column: str, value: str) -> Tuple[str, str]:
    # example: is.null
    return (column, f"is.{value}")
