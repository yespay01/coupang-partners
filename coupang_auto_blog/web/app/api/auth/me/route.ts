import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

/**
 * GET /api/auth/me
 * 현재 사용자 정보 조회
 */
export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${API_BASE}/api/auth/me`, {
      headers: {
        Authorization: request.headers.get("Authorization") || "",
        Cookie: request.headers.get("Cookie") || "",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("사용자 정보 조회 오류:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "사용자 정보 조회 중 오류 발생",
      },
      { status: 500 }
    );
  }
}
