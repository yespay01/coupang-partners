"use client";

import { useEffect, useState } from "react";

type LogStats = {
  total: number;
  byType: Record<string, number>;
  byLevel: Record<string, number>;
  bySource: Record<string, number>;
  byDate: Record<string, number>;
  recentLogs: any[];
};

export default function LogStatsPage() {
  const [stats, setStats] = useState<LogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/logs/stats");
      const data = await response.json();

      if (data.success) {
        setStats(data.data);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "통계 조회 실패");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-lg border border-slate-200 bg-white p-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-blue-600"></div>
            <p className="mt-4 text-sm text-slate-600">로그 분석 중...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-800">오류: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* 헤더 */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">로그 통계 분석</h1>
          <p className="mt-1 text-sm text-slate-500">
            시스템에 기록된 로그를 분석하여 비정상적인 패턴을 찾습니다.
          </p>
        </div>

        {/* 총 개수 */}
        <div className="rounded-lg border-2 border-blue-500 bg-blue-50 p-6">
          <h2 className="text-lg font-bold text-blue-900">총 로그 개수</h2>
          <p className="mt-2 text-4xl font-bold text-blue-600">
            {stats.total.toLocaleString()}
          </p>
        </div>

        {/* 타입별 통계 */}
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">타입별 분포</h2>
          <div className="mt-4 space-y-2">
            {Object.entries(stats.byType)
              .sort(([, a], [, b]) => b - a)
              .map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="font-medium text-slate-700">{type}</span>
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-64 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full bg-blue-600"
                        style={{
                          width: `${(count / stats.total) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="w-20 text-right text-sm font-semibold text-slate-600">
                      {count.toLocaleString()}
                    </span>
                    <span className="w-16 text-right text-xs text-slate-400">
                      {((count / stats.total) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* 레벨별 통계 */}
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">레벨별 분포</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {Object.entries(stats.byLevel).map(([level, count]) => {
              const colors = {
                info: "bg-blue-100 text-blue-800 border-blue-200",
                warn: "bg-yellow-100 text-yellow-800 border-yellow-200",
                error: "bg-red-100 text-red-800 border-red-200",
              };
              const color = colors[level as keyof typeof colors] || "bg-slate-100 text-slate-800 border-slate-200";

              return (
                <div
                  key={level}
                  className={`rounded-lg border-2 p-4 ${color}`}
                >
                  <div className="text-sm font-medium">{level.toUpperCase()}</div>
                  <div className="mt-1 text-2xl font-bold">
                    {count.toLocaleString()}
                  </div>
                  <div className="mt-1 text-xs">
                    {((count / stats.total) * 100).toFixed(1)}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 소스별 통계 (generation 로그만) */}
        {Object.keys(stats.bySource).length > 0 && (
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">생성 소스별 분포</h2>
            <p className="mt-1 text-xs text-slate-500">
              리뷰 생성 로그의 출처 (trigger: 최초 시도, retry: 재시도)
            </p>
            <div className="mt-4 space-y-2">
              {Object.entries(stats.bySource)
                .sort(([, a], [, b]) => b - a)
                .map(([source, count]) => (
                  <div key={source} className="flex items-center justify-between">
                    <span className="font-medium text-slate-700">{source}</span>
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-48 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full bg-green-600"
                          style={{
                            width: `${(count / Object.values(stats.bySource).reduce((a, b) => a + b, 0)) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="w-16 text-right text-sm font-semibold text-slate-600">
                        {count.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* 날짜별 통계 */}
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">날짜별 분포</h2>
          <div className="mt-4 space-y-2">
            {Object.entries(stats.byDate)
              .sort(([a], [b]) => b.localeCompare(a))
              .slice(0, 10)
              .map(([date, count]) => (
                <div key={date} className="flex items-center justify-between">
                  <span className="font-medium text-slate-700">{date}</span>
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-48 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full bg-purple-600"
                        style={{
                          width: `${(count / Math.max(...Object.values(stats.byDate))) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="w-16 text-right text-sm font-semibold text-slate-600">
                      {count.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* 최근 로그 샘플 */}
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">최근 로그 샘플 (20개)</h2>
          <div className="mt-4 space-y-3">
            {stats.recentLogs.map((log) => (
              <div
                key={log.id}
                className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-semibold ${
                          log.level === "error"
                            ? "bg-red-100 text-red-800"
                            : log.level === "warn"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {log.level}
                      </span>
                      <span className="text-xs text-slate-500">{log.type}</span>
                    </div>
                    <p className="mt-1 text-slate-700">
                      {log.message || log.payload?.message || "메시지 없음"}
                    </p>
                    {log.payload && (
                      <pre className="mt-2 overflow-x-auto rounded bg-slate-100 p-2 text-xs text-slate-600">
                        {JSON.stringify(log.payload, null, 2)}
                      </pre>
                    )}
                  </div>
                  <span className="text-xs text-slate-400">
                    {log.createdAt
                      ? new Date(log.createdAt).toLocaleString("ko-KR")
                      : "날짜 없음"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 새로고침 버튼 */}
        <div className="flex justify-center">
          <button
            onClick={fetchStats}
            className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
          >
            🔄 통계 새로고침
          </button>
        </div>
      </div>
    </div>
  );
}
