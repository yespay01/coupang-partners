import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // automation-server의 test endpoint로 프록시
    const testRes = await fetch(`${API_BASE}/api/collect/test`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: request.headers.get("Authorization") || "",
      },
      body: JSON.stringify(body),
    });

    const data = await testRes.json();

    if (!testRes.ok) {
      return NextResponse.json(data, { status: testRes.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("수집 테스트 오류:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "수집 중 오류 발생",
      },
      { status: 500 }
    );
  }
}
