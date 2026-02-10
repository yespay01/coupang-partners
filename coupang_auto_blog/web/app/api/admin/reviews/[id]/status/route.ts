import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const AUTOMATION_SERVER_URL =
  process.env.AUTOMATION_SERVER_URL || "http://automation-server:4000";

/**
 * PUT /api/admin/reviews/[id]/status
 * 리뷰 상태 변경 (published, draft, rejected 등)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("admin_session");

    if (!sessionCookie) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

    // automation-server의 PUT /reviews/:id API를 사용
    // status를 포함한 전체 업데이트로 처리
    const response = await fetch(
      `${AUTOMATION_SERVER_URL}/api/admin/reviews/${id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Cookie: `admin_session=${sessionCookie.value}`,
        },
        body: JSON.stringify(body),
        credentials: "include",
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Review status update failed:", error);
      return NextResponse.json(
        { success: false, error: "Failed to update review status" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Review status update error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
