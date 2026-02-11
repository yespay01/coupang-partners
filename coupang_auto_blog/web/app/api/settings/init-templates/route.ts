import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { DEFAULT_TEMPLATES } from "@/types/promptTemplate";
import { randomUUID } from "crypto";

/**
 * POST /api/settings/init-templates
 * 기본 프롬프트 템플릿 초기화
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
