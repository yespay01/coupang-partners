import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const AUTOMATION_SERVER_URL =
  process.env.AUTOMATION_SERVER_URL || "http://automation-server:4000";

/**
 * POST /api/settings/sync-template
 * 템플릿의 프롬프트 설정을 시스템 설정에 동기화 (automation-server 프록시)
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("admin_session");

    if (!sessionCookie) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

    if (!body.templateId) {
      return NextResponse.json(
        { error: "템플릿 ID가 필요합니다." },
        { status: 400 }
      );
    }

    // 먼저 settings에서 template 정보 조회
    const settingsRes = await fetch(
      `${AUTOMATION_SERVER_URL}/api/admin/settings`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Cookie: `admin_session=${sessionCookie.value}`,
        },
      }
    );

    if (!settingsRes.ok) {
      return NextResponse.json(
        { error: "설정 조회 실패" },
        { status: settingsRes.status }
      );
    }

    const settingsData = await settingsRes.json();
    const templates = settingsData.data?.prompt?.templates || [];
    const template = templates.find((t: any) => t.id === body.templateId);

    if (!template) {
      return NextResponse.json(
        { error: "템플릿을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 해당 template의 prompt 설정을 시스템 설정에 적용
    // 기존 templates 배열을 유지하면서 prompt 설정만 업데이트
    const updateRes = await fetch(
      `${AUTOMATION_SERVER_URL}/api/admin/settings`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Cookie: `admin_session=${sessionCookie.value}`,
        },
        body: JSON.stringify({
          prompt: {
            templates,
            systemPrompt: template.systemPrompt,
            reviewTemplate: template.reviewTemplate,
            additionalGuidelines: template.additionalGuidelines,
            minLength: template.minLength,
            maxLength: template.maxLength,
            toneScoreThreshold: template.toneScoreThreshold,
          },
        }),
      }
    );

    if (!updateRes.ok) {
      return NextResponse.json(
        { error: "설정 업데이트 실패" },
        { status: updateRes.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: `'${template.name}' 템플릿이 프롬프트 설정에 적용되었습니다.`,
    });
  } catch (error) {
    console.error("템플릿 동기화 실패:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "템플릿 동기화 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
