import { NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * POST /api/admin/stop-retry
 * 재시도 큐 중단 (Firebase 개념 - PostgreSQL에서는 불필요)
 * 호환성을 위해 빈 성공 응답 반환
 */
export async function POST() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("admin_session");

    if (!sessionCookie) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "재시도 큐가 비어있습니다. (PostgreSQL 환경에서는 불필요)",
      deletedCount: 0,
    });
  } catch (error) {
    console.error("재시도 중단 실패:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "재시도 중단 실패",
      },
      { status: 500 }
    );
  }
}
