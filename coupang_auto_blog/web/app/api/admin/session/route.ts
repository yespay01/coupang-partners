import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { getAdminAuth } from "@/lib/firebaseAdmin";

const ADMIN_COOKIE = "admin_session";
const MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours

type LoginBody = {
  idToken?: string;
  bypass?: boolean;
};

function createErrorResponse(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status });
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();

  let body: LoginBody;
  try {
    body = await request.json();
  } catch {
    return createErrorResponse("잘못된 요청 본문입니다.", 400);
  }

  // Check for bypass request (from login page button or env variable)
  // 프로덕션에서는 bypass 불가
  if (process.env.NODE_ENV !== "production" && (body.bypass === true || process.env.ADMIN_GUARD_BYPASS === "true")) {
    cookieStore.set(ADMIN_COOKIE, "bypass", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: MAX_AGE_SECONDS,
    });
    return NextResponse.json({ success: true, bypass: true });
  }

  if (!body.idToken) {
    return createErrorResponse("idToken이 필요합니다.", 400);
  }

  try {
    const auth = getAdminAuth();

    // ID 토큰 검증
    const decoded = await auth.verifyIdToken(body.idToken, true);

    if (!decoded.admin) {
      return createErrorResponse("관리자 권한이 없습니다.", 403);
    }

    // Firebase Session Cookie 생성 (더 안전)
    const sessionCookie = await auth.createSessionCookie(body.idToken, {
      expiresIn: MAX_AGE_SECONDS * 1000, // milliseconds
    });

    cookieStore.set(ADMIN_COOKIE, sessionCookie, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: MAX_AGE_SECONDS,
    });

    return NextResponse.json({ success: true, uid: decoded.uid });
  } catch (error) {
    return createErrorResponse(
      error instanceof Error ? error.message : "Firebase 토큰 검증 중 오류가 발생했습니다.",
      401,
    );
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE);
  return NextResponse.json({ success: true });
}
