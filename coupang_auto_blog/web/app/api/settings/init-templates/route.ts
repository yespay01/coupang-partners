import { NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * POST /api/settings/init-templates
 * 기본 템플릿 초기화 (스텁 - settings에 포함됨)
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

    return NextResponse.json({
      success: true,
      message: "템플릿은 settings에 포함되어 있습니다.",
      templates: [],
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
