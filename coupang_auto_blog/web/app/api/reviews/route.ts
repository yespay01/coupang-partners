import { NextRequest, NextResponse } from "next/server";

/**
 * Public API: Published 리뷰 조회
 * 인증 없이 접근 가능
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "12", 10);
    const status = searchParams.get("statuses") || "published";

    // published 상태의 리뷰만 허용
    if (status !== "published") {
      return NextResponse.json(
        { success: false, error: "Only published reviews are available" },
        { status: 403 }
      );
    }

    // TODO: 실제 데이터베이스나 automation-server에서 리뷰 가져오기
    // 지금은 빈 배열 반환
    const reviews: any[] = [];

    return NextResponse.json({
      success: true,
      data: {
        reviews,
        totalCount: reviews.length,
        hasMore: false,
      },
    });
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
