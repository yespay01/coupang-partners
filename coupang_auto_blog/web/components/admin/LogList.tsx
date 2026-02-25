"use client";

/**
 * 로그 목록 컴포넌트
 * - 로그 카드 그리드
 * - 레벨별 스타일링
 */

import { useState } from "react";
import type { LogEntry } from "@/hooks/useAdminDashboardData";
import { logToneClass } from "./constants";

type LogListProps = {
  logs: LogEntry[];
};

const LOG_LEVEL_LABELS: Record<LogEntry["level"], string> = {
  info: "정보",
  warn: "경고",
  error: "오류",
};

// 한국 시간으로 포맷팅
function formatKoreanTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return isoString;
  }
}

// source를 보기 좋게 포맷팅
function formatSource(source: string): string {
  if (source.startsWith("keyword:")) {
    return `키워드: ${source.replace("keyword:", "")}`;
  }
  if (source.startsWith("category:")) {
    return `카테고리: ${source.replace("category:", "")}`;
  }
  if (source.startsWith("coupangPL:")) {
    return `쿠팡 PL: ${source.replace("coupangPL:", "")}`;
  }
  if (source === "goldbox") {
    return "골드박스";
  }
  if (source === "manual") {
    return "수동 수집";
  }
  if (source === "trigger") {
    return "자동 생성";
  }
  if (source === "retry") {
    return "재시도";
  }
  return source;
}

export function LogList({ logs }: LogListProps) {
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set());

  const toggleExpand = (index: number) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedLogs(newExpanded);
  };

  if (logs.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center text-xs text-slate-500">
        조건에 해당하는 로그가 없습니다. 필터를 조정하거나 검색어를 지워보세요.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {logs.map((entry, index) => {
        const isExpanded = expandedLogs.has(index);

        // context 또는 payload에서 데이터 추출
        let parsedData: any = null;
        try {
          // context가 JSON 문자열인 경우 파싱
          if (entry.context && entry.context.startsWith("{")) {
            parsedData = JSON.parse(entry.context);
          } else if (entry.payload) {
            parsedData = entry.payload;
          }
        } catch {
          parsedData = entry.payload;
        }

        const source = parsedData?.source;
        const payload = parsedData;

        // 실제 표시할 메시지 결정: payload.message가 있으면 우선 사용
        const actualMessage = payload?.message || entry.message;

        // 에러 스택이 있는지 확인
        const errorStack = payload?.stack;
        const hasErrorStack = errorStack && typeof errorStack === "string";

        // 메시지 잘림 처리
        const messageLimit = 150;
        const shouldTruncateMessage = actualMessage && actualMessage.length > messageLimit;
        const displayMessage =
          shouldTruncateMessage && !isExpanded
            ? actualMessage.substring(0, messageLimit) + "..."
            : actualMessage;

        // 더보기 버튼 표시 여부: 메시지가 길거나 에러 스택이 있으면
        const shouldShowMore = shouldTruncateMessage || hasErrorStack;

        return (
          <article
            key={`${entry.createdAt}-${index}`}
            className={`rounded-2xl border px-4 py-4 shadow-sm transition-all ${logToneClass[entry.level]} ${
              shouldShowMore ? "cursor-pointer hover:shadow-md" : ""
            }`}
            onClick={() => shouldShowMore && toggleExpand(index)}
          >
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide">
              <span>{LOG_LEVEL_LABELS[entry.level] ?? entry.level}</span>
              <span className="font-mono text-[11px] opacity-70">
                {formatKoreanTime(entry.createdAt)}
              </span>
            </div>

            {/* Source 표시 */}
            {source && (
              <div className="mt-2 inline-block rounded-full bg-slate-900/10 px-2 py-0.5 text-xs font-medium">
                {formatSource(source)}
              </div>
            )}

            <p className="mt-2 text-sm font-semibold">
              {displayMessage}
              {shouldShowMore && (
                <span className="ml-2 text-xs text-blue-600 underline">
                  {isExpanded ? "접기" : "더보기"}
                </span>
              )}
            </p>

            {/* 에러 스택 표시 (펼쳐졌을 때만) */}
            {isExpanded && errorStack && (
              <pre className="mt-3 max-h-96 overflow-auto rounded-lg bg-slate-900/5 p-3 text-xs font-mono leading-relaxed">
                {errorStack}
              </pre>
            )}

            {/* payload 정보 (수집 통계) */}
            {payload && payload.totalCollected !== undefined && (
              <div className="mt-2 space-y-1 text-xs opacity-80">
                <div>총 수집: {payload.totalCollected}개</div>
                {payload.stats && (
                  <div className="ml-2 space-y-0.5 text-[11px]">
                    {payload.stats.goldbox > 0 && <div>• 골드박스: {payload.stats.goldbox}개</div>}
                    {payload.stats.categories > 0 && <div>• 카테고리: {payload.stats.categories}개</div>}
                    {payload.stats.keywords > 0 && <div>• 키워드: {payload.stats.keywords}개</div>}
                    {payload.stats.coupangPL > 0 && <div>• 쿠팡 PL: {payload.stats.coupangPL}개</div>}
                  </div>
                )}
              </div>
            )}

            {/* payload 정보 (에러 관련) */}
            {payload && entry.level === "error" && (
              <div className="mt-2 space-y-1 text-xs opacity-80">
                {payload.productId && <div>상품 ID: {payload.productId}</div>}
                {payload.attempt && <div>시도 횟수: {payload.attempt}</div>}
              </div>
            )}

            {/* 기타 컨텍스트 (JSON이 아닌 경우만) */}
            {entry.context &&
             entry.context !== "{}" &&
             !entry.context.startsWith("{") && (
              <p className="mt-1 text-xs opacity-80">{entry.context}</p>
            )}
          </article>
        );
      })}
    </div>
  );
}
