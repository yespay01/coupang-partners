/**
 * 쿠팡 딥링크 API
 */

import { logger } from "../../utils/logger.js";
import { coupangRequest } from "./client.js";

/**
 * 딥링크 생성 API
 * @param {Object} params - { urls, subId }
 * @param {Object} credentials - { accessKey, secretKey }
 */
export async function createDeeplinks(params, credentials) {
  const { urls, subId } = params;
  const { accessKey, secretKey } = credentials;

  const path = `/v2/providers/affiliate_open_api/apis/openapi/v1/deeplink`;

  const body = {
    coupangUrls: Array.isArray(urls) ? urls : [urls],
    subId: subId || "",
  };

  try {
    logger.info(`딥링크 생성 요청: ${urls.length || 1}개 URL`);
    const result = await coupangRequest("POST", path, accessKey, secretKey, body);

    logger.info("딥링크 API 응답:", {
      rCode: result.rCode,
      rMessage: result.rMessage,
      dataCount: result.data?.length || 0,
    });

    if (result.rCode != 0) {
      logger.warn("Coupang deeplink failed:", result.rMessage);
      return { success: false, message: result.rMessage, deeplinks: [] };
    }

    // 딥링크 결과 로깅
    if (result.data && result.data.length > 0) {
      logger.info("딥링크 생성 성공:", {
        sample: result.data[0],
        totalCount: result.data.length,
      });
    }

    return {
      success: true,
      deeplinks: result.data ?? [],
    };
  } catch (error) {
    logger.error("Coupang deeplink error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "딥링크 생성 실패",
      deeplinks: [],
    };
  }
}
