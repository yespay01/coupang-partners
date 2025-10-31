# 기술 스택 개요

## 핵심 구성 (Phase 1~2)

| 영역 | 기술 | 선택 이유 |
|------|------|-----------|
| 언어 | Python 3.10+ | AI 라이브러리 생태계 및 크로스플랫폼 지원 |
| UI | Streamlit | 빠른 프로토타이핑과 단순한 배포 |
| AI API | OpenAI GPT-4o (Chat Completions) | 자연스러운 대본/카피 생성 품질 |
| 데이터 처리 | Pandas | 체크리스트 CSV 생성과 후속 분석 용이 |
| 환경 변수 | python-dotenv | `.env` 기반 보안 관리 |
| LLM 재시도 | tenacity | API 호출 실패 시 재시도 로직 간편화 |
| 외부 API 호출 | requests | Douyin 공개 웹 API 연동 및 예외 처리 |
| 웹 크롤링 | Selenium + BeautifulSoup + webdriver-manager | Douyin 웹 검색 자동화 |
| 미디어 다운로드 | yt-dlp | Douyin 영상/음성 파일 다운로드 |

## 선택적 확장 (Phase 2~4)

| 단계 | 기술 | 사용 시점 | 목적 |
|------|------|-----------|------|
| Phase 2 | Selenium, yt-dlp | Douyin 크롤링 | 레퍼런스 영상 수집 자동화 |
| Phase 2 | Typecast / Google Cloud TTS | 음성 자동화 | 수동 음성 제작 대체 |
| Phase 3 | MoviePy, FFmpeg | 영상 합성 | 기본 템플릿 편집 자동화 |
| Phase 4 | FastAPI, Docker | SaaS 확장 | 다중 사용자/배포 요구 대응 |
| Phase 4 | GCP / AWS S3 | 저장소 | 미디어 파일 중앙 관리 |

## 패키지 관리

- `requirements.txt`: Phase 1 필수 패키지
- `pyproject.toml`: 선택적 의존성과 개발 도구 정의
- 가상환경 권장: `python -m venv .venv`

## 모델 설정 가이드

```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
ENABLE_DOUYIN_SEARCH=false
DOUYIN_COOKIE=
ENABLE_DOUYIN_DOWNLOAD=false
DOUYIN_DOWNLOAD_LIMIT=3
DOUYIN_SCROLL_TIMES=5
DOUYIN_CRAWLER_RESULTS=10
DOUYIN_HEADLESS=true
DOUYIN_AUDIO_ONLY=false
```

모델별 권장 사항:
- `gpt-4o-mini`: 비용 효율이 필요한 기본 대본 생성
- `gpt-4o`: 더 높은 품질이 필요한 경우
- 토큰 사용량 모니터링을 위해 `metadata.json`에 응답 정보 기록 (추후 구현 예정)

## 향후 기술 고려 사항

1. **LLM 대체 모델**: 비용 최적화를 위해 GPT-4o-mini → GPT-4.1-mini, Claude 3 Haiku 등 교체 가능성 검토
2. **프롬프트 버전 관리**: `prompts/` 디렉터리 버전 태깅, 실험 로그와 연계
3. **Douyin 심화 크롤링**: Selenium/yt-dlp + 프록시 관리 전략 수립
4. **Observability**: Langfuse, Helicone 등 LLM 호출 로깅 도구 도입 검토
5. **결과 평가 자동화**: 후속 단계에서 Rouge/BLEU 기반 대본 품질 자동 스코어링 도입
