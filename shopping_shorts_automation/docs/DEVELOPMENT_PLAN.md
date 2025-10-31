# 개발 로드맵 (Phase 1 완료 + Phase 2 준비)

## 1. 목표

- 쇼핑 숏폼용 대본·썸네일·키워드·체크리스트를 40% 이상 자동화한다.
- Douyin 참고 영상 탐색을 위한 준비 데이터를 제공한다.
- 수동 편집(영상 합성, 업로드) 단계와 자연스럽게 연계되는 산출물을 만든다.

## 2. 일정 개요 (4주)

| 주차 | 단계 | 주요 결과물 |
|------|------|-------------|
| Week 1 | 환경 구축 & 기본 모듈 | 프로젝트 스캐폴딩, OpenAI 연동 |
| Week 2 | Phase 1 핵심 기능 | 대본/썸네일/키워드 자동 생성, 체크리스트/폴더 출력 |
| Week 3 | QA & UX 개선 | 예외 처리, UI 다듬기, 샘플 테스트 |
| Week 4 | Phase 2 준비 | Douyin 크롤링 프로토타입, 기술 리스크 점검 |

## 3. 작업 분류

### A. 환경 및 인프라
- Python 가상환경, 의존성 관리
- `.env` 보안 관리 가이드
- Streamlit 배포 옵션 조사 (로컬/사내 서버)

### B. AI 생성/검색 모듈
- `ScriptService`: 대본·CTA·설명문 생성
- `KeywordTranslator`: 한국어 ↔ 중국어 키워드 확장
- `DouyinSearchService`: 공개 웹 API 기반 레퍼런스 탐색
- `DouyinCrawler`: Selenium 기반 페이지 크롤링 + yt-dlp 다운로드
- 프롬프트 템플릿 관리 (`prompts/`)
- 응답 JSON 파서 및 예외 처리

### C. 산출물 관리
- 날짜/슬러그 기반 폴더 생성기
- 텍스트/JSON/CSV 저장 유틸
- 체크리스트 템플릿 및 Pandas 내보내기
- Douyin 링크/메타데이터 파일 생성 (`douyin_links.txt`, `douyin_videos.json`, `douyin_downloads.json`)
- yt-dlp 결과 보관 폴더 (`douyin_media/`) 자동 생성

### D. UI/UX
- Streamlit 폼 구성 (입력값 검증)
- Phase 2 옵션 토글 (검색 결과 수, 스크롤 횟수, 다운로드 개수, 음성 추출, 헤드리스 모드)
- 생성 결과 시각화 및 다운로드 버튼
- 오류 알림 및 디버깅 로그 노출

### E. 품질/운영
- 최소 3개 샘플 상품으로 수동 테스트
- 프롬프트 성능 튜닝(템퍼러처, 토큰 제한)
- 향후 Phase 2 요구사항 정리

## 4. 위험 요소 및 대응

| 리스크 | 영향 | 대응 |
|--------|------|------|
| OpenAI 응답 포맷 오류 | 높음 | JSON 스키마 안내 & 파싱 예외 처리 |
| Douyin 접근 제한 | 중 | VPN/프록시 옵션 조사, 키워드 우선 제공 |
| 비용 초과 | 중 | 모델/토큰 사용량 로깅, 경량 모델 fallback |
| 사용자 혼란 | 높음 | 체크리스트/설명 툴팁 강화 |

## 5. 완료 기준 (Phase 1~2)

1. Streamlit 앱에서 상품명 입력 후 1분 내 산출물이 생성된다.
2. 산출물 폴더에 `script.txt`, `thumbnail.txt`, `keywords.txt`, `keywords_zh.txt`, `douyin_queries.txt`, `checklist.csv`, `metadata.json`이 생성된다.
3. Douyin 검색을 활성화한 경우 `douyin_links.txt`, `douyin_videos.json`이 추가로 생성되고 링크가 유효한지 수동 검증했다.
4. Douyin 다운로드 옵션을 사용하면 `douyin_downloads.json`과 `douyin_media/`가 생성되고, yt-dlp 로그에 에러가 없는지 확인한다.
5. 체크리스트 CSV를 기반으로 후속 수동 작업을 진행할 수 있다.
6. 최소 3개 상품 테스트를 통해 프롬프트·다운로드 품질을 검증했다.

## 6. Phase 3 프리뷰

- (완료) Douyin 공개 API + Selenium + yt-dlp 연동으로 레퍼런스 및 다운로드 흐름 구축
- (예정) 영상 메타데이터 정리 및 썸네일 미리보기 제공
- (예정) Typecast/CapCut 연동을 위한 사전 스크립트 정의
- (예정) KPI 대시보드 및 운영 로그 자동화

---

문의/피드백은 `docs/USER_GUIDE.md`에 안내된 절차를 따라 수집한다.
