import { NextRequest, NextResponse } from "next/server";

const AUTOMATION_SERVER_URL =
  process.env.AUTOMATION_SERVER_URL || "http://automation-server:4000";

const LOGIN_WINDOW_MS = 10 * 60 * 1000; // 10분
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_BLOCK_MS = 15 * 60 * 1000; // 15분

type LoginAttemptRecord = {
  count: number;
  firstAttemptAt: number;
  blockedUntil?: number;
};

const loginAttempts = new Map<string, LoginAttemptRecord>();

function getClientIdentifier(request: NextRequest, email?: string) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ip = forwardedFor?.split(",")[0]?.trim() || realIp || "unknown";
  const normalizedEmail = (email || "").trim().toLowerCase();
  return normalizedEmail ? `${ip}:${normalizedEmail}` : ip;
}

function getRateLimitState(key: string) {
  const now = Date.now();
  const record = loginAttempts.get(key);
  if (!record) return { allowed: true as const, retryAfterMs: 0 };

  if (record.blockedUntil && record.blockedUntil > now) {
    return { allowed: false as const, retryAfterMs: record.blockedUntil - now };
  }

  if (now - record.firstAttemptAt > LOGIN_WINDOW_MS) {
    loginAttempts.delete(key);
    return { allowed: true as const, retryAfterMs: 0 };
  }

  return { allowed: true as const, retryAfterMs: 0 };
}

function registerFailedAttempt(key: string) {
  const now = Date.now();
  const current = loginAttempts.get(key);

  if (!current || now - current.firstAttemptAt > LOGIN_WINDOW_MS) {
    loginAttempts.set(key, {
      count: 1,
      firstAttemptAt: now,
    });
    return;
  }

  const nextCount = current.count + 1;
  const nextRecord: LoginAttemptRecord = {
    ...current,
    count: nextCount,
  };

  if (nextCount >= LOGIN_MAX_ATTEMPTS) {
    nextRecord.blockedUntil = now + LOGIN_BLOCK_MS;
  }

  loginAttempts.set(key, nextRecord);
}

function clearFailedAttempts(key: string) {
  loginAttempts.delete(key);
}

/**
 * POST /api/auth/login
 * 로그인
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const loginKey = getClientIdentifier(request, body?.email);
    const rateLimit = getRateLimitState(loginKey);

    if (!rateLimit.allowed) {
      const retryAfterSec = Math.ceil(rateLimit.retryAfterMs / 1000);
      return NextResponse.json(
        {
          success: false,
          message: `로그인 시도가 너무 많습니다. ${retryAfterSec}초 후 다시 시도해주세요.`,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfterSec),
          },
        }
      );
    }

    const response = await fetch(`${AUTOMATION_SERVER_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        registerFailedAttempt(loginKey);
      }
      return NextResponse.json(data, { status: response.status });
    }

    clearFailedAttempts(loginKey);

    // 쿠키 설정
    const res = NextResponse.json(data);
    if (data.token) {
      res.cookies.set('admin_session', data.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60, // 24시간
        path: '/',
      });
    }

    return res;
  } catch (error) {
    console.error("로그인 오류:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "로그인 중 오류 발생",
      },
      { status: 500 }
    );
  }
}
