"use client";

/**
 * React Query Provider for Next.js App Router
 * 서버/클라이언트 환경에 맞게 QueryClient를 관리
 */

import {
  isServer,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { type ReactNode } from "react";

/**
 * Exponential backoff 재시도 딜레이 계산
 * @param attemptIndex 시도 횟수 (0부터 시작)
 * @returns 밀리초 단위 딜레이
 */
function getRetryDelay(attemptIndex: number): number {
  // 1초 * 2^attemptIndex, 최대 30초
  return Math.min(1000 * 2 ** attemptIndex, 30000);
}

/**
 * 재시도 가능한 에러인지 판단
 * @param error 에러 객체
 * @returns 재시도 가능 여부
 */
function shouldRetry(failureCount: number, error: unknown): boolean {
  // 최대 3회까지 재시도
  if (failureCount >= 3) {
    return false;
  }

  // 네트워크 에러는 재시도
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (
      message.includes("network") ||
      message.includes("timeout") ||
      message.includes("fetch") ||
      message.includes("connection")
    ) {
      return true;
    }
  }

  // 500번대 서버 에러는 재시도
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
  ) {
    return error.status >= 500 && error.status < 600;
  }

  // 기타 에러는 재시도하지 않음
  return false;
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // SSR에서는 클라이언트에서 즉시 refetch하지 않도록 staleTime 설정
        staleTime: 60 * 1000, // 1분
        // 스마트 재시도: 네트워크 에러나 500번대 에러만 재시도
        retry: shouldRetry,
        // Exponential backoff 적용
        retryDelay: getRetryDelay,
        // 윈도우 포커스 시 refetch 비활성화 (관리자 대시보드에서는 불필요)
        refetchOnWindowFocus: false,
      },
      mutations: {
        // mutation 에러 시 재시도 안 함 (데이터 무결성 보장)
        retry: false,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (isServer) {
    // 서버: 항상 새 QueryClient 생성
    return makeQueryClient();
  } else {
    // 브라우저: 싱글톤 유지
    if (!browserQueryClient) {
      browserQueryClient = makeQueryClient();
    }
    return browserQueryClient;
  }
}

type QueryProviderProps = {
  children: ReactNode;
};

export function QueryProvider({ children }: QueryProviderProps) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
