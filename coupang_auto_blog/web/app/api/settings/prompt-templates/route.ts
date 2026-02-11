import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const AUTOMATION_SERVER_URL =
  process.env.AUTOMATION_SERVER_URL || "http://automation-server:4000";

async function getSessionCookie() {
  const cookieStore = await cookies();
  return cookieStore.get("admin_session");
}

/**
 * GET /api/settings/prompt-templates
 * 프롬프트 템플릿 조회 (settings의 templates 필드)
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = await getSessionCookie();

    if (!sessionCookie) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const response = await fetch(
      `${AUTOMATION_SERVER_URL}/api/admin/settings`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Cookie: `admin_session=${sessionCookie.value}`,
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "설정 조회 실패" },
        { status: response.status }
      );
    }

    const data = await response.json();
    const templates = data.data?.prompt?.templates || [];

    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get("id");

    if (templateId) {
      const template = templates.find((t: any) => t.id === templateId);
      if (!template) {
        return NextResponse.json(
          { error: "템플릿을 찾을 수 없습니다." },
          { status: 404 }
        );
      }
      return NextResponse.json(template);
    }

    return NextResponse.json(templates);
  } catch (error) {
    console.error("템플릿 조회 실패:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "템플릿 조회 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings/prompt-templates
 * 새 프롬프트 템플릿 생성 (settings에 저장)
 */
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = await getSessionCookie();

    if (!sessionCookie) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const input = await request.json();

    if (!input.name || !input.systemPrompt || !input.reviewTemplate) {
      return NextResponse.json(
        { error: "필수 필드가 누락되었습니다." },
        { status: 400 }
      );
    }

    // settings에 template 추가
    const response = await fetch(
      `${AUTOMATION_SERVER_URL}/api/admin/settings`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Cookie: `admin_session=${sessionCookie.value}`,
        },
        body: JSON.stringify({
          prompt: {
            templates: [{ ...input, id: `tpl_${Date.now()}` }],
          },
        }),
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "템플릿 저장 실패" },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: "템플릿이 생성되었습니다.",
    });
  } catch (error) {
    console.error("템플릿 생성 실패:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "템플릿 생성 중 오류가 발생했습니다.",
      },
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
    const sessionCookie = await getSessionCookie();

    if (!sessionCookie) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get("id");

    if (!templateId) {
      return NextResponse.json(
        { error: "템플릿 ID가 필요합니다." },
        { status: 400 }
      );
    }

    const input = await request.json();

    const response = await fetch(
      `${AUTOMATION_SERVER_URL}/api/admin/settings`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Cookie: `admin_session=${sessionCookie.value}`,
        },
        body: JSON.stringify({
          prompt: {
            templates: [{ ...input, id: templateId }],
          },
        }),
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "템플릿 수정 실패" },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: "템플릿이 수정되었습니다.",
    });
  } catch (error) {
    console.error("템플릿 수정 실패:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "템플릿 수정 중 오류가 발생했습니다.",
      },
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
    const sessionCookie = await getSessionCookie();

    if (!sessionCookie) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get("id");

    if (!templateId) {
      return NextResponse.json(
        { error: "템플릿 ID가 필요합니다." },
        { status: 400 }
      );
    }

    // settings에서 해당 template 제거를 위해 현재 settings 조회 후 업데이트
    const response = await fetch(
      `${AUTOMATION_SERVER_URL}/api/admin/settings`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Cookie: `admin_session=${sessionCookie.value}`,
        },
        body: JSON.stringify({
          prompt: {
            deleteTemplateId: templateId,
          },
        }),
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "템플릿 삭제 실패" },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: "템플릿이 삭제되었습니다.",
    });
  } catch (error) {
    console.error("템플릿 삭제 실패:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "템플릿 삭제 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
