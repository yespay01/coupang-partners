# 쇼핑 쇼츠 프로젝트 현황 분석 (최종 업데이트: 2025-11-01)

## 📊 프로젝트 개요

**프로젝트명**: 쇼핑 쇼츠 반자동 제작 시스템
**목표**: AI를 활용한 쇼츠 콘텐츠 기획 자동화로 제작 시간 40% 단축
**현재 버전**: Phase 1~2 완료 상태 + Gemini 전환 + 히스토리 기능
**배포 상태**: ✅ Streamlit Cloud 배포 완료

---

## ✅ 완료된 기능 (Phase 1~2)

### Phase 1: 콘텐츠 기획 자동화 ✅
- [x] **대본 자동 생성**: GPT-4o 기반 30초 분량 쇼츠 대본
- [x] **썸네일 문구 생성**: A/B 테스트용 3종 제안
- [x] **릴스 설명문**: 훅/CTA/해시태그 포함
- [x] **키워드 생성**: 한국어 키워드 자동 추출
- [x] **중국어 번역**: 한국어 → 중국어 간체 자동 번역
- [x] **Douyin 검색 쿼리**: 중국어 키워드 기반 검색어 생성
- [x] **폴더 구조 자동 생성**: `project_output/[상품명_날짜]/`
- [x] **체크리스트 CSV**: 후속 작업 가이드 자동 생성
- [x] **메타데이터 저장**: JSON 형식 산출물 정보 저장

### Phase 2: 영상 소스 자동화 ✅
- [x] **Douyin 검색**: Selenium 기반 자동 검색
- [x] **영상 링크 수집**: `douyin_links.txt` 자동 생성
- [x] **영상 메타데이터**: `douyin_videos.json` 저장
- [x] **자동 다운로드**: yt-dlp 기반 영상 다운로드 (옵션)
- [x] **음성 추출**: MP3 변환 기능 (옵션)
- [x] **다운로드 로그**: `douyin_downloads.json` 저장

### Phase 2.5: 비용 절감 및 UX 개선 ✅ (2025-11-01)
- [x] **Google Gemini 지원**: 무료 API 옵션 추가
- [x] **AI Provider 선택**: 환경 변수로 OpenAI/Gemini 전환
- [x] **JSON 파싱 강화**: 마크다운 블록 자동 제거
- [x] **응답 잘림 방지**: max_tokens 1200→4000 증가
- [x] **안전 설정**: Gemini 콘텐츠 차단 완화
- [x] **히스토리 기능**: 세션 상태 저장 및 재조회
- [x] **Streamlit Cloud**: 웹 배포 완료

---

## 🗂️ 코드 구조

```
shopping_shorts_automation/
├── app/
│   └── main.py                    # Streamlit UI 메인
├── core/
│   ├── __init__.py                # 모듈 export
│   ├── openai_client.py           # OpenAI API 클라이언트
│   ├── script_generator.py        # 대본 생성 서비스
│   ├── keyword_translator.py      # 키워드 번역
│   ├── douyin_search.py           # Douyin 검색 서비스
│   ├── douyin_crawler.py          # Douyin 크롤링 + 다운로드
│   ├── file_manager.py            # 파일 저장 관리
│   ├── checklist_creator.py       # 체크리스트 생성
│   └── utils.py                   # 유틸리티 함수
├── prompts/
│   ├── script_prompt.txt          # 대본 생성 프롬프트
│   ├── thumbnail_prompt.txt       # 썸네일 문구 프롬프트
│   └── translation_prompt.txt     # 번역 프롬프트
├── docs/
│   ├── DEVELOPMENT_PLAN.md        # 개발 로드맵
│   ├── USER_GUIDE.md              # 사용자 가이드
│   ├── TECH_STACK.md              # 기술 스택
│   └── IMPROVEMENTS.md            # 개선 사항
├── .env                           # 환경 변수 (API 키)
├── .env.example                   # 환경 변수 예시
├── requirements.txt               # Python 의존성
└── README.md                      # 프로젝트 설명
```

---

## 🎯 현재 상태

### ✅ 완료 및 작동 중
- **코드**: Phase 1~2 + Phase 2.5 모두 구현 완료
- **배포**: Streamlit Cloud에 배포 완료
- **API**: Google Gemini (무료) 완전 통합
- **히스토리**: 생성 결과 저장 및 재조회 가능
- **환경 변수**: `.env` 파일 설정 완료
- **문서**: 사용자 가이드 및 개발 문서 완비
- **의존성**: 패키지 설치 완료
- **테스트**: 실제 실행 테스트 완료 ✅

---

## 🚀 다음 단계 (우선순위)

### 즉시 실행 가능 (10분)
1. ✅ **가상환경 설정**
   ```bash
   cd shopping_shorts_automation
   python -m venv .venv
   .venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. ✅ **환경 변수 확인**
   - `.env` 파일에 `OPENAI_API_KEY` 확인
   - 필요 시 API 키 추가

3. ✅ **첫 실행 테스트**
   ```bash
   streamlit run app/main.py
   ```

### 단기 목표 (1주)
4. 🎯 **실제 상품으로 테스트** (3개 샘플)
   - 대본 품질 확인
   - Douyin 검색 정확도 검증
   - 산출물 파일 확인

5. 🎯 **프롬프트 튜닝**
   - 대본 톤 조정 (감성적 vs 정보 전달)
   - 썸네일 문구 스타일 개선
   - 키워드 관련성 향상

6. 🎯 **UI/UX 개선**
   - 사용자 입력 검증 강화
   - 에러 메시지 명확화
   - 진행 상태 표시 개선

### 중기 목표 (2~4주)
7. 📈 **Phase 3 준비**
   - Douyin 크롤링 안정화
   - VPN 연동 자동화
   - 에러 복구 로직 강화

8. 📈 **KPI 대시보드**
   - 제작 시간 측정
   - 성공률 추적
   - 비용 모니터링

9. 📈 **음성 생성 연동 실험**
   - Typecast API 연동 가능성 검토
   - Google Cloud TTS 대안 검토

### 장기 목표 (1~3개월)
10. 🎨 **영상 편집 자동화 연구**
    - MoviePy 기반 자동 합성
    - CapCut API 연동 가능성

11. 🎨 **업로드 자동화**
    - Instagram API 연동
    - YouTube Shorts API 연동

12. 🎨 **성과 분석 시스템**
    - 조회수/좋아요 추적
    - ROI 계산
    - 최적 업로드 시간 분석

---

## 📝 추천 작업 순서 (오늘 할 일)

```bash
# 1. Git pull (최신 코드 받기)
git pull

# 2. 프로젝트 폴더로 이동
cd shopping_shorts_automation

# 3. 가상환경 생성 및 활성화
python -m venv .venv
.venv\Scripts\activate

# 4. 의존성 설치
pip install -r requirements.txt

# 5. 환경 변수 확인
# .env 파일 열어서 OPENAI_API_KEY 확인

# 6. 앱 실행
streamlit run app/main.py

# 7. 테스트
# 브라우저에서 localhost:8501 접속
# 샘플 상품으로 대본 생성 테스트
```

---

## 💡 개선 아이디어

### 빠르게 적용 가능
- [ ] 대본 길이 조절 옵션 추가 (15초/30초/60초)
- [ ] 톤 선택 기능 (감성적/유머러스/전문적)
- [ ] 카테고리별 프롬프트 최적화
- [ ] 생성 결과 즉시 복사 버튼
- [ ] 과거 생성 이력 조회

### 중급 난이도
- [ ] 배치 처리 (여러 상품 한 번에)
- [ ] 템플릿 저장/불러오기
- [ ] 커스텀 프롬프트 편집기
- [ ] Douyin 영상 미리보기
- [ ] 다운로드 진행률 표시

### 고급 기능
- [ ] 멀티 유저 지원
- [ ] 팀 협업 기능
- [ ] 웹 배포 (Streamlit Cloud)
- [ ] API 서버화 (FastAPI)
- [ ] 데이터베이스 연동

---

## ⚠️ 주의사항

### API 비용 관리
- OpenAI API 사용량 모니터링
- 월 예산 설정 (₩6,000~₩10,000)
- 토큰 사용량 로깅

### Douyin 크롤링
- VPN 필요할 수 있음
- 페이지 구조 변경 가능성
- 과도한 요청 시 차단 위험

### 데이터 백업
- `project_output/` 폴더 정기 백업
- `.env` 파일 Git에 절대 커밋 금지

---

## 📊 예상 KPI

| 지표 | 현재 | 목표 | 개선율 |
|------|------|------|--------|
| 제작 시간 | 85분 | 50분 | ▲41% |
| 대본 품질 | 미측정 | 4.5/5 | - |
| 검색 정확도 | 미측정 | 85% | - |
| 자동화 성공률 | 미측정 | 95% | - |
| 월 비용 | 미측정 | ₩6,000 | - |

**측정 시작 필요!**

---

## 🎓 학습 리소스

### 프로젝트 내 문서
- `README.md` - 기본 사용법
- `docs/USER_GUIDE.md` - 상세 가이드
- `docs/TECH_STACK.md` - 기술 설명
- `docs/DEVELOPMENT_PLAN.md` - 개발 로드맵

### 외부 참고
- [Streamlit 공식 문서](https://docs.streamlit.io/)
- [OpenAI API 문서](https://platform.openai.com/docs)
- [yt-dlp GitHub](https://github.com/yt-dlp/yt-dlp)
- [Selenium 문서](https://www.selenium.dev/documentation/)

---

## ✅ 체크리스트 (시작 전)

- [ ] Python 3.10 이상 설치됨
- [ ] Git 최신 버전으로 pull 완료
- [ ] OpenAI API 키 발급됨
- [ ] `.env` 파일에 API 키 설정됨
- [ ] 가상환경 생성 및 활성화
- [ ] 의존성 설치 완료
- [ ] Streamlit 앱 실행 성공
- [ ] 첫 번째 테스트 상품으로 대본 생성 성공

---

**다음 업데이트**: 첫 테스트 완료 후
**작성일**: 2025-10-31
**작성자**: Claude Code
