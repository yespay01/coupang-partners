from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import pandas as pd


@dataclass(slots=True)
class ChecklistItem:
    task: str
    owner: str
    status: str = "pending"
    notes: str = ""


class ChecklistBuilder:
    """Build a CSV checklist based on the agreed workflow."""

    TEMPLATE: tuple[ChecklistItem, ...] = (
        ChecklistItem("AI 대본 생성 확인", "기획"),
        ChecklistItem("썸네일 문구 확정", "디자인"),
        ChecklistItem("중국어 키워드 검토", "운영"),
        ChecklistItem("Douyin 검색 & 레퍼런스 수집", "운영"),
        ChecklistItem("Typecast 음성 제작", "운영"),
        ChecklistItem("CapCut 편집", "편집"),
        ChecklistItem("검수 & 업로드", "운영"),
        ChecklistItem("성과 기록 업데이트", "운영"),
    )

    def build(self, extra_items: Iterable[ChecklistItem] | None = None) -> list[ChecklistItem]:
        """Return checklist items including optional additional tasks."""
        items = list(self.TEMPLATE)
        if extra_items:
            items.extend(extra_items)
        return items

    def export(self, output_dir: Path, items: Iterable[ChecklistItem]) -> Path:
        """Persist checklist items as UTF-8 CSV."""
        data = [
            {
                "task": item.task,
                "owner": item.owner,
                "status": item.status,
                "notes": item.notes,
            }
            for item in items
        ]
        df = pd.DataFrame(data, columns=["task", "owner", "status", "notes"])
        csv_path = output_dir / "checklist.csv"
        df.to_csv(csv_path, index=False, encoding="utf-8-sig")
        return csv_path
