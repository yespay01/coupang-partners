# 프로젝트 구조

> **마지막 업데이트:** 2026-01-29 (Phase 3 완료)
> **자동 업데이트 규칙:** 파일 추가/삭제 시 이 문서를 반드시 업데이트할 것

## 개요

쿠팡 파트너스 자동 블로그 시스템의 프로젝트 구조입니다.
Next.js 웹 프론트엔드와 Firebase Functions 백엔드로 구성됩니다.

## 전체 구조

```
coupang_auto_blog/
├── web/                              # Next.js 프론트엔드
│   ├── app/                          # App Router
│   │   ├── error.tsx                 # 전역 에러 페이지 ⭐ NEW
│   │   ├── (dashboard)/              # 대시보드 레이아웃 그룹
│   │   │   ├── layout.tsx            # 대시보드 공통 레이아웃 (ErrorBoundary 포함)
│   │   │   └── admin/                # 관리자 페이지
│   │   │       ├── page.tsx          # 대시보드 (개요)
│   │   │       ├── login/page.tsx    # 관리자 로그인
│   │   │       ├── reviews/page.tsx  # 리뷰 승인
│   │   │       ├── products/page.tsx # 상품 목록 관리
│   │   │       ├── logs/
│   │   │       │   ├── page.tsx      # 로그 뷰어
│   │   │       │   └── stats/page.tsx # 로그 통계
│   │   │       ├── settings/page.tsx # 시스템 설정
│   │   │       ├── emergency/page.tsx # 긴급 중지
│   │   │       └── test-collect/page.tsx # 상품 수집 테스트
│   │   │
│   │   ├── api/                      # API 라우트
│   │   │   ├── admin/
│   │   │   │   ├── session/route.ts  # 세션 관리
│   │   │   │   ├── collect/route.ts  # 상품 수집 API
│   │   │   │   ├── clean-logs/route.ts # 로그 삭제
│   │   │   │   ├── stop-retry/route.ts # 재시도 중지
│   │   │   │   └── logs/stats/route.ts # 로그 통계 API
│   │   │   ├── coupang/
│   │   │   │   ├── ads/route.ts      # 쿠팡 광고 API
│   │   │   │   ├── reports/route.ts  # 쿠팡 리포트 API
│   │   │   │   └── test-collect/route.ts # 수집 테스트
│   │   │   └── settings/
│   │   │       ├── route.ts          # 설정 API
│   │   │       └── coupang/test/route.ts # 쿠팡 연결 테스트
│   │   │
│   │   ├── review/[id]/page.tsx      # 리뷰 상세 (공개)
│   │   ├── reviews/
│   │   │   ├── page.tsx              # 리뷰 목록 (공개)
│   │   │   └── [slug]/page.tsx       # 리뷰 슬러그 페이지
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx                  # 랜딩 페이지
│   │
│   ├── components/                   # 리액트 컴포넌트
│   │   ├── ErrorBoundary.tsx         # 에러 바운더리 ⭐ NEW
│   │   ├── ErrorMessage.tsx          # 에러 메시지 컴포넌트 ⭐ NEW
│   │   ├── admin/                    # 관리자 전용 컴포넌트
│   │   │   ├── settings/             # 설정 관련 컴포넌트
│   │   │   │   ├── SettingsView.tsx
│   │   │   │   ├── AutomationSettings.tsx
│   │   │   │   ├── TopicSettings.tsx
│   │   │   │   ├── AISettings.tsx
│   │   │   │   ├── PromptSettings.tsx
│   │   │   │   ├── CoupangSettings.tsx
│   │   │   │   └── index.ts
│   │   │   ├── ReviewTable.tsx
│   │   │   ├── ReviewDetail.tsx
│   │   │   ├── LogList.tsx
│   │   │   ├── MetricsSection.tsx
│   │   │   ├── Pagination.tsx
│   │   │   ├── DashboardNav.tsx      # 네비게이션 + 로그아웃
│   │   │   ├── ProductList.tsx       # 상품 목록
│   │   │   ├── BulkActions.tsx       # 대량 작업
│   │   │   ├── AutomationOverview.tsx # 자동화 개요
│   │   │   ├── ReportsOverview.tsx   # 리포트 개요
│   │   │   ├── AdsReportsOverview.tsx # 광고 리포트
│   │   │   ├── EarningsChart.tsx     # 수익 차트
│   │   │   ├── EcpmChart.tsx         # eCPM 차트
│   │   │   ├── constants.ts          # 상수 정의
│   │   │   └── index.ts
│   │   ├── AdminDashboardView.tsx
│   │   ├── ReviewEditorModal.tsx     # 리뷰 에디터
│   │   ├── ReviewPost.tsx            # 리뷰 포스트
│   │   ├── WysiwygEditor.tsx         # WYSIWYG 에디터
│   │   ├── FirebaseProvider.tsx
│   │   ├── FirebaseStatusBanner.tsx  # Firebase 상태 배너
│   │   ├── Providers.tsx
│   │   └── QueryProvider.tsx
│   │
│   ├── hooks/                        # React 훅
│   │   ├── useAdminDashboardData.ts  # 대시보드 데이터 훅
│   │   ├── useSystemSettings.ts      # 시스템 설정 훅
│   │   ├── useReviews.ts             # 리뷰 CRUD 훅
│   │   ├── useProducts.ts            # 상품 CRUD 훅
│   │   ├── useDashboardMetrics.ts    # 대시보드 메트릭
│   │   ├── useCoupangAds.ts          # 쿠팡 광고 데이터
│   │   ├── useCoupangReports.ts      # 쿠팡 리포트 데이터
│   │   └── index.ts
│   │
│   ├── stores/                       # Zustand 스토어
│   │   ├── adminDashboardStore.ts    # 대시보드 UI 상태
│   │   └── settingsStore.ts          # 설정 상태
│   │
│   ├── lib/                          # 유틸리티 라이브러리
│   │   ├── coupang/                  # 쿠팡 API 클라이언트 모듈 ⭐ NEW
│   │   │   ├── types.ts              # 타입 정의
│   │   │   ├── signature.ts          # HMAC 서명 생성
│   │   │   ├── client.ts             # HTTP 클라이언트
│   │   │   ├── deeplink.ts           # 딥링크 API
│   │   │   ├── products.ts           # 상품 검색 API
│   │   │   └── index.ts              # 모듈 진입점
│   │   ├── firebase.ts               # Firebase 공통
│   │   ├── firebaseClient.ts         # Firebase 클라이언트 초기화
│   │   ├── firebaseAdmin.ts          # Firebase Admin SDK
│   │   ├── firestore.ts              # Firestore CRUD
│   │   ├── storage.ts                # Firebase Storage
│   │   ├── settingsService.ts        # 설정 서비스
│   │   ├── seo.ts                    # SEO 유틸리티
│   │   └── slug.ts                   # URL 슬러그 생성
│   │
│   ├── types/                        # TypeScript 타입
│   │   ├── index.ts                  # 공통 타입
│   │   └── settings.ts               # 설정 관련 타입
│   │
│   ├── middleware.ts                 # Next.js 미들웨어
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── functions/                        # Firebase Functions
│   ├── src/
│   │   ├── services/                 # 공통 서비스 모듈 ⭐ NEW
│   │   │   └── settingsService.js    # 시스템 설정 캐싱 (117줄)
│   │   ├── coupang/                  # 쿠팡 API 클라이언트 모듈
│   │   │   ├── signature.js          # HMAC 서명 생성
│   │   │   ├── client.js             # HTTP 클라이언트
│   │   │   ├── products.js           # 상품 API
│   │   │   ├── deeplink.js           # 딥링크 API
│   │   │   ├── reports.js            # 리포트 API
│   │   │   └── index.js              # 모듈 진입점
│   │   ├── index.js                  # 함수 진입점
│   │   ├── generateReview.js         # AI 리뷰 생성 (283줄 ⬇️60줄)
│   │   ├── collectProducts.js        # 상품 자동 수집 (621줄 ⬇️30줄)
│   │   ├── coupangApi.js             # 🔴 LEGACY - 레거시 호환용
│   │   ├── publishReview.js          # 리뷰 발행
│   │   ├── reviewUtils.js            # 리뷰 유틸리티
│   │   ├── adminActions.js           # 관리자 액션
│   │   ├── aiProviders.js            # 다중 AI 제공자
│   │   ├── cleanupLogs.js            # 로그 자동 삭제 (30일)
│   │   ├── testCollect.js            # 수집 테스트
│   │   └── slack.js                  # Slack 알림
│   │
│   └── package.json
│
├── docs/                             # 문서
│   ├── worklog/                      # 작업 로그
│   ├── architecture/                 # 설계 문서
│   │   ├── project-structure.md      # 이 파일
│   │   ├── settings-feature.md
│   │   └── 개선사항-2026-01-27.md
│   ├── plans/                        # 계획 문서
│   └── 쿠팡 api관련/                  # 쿠팡 API 문서
│
├── .firebaserc
├── firebase.json
├── firestore.rules                   # Firestore 보안 규칙
├── firestore.indexes.json            # Firestore 인덱스
└── storage.rules                     # Storage 보안 규칙
```

## 주요 모듈 설명

### 웹 프론트엔드 (web/)

#### App Router (/app)
- Next.js 14+ App Router 사용
- 대시보드 페이지는 (dashboard) 라우트 그룹으로 묶음
- API 라우트로 서버 사이드 로직 처리

#### 컴포넌트 (/components)
- `admin/`: 관리자 전용 UI 컴포넌트
- `admin/settings/`: 설정 페이지 섹션별 컴포넌트
- Provider 컴포넌트: Firebase, React Query 설정

#### 상태 관리 (/stores, /hooks)
- Zustand: 클라이언트 UI 상태 (필터, 탭 등)
- React Query: 서버 상태 (Firestore 데이터)
- 커스텀 훅: 비즈니스 로직 캡슐화

#### 타입 (/types)
- `index.ts`: Review, Log, Earnings 등 도메인 타입
- `settings.ts`: 시스템 설정 관련 타입

### Firebase Functions (functions/)

#### 리뷰 생성 (generateReview.js)
- 상품 문서 생성 트리거로 리뷰 자동 생성
- Firestore에서 AI 설정 로드
- 재시도 큐 스케줄러

#### AI 제공자 (aiProviders.js)
- OpenAI, Anthropic, Google AI 통합
- 설정에 따라 제공자 자동 선택

#### 쿠팡 API (coupangApi.js)
- HMAC 서명 생성
- 상품 검색, 베스트 상품, 딥링크 API

#### 상품 수집 (collectProducts.js)
- 매일 지정 시간에 자동 실행
- 키워드/카테고리 기반 수집

## 데이터 모델

### Firestore 컬렉션

```
firestore/
├── products/                # 수집된 상품
├── reviews/                 # 생성된 리뷰
├── logs/                    # 시스템 로그
├── earnings/                # 수익 데이터
├── review_retry_queue/      # 리뷰 재시도 큐
└── system_settings/
    └── global              # 시스템 전역 설정
```

## 배포

### 웹 (Firebase Hosting)
```bash
cd web
npm run build
firebase deploy --only hosting
```

### Functions (Firebase Functions)
```bash
cd functions
npm install
firebase deploy --only functions
```

## 환경 변수

### 웹 (.env.local)
```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
```

### Functions (Firebase 환경 설정 또는 Firestore 설정)
- AI API 키: Firestore `system_settings/global`에 저장
- 쿠팡 API 키: Firestore `system_settings/global`에 저장

---

## 📝 파일 구조 업데이트 지침

> **중요:** 파일을 추가하거나 삭제할 때 이 문서를 반드시 업데이트해야 합니다.

### 업데이트가 필요한 경우

1. **새 파일/디렉토리 추가 시**
   - 위 트리 구조에 해당 파일 추가
   - 주요 모듈 설명 섹션에 설명 추가
   - 마지막 업데이트 날짜 수정

2. **파일/디렉토리 삭제 시**
   - 위 트리 구조에서 해당 파일 제거
   - 관련 설명 제거 또는 수정
   - 마지막 업데이트 날짜 수정

3. **파일 이동/리팩토링 시**
   - 이전 위치에서 제거
   - 새 위치에 추가
   - 관련 설명 업데이트

### 업데이트 예시

#### 새 모듈 추가 시
```
예: web/lib/coupang/ 디렉토리 생성

1. 트리 구조 업데이트:
   ├── lib/
   │   ├── coupang/                  # 쿠팡 API 클라이언트 모듈
   │   │   ├── client.ts
   │   │   ├── signature.ts
   │   │   └── types.ts

2. 설명 추가:
   #### 쿠팡 API (/lib/coupang)
   - `client.ts`: HTTP 클라이언트
   - `signature.ts`: HMAC 서명 생성
   - `types.ts`: 타입 정의
```

#### 파일 분리 시
```
예: functions/src/collectProducts.js 분리

1. 트리 구조 업데이트:
   ├── functions/
   │   ├── src/
   │   │   ├── services/
   │   │   │   └── productService.js
   │   │   ├── coupang/
   │   │   │   └── products.js

2. 관련 파일 크기 업데이트
```

### 자동화 체크리스트

작업 완료 후 반드시 확인:
- [ ] 새로 추가된 파일이 문서에 반영되었는가?
- [ ] 삭제된 파일이 문서에서 제거되었는가?
- [ ] 파일 설명이 정확한가?
- [ ] 마지막 업데이트 날짜가 수정되었는가?

---

## 🔄 변경 이력

### 2026-01-29 (Phase 3 완료 + 성능 최적화 + 페이지네이션 + 에러 핸들링)
- ⭐ **web/lib/coupang 모듈 생성**
  - types, signature, client, deeplink, products 모듈 추가
  - 쿠팡 API 로직 중복 제거
  - 타입 안정성 향상
- ⭐ **functions/src/coupang 모듈 생성**
  - signature, client, products, deeplink, reports 모듈 추가
  - coupangApi.js를 레거시로 마크 (586줄 → 모듈화)
  - collectProducts.js, testCollect.js에서 새 모듈 사용
- ⭐ **functions/src/services 모듈 생성**
  - settingsService.js 추가 (설정 캐싱 로직 통합)
  - generateReview.js: 343줄 → 283줄 (60줄 감소)
  - collectProducts.js: 651줄 → 621줄 (30줄 감소)
  - 중복 코드 제거 및 재사용성 향상
- **API Routes 리팩토링**
  - web/app/api/admin/collect/route.ts - 새 모듈 사용
  - web/app/api/coupang/test-collect/route.ts - 새 모듈 사용
- **React Query 최적화**
  - useReviews.ts: staleTime 30초 → 5분
  - useProducts.ts: staleTime 30초 → 5분
  - 불필요한 Firestore 읽기 감소
- ⭐ **페이지네이션 개선**
  - useProducts.ts: cursor 기반 페이지네이션 추가
  - ProductList.tsx: 페이지네이션 UI 추가
  - 로그 뷰어: 이미 구현됨
- ⭐ **에러 핸들링 개선**
  - web/app/error.tsx 생성 (전역 에러 페이지)
  - ErrorBoundary.tsx 생성 (React 에러 바운더리)
  - ErrorMessage.tsx 생성 (API 에러 표시)
  - QueryProvider.tsx: Exponential backoff 재시도 로직 추가
  - DashboardLayout: ErrorBoundary 적용
- 현재 파일 구조로 전면 업데이트
- 누락된 페이지 및 컴포넌트 추가
- Functions 파일 크기 주석 추가
- 파일 구조 업데이트 지침 추가

### 이전
- 초기 프로젝트 구조 문서 작성
