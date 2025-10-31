# 쇼핑 쇼츠 반자동 제작 시스템

Phase 1 범위의 AI 기반 콘텐츠 기획 자동화 프로젝트입니다. Streamlit UI를 통해 상품 정보를 입력하면 GPT-4o를 활용해 쇼츠 대본, 썸네일 문구, 키워드, 체크리스트를 자동으로 생성하고 폴더 구조에 맞춰 저장합니다. Phase 2 옵션으로 Douyin Selenium 크롤링 및 yt-dlp 다운로드를 지원합니다.

## 주요 기능

- 상품명과 타깃 고객을 기반으로 30초 분량 대본 생성
- 훅/CTA/해시태그까지 포함한 릴스 설명문 자동 작성
- 썸네일 문구 3종 제안
- 한국어/중국어 키워드 및 Douyin 검색용 쿼리 생성
- (옵션) Douyin 레퍼런스 영상 검색, 링크/메타데이터 저장
- (옵션) Selenium + yt-dlp 기반 Douyin 영상 자동 다운로드 및 MP3 추출
- 프로젝트 산출물 폴더 및 체크리스트 CSV 자동 생성

## 요구 사항

- Python 3.10 이상
- OpenAI API Key (`OPENAI_API_KEY`)

## 설치 및 실행

```bash
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt
```

환경 변수를 `.env` 파일에 설정합니다.

```env
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-4o-mini        # 선택 사항
ENABLE_DOUYIN_SEARCH=false      # 기본 검색 토글
DOUYIN_COOKIE=                  # 필요한 경우 브라우저 쿠키 전체 문자열
ENABLE_DOUYIN_DOWNLOAD=false    # Selenium + yt-dlp 자동 다운로드
DOUYIN_DOWNLOAD_LIMIT=3
DOUYIN_SCROLL_TIMES=5
DOUYIN_CRAWLER_RESULTS=10
DOUYIN_HEADLESS=true
DOUYIN_AUDIO_ONLY=false
```

Streamlit 앱 실행:

```bash
streamlit run app/main.py
```

## 산출물 구조

```
project_output/
 └── [상품명_YYYYMMDD]/
     ├── script.txt
     ├── thumbnail.txt
     ├── keywords.txt
     ├── keywords_zh.txt
     ├── douyin_queries.txt
     ├── douyin_links.txt        # 옵션
     ├── douyin_videos.json      # 옵션
     ├── douyin_downloads.json   # 옵션
     ├── checklist.csv
     ├── metadata.json
     └── douyin_media/           # yt-dlp 다운로드 결과 (옵션)
```

## 다음 단계 (Phase 3 미리보기)

- Douyin 심화 크롤링 안정화 및 예외 처리 고도화
- 결과 대시보드/로그 시스템 확장
- Typecast/CapCut 연동 자동화 실험

자세한 흐름과 향후 계획은 `쇼핑_쇼츠_반자동_제작_시스템_종합_기획서_v3.0.md`를 참고하세요.
