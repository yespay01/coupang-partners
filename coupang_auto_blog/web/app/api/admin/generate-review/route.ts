import { NextRequest, NextResponse } from "next/server";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/lib/firebase";

/**
 * POST /api/admin/generate-review
 * 상품 리뷰를 수동으로 생성/재시도
 */
export async function POST(request: NextRequest) {
  try {
    const { productId } = await request.json();

    if (!productId) {
      return NextResponse.json(
        { success: false, message: "productId가 필요합니다." },
        { status: 400 }
      );
    }

    // Functions 호출
    const functions = getFunctions(app, "asia-northeast3");
    const manualGenerateReview = httpsCallable(functions, "manualGenerateReview");

    const result = await manualGenerateReview({ productId });

    return NextResponse.json({
      success: true,
      message: (result.data as any).message || "리뷰가 생성되었습니다.",
    });
  } catch (error: any) {
    console.error("리뷰 생성 오류:", error);

    // Firebase Functions 에러 처리
    const message = error?.message || "리뷰 생성 실패";
    const code = error?.code || "internal";

    return NextResponse.json(
      { success: false, message: `[${code}] ${message}` },
      { status: 500 }
    );
  }
}
