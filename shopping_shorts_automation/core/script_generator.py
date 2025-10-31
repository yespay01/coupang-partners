from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .openai_client import OpenAIClient
from .utils import ensure_json, load_prompt


@dataclass(slots=True)
class ScriptRequest:
    product_name: str
    target_audience: str
    tone: str
    language: str
    style: str
    brand_voice: str | None = None


class ScriptService:
    """Generate short-form commerce video assets using GPT models."""

    SYSTEM_PROMPT = (
        "당신은 쇼핑 숏폼 대본을 전문적으로 작성하는 시니어 카피라이터입니다. "
        "상품의 장점과 감성을 30초 분량으로 설득력 있게 구성하세요. "
        "응답은 반드시 JSON 형식으로만 작성합니다."
    )

    def __init__(self, client: OpenAIClient | None = None) -> None:
        self.client = client or OpenAIClient()
        self._script_template = load_prompt("script_prompt.txt")
        self._thumbnail_template = load_prompt("thumbnail_prompt.txt")

    def generate_bundle(self, request: ScriptRequest) -> dict[str, Any]:
        """Create script, description, and thumbnail copy bundle."""
        script_result = self._generate_script(request)
        thumbnail_options = self._generate_thumbnail_options(request, script_result["hook"])
        return {
            "script": script_result["script"],
            "hook": script_result["hook"],
            "cta": script_result["cta"],
            "talking_points": script_result.get("talking_points", []),
            "description": script_result.get("description", ""),
            "duration_seconds": script_result.get("duration_seconds", 30),
            "thumbnail_options": thumbnail_options,
            "raw_script_payload": script_result,
        }

    def _generate_script(self, request: ScriptRequest) -> dict[str, Any]:
        prompt = self._script_template.format(
            product_name=request.product_name,
            target_audience=request.target_audience,
            tone=request.tone,
            style=request.style,
            language=request.language,
            brand_voice=request.brand_voice or "특별한 브랜드 보이스 없음",
        )

        response_text = self.client.send(
            [
                {"role": "system", "content": self.SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ]
        )
        return ensure_json(response_text)

    def _generate_thumbnail_options(self, request: ScriptRequest, hook: str) -> list[str]:
        prompt = self._thumbnail_template.format(
            product_name=request.product_name,
            target_audience=request.target_audience,
            tone=request.tone,
            style=request.style,
            hook=hook,
        )
        response_text = self.client.send(
            [
                {
                    "role": "system",
                    "content": (
                        "당신은 짧고 임팩트 있는 한국어 카피를 만드는 숏폼 마케터입니다. "
                        "출력은 JSON 배열 형태로만 응답하세요."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.8,
        )
        parsed = ensure_json(response_text)
        if isinstance(parsed, dict) and "options" in parsed:
            return list(parsed["options"])
        if isinstance(parsed, list):
            return [str(option) for option in parsed]
        raise ValueError("썸네일 문구 응답 형식이 올바르지 않습니다.")
