import { NextRequest, NextResponse } from "next/server";

const AUTOMATION_SERVER_URL =
  process.env.AUTOMATION_SERVER_URL || "http://automation-server:4000";

function getDeviceType(userAgent: string): string {
  if (/tablet|ipad|playbook|silk/i.test(userAgent)) return "tablet";
  if (
    /mobile|android|iphone|ipod|blackberry|opera mini|iemobile|wpdesktop/i.test(
      userAgent
    )
  )
    return "mobile";
  return "desktop";
}

function getReferrerDomain(referrer: string | null): string | null {
  if (!referrer) return null;
  try {
    return new URL(referrer).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * POST /api/track/click
 * 쿠팡 링크 클릭 트래킹 (인증 불필요)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const forwarded = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");
    const ip = forwarded?.split(",")[0]?.trim() || realIp || null;

    const userAgent = request.headers.get("user-agent") || "";
    if (/bot|crawler|spider|crawling/i.test(userAgent)) {
      return NextResponse.json({ success: true, tracked: false });
    }

    const response = await fetch(`${AUTOMATION_SERVER_URL}/api/track/click`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...body,
        referrer_domain:
          body.referrer_domain || getReferrerDomain(body.referrer || null),
        device_type: body.device_type || getDeviceType(userAgent),
        ip_address: ip,
      }),
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    // 트래킹 실패는 조용히 처리
    return NextResponse.json({ success: false });
  }
}
