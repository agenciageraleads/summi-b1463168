from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Dict, Optional

from redis import Redis


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
