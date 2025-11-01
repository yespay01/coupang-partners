from __future__ import annotations

import sys
import os
from dataclasses import asdict
from pathlib import Path
from typing import Any

import streamlit as st
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parents[1]

if str(BASE_DIR) not in sys.path:
    sys.path.append(str(BASE_DIR))

from core import (
    ChecklistBuilder,
    DouyinCrawler,
    DouyinCrawlerConfig,
    DouyinSearchRequest,
    DouyinSearchService,
    DouyinVideo,
    KeywordRequest,
    KeywordTranslator,
    OutputManager,
    ProjectPaths,
    ScriptRequest,
    ScriptService,
    slugify,
)

load_dotenv()

st.set_page_config(
    page_title="쇼핑 쇼츠 반자동 제작 시스템",
    page_icon="🎬",
    layout="centered",
)


def env_flag(name: str, default: str = "false") -> bool:
    """Read boolean-like environment variable."""
    value = os.getenv(name, default)
    if value is None:
        return False
    return value.strip().lower() in {"1", "true", "yes", "y"}


def env_int(name: str, default: int) -> int:
    """Read integer environment variable with fallback."""
    value = os.getenv(name)
    if value is None:
        return default
    try:
        return int(value)
    except ValueError:
        return default


def main() -> None:
    st.title("🎬 쇼핑 쇼츠 반자동 제작 시스템")
    st.caption("Phase 1: AI 기반 기획 자동화 · Phase 2: 영상 소스 자동화")

    # Initialize session state for history
    if "history" not in st.session_state:
        st.session_state.history = []
    if "current_result" not in st.session_state:
        st.session_state.current_result = None

    # Sidebar: History
    with st.sidebar:
        st.header("📋 생성 히스토리")
        if st.session_state.history:
            st.caption(f"총 {len(st.session_state.history)}개의 결과")
            for idx, item in enumerate(reversed(st.session_state.history), start=1):
                with st.expander(f"{idx}. {item['product_name'][:20]}...", expanded=False):
                    st.caption(f"생성 시각: {item['timestamp']}")
                    if st.button(f"이 결과 보기", key=f"view_{len(st.session_state.history)-idx}"):
                        st.session_state.current_result = st.session_state.history[len(st.session_state.history)-idx]
                        st.rerun()
            if st.button("히스토리 전체 삭제", type="secondary"):
                st.session_state.history = []
                st.session_state.current_result = None
                st.rerun()
        else:
            st.info("아직 생성된 콘텐츠가 없습니다.")

    # 사용 가이드 및 유용한 링크
    with st.expander("📖 사용 가이드 및 유용한 링크", expanded=False):
        st.markdown("""
        ### 🎯 사용 프로세스

        **1단계: 상품 정보 입력**
        - 상품명/핵심 특징 입력 (예: "무선 이어폰", "블루라이트 차단 안경")
        - 타깃 고객층 지정 (예: "25-40세 직장인")
        - 콘텐츠 톤과 스타일 선택

        **2단계: AI 콘텐츠 생성**
        - "생성" 버튼 클릭
        - ⏳ AI가 대본, 썸네일, 키워드 자동 생성 (약 30초~1분)
        - Douyin 레퍼런스 영상 검색 (선택사항)

        **3단계: 결과 확인 및 다운로드**
        - 생성된 콘텐츠 확인
        - 하단의 다운로드 버튼으로 파일 저장
        - 대본(txt), 키워드(txt), 메타데이터(json) 등

        **4단계: 영상 제작**
        - CapCut 또는 편집 툴에서 대본 활용
        - Douyin 레퍼런스 영상 참고
        - 썸네일 문구 활용

        ---

        ### 🔗 유용한 링크

        **레퍼런스 영상 검색:**
        - 🇨🇳 [Douyin (抖音)](https://www.douyin.com/) - 중국판 TikTok, 쇼핑 쇼츠 레퍼런스
        - 🇰🇷 [릴스 인사이트](https://www.instagram.com/reels/) - 인스타그램 릴스
        - 📱 [YouTube Shorts](https://www.youtube.com/shorts/) - 유튜브 쇼츠

        **편집 툴:**
        - 🎬 [CapCut](https://www.capcut.com/) - 무료 영상 편집
        - 🎙️ [Typecast](https://typecast.ai/) - AI 음성 생성

        **분석 도구:**
        - 📊 [쿠팡 파트너스](https://partners.coupang.com/) - 제휴 링크 생성 및 수익 확인
        - 📈 [YouTube Studio](https://studio.youtube.com/) - 쇼츠 성과 분석

        ---

        ### 💡 팁
        - Douyin 검색 시 VPN이 필요할 수 있습니다
        - 생성 시간이 오래 걸리면 잠시만 기다려주세요 (무료 API 사용 중)
        - 여러 옵션을 시도해보며 최적의 결과를 찾으세요!
        """)

    enable_douyin_default = env_flag("ENABLE_DOUYIN_SEARCH", "false")
    enable_douyin_download_default = env_flag("ENABLE_DOUYIN_DOWNLOAD", "false")
    douyin_download_limit_default = env_int("DOUYIN_DOWNLOAD_LIMIT", 3)
    douyin_scroll_times_default = env_int("DOUYIN_SCROLL_TIMES", 5)
    douyin_crawler_results_default = env_int("DOUYIN_CRAWLER_RESULTS", 10)
    douyin_headless_default = env_flag("DOUYIN_HEADLESS", "true")
    douyin_audio_only_default = env_flag("DOUYIN_AUDIO_ONLY", "false")

    douyin_download_limit_default = max(1, min(10, douyin_download_limit_default))
    douyin_scroll_times_default = max(1, min(20, douyin_scroll_times_default))
    douyin_crawler_results_default = max(3, min(30, douyin_crawler_results_default))

    with st.form(key="content_form"):
        product_name = st.text_input("상품명 / 핵심 특징", help="예: 무선 신발 건조기, 블루라이트 차단 안경")
        target_audience = st.text_input("타깃 고객층", value="25-40세 직장인")
        tone = st.selectbox(
            "콘텐츠 톤 & 무드",
            options=["신뢰형", "친근형", "흥분형", "프리미엄"],
            index=0,
        )
        style = st.selectbox(
            "스토리텔링 스타일",
            options=["문제 해결", "라이프스타일 제안", "팩트 중심"],
            index=0,
        )
        brand_voice = st.text_input(
            "브랜드 보이스 (선택)",
            help="예: 따뜻하고 배려심 있는 말투, 세련된 전문가 톤",
            value="",
        )
        language = st.radio(
            "1차 대본 언어",
            options=["ko", "en"],
            index=0,
            format_func=lambda x: "한국어" if x == "ko" else "영어",
        )
        enable_douyin = st.checkbox(
            "Douyin 레퍼런스 영상 검색 실행",
            value=enable_douyin_default,
            help="VPN이 필요한 환경일 수 있습니다. 검색어는 중국어 키워드 또는 상품명으로 설정됩니다.",
        )
        enable_douyin_download = enable_douyin_download_default
        douyin_download_limit = douyin_download_limit_default
        douyin_scroll_times = douyin_scroll_times_default
        douyin_crawler_results = douyin_crawler_results_default
        douyin_headless = douyin_headless_default
        douyin_audio_only = douyin_audio_only_default

        if enable_douyin:
            st.markdown("**Phase 2 옵션 (Douyin Selenium + yt-dlp)**")
            douyin_crawler_results = st.slider(
                "Selenium 검색 결과 수",
                min_value=3,
                max_value=30,
                value=douyin_crawler_results_default,
                help="검색 페이지를 스크롤하여 수집할 결과 개수입니다.",
            )
            douyin_scroll_times = st.slider(
                "스크롤 횟수",
                min_value=1,
                max_value=20,
                value=douyin_scroll_times_default,
            )
            enable_douyin_download = st.checkbox(
                "yt-dlp로 상위 영상 자동 다운로드",
                value=enable_douyin_download_default,
            )
            if enable_douyin_download:
                douyin_download_limit = st.slider(
                    "다운로드 최대 개수",
                    min_value=1,
                    max_value=10,
                    value=douyin_download_limit_default,
                )
                douyin_audio_only = st.checkbox(
                    "음성만 추출 (MP3 변환)",
                    value=douyin_audio_only_default,
                )
                douyin_headless = st.checkbox(
                    "헤드리스 모드로 실행",
                    value=douyin_headless_default,
                )
        else:
            enable_douyin_download = False

        submit = st.form_submit_button("🚀 콘텐츠 자동 생성")

    # Handle form submission
    if submit:
        if not product_name.strip():
            st.warning("상품명을 입력해 주세요.")
            return

        process_generation(
            product_name=product_name,
            target_audience=target_audience,
            tone=tone,
            style=style,
            brand_voice=brand_voice,
            language=language,
            enable_douyin=enable_douyin,
            enable_douyin_download=enable_douyin_download,
            douyin_download_limit=douyin_download_limit,
            douyin_scroll_times=douyin_scroll_times,
            douyin_crawler_results=douyin_crawler_results,
            douyin_headless=douyin_headless,
            douyin_audio_only=douyin_audio_only,
        )

    # Display current result if available
    if st.session_state.current_result:
        display_current_result(st.session_state.current_result)


def process_generation(
    product_name: str,
    target_audience: str,
    tone: str,
    style: str,
    brand_voice: str,
    language: str,
    enable_douyin: bool,
    enable_douyin_download: bool,
    douyin_download_limit: int,
    douyin_scroll_times: int,
    douyin_crawler_results: int,
    douyin_headless: bool,
    douyin_audio_only: bool,
) -> None:
    """Process content generation and save to session state."""
    from datetime import datetime

    with st.spinner("AI가 콘텐츠를 생성하는 중입니다..."):
        script_service = ScriptService()
        keyword_service = KeywordTranslator()
        output_manager = OutputManager()

        script_request = ScriptRequest(
            product_name=product_name,
            target_audience=target_audience,
            tone=tone,
            style=style,
            language=language,
            brand_voice=brand_voice or None,
        )

        keyword_request = KeywordRequest(
            product_name=product_name,
            target_audience=target_audience,
            tone=tone,
            style=style,
            language=language,
        )

        try:
            script_bundle = script_service.generate_bundle(script_request)
            keyword_payload = keyword_service.translate(keyword_request)
        except Exception as exc:  # pylint: disable=broad-except
            st.error(f"콘텐츠 생성 중 오류가 발생했습니다: {exc}")
            return

        search_keyword = product_name
        douyin_videos: list[DouyinVideo] = []
        if enable_douyin:
            search_keyword = next(
                (kw for kw in keyword_payload.get("chinese_keywords", []) if kw),
                product_name,
            )
            search_service = DouyinSearchService()
            search_request = DouyinSearchRequest(keyword=search_keyword, max_results=6)
            try:
                douyin_videos = search_service.search(search_request)
            except Exception as exc:  # pragma: no cover - unexpected
                st.warning(f"Douyin 검색 중 오류가 발생했습니다: {exc}")
                douyin_videos = []

        output_dir = output_manager.create_output_dir(product_name)
        download_records: list[dict[str, Any]] = []
        crawler_videos: list[DouyinVideo] = []

        if enable_douyin and enable_douyin_download:
            crawler_config = DouyinCrawlerConfig(
                headless=douyin_headless,
                wait_seconds=3.0,
                scroll_pause_seconds=2.0,
                scroll_times=douyin_scroll_times,
                max_results=douyin_crawler_results,
                download_limit=douyin_download_limit,
                download_audio_only=douyin_audio_only,
            )
            crawler = DouyinCrawler(crawler_config)
            try:
                crawler_videos = crawler.search(search_keyword)
                if crawler_videos and not douyin_videos:
                    douyin_videos = crawler_videos
                download_source = douyin_videos or crawler_videos
                if download_source:
                    download_records = crawler.download(download_source, output_dir)
            except Exception as exc:  # pragma: no cover - runtime safety
                st.error(f"Douyin 다운로드 중 오류가 발생했습니다: {exc}")

        save_outputs(
            output_manager=output_manager,
            output_dir=output_dir,
            product_name=product_name,
            script_bundle=script_bundle,
            keyword_payload=keyword_payload,
            script_request=script_request,
            douyin_videos=douyin_videos,
            douyin_downloads=download_records,
        )

        # Save to session state
        result_data = {
            "product_name": product_name,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "script_bundle": script_bundle,
            "keyword_payload": keyword_payload,
            "output_dir": str(output_dir),
            "douyin_videos": [video.as_dict() for video in douyin_videos] if douyin_videos else [],
            "douyin_requested": enable_douyin,
            "download_records": download_records,
            "download_requested": enable_douyin_download,
        }

        # Add to history (limit to last 10)
        st.session_state.history.append(result_data)
        if len(st.session_state.history) > 10:
            st.session_state.history = st.session_state.history[-10:]

        # Set as current result
        st.session_state.current_result = result_data

    st.success("콘텐츠가 생성되었습니다.")
    st.rerun()  # Refresh to show the result


def save_outputs(
    output_manager: OutputManager,
    output_dir: Path,
    product_name: str,
    script_bundle: dict[str, Any],
    keyword_payload: dict[str, Any],
    script_request: ScriptRequest,
    douyin_videos: list[DouyinVideo] | None = None,
    douyin_downloads: list[dict[str, Any]] | None = None,
) -> None:
    """Persist generated artefacts and checklist."""
    output_manager.write_text(output_dir, "script.txt", [script_bundle["script"]])
    output_manager.write_text(
        output_dir,
        "thumbnail.txt",
        script_bundle.get("thumbnail_options", []),
    )
    output_manager.write_text(
        output_dir,
        "keywords.txt",
        keyword_payload.get("korean_keywords", []),
    )
    output_manager.write_text(
        output_dir,
        "keywords_zh.txt",
        keyword_payload.get("chinese_keywords", []),
    )
    output_manager.write_text(
        output_dir,
        "douyin_queries.txt",
        keyword_payload.get("douyin_search_queries", []),
    )
    if douyin_videos:
        output_manager.write_json(
            output_dir,
            "douyin_videos.json",
            [video.as_dict() for video in douyin_videos],
        )
        output_manager.write_text(
            output_dir,
            "douyin_links.txt",
            [video.share_url for video in douyin_videos if video.share_url],
        )
    if douyin_downloads:
        output_manager.write_json(
            output_dir,
            "douyin_downloads.json",
            douyin_downloads,
        )

    output_manager.write_json(
        output_dir,
        "metadata.json",
        {
            "product_name": product_name,
            "slug": slugify(product_name),
            "input": asdict(script_request),
            "script_bundle": script_bundle,
            "keywords": keyword_payload,
            "douyin": [video.as_dict() for video in douyin_videos] if douyin_videos else [],
            "douyin_downloads": douyin_downloads or [],
        },
    )

    checklist_builder = ChecklistBuilder()
    checklist_items = checklist_builder.build()
    checklist_builder.export(output_dir, checklist_items)


def display_current_result(result_data: dict[str, Any]) -> None:
    """Display the current result from session state."""
    st.success("콘텐츠가 생성되었습니다.")
    # Display output path
    output_dir_str = result_data["output_dir"]
    output_dir = Path(output_dir_str)

    try:
        display_path = output_dir.relative_to(ProjectPaths.discover().base_dir)
    except ValueError:
        display_path = output_dir
    st.markdown(f"**결과 폴더**: `{display_path}`")
    st.caption(f"생성 시각: {result_data['timestamp']}")

    # Reconstruct DouyinVideo objects from dict
    douyin_videos = [DouyinVideo(**video_dict) for video_dict in result_data.get("douyin_videos", [])]

    display_results(
        script_bundle=result_data["script_bundle"],
        keyword_payload=result_data["keyword_payload"],
        output_dir=output_dir,
        douyin_videos=douyin_videos,
        douyin_requested=result_data.get("douyin_requested", False),
        douyin_downloads=result_data.get("download_records", []),
        douyin_download_requested=result_data.get("download_requested", False),
    )


def display_results(
    script_bundle: dict[str, Any],
    keyword_payload: dict[str, Any],
    output_dir: Path,
    douyin_videos: list[DouyinVideo],
    douyin_requested: bool,
    douyin_downloads: list[dict[str, Any]],
    douyin_download_requested: bool,
) -> None:
    """Render generated assets in the Streamlit UI."""
    st.subheader("📄 대본")
    st.text_area("30초 대본", value=script_bundle["script"], height=300)

    st.subheader("🎯 핵심 요소")
    st.write(f"- Hook: {script_bundle.get('hook')}")
    st.write(f"- CTA: {script_bundle.get('cta')}")
    st.write("- Talking Points:")
    for point in script_bundle.get("talking_points", []):
        st.markdown(f"  - {point}")

    st.subheader("🖼️ 썸네일 문구 제안")
    for idx, option in enumerate(script_bundle.get("thumbnail_options", []), start=1):
        st.markdown(f"{idx}. {option}")

    st.subheader("🔤 키워드 & Douyin 검색어")
    col1, col2 = st.columns(2)
    with col1:
        st.markdown("**한국어 키워드**")
        st.code("\n".join(keyword_payload.get("korean_keywords", [])) or "-", language="text")
    with col2:
        st.markdown("**중국어 키워드**")
        st.code("\n".join(keyword_payload.get("chinese_keywords", [])) or "-", language="text")

    st.markdown("**Douyin 검색 쿼리 제안**")
    st.code("\n".join(keyword_payload.get("douyin_search_queries", [])) or "-", language="text")

    if douyin_requested:
        st.subheader("📹 Douyin 레퍼런스 결과")
        if douyin_videos:
            for idx, video in enumerate(douyin_videos, start=1):
                st.markdown(
                    f"{idx}. **{video.title or '(제목 없음)'}** — {video.author} · 재생 {video.play_count:,}회 · 좋아요 {video.digg_count:,}회"
                )
                st.markdown(f"[링크 열기]({video.share_url})")
        else:
            st.info("검색 결과가 없거나 요청이 실패했습니다. VPN/쿠키 설정을 확인해 주세요.")

    if douyin_download_requested:
        st.subheader("⬇️ Douyin 다운로드 결과")
        if douyin_downloads:
            for record in douyin_downloads:
                raw_path = record.get("filepath")
                rel_path = "N/A"
                if raw_path:
                    try:
                        rel_path = str(Path(raw_path).resolve().relative_to(output_dir.resolve()))
                    except ValueError:
                        rel_path = Path(raw_path).name
                title = record.get("title") or "(제목 없음)"
                duration = record.get("duration") or "-"
                st.markdown(f"- **{title}** · 길이 {duration}초 · `{rel_path}`")
        else:
            st.info("다운로드된 파일이 없습니다. Selenium/yt-dlp 로그를 확인해 주세요.")

    st.subheader("📁 산출물 다운로드")
    mime_map = {
        ".txt": "text/plain",
        ".csv": "text/csv",
        ".json": "application/json",
    }

    for file_path in sorted(output_dir.iterdir()):
        if file_path.is_file():
            with open(file_path, "rb") as file_obj:
                st.download_button(
                    label=f"다운로드 - {file_path.name}",
                    data=file_obj,
                    file_name=file_path.name,
                    mime=mime_map.get(file_path.suffix.lower(), "application/octet-stream"),
                )


if __name__ == "__main__":
    main()
