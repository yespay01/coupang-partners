# 쿠팡 파트너스 자동화 블로그 시스템

## 프로젝트 개요

쿠팡 파트너스 상품을 자동으로 수집·요약·게시하는 AI 기반 블로그 플랫폼입니다.
AI가 자동으로 후기 콘텐츠를 작성하고 관리자가 검수한 뒤 게시하는 반자동 구조로,
신뢰성 있는 정보를 전달하도록 설계합니다.

---

## 빠른 시작

### 요구 사항
- Node.js 18 이상
- Firebase CLI
- OpenAI API Key

### 설치

```bash
# 의존성 설치
cd web
npm install

cd ../functions
npm install
```

### 환경 변수 설정

**web/.env.local** 생성:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
# ... 기타 Firebase 설정
```

**functions/.env** 생성:
```env
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini
SLACK_WEBHOOK_URL=your_slack_webhook_url
SLACK_WEBHOOK_ROUTES={"default":"https://hooks.slack.com/services/xxx","generation":"https://hooks.slack.com/services/yyy","admin":"https://hooks.slack.com/services/zzz"}
SLACK_LEVEL_MENTIONS={"error":"<!here>","warn":""}
```
> `SLACK_WEBHOOK_ROUTES`/`SLACK_LEVEL_MENTIONS`는 선택 항목이며, 이벤트별 채널 라우팅과 심각도 기반 멘션 정책을 JSON 으로 선언합니다.

### 실행

**개발 서버 (프론트엔드)**:
```bash
cd web
npm run dev
```

**Firebase Functions (로컬)**:
```bash
cd functions
npm install
npm run serve   # Firebase Functions Emulator (firebase-tools)
```

**배포**:
```bash
# Firebase에 배포
firebase deploy
```

---

## 🛠 기술 스택
- **Frontend:** Next.js (App Router) + TailwindCSS + Framer Motion  
- **Backend:** Firebase (Firestore + Cloud Functions + Cloud Scheduler)  
- **Auth:** Firebase Auth (Admin 전용)  
- **Hosting:** Firebase Hosting (ISR/SSR)  
- **AI:** OpenAI API (gpt-4o-mini or gpt-4o)  

---

## 📦 데이터베이스 구조 (Firestore)
- `products`: `name`, `category`, `affiliateUrl`, `price`, `image`, `status(pending|reviewed|published)`, `createdAt`
- `reviews`: `productId`, `content`, `status(draft|needs_revision|approved|published)`, `category`, `author`, `createdAt`, `publishedAt`, `toneScore`
- `summaries`: `productId`, `metaTitle`, `metaDescription`, `keywords`, `summary`, `lastRefreshedAt`
- `logs`: `type(ingestion|generation|publishing|earnings)`, `payload(JSON)`, `level(info|warn|error)`, `createdAt`
- `earnings`: `date`, `productId`, `clicks`, `orders`, `commission`, `source`
- `categories`: `slug`, `title`, `description`, `seo`, `sortOrder`
- **Rules:** 관리자 전용 경로는 Firebase Auth 커스텀 클레임 `admin=true` 확인, 공개 경로(`/public/**`)는 읽기만 허용
- **인덱스:** `reviews`의 `category+status`, `earnings`의 `date`, `products`의 `status`, `logs`의 `createdAt`

---

## ⚙ Cloud Functions & AI 후기 생성 예시
```js
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import OpenAI from "openai";
import fetch from "node-fetch";
import { buildPrompt, validateReviewContent, computeNextRunAt } from "./reviewUtils.js";

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();
const RETRY_COLLECTION = "review_retry_queue";
const MAX_ATTEMPTS = Number(process.env.REVIEW_MAX_ATTEMPTS ?? 3);
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

async function notifySlack(message, level = "info") {
  if (!process.env.SLACK_WEBHOOK_URL) return;
  const emoji = { error: "🚨", warn: "⚠️", info: "ℹ️", success: "✅" }[level] ?? "ℹ️";
  await fetch(process.env.SLACK_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: `${emoji} ${message}` }),
  });
}

async function createReviewWithAI(product) {
  if (!openai) throw new Error("OpenAI 클라이언트가 초기화되지 않았습니다.");

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    temperature: 0.7,
    messages: [{ role: "user", content: buildPrompt(product) }],
  });

  const reviewText = response.choices?.[0]?.message?.content?.trim();
  if (!reviewText) throw new Error("OpenAI 응답에 리뷰 텍스트가 없습니다.");

  return {
    reviewText,
    usage: {
      prompt: response.usage?.prompt_tokens ?? 0,
      completion: response.usage?.completion_tokens ?? 0,
    },
  };
}

async function enqueueRetry({ productId, attempt, reason }) {
  if (attempt >= MAX_ATTEMPTS) {
    await notifySlack(`후기 생성에 ${MAX_ATTEMPTS}회 실패했습니다. 상품 ID: ${productId}`, "error");
    return;
  }

  const jobRef = db.collection(RETRY_COLLECTION).doc(productId);
  const now = new Date();

  const { nextAttempt, nextRunAt } = await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(jobRef);
    const existingAttempt = snapshot.exists ? Number(snapshot.data().attempt ?? attempt) : attempt;
    const computedAttempt = Math.max(existingAttempt, attempt) + 1;
    const nextAttemptAt = computeNextRunAt(computedAttempt);

    tx.set(
      jobRef,
      {
        productId,
        attempt: computedAttempt,
        nextAttemptAt,
        reason,
        status: "retry_pending",
        updatedAt: now,
        lastErrorMessage: reason,
        lastErrorAt: now,
      },
      { merge: true },
    );

    return { nextAttempt: computedAttempt, nextRunAt: nextAttemptAt };
  });

  await notifySlack(
    `후기 생성 실패. ${nextAttempt}번째 시도를 ${nextRunAt.toISOString()}에 재시도합니다. 상품 ID: ${productId}`,
    "warn",
  );
}

async function handleReviewGeneration({ productId, product, attempt, source }) {
  const { reviewText, usage } = await createReviewWithAI(product);
  const { toneScore, charCount } = validateReviewContent(reviewText);

  await db.collection("reviews").add({
    productId,
    content: reviewText,
    status: "draft",
    category: product.category,
    toneScore,
    charCount,
    createdAt: new Date(),
  });

  await db.collection("logs").add({
    type: "generation",
    level: "info",
    payload: {
      productId,
      attempt,
      source,
      message: "후기 초안 생성 완료",
      tokens: usage,
      toneScore,
      charCount,
    },
    createdAt: new Date(),
  });
}

export const generateReview = onDocumentCreated("products/{productId}", async (event) => {
  const productId = event.params.productId;
  const product = event.data?.data();

  if (!product) {
    logger.warn("생성 트리거에 상품 데이터가 없습니다.", { productId });
    return;
  }

  const attempt = 1;
  const source = "trigger";

  try {
    await handleReviewGeneration({ productId, product, attempt, source });
    await db.collection(RETRY_COLLECTION).doc(productId).delete().catch(() => undefined);
  } catch (error) {
    logger.error("후기 생성 중 오류 발생", { productId, error: error.message });
    await enqueueRetry({ productId, attempt, reason: error.message });
    throw error;
  }
});

export const processReviewRetryQueue = onSchedule(
  {
    schedule: "every 5 minutes",
    timeZone: "Asia/Seoul",
  },
  async () => {
    const now = new Date();
    const jobs = await db
      .collection(RETRY_COLLECTION)
      .where("nextAttemptAt", "<=", now)
      .orderBy("nextAttemptAt", "asc")
      .limit(20)
      .get();

    if (jobs.empty) {
      logger.debug("대기 중인 재시도 작업이 없습니다.");
      return;
    }

    for (const doc of jobs.docs) {
      const data = doc.data();

      try {
        const productSnap = await db.collection("products").doc(data.productId).get();
        if (!productSnap.exists) {
          logger.warn("재시도할 상품을 찾을 수 없습니다.", { productId: data.productId });
          await doc.ref.delete();
          continue;
        }

        await handleReviewGeneration({
          productId: data.productId,
          product: productSnap.data(),
          attempt: data.attempt,
          source: "retry",
        });

        await doc.ref.delete();
      } catch (error) {
        logger.error("재시도 작업 실패", {
          productId: data.productId,
          attempt: data.attempt,
          error: error.message,
        });
        await enqueueRetry({ productId: data.productId, attempt: data.attempt, reason: error.message });
      }
    }
  },
);
```
- OpenAI 오류 시 `functions.logger.error` 사용 + Slack 알림 Webhook 연동
- 재시도 로직: Firestore Transaction으로 큐(`review_retry_queue`)에 `nextAttemptAt` 저장 및 `status=retry_pending` 설정, 최대 3회 후 운영자 알림
- 토큰 사용량/비용: `logs`에 일자별 토큰 사용량 집계 (`payload.tokens.prompt/completion`)

---

## 🌡 환경 변수 설정
Firebase 환경변수 또는 `.env` 파일에 추가:
```
OPENAI_API_KEY=sk-xxxxx
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
PARTNERS_API_KEY=...
REVIEW_MAX_ATTEMPTS=3
REVIEW_RETRY_BASE_MINUTES=5
```

---

## 🧰 운영 스크립트 모음
- **Firebase 관리자 클레임 부여**
  - 선행조건: `functions/.env` 또는 쉘 환경에 `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY` 설정
  - 실행:
    ```bash
    cd functions
    npm install
    npm run set-admin -- --email admin@example.com --set   # 관리자 권한 부여
    npm run set-admin -- --email admin@example.com --unset # 관리자 권한 해제
    ```
  - 스크립트는 필요한 인자가 없으면 인터랙티브하게 이메일과 동작을 물어봅니다.

---

## 🔁 자동화 루틴 요약
| 시간 (Asia/Seoul) | 프로세스 | 방식 | 비고 |
|-------------------|-----------|------|------|
| 02:00 | 상품 자동 수집 | Cloud Scheduler + API | 실패 시 Slack/Webhook 알림 |
| 02:10 | AI 후기 자동 생성 | Cloud Function + OpenAI API | 3회 재시도 후 `logs` 기록 |
| 08:30 | SEO 메타데이터 갱신 | Batch Function | `summaries` 업데이트 후 캐시 무효화 |
| 09:00 | 관리자 검수 | 자동 알림 | 미승인 시 `status=needs_revision` |
| 09:10 | 승인 즉시 자동 게시 | Firestore Trigger + ISR | 게시 후 sitemap/rss 재생성 |
| 18:00 | 수익 통계 갱신 | Function + Firestore | 환율 반영 시 `earnings` 업데이트 |
| 상시 | 클릭 로그 수집 | Redirect API | 집계 지연 시 `logs` 경고 |

---

## 🧭 UI 구조
- 사용자 블로그 뷰 (정보성 콘텐츠 중심)
- CTA와 쇼핑 링크를 자연스럽게 배치
- 메인 페이지: 최신 후기 / 인기 후기 / 카테고리 미리보기
- 후기 상세 페이지: 본문 + 관련 후기 섹션 + 아웃바운드 링크
- 관리자 페이지: 수익 대시보드 / 후기 승인 워크플로 / 로그 뷰어

---

## 🛠 개발 작업 지침 (Claude / CodeX 등)
```
1. Next.js 프로젝트 생성
2. Firebase + Firestore + Functions 설정
3. 데이터 스키마에 맞춰 컬렉션/인덱스 구성
4. AI 후기 자동화 Cloud Function 추가 (OpenAI API 연동)
5. SSR/ISR SEO 세팅 (sitemap, RSS 자동 생성)
6. TailwindCSS + 블로그형 레이아웃 구성
7. 클릭 로그 및 수익 통계 모듈 구현
8. Firebase Hosting으로 배포
```

---

## 🧑‍💻 로컬 개발 서버 실행
1. 의존성 설치  
   ```bash
   cd web
   npm install
   ```
2. 개발 서버 실행  
   ```bash
   npm run dev
   ```
3. 브라우저에서 <http://localhost:3000> 접속  
   - 관리자 기능을 쓰려면 `.env.local`에 Firebase 웹 앱 키와 `ADMIN_GUARD_BYPASS=true` 등의 변수를 세팅합니다.  
   - Functions 에뮬레이터는 `functions/` 디렉터리에서 `npm install` 후 `npm run serve` (firebase-tools 기반)로 실행합니다.

---

## 📋 최근 작업 내역 (2024-07-14)
- **Cloud Functions**
  - AI 후기 생성 시 길이/금칙어/톤 스코어 검증 로직 추가 및 `reviewUtils` 모듈화
  - Firestore 재시도 큐를 Transaction 기반으로 전환하고 `status=retry_pending` 메타데이터 저장
  - `admin_actions` 컬렉션을 모니터링해 Slack 알림과 운영 로그를 자동 기록하는 트리거 추가
- **운영 알림**
  - Slack Webhook 알림에 공통 템플릿/필드/블록 포맷을 적용하고, 수준(`info/warn/error/success`)별 이모지 및 메시지를 일관되게 노출
  - Slack 전송 실패 시 최대 3회 재시도(backoff)하도록 개선해 일시적 네트워크 오류에도 경보 누락을 방지
  - `SLACK_WEBHOOK_ROUTES` / `SLACK_LEVEL_MENTIONS` 환경변수로 이벤트(Generation/Admin)별 채널 라우팅과 오류 시 `<!here>` 멘션 자동화를 지원
- **프런트엔드 (Next.js)**
  - `web/` 프로젝트 Scaffold + Tailwind 기반 랜딩/관리자 레이아웃 구성
  - Firebase Client/Firestore 유틸을 통한 실시간 대시보드 스트리밍 훅 구현 (`useAdminDashboardData`)
  - 관리자 대시보드에 승인 액션 버튼, 상태 필터, 로그 카드 등 운영 UI 추가
  - 리뷰/로그 테이블에 커서 기반 페이지네이션, 일괄 액션(승인/재검수/게시) 및 상세 Drawer 도입
  - 관리자 대시보드에 상품/작성자 검색과 기간 프리셋 필터를 추가하고 URL 쿼리로 동기화
  - 필터 조건을 Firestore 쿼리에도 반영해 서버/클라이언트 목록이 일관되게 노출되도록 개선
  - 로그 뷰어에 기간 필터·검색 초기화 버튼·레벨 쿼리 공유를 도입해 탐색 편의성 강화
- **인증 & 보안**
  - Firebase Auth 기반 관리자 로그인 페이지 작성 + `/api/admin/session`으로 `admin_session` 쿠키 발급
  - Firebase Admin SDK로 ID 토큰의 `admin` 커스텀 클레임 검증
  - Next.js Middleware로 `/admin` 라우트 접근 제어 (로컬 개발 시 `ADMIN_GUARD_BYPASS=true` 우회)

---

## 🔜 다음 작업 제안
1. GitHub Actions 배포 파이프라인에 프리뷰 채널/롤백 전략과 시크릿 관리 자동화를 추가
2. 후기/로그 필터 상태를 Firestore 서버 쿼리로 연결해 SSR/CSR 일관성 확보

---

## 🧪 품질 및 운영 체크리스트
- OpenAI 출력 검수: 욕설/과장 광고/정책 위반 문구 필터링 → `status=needs_revision` 처리 후 알림
- 후기 길이/톤 검사: 최소 90자, 최대 170자 · 감정 점수(`toneScore`)가 0.4 이하이면 재생성
- 예외 모니터링: Cloud Function 실패는 Slack과 `logs(level=error)`에 기록 후 재시도 큐 투입
- 백업 전략: `earnings`, `reviews` 컬렉션을 일 1회 `gs://` 버킷으로 Export
- SEO 점검: 매일 `summaries` 기반 메타데이터 최신화 및 구조화 데이터 검사 자동화
- 인코딩 확인 루틴: PowerShell `Get-FileEncoding` 함수로 작업 후 README UTF-8 상태 확인

---

## 🔐 Firebase 관리자 커스텀 클레임 스크립트
- 서비스 계정 키를 환경변수에 지정합니다.
  ```
  export FIREBASE_ADMIN_PROJECT_ID=your-project-id
  export FIREBASE_ADMIN_CLIENT_EMAIL=service-account@your-project-id.iam.gserviceaccount.com
  export FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
  ```
- Functions 패키지에서 아래 명령으로 특정 계정에 `admin=true` 클레임을 부여합니다.
  ```bash
  cd functions
  npm install   # 최초 1회
  npm run set-admin -- --email admin@example.com
  # 또는 UID로 지정
  npm run set-admin -- --uid <firebase-uid>
  ```
- 실행이 완료되면 해당 계정의 기존 세션은 곧 만료되므로, 관리자 로그인 페이지에서 재로그인해야 새 쿠키가 발급됩니다.

---

## 🚀 CI/CD 파이프라인 (GitHub Actions + Firebase)
- 기본 구조  
  - `.github/workflows/firebase-deploy.yml`가 `main` 브랜치의 PR에서 lint/test/build를 수행하고, 병합 시 Functions/Hosting을 동시에 배포합니다.  
  - `build` 잡: Next.js 앱(`web/`) 빌드 및 함수 테스트.  
  - `preview` 잡: PR에서 동일 저장소로 올라온 변경만 대상이며, 번호 기반 채널(`preview-<PR번호>`)에 7일짜리 프리뷰 URL을 발급합니다.  
  - `deploy` 잡: `main` 병합 시 Firebase CLI로 `firebase deploy --only hosting,functions` 실행.
  - `rollback` 잡: `workflow_dispatch` 입력을 받아 Hosting 릴리스를 되돌립니다.
- 선행 설정  
  1. `.firebaserc`의 `your-firebase-project-id`를 실제 프로젝트 ID로 교체합니다.  
  2. `firebase.json`의 `your-hosting-site-id`와 `frameworksBackend.region`을 환경에 맞게 수정합니다.  
  3. GitHub Secrets 설정  
     - `FIREBASE_PROJECT_ID`: Firebase 프로젝트 ID  
     - `FIREBASE_SERVICE_ACCOUNT`: 배포 권한이 있는 서비스 계정 JSON (전체 값을 한 줄로 등록)  
     - 필요 시 `ADMIN_GUARD_BYPASS`, `SLACK_WEBHOOK_URL` 등 런타임 환경 변수도 Actions Variables/Secrets에 추가합니다.
- 배포 흐름  
  1. PR 생성 → CI가 자동으로 lint/test/run build  
  2. 동일 저장소 PR이라면 `preview` 잡이 프리뷰 URL을 생성해 `Actions` 실행 요약에 기록합니다 (포크 PR은 보안상 비활성화).
  3. `main` 브랜치에 머지 → `deploy` 잡이 서비스 계정으로 인증 후 자동 배포  
  4. 문제가 생기면 `Actions` > `firebase-deploy` 워크플로의 **Run workflow** 버튼을 눌러 `site`/`release` 입력과 함께 `rollback` 잡을 실행합니다 (`release` ID는 `firebase hosting:releases:list`로 조회).  
  5. 함수/호스팅 로그는 Firebase 콘솔 혹은 Slack 알림으로 확인 가능
- 시크릿 관리 팁  
  - 서비스 계정 키는 필요 시 `google-workspace` 정책에 따라 주기적으로 재발급하고, 새 JSON을 `FIREBASE_SERVICE_ACCOUNT` 시크릿에 업데이트합니다.  
  - 프리뷰/배포에 동일 키를 쓰므로, 갱신 시 `preview`와 `deploy` 잡 모두 새 키를 읽도록 즉시 교체해야 합니다.  
  - 필요한 경우 [Workload Identity Federation](https://firebase.google.com/docs/hosting/github-integration)으로 전환해 키 보관을 피할 수 있습니다.
