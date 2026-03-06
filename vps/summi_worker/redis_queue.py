from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Dict, Optional

from redis import Redis


RUN_NOW_RESULT_KEY_PREFIX = "summi:run_now:result:"


def run_now_result_key(job_id: str) -> str:
    return f"{RUN_NOW_RESULT_KEY_PREFIX}{job_id}"


@dataclass
class RedisQueueClient:
    redis: Redis

    @classmethod
    def from_url(cls, url: str) -> "RedisQueueClient":
        return cls(redis=Redis.from_url(url, decode_responses=True))

    def enqueue(self, queue_name: str, payload: Dict[str, Any]) -> None:
        self.redis.rpush(queue_name, json.dumps(payload, ensure_ascii=False))

    def dequeue_blocking(self, queue_name: str, timeout_seconds: int = 5) -> Optional[Dict[str, Any]]:
        item = self.redis.blpop(queue_name, timeout=timeout_seconds)
        if not item:
            return None
        _, raw = item
        return json.loads(raw)

    def set_json(self, key: str, payload: Dict[str, Any], ttl_seconds: int) -> None:
        self.redis.set(key, json.dumps(payload, ensure_ascii=False), ex=max(1, int(ttl_seconds)))

    def get_json(self, key: str) -> Optional[Dict[str, Any]]:
        raw = self.redis.get(key)
        if not raw:
            return None
        try:
            return json.loads(raw)
        except Exception:
            return None
