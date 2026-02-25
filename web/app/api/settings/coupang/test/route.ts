import { NextResponse, type NextRequest } from "next/server";
import crypto from "crypto";

type CoupangTestRequest = {
  accessKey: string;
  secretKey: string;
  partnerId: string;
};

/**
 * 현재 시간을 쿠팡 API 형식으로 포맷 (YYMMDDTHHMMSSz - 2자리 연도)
 */
function formatDatetime(): string {
  const now = new Date();
  const year = String(now.getUTCFullYear()).slice(-2); // 2자리 연도
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  const hours = String(now.getUTCHours()).padStart(2, "0");
  const minutes = String(now.getUTCMinutes()).padStart(2, "0");
  const seconds = String(now.getUTCSeconds()).padStart(2, "0");
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * 쿠팡 API HMAC 서명 생성
 * message = datetime + method + path + query (? 제외)
 */
function generateHmacSignature(
  method: string,
  url: string,
  secretKey: string,
  datetime: string
): string {
  // URL에서 path와 query 분리
  const parts = url.split("?");
  const [path, query = ""] = parts;
  // message 구성: datetime + method + path + query (? 없이 붙임)
  const message = datetime + method + path + query;
  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(message)
    .digest("hex");
  return signature;
}

/**
 * 쿠팡 파트너스 API 연결 테스트
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CoupangTestRequest;
    const { accessKey, secretKey, partnerId } = body;

    // 필수 파라미터 검증
    if (!accessKey || !secretKey || !partnerId) {
      return NextResponse.json(
        {
          success: false,
          message: "Access Key, Secret Key, Partner ID는 필수입니다.",
        },
        { status: 400 }
      );
    }

    // API 테스트를 위한 딥링크 API 호출
    const datetime = formatDatetime();

    // 딥링크 API로 테스트 (공식 문서 엔드포인트: v1 포함)
    const apiPath = `/v2/providers/affiliate_open_api/apis/openapi/v1/deeplink`;
    const testUrl = "https://www.coupang.com";

    // HMAC 서명 생성 (URL에 쿼리 파라미터 없이)
    const signature = generateHmacSignature("POST", apiPath, secretKey, datetime);
    const authorization = `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${datetime}, signature=${signature}`;

    // 실제 API 호출 (타임아웃 5초)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(
        `https://api-gateway.coupang.com${apiPath}`,
        {
          method: "POST",
          headers: {
            Authorization: authorization,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            coupangUrls: [testUrl],
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();

        // 응답 분석
        if (data.rCode === 0 || data.data) {
          return NextResponse.json({
            success: true,
            message: "쿠팡 API 연결이 정상적으로 확인되었습니다.",
            apiEnabled: true,
          });
        }

        // API 비활성화 상태 (판매 금액 미달)
        if (data.rCode === -1 && data.rMessage?.includes("15만원")) {
          return NextResponse.json({
            success: false,
            message: "API가 비활성화 상태입니다. 판매 총 금액 15만원 이상이 필요합니다.",
            apiEnabled: false,
          });
        }

        return NextResponse.json({
          success: false,
          message: data.rMessage || "API 응답을 확인할 수 없습니다.",
          apiEnabled: false,
        });
      }

      // HTTP 오류 응답
      if (response.status === 401) {
        return NextResponse.json({
          success: false,
          message: "인증 실패: Access Key 또는 Secret Key가 올바르지 않습니다.",
        });
      }

      if (response.status === 403) {
        return NextResponse.json({
          success: false,
          message: "권한 없음: API 접근 권한을 확인해주세요.",
        });
      }

      return NextResponse.json({
        success: false,
        message: `API 오류: HTTP ${response.status}`,
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        return NextResponse.json({
          success: false,
          message: "연결 시간 초과: 쿠팡 API 서버 응답이 없습니다.",
        });
      }

      throw fetchError;
    }
  } catch (error) {
    console.error("[Coupang Test API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "알 수 없는 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
