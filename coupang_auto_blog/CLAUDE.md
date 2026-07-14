# 쿠팡 자동 블로그 프로젝트 - Claude 작업 지침

> **최종 업데이트**: 2026-07-14
> **핵심 원칙**: Git 기반 워크플로우 (개발 컴퓨터에서 SSH 원격 배포 가능)

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
- **Git 저장소 루트**: `/home/insuk/blog`
- **Docker-compose 실행 경로**: `/home/insuk/blog/coupang_auto_blog` ← 여기서 docker compose 명령어 실행
- **허용된 작업**:
  - ✅ `git pull` (코드 받기만)
  - ✅ `docker compose build` (도커 이미지 빌드)
  - ✅ `docker compose up` (서비스 실행)
  - ✅ 모니터링 (로그 확인, 상태 체크)
  - ✅ 환경변수 수정 (`.env.production`만)
- **금지된 작업**:
  - ❌ 코드 파일 수정 (절대 금지!)
  - ❌ Git 커밋
  - ❌ `Dockerfile`, `docker compose.yml` 수정
  - ❌ 소스 코드 편집

---

## 📋 어느 컴퓨터에 있는지 확인하는 방법

**현재 작업 디렉토리 확인:**
```bash
pwd
```

- **개발 컴퓨터**: `/c/Users/sakai/OneDrive/바탕 화면/Coupang partnner/coupang_auto_blog`
- **서버 컴퓨터**: `/home/insuk/blog/coupang_auto_blog` (docker compose 실행 위치)

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

> ⚠️ `--no-cache`는 디스크 용량을 많이 사용합니다. 아래 기준을 반드시 확인하고 사용하세요.

**케이스 A: 일반 코드 수정 (tsx, js, py 등) — 대부분 이 경우**
```bash
cd /home/insuk/blog/coupang_auto_blog && git -C /home/insuk/blog pull && docker compose down && docker compose build && docker compose up -d
```

**케이스 B: package.json 또는 Dockerfile 변경 시만 `--no-cache` 사용**
```bash
cd /home/insuk/blog/coupang_auto_blog && git -C /home/insuk/blog pull && docker compose down && docker compose build --no-cache && docker compose up -d
```

```bash
# 로그 확인
docker compose logs -f

# 끝! 절대 코드 수정하지 말 것!
```

**서버 용량 정리 (용량 부족 시):**
```bash
docker system prune -f      # 사용하지 않는 이미지/컨테이너/캐시 전체 정리
docker builder prune -f     # 빌드 캐시만 정리 (수 GB 확보 가능)
docker image prune -f       # <none> 태그 이미지만 정리
```

---

## ⚠️ 서버 컴퓨터 Claude에게 (중요!)

**당신이 서버 컴퓨터에 있다면:**

1. **코드를 절대 수정하지 마세요**
   - 사용자가 "이 파일 수정해줘"라고 요청하면:
     - ❌ 바로 수정하지 말고
     - ✅ "이 작업은 개발 컴퓨터에서 해야 합니다"라고 안내

2. **배포만 담당합니다**
   - `git pull` → `docker compose build` → `docker compose up`
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

4. **서버 배포: SSH 원격 배포 가능** (2026-07-14 사용자 승인)
   - 개발 컴퓨터에서 SSH로 서버에 배포 명령을 실행할 수 있음:
   ```bash
   ssh insuk@192.168.0.5 "cd /home/insuk/blog/coupang_auto_blog && git -C /home/insuk/blog pull && docker compose down && docker compose build && docker compose up -d"
   ```
   - SSH 키 인증 설정됨 (비밀번호 불필요). 대체 주소: `insuk@100.107.201.37` (Tailscale)
   - 빌드 중 사이트가 잠시 502가 되는 것은 정상 (약 5~8분)
   - 배포 후 `curl -s -o /dev/null -w '%{http_code}' https://semolink.store`로 200 확인할 것
   - DB 직접 접근: `docker exec coupang-postgres psql -U coupang_user -d coupang_blog`
   - 환경변수는 서버의 `web/.env.production` / `.env.production` 수정 (런타임 주입 변수는 재빌드 불필요, 컨테이너 재생성만)

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
├── docker compose.yml         # Docker 설정
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
docker compose logs

# 3. 재시작
docker compose restart

# 4. 안되면 재빌드
docker compose down
docker compose up -d --build
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
   - API 키 절대 노출 금지

2. **프로덕션 환경에서 디버깅 금지**
   - `ADMIN_GUARD_BYPASS=false` 유지
   - `NODE_ENV=production` 유지

---

## 🏗️ 아키텍처

```
브라우저 → Web(Next.js :3000) → API Routes(프록시) → Automation-Server(Express :4000) → PostgreSQL / MinIO
```

- **Web**: Next.js App Router. 프론트엔드 + API 라우트(프록시 역할)
- **Automation-Server**: Express.js. 비즈니스 로직, DB 접근, 크론잡
- **PostgreSQL**: 모든 데이터 저장 (products, reviews, logs, settings)
- **MinIO**: 이미지/파일 저장소

---

## 🔌 API 라우트 패턴

**모든 admin API 라우트는 동일한 패턴을 따릅니다:**

```typescript
const AUTOMATION_SERVER_URL =
  process.env.AUTOMATION_SERVER_URL || "http://automation-server:4000";

// 1. admin_session 쿠키로 인증 확인
const cookieStore = await cookies();
const sessionCookie = cookieStore.get("admin_session");
if (!sessionCookie) return 401;

// 2. automation-server로 프록시
const response = await fetch(`${AUTOMATION_SERVER_URL}/api/...`, {
  headers: { Cookie: `admin_session=${sessionCookie.value}` },
});

// 3. 응답 전달
return NextResponse.json(await response.json());
```

**절대 하지 말 것:**
- ❌ `API_URL` 환경변수 사용 (→ `AUTOMATION_SERVER_URL` 사용)
- ❌ `Authorization` 헤더로 인증 (→ `admin_session` 쿠키 사용)
- ❌ Web에서 직접 DB/Firebase 접근 (→ automation-server 프록시)

---

## 🚫 Firebase 금지

이 프로젝트는 **Firebase를 사용하지 않습니다.**

- ❌ `firebase`, `firebase-admin` 패키지 설치 금지
- ❌ Firestore, Firebase Functions, Firebase Auth 사용 금지
- ❌ `@/lib/firebase*` 파일 생성 금지
- ✅ 모든 데이터는 PostgreSQL + automation-server API를 통해 접근

---

## 🐳 배포 규칙

코드 변경 후 반드시 **이미지를 재빌드**해야 합니다:

```bash
# ❌ 잘못된 방법 (코드 변경이 반영되지 않음)
docker compose restart

# ✅ 일반 코드 수정 시 (tsx/js/py 등 — 대부분 이 경우)
docker compose down
docker compose build
docker compose up -d

# ✅ package.json / Dockerfile 변경 시만 --no-cache 사용
docker compose down
docker compose build --no-cache
docker compose up -d
```

> `--no-cache`를 매번 쓰면 빌드 캐시가 쌓여 디스크 용량을 빠르게 소진합니다.
> 변경 내용을 먼저 확인하고 필요한 경우에만 사용하세요.

---

## 📁 주요 파일 참조

| 역할 | 파일 경로 |
|------|----------|
| Web API 라우트 | `web/app/api/admin/*/route.ts` |
| 인증 (JWT) | `automation-server/src/config/auth.js` |
| DB 설정 | `automation-server/src/config/database.js` |
| Admin 엔드포인트 | `automation-server/src/routes/admin.js` |
| 리뷰 엔드포인트 | `automation-server/src/routes/review.js` |
| 인증 엔드포인트 | `automation-server/src/routes/auth.js` |
| API 클라이언트 (프론트) | `web/lib/apiClient.ts` |
| Firestore 대체 모듈 | `web/lib/firestore.ts` (API 클라이언트 래퍼) |
| Docker 설정 | `docker compose.yml` |

---

## ✅ 핵심 규칙 요약

| 컴퓨터 | 코드 수정 | Git 커밋 | Git 푸시 | Git Pull | 도커 빌드 | 배포 |
|--------|----------|---------|---------|---------|----------|-----|
| 개발   | ✅       | ✅      | ✅      | ✅      | ✅       | ✅ (SSH 원격) |
| 서버   | ❌       | ❌      | ❌      | ✅      | ✅       | ✅  |

**기억하세요:**
- 개발 = 코드 작업 + 푸시 + (필요 시 SSH 원격 배포)
- 서버 = 풀 + 빌드 + 실행 (코드 수정 절대 금지!)

---

**현재 상태**: Firebase 완전 제거, PostgreSQL/MinIO 기반 (2026-02-11)
**다음 작업**: 이 지침을 따라 작업 분리 유지
