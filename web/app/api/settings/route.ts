import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const AUTOMATION_SERVER_URL =
  process.env.AUTOMATION_SERVER_URL || "http://automation-server:4000";

/**
 * GET /api/settings
 * 시스템 설정 조회 (automation-server 프록시)
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("admin_session");

    if (!sessionCookie) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const response = await fetch(
      `${AUTOMATION_SERVER_URL}/api/admin/settings`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Cookie: `admin_session=${sessionCookie.value}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("설정 조회 실패:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "설정 조회 실패",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings
 * 시스템 설정 업데이트 (automation-server 프록시)
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("admin_session");

    if (!sessionCookie) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

    const response = await fetch(
      `${AUTOMATION_SERVER_URL}/api/admin/settings`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Cookie: `admin_session=${sessionCookie.value}`,
        },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("설정 저장 실패:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "설정 저장 실패",
      },
      { status: 500 }
    );
  }
}
