# 쇼핑 쇼츠 반자동 제작 시스템 사용자 가이드

> v0.3 초안 — Phase 1 + Phase 2 (Douyin Selenium & yt-dlp)

## 주요 기능 요약

- 상품명/타깃 입력 후 GPT-4o를 사용해 30초 분량 스크립트, 썸네일 문구, 키워드를 생성합니다.
- Douyin 검색에 사용할 중국어 키워드와 제안 검색 쿼리를 제공합니다.
- (선택) Douyin 공개 API를 통해 레퍼런스 영상 링크/메타데이터를 수집합니다.
- (선택) Selenium + yt-dlp를 이용해 상위 Douyin 영상을 자동 다운로드하거나 MP3로 추출합니다.
- 실행 시 프로젝트 산출물 폴더와 체크리스트 CSV를 자동으로 구성합니다.

## 사용 전 준비 사항

1. `.env` 파일에 OpenAI API 키를 저장합니다.
2. Douyin 검색을 사용할 경우 `ENABLE_DOUYIN_SEARCH=true`로 설정하고 필요하면 `DOUYIN_COOKIE`를 추가합니다.
3. Douyin 영상 다운로드를 자동화하려면 `ENABLE_DOUYIN_DOWNLOAD=true`, `DOUYIN_DOWNLOAD_LIMIT` 등 옵션을 조정합니다.
4. `requirements.txt`를 사용해 필요한 패키지를 설치합니다. (Selenium/yt-dlp 사용 시 Chrome/Chromium, FFmpeg 설치 필요)
5. Streamlit 앱을 실행할 Python 3.10 이상의 환경을 준비합니다.

```bash
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
```

## Streamlit 앱 실행

```bash
streamlit run app/main.py
```

앱을 실행하면 다음 입력 필드를 확인할 수 있습니다.

- 상품명 / 특징 입력
- 타깃 고객층 선택
- 콘텐츠 톤 & 스타일 선택
- 1차 출력 언어 설정
- Douyin 레퍼런스 검색 실행 여부
- Phase 2 옵션 (Selenium 검색 결과 수, 스크롤 횟수, 자동 다운로드, 음성 추출 여부, 헤드리스 모드 등)

## 산출물 폴더 구조

```
project_output/
 └── [상품명_YYYYMMDD]/
     ├── script.txt
     ├── thumbnail.txt
     ├── keywords.txt
     ├── keywords_zh.txt
     ├── douyin_queries.txt
     ├── douyin_links.txt        # 선택
     ├── douyin_videos.json      # 선택
     ├── douyin_downloads.json   # 선택
     ├── checklist.csv
     ├── metadata.json
     └── douyin_media/           # Selenium + yt-dlp 다운로드 결과 (옵션)
```

모든 파일은 앱 실행 시 자동 생성되며, 기존 파일이 있을 경우 덮어쓰지 않도록 날짜 기반 폴더를 새로 만듭니다.

## 체크리스트 CSV 컬럼

| 컬럼 | 설명 |
|------|------|
| task | 수행해야 할 작업 이름 |
| owner | 담당자 혹은 역할 |
| status | 초기 상태 (`pending`) |
| notes | 참고 사항 |

## Douyin 검색 및 다운로드 활용 팁

- 기본 검색어는 중국어 키워드 1순위이며, 없을 경우 상품명을 그대로 사용합니다.
- API 검색 결과는 최대 6개, Selenium 검색 결과는 슬라이더에서 지정한 개수만큼 반환됩니다.
- 링크는 `douyin_links.txt`, 상세 정보는 `douyin_videos.json`, 다운로드된 파일 정보는 `douyin_downloads.json`과 `douyin_media/`에 저장됩니다.
- `DOUYIN_COOKIE` 환경 변수를 통해 브라우저 쿠키를 전달하면 차단을 우회할 확률이 올라갑니다.
- VPN 환경이 필요한 경우 접속 여부를 미리 확인합니다.
- yt-dlp가 FFmpeg를 요구하므로 로컬에 설치되어 있어야 하며, 다운로드 실패 시 로그를 확인해 주세요.

## 문제 해결

- OpenAI API 호출 오류: `.env` 파일의 키를 확인하고, 요청 속도를 조절합니다.
- 파일 생성 실패: `project_output` 폴더 쓰기 권한과 경로를 확인합니다.
- Streamlit 애플리케이션 로딩 지연: 필요한 패키지가 설치되었는지와 네트워크 상태를 점검합니다.

---

문의 / 개선 제안은 `docs/DEVELOPMENT_PLAN.md`에 기록한 피드백 절차를 따릅니다.
