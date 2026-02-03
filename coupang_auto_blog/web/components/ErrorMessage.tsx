"use client";

/**
 * API 에러 메시지 표시 컴포넌트
 */

type ErrorMessageProps = {
  error: Error | null;
  title?: string;
  onRetry?: () => void;
};

export function ErrorMessage({ error, title, onRetry }: ErrorMessageProps) {
  if (!error) return null;

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-red-800">
            {title || "오류가 발생했습니다"}
          </h3>
          <div className="mt-2 text-sm text-red-700">
            <p>{error.message}</p>
          </div>
          {onRetry && (
            <div className="mt-4">
              <button
                onClick={onRetry}
                className="rounded-md bg-red-100 px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 focus:ring-offset-red-50"
              >
                다시 시도
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * 인라인 에러 메시지 (작은 크기)
 */
export function InlineError({ error }: { error: Error | null }) {
  if (!error) return null;

  return (
    <div className="flex items-center gap-2 text-sm text-red-600">
      <svg
        className="h-4 w-4 flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span>{error.message}</span>
    </div>
  );
}
