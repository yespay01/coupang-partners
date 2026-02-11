import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const AUTOMATION_SERVER_URL =
  process.env.AUTOMATION_SERVER_URL || "http://automation-server:4000";

/**
 * POST /api/admin/generate-review
 * 상품 리뷰를 수동으로 생성/재시도 (automation-server 프록시)
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

    if (!body.productId) {
      return NextResponse.json(
        { success: false, message: "productId가 필요합니다." },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${AUTOMATION_SERVER_URL}/api/review/generate`,
      {
        method: "POST",
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
    console.error("리뷰 생성 오류:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "리뷰 생성 실패",
      },
      { status: 500 }
    );
  }
}
