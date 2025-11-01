from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

try:
    import streamlit as st
    from streamlit.runtime.scriptrunner import get_script_run_ctx
    HAS_STREAMLIT = True
except ImportError:
    HAS_STREAMLIT = False


@dataclass(frozen=True)
class ProjectPaths:
    """Bundle of resolved project paths."""

    base_dir: Path
    prompts_dir: Path
    output_root: Path

    @staticmethod
    def discover() -> "ProjectPaths":
        """Infer core project folders relative to this file."""
        base_dir = Path(__file__).resolve().parents[1]

        # Determine output directory based on environment
        # Use /tmp in Streamlit Cloud (read-only filesystem), local path otherwise
        if HAS_STREAMLIT and get_script_run_ctx() is not None:
            # Running in Streamlit - use /tmp for cloud compatibility
            output_root = Path("/tmp") / "project_output"
        else:
            # Running locally or in tests
            output_root = base_dir / "project_output"

        return ProjectPaths(
            base_dir=base_dir,
            prompts_dir=base_dir / "prompts",
            output_root=output_root,
        )


def slugify(value: str) -> str:
    """Generate a filesystem-friendly slug from Korean or English text."""
    # Replace whitespace and special chars with underscores after trimming.
    value = value.strip()
    value = re.sub(r"[^\w\s-]", "", value, flags=re.UNICODE)
    value = re.sub(r"[-\s]+", "_", value, flags=re.UNICODE)
    return value[:80] if value else "output"


def load_prompt(prompt_name: str) -> str:
    """Read a prompt template from the prompts directory."""
    paths = ProjectPaths.discover()
    prompt_path = paths.prompts_dir / prompt_name
    if not prompt_path.exists():
        raise FileNotFoundError(f"Prompt not found: {prompt_path}")
    return prompt_path.read_text(encoding="utf-8")


def today_stamp() -> str:
    """Return current date as YYYYMMDD string."""
    return datetime.now().strftime("%Y%m%d")


def ensure_json(content: str) -> Any:
    """Parse JSON output (object or array) and raise informative error on failure."""
    # Clean up common LLM response formats
    cleaned = content.strip()

    # Remove markdown code blocks if present (```json ... ``` or ``` ... ```)
    if cleaned.startswith("```"):
        # Find the start of JSON (after ```json or ```)
        lines = cleaned.split("\n")
        if lines[0].startswith("```"):
            lines = lines[1:]  # Remove first line
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]  # Remove last line
        cleaned = "\n".join(lines).strip()

    # Try to extract JSON if there's text before/after
    # Look for { or [ to find JSON start
    json_start = -1
    for i, char in enumerate(cleaned):
        if char in ['{', '[']:
            json_start = i
            break

    if json_start > 0:
        cleaned = cleaned[json_start:]

    # Find JSON end (matching bracket)
    if cleaned.startswith('{'):
        bracket_count = 0
        for i, char in enumerate(cleaned):
            if char == '{':
                bracket_count += 1
            elif char == '}':
                bracket_count -= 1
                if bracket_count == 0:
                    cleaned = cleaned[:i+1]
                    break
    elif cleaned.startswith('['):
        bracket_count = 0
        for i, char in enumerate(cleaned):
            if char == '[':
                bracket_count += 1
            elif char == ']':
                bracket_count -= 1
                if bracket_count == 0:
                    cleaned = cleaned[:i+1]
                    break

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise ValueError(
            f"LLM 응답을 JSON 으로 파싱하지 못했습니다. 프롬프트 혹은 응답 형식을 확인해 주세요.\n"
            f"응답 내용: {content[:200]}..."
        ) from exc
