import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const AUTOMATION_SERVER_URL =
  process.env.AUTOMATION_SERVER_URL || "http://automation-server:4000";

/**
 * GET /api/admin/reviews
 * 리뷰 목록 조회
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("admin_session");

    if (!sessionCookie) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);

    // automation-server로 쿼리 파라미터 전달
    const response = await fetch(
      `${AUTOMATION_SERVER_URL}/api/admin/reviews?${searchParams.toString()}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Cookie: `admin_session=${sessionCookie.value}`,
        },
        credentials: "include",
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Reviews fetch failed:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch reviews" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Reviews fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
