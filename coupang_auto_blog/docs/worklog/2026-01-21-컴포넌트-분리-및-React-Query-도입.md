# 2026-01-21 컴포넌트 분리 및 React Query 도입

## 작업 개요
AdminDashboardView.tsx의 구조적 문제 해결을 위해 컴포넌트 분리 및 React Query를 도입함

## 해결한 문제들

### 1. 테이블 표시 문제
**문제**: HTML 테이블이 원본과 다르게 표시됨 (추가 border, 스타일 충돌)
**원인**: Tailwind의 `prose` 클래스가 테이블 스타일을 덮어씀
**해결**: `review-content` 컨테이너에서 `prose` 클래스 제거

```tsx
// Before
<div className="prose max-w-none review-content">

// After
<div className="max-w-none review-content">
```

**수정 파일**:
- `web/app/review/[id]/page.tsx`
- `web/components/AdminDashboardView.tsx`

---

### 2. WYSIWYG 에디터 HTML 손실 문제
**문제**: HTML 복사/붙여넣기 시 "Position out of range" 에러 발생
**해결**: 복잡한 HTML 감지 및 자동 HTML 소스 모드 전환

```typescript
// 복잡한 HTML 감지 함수 추가
function isComplexHtml(html: string): boolean {
  const complexPatterns = [
    /<table[\s>]/i,
    /<style[\s>]/i,
    /style\s*=\s*["'][^"']*(?:width|height|background|border|padding|margin)/i,
    // ...
  ];
  return complexPatterns.some((pattern) => pattern.test(html));
}
```

**수정 파일**: `web/components/WysiwygEditor.tsx`

---

## React Query 도입

### 설치
```bash
npm install @tanstack/react-query
```

### 생성된 파일

| 파일 | 설명 |
|------|------|
| `web/types/index.ts` | 통합 타입 정의 (Review, ReviewStatus, Log 등) |
| `web/components/QueryProvider.tsx` | React Query Provider (Next.js App Router 지원) |
| `web/hooks/useReviews.ts` | 리뷰 CRUD를 위한 React Query 훅 |
| `web/hooks/index.ts` | 훅 통합 export |

### useReviews.ts 주요 훅

```typescript
// 리뷰 목록 조회
export function useReviews(options?: UseReviewsOptions)

// 단일 리뷰 조회
export function useReview(reviewId: string | null)

// 리뷰 생성
export function useCreateReview()

// 리뷰 수정
export function useUpdateReview()

// 리뷰 삭제
export function useDeleteReview()

// 리뷰 상태 변경
export function useUpdateReviewStatus()
```

### 캐시 무효화 자동 처리
```typescript
// 변경 후 자동으로 리뷰 목록 갱신
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: reviewKeys.lists() });
}
```

---

## 컴포넌트 분리

### AdminDashboardView.tsx 리팩토링
**Before**: 1239줄의 거대한 단일 파일
**After**: 811줄 (약 35% 감소)

### 생성된 컴포넌트 (components/admin/)

| 파일 | 설명 | 라인 수 |
|------|------|--------|
| `constants.ts` | 상수, 타입, 유틸리티 함수 | 135 |
| `ReviewTable.tsx` | 리뷰 테이블 (체크박스, 뱃지, 액션) | 173 |
| `ReviewDetail.tsx` | 선택된 리뷰 상세 보기 | 62 |
| `LogList.tsx` | 로그 카드 그리드 | 44 |
| `MetricsSection.tsx` | 수익 지표 카드 섹션 | 32 |
| `AutomationOverview.tsx` | 자동화 타임라인 & 시스템 기능 | 80 |
| `EarningsChart.tsx` | 수익 추이 차트 (샘플) | 48 |
| `BulkActions.tsx` | 일괄 작업 버튼 | 57 |
| `Pagination.tsx` | 페이지네이션 컴포넌트 | 46 |
| `index.ts` | 모든 컴포넌트 export | 32 |

### 디렉토리 구조
```
web/components/admin/
├── constants.ts          # 상수, 설정값, 유틸리티
├── ReviewTable.tsx       # 리뷰 테이블
├── ReviewDetail.tsx      # 리뷰 상세 보기
├── LogList.tsx           # 로그 카드 목록
├── MetricsSection.tsx    # 수익 지표 카드
├── AutomationOverview.tsx # 자동화 타임라인
├── EarningsChart.tsx     # 수익 추이 차트
├── BulkActions.tsx       # 일괄 작업 버튼
├── Pagination.tsx        # 페이지네이션
└── index.ts              # 통합 export
```

---

## 수정된 파일 목록

### 신규 생성
1. `web/types/index.ts` - 통합 타입 정의
2. `web/components/QueryProvider.tsx` - React Query Provider
3. `web/hooks/useReviews.ts` - 리뷰 React Query 훅
4. `web/hooks/index.ts` - 훅 통합 export
5. `web/components/admin/constants.ts` - 관리자 상수
6. `web/components/admin/ReviewTable.tsx` - 리뷰 테이블
7. `web/components/admin/ReviewDetail.tsx` - 리뷰 상세
8. `web/components/admin/LogList.tsx` - 로그 목록
9. `web/components/admin/MetricsSection.tsx` - 메트릭스
10. `web/components/admin/AutomationOverview.tsx` - 자동화 개요
11. `web/components/admin/EarningsChart.tsx` - 수익 차트
12. `web/components/admin/BulkActions.tsx` - 일괄 작업
13. `web/components/admin/Pagination.tsx` - 페이지네이션
14. `web/components/admin/index.ts` - 통합 export

### 수정
1. `web/app/globals.css` - prose 클래스 충돌 제거
2. `web/app/review/[id]/page.tsx` - prose 클래스 제거
3. `web/components/Providers.tsx` - QueryProvider 추가
4. `web/components/WysiwygEditor.tsx` - 복잡한 HTML 처리
5. `web/components/ReviewEditorModal.tsx` - React Query 사용
6. `web/components/AdminDashboardView.tsx` - 컴포넌트 분리 적용

---

## 개선 효과

### 유지보수성
- 각 컴포넌트가 단일 책임 원칙(SRP) 준수
- 변경 시 영향 범위 최소화
- 코드 탐색 용이

### 재사용성
- `Pagination`, `BulkActions` 등 범용 컴포넌트로 분리
- 다른 페이지에서도 재사용 가능

### 데이터 관리
- React Query로 서버 상태 자동 동기화
- 캐시 무효화로 데이터 일관성 보장
- 로딩/에러 상태 자동 관리

---

## 테스트 결과

- ✅ TypeScript 타입 체크 통과
- ✅ Next.js 개발 서버 정상 실행
- ✅ 관리자 대시보드 정상 표시
- ✅ 리뷰 편집 모달 정상 동작

---

## 다음 작업 예정

- [ ] 로그 섹션 필터링 로직을 별도 훅으로 분리
- [ ] 리뷰 필터링 로직을 useReviewFilters 훅으로 분리
- [ ] E2E 테스트 작성
- [ ] 성능 최적화 (React.memo, useMemo 활용)
