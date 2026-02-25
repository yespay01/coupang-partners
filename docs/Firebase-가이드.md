# Firebase 가이드

> Firebase Functions 배포 및 관리

---

## 🔥 Firebase 프로젝트 정보

```
프로젝트 ID: blog-automation-23092
리전: asia-northeast3 (서울)
사용 서비스:
  - Functions (Cloud Functions)
  - Firestore (데이터베이스)
  - Storage (파일 저장)
  - Authentication (사용자 인증)
  - Hosting (웹 호스팅 - 미사용)
```

---

## 📁 Functions 구조

```
functions/
├── src/
│   ├── index.js              # Functions 진입점
│   ├── generateReview.js     # 리뷰 생성
│   ├── publishReview.js      # 리뷰 게시
│   ├── collectProducts.js    # 상품 수집
│   ├── cleanupLogs.js        # 로그 정리
│   ├── adminActions.js       # 관리자 작업
│   ├── imageUtils.js         # 이미지 처리
│   ├── coupangApi.js         # 쿠팡 API
│   ├── aiProviders.js        # AI (OpenAI, Gemini)
│   ├── reviewUtils.js        # 리뷰 유틸
│   └── slack.js              # Slack 알림
├── .env                      # 환경변수
├── package.json
└── package-lock.json
```

---

## 🚀 Functions 배포

### 전체 배포

```bash
cd C:\Users\sakai\OneDrive\바탕 화면\Coupang partnner\coupang_auto_blog

# 모든 Functions 배포
firebase deploy --only functions
```

### 개별 Function 배포

```bash
# 특정 Function만 배포
firebase deploy --only functions:generateReview

# 여러 Functions 배포
firebase deploy --only functions:generateReview,functions:publishReview
```

### 빠른 배포 (캐시 사용)

```bash
# 의존성 변경 없을 때
firebase deploy --only functions --force
```

---

## 📋 Export된 Functions 목록

### HTTP Functions

```javascript
// 리뷰 생성 (자동)
exports.generateReview = functions
  .region('asia-northeast3')
  .runWith({ timeoutSeconds: 540, memory: '512MB' })
  .https.onRequest(async (req, res) => { ... });

// 리뷰 생성 (수동)
exports.manualGenerateReview = functions
  .region('asia-northeast3')
  .runWith({ timeoutSeconds: 540, memory: '512MB' })
  .https.onCall(async (data, context) => { ... });

// 리뷰 게시
exports.publishReview = functions
  .region('asia-northeast3')
  .https.onCall(async (data, context) => { ... });

// 상품 수집 (수동)
exports.manualCollectProducts = functions
  .region('asia-northeast3')
  .https.onCall(async (data, context) => { ... });

// 로그 정리
exports.cleanupOldLogs = functions
  .region('asia-northeast3')
  .https.onRequest(async (req, res) => { ... });

// 이미지 수집 테스트
exports.testImageCollection = functions
  .region('asia-northeast3')
  .https.onRequest(async (req, res) => { ... });

// 관리자 작업
exports.handleAdminActions = functions
  .region('asia-northeast3')
  .https.onCall(async (data, context) => { ... });
```

### Scheduled Functions

```javascript
// 정기 상품 수집 (매일 자정)
exports.collectProductsScheduler = functions
  .region('asia-northeast3')
  .pubsub.schedule('0 0 * * *')
  .timeZone('Asia/Seoul')
  .onRun(async (context) => { ... });
```

---

## 🔐 환경변수 설정

### 방법 1: functions/.env (로컬 개발)

```env
COUPANG_ACCESS_KEY=your-key
COUPANG_SECRET_KEY=your-secret
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
IMAGE_SERVER_URL=https://img.semolink.store
```

### 방법 2: Firebase Config (프로덕션)

```bash
# 설정
firebase functions:config:set \
  coupang.access_key="your-key" \
  coupang.secret_key="your-secret" \
  openai.api_key="sk-..." \
  gemini.api_key="..." \
  slack.webhook_url="https://hooks.slack.com/..." \
  image.server_url="https://img.semolink.store"

# 확인
firebase functions:config:get

# Functions에서 사용
const coupangKey = functions.config().coupang.access_key;
```

### 환경변수 삭제

```bash
firebase functions:config:unset coupang
```

---

## 🧪 로컬 테스트

### Functions Emulator 실행

```bash
cd functions

# Emulator 시작
firebase emulators:start --only functions

# 특정 포트
firebase emulators:start --only functions --port 5001
```

### HTTP Function 테스트

```bash
# 브라우저
http://localhost:5001/blog-automation-23092/asia-northeast3/generateReview

# curl
curl http://localhost:5001/blog-automation-23092/asia-northeast3/generateReview
```

### Callable Function 테스트

```javascript
// 웹 앱에서
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions(app);
const manualGenerate = httpsCallable(functions, 'manualGenerateReview');

const result = await manualGenerate({ productId: 'xxx' });
```

---

## 📊 Functions 모니터링

### 로그 확인

```bash
# 실시간 로그
firebase functions:log

# 특정 Function 로그
firebase functions:log --only generateReview

# 최근 로그만
firebase functions:log --lines 50
```

### Firebase Console에서 확인

```
https://console.firebase.google.com/project/blog-automation-23092/functions
```

**확인 가능한 정보:**
- 실행 횟수
- 평균 실행 시간
- 에러율
- 메모리 사용량

---

## ⚙️ Functions 설정

### 리전 설정

```javascript
// asia-northeast3 (서울) 사용
functions.region('asia-northeast3')
```

### 타임아웃 & 메모리

```javascript
functions
  .runWith({
    timeoutSeconds: 540,  // 최대 9분
    memory: '512MB'       // 512MB 메모리
  })
```

### 스케줄 설정

```javascript
// 매일 자정 실행
functions
  .pubsub.schedule('0 0 * * *')
  .timeZone('Asia/Seoul')
```

---

## 🔄 Functions 업데이트 플로우

```
1. 로컬에서 코드 수정
   functions/src/xxx.js

2. 로컬 테스트
   firebase emulators:start --only functions

3. 배포
   firebase deploy --only functions:xxx

4. 로그 확인
   firebase functions:log

5. Firebase Console에서 모니터링
```

---

## 🆘 Functions 문제 해결

### 배포 실패

**증상:**
```
Error: Failed to deploy functions
```

**해결:**
```bash
# 의존성 재설치
cd functions
rm -rf node_modules package-lock.json
npm install

# 재배포
firebase deploy --only functions --force
```

---

### 실행 에러

**증상:**
```
Error: Function crashed
```

**진단:**
```bash
# 로그 확인
firebase functions:log --only generateReview

# Emulator에서 테스트
firebase emulators:start --only functions
```

---

### 환경변수 미설정

**증상:**
```
Error: COUPANG_ACCESS_KEY is undefined
```

**해결:**
```bash
# 환경변수 확인
firebase functions:config:get

# 설정
firebase functions:config:set coupang.access_key="..."

# 재배포
firebase deploy --only functions
```

---

## 📋 Functions 호출 방법

### 1. HTTP Request

```javascript
// generateReview (HTTP)
const response = await fetch(
  'https://asia-northeast3-blog-automation-23092.cloudfunctions.net/generateReview'
);
```

### 2. Callable Functions

```javascript
// manualGenerateReview (Callable)
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions(app);
const manualGenerate = httpsCallable(functions, 'manualGenerateReview');

const result = await manualGenerate({ productId: 'xxx' });
```

### 3. 스케줄 자동 실행

```javascript
// collectProductsScheduler
// 매일 자정 자동 실행 (수동 호출 불가)
```

---

## 🔒 Functions 보안

### 인증 확인

```javascript
// Callable Function에서
export const secureFunction = functions
  .https.onCall(async (data, context) => {
    // 인증 확인
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        '인증이 필요합니다.'
      );
    }

    // 관리자 권한 확인
    if (!context.auth.token.admin) {
      throw new functions.https.HttpsError(
        'permission-denied',
        '관리자 권한이 필요합니다.'
      );
    }

    // 로직...
  });
```

### CORS 설정

```javascript
// HTTP Function에서
const cors = require('cors')({ origin: true });

export const publicFunction = functions
  .https.onRequest((req, res) => {
    return cors(req, res, () => {
      // 로직...
    });
  });
```

---

## 💰 비용 관리

### Functions 사용량 확인

```
Firebase Console → Functions → 사용량
```

**확인 항목:**
- 호출 횟수
- 실행 시간
- 아웃바운드 네트워크
- 메모리 사용량

### 비용 절감 팁

1. **메모리 최적화**
   ```javascript
   // 필요한 만큼만 할당
   .runWith({ memory: '256MB' }) // 512MB 아닌
   ```

2. **타임아웃 최소화**
   ```javascript
   .runWith({ timeoutSeconds: 60 }) // 540 아닌
   ```

3. **불필요한 호출 제거**
   - 스케줄 함수 실행 주기 조정
   - 중복 호출 방지

---

## 📝 Functions 개발 가이드

### 새 Function 추가

1. **파일 생성**
   ```javascript
   // functions/src/newFunction.js
   const functions = require('firebase-functions');

   exports.newFunction = functions
     .region('asia-northeast3')
     .https.onCall(async (data, context) => {
       // 로직
       return { success: true };
     });
   ```

2. **index.js에 Export**
   ```javascript
   // functions/src/index.js
   export { newFunction } from './newFunction.js';
   ```

3. **배포**
   ```bash
   firebase deploy --only functions:newFunction
   ```

---

### 에러 처리

```javascript
try {
  // 로직
} catch (error) {
  console.error('Error:', error);

  // Callable Function
  throw new functions.https.HttpsError(
    'internal',
    error.message
  );

  // HTTP Function
  res.status(500).json({
    error: error.message
  });
}
```

---

### 로깅

```javascript
const { logger } = require('firebase-functions');

logger.info('Info message', { data: 'value' });
logger.warn('Warning message');
logger.error('Error message', error);
```

---

## 🔄 Functions 라이프사이클

```
코드 수정
    ↓
로컬 테스트 (Emulator)
    ↓
firebase deploy --only functions
    ↓
Functions 빌드
    ↓
배포 완료
    ↓
실행 및 모니터링
    ↓
로그 확인
```

---

## 📞 빠른 참조

### 자주 쓰는 명령어

```bash
# 배포
firebase deploy --only functions

# 특정 Function 배포
firebase deploy --only functions:generateReview

# 로그 확인
firebase functions:log

# 환경변수 설정
firebase functions:config:set key="value"

# 환경변수 확인
firebase functions:config:get

# Emulator 실행
firebase emulators:start --only functions
```

---

**마지막 업데이트:** 2026-02-03
