from __future__ import annotations

import os
from typing import Any, Iterable

from openai import OpenAI
from tenacity import retry, stop_after_attempt, wait_exponential


class OpenAIClient:
    """Wrapper around the OpenAI chat completion API with sensible defaults."""

    def __init__(
        self,
        model: str | None = None,
        temperature: float = 0.7,
    ) -> None:
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            raise EnvironmentError("OPENAI_API_KEY 가 설정되지 않았습니다.")

        self.client = OpenAI(api_key=api_key)
        self.model = model or os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
        self.temperature = temperature

    @retry(wait=wait_exponential(multiplier=1, min=2, max=10), stop=stop_after_attempt(3))
    def send(self, messages: Iterable[dict[str, Any]], **kwargs: Any) -> str:
        """Send a chat completion request and return the model message content."""
        response = self.client.chat.completions.create(
            model=self.model,
            messages=list(messages),
            temperature=kwargs.get("temperature", self.temperature),
            max_tokens=kwargs.get("max_tokens", 1200),
        )
        choice = response.choices[0]
        return choice.message.content or ""
