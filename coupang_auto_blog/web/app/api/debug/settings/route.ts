import { NextResponse } from "next/server";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * GET /api/debug/settings
 * Firestore에 실제로 저장된 설정 확인 (디버깅용)
 */
export async function GET() {
  try {
    const docRef = doc(db, "system_settings", "global");
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return NextResponse.json({
        success: false,
        message: "설정 문서가 존재하지 않습니다.",
      });
    }

    const data = docSnap.data();

    return NextResponse.json({
      success: true,
      data: {
        ai: data.ai,
        prompt: data.prompt,
        googleModel: data.ai?.google?.model,
        defaultProvider: data.ai?.defaultProvider,
        updatedAt: data.updatedAt,
        updatedBy: data.updatedBy,
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: error?.message || "조회 실패",
    }, { status: 500 });
  }
}
