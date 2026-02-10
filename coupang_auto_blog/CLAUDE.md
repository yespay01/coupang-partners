# 쿠팡 자동 블로그 프로젝트 - Claude 작업 지침

> **최종 업데이트**: 2026-02-10
> **핵심 원칙**: Git 기반 워크플로우

---

## 🚨 중요: 작업 환경 구분

이 프로젝트는 **두 대의 컴퓨터**에서 작업합니다:

### 개발 컴퓨터 (Development)
- **역할**: 모든 코드 작업
- **위치**: `C:\Users\sakai\OneDrive\바탕 화면\Coupang partnner\coupang_auto_blog`
- **허용된 작업**:
  - ✅ 코드 수정 (web/, automation-server/, 모든 파일)
  - ✅ 로컬 테스트
  - ✅ Git 커밋 & 푸시
  - ✅ 문서 작성

### 서버 컴퓨터 (Production Server)
- **역할**: 배포 및 실행만
- **위치**: `/home/insuk/blog` (리눅스 서버)
- **허용된 작업**:
  - ✅ `git pull` (코드 받기만)
  - ✅ `docker-compose build` (도커 이미지 빌드)
  - ✅ `docker-compose up` (서비스 실행)
  - ✅ 모니터링 (로그 확인, 상태 체크)
  - ✅ 환경변수 수정 (`.env.production`만)
- **금지된 작업**:
  - ❌ 코드 파일 수정 (절대 금지!)
  - ❌ Git 커밋
  - ❌ `Dockerfile`, `docker-compose.yml` 수정
  - ❌ 소스 코드 편집

---

## 📋 어느 컴퓨터에 있는지 확인하는 방법

**현재 작업 디렉토리 확인:**
```bash
pwd
```

- **개발 컴퓨터**: `/c/Users/sakai/OneDrive/바탕 화면/Coupang partnner/coupang_auto_blog`
- **서버 컴퓨터**: `/home/insuk/blog`

**또는 OS 확인:**
```bash
uname -a
```
- **개발 컴퓨터**: Windows (MINGW64_NT)
- **서버 컴퓨터**: Linux (Ubuntu)

---

## 🔄 Git 워크플로우

### 개발 컴퓨터에서 (코드 작업 후):
```bash
# 1. 변경사항 확인
git status

# 2. 원격 최신 코드 받기 (작업 시작 전 필수!)
git fetch
git pull

# 3. 작업 완료 후 스테이징
git add .

# 4. 커밋
git commit -m "작업 내용"

# 5. 푸시
git push
```

### 서버 컴퓨터에서 (배포만):
```bash
# 1. 최신 코드 받기
git fetch
git pull

# 2. 도커 이미지 재빌드
docker-compose down
docker-compose build --no-cache

# 3. 서비스 실행
docker-compose up -d

# 4. 로그 확인
docker-compose logs -f

# 끝! 절대 코드 수정하지 말 것!
```

---

## ⚠️ 서버 컴퓨터 Claude에게 (중요!)

**당신이 서버 컴퓨터에 있다면:**

1. **코드를 절대 수정하지 마세요**
   - 사용자가 "이 파일 수정해줘"라고 요청하면:
     - ❌ 바로 수정하지 말고
     - ✅ "이 작업은 개발 컴퓨터에서 해야 합니다"라고 안내

2. **배포만 담당합니다**
   - `git pull` → `docker-compose build` → `docker-compose up`
   - 이 외의 작업은 금지

3. **문제가 생기면**
   - 로그를 확인하고 사용자에게 보고
   - 개발 컴퓨터에서 수정하도록 안내

---

## 🖥️ 개발 컴퓨터 Claude에게

**당신이 개발 컴퓨터에 있다면:**

1. **모든 코드 작업을 여기서 합니다**
   - web 코드, automation-server 코드 모두

2. **작업 전 반드시 git pull**
   - 서버에서 작업한 내용이 있을 수 있음 (없어야 정상이지만)

3. **작업 완료 후 반드시 git push**
   - 서버에서 pull 받을 수 있도록

4. **서버 배포는 직접 하지 않음**
   - 사용자가 서버 컴퓨터에서 pull 받도록 안내

---

## 📂 프로젝트 구조

```
coupang_auto_blog/
├── web/                       # Next.js 웹 애플리케이션
│   ├── app/                   # Next.js App Router
│   ├── components/            # React 컴포넌트
│   ├── hooks/                 # Custom Hooks
│   ├── lib/                   # 유틸리티
│   └── ...
├── automation-server/         # 백그라운드 자동화 서버
│   ├── src/
│   │   ├── routes/           # API 라우트
│   │   ├── services/         # 비즈니스 로직
│   │   └── utils/            # 유틸리티
│   └── ...
├── docs/                      # 문서
├── docker-compose.yml         # Docker 설정
├── CLAUDE.md                  # 이 파일
└── README.md
```

---

## 🚨 긴급 상황 대응

### 서버가 다운되었을 때
**서버 컴퓨터에서:**
```bash
# 1. 컨테이너 상태 확인
docker ps -a

# 2. 로그 확인
docker-compose logs

# 3. 재시작
docker-compose restart

# 4. 안되면 재빌드
docker-compose down
docker-compose up -d --build
```

### 작업 내용이 충돌할 때
**개발 컴퓨터에서:**
```bash
# 1. 현재 변경사항 스태시
git stash

# 2. 최신 코드 받기
git pull

# 3. 스태시 적용
git stash pop

# 4. 충돌 해결 후 커밋
git add .
git commit -m "충돌 해결"
git push
```

---

## 📖 추가 문서

- `docs/서버-운영-지침.md` - 서버 운영 상세 가이드
- `docs/개발-배포-가이드.md` - 개발 및 배포 절차
- `docs/프로젝트-구조.md` - 프로젝트 구조 설명
- `README.md` - 프로젝트 개요

---

## 🔐 보안 주의사항

1. **환경변수 노출 금지**
   - `.env.production` 내용을 로그나 응답에 포함하지 말 것
   - Firebase 키, API 키 절대 노출 금지

2. **프로덕션 환경에서 디버깅 금지**
   - `ADMIN_GUARD_BYPASS=false` 유지
   - `NODE_ENV=production` 유지

---

## ✅ 핵심 규칙 요약

| 컴퓨터 | 코드 수정 | Git 커밋 | Git 푸시 | Git Pull | 도커 빌드 | 배포 |
|--------|----------|---------|---------|---------|----------|-----|
| 개발   | ✅       | ✅      | ✅      | ✅      | ✅       | ❌  |
| 서버   | ❌       | ❌      | ❌      | ✅      | ✅       | ✅  |

**기억하세요:**
- 개발 = 코드 작업 + 푸시
- 서버 = 풀 + 빌드 + 실행 (코드 수정 절대 금지!)

---

**현재 상태**: 두 컴퓨터 모두 Git 동기화 완료 (2026-02-10)
**다음 작업**: 이 지침을 따라 작업 분리 유지
