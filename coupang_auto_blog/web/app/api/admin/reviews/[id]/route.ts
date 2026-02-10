import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const AUTOMATION_SERVER_URL =
  process.env.AUTOMATION_SERVER_URL || "http://automation-server:4000";

/**
 * GET /api/admin/reviews/[id]
 * 리뷰 개별 조회
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("admin_session");

    const response = await fetch(
      `${AUTOMATION_SERVER_URL}/api/admin/reviews/${id}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Cookie: sessionCookie ? `admin_session=${sessionCookie.value}` : "",
        },
        credentials: "include",
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Review fetch failed:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch review" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Review API error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/reviews/[id]
 * 리뷰 수정 (내용 및 상태 변경)
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
      console.error("Review update failed:", error);
      return NextResponse.json(
        { success: false, error: "Failed to update review" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Review update error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/reviews/[id]
 * 리뷰 삭제
 */
export async function DELETE(
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

    const response = await fetch(
      `${AUTOMATION_SERVER_URL}/api/admin/reviews/${id}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Cookie: `admin_session=${sessionCookie.value}`,
        },
        credentials: "include",
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Review delete failed:", error);
      return NextResponse.json(
        { success: false, error: "Failed to delete review" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Review delete error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
