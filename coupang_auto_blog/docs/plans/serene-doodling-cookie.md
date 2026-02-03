# 블로그 자동 발행 시스템 구현 계획

## 요약
수집된 상품 데이터와 AI 생성 리뷰를 자체 Next.js 블로그로 자동 발행하는 시스템을 구축합니다. 관리자가 'approved' 상태의 리뷰를 'published'로 전환하면 자동으로 블로그 포스트가 생성되고, SEO 최적화된 페이지가 공개됩니다.

---

## 사용자 요구사항

1. **블로그 플랫폼**: 자체 블로그 (Next.js) - 현재 프로젝트에 통합
2. **발행 방식**: 수동 발행 (관리자가 'approved' → 'published' 전환 시)
3. **콘텐츠 구성**:
   - AI 생성 리뷰 본문
   - 상품 이미지 (쿠팡 썸네일)
   - 쿠팡 제휴 링크 (딥링크)
   - 가격 정보 (할인율 포함)

---

## 현재 시스템 분석 (Explore 에이전트 결과)

### 구현 완료된 기능
- ✅ **상품 수집**: 4가지 소스 (골드박스, 카테고리, 키워드, PL) 자동 수집
- ✅ **AI 리뷰 생성**: OpenAI/Claude/Gemini 다중 제공자, 검증 파이프라인
- ✅ **리뷰 승인 대시보드**: 필터, 검색, 일괄 처리, WYSIWYG 편집
- ✅ **재시도 메커니즘**: 5분 스케줄, 지수 백오프

### 미구현 기능
- ❌ **블로그 발행**: 'published' 상태로 전환은 가능하나, 실제 블로그 페이지 생성 없음
- ❌ **SEO 최적화**: 메타 태그, Open Graph, 구조화된 데이터 없음
- ❌ **URL 생성**: slug 자동 생성 미지원

### Firestore 스키마 (현재)

**reviews 컬렉션**:
```javascript
{
  productId: string,
  content: string,           // AI 리뷰 본문
  status: "draft" | "needs_revision" | "approved" | "published",
  category: string,
  toneScore: number,
  charCount: number,
  createdAt: Timestamp,
  updatedAt: Timestamp,

  // 상품 정보 (products에서 복사)
  productName: string,
  productPrice: number,
  productImage: string,
  affiliateUrl: string
}
```

**추가 필요 필드**:
```javascript
{
  // 블로그 발행 관련
  slug: string,              // URL: /reviews/{slug}
  publishedAt: Timestamp,    // 발행 시간

  // SEO 메타데이터
  seoMeta: {
    title: string,           // 브라우저 타이틀 (50-60자)
    description: string,     // 메타 설명 (150-160자)
    keywords: string[],      // SEO 키워드
    ogImage: string          // Open Graph 이미지 URL
  },

  // 선택 사항
  viewCount: number,         // 조회수 추적
  lastViewedAt: Timestamp    // 마지막 조회 시간
}
```

---

## 구현 범위

### Phase 1: 블로그 포스트 페이지 (핵심)

#### 1.1 동적 라우트 생성
- **파일**: `web/app/reviews/[slug]/page.tsx`
- **렌더링 전략**: ISR (Incremental Static Regeneration)
  - revalidate: 3600 (1시간마다 재생성)
  - 'published' 상태 리뷰만 표시
  - 404 처리 (삭제되거나 비공개된 리뷰)

#### 1.2 리뷰 목록 페이지
- **파일**: `web/app/reviews/page.tsx`
- **기능**:
  - 최신 리뷰 목록 (페이지네이션)
  - 카테고리별 필터
  - 검색 기능
  - 카드형 레이아웃 (이미지 + 제목 + 요약)

#### 1.3 포스트 레이아웃 컴포넌트
- **파일**: `web/components/ReviewPost.tsx`
- **구조**:
  ```
  ┌──────────────────────────────────────┐
  │  [썸네일 이미지]                        │
  │  productImage (쿠팡 API)               │
  └──────────────────────────────────────┘

  ┌──────────────────────────────────────┐
  │  제목: {productName}                   │
  │  카테고리: {category}                  │
  │  작성일: {publishedAt}                 │
  └──────────────────────────────────────┘

  ┌──────────────────────────────────────┐
  │  [리뷰 본문]                           │
  │  {content}                            │
  │  (마크다운 또는 HTML 렌더링)           │
  └──────────────────────────────────────┘

  ┌──────────────────────────────────────┐
  │  가격: ₩{productPrice}                │
  │  [쿠팡에서 보기] (affiliateUrl)        │
  └──────────────────────────────────────┘

  ┌──────────────────────────────────────┐
  │  관련 상품 추천 (선택)                 │
  └──────────────────────────────────────┘
  ```

### Phase 2: SEO 최적화

#### 2.1 메타 태그 생성
- **파일**: `web/lib/seo.ts`
- **기능**:
  ```typescript
  function generateSEOMeta(review: Review) {
    return {
      title: `${review.productName} 리뷰 | 쿠팡 추천`,
      description: review.content.slice(0, 150) + "...",
      keywords: [review.category, "쿠팡", "리뷰", "추천"],
      ogImage: review.productImage,
      ogType: "article",
      ogUrl: `https://yourdomain.com/reviews/${review.slug}`
    };
  }
  ```

#### 2.2 구조화된 데이터 (Schema.org)
- **타입**: Product + Review
- **예시**:
  ```json
  {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": "샤오미 무선 청소기",
    "image": "https://...",
    "review": {
      "@type": "Review",
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": "4.5",
        "bestRating": "5"
      },
      "author": {
        "@type": "Organization",
        "name": "쿠팡 리뷰 블로그"
      },
      "reviewBody": "..."
    },
    "offers": {
      "@type": "Offer",
      "price": "250000",
      "priceCurrency": "KRW",
      "availability": "https://schema.org/InStock",
      "url": "https://affiliateUrl..."
    }
  }
  ```

#### 2.3 Open Graph 태그
- og:title, og:description, og:image, og:url
- twitter:card, twitter:title, twitter:description

### Phase 3: Slug 생성 및 URL 관리

#### 3.1 Slug 생성 유틸리티
- **파일**: `web/lib/slug.ts`
- **로직**:
  ```typescript
  function generateSlug(productName: string, productId: string): string {
    // 한글 → 영문 변환 (transliteration)
    const romanized = transliterate(productName);

    // 특수문자 제거, 공백 → 하이픈
    const slug = romanized
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s-]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 50);

    // productId 추가 (고유성 보장)
    return `${slug}-${productId.slice(-8)}`;
  }

  // 예: "샤오미 무선 청소기" + "12345678"
  //  → "syaomi-museonseongsogi-12345678"
  ```

#### 3.2 중복 방지
- reviews 컬렉션에 slug 필드 인덱스 생성
- Firestore 규칙으로 고유성 보장
- 충돌 시 자동 증분 ("-2", "-3")

### Phase 4: 발행 워크플로우 (Firestore Trigger)

#### 4.1 Firestore Trigger 추가
- **파일**: `functions/src/publishReview.js`
- **트리거**: `onDocumentUpdated("reviews/{reviewId}")`
- **조건**: `status` 변경 감지 ("approved" → "published")
- **동작**:
  1. slug 생성 (없으면)
  2. SEO 메타데이터 생성
  3. publishedAt 타임스탬프 설정
  4. logs 컬렉션에 기록
  5. Slack 알림
  6. (선택) sitemap.xml 재생성

#### 4.2 역발행 (Unpublish)
- "published" → "approved" 전환 시
- 블로그 페이지는 남지만 404 처리 또는 "비공개" 메시지 표시
- ISR 캐시 무효화

### Phase 5: 대시보드 통합

#### 5.1 발행 버튼 추가
- **파일**: `web/components/admin/ReviewTable.tsx`
- **위치**: 각 리뷰 행의 액션 버튼
- **기능**:
  - "승인" 버튼 클릭 시 → status: "approved"
  - "발행" 버튼 표시 (approved 상태일 때만)
  - "발행" 버튼 클릭 시 → status: "published"
  - 발행 성공 시 블로그 링크 표시: `/reviews/{slug}`

#### 5.2 발행 상태 표시
- 리뷰 테이블에 "발행됨" 뱃지 추가
- publishedAt 시간 표시
- 조회수 표시 (선택)

---

## 생성/수정할 파일 목록

### 웹 프론트엔드 (Next.js)

| 파일 | 역할 | 우선순위 |
|------|------|----------|
| `web/app/reviews/[slug]/page.tsx` | 블로그 포스트 동적 라우트 (ISR) | 🔴 높음 |
| `web/app/reviews/page.tsx` | 리뷰 목록 페이지 | 🔴 높음 |
| `web/components/ReviewPost.tsx` | 포스트 레이아웃 컴포넌트 | 🔴 높음 |
| `web/lib/seo.ts` | SEO 메타데이터 생성 유틸 | 🟡 중간 |
| `web/lib/slug.ts` | Slug 생성 유틸 | 🟡 중간 |
| `web/lib/firestore.ts` | Firestore 쿼리 추가 (getPublishedReviews) | 🟡 중간 |
| `web/components/admin/ReviewTable.tsx` | "발행" 버튼 추가 | 🟢 낮음 |

### Firebase Functions

| 파일 | 역할 | 우선순위 |
|------|------|----------|
| `functions/src/publishReview.js` | 발행 트리거 (slug 생성, SEO 메타) | 🟡 중간 |
| `functions/src/index.js` | publishReview export 추가 | 🟡 중간 |

### 타입 정의

| 파일 | 역할 | 우선순위 |
|------|------|----------|
| `web/types/index.ts` | Review 타입에 slug, seoMeta 필드 추가 | 🔴 높음 |

---

## 구현 순서

### Step 1: 기본 블로그 페이지 (우선)
1. `web/types/index.ts` - Review 타입 확장
2. `web/lib/slug.ts` - Slug 생성 유틸
3. `web/components/ReviewPost.tsx` - 포스트 레이아웃
4. `web/app/reviews/[slug]/page.tsx` - 동적 라우트
5. `web/app/reviews/page.tsx` - 목록 페이지

**테스트 방법**:
- Firestore에서 reviews 문서 수동 수정:
  - `slug: "test-product-12345678"` 추가
  - `status: "published"` 설정
  - `publishedAt: Timestamp.now()` 설정
- 브라우저에서 `/reviews/test-product-12345678` 접속 확인

### Step 2: SEO 최적화
1. `web/lib/seo.ts` - SEO 메타 생성
2. `web/app/reviews/[slug]/page.tsx` - 메타 태그 추가 (generateMetadata)
3. Open Graph 태그
4. 구조화된 데이터 (JSON-LD)

**테스트 방법**:
- 브라우저 개발자 도구에서 `<head>` 태그 확인
- Facebook Sharing Debugger: https://developers.facebook.com/tools/debug/
- Google Rich Results Test: https://search.google.com/test/rich-results

### Step 3: 자동 발행 트리거
1. `functions/src/publishReview.js` - Firestore 트리거
2. `functions/src/index.js` - export 추가
3. Firebase Functions 배포

**테스트 방법**:
- 웹 대시보드에서 리뷰 승인 → "approved"
- 다시 "발행" 버튼 클릭 → "published"
- Firestore에서 slug, publishedAt 자동 생성 확인
- logs 컬렉션에서 발행 로그 확인

### Step 4: 대시보드 통합
1. `web/components/admin/ReviewTable.tsx` - "발행" 버튼 추가
2. 발행 상태 뱃지 표시
3. 블로그 링크 표시

**테스트 방법**:
- 대시보드에서 전체 워크플로우 테스트:
  - draft → approved → published
  - 발행된 리뷰의 블로그 링크 클릭
  - 공개 페이지 확인

### Step 5: 추가 기능 (선택)
1. 조회수 추적 (viewCount)
2. 관련 상품 추천
3. 댓글 시스템 (Firebase Firestore 또는 외부 서비스)
4. RSS 피드 생성
5. Sitemap.xml 자동 갱신

---

## Firestore 스키마 변경사항

### reviews 컬렉션 (업데이트)

**추가 필드**:
```javascript
{
  // 기존 필드 유지
  productId: string,
  content: string,
  status: "draft" | "needs_revision" | "approved" | "published",
  // ...

  // 신규 필드
  slug: string,              // 고유 URL slug
  publishedAt: Timestamp,    // 발행 시간 (null이면 미발행)

  seoMeta: {
    title: string,           // "샤오미 무선 청소기 리뷰 | 쿠팡 추천"
    description: string,     // 리뷰 본문 요약 (150-160자)
    keywords: string[],      // ["홈/가구", "청소기", "샤오미"]
    ogImage: string          // productImage 또는 커스텀 이미지
  },

  // 선택 사항
  viewCount: number,         // 조회수 (기본값: 0)
  lastViewedAt: Timestamp    // 마지막 조회 시간
}
```

### Firestore 인덱스 추가

**firestore.indexes.json**:
```json
{
  "indexes": [
    // 기존 인덱스 유지...

    // 신규 인덱스
    {
      "collectionGroup": "reviews",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "publishedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "reviews",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "slug", "order": "ASCENDING" }
      ]
    }
  ]
}
```

---

## 주요 기술적 결정

### 1. 렌더링 전략: ISR (Incremental Static Regeneration)

**선택 이유**:
- SSR: 매 요청마다 서버 렌더링 → 느림, 비용 높음
- SSG: 빌드 시 정적 생성 → 새 리뷰마다 재배포 필요
- **ISR**: 첫 요청 시 생성 + 주기적 재생성 → 최적의 성능 + 자동 업데이트

**설정**:
```typescript
export const revalidate = 3600; // 1시간마다 재생성
```

### 2. Slug 생성 전략

**Option A: 한글 그대로**
- 예: `/reviews/샤오미-무선-청소기-12345678`
- 장점: 가독성 높음
- 단점: URL 인코딩 필요, SEO 불리

**Option B: 영문 transliteration (채택)**
- 예: `/reviews/syaomi-museon-cheongsogi-12345678`
- 장점: URL 친화적, SEO 유리
- 단점: 가독성 낮음

### 3. SEO 메타데이터 생성 시점

**Option A: 발행 시 자동 생성 (채택)**
- publishReview Firestore Trigger에서 생성
- 일관성 보장, 수동 작업 불필요

**Option B: 관리자 수동 입력**
- 대시보드에서 SEO 필드 편집 가능
- 유연성 높음, 하지만 번거로움

→ **Option A 채택 + Option B 선택 지원**

### 4. 이미지 처리

**현재**: 쿠팡 이미지 URL 직접 사용
- 빠르고 간단
- 단점: 쿠팡 서버 의존, 이미지 변경 시 반영 안됨

**향후 개선** (선택):
- Next.js Image 컴포넌트 사용
- 이미지 최적화 (WebP 변환)
- CDN 캐싱

---

## 보안 고려사항

### 1. Firestore Rules 업데이트

**공개 읽기 허용** (published 리뷰만):
```firestore
match /reviews/{reviewId} {
  // 인증된 관리자만 쓰기 가능
  allow write: if request.auth != null && request.auth.token.admin == true;

  // published 상태만 공개 읽기 허용
  allow read: if resource.data.status == "published";

  // 관리자는 모두 읽기 가능
  allow read: if request.auth != null && request.auth.token.admin == true;
}
```

### 2. XSS 방지

- 리뷰 본문 렌더링 시 sanitize 필요
- 라이브러리: `dompurify` 또는 Next.js 기본 escape

### 3. 제휴 링크 추적

- 쿠팡 딥링크에 subId 파라미터 추가
- 예: `?subId=${reviewId}` → 리뷰별 수익 추적

---

## 성능 최적화

### 1. ISR 캐싱 전략
- revalidate: 3600 (1시간)
- On-Demand Revalidation: 리뷰 수정 시 즉시 재생성

### 2. 이미지 최적화
- Next.js Image 컴포넌트
- Lazy loading
- Placeholder blur

### 3. 페이지네이션
- 리뷰 목록: 12개씩 페이지네이션
- Firestore 커서 기반 페이지네이션

---

## 모니터링 및 분석

### 1. 조회수 추적
- Firestore에서 viewCount 증가
- 실시간 대시보드에서 인기 리뷰 표시

### 2. 수익 추적
- 쿠팡 파트너스 API (선택)
- 리뷰별 클릭/전환율 분석

### 3. SEO 성과
- Google Search Console 연동
- 키워드 순위 추적

---

## 검증 방법

### Step 1: 기본 블로그 페이지
1. Firestore에서 reviews 문서 수동으로 `slug`, `publishedAt` 추가
2. 브라우저에서 `/reviews/{slug}` 접속
3. 상품 이미지, 리뷰 본문, 가격, 제휴 링크 모두 표시 확인
4. `/reviews` 목록 페이지에서 카드 표시 확인

### Step 2: SEO 확인
1. 브라우저 개발자 도구 → Elements → `<head>` 확인
   - `<title>`: "샤오미 무선 청소기 리뷰 | ..."
   - `<meta name="description">`: 리뷰 요약
   - Open Graph 태그 (`og:*`)
   - JSON-LD 구조화된 데이터
2. Facebook Sharing Debugger 테스트
3. Google Rich Results Test

### Step 3: 자동 발행 워크플로우
1. 대시보드에서 리뷰 상태 변경:
   - draft → approved → published
2. Firestore 확인:
   - slug 자동 생성 확인
   - seoMeta 자동 생성 확인
   - publishedAt 타임스탬프 확인
3. logs 컬렉션에서 발행 로그 확인
4. Slack 알림 수신 확인

### Step 4: 전체 E2E 테스트
1. 상품 수집 실행 (test-collect 페이지)
2. products → reviews 자동 생성 확인
3. 대시보드에서 리뷰 승인
4. "발행" 버튼 클릭
5. 블로그 링크 클릭하여 공개 페이지 확인
6. 제휴 링크 클릭하여 쿠팡 페이지 이동 확인

---

## 다음 단계

계획 승인 후:
1. **Step 1 구현** (기본 블로그 페이지) - 1-2일
2. **Step 2 구현** (SEO 최적화) - 0.5-1일
3. **Step 3 구현** (자동 발행 트리거) - 0.5-1일
4. **Step 4 구현** (대시보드 통합) - 0.5일
5. **테스트 및 디버깅** - 0.5-1일

**총 예상 시간**: 3-5일

---

## 참고 문서

- Next.js ISR: https://nextjs.org/docs/app/building-your-application/data-fetching/incremental-static-regeneration
- Schema.org Product Review: https://schema.org/Review
- Open Graph Protocol: https://ogp.me/
- Firebase Firestore Triggers: https://firebase.google.com/docs/functions/firestore-events
