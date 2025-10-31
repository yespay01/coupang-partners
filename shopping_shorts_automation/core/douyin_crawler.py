from __future__ import annotations

import json
import os
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Optional
from urllib.parse import quote

from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from webdriver_manager.chrome import ChromeDriverManager
from yt_dlp import YoutubeDL

from .douyin_search import DouyinVideo


@dataclass(slots=True)
class DouyinCrawlerConfig:
    """Configuration for Selenium-based Douyin crawling."""

    headless: bool = True
    wait_seconds: float = 3.0
    scroll_pause_seconds: float = 2.0
    scroll_times: int = 5
    max_results: int = 10
    download_limit: int = 3
    download_audio_only: bool = False


class DouyinCrawler:
    """Fetch Douyin video metadata via Selenium and download via yt-dlp."""

    def __init__(self, config: DouyinCrawlerConfig | None = None) -> None:
        self.config = config or DouyinCrawlerConfig()
        self.cookie = os.environ.get("DOUYIN_COOKIE")

    def _build_driver(self) -> webdriver.Chrome:
        options = Options()
        if self.config.headless:
            options.add_argument("--headless=new")
        options.add_argument("--disable-gpu")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--window-size=1280,720")
        options.add_argument(
            "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        )
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=options)
        if self.cookie:
            driver.get("https://www.douyin.com/")
            driver.execute_script("document.cookie = arguments[0];", self.cookie)
            time.sleep(1)
        return driver

    def search(self, keyword: str) -> list[DouyinVideo]:
        """Perform Selenium search and return structured DouyinVideo list."""
        driver = self._build_driver()
        encoded = quote(keyword)
        url = f"https://www.douyin.com/search/{encoded}"
        try:
            driver.get(url)
            time.sleep(self.config.wait_seconds)

            body = driver.find_element(By.TAG_NAME, "body")
            for _ in range(self.config.scroll_times):
                body.send_keys(Keys.PAGE_DOWN)
                time.sleep(self.config.scroll_pause_seconds)

            html = driver.page_source
        finally:
            driver.quit()

        soup = BeautifulSoup(html, "html.parser")
        video_nodes = soup.select("div[role='listitem']") or soup.select("li[data-e2e='search-video-item']")

        videos: list[DouyinVideo] = []
        for node in video_nodes:
            if len(videos) >= self.config.max_results:
                break
            link_el = node.find("a", href=True)
            title_el = node.find("div", attrs={"data-e2e": "video-title"})
            author_el = node.find("span", attrs={"data-e2e": "video-author"})
            stats_el = node.find("span", attrs={"data-e2e": "video-views"})
            cover_img = node.find("img")

            share_url = link_el["href"] if link_el else ""
            if share_url.startswith("//"):
                share_url = f"https:{share_url}"
            elif share_url.startswith("/"):
                share_url = f"https://www.douyin.com{share_url}"
            title = (title_el.get_text(strip=True) if title_el else node.get_text(strip=True)) or ""
            author = author_el.get_text(strip=True) if author_el else ""
            play_count = self._parse_play_count(stats_el.get_text(strip=True) if stats_el else "0")
            cover_url = cover_img["src"] if cover_img and cover_img.has_attr("src") else ""

            videos.append(
                DouyinVideo(
                    title=title,
                    author=author,
                    play_count=play_count,
                    digg_count=0,
                    duration=0.0,
                    share_url=share_url,
                    cover_url=cover_url,
                )
            )

        return videos

    def download(self, videos: Iterable[DouyinVideo], output_dir: Path) -> list[dict[str, str]]:
        """Download selected videos using yt-dlp and return metadata."""
        downloads: list[dict[str, str]] = []
        download_dir = output_dir / "douyin_media"
        download_dir.mkdir(parents=True, exist_ok=True)

        ydl_opts = {
            "outtmpl": str(download_dir / "%(title).80s.%(ext)s"),
            "quiet": True,
            "writesubtitles": False,
            "ignoreerrors": True,
        }
        if self.config.download_audio_only:
            ydl_opts.update(
                {
                    "format": "bestaudio/best",
                    "postprocessors": [
                        {"key": "FFmpegExtractAudio", "preferredcodec": "mp3", "preferredquality": "192"}
                    ],
                }
            )

        with YoutubeDL(ydl_opts) as ydl:
            for idx, video in enumerate(videos):
                if idx >= self.config.download_limit:
                    break
                if not video.share_url:
                    continue
                try:
                    info = ydl.extract_info(video.share_url, download=True)
                except Exception:
                    continue
                filename = ydl.prepare_filename(info)
                downloads.append(
                    {
                        "title": info.get("title") or video.title,
                        "original_url": video.share_url,
                        "filepath": filename,
                        "thumbnail": info.get("thumbnail") or video.cover_url,
                        "duration": info.get("duration"),
                    }
                )

        (download_dir / "downloads.json").write_text(
            json.dumps(downloads, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        return downloads

    @staticmethod
    def _parse_play_count(text: Optional[str]) -> int:
        if not text:
            return 0
        text = text.lower().replace(",", "").strip()
        multiplier = 1
        if text.endswith("w"):
            multiplier = 10_000
            text = text[:-1]
        try:
            return int(float(text) * multiplier)
        except ValueError:
            return 0
