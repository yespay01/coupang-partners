import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * DELETE /api/admin/files?path=...
 * 파일 삭제 (현재 스텁 - 필요시 구현)
 */
export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("admin_session");

    if (!sessionCookie) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path");

    if (!path) {
      return NextResponse.json(
        { success: false, error: "Path parameter required" },
        { status: 400 }
      );
    }

    console.log("Delete file:", path);

    // TODO: MinIO 또는 파일 시스템에서 파일 삭제 구현 필요
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("File delete error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete file" },
      { status: 500 }
    );
  }
}
