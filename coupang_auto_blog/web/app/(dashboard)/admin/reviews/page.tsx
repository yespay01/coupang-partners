"use client";

export default function ReviewsPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16 sm:px-8">
      <h1 className="text-3xl font-bold text-slate-900">후기 승인 관리</h1>
      <p className="mt-3 text-sm text-slate-600">
        승인 대기/재검수 필요 리뷰를 Firestore `reviews` 컬렉션과 동기화합니다. 곧 관리 테이블과 필터가 연결될
        예정입니다.
      </p>
      <div className="mt-10 rounded-3xl border border-dashed border-slate-300 bg-slate-50/60 p-8 text-center text-sm text-slate-500">
        워크플로 상세 페이지 준비 중입니다.
      </div>
    </div>
  );
}
