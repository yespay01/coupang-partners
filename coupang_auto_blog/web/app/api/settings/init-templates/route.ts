import { NextResponse } from "next/server";
import { createPromptTemplate, getPromptTemplates } from "@/lib/firestore";
import { DEFAULT_TEMPLATES } from "@/types/promptTemplate";

/**
 * POST /api/settings/init-templates
 * 기본 템플릿 3개를 Firestore에 초기화
 */
export async function POST() {
  try {
    // 이미 템플릿이 있는지 확인
    const existingTemplates = await getPromptTemplates();

    if (existingTemplates.length > 0) {
      return NextResponse.json({
        success: false,
        message: "템플릿이 이미 존재합니다. 초기화를 건너뜁니다.",
        count: existingTemplates.length,
      });
    }

    // 기본 템플릿 3개 생성
    const createdIds: string[] = [];
    for (const template of DEFAULT_TEMPLATES) {
      const result = await createPromptTemplate(template);
      createdIds.push(result.id);
    }

    return NextResponse.json({
      success: true,
      message: "기본 템플릿 3개가 생성되었습니다.",
      templateIds: createdIds,
      templates: DEFAULT_TEMPLATES.map((t) => t.name),
    });
  } catch (error) {
    console.error("템플릿 초기화 실패:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "템플릿 초기화 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
