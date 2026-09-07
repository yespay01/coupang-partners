import { randomUUID } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";

const ANONYMOUS_COOKIE = "semolink_aid";
const SESSION_COOKIE = "semolink_sid";
const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type AnalyticsIdentity = {
  anonymousId: string;
  sessionId: string;
  refreshAnonymousCookie: boolean;
  refreshSessionCookie: boolean;
};

export function getAnalyticsIdentity(request: NextRequest): AnalyticsIdentity {
  const anonymousCookie = request.cookies.get(ANONYMOUS_COOKIE)?.value;
  const sessionCookie = request.cookies.get(SESSION_COOKIE)?.value;
  const validAnonymous = Boolean(
    anonymousCookie && UUID_V4_PATTERN.test(anonymousCookie)
  );
  const validSession = Boolean(sessionCookie && UUID_V4_PATTERN.test(sessionCookie));

  return {
    anonymousId: validAnonymous ? anonymousCookie! : randomUUID(),
    sessionId: validSession ? sessionCookie! : randomUUID(),
    refreshAnonymousCookie: !validAnonymous,
    // 유효한 세션도 활동 시마다 30분으로 연장한다.
    refreshSessionCookie: true,
  };
}

export function applyAnalyticsCookies(
  response: NextResponse,
  identity: AnalyticsIdentity
): void {
  const secure = process.env.NODE_ENV === "production";

  if (identity.refreshAnonymousCookie) {
    response.cookies.set(ANONYMOUS_COOKIE, identity.anonymousId, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  if (identity.refreshSessionCookie) {
    response.cookies.set(SESSION_COOKIE, identity.sessionId, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 30,
    });
  }
}

export function analyticsIdentityHeaders(
  identity: AnalyticsIdentity,
  userAgent = ""
): Record<string, string> {
  const safeUserAgent = userAgent.slice(0, 512);
  const deviceType = /tablet|ipad|playbook|silk/i.test(safeUserAgent)
    ? "tablet"
    : /mobile|android|iphone|ipod|blackberry|opera mini|iemobile|wpdesktop/i.test(
          safeUserAgent
        )
      ? "mobile"
      : "desktop";

  return {
    "x-semolink-anonymous-id": identity.anonymousId,
    "x-semolink-session-id": identity.sessionId,
    "x-semolink-user-agent": safeUserAgent,
    "x-semolink-device-type": deviceType,
  };
}
