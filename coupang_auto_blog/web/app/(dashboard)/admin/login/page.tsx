"use client";

import { Suspense, useEffect, useState, useCallback, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getAuth } from "firebase/auth";
import { useFirebase } from "@/components/FirebaseProvider";

type FormState = {
  email: string;
  password: string;
};

const INITIAL_FORM_STATE: FormState = {
  email: "",
  password: "",
};

type SessionResponseMeta = {
  status: number;
  message: string;
};

function AdminLoginContent() {
  const { status, user, error } = useFirebase();
  const searchParams = useSearchParams();
  const router = useRouter();
  const redirectPath = searchParams.get("redirect") ?? "/admin";
  const [instruction, setInstruction] = useState("Firebase Auth를 통해 관리자 로그인이 필요합니다.");
  const [form, setForm] = useState<FormState>(INITIAL_FORM_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [sessionMeta, setSessionMeta] = useState<SessionResponseMeta | null>(null);

  useEffect(() => {
    if (status === "ready" && user) {
      setInstruction("이미 로그인되어 있습니다. 대시보드로 이동하거나 세션을 갱신하세요.");
    } else if (status === "error") {
      setInstruction("Firebase 초기화에 실패했습니다. 환경변수를 확인하세요.");
    } else {
      setInstruction("Firebase Auth를 통해 관리자 로그인이 필요합니다.");
    }
  }, [status, user]);

  useEffect(() => {
    if (status === "ready" && user && successMessage) {
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

  const requestAdminSession = useCallback(
    async (init: RequestInit & { method: "POST" | "DELETE" }) => {
      let response: Response;
      let payload: Record<string, unknown> = {};

      try {
        response = await fetch("/api/admin/session", {
          credentials: "same-origin",
          ...init,
        });
      } catch (fetchError) {
        const message =
          fetchError instanceof Error ? fetchError.message : "네트워크 오류로 요청에 실패했습니다.";
        setSessionMeta({ status: 0, message });
        throw new Error(message);
      }

      try {
        payload = await response.json();
      } catch {
        payload = {};
      }

      const message =
        typeof payload.message === "string"
          ? payload.message
          : response.ok
            ? "세션이 정상적으로 처리되었습니다."
            : `세션 요청 실패 (HTTP ${response.status})`;

      setSessionMeta({ status: response.status, message });

      if (!response.ok) {
        throw new Error(message);
      }

      return payload;
    },
    [],
  );

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setSubmitError(null);
      setSuccessMessage(null);

      if (status === "error") {
        setSubmitError("Firebase가 준비되지 않았습니다. 관리자에게 문의하세요.");
        return;
      }

      setIsSubmitting(true);

      try {
        const auth = getAuth();
        const credential = await signInWithEmailAndPassword(auth, form.email, form.password);
        const idToken = await credential.user.getIdToken(true);

        await requestAdminSession({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });

        setSuccessMessage("관리자 세션이 발급되었습니다. 잠시 후 대시보드로 이동합니다.");
        setForm(INITIAL_FORM_STATE);
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : "로그인 중 오류가 발생했습니다.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [form.email, form.password, requestAdminSession, status],
  );

  const handleBypassLogin = useCallback(async () => {
    setSubmitError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      await requestAdminSession({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bypass: true }),
      });
      setSuccessMessage("바이패스 세션이 발급되었습니다. 잠시 후 이동합니다.");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "바이패스 세션 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }, [requestAdminSession]);

  const handleLogout = useCallback(async () => {
    setSubmitError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const auth = getAuth();
      await signOut(auth);
      await requestAdminSession({ method: "DELETE" });
      setSuccessMessage("로그아웃되었습니다.");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "로그아웃 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }, [requestAdminSession]);

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
            disabled={isSubmitting || status !== "ready"}
          >
            {isSubmitting ? "로그인 처리 중..." : "로그인"}
          </button>
        </form>

        <div className="mt-4 flex flex-col gap-2 text-xs text-slate-300">
          <button
            type="button"
            onClick={handleBypassLogin}
            className="rounded-full border border-slate-700 px-4 py-2 font-semibold text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSubmitting}
          >
            로컬 개발용 세션 발급 (ADMIN_GUARD_BYPASS)
          </button>
          {user ? (
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full border border-rose-200 px-4 py-2 font-semibold text-rose-300 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSubmitting}
            >
              Firebase 로그아웃
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

        {sessionMeta ? (
          <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-800/70 px-4 py-4 text-xs text-slate-300">
            <p className="font-semibold text-slate-100">세션 요청 상태</p>
            <p className="mt-1">
              최근 응답:{" "}
              {sessionMeta.status > 0 ? `HTTP ${sessionMeta.status}` : "네트워크 오류 또는 응답 없음"}
            </p>
            <p className="mt-1 text-slate-200">{sessionMeta.message}</p>
            {sessionMeta.status === 400 ? (
              <ul className="mt-3 list-disc space-y-1 pl-4 text-[11px] text-slate-400">
                <li>Firebase Auth 계정이 생성되었고 이메일/비밀번호가 올바른지 확인하세요.</li>
                <li>Custom Claim `admin=true` 설정 여부 및 `npm run set-admin -- --email you@example.com` 실행 이력을 확인하세요.</li>
                <li>로컬 개발이라면 `.env.local`에 `ADMIN_GUARD_BYPASS=true`를 선언한 뒤 서버를 재시작하세요.</li>
              </ul>
            ) : null}
            {sessionMeta.status === 403 ? (
              <p className="mt-3 text-[11px] text-amber-300">
                관리자 권한이 없는 계정입니다. Firebase Functions 폴더에서 `npm run set-admin` 명령으로 커스텀 클레임을 부여한 뒤 다시 로그인하세요.
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-800/70 px-4 py-4 text-xs text-slate-300">
          <p className="font-semibold text-slate-200">운영 체크리스트</p>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            <li>Firebase Authentication에서 허용된 관리자 계정을 등록합니다.</li>
            <li>ID 토큰에 custom claim `admin=true` 를 설정해야 합니다.</li>
            <li>Prod 환경에서는 `.env`에 Admin SDK 키를 반드시 설정하세요.</li>
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
