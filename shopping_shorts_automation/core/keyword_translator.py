from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .openai_client import OpenAIClient
from .utils import ensure_json, load_prompt


@dataclass(slots=True)
class KeywordRequest:
    product_name: str
    target_audience: str
    tone: str
    style: str
    language: str = "ko"


class KeywordTranslator:
    """Translate and expand keyword sets for Douyin searches."""

    SYSTEM_PROMPT = (
        "당신은 이커머스 마케팅 키워드 전략가입니다. "
        "상품에 대한 검색 키워드를 한국어와 중국어 간체로 구성하고, "
        "Douyin 검색에 적합한 제안 검색어를 만들어 주세요. "
        "응답은 JSON 객체로만 작성합니다."
    )

    def __init__(self, client: OpenAIClient | None = None) -> None:
        self.client = client or OpenAIClient(temperature=0.3)
        self._prompt_template = load_prompt("translation_prompt.txt")

    def translate(self, request: KeywordRequest) -> dict[str, Any]:
        prompt = self._prompt_template.format(
            product_name=request.product_name,
            target_audience=request.target_audience,
            tone=request.tone,
            style=request.style,
        )
        response_text = self.client.send(
            [
                {"role": "system", "content": self.SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            temperature=0.4,
        )
        payload = ensure_json(response_text)
        if not isinstance(payload, dict):
            raise ValueError("키워드 응답이 JSON 객체 형식이 아닙니다.")
        return payload
