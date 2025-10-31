# 쿠팡 파트너스 프로젝트 통합 관리

이 폴더는 쿠팡 파트너스 제휴 마케팅 관련 모든 프로젝트를 관리하는 메인 워크스페이스입니다.

---

## 기본 작업 지침

### 1. 프로젝트 생성 규칙

새로운 프로젝트를 시작할 때 다음 규칙을 따릅니다:

```
project_name/
├── README.md              # 프로젝트 설명, 실행 방법
├── .env.example           # 환경 변수 템플릿
├── .gitignore             # Git 제외 파일 목록
├── requirements.txt       # Python 의존성 (Python 프로젝트)
├── package.json           # Node.js 의존성 (Node 프로젝트)
└── docs/                  # 프로젝트 상세 문서
```

### 2. 네이밍 컨벤션

- **프로젝트 폴더명**: 영문 소문자 + 언더스코어 (예: `shopping_shorts_automation`)
- **파일명**:
  - 코드 파일: 영문 소문자 + 언더스코어 (예: `main.py`, `api_client.js`)
  - 문서 파일: 한글 가능, 명확한 버전 표기 (예: `기획서_v1.0.md`)

### 3. 환경 변수 관리

**공통 환경 변수**:
```env
OPENAI_API_KEY=          # OpenAI API 키
OPENAI_MODEL=            # 사용 모델 (기본: gpt-4o-mini)
```

- 각 프로젝트는 `.env.example` 파일 필수 작성
- 실제 `.env` 파일은 `.gitignore`에 포함
- API 키 등 민감 정보는 절대 커밋하지 않음

### 4. 가상환경 설정

**Python 프로젝트**:
```bash
# 가상환경 생성
python -m venv .venv

# 활성화 (Windows)
.venv\Scripts\activate

# 의존성 설치
pip install -r requirements.txt
```

**Node.js 프로젝트**:
```bash
npm install
# 또는
yarn install
```

### 5. Git 커밋 규칙

```
feat: 새로운 기능 추가
fix: 버그 수정
docs: 문서 수정
refactor: 코드 리팩토링
test: 테스트 코드
chore: 설정 파일, 빌드 등
```

예시:
```
feat: Douyin 크롤링 기능 추가
fix: API 호출 에러 처리 개선
docs: README 설치 방법 업데이트
```

### 6. 문서화 원칙

- 모든 프로젝트는 README.md 필수
- README 필수 항목:
  - 프로젝트 설명
  - 주요 기능
  - 설치 방법
  - 실행 방법
  - 환경 변수 설명
- 복잡한 로직은 주석 또는 별도 문서 작성

### 7. 한글 코딩 가이드

이 프로젝트는 한국 시장을 타깃으로 하므로 한글 지원이 필수입니다.

**핵심 규칙**:
- 모든 파일은 **UTF-8 인코딩** 사용
- Python 파일 첫 줄에 `# -*- coding: utf-8 -*-` 추가
- **변수/함수명**: 영문 사용 (예: `product_name`)
- **주석/문서/메시지**: 한글 사용 (예: "상품 정보 처리")

**AI 도구 사용 시**:
- `.cursorrules` 파일이 AI 도구(Cursor, Copilot, Codex)에게 한글 사용 가이드를 제공합니다
- `.editorconfig` 파일이 모든 에디터에서 UTF-8을 강제합니다
- `.vscode/settings.json` 파일이 VSCode 환경을 설정합니다

자세한 내용은 [한글 코딩 가이드](./docs/한글_코딩_가이드.md)를 참고하세요.

---

## 현재 프로젝트 목록

### 활성 프로젝트

| 프로젝트명 | 경로 | 상태 | 설명 |
|---------|------|------|------|
| 쇼핑 쇼츠 반자동 제작 시스템 | `shopping_shorts_automation/` | 운영 중 | AI 기반 콘텐츠 기획 자동화 (Phase 1~2) |
| 쿠팡 파트너스 자동화 블로그 | `coupang_auto_blog/` | 개발 중 | Next.js + Firebase 기반 AI 블로그 자동화 |

#### 프로젝트별 상세 정보

**1. 쇼핑 쇼츠 반자동 제작 시스템** (`shopping_shorts_automation/`)
- **기술 스택**: Python, Streamlit, OpenAI API
- **주요 기능**: 쇼츠 대본 생성, 썸네일 문구, Douyin 레퍼런스 수집
- **실행**: `streamlit run app/main.py`

**2. 쿠팡 파트너스 자동화 블로그** (`coupang_auto_blog/`)
- **기술 스택**: Next.js, Firebase, OpenAI API
- **주요 기능**: AI 블로그 콘텐츠 자동 생성, 관리자 검수, 자동 게시
- **실행**: `cd web && npm run dev`

### 계획 중인 프로젝트

- 영상 제작 자동화 (CapCut/Typecast 연동)
- 유튜브 자동 업로드 시스템
- 성과 분석 대시보드
- 키워드 트렌드 분석 도구

---

## 공통 리소스

📚 **모든 문서 보기**: [docs/README.md](./docs/README.md)

### 개발 가이드
- [한글 코딩 가이드](./docs/한글_코딩_가이드.md) - AI 도구에서 한글 사용하기

### 기획 문서
- [쇼핑 쇼츠 반자동 제작 시스템 종합 기획서 v3.0](./docs/planning/쇼핑_쇼츠_반자동_제작_시스템_종합_기획서_v3.0.md) - 최신 버전
- [반자동 시스템 개발계획서 v2.0](./docs/planning/반자동_시스템_개발계획서_v2.0.md)

### 기술 스펙
- [유튜브 제휴마케팅 자동화 시스템 기술스택](./docs/specs/유튜브_제휴마케팅_자동화_시스템_기술스택.pdf)

### 참고 자료
- [월 3천만원 쇼츠 수익 비결 분석](./resources/media/월_3천만원_쇼츠_수익_비결__AI와_도구를_활용한_쿠팡_파트너스_제휴_마케팅_시스템_완벽_분석.m4a)

---

## 개발 워크플로우

### 1. 새 프로젝트 시작
```bash
# 1. 프로젝트 폴더 생성
mkdir project_name
cd project_name

# 2. 가상환경 설정
python -m venv .venv
.venv\Scripts\activate

# 3. 기본 파일 생성
touch README.md .env.example .gitignore requirements.txt

# 4. README.md 작성 (프로젝트 설명, 실행 방법 등)
```

### 2. 개발 진행
- 기능 개발 전 TODO 리스트 작성
- 코드 작성 시 주석으로 설명 추가
- 테스트 코드 작성 (가능한 경우)

### 3. 문서화
- 새로운 기능 추가 시 README 업데이트
- 환경 변수 추가 시 `.env.example` 업데이트
- 이 메인 README의 프로젝트 목록 업데이트

---

## 디렉토리 구조

```
Coupang partnner/
├── README.md                              # 이 파일 (프로젝트 허브)
├── LICENSE                                # 라이선스
├── .gitignore                             # Git 제외 파일
├── .editorconfig                          # 에디터 설정
├── .cursorrules                           # AI 도구 설정
├── .vscode/                               # VSCode 설정
│   └── settings.json
├── docs/                                  # 📚 문서 폴더
│   ├── README.md                          # 문서 인덱스
│   ├── 한글_코딩_가이드.md                 # 개발 가이드
│   ├── planning/                          # 기획서/계획서
│   ├── specs/                             # 기술 스펙
│   ├── references/                        # 참고 자료
│   └── archive/                           # 구버전 문서
├── resources/                             # 리소스 파일
│   └── media/                             # 미디어 파일
├── shopping_shorts_automation/            # 프로젝트 1: 쇼핑 쇼츠 제작
│   ├── README.md
│   ├── .env
│   ├── app/
│   ├── core/
│   └── ...
├── coupang_auto_blog/                     # 프로젝트 2: 자동화 블로그
│   ├── README.md
│   ├── web/                               # Next.js 프론트엔드
│   ├── functions/                         # Firebase Functions
│   ├── firebase.json
│   └── ...
└── [project_3]/                           # 프로젝트 3 (예정)
```

---

## 트러블슈팅

### 자주 발생하는 문제

1. **가상환경 활성화 오류**
   - Windows Powershell: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`
   - 또는 CMD 사용

2. **API 키 오류**
   - `.env` 파일이 프로젝트 루트에 있는지 확인
   - 환경 변수명 철자 확인 (`OPENAI_API_KEY`)

3. **의존성 설치 오류**
   - Python 버전 확인 (3.10 이상 권장)
   - pip 업그레이드: `python -m pip install --upgrade pip`

4. **한글이 깨지는 문제**
   - 파일이 UTF-8로 저장되었는지 확인
   - Python 파일 상단에 `# -*- coding: utf-8 -*-` 추가
   - 터미널 인코딩 확인 (Git Bash 사용 권장)
   - 자세한 해결 방법: [한글 코딩 가이드](./docs/한글_코딩_가이드.md)

5. **AI 도구(Codex, Copilot)가 영어로만 제안하는 문제**
   - `.cursorrules` 파일이 프로젝트 루트에 있는지 확인
   - 주석을 한글로 먼저 작성
   - 필요시 Prompt에 "한글로 작성" 명시

---

## 베스트 프랙티스

1. **환경 분리**: 각 프로젝트는 독립적인 가상환경 사용
2. **설정 관리**: 환경 변수로 설정 관리, 하드코딩 금지
3. **에러 처리**: 모든 API 호출에 try-except 적용
4. **로깅**: 중요 작업은 로그 기록
5. **백업**: 중요 데이터는 정기적으로 백업
6. **버전 관리**: 주요 업데이트 시 버전 태깅

---

## 연락처 및 이슈

- 프로젝트 관련 문의: [이슈 트래커 또는 연락처]
- 긴급 문제: [긴급 연락처]

---

**최종 업데이트**: 2025-10-31
**관리자**: [이름]
