# Automation Server 가이드

> Firebase Functions 대체 자동화 서버

---

## 📋 개요

**Automation Server**는 Firebase Functions를 대체하는 독립적인 Node.js 서버입니다.

### 왜 필요한가?

- ✅ Firebase Functions 의존성 제거
- ✅ 완전한 독립 운영 가능
- ✅ 비용 절감 (서버리스 비용 없음)
- ✅ 판매용 프로젝트에 적합
- ✅ Web과 자동화 로직 분리

---

## 🏗️ 아키텍처

```
┌─────────────────┐        ┌──────────────────┐
│  Web 서버       │        │  자동화 서버      │
│  (Next.js)      │◄──────►│  (Express.js)    │
│  - 사이트       │  HTTP  │  - 상품 수집     │
│  - 관리자 UI    │        │  - 리뷰 생성     │
│  - API Routes   │        │  - 스케줄 작업   │
└─────────────────┘        └──────────────────┘
        ↓                          ↓
        └──────────►Firebase◄──────┘
                   (Firestore)
```

---

## 📁 디렉토리 구조

```
automation-server/
├── src/
│   ├── config/
│   │   └── firebase.js          # Firebase Admin 초기화
│   ├── routes/
│   │   ├── collect.js           # 상품 수집 API
│   │   ├── review.js            # 리뷰 생성/게시 API
│   │   └── admin.js             # 관리자 API
│   ├── cron/
│   │   └── scheduler.js         # 스케줄 작업 (node-cron)
│   ├── services/
│   │   ├── coupang/             # 쿠팡 API (functions/에서 복사)
│   │   ├── settingsService.js   # Firestore 설정 조회
│   │   ├── slack.js             # Slack 알림
│   │   ├── aiProviders.js       # OpenAI, Gemini
│   │   ├── reviewUtils.js       # 리뷰 유틸
│   │   └── imageUtils.js        # 이미지 수집
│   └── index.js                 # Express 서버 진입점
├── .env                         # 환경변수
├── .env.example                 # 환경변수 템플릿
├── Dockerfile                   # Docker 이미지
├── .dockerignore
├── .gitignore
├── package.json
└── README.md
```

---

## ⚙️ 환경변수 설정

### automation-server/.env

```env
# 서버 설정
PORT=4000
NODE_ENV=production
API_BASE_URL=http://automation-server:4000

# Firebase Admin SDK
FIREBASE_PROJECT_ID=blog-automation-23092
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@blog-automation-23092.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Coupang Partners API
COUPANG_ACCESS_KEY=your-access-key
COUPANG_SECRET_KEY=your-secret-key
COUPANG_PARTNER_ID=your-partner-id

# AI Providers
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...

# Slack (선택)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# 이미지 서버
IMAGE_SERVER_URL=https://img.semolink.store
```

---

## 🚀 로컬 개발

### 1. 의존성 설치

```bash
cd automation-server
npm install
```

### 2. 환경변수 설정

```bash
cp .env.example .env
# .env 파일 수정
```

### 3. 개발 서버 실행

```bash
npm run dev
```

서버: `http://localhost:4000`

---

## 📡 API 엔드포인트

### Health Check

```bash
GET /health
```

**응답:**
```json
{
  "status": "ok",
  "service": "automation-server",
  "timestamp": "2026-02-04T00:00:00.000Z"
}
```

---

### 상품 수집

#### POST /api/collect/auto
자동 상품 수집 (스케줄러용)

**요청:**
```bash
POST /api/collect/auto
```

**응답:**
```json
{
  "success": true,
  "message": "10개의 상품이 수집되었습니다.",
  "data": {
    "totalCollected": 10,
    "stats": {
      "goldbox": 2,
      "categories": 4,
      "keywords": 3,
      "coupangPL": 1
    }
  }
}
```

---

#### POST /api/collect/manual
수동 상품 수집

**요청:**
```bash
POST /api/collect/manual
Content-Type: application/json

{
  "maxProducts": 20
}
```

---

### 리뷰 관리

#### POST /api/review/generate
리뷰 생성

**요청:**
```bash
POST /api/review/generate
Content-Type: application/json

{
  "productId": "xxx"
}
```

**응답:**
```json
{
  "success": true,
  "message": "리뷰가 생성되었습니다.",
  "data": {
    "reviewId": "yyy",
    "toneScore": 0.85,
    "charCount": 1200,
    "provider": "openai",
    "model": "gpt-4"
  }
}
```

---

#### POST /api/review/publish
리뷰 게시

**요청:**
```bash
POST /api/review/publish
Content-Type: application/json

{
  "reviewId": "yyy"
}
```

---

### 관리자

#### POST /api/admin/cleanup-logs
오래된 로그 정리

**요청:**
```bash
POST /api/admin/cleanup-logs
Content-Type: application/json

{
  "daysToKeep": 30
}
```

---

#### GET /api/admin/stats
시스템 통계

**요청:**
```bash
GET /api/admin/stats
```

**응답:**
```json
{
  "success": true,
  "data": {
    "products": 150,
    "reviews": 45,
    "logs": 2300,
    "timestamp": "2026-02-04T00:00:00.000Z"
  }
}
```

---

## ⏰ 스케줄 작업

**node-cron**으로 구현:

| 작업 | 스케줄 | 설명 |
|------|--------|------|
| 상품 수집 | 매일 새벽 2시 | `/api/collect/auto` 호출 |
| 리뷰 생성 | 매일 새벽 3시 | pending 상품에 대해 리뷰 생성 |
| 로그 정리 | 매주 일요일 자정 | 30일 이상 로그 삭제 |

**타임존:** Asia/Seoul (KST)

---

## 🐳 Docker 배포

### 로컬 테스트

```bash
# 이미지 빌드
docker build -t automation-server ./automation-server

# 컨테이너 실행
docker run -d \
  --name automation-server \
  -p 4000:4000 \
  --env-file ./automation-server/.env \
  automation-server

# 로그 확인
docker logs -f automation-server
```

---

### 서버 배포 (Web + Automation Server 함께)

**docker-compose.yml** 사용:

```bash
# 서버에서
cd /home/insuk/blog

# .env 파일 준비
cp automation-server/.env.example automation-server/.env
# automation-server/.env 수정

# 빌드 및 실행
docker compose up -d

# 로그 확인
docker compose logs -f automation-server
```

---

## 🔗 Web 앱과 연동

Web 앱에서 Automation Server 호출:

### 예: 상품 수집

```typescript
// web/app/api/admin/collect/route.ts
export async function POST(request: Request) {
  try {
    const response = await fetch('http://automation-server:4000/api/collect/manual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maxProducts: 10 }),
    });

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    return Response.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
```

---

## 🆚 Firebase Functions vs Automation Server

| 항목 | Firebase Functions | Automation Server |
|------|-------------------|-------------------|
| 배포 | `firebase deploy` | Docker |
| 환경변수 | `firebase functions:config` | .env 파일 |
| 스케줄 | Pub/Sub Scheduler | node-cron |
| 비용 | 사용량 기반 과금 | 서버 운영 비용만 |
| 관리 | Firebase Console | Docker logs |
| 독립성 | Firebase 의존 | 완전 독립 |

---

## 📊 모니터링

### 로그 확인

```bash
# Docker 로그
docker logs automation-server

# 실시간 로그
docker logs -f automation-server

# 최근 100줄
docker logs --tail 100 automation-server
```

### Health Check

```bash
# 서버 상태 확인
curl http://localhost:4000/health

# 또는
curl http://automation-server:4000/health
```

### 통계 확인

```bash
curl http://localhost:4000/api/admin/stats
```

---

## 🆘 문제 해결

### 서버가 시작되지 않음

**확인:**
```bash
docker logs automation-server
```

**원인:**
- Firebase Admin SDK 키 오류
- 환경변수 누락

**해결:**
```bash
# .env 파일 확인
cat automation-server/.env

# 재시작
docker restart automation-server
```

---

### Firebase 연결 실패

**증상:**
```
❌ Firebase initialization failed
```

**해결:**
```env
# .env 확인
FIREBASE_PROJECT_ID=blog-automation-23092
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

개행 문자 `\n`이 포함되어 있는지 확인!

---

### 스케줄 작업이 실행되지 않음

**확인:**
```bash
# 로그에서 "Cron jobs initialized" 확인
docker logs automation-server | grep "Cron"
```

**타임존 확인:**
- 스케줄은 Asia/Seoul 기준
- 서버 시간 확인: `docker exec automation-server date`

---

## 🔄 Functions → Automation Server 마이그레이션

### 완료된 작업

- ✅ `collectProducts.js` → `/api/collect/*`
- ✅ `generateReview.js` → `/api/review/generate`
- ✅ `publishReview.js` → `/api/review/publish`
- ✅ `cleanupLogs.js` → `/api/admin/cleanup-logs`
- ✅ 스케줄러 → node-cron

### 차이점

1. **Firestore 트리거 제거**
   - Functions: `onDocumentCreated` 자동 실행
   - Automation Server: 명시적 API 호출 필요

2. **환경변수**
   - Functions: `functions.config()`
   - Automation Server: `process.env`

3. **로깅**
   - Functions: `logger.info()`
   - Automation Server: `console.log()`

---

## 📝 개발 가이드

### 새 API 추가

1. **라우트 파일 생성**
   ```javascript
   // src/routes/newFeature.js
   import express from 'express';
   const router = express.Router();

   router.post('/action', async (req, res) => {
     // 로직
   });

   export default router;
   ```

2. **index.js에 등록**
   ```javascript
   import newFeatureRoutes from './routes/newFeature.js';
   app.use('/api/new-feature', newFeatureRoutes);
   ```

### 새 스케줄 작업 추가

```javascript
// src/cron/scheduler.js
cron.schedule('0 4 * * *', async () => {
  // 매일 새벽 4시
}, {
  timezone: 'Asia/Seoul'
});
```

---

**마지막 업데이트:** 2026-02-04
