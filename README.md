# 쿠팡 파트너스 자동화 블로그 시스템

## 프로젝트 개요

쿠팡 파트너스 상품을 자동으로 수집·요약·게시하는 AI 기반 블로그 플랫폼입니다.
AI가 자동으로 후기 콘텐츠를 작성하고 관리자가 검수한 뒤 게시하는 반자동 구조로,
신뢰성 있는 정보를 전달하도록 설계합니다.

**독립 서버 구조로 완전히 전환되어 Firebase 의존성 없이 운영 가능합니다.**

---

## 🏗️ 아키텍처

```
┌─────────────────────────┐
│   Web (Next.js)         │  포트 3000
│   - 블로그 UI           │
│   - 관리자 대시보드      │
│   - API Routes          │
└──────────┬──────────────┘
           │ HTTP API 호출
           ↓
┌─────────────────────────┐
│  Automation Server      │  포트 4000
│  (Express.js)           │
│  - 상품 수집 API        │
│  - 리뷰 생성 API        │
│  - 스케줄 작업 (cron)   │
│  - JWT 인증             │
└──────────┬──────────────┘
           │
    ┌──────┴──────┐
    ↓             ↓
┌──────────┐  ┌──────────┐
│PostgreSQL│  │  MinIO   │
│(포트 5433)│  │(포트 9000)│
│  - 상품   │  │  - 이미지 │
│  - 리뷰   │  │  - 문서   │
│  - 로그   │  │  - 백업   │
└──────────┘  └──────────┘
```

---

## 🛠 기술 스택

### Frontend
- **Next.js 15** (App Router)
- **TailwindCSS** - 스타일링
- **React Query** - 서버 상태 관리
- **Zustand** - 클라이언트 상태 관리

### Backend
- **Express.js** - REST API 서버
- **PostgreSQL 16** - 메인 데이터베이스
- **MinIO** - S3 호환 오브젝트 스토리지
- **node-cron** - 스케줄 작업

### Authentication
- **JWT** (jsonwebtoken)
- **bcrypt** - 비밀번호 해싱

### AI
- **OpenAI API** (GPT-4, GPT-4o-mini)
- **Google Gemini API** (선택)
- **Anthropic Claude API** (선택)

### Infrastructure
- **Docker** & **Docker Compose**
- **Nginx** (프록시/리버스 프록시)

---

## 📦 데이터베이스 구조 (PostgreSQL)

### users
관리자 계정 정보
- `id` (SERIAL PRIMARY KEY)
- `email` (VARCHAR, UNIQUE)
- `password_hash` (VARCHAR)
- `name` (VARCHAR)
- `role` (VARCHAR: 'admin', 'user')
- `created_at`, `updated_at`

### products
수집된 상품 정보
- `id` (SERIAL PRIMARY KEY)
- `product_id` (VARCHAR, UNIQUE)
- `product_name`, `product_price`, `product_image`, `product_url`
- `category_id`, `category_name`
- `affiliate_url`
- `source` (goldbox, keyword, category, etc.)
- `status` (pending, reviewed, published)
- `created_at`, `updated_at`

### reviews
생성된 리뷰/후기
- `id` (SERIAL PRIMARY KEY)
- `product_id` (FK → products)
- `title`, `content`, `slug`
- `status` (draft, needs_revision, approved, published)
- `category`, `affiliate_url`
- `author`, `media` (JSONB)
- `tone_score`, `char_count`, `view_count`
- `created_at`, `updated_at`, `published_at`

### settings
시스템 설정 (JSONB)
- `id` (SERIAL PRIMARY KEY)
- `key` (VARCHAR, UNIQUE)
- `value` (JSONB)
- `description`

### logs
시스템 로그
- `id` (SERIAL PRIMARY KEY)
- `type` (ingestion, generation, publishing, etc.)
- `level` (info, warn, error)
- `message`, `payload` (JSONB)
- `created_at`

---

## 🚀 빠른 시작

### 요구 사항
- **Docker** 24.0 이상
- **Docker Compose** 2.20 이상
- **Node.js 18+** (로컬 개발 시)

### 1. 저장소 클론

```bash
git clone https://github.com/yespay01/coupang-partners.git
cd coupang-partners/coupang_auto_blog
```

### 2. 환경변수 설정

#### automation-server/.env
```bash
cp automation-server/.env.example automation-server/.env
```

```env
# 서버 설정
PORT=4000
NODE_ENV=production

# Database
DATABASE_URL=postgresql://coupang_user:your-secure-password@postgres:5432/coupang_blog

# MinIO Storage
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_USE_SSL=false

# JWT Auth
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# Coupang Partners API
COUPANG_ACCESS_KEY=your-access-key
COUPANG_SECRET_KEY=your-secret-key
COUPANG_PARTNER_ID=your-partner-id
COUPANG_SUB_ID=blog

# AI Provider (OpenAI 또는 Gemini)
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
# GEMINI_API_KEY=...
# GEMINI_MODEL=gemini-2.5-flash

# Slack Webhook (선택)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

#### web/.env.production
```bash
cp web/.env.example web/.env.production
```

```env
# API Base URL (Docker 내부)
NEXT_PUBLIC_API_URL=http://automation-server:4000

# 프로덕션 설정
NODE_ENV=production
```

### 3. Docker Compose로 실행

```bash
# 빌드 및 실행
docker compose up -d

# 로그 확인
docker compose logs -f

# 특정 서비스 로그
docker compose logs -f automation-server
docker compose logs -f web
```

### 4. 접속

- **블로그**: http://localhost:3000
- **MinIO Console**: http://localhost:9001
- **Automation Server Health Check**: http://localhost:4000/health

### 5. 초기 관리자 계정

기본 계정이 자동 생성됩니다:
- **Email**: admin@coupang.com
- **Password**: admin123

> ⚠️ **보안**: 운영 환경에서는 반드시 비밀번호를 변경하세요!

---

## 🧑‍💻 로컬 개발 (Docker 없이)

### 1. PostgreSQL 시작

```bash
docker run -d \
  --name coupang-postgres \
  -e POSTGRES_DB=coupang_blog \
  -e POSTGRES_USER=coupang_user \
  -e POSTGRES_PASSWORD=your-password \
  -p 5433:5432 \
  postgres:16-alpine
```

### 2. MinIO 시작

```bash
docker run -d \
  --name coupang-minio \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin123 \
  -p 9000:9000 \
  -p 9001:9001 \
  minio/minio server /data --console-address ":9001"
```

### 3. Automation Server 실행

```bash
cd automation-server
npm install
cp .env.example .env
# .env 파일 수정 (DATABASE_URL, MINIO_ENDPOINT 등)

# 개발 모드
npm run dev

# 프로덕션 모드
npm start
```

### 4. Web 앱 실행

```bash
cd web
npm install

# 개발 모드
npm run dev

# 프로덕션 빌드
npm run build
npm start
```

---

## ⏰ 자동화 스케줄

Automation Server의 node-cron이 다음 작업을 자동 실행합니다:

| 시간 (KST) | 작업 | 설명 |
|-----------|------|------|
| 매일 02:00 | 상품 수집 | 쿠팡 API에서 신규 상품 수집 |
| 매일 03:00 | 리뷰 생성 | pending 상태 상품에 대해 AI 리뷰 생성 |
| 매주 일요일 00:00 | 로그 정리 | 30일 이상 오래된 로그 삭제 |

스케줄 설정 파일: `automation-server/src/cron/scheduler.js`

---

## 🔌 API 엔드포인트

### Health Check
```bash
GET /health
```

### 인증
```bash
POST /api/auth/login          # 로그인
POST /api/auth/register        # 회원가입
GET  /api/auth/me             # 현재 사용자 정보
```

### 상품 수집
```bash
POST /api/collect/auto         # 자동 수집 (스케줄러용)
POST /api/collect/manual       # 수동 수집
```

### 리뷰 관리
```bash
POST /api/review/generate      # 리뷰 생성
POST /api/review/publish       # 리뷰 게시
```

### 관리자
```bash
POST /api/admin/cleanup-logs   # 로그 정리
GET  /api/admin/stats          # 시스템 통계
```

자세한 API 문서는 [docs/Automation-Server-가이드.md](./docs/Automation-Server-가이드.md)를 참조하세요.

---

## 📂 프로젝트 구조

```
coupang_auto_blog/
├── automation-server/          # 자동화 서버
│   ├── src/
│   │   ├── config/            # DB, Storage, Auth 설정
│   │   ├── routes/            # API 라우트
│   │   ├── cron/              # 스케줄 작업
│   │   ├── services/          # 비즈니스 로직
│   │   └── index.js           # 서버 진입점
│   ├── db/schema.sql          # PostgreSQL 스키마
│   ├── Dockerfile
│   └── package.json
│
├── web/                        # Next.js 웹 앱
│   ├── app/                   # App Router
│   │   ├── (dashboard)/      # 관리자 페이지
│   │   ├── api/               # API Routes (프록시)
│   │   └── page.tsx           # 메인 페이지
│   ├── components/            # React 컴포넌트
│   ├── hooks/                 # React Query hooks
│   ├── lib/                   # 유틸리티
│   ├── Dockerfile
│   └── package.json
│
├── docs/                       # 문서
│   ├── README.md              # 문서 인덱스
│   ├── Automation-Server-가이드.md
│   ├── 개발-배포-가이드.md
│   └── 환경변수-가이드.md
│
├── docker-compose.yml          # Docker Compose 설정
└── README.md                   # 이 파일
```

---

## 🐳 Docker 명령어

### 서비스 제어
```bash
# 전체 시작
docker compose up -d

# 전체 중지
docker compose down

# 특정 서비스 재시작
docker compose restart automation-server
docker compose restart web

# 로그 확인
docker compose logs -f automation-server
docker compose logs -f web

# 서비스 상태 확인
docker compose ps
```

### 데이터베이스 관리
```bash
# PostgreSQL 접속
docker exec -it coupang-postgres psql -U coupang_user -d coupang_blog

# 스키마 재생성
docker exec -i coupang-postgres psql -U coupang_user -d coupang_blog < automation-server/db/schema.sql

# 백업
docker exec coupang-postgres pg_dump -U coupang_user coupang_blog > backup.sql

# 복원
docker exec -i coupang-postgres psql -U coupang_user -d coupang_blog < backup.sql
```

### 컨테이너 초기화
```bash
# 모든 컨테이너 및 볼륨 삭제 (데이터 손실 주의!)
docker compose down -v

# 이미지 재빌드
docker compose build --no-cache
docker compose up -d
```

---

## 🔧 환경변수 가이드

자세한 환경변수 설명은 [docs/환경변수-가이드.md](./docs/환경변수-가이드.md)를 참조하세요.

### 필수 환경변수

#### Automation Server
- `DATABASE_URL`: PostgreSQL 연결 문자열
- `JWT_SECRET`: JWT 시크릿 키 (보안!)
- `COUPANG_ACCESS_KEY`, `COUPANG_SECRET_KEY`: 쿠팡 API 키
- `OPENAI_API_KEY`: OpenAI API 키

#### Web
- `NEXT_PUBLIC_API_URL`: Automation Server URL

---

## 📖 문서

상세한 문서는 `docs/` 디렉토리를 참조하세요:

| 문서 | 설명 |
|------|------|
| [README.md](./docs/README.md) | 문서 인덱스 |
| [Automation-Server-가이드.md](./docs/Automation-Server-가이드.md) | 자동화 서버 구축 및 운영 |
| [개발-배포-가이드.md](./docs/개발-배포-가이드.md) | 로컬 개발 → 배포 플로우 |
| [환경변수-가이드.md](./docs/환경변수-가이드.md) | 환경변수 설정 및 관리 |
| [문제해결-가이드.md](./docs/문제해결-가이드.md) | 트러블슈팅 가이드 |
| [프로젝트-구조.md](./docs/프로젝트-구조.md) | 전체 프로젝트 구조 |

---

## 🧪 테스트

```bash
# Automation Server 테스트
cd automation-server
npm test

# Web 앱 린트
cd web
npm run lint

# 빌드 테스트
npm run build
```

---

## 🚀 배포

### 서버 배포 (Docker Compose)

1. **서버에 파일 전송**
```bash
# rsync로 전송
rsync -avz --exclude node_modules --exclude .git \
  . user@server:/home/user/coupang-blog/
```

2. **서버에서 실행**
```bash
ssh user@server
cd /home/user/coupang-blog

# 환경변수 설정
cp automation-server/.env.example automation-server/.env
cp web/.env.example web/.env.production
# 파일 수정

# Docker Compose 실행
docker compose up -d

# 로그 확인
docker compose logs -f
```

3. **Nginx 설정 (선택)**

```nginx
# /etc/nginx/sites-available/coupang-blog
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

자세한 배포 가이드는 [docs/서버-배포-가이드.md](./docs/서버-배포-가이드.md)를 참조하세요.

---

## 🆘 문제 해결

### 서버가 시작되지 않을 때

1. **로그 확인**
```bash
docker compose logs automation-server
docker compose logs postgres
```

2. **환경변수 확인**
```bash
# automation-server/.env 파일 확인
cat automation-server/.env
```

3. **데이터베이스 연결 테스트**
```bash
docker exec coupang-postgres pg_isready -U coupang_user
```

### 더 많은 문제 해결

[docs/문제해결-가이드.md](./docs/문제해결-가이드.md)를 참조하세요.

---

## 🔄 마이그레이션 (Firebase → 독립 서버)

이 프로젝트는 Firebase에서 독립 서버로 완전히 전환되었습니다.

### 변경 사항
- ✅ **Firestore** → **PostgreSQL**
- ✅ **Firebase Storage** → **MinIO**
- ✅ **Firebase Auth** → **JWT + bcrypt**
- ✅ **Cloud Functions** → **Express.js Automation Server**
- ✅ **Cloud Scheduler** → **node-cron**
- ✅ **Firebase Hosting** → **Docker + Nginx**

### 레거시 파일
`functions/` 디렉토리는 레거시 코드로, 더 이상 사용되지 않습니다.

---

## 🧭 UI 구조

### 사용자 블로그
- 메인 페이지: 최신 후기 / 인기 후기 / 카테고리
- 후기 상세 페이지: 본문 + 관련 후기 + 쿠팡 링크
- 카테고리 페이지: 카테고리별 후기 목록

### 관리자 대시보드
- 수익 대시보드: 클릭/주문/커미션 통계
- 상품 관리: 수집된 상품 목록 및 상태 관리
- 후기 관리: 리뷰 검수 및 승인 워크플로
- 설정: 쿠팡 API, AI Provider, 자동화 설정
- 로그 뷰어: 시스템 로그 조회

---

## 🤝 기여

이슈 및 PR은 언제든 환영합니다!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다.

---

## 📞 문의

프로젝트 관련 문의는 GitHub Issues를 이용해주세요.

---

**마지막 업데이트**: 2026-02-05
**버전**: 2.0.0 (독립 서버 전환 완료)
