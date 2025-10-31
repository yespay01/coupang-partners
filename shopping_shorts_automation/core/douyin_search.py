from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any, Iterable, List

import requests

DEFAULT_API_ENDPOINT = "https://www.iesdouyin.com/web/api/v2/search/item/"


@dataclass(slots=True)
class DouyinVideo:
    """Representation of a Douyin short-form video result."""

    title: str
    author: str
    play_count: int
    digg_count: int
    duration: float
    share_url: str
    cover_url: str

    @classmethod
    def from_payload(cls, payload: dict[str, Any]) -> "DouyinVideo":
        video_info = payload.get("video", {})
        duration = float(video_info.get("duration", 0)) / 1000.0
        share_info = payload.get("share_info", {})
        author_info = payload.get("author", {})
        cover_info = video_info.get("cover", {}) or {}
        cover_urls = cover_info.get("url_list") or []

        return cls(
            title=payload.get("desc", "").strip(),
            author=author_info.get("nickname", ""),
            play_count=int(payload.get("statistics", {}).get("play_count") or 0),
            digg_count=int(payload.get("statistics", {}).get("digg_count") or 0),
            duration=duration,
            share_url=share_info.get("share_url", ""),
            cover_url=cover_urls[0] if cover_urls else "",
        )

    def as_dict(self) -> dict[str, Any]:
        return {
            "title": self.title,
            "author": self.author,
            "play_count": self.play_count,
            "digg_count": self.digg_count,
            "duration": self.duration,
            "share_url": self.share_url,
            "cover_url": self.cover_url,
        }


@dataclass(slots=True)
class DouyinSearchRequest:
    keyword: str
    max_results: int = 10
    offset: int = 0


class DouyinSearchService:
    """Simple Douyin search client using public web API."""

    def __init__(self, endpoint: str = DEFAULT_API_ENDPOINT) -> None:
        self.endpoint = endpoint
        self.session = requests.Session()
        self.session.headers.update(
            {
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/124.0.0.0 Safari/537.36"
                ),
                "Referer": "https://www.douyin.com/",
            }
        )
        cookie = os.environ.get("DOUYIN_COOKIE")
        if cookie:
            self.session.headers["Cookie"] = cookie

    def search(self, request: DouyinSearchRequest) -> list[DouyinVideo]:
        params = {
            "keyword": request.keyword,
            "count": request.max_results,
            "offset": request.offset,
            "search_source": "normal_search",
            "aid": 1128,
            "device_platform": "webapp",
        }

        try:
            response = self.session.get(self.endpoint, params=params, timeout=10)
            response.raise_for_status()
        except requests.RequestException:
            return []

        try:
            data = response.json()
        except ValueError:
            return []
        root_items = data.get("data", {})
        items: Iterable[dict[str, Any]] = root_items.get("items") or root_items.get("item_list") or data.get("item_list", [])
        videos: List[DouyinVideo] = []

        for item in items:
            try:
                videos.append(DouyinVideo.from_payload(item))
            except Exception:  # pragma: no cover - defensive
                continue
        return videos
