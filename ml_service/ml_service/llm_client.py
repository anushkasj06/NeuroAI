from __future__ import annotations

import json
import os
from urllib import error as urllib_error
from urllib import request as urllib_request

from fastapi import HTTPException

# Notice: agar ai model badmashi kare toh kripya gemma4:31b-cloud ya deepseek-v3.1:671b-cloud use karle... mujhe galiya na dene ki kripa kare ispe meri koi galti nahi! Dhanyabad!

def _call_ollama(base_url: str, model: str, system_prompt: str, user_prompt: str, temperature: float, timeout: int = 180) -> str:
    """Call Ollama via its OpenAI-compatible API."""
    # print("Ollama url: " , os.getenv("OLLAMA_URL") , " Ollama model: " , os.getenv("OLLAMA_MODEL"), "Ollama API: " , os.getenv("OLLAMA_API_KEY"));
    payload = json.dumps({
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": temperature,
        "max_tokens": 1024,
        "stream": False,
    }).encode("utf-8")

    if not base_url:
        base_url = "https://ollama.com"
        
    endpoint = base_url.rstrip('/')
    # If using OpenAI compatible API, ensure /v1 is in the URL, otherwise just use /api/chat if they provided it directly
    if not endpoint.endswith('/v1') and not endpoint.endswith('/api'):
        # Prefer OpenAI-compatible endpoint as the code expects "choices"
        endpoint += '/v1/chat/completions'
    elif endpoint.endswith('/v1'):
        endpoint += '/chat/completions'
    elif endpoint.endswith('/api'):
        endpoint += '/chat'

    # print("endpoint", endpoint)
    req = urllib_request.Request(
        endpoint,
        data=payload,
        headers={"Authorization": f"Bearer {os.getenv('OLLAMA_API_KEY')}", "Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib_request.urlopen(req, timeout=timeout) as response:
            data = json.loads(response.read().decode("utf-8"))
    except urllib_error.HTTPError as e:
        body = e.read().decode("utf-8", errors="ignore")
        print(f"DEBUG: HTTP Error {e.code}: {body}")
        raise e

    # Handle both OpenAI-compatible format ("choices") and Ollama native format ("message")
    if "choices" in data:
        return str(data["choices"][0]["message"]["content"]).strip()
    elif "message" in data:
        return str(data["message"]["content"]).strip()
    else:
        return str(data).strip()


# ─── Config ───────────────────────────────────────────────────────

_OLLAMA_URL = os.getenv("OLLAMA_URL")

# Read model lazily so dotenv has a chance to load first
def _get_model() -> str:
    return os.getenv("OLLAMA_MODEL")

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
