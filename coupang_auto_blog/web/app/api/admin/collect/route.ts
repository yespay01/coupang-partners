import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const AUTOMATION_SERVER_URL =
  process.env.AUTOMATION_SERVER_URL || "http://automation-server:4000";

/**
 * 수동 상품 수집 API
 * POST /api/admin/collect
 * automation-server의 /api/collect/manual로 프록시
 */
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

    // automation-server의 manual collect endpoint로 프록시
    const response = await fetch(`${AUTOMATION_SERVER_URL}/api/collect/manual`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `admin_session=${sessionCookie.value}`,
      },
      credentials: "include",
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("수집 오류:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "수집 중 오류 발생",
      },
      { status: 500 }
    );
  }
}

/**
 * 수집 상태 조회
 * GET /api/admin/collect
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

    // automation-server로부터 수집 상태 조회
    const response = await fetch(`${AUTOMATION_SERVER_URL}/api/admin/products?limit=10`, {
      headers: {
        "Content-Type": "application/json",
        Cookie: `admin_session=${sessionCookie.value}`,
      },
      credentials: "include",
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("조회 오류:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "조회 중 오류 발생",
      },
      { status: 500 }
    );
  }
}
