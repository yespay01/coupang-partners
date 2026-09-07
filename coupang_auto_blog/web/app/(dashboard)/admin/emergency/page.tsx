"use client";

import { useState } from "react";

export default function EmergencyPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [cleanLoading, setCleanLoading] = useState(false);
  const [cleanResult, setCleanResult] = useState<any>(null);

  const stopRetry = async () => {
    if (!confirm("모든 재시도 작업을 중단하시겠습니까?")) {
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/admin/stop-retry", {
        method: "POST",
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : "중단 실패",
      });
    } finally {
      setLoading(false);
    }
  };

  const cleanLogs = async () => {
    if (
      !confirm(
        "generation 타입의 모든 ERROR 로그를 삭제하시겠습니까?\n(약 5,500개 예상)"
      )
    ) {
      return;
    }

    setCleanLoading(true);
    setCleanResult(null);

    try {
      const response = await fetch("/api/admin/clean-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "generation",
          level: "error",
        }),
      });
      const data = await response.json();
      setCleanResult(data);
    } catch (error) {
      setCleanResult({
        success: false,
        message: error instanceof Error ? error.message : "로그 삭제 실패",
      });
    } finally {
      setCleanLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* 헤더 */}
        <div className="rounded-lg border-2 border-red-500 bg-red-50 p-6">
          <h1 className="text-2xl font-bold text-red-900">🚨 긴급 제어 패널</h1>
          <p className="mt-2 text-sm text-red-700">
            무한 재시도 루프를 즉시 중단합니다.
          </p>
        </div>

        {/* 중단 버튼 */}
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">재시도 큐 중단</h2>
          <p className="mt-2 text-sm text-slate-600">
            현재 진행 중인 모든 리뷰 생성 재시도를 즉시 중단합니다.
            <br />
            <span className="font-semibold text-red-600">
              review_retry_queue 컬렉션의 모든 문서가 삭제됩니다.
            </span>
          </p>

          <button
            onClick={stopRetry}
            disabled={loading}
            className="mt-4 rounded-lg bg-red-600 px-6 py-3 font-bold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? "중단 중..." : "🛑 재시도 중단"}
          </button>
        </div>

        {/* 결과 */}
        {result && (
          <div
            className={`rounded-lg border-2 p-6 ${
              result.success
                ? "border-green-500 bg-green-50"
                : "border-red-500 bg-red-50"
            }`}
          >
            <h3 className="font-bold">
              {result.success ? "✅ 중단 완료" : "❌ 중단 실패"}
            </h3>
            <p className="mt-2 text-sm">{result.message}</p>
            {result.deletedCount !== undefined && (
              <p className="mt-2 text-sm font-semibold">
                삭제된 작업: {result.deletedCount}개
              </p>
            )}
          </div>
        )}

        {/* 로그 정리 */}
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">실패 로그 정리</h2>
          <p className="mt-2 text-sm text-slate-600">
            generation 타입의 모든 ERROR 로그를 삭제합니다.
            <br />
            <span className="font-semibold text-orange-600">
              약 5,500개의 로그가 삭제됩니다. (INFO 로그는 유지됨)
            </span>
          </p>

          <button
            onClick={cleanLogs}
            disabled={cleanLoading}
            className="mt-4 rounded-lg bg-orange-600 px-6 py-3 font-bold text-white hover:bg-orange-700 disabled:opacity-50"
          >
            {cleanLoading ? "삭제 중..." : "🗑️ 실패 로그 삭제"}
          </button>
        </div>

        {/* 로그 정리 결과 */}
        {cleanResult && (
          <div
            className={`rounded-lg border-2 p-6 ${
              cleanResult.success
                ? "border-green-500 bg-green-50"
                : "border-red-500 bg-red-50"
            }`}
          >
            <h3 className="font-bold">
              {cleanResult.success ? "✅ 로그 삭제 완료" : "❌ 로그 삭제 실패"}
            </h3>
            <p className="mt-2 text-sm">{cleanResult.message}</p>
            {cleanResult.deletedCount !== undefined && (
              <p className="mt-2 text-sm font-semibold">
                삭제된 로그: {cleanResult.deletedCount.toLocaleString()}개
              </p>
            )}
          </div>
        )}

        {/* 안내 */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
          <h3 className="font-bold text-blue-900">다음 단계</h3>
          <ol className="mt-2 space-y-2 text-sm text-blue-800">
            <li>✅ 1. 재시도 중단 (완료)</li>
            <li>2. 실패 로그 정리 (위 버튼)</li>
            <li>3. /admin/settings 에서 AI 제공자를 OpenAI로 변경</li>
            <li>
              4. OpenAI API 키 설정 (Google Gemini는 할당량 초과로 사용 불가)
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
