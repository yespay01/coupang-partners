import { NextRequest, NextResponse } from "next/server";

// 서버 사이드에서는 Docker 네트워크 내부 URL 사용
const API_BASE = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

/**
 * 수동 상품 수집 API
 * POST /api/admin/collect
 * automation-server의 /api/collect/manual로 프록시
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // automation-server의 manual collect endpoint로 프록시
    const response = await fetch(`${API_BASE}/api/collect/manual`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: request.headers.get("Authorization") || "",
      },
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
    // automation-server로부터 수집 상태 조회
    const response = await fetch(`${API_BASE}/api/admin/products?limit=10`, {
      headers: {
        Authorization: request.headers.get("Authorization") || "",
      },
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
