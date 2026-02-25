# Automation Server

쿠팡 파트너스 자동화 서버 (Firebase Functions 대체)

## 구조

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
│   │   └── scheduler.js         # 스케줄 작업
│   ├── services/
│   │   ├── coupang/             # 쿠팡 API 클라이언트
│   │   ├── settingsService.js   # 설정 서비스
│   │   ├── slack.js             # Slack 알림
│   │   ├── aiProviders.js       # AI (OpenAI, Gemini)
│   │   ├── reviewUtils.js       # 리뷰 유틸
│   │   └── imageUtils.js        # 이미지 처리
│   └── index.js                 # 서버 진입점
├── .env.example
├── Dockerfile
├── package.json
└── README.md
```

## 설치

```bash
# 의존성 설치
npm install

# 환경변수 설정
cp .env.example .env
# .env 파일 수정

# 개발 서버 실행
npm run dev

# 프로덕션 서버 실행
npm start
```

## Docker 빌드

```bash
# 이미지 빌드
docker build -t automation-server .

# 컨테이너 실행
docker run -d \
  --name automation-server \
  --restart always \
  -p 4000:4000 \
  --env-file .env \
  automation-server
```

## API 엔드포인트

### Health Check
- `GET /health` - 서버 상태 확인

### 상품 수집
- `POST /api/collect/auto` - 자동 상품 수집 (스케줄러용)
- `POST /api/collect/manual` - 수동 상품 수집

### 리뷰 관리
- `POST /api/review/generate` - 리뷰 생성
- `POST /api/review/publish` - 리뷰 게시

### 관리자
- `POST /api/admin/cleanup-logs` - 로그 정리
- `GET /api/admin/stats` - 시스템 통계

## 스케줄 작업

- **매일 새벽 2시**: 상품 자동 수집
- **매일 새벽 3시**: 리뷰 자동 생성
- **매주 일요일 자정**: 로그 정리 (30일 이상)

## 환경변수

```env
PORT=4000
NODE_ENV=production

# Firebase
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="..."

# Coupang API
COUPANG_ACCESS_KEY=...
COUPANG_SECRET_KEY=...

# AI
OPENAI_API_KEY=...
GEMINI_API_KEY=...

# Slack (선택)
SLACK_WEBHOOK_URL=...
```

## Web 앱과 연동

Web 앱에서 Automation Server 호출:

```typescript
// web/app/api/admin/collect/route.ts
const response = await fetch('http://automation-server:4000/api/collect/manual', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ maxProducts: 10 }),
});
```

## 배포

서버에 Docker로 배포:

```bash
# 서버에서 실행
cd /home/insuk/blog/automation-server
docker build -t automation-server .
docker run -d \
  --name automation-server \
  --restart always \
  -p 4000:4000 \
  --env-file .env \
  automation-server
```

## 모니터링

```bash
# 로그 확인
docker logs automation-server

# 실시간 로그
docker logs -f automation-server

# 상태 확인
curl http://localhost:4000/health
```
