from __future__ import annotations

import json
import os
from urllib import error as urllib_error
from urllib import request as urllib_request

from fastapi import HTTPException


def _call_ollama(base_url: str, model: str, system_prompt: str, user_prompt: str, temperature: float, timeout: int = 180) -> str:
    """Call Ollama via its OpenAI-compatible API."""
    payload = json.dumps({
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": temperature,
        "max_tokens": 1024,
    }).encode("utf-8")

    req = urllib_request.Request(
        f"{base_url.rstrip('/')}/chat/completions",
        data=payload,
        headers={"Authorization": "Bearer ollama", "Content-Type": "application/json"},
        method="POST",
    )

    with urllib_request.urlopen(req, timeout=timeout) as response:
        data = json.loads(response.read().decode("utf-8"))

    return str(data["choices"][0]["message"]["content"]).strip()


# ─── Config ───────────────────────────────────────────────────────

_OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434/v1").strip()
# Read model lazily so dotenv has a chance to load first
def _get_model() -> str:
    return os.getenv("OLLAMA_MODEL", "llama3").strip() or "llama3"

_OLLAMA_MODEL = _get_model()
_last_successful_provider: dict = {"name": "ollama", "model": _OLLAMA_MODEL}


def get_last_provider() -> dict:
    return dict(_last_successful_provider)


def _get_providers() -> list[dict]:
    """Return provider list for /llm-status endpoint."""
    return [{"name": "ollama", "model": _OLLAMA_MODEL}]


def _get_ollama_config() -> dict:
    return {"name": "ollama", "model": _OLLAMA_MODEL, "url": _OLLAMA_URL}


# ─── Main LLM Call ────────────────────────────────────────────────

def call_llm(system_prompt: str, user_prompt: str, temperature: float = 0.2) -> str:
    """Call Ollama LLM with Redis caching."""
    global _last_successful_provider

    # Always read model from env at call time so dotenv values are respected
    model = _get_model()

    # Check cache first
    from .cache import cache_get, cache_set, TTL_LLM_RESPONSE
    cache_args = (system_prompt[:100], user_prompt[:200], temperature)
    cached = cache_get("llm", *cache_args)
    if cached:
        _last_successful_provider = {"name": "cache", "model": "cached"}
        return cached

    # Call Ollama
    try:
        result = _call_ollama(_OLLAMA_URL, model, system_prompt, user_prompt, temperature)
    except urllib_error.HTTPError as e:
        body = e.read().decode("utf-8", errors="ignore")[:200]
        raise HTTPException(status_code=502, detail=f"Ollama error: {e.code} {body}") from e
    except urllib_error.URLError as e:
        raise HTTPException(status_code=502, detail=f"Ollama unreachable at {_OLLAMA_URL}: {e.reason}") from e
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Ollama failed: {str(e)[:150]}") from e

    _last_successful_provider = {"name": "ollama", "model": _OLLAMA_MODEL}

    # Cache the result
    if result:
        cache_set("llm", result, TTL_LLM_RESPONSE, *cache_args)

    return result
