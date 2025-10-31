from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

from .utils import ProjectPaths, slugify, today_stamp


@dataclass(slots=True)
class OutputContext:
    product_name: str
    target_audience: str
    tone: str
    style: str
    language: str
    brand_voice: str | None = None


class OutputManager:
    """Handle directory creation and writing structured output files."""

    def __init__(self, paths: ProjectPaths | None = None) -> None:
        self.paths = paths or ProjectPaths.discover()
        self.paths.output_root.mkdir(parents=True, exist_ok=True)

    def create_output_dir(self, product_name: str) -> Path:
        folder_name = f"{slugify(product_name)}_{today_stamp()}"
        output_dir = self.paths.output_root / folder_name
        output_dir.mkdir(parents=True, exist_ok=True)
        return output_dir

    def write_text(self, output_dir: Path, filename: str, lines: Iterable[str]) -> Path:
        path = output_dir / filename
        text = "\n".join(str(line).strip() for line in lines)
        path.write_text(text.strip() + "\n", encoding="utf-8")
        return path

    def write_json(self, output_dir: Path, filename: str, data: Any) -> Path:
        path = output_dir / filename
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        return path
