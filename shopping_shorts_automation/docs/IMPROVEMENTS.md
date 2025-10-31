# 🔧 쇼핑 쇼츠 반자동 제작 시스템 - 개선사항 및 이슈 리스트

> 작성일: 2025-10-30
> 코드 리뷰 기반 개선 필요 사항 정리

---

## 🔴 Critical (즉시 해결 필요)

### 1. Prompt 템플릿 파일 누락 ⚠️
**문제**: `prompts/` 폴더가 비어 있어 앱 실행 시 `FileNotFoundError` 발생

**위치**:
- `core/script_generator.py:31` - `load_prompt("script_prompt.txt")`
- `core/script_generator.py:32` - `load_prompt("thumbnail_prompt.txt")`
- `core/keyword_translator.py:31` - `load_prompt("translation_prompt.txt")`

**필요 파일**:
```
prompts/
├── script_prompt.txt
├── thumbnail_prompt.txt
└── translation_prompt.txt
```

**해결 방법**: 각 prompt 템플릿 파일 생성 (아래 예시 참조)

**우선순위**: 🔥 최고 (앱이 실행되지 않음)

---

### 2. .env 파일 미생성
**문제**: `.env.example`만 있고 실제 `.env` 파일이 없음

**해결 방법**:
```bash
cp .env.example .env
# OpenAI API 키를 .env 파일에 입력
```

**우선순위**: 🔥 최고

---

## 🟡 High (주요 개선사항)

### 3. 로깅 시스템 부재
**문제**: 디버깅 및 운영 모니터링이 어려움

**제안**:
```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)
```

**적용 위치**:
- `core/openai_client.py` - API 호출 로그
- `core/douyin_crawler.py` - 크롤링 진행 상황
- `app/main.py` - 전체 흐름 추적

**예상 효과**:
- API 사용량 추적 가능
- 에러 발생 시 원인 파악 용이
- 성능 병목 구간 식별

**우선순위**: 🟡 높음

---

### 4. API 비용 추적 기능 없음
**문제**: OpenAI API 사용량 및 비용 모니터링 불가

**제안**:
```python
# core/openai_client.py에 추가
def send(self, messages, **kwargs):
    response = self.client.chat.completions.create(...)

    # 토큰 사용량 기록
    usage = response.usage
    logger.info(f"Tokens used: {usage.total_tokens} "
                f"(prompt: {usage.prompt_tokens}, "
                f"completion: {usage.completion_tokens})")

    # metadata.json에 저장
    return choice.message.content, usage
```

**우선순위**: 🟡 높음

---

### 5. 에러 메시지 개선 필요
**현재 문제**:
```python
# app/main.py:185
except Exception as exc:
    st.error(f"콘텐츠 생성 중 오류가 발생했습니다: {exc}")
```

**개선 제안**:
```python
except OpenAIError as exc:
    st.error("❌ OpenAI API 오류가 발생했습니다.")
    st.info("💡 해결 방법:\n- API 키 확인\n- 네트워크 연결 확인\n- 사용량 한도 확인")
    logger.exception("OpenAI API error", exc_info=True)
except FileNotFoundError as exc:
    st.error("❌ 필수 파일이 누락되었습니다.")
    st.info(f"💡 {exc.filename} 파일을 확인해주세요.")
```

**우선순위**: 🟡 높음

---

## 🟢 Medium (개선 권장)

### 6. 테스트 코드 부재
**문제**: 단위 테스트가 없어 코드 변경 시 회귀 테스트 불가

**제안 구조**:
```
tests/
├── test_script_generator.py
├── test_keyword_translator.py
├── test_douyin_search.py
├── test_file_manager.py
└── test_utils.py
```

**예시**:
```python
# tests/test_utils.py
def test_slugify():
    assert slugify("무선 신발 건조기") == "무선_신발_건조기"
    assert slugify("Test Product!!!") == "Test_Product"
```

**우선순위**: 🟢 중간

---

### 7. 환경변수 검증 로직 없음
**문제**: 필수 환경변수 누락 시 런타임 에러

**제안**:
```python
# core/config.py (새 파일)
from pydantic import BaseSettings, validator

class Settings(BaseSettings):
    OPENAI_API_KEY: str
    OPENAI_MODEL: str = "gpt-4o-mini"
    ENABLE_DOUYIN_SEARCH: bool = False

    @validator("OPENAI_API_KEY")
    def validate_api_key(cls, v):
        if not v.startswith("sk-"):
            raise ValueError("Invalid OpenAI API key format")
        return v

    class Config:
        env_file = ".env"
```

**우선순위**: 🟢 중간

---

### 8. Douyin 쿠키 만료 처리
**문제**: `douyin_crawler.py`에서 쿠키 유효성 검사 없음

**제안**:
```python
def _validate_cookie(self) -> bool:
    """Check if cookie is still valid."""
    try:
        driver = self._build_driver()
        driver.get("https://www.douyin.com/")
        # 로그인 상태 확인
        is_logged_in = driver.find_elements(By.CSS_SELECTOR, ".user-info")
        return len(is_logged_in) > 0
    except Exception:
        return False
```

**우선순위**: 🟢 중간

---

### 9. 프롬프트 버전 관리
**문제**: 프롬프트 변경 이력 추적 불가

**제안**:
```
prompts/
├── v1/
│   ├── script_prompt.txt
│   ├── thumbnail_prompt.txt
│   └── translation_prompt.txt
├── v2/
│   └── ...
└── current -> v2/
```

**우선순위**: 🟢 중간

---

### 10. 다운로드 파일 중복 방지
**문제**: 동일 영상 재다운로드 가능

**제안**:
```python
def download(self, videos, output_dir):
    # 다운로드 기록 확인
    history_file = output_dir / "download_history.json"
    downloaded = set()
    if history_file.exists():
        downloaded = set(json.loads(history_file.read_text()))

    for video in videos:
        if video.share_url in downloaded:
            logger.info(f"Skipping {video.title} (already downloaded)")
            continue
        # 다운로드 로직...
```

**우선순위**: 🟢 중간

---

## 🔵 Low (선택적 개선)

### 11. 프로그레스 바 추가
**제안**: Streamlit의 `st.progress()` 활용

```python
progress_bar = st.progress(0)
progress_bar.progress(25, "대본 생성 중...")
progress_bar.progress(50, "키워드 번역 중...")
progress_bar.progress(75, "Douyin 검색 중...")
progress_bar.progress(100, "완료!")
```

**우선순위**: 🔵 낮음

---

### 12. 대시보드 기능 추가
**제안**: 생성 이력, API 사용량 통계

```python
# app/dashboard.py
def show_dashboard():
    st.title("📊 대시보드")

    # 생성 이력
    st.metric("총 생성 콘텐츠", "127개")
    st.metric("이번 달 API 비용", "₩4,500")

    # 차트
    df = load_history()
    st.line_chart(df["daily_count"])
```

**우선순위**: 🔵 낮음

---

### 13. 다국어 지원 확대
**현재**: 한국어, 영어만 지원
**제안**: 일본어, 베트남어 등 추가

**우선순위**: 🔵 낮음

---

## 📁 Prompt 템플릿 예시

### script_prompt.txt
```
상품명: {product_name}
타깃 고객: {target_audience}
톤앤매너: {tone}
스타일: {style}
브랜드 보이스: {brand_voice}
언어: {language}

30초 분량의 쇼핑 숏폼 대본을 작성해주세요.

다음 JSON 형식으로 응답해주세요:
{{
  "script": "전체 대본 텍스트",
  "hook": "첫 3초 훅 문구",
  "cta": "행동 유도 문구",
  "talking_points": ["포인트1", "포인트2", "포인트3"],
  "description": "릴스/쇼츠 설명문 (해시태그 포함)",
  "duration_seconds": 30
}}
```

### thumbnail_prompt.txt
```
상품명: {product_name}
타깃 고객: {target_audience}
톤앤매너: {tone}
스타일: {style}
훅 문구: {hook}

썸네일에 들어갈 임팩트 있는 짧은 문구를 3가지 만들어주세요.
각 문구는 10자 이내로 작성합니다.

다음 JSON 형식으로 응답해주세요:
{{
  "options": ["문구1", "문구2", "문구3"]
}}
```

### translation_prompt.txt
```
상품명: {product_name}
타깃 고객: {target_audience}
톤앤매너: {tone}
스타일: {style}

다음을 생성해주세요:
1. 한국어 검색 키워드 5개
2. 중국어 간체 키워드 5개
3. Douyin 검색에 적합한 중국어 쿼리 3개

다음 JSON 형식으로 응답해주세요:
{{
  "korean_keywords": ["키워드1", "키워드2", "키워드3", "키워드4", "키워드5"],
  "chinese_keywords": ["关键词1", "关键词2", "关键词3", "关键词4", "关键词5"],
  "douyin_search_queries": ["검색어1", "검색어2", "검색어3"]
}}
```

---

## ✅ 작업 체크리스트

### 즉시 작업 (Critical)
- [ ] `prompts/script_prompt.txt` 생성
- [ ] `prompts/thumbnail_prompt.txt` 생성
- [ ] `prompts/translation_prompt.txt` 생성
- [ ] `.env` 파일 생성 및 API 키 입력

### 단기 작업 (1주 이내)
- [ ] 로깅 시스템 구축
- [ ] API 비용 추적 기능
- [ ] 에러 메시지 개선
- [ ] 환경변수 검증 로직

### 중기 작업 (2-4주)
- [ ] 단위 테스트 작성
- [ ] Douyin 쿠키 검증
- [ ] 프롬프트 버전 관리
- [ ] 다운로드 중복 방지

### 장기 작업 (선택)
- [ ] 프로그레스 바 UI 개선
- [ ] 대시보드 기능
- [ ] 다국어 지원 확대

---

## 📊 개선 효과 예상

| 개선사항 | 예상 효과 |
|---------|----------|
| Prompt 파일 생성 | 앱 실행 가능 |
| 로깅 시스템 | 디버깅 시간 50% 단축 |
| API 비용 추적 | 비용 최적화 20% |
| 테스트 코드 | 버그 발생률 30% 감소 |
| 에러 처리 개선 | 사용자 문의 40% 감소 |

---

## 🔗 참고 자료

- [OpenAI API 베스트 프랙티스](https://platform.openai.com/docs/guides/production-best-practices)
- [Streamlit 성능 최적화](https://docs.streamlit.io/library/advanced-features/caching)
- [Python 로깅 가이드](https://docs.python.org/3/howto/logging.html)
- [Selenium 베스트 프랙티스](https://www.selenium.dev/documentation/test_practices/)

---

**다음 단계**: Critical 항목 해결 후 테스트 실행
