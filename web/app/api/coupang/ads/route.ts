import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const API_BASE_URL = "https://api-gateway.coupang.com";

/**
 * 현재 시간을 쿠팡 API 형식으로 포맷 (YYMMDDTHHMMSSz - 2자리 연도)
 */
function formatDatetime(): string {
  const now = new Date();
  const year = String(now.getUTCFullYear()).slice(-2);
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  const hours = String(now.getUTCHours()).padStart(2, "0");
  const minutes = String(now.getUTCMinutes()).padStart(2, "0");
  const seconds = String(now.getUTCSeconds()).padStart(2, "0");
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * HMAC-SHA256 서명 생성
 */
function generateSignature(
  method: string,
  url: string,
  secretKey: string,
  datetime: string
): string {
  const parts = url.split("?");
  const [path, query = ""] = parts;
  const message = datetime + method + path + query;
  return crypto.createHmac("sha256", secretKey).update(message).digest("hex");
}

/**
 * Authorization 헤더 생성
 */
function createAuthHeader(
  method: string,
  url: string,
  accessKey: string,
  secretKey: string
): Record<string, string> {
  const datetime = formatDatetime();
  const signature = generateSignature(method, url, secretKey, datetime);
  return {
    Authorization: `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${datetime}, signature=${signature}`,
    "Content-Type": "application/json",
  };
}

interface AdsRequest {
  accessKey: string;
  secretKey: string;
  endpoint: "impression-click" | "orders" | "cancels" | "performance" | "commission";
  startDate: string;
  endDate: string;
}

/**
 * POST /api/coupang/ads
 * 광고 배너 리포트 조회
 */
export async function POST(request: NextRequest) {
  try {
    const body: AdsRequest = await request.json();
    const { accessKey, secretKey, endpoint, startDate, endDate } = body;

    if (!accessKey || !secretKey) {
      return NextResponse.json(
        { success: false, message: "API 키가 필요합니다." },
        { status: 400 }
      );
    }

    if (!endpoint || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, message: "endpoint, startDate, endDate가 필요합니다." },
        { status: 400 }
      );
    }

    const queryParams = new URLSearchParams({
      startDate,
      endDate,
    });

    const path = `/v2/providers/affiliate_open_api/apis/openapi/v1/reports/ads/${endpoint}?${queryParams.toString()}`;
    const headers = createAuthHeader("GET", path, accessKey, secretKey);

    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Coupang Ads API Error (${endpoint}):`, response.status, errorText);
      return NextResponse.json(
        {
          success: false,
          message: `쿠팡 광고 API 호출 실패 (${endpoint})`,
          status: response.status,
          details: errorText,
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (data.rCode !== "0") {
      return NextResponse.json(
        {
          success: false,
          message: `쿠팡 광고 API 에러: ${data.rMessage}`,
          rCode: data.rCode,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data.data || [],
    });
  } catch (error) {
    console.error("Coupang Ads API route error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "광고 리포트 조회 중 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
