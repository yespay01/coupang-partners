import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import type {
  CoupangClickResponse,
  CoupangOrderResponse,
  CoupangCancelResponse,
  CoupangCommissionResponse,
} from "@/types/settings";

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

type CoupangReportResponse =
  | CoupangClickResponse
  | CoupangOrderResponse
  | CoupangCancelResponse
  | CoupangCommissionResponse;

/**
 * 쿠팡 API 응답을 날짜별로 집계
 */
function aggregateByDate(reportType: string, rawData: CoupangReportResponse[]): unknown[] {
  const dateMap = new Map<string, Record<string, number | string>>();

  if (reportType === "clicks") {
    // clicks: 날짜별로 click 합산
    rawData.forEach((item) => {
      const date = item.date;
      if (!dateMap.has(date)) {
        dateMap.set(date, { date, clicks: 0 });
      }
      const existing = dateMap.get(date)!;
      existing.clicks = (existing.clicks as number) + ((item as CoupangClickResponse).click ?? 0);
    });
  } else if (reportType === "orders") {
    // orders: 날짜별로 주문 건수, 수량, GMV 합산
    rawData.forEach((item) => {
      const date = item.date;
      if (!dateMap.has(date)) {
        dateMap.set(date, { date, orderCnt: 0, quantity: 0, gmv: 0 });
      }
      const existing = dateMap.get(date)!;
      const orderItem = item as CoupangOrderResponse;
      existing.orderCnt = (existing.orderCnt as number) + 1;
      existing.quantity = (existing.quantity as number) + (orderItem.quantity ?? 0);
      existing.gmv = (existing.gmv as number) + (orderItem.gmv ?? 0);
    });
  } else if (reportType === "cancels") {
    // cancels: 날짜별로 취소 건수, GMV 합산
    rawData.forEach((item) => {
      const date = item.date;
      if (!dateMap.has(date)) {
        dateMap.set(date, { date, cancelCnt: 0, cancelGmv: 0 });
      }
      const existing = dateMap.get(date)!;
      const cancelItem = item as CoupangCancelResponse;
      existing.cancelCnt = (existing.cancelCnt as number) + 1;
      existing.cancelGmv = (existing.cancelGmv as number) + (cancelItem.cancelGmv ?? 0);
    });
  } else if (reportType === "commission") {
    // commission: 이미 집계된 데이터이므로 그대로 반환하되 필드명 변경
    rawData.forEach((item) => {
      const date = item.date;
      const commissionItem = item as CoupangCommissionResponse;
      if (!dateMap.has(date)) {
        dateMap.set(date, {
          date,
          commission: commissionItem.commission ?? 0,
          gmv: commissionItem.gmv ?? 0,
          orders: commissionItem.order ?? 0, // order → orders
          clicks: commissionItem.click ?? 0, // click → clicks
        });
      }
    });
  }

  return Array.from(dateMap.values());
}

interface ReportRequest {
  accessKey: string;
  secretKey: string;
  reportType: "clicks" | "orders" | "cancels" | "commission";
  startDate: string; // YYYYMMDD
  endDate: string; // YYYYMMDD
}

export async function POST(request: NextRequest) {
  try {
    const body: ReportRequest = await request.json();
    const { accessKey, secretKey, reportType, startDate, endDate } = body;

    if (!accessKey || !secretKey) {
      return NextResponse.json(
        { success: false, message: "API 키가 필요합니다." },
        { status: 400 }
      );
    }

    if (!reportType || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, message: "reportType, startDate, endDate가 필요합니다." },
        { status: 400 }
      );
    }

    const queryParams = new URLSearchParams({
      startDate,
      endDate,
    });

    const path = `/v2/providers/affiliate_open_api/apis/openapi/v1/reports/${reportType}?${queryParams.toString()}`;
    const headers = createAuthHeader("GET", path, accessKey, secretKey);

    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Coupang Report API error: ${response.status} - ${errorText}`);
      return NextResponse.json(
        { success: false, message: `API 오류: ${response.status}` },
        { status: response.status }
      );
    }

    const result = await response.json();

    if (result.rCode !== "0" && result.rCode !== 0) {
      return NextResponse.json(
        { success: false, message: result.rMessage || "리포트 조회 실패" },
        { status: 400 }
      );
    }

    const rawData = result.data ?? [];

    // 디버깅: 실제 API 응답 로깅
    console.log(`[${reportType}] ${startDate}~${endDate}: ${rawData.length}건`);
    if (rawData.length > 0) {
      console.log(`  첫 번째 데이터:`, JSON.stringify(rawData[0]));
      console.log(`  마지막 데이터:`, JSON.stringify(rawData[rawData.length - 1]));
    }

    // 날짜별로 데이터 집계
    const aggregatedData = aggregateByDate(reportType, rawData);

    return NextResponse.json({
      success: true,
      data: aggregatedData,
    });
  } catch (error) {
    console.error("Report API error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "리포트 조회 실패",
      },
      { status: 500 }
    );
  }
}
