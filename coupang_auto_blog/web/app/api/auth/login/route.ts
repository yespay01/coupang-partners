import { NextRequest, NextResponse } from "next/server";

const AUTOMATION_SERVER_URL =
  process.env.AUTOMATION_SERVER_URL || "http://automation-server:4000";

/**
 * POST /api/auth/login
 * 로그인
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(`${AUTOMATION_SERVER_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

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
