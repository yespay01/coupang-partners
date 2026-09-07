import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const AUTOMATION_SERVER_URL = process.env.AUTOMATION_SERVER_URL || "http://automation-server:4000";

export async function GET(request: NextRequest) {
  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get("limit")) || 50, 1), 100);
  const offset = Math.min(Math.max(Number(request.nextUrl.searchParams.get("offset")) || 0, 0), 100000);
  try {
    const response = await fetch(`${AUTOMATION_SERVER_URL}/api/products?limit=${limit}&offset=${offset}`, { cache: "no-store" });
    const body = await response.json();
    return NextResponse.json(body, { status: response.status });
  } catch {
    return NextResponse.json({ success: false, message: "상품을 불러오지 못했습니다." }, { status: 502 });
  }
}
