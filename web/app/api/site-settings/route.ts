import { NextResponse } from "next/server";

export const revalidate = 60;

const AUTOMATION_SERVER_URL =
  process.env.AUTOMATION_SERVER_URL || "http://automation-server:4000";

export async function GET() {
  try {
    const response = await fetch(`${AUTOMATION_SERVER_URL}/api/public/site-settings`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      next: { revalidate },
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: true, data: {} },
        { status: 200 }
      );
    }

    const payload = await response.json().catch(() => ({ success: true, data: {} }));
    const site = payload?.data && typeof payload.data === "object" ? payload.data : {};

    return NextResponse.json({ success: true, data: site });
  } catch (error) {
    console.error("site-settings 조회 실패:", error);
    return NextResponse.json({ success: true, data: {} }, { status: 200 });
  }
}
