# TODO - 작업 목록

> 마지막 업데이트: 2026-01-29

---

## 🔴 우선순위: 긴급 (즉시 처리)

### ~~Phase 3 완료~~ ✅ DONE (2026-01-29)
- [x] **API Routes 중복 제거**
  - [x] `web/lib/coupang/client.ts` 생성 - 공통 HTTP 클라이언트
  - [x] `web/lib/coupang/signature.ts` 생성 - HMAC 서명
  - [x] `web/lib/coupang/deeplink.ts` 생성 - 딥링크 API
  - [x] `web/lib/coupang/products.ts` 생성 - 상품 API
  - [x] `web/lib/coupang/types.ts` 생성 - 타입 정의
  - [x] `web/app/api/admin/collect/route.ts` 리팩토링
  - [x] `web/app/api/coupang/test-collect/route.ts` 리팩토링
  - ✅ 효과: 코드 중복 제거, 유지보수성 향상

- [x] **Functions 모듈화**
  - [x] `functions/src/coupang/` 디렉토리 생성
  - [x] `coupangApi.js` 모듈화 (586줄 → signature, client, products, deeplink, reports로 분리)
  - [x] `collectProducts.js` import 경로 변경
  - [x] `testCollect.js` import 경로 변경
  - ⚠️ 추가 작업 필요: `collectProducts.js` (566줄), `generateReview.js` (326줄) 분리
  - ✅ 효과: 재사용성 향상, 모듈화

---

## 🟡 우선순위: 높음 (1-2주 내)

### ~~성능 최적화~~ ✅ DONE (2026-01-29)
- [x] **React Query staleTime 조정**
  - 파일: `web/hooks/useReviews.ts:98`
  - 변경: `30초` → `5분`
  - 파일: `web/hooks/useProducts.ts:97`
  - 변경: `30초` → `5분`
  - ✅ 효과: 불필요한 재조회 감소, 비용 절감

### ~~페이지네이션 개선~~ ✅ DONE (2026-01-29)
- [x] **상품 목록 페이지네이션**
  - [x] useProducts.ts: cursor 기반 페이지네이션 추가
  - [x] ProductList.tsx: 페이지네이션 UI 추가
  - [x] products/page.tsx: 페이지네이션 연결
  - ✅ 효과: 초기 로딩 시간 감소, 메모리 절감
- [x] **로그 뷰어 페이지네이션**
  - [x] 이미 구현됨 (useAdminDashboardData.ts)

### ~~에러 핸들링~~ ✅ DONE (2026-01-29)
- [x] **전역 에러 바운더리 추가**
  - [x] `web/app/error.tsx` 생성
  - [x] `ErrorBoundary.tsx` 생성
  - [x] `ErrorMessage.tsx` 생성
  - [x] DashboardLayout에 ErrorBoundary 적용
  - ✅ 효과: 사용자 경험 개선

- [x] **재시도 로직 개선**
  - [x] QueryProvider.tsx: Exponential backoff 추가
  - [x] 스마트 재시도 (네트워크/500 에러만)
  - [x] 최대 3회 재시도, 최대 30초 딜레이
  - ✅ 효과: 안정성 향상, 네트워크 불안정 대응

---

## 🟢 우선순위: 중간 (1개월 내)

### 기능 추가
- [ ] **후기 편집기 개선**
  - 이미지 업로드 기능
  - 마크다운 미리보기
  - 자동 저장
  - 예상 시간: 1주
  - 효과: 사용자 편의성

- [ ] **통계 대시보드**
  - 일별 수집 통계 차트
  - 후기 생성 성공률
  - API 사용량 모니터링
  - 예상 시간: 1주
  - 효과: 운영 가시성

### 코드 품질
- [ ] **TypeScript 엄격 모드**
  - `tsconfig.json`에 strict: true
  - any 타입 제거
  - 예상 시간: 2-3일
  - 효과: 타입 안정성

- [ ] **ESLint 규칙 강화**
  - unused-vars 경고
  - console.log 제거
  - 예상 시간: 1일
  - 효과: 코드 품질 향상

---

## 🔵 우선순위: 낮음 (3개월 내)

### 장기 개선
- [ ] **Functions TypeScript 마이그레이션**
  - `collectProducts.js` → `collectProducts.ts`
  - `generateReview.js` → `generateReview.ts`
  - `coupangApi.js` → `coupangApi.ts`
  - 예상 시간: 2주
  - 효과: 타입 안정성, 개발 생산성

- [ ] **Component 라이브러리 도입**
  - Shadcn/ui 또는 Radix UI
  - 공통 컴포넌트 정리
  - 예상 시간: 1주
  - 효과: 디자인 일관성

- [ ] **E2E 테스트**
  - Playwright 설정
  - 주요 플로우 테스트 작성
  - 예상 시간: 1주
  - 효과: 회귀 버그 방지

- [ ] **모니터링 대시보드**
  - Firebase Performance Monitoring
  - Error tracking (Sentry)
  - 예상 시간: 3-4일
  - 효과: 장애 조기 감지

---

## ⚠️ 프로덕션 배포 전 필수 작업

### 보안 강화
- [ ] **Firestore Rules 활성화**
  - 파일: `firestore.rules`
  - 주석 처리된 프로덕션 규칙 활성화
  - 개발용 규칙 제거
  - 테스트 필수

- [ ] **Admin Custom Claim 설정**
  ```bash
  cd functions
  npm run set-admin -- --email [관리자이메일]
  ```

- [ ] **환경 변수 검증**
  - [ ] `FIREBASE_ADMIN_PROJECT_ID`
  - [ ] `FIREBASE_ADMIN_CLIENT_EMAIL`
  - [ ] `FIREBASE_ADMIN_PRIVATE_KEY`
  - [ ] `NEXT_PUBLIC_FIREBASE_API_KEY`
  - [ ] `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
  - [ ] `NEXT_PUBLIC_FIREBASE_PROJECT_ID`

- [ ] **ADMIN_GUARD_BYPASS 비활성화**
  - `.env` 파일에서 제거 또는 false 설정

### 성능 검증
- [ ] **Lighthouse 점수 확인**
  - Performance: 90+ 목표
  - Accessibility: 95+ 목표
  - Best Practices: 95+ 목표
  - SEO: 90+ 목표

- [ ] **Firestore 인덱스 확인**
  - Firebase Console에서 모든 인덱스 생성 확인
  - 쿼리 성능 테스트

- [ ] **로그 정리 스케줄러 확인**
  - cleanupOldLogs 함수 배포 확인
  - 첫 실행 대기 또는 수동 트리거

### 기능 테스트
- [ ] **상품 수집 전체 플로우**
  - 골드박스 수집
  - 카테고리 수집
  - 키워드 수집
  - 딥링크 생성 확인

- [ ] **후기 생성 플로우**
  - AI 후기 생성
  - 초안 저장
  - 승인 프로세스
  - 발행

- [ ] **관리자 기능**
  - 로그인/로그아웃
  - 대시보드 접근
  - 설정 변경
  - 로그 조회

---

## 📊 진행 상황

### 완료된 작업 (2026-01-29 기준)
- ✅ Phase 2: DB 최적화 (100%)
  - ✅ Firestore 인덱스 추가
  - ✅ 로그 자동 삭제 구현
  - ✅ 타입 정의 통합

- ✅ Phase 3: 코드 리팩토링 (100%)
  - ✅ 딥링크 배치 처리
  - ✅ 시스템 설정 캐싱
  - ✅ API Routes 중복 제거 (완료)
  - ✅ Functions 모듈화 (완료)
    - ✅ coupang 모듈 분리
    - ✅ services/settingsService.js 생성
    - ✅ collectProducts.js (651줄 → 621줄)
    - ✅ generateReview.js (343줄 → 283줄)

- ✅ 성능 최적화 (완료)
  - ✅ React Query staleTime 조정 (30초 → 5분)
  - ✅ useReviews.ts, useProducts.ts 최적화

- ✅ 페이지네이션 (완료)
  - ✅ 상품 목록 cursor 기반 페이지네이션
  - ✅ 로그 뷰어 페이지네이션 (이미 구현됨)

- ✅ 에러 핸들링 (완료)
  - ✅ 전역 에러 페이지 (error.tsx)
  - ✅ ErrorBoundary 컴포넌트
  - ✅ Exponential backoff 재시도 로직

- ✅ 기타
  - ✅ 로그아웃 버튼 추가
  - ✅ Middleware Bypass 모드 제한
  - ✅ date-fns 패키지 설치
  - ✅ 파일 구조 문서 업데이트

### 진행 중
- 없음

### 보류
- ⏸️ Phase 1 보안 강화 (프로덕션 배포 시 진행)

---

## 📝 참고 문서

- [작업 로그 (2026-01-29)](./worklog/2026-01-29-Phase2-Phase3-최적화-작업.md)
- [개선사항 분석](./architecture/개선사항-2026-01-27.md)
- [이전 작업 로그](./worklog/2026-01-27-로그뷰어-개선-및-상품수집-오류-수정.md)

---

## 🎯 다음 작업 추천 순서

1. **Phase 3 완료** (2-3일)
   - API Routes 중복 제거
   - Functions 모듈화

2. **성능 최적화** (1일)
   - React Query staleTime 조정
   - 페이지네이션 개선

3. **에러 핸들링** (1일)
   - 전역 에러 바운더리
   - 재시도 로직 개선

4. **프로덕션 준비** (1일)
   - Firestore Rules 활성화
   - Admin Custom Claim 설정
   - 전체 기능 테스트

**예상 총 소요 시간:** 1주일

---

## 💡 개선 아이디어 (미래)

- [ ] AI 모델 선택 UI (사용자가 OpenAI/Anthropic/Google 선택)
- [ ] 후기 템플릿 관리 (카테고리별 템플릿)
- [ ] 이미지 자동 최적화 (Sharp.js)
- [ ] 다국어 지원 (i18n)
- [ ] 모바일 앱 (React Native)
- [ ] Webhook 알림 (Slack/Discord)
- [ ] A/B 테스트 프레임워크
- [ ] 백업/복원 기능

---

## ✅ 완료된 이전 작업

- [x] Admin dashboard: add review search and URL-synced filters
- [x] Admin log viewer: add level/date filters with URL sync
- [x] Firebase admin tooling: set `admin=true` custom claims script
