from __future__ import annotations

import time
from typing import Iterable

from anthropic import Anthropic

from .base import ProviderError, format_provider_error


class AnthropicProvider:
    def __init__(
        self,
        api_key: str,
        base_url: str,
        client: Anthropic | None = None,
        health_check_model: str = "claude-haiku-4-5-20251001",
    ):
        self._client = client or Anthropic(api_key=api_key, base_url=base_url, timeout=300.0)
        self._health_check_model = health_check_model
        self._health_cache: tuple[float, bool] | None = None

    def chat(
        self,
        messages: list[dict[str, str]],
        *,
        model: str,
        temperature: float,
        max_tokens: int,
        system: str | None = None,
    ) -> str:
        kwargs: dict = {
            "model": model,
            "max_tokens": max_tokens,
            "messages": messages,
            "temperature": temperature,
        }
        if system is not None:
            kwargs["system"] = system

        try:
            response = self._client.messages.create(**kwargs)
        except Exception as e:
            raise ProviderError(f"Anthropic chat failed: {format_provider_error(e)}") from e

        text_parts = [
            block.text for block in response.content if block.type == "text" and block.text
        ]
        content = "\n".join(text_parts).strip()
        if not content:
            raise ProviderError("Model returned empty response.")
        return content

    def stream_chat(
        self,
        messages: list[dict[str, str]],
        *,
        model: str,
        temperature: float,
        max_tokens: int,
        system: str | None = None,
    ) -> Iterable[str]:
        kwargs: dict = {
            "model": model,
            "max_tokens": max_tokens,
            "messages": messages,
            "temperature": temperature,
            "stream": True,
        }
        if system is not None:
            kwargs["system"] = system

        try:
            stream = self._client.messages.create(**kwargs)
        except Exception as e:
            raise ProviderError(f"Anthropic stream failed: {format_provider_error(e)}") from e

        for event in stream:
            if event.type == "content_block_delta" and event.delta.type == "text_delta":
                yield event.delta.text

    def health_check(self, ttl: float = 60.0) -> bool:
        # Minimal connectivity check: 1 token on the cheapest model.
        # No lightweight model-listing endpoint in the Anthropic SDK, so we
        # send the smallest possible completion request.  The model is
        # configurable to allow callers to use an even cheaper tier if one
        # becomes available.
        #
        # Results are cached for `ttl` seconds to avoid repeated token-consuming
        # calls when health checks are invoked frequently (e.g. by the Node
        # gateway or UI polling).
        now = time.monotonic()
        if self._health_cache is not None:
            cached_at, cached_result = self._health_cache
            if now - cached_at < ttl:
                return cached_result

        try:
            self._client.messages.create(
                model=self._health_check_model,
                max_tokens=1,
                messages=[{"role": "user", "content": "hi"}],
            )
            self._health_cache = (now, True)
            return True
        except Exception:
            self._health_cache = (now, False)
            return False
