"use client";

import { Suspense, useEffect, useState, useCallback, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

type FormState = {
  email: string;
  password: string;
};

const INITIAL_FORM_STATE: FormState = {
  email: "",
  password: "",
};

function AdminLoginContent() {
  const { status, user, error, login, logout } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const redirectPath = searchParams.get("redirect") ?? "/admin";
  const [instruction, setInstruction] = useState("JWT 인증을 통해 관리자 로그인이 필요합니다.");
  const [form, setForm] = useState<FormState>(INITIAL_FORM_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated" && user) {
      setInstruction("이미 로그인되어 있습니다. 대시보드로 이동하거나 로그아웃하세요.");
    } else if (status === "error") {
      setInstruction("인증 시스템에 문제가 발생했습니다. 관리자에게 문의하세요.");
    } else {
      setInstruction("JWT 인증을 통해 관리자 로그인이 필요합니다.");
    }
  }, [status, user]);

  useEffect(() => {
    if (status === "authenticated" && user && successMessage) {
      const timeout = setTimeout(() => {
        router.replace(redirectPath);
      }, 1200);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [status, user, successMessage, router, redirectPath]);

  const handleInputChange = useCallback((field: keyof FormState) => {
    return (event: ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
    };
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setSubmitError(null);
      setSuccessMessage(null);

      if (status === "error") {
        setSubmitError("인증 시스템이 준비되지 않았습니다. 관리자에게 문의하세요.");
        return;
      }

      setIsSubmitting(true);

      try {
        await login(form.email, form.password);
        setSuccessMessage("로그인 성공! 잠시 후 대시보드로 이동합니다.");
        setForm(INITIAL_FORM_STATE);
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : "로그인 중 오류가 발생했습니다.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [form.email, form.password, login, status],
  );

  const handleLogout = useCallback(async () => {
    setSubmitError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      logout();
      setSuccessMessage("로그아웃되었습니다.");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "로그아웃 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }, [logout]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/80 p-8 text-slate-100 shadow-2xl backdrop-blur">
        <h1 className="text-2xl font-bold text-white">관리자 로그인</h1>
        <p className="mt-2 text-sm text-slate-300">{instruction}</p>
        {error ? (
          <p className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-600">
            {error.message}
          </p>
        ) : null}

        <form className="mt-6 space-y-4 text-sm" onSubmit={handleSubmit}>
          <label className="block text-slate-200">
            <span className="text-xs uppercase tracking-wide text-slate-400">이메일</span>
            <input
              type="email"
              required
              value={form.email}
              onChange={handleInputChange("email")}
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/40"
              placeholder="admin@example.com"
              autoComplete="email"
            />
          </label>
          <label className="block text-slate-200">
            <span className="text-xs uppercase tracking-wide text-slate-400">비밀번호</span>
            <input
              type="password"
              required
              value={form.password}
              onChange={handleInputChange("password")}
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/40"
              placeholder="********"
              autoComplete="current-password"
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSubmitting || (status !== "authenticated" && status !== "unauthenticated")}
          >
            {isSubmitting ? "로그인 처리 중..." : "로그인"}
          </button>
        </form>

        <div className="mt-4 flex flex-col gap-2 text-xs text-slate-300">
          {user ? (
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full border border-rose-200 px-4 py-2 font-semibold text-rose-300 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSubmitting}
            >
              로그아웃
            </button>
          ) : null}
        </div>

        {submitError ? (
          <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-600">
            {submitError}
          </p>
        ) : null}

        {successMessage ? (
          <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs text-emerald-600">
            {successMessage}
          </p>
        ) : null}

        <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-800/70 px-4 py-4 text-xs text-slate-300">
          <p className="font-semibold text-slate-200">운영 체크리스트</p>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            <li>PostgreSQL 데이터베이스에 관리자 계정을 등록합니다.</li>
            <li>JWT 토큰 기반 인증을 사용합니다.</li>
            <li>`.env`에 JWT_SECRET을 반드시 설정하세요.</li>
          </ul>
        </div>

        <div className="mt-8 flex flex-col gap-3 text-sm">
          <Link
            href={redirectPath}
            className="inline-flex w-full items-center justify-center rounded-full bg-slate-100 px-4 py-2 font-semibold text-slate-900 transition hover:bg-white"
          >
            대시보드로 이동
          </Link>
          <Link
            href="/"
            className="inline-flex w-full items-center justify-center rounded-full border border-slate-700 px-4 py-2 font-semibold text-slate-200 transition hover:bg-slate-800"
          >
            메인으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}

function LoginPageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/80 p-8 text-slate-100 shadow-2xl backdrop-blur">
        <h1 className="text-2xl font-bold text-white">관리자 로그인</h1>
        <p className="mt-2 text-sm text-slate-300">로딩 중...</p>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <AdminLoginContent />
    </Suspense>
  );
}
