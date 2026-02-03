import { NextRequest, NextResponse } from "next/server";
import {
  getPromptTemplates,
  getPromptTemplate,
  createPromptTemplate,
  updatePromptTemplate,
  deletePromptTemplate,
} from "@/lib/firestore";
import type { CreatePromptTemplateInput, UpdatePromptTemplateInput } from "@/types/promptTemplate";

/**
 * GET /api/settings/prompt-templates
 * 모든 프롬프트 템플릿 조회
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get("id");

    if (templateId) {
      // 특정 템플릿 조회
      const template = await getPromptTemplate(templateId);
      if (!template) {
        return NextResponse.json({ error: "템플릿을 찾을 수 없습니다." }, { status: 404 });
      }
      return NextResponse.json(template);
    }

    // 모든 템플릿 조회
    const templates = await getPromptTemplates();
    return NextResponse.json(templates);
  } catch (error) {
    console.error("템플릿 조회 실패:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "템플릿 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings/prompt-templates
 * 새 프롬프트 템플릿 생성
 */
export async function POST(request: NextRequest) {
  try {
    const input: CreatePromptTemplateInput = await request.json();

    // 필수 필드 검증
    if (!input.name || !input.systemPrompt || !input.reviewTemplate) {
      return NextResponse.json(
        { error: "필수 필드가 누락되었습니다." },
        { status: 400 }
      );
    }

    const result = await createPromptTemplate(input);

    return NextResponse.json({
      success: true,
      templateId: result.id,
      message: "템플릿이 생성되었습니다.",
    });
  } catch (error) {
    console.error("템플릿 생성 실패:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "템플릿 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/settings/prompt-templates
 * 프롬프트 템플릿 수정
 */
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get("id");

    if (!templateId) {
      return NextResponse.json({ error: "템플릿 ID가 필요합니다." }, { status: 400 });
    }

    const input: UpdatePromptTemplateInput = await request.json();

    await updatePromptTemplate(templateId, input);

    return NextResponse.json({
      success: true,
      message: "템플릿이 수정되었습니다.",
    });
  } catch (error) {
    console.error("템플릿 수정 실패:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "템플릿 수정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/settings/prompt-templates
 * 프롬프트 템플릿 삭제
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get("id");

    if (!templateId) {
      return NextResponse.json({ error: "템플릿 ID가 필요합니다." }, { status: 400 });
    }

    await deletePromptTemplate(templateId);

    return NextResponse.json({
      success: true,
      message: "템플릿이 삭제되었습니다.",
    });
  } catch (error) {
    console.error("템플릿 삭제 실패:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "템플릿 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
