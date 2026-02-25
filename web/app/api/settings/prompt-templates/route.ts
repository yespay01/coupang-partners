import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const AUTOMATION_SERVER_URL =
  process.env.AUTOMATION_SERVER_URL || "http://automation-server:4000";

async function getSessionCookie() {
  const cookieStore = await cookies();
  return cookieStore.get("admin_session");
}

/** 현재 저장된 템플릿 배열을 가져온다 */
async function fetchCurrentTemplates(cookieValue: string): Promise<any[]> {
  const response = await fetch(
    `${AUTOMATION_SERVER_URL}/api/admin/settings`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Cookie: `admin_session=${cookieValue}`,
      },
    }
  );

  if (!response.ok) return [];
  const data = await response.json();
  return data.data?.prompt?.templates || [];
}

/** 전체 템플릿 배열을 저장한다 */
async function saveTemplates(cookieValue: string, templates: any[]) {
  return fetch(`${AUTOMATION_SERVER_URL}/api/admin/settings`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: `admin_session=${cookieValue}`,
    },
    body: JSON.stringify({
      prompt: { templates },
    }),
  });
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

    const templates = await fetchCurrentTemplates(sessionCookie.value);

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
 * 새 프롬프트 템플릿 생성 (기존 배열에 추가)
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

    // 현재 템플릿 목록을 가져와서 새 템플릿을 추가
    const currentTemplates = await fetchCurrentTemplates(sessionCookie.value);
    const newTemplate = {
      ...input,
      id: `tpl_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updatedTemplates = [...currentTemplates, newTemplate];

    const response = await saveTemplates(sessionCookie.value, updatedTemplates);

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

    // 현재 템플릿 목록을 가져와서 대상 템플릿만 수정
    const currentTemplates = await fetchCurrentTemplates(sessionCookie.value);
    const index = currentTemplates.findIndex((t: any) => t.id === templateId);

    if (index === -1) {
      return NextResponse.json(
        { error: "템플릿을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // isDefault 변경 시: 다른 템플릿의 isDefault를 해제
    if (input.isDefault) {
      for (const t of currentTemplates) {
        t.isDefault = false;
      }
    }

    currentTemplates[index] = {
      ...currentTemplates[index],
      ...input,
      id: templateId,
      updatedAt: new Date().toISOString(),
    };

    const response = await saveTemplates(sessionCookie.value, currentTemplates);

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

    // 현재 템플릿 목록에서 대상 제거
    const currentTemplates = await fetchCurrentTemplates(sessionCookie.value);
    const updatedTemplates = currentTemplates.filter((t: any) => t.id !== templateId);

    if (updatedTemplates.length === currentTemplates.length) {
      return NextResponse.json(
        { error: "템플릿을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const response = await saveTemplates(sessionCookie.value, updatedTemplates);

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
