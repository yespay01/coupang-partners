/**
 * 쿠팡 리포트 API
 */

import { logger } from "firebase-functions";
import { coupangRequest } from "./client.js";

/**
 * 리포트 API - 일별 클릭 수 조회
 */
export async function getClicksReport(params, credentials) {
  const { startDate, endDate } = params;
  const { accessKey, secretKey } = credentials;

  const queryParams = new URLSearchParams({
    startDate,
    endDate,
  });

  const path = `/v2/providers/affiliate_open_api/apis/openapi/v1/reports/clicks?${queryParams.toString()}`;

  try {
    const result = await coupangRequest("GET", path, accessKey, secretKey);

    if (result.rCode !== "0" && result.rCode !== 0) {
      logger.warn("Coupang clicks report failed:", result.rMessage);
      return { success: false, message: result.rMessage, data: [] };
    }

    return {
      success: true,
      data: result.data ?? [],
    };
  } catch (error) {
    logger.error("Coupang clicks report error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "클릭 리포트 조회 실패",
      data: [],
    };
  }
}

/**
 * 리포트 API - 일별 주문 정보 조회
 */
export async function getOrdersReport(params, credentials) {
  const { startDate, endDate } = params;
  const { accessKey, secretKey } = credentials;

  const queryParams = new URLSearchParams({
    startDate,
    endDate,
  });

  const path = `/v2/providers/affiliate_open_api/apis/openapi/v1/reports/orders?${queryParams.toString()}`;

  try {
    const result = await coupangRequest("GET", path, accessKey, secretKey);

    if (result.rCode !== "0" && result.rCode !== 0) {
      logger.warn("Coupang orders report failed:", result.rMessage);
      return { success: false, message: result.rMessage, data: [] };
    }

    return {
      success: true,
      data: result.data ?? [],
    };
  } catch (error) {
    logger.error("Coupang orders report error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "주문 리포트 조회 실패",
      data: [],
    };
  }
}

/**
 * 리포트 API - 일별 취소 정보 조회
 */
export async function getCancelsReport(params, credentials) {
  const { startDate, endDate } = params;
  const { accessKey, secretKey } = credentials;

  const queryParams = new URLSearchParams({
    startDate,
    endDate,
  });

  const path = `/v2/providers/affiliate_open_api/apis/openapi/v1/reports/cancels?${queryParams.toString()}`;

  try {
    const result = await coupangRequest("GET", path, accessKey, secretKey);

    if (result.rCode !== "0" && result.rCode !== 0) {
      logger.warn("Coupang cancels report failed:", result.rMessage);
      return { success: false, message: result.rMessage, data: [] };
    }

    return {
      success: true,
      data: result.data ?? [],
    };
  } catch (error) {
    logger.error("Coupang cancels report error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "취소 리포트 조회 실패",
      data: [],
    };
  }
}

/**
 * 리포트 API - 일별 수익 정보 조회
 */
export async function getCommissionReport(params, credentials) {
  const { startDate, endDate } = params;
  const { accessKey, secretKey } = credentials;

  const queryParams = new URLSearchParams({
    startDate,
    endDate,
  });

  const path = `/v2/providers/affiliate_open_api/apis/openapi/v1/reports/commission?${queryParams.toString()}`;

  try {
    const result = await coupangRequest("GET", path, accessKey, secretKey);

    if (result.rCode !== "0" && result.rCode !== 0) {
      logger.warn("Coupang commission report failed:", result.rMessage);
      return { success: false, message: result.rMessage, data: [] };
    }

    return {
      success: true,
      data: result.data ?? [],
    };
  } catch (error) {
    logger.error("Coupang commission report error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "수익 리포트 조회 실패",
      data: [],
    };
  }
}
