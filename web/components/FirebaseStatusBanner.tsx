"use client";

import { useMemo } from "react";
import { useFirebase } from "./FirebaseProvider";

export function FirebaseStatusBanner() {
  const { status, user, error } = useFirebase();

  const { label, description, tone } = useMemo(() => {
    switch (status) {
      case "initializing":
        return {
          label: "서버 연결 중…",
          description: "서버 연결 상태를 확인하는 중입니다.",
          tone: "info",
        };
      case "ready":
        return user
          ? {
              label: `관리자 모드 활성화 (${user.email ?? "익명"})`,
              description: "데이터를 곧 불러옵니다.",
              tone: "success",
            }
          : {
              label: "로그인 필요",
              description: "관리자 인증 후에 승인 워크플로와 대시보드가 활성화됩니다.",
              tone: "warn",
            };
      case "error":
        return {
          label: "서버 연결 실패",
          description: error?.message ?? "알 수 없는 오류가 발생했습니다.",
          tone: "error",
        };
      default:
        return {
          label: "대기 중",
          description: "초기화 상태를 확인 중입니다.",
          tone: "info",
        };
    }
  }, [status, user, error]);

  const toneClassName = {
    info: "border-sky-200 bg-sky-50 text-sky-800",
    warn: "border-amber-200 bg-amber-50 text-amber-800",
    error: "border-rose-200 bg-rose-50 text-rose-800",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  }[tone];

  return (
    <div className={`border ${toneClassName} px-4 py-3 text-xs sm:text-sm`}>
      <p className="font-semibold">{label}</p>
      <p className="mt-1 text-xs opacity-80 sm:text-sm">{description}</p>
    </div>
  );
}
