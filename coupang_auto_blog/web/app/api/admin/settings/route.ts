import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const AUTOMATION_SERVER_URL =
  process.env.AUTOMATION_SERVER_URL || "http://automation-server:4000";

/**
 * GET /api/admin/settings
 * 시스템 설정 조회 (automation-server로 프록시)
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("admin_session");

    const response = await fetch(`${AUTOMATION_SERVER_URL}/api/admin/settings`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie ? `admin_session=${sessionCookie.value}` : "",
      },
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Settings fetch failed:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch settings" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Settings API error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/settings
 * 시스템 설정 업데이트 (automation-server로 프록시)
 */
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("admin_session");

    if (!sessionCookie) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

    const response = await fetch(`${AUTOMATION_SERVER_URL}/api/admin/settings`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: `admin_session=${sessionCookie.value}`,
      },
      body: JSON.stringify(body),
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Settings update failed:", error);
      return NextResponse.json(
        { success: false, error: "Failed to update settings" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Settings update error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
