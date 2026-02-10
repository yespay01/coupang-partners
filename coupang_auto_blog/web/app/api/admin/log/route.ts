import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/admin/log
 * 로그 기록 (현재 스텁 - 필요시 구현)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("Log:", body);

    // TODO: automation-server에 로그 저장 API 추가 필요
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Log API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to log" },
      { status: 500 }
    );
  }
}
