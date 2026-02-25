"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 에러 로깅 (프로덕션에서는 Sentry 등으로 전송)
    console.error("Global error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="w-full max-w-md space-y-4 rounded-lg border border-slate-200 bg-white p-8 shadow-lg">
        {/* 에러 아이콘 */}
        <div className="flex justify-center">
          <div className="rounded-full bg-red-100 p-3">
            <svg
              className="h-8 w-8 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>

        {/* 에러 메시지 */}
        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-900">문제가 발생했습니다</h2>
          <p className="mt-2 text-sm text-slate-600">
            페이지를 로드하는 중 예기치 않은 오류가 발생했습니다.
          </p>

          {/* 개발 환경에서만 에러 상세 표시 */}
          {process.env.NODE_ENV === "development" && (
            <div className="mt-4 rounded-lg bg-red-50 p-4 text-left">
              <p className="text-xs font-mono text-red-800">
                {error.message}
              </p>
              {error.digest && (
                <p className="mt-2 text-xs text-red-600">
                  Error ID: {error.digest}
                </p>
              )}
            </div>
          )}
        </div>

        {/* 액션 버튼 */}
        <div className="flex gap-3">
          <button
            onClick={reset}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            다시 시도
          </button>
          <button
            onClick={() => (window.location.href = "/")}
            className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
          >
            홈으로
          </button>
        </div>

        {/* 추가 도움말 */}
        <div className="text-center text-xs text-slate-500">
          문제가 계속되면 관리자에게 문의하세요.
        </div>
      </div>
    </div>
  );
}
