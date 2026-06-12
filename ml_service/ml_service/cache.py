"""No-op cache — all functions are stubs so callers work unchanged without Redis."""
from __future__ import annotations

TTL_LLM_RESPONSE   = 3600
TTL_RECOMMENDATIONS = 1800
TTL_SKILL_GAP       = 3600
TTL_MARKET          = 7200


def cache_get(prefix: str, *args) -> str | None:
    return None


def cache_set(prefix: str, value: str, ttl: int, *args) -> None:
    pass


def cache_get_json(prefix: str, *args) -> dict | list | None:
    return None


def cache_set_json(prefix: str, value, ttl: int, *args) -> None:
    pass


def cache_delete(prefix: str, *args) -> bool:
    return False


def cache_clear_prefix(prefix: str) -> int:
    return 0
