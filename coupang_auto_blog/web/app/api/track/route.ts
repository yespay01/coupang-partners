import { NextRequest, NextResponse } from "next/server";

const AUTOMATION_SERVER_URL =
  process.env.AUTOMATION_SERVER_URL || "http://automation-server:4000";

/**
 * POST /api/track
 * 방문자 접속 로그 트래킹 (인증 불필요)
 * Next.js에서 IP를 추출하여 automation-server로 프록시
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // IP 추출 (Docker Nginx 환경: X-Forwarded-For 우선)
    const forwarded = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");
    const ip = forwarded?.split(",")[0]?.trim() || realIp || null;

    // Bot 필터링 (Next.js 레벨에서 1차)
    const userAgent = request.headers.get("user-agent") || "";
    if (/bot|crawler|spider|crawling/i.test(userAgent)) {
      return NextResponse.json({ success: true, tracked: false });
    }

    const response = await fetch(`${AUTOMATION_SERVER_URL}/api/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, ip_address: ip }),
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    // 트래킹 실패는 조용히 처리
    return NextResponse.json({ success: false });
  }
}
