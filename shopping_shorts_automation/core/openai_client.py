from __future__ import annotations

import os
import time
from typing import Any, Iterable

from tenacity import retry, stop_after_attempt, wait_exponential

try:
    import streamlit as st
    HAS_STREAMLIT = True
except ImportError:
    HAS_STREAMLIT = False


class OpenAIClient:
    """Wrapper around AI chat completion APIs (supports OpenAI and Google Gemini)."""

    def __init__(
        self,
        model: str | None = None,
        temperature: float = 0.7,
    ) -> None:
        # Determine which AI provider to use
        self.provider = self._get_config("AI_PROVIDER", "gemini").lower()
        self.temperature = temperature

        if self.provider == "gemini":
            self._init_gemini(model)
        elif self.provider == "openai":
            self._init_openai(model)
        else:
            raise ValueError(f"Unsupported AI provider: {self.provider}")

    def _get_config(self, key: str, default: str = "") -> str:
        """Get config from Streamlit secrets or environment variables."""
        # Check if running in Streamlit context
        if HAS_STREAMLIT:
            try:
                from streamlit.runtime.scriptrunner import get_script_run_ctx
                if get_script_run_ctx() is not None and hasattr(st, 'secrets') and key in st.secrets:
                    return st.secrets[key]
            except Exception:
                pass  # Not in Streamlit context, fall back to environment
        return os.environ.get(key, default)

    def _init_gemini(self, model: str | None) -> None:
        """Initialize Google Gemini client."""
        try:
            import google.generativeai as genai
        except ImportError:
            raise ImportError(
                "google-generativeai 패키지가 필요합니다. "
                "pip install google-generativeai 로 설치하세요."
            )

        api_key = self._get_config("GEMINI_API_KEY")
        if not api_key:
            raise EnvironmentError("GEMINI_API_KEY 가 설정되지 않았습니다.")

        genai.configure(api_key=api_key)
        self.model = model or self._get_config("GEMINI_MODEL", "gemini-1.5-flash")
        self.client = genai.GenerativeModel(self.model)

    def _init_openai(self, model: str | None) -> None:
        """Initialize OpenAI client."""
        try:
            from openai import OpenAI
        except ImportError:
            raise ImportError(
                "openai 패키지가 필요합니다. "
                "pip install openai 로 설치하세요."
            )

        api_key = self._get_config("OPENAI_API_KEY")
        if not api_key:
            raise EnvironmentError("OPENAI_API_KEY 가 설정되지 않았습니다.")

        self.client = OpenAI(api_key=api_key)
        self.model = model or self._get_config("OPENAI_MODEL", "gpt-4o-mini")

    @retry(wait=wait_exponential(multiplier=2, min=4, max=60), stop=stop_after_attempt(5))
    def send(self, messages: Iterable[dict[str, Any]], **kwargs: Any) -> str:
        """Send a chat completion request and return the model message content."""
        if self.provider == "gemini":
            return self._send_gemini(list(messages), **kwargs)
        elif self.provider == "openai":
            return self._send_openai(list(messages), **kwargs)
        else:
            raise ValueError(f"Unsupported provider: {self.provider}")

    def _send_openai(self, messages: list[dict[str, Any]], **kwargs: Any) -> str:
        """Send request to OpenAI API."""
        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=kwargs.get("temperature", self.temperature),
            max_tokens=kwargs.get("max_tokens", 1200),
        )
        return response.choices[0].message.content or ""

    def _send_gemini(self, messages: list[dict[str, Any]], **kwargs: Any) -> str:
        """Send request to Google Gemini API."""
        import google.generativeai as genai

        # Convert OpenAI message format to Gemini format
        system_instruction = None
        prompt_parts = []

        for msg in messages:
            role = msg.get("role", "")
            content = msg.get("content", "")

            if role == "system":
                # Gemini uses system_instruction instead of system messages
                system_instruction = content
            elif role == "user" or role == "assistant":
                # Combine all messages into a single prompt
                prompt_parts.append(content)

        # Combine all parts into a single prompt
        full_prompt = "\n\n".join(prompt_parts) if prompt_parts else "Hello"

        # Create model with system instruction if provided
        if system_instruction:
            model = genai.GenerativeModel(
                self.model,
                system_instruction=system_instruction
            )
        else:
            model = self.client

        # Generate content directly (simpler and more reliable)
        response = model.generate_content(
            full_prompt,
            generation_config={
                "temperature": kwargs.get("temperature", self.temperature),
                "max_output_tokens": kwargs.get("max_tokens", 1200),
            }
        )

        # Add delay to avoid rate limits (Gemini free tier: 15 RPM)
        # Wait 6 seconds between requests to stay well under limit
        time.sleep(6)

        return response.text
