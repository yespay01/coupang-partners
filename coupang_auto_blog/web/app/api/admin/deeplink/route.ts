import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const AUTOMATION_SERVER_URL =
  process.env.AUTOMATION_SERVER_URL || "http://automation-server:4000";

export async function POST(request: NextRequest) {
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

    const response = await fetch(
      `${AUTOMATION_SERVER_URL}/api/admin/deeplink`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `admin_session=${sessionCookie.value}`,
        },
        credentials: "include",
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { success: false, error: errorData.message || "딥링크 변환 실패" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Admin deeplink proxy error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
