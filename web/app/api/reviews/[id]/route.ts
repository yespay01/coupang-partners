import { NextRequest, NextResponse } from "next/server";

const AUTOMATION_SERVER_URL =
  process.env.AUTOMATION_SERVER_URL || "http://automation-server:4000";

/**
 * GET /api/reviews/[id]
 * 공개 리뷰 상세 조회 (인증 불필요)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const response = await fetch(
      `${AUTOMATION_SERVER_URL}/api/reviews/id/${id}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Public review fetch failed:", error);
      return NextResponse.json(
        { success: false, error: "리뷰를 찾을 수 없습니다." },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Public review API error:", error);
    return NextResponse.json(
      { success: false, error: "리뷰를 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
