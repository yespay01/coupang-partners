import { NextRequest, NextResponse } from "next/server";
import { getPromptTemplate } from "@/lib/firestore";
import { doc, updateDoc } from "firebase/firestore";
import { getFirebaseClients } from "@/lib/firebaseClient";

/**
 * POST /api/settings/sync-template
 * 템플릿의 프롬프트 설정을 system_settings/global에 동기화
 */
export async function POST(request: NextRequest) {
  try {
    const { templateId } = await request.json();

    if (!templateId) {
      return NextResponse.json({ error: "템플릿 ID가 필요합니다." }, { status: 400 });
    }

    // 템플릿 조회
    const template = await getPromptTemplate(templateId);

    if (!template) {
      return NextResponse.json({ error: "템플릿을 찾을 수 없습니다." }, { status: 404 });
    }

    // system_settings/global 업데이트
    const { db } = await getFirebaseClients();
    const settingsRef = doc(db, "system_settings", "global");

    await updateDoc(settingsRef, {
      "prompt.systemPrompt": template.systemPrompt,
      "prompt.reviewTemplate": template.reviewTemplate,
      "prompt.additionalGuidelines": template.additionalGuidelines,
      "prompt.minLength": template.minLength,
      "prompt.maxLength": template.maxLength,
      "prompt.toneScoreThreshold": template.toneScoreThreshold,
      updatedAt: new Date().toISOString(),
      updatedBy: "template-sync",
    });

    return NextResponse.json({
      success: true,
      message: `'${template.name}' 템플릿이 프롬프트 설정에 적용되었습니다.`,
    });
  } catch (error) {
    console.error("템플릿 동기화 실패:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "템플릿 동기화 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
