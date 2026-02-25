import { NextRequest, NextResponse } from "next/server";

const AUTOMATION_SERVER_URL =
  process.env.AUTOMATION_SERVER_URL || "http://automation-server:4000";

/**
 * Public API: Published 리뷰 조회
 * 인증 없이 접근 가능
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // automation-server의 /api/reviews 호출
    const response = await fetch(
      `${AUTOMATION_SERVER_URL}/api/reviews?${searchParams.toString()}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Public reviews fetch failed:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch reviews" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching published reviews:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch reviews",
      },
      { status: 500 }
    );
  }
}
