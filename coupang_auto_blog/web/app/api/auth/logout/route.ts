import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const AUTOMATION_SERVER_URL =
  process.env.AUTOMATION_SERVER_URL || "http://automation-server:4000";

/**
 * POST /api/auth/logout
 * 로그아웃
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("admin_session");

    // automation-server에 로그아웃 요청
    if (sessionCookie) {
      await fetch(`${AUTOMATION_SERVER_URL}/api/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `admin_session=${sessionCookie.value}`,
        },
        credentials: "include",
      });
    }

    // 쿠키 삭제
    const response = NextResponse.json({
      success: true,
      message: "로그아웃 되었습니다."
    });

    response.cookies.delete("admin_session");

    return response;
  } catch (error) {
    console.error("Logout error:", error);

    // 에러가 나도 쿠키는 삭제
    const response = NextResponse.json({
      success: true,
      message: "로그아웃 되었습니다."
    });

    response.cookies.delete("admin_session");

    return response;
  }
}

/**
 * GET /api/auth/logout
 * 로그아웃 (GET 요청도 지원)
 */
export async function GET(request: NextRequest) {
  return POST(request);
}
