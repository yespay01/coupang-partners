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
    try:
        return json.loads(content)
    except json.JSONDecodeError as exc:
        raise ValueError(
            "LLM 응답을 JSON 으로 파싱하지 못했습니다. 프롬프트 혹은 응답 형식을 확인해 주세요."
        ) from exc
