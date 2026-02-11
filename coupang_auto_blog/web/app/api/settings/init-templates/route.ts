import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { DEFAULT_TEMPLATES } from "@/types/promptTemplate";
import { randomUUID } from "crypto";

const AUTOMATION_SERVER_URL =
  process.env.AUTOMATION_SERVER_URL || "http://automation-server:4000";

/**
 * POST /api/settings/init-templates
 * 기본 프롬프트 템플릿 초기화 → automation-server에 저장
 */
export async function POST() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("admin_session");

    if (!sessionCookie) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const now = new Date().toISOString();
    const templates = DEFAULT_TEMPLATES.map((t) => ({
      ...t,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    }));

    // automation-server에 저장
    const saveResponse = await fetch(
      `${AUTOMATION_SERVER_URL}/api/admin/settings`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Cookie: `admin_session=${sessionCookie.value}`,
        },
        body: JSON.stringify({
          prompt: { templates },
        }),
      }
    );

    if (!saveResponse.ok) {
      const errText = await saveResponse.text();
      console.error("템플릿 저장 실패:", errText);
      return NextResponse.json(
        { error: "템플릿 저장에 실패했습니다." },
        { status: saveResponse.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: "기본 템플릿이 초기화되었습니다.",
      templates,
    });
  } catch (error) {
    console.error("템플릿 초기화 실패:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "템플릿 초기화 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
