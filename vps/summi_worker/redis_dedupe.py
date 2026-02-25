from __future__ import annotations

import logging
from typing import Optional

try:
    import redis
except Exception:  # pragma: no cover
    redis = None  # type: ignore


logger = logging.getLogger("summi_worker.redis")


class RedisDedupe:
    def __init__(self, redis_url: Optional[str]):
        self._url = (redis_url or "").strip()
        self._client = None
        if self._url and redis is not None:
            try:
                self._client = redis.Redis.from_url(self._url, decode_responses=True)
            except Exception as exc:
                logger.warning("redis.init_failed error=%s", exc)
                self._client = None

    @property
    def enabled(self) -> bool:
        return self._client is not None

    def seen_or_mark(self, key: str, ttl_seconds: int) -> bool:
        """
        True se chave ja existia (duplicado), False se acabou de marcar.
        """
        if not self._client:
            return False
        try:
            ok = self._client.set(key, "1", ex=max(1, int(ttl_seconds)), nx=True)
            return ok is None
        except Exception as exc:
            logger.warning("redis.set_failed key=%s error=%s", key, exc)
            return False

