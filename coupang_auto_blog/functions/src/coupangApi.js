/**
 * 쿠팡 파트너스 API 클라이언트
 * - HMAC 서명 생성
 * - 상품 검색
 * - 카테고리별 베스트 상품
 * - 딥링크 생성
 */

import crypto from "crypto";
import { logger } from "firebase-functions";

const API_BASE_URL = "https://api-gateway.coupang.com";

/**
 * 현재 시간을 쿠팡 API 형식으로 포맷 (YYMMDDTHHMMSSz - 2자리 연도)
 */
function formatDatetime() {
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
 * HMAC-SHA256 서명 생성
 * message = datetime + method + path + query (? 제외)
 */
function generateSignature(method, url, secretKey, datetime) {
  // URL에서 path와 query 분리
  const parts = url.split("?");
  const [path, query = ""] = parts;
  // message 구성: datetime + method + path + query (? 없이 붙임)
  const message = datetime + method + path + query;
  return crypto.createHmac("sha256", secretKey).update(message).digest("hex");
}

/**
 * Authorization 헤더 생성
 */
function createAuthHeader(method, url, accessKey, secretKey) {
  const datetime = formatDatetime();
  const signature = generateSignature(method, url, secretKey, datetime);
  return {
    Authorization: `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${datetime}, signature=${signature}`,
    "Content-Type": "application/json",
  };
}

/**
 * 쿠팡 API 요청
 */
async function coupangRequest(method, path, accessKey, secretKey, body = null) {
  const headers = createAuthHeader(method, path, accessKey, secretKey);

  const options = {
    method,
    headers,
  };

  if (body && (method === "POST" || method === "PUT")) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, options);

  if (!response.ok) {
    const errorText = await response.text();
    logger.error(`Coupang API error: ${response.status} - ${errorText}`);
    throw new Error(`쿠팡 API 오류: ${response.status}`);
  }

  return response.json();
}

/**
 * 상품 검색 API
 * @param {Object} params - { keyword, limit, subId }
 * @param {Object} credentials - { accessKey, secretKey }
 */
export async function searchProducts(params, credentials) {
  const { keyword, limit = 20, subId } = params;
  const { accessKey, secretKey } = credentials;

  const queryParams = new URLSearchParams({
    keyword: keyword,
    limit: String(limit),
  });

  if (subId) {
    queryParams.append("subId", subId);
  }

  const path = `/v2/providers/affiliate_open_api/apis/openapi/products/search?${queryParams.toString()}`;

  try {
    const result = await coupangRequest("GET", path, accessKey, secretKey);

    if (result.rCode !== 0) {
      logger.warn("Coupang search failed:", result.rMessage);
      return { success: false, message: result.rMessage, products: [] };
    }

    return {
      success: true,
      products: result.data?.productData ?? [],
      totalCount: result.data?.totalCount ?? 0,
    };
  } catch (error) {
    logger.error("Coupang search error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "검색 실패",
      products: [],
    };
  }
}

/**
 * 골드박스 상품 조회 (매일 오전 7:30 업데이트)
 * @param {Object} params - { subId, imageSize }
 * @param {Object} credentials - { accessKey, secretKey }
 */
export async function getGoldboxProducts(params, credentials) {
  const { subId, imageSize } = params;
  const { accessKey, secretKey } = credentials;

  const queryParams = new URLSearchParams();

  if (subId) {
    queryParams.append("subId", subId);
  }

  if (imageSize) {
    queryParams.append("imageSize", imageSize);
  }

  const path = `/v2/providers/affiliate_open_api/apis/openapi/products/goldbox${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;

  try {
    const result = await coupangRequest("GET", path, accessKey, secretKey);

    if (result.rCode !== 0) {
      logger.warn("Coupang goldbox failed:", result.rMessage);
      return { success: false, message: result.rMessage, products: [] };
    }

    return {
      success: true,
      products: result.data ?? [],
    };
  } catch (error) {
    logger.error("Coupang goldbox error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "골드박스 조회 실패",
      products: [],
    };
  }
}

/**
 * 카테고리별 베스트 상품 조회
 * @param {Object} params - { categoryId, limit, subId }
 * @param {Object} credentials - { accessKey, secretKey }
 */
export async function getBestProducts(params, credentials) {
  const { categoryId, limit = 100, subId } = params;
  const { accessKey, secretKey } = credentials;

  const queryParams = new URLSearchParams({
    limit: String(limit),
  });

  if (subId) {
    queryParams.append("subId", subId);
  }

  const path = `/v2/providers/affiliate_open_api/apis/openapi/products/bestcategories/${categoryId}?${queryParams.toString()}`;

  try {
    const result = await coupangRequest("GET", path, accessKey, secretKey);

    if (result.rCode !== 0) {
      logger.warn("Coupang best products failed:", result.rMessage);
      return { success: false, message: result.rMessage, products: [] };
    }

    return {
      success: true,
      products: result.data ?? [],
    };
  } catch (error) {
    logger.error("Coupang best products error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "조회 실패",
      products: [],
    };
  }
}

/**
 * 쿠팡 PL 전체 상품 조회
 * @param {Object} params - { limit, subId, imageSize }
 * @param {Object} credentials - { accessKey, secretKey }
 */
export async function getCoupangPLProducts(params, credentials) {
  const { limit = 100, subId, imageSize } = params;
  const { accessKey, secretKey } = credentials;

  const queryParams = new URLSearchParams({
    limit: String(limit),
  });

  if (subId) {
    queryParams.append("subId", subId);
  }

  if (imageSize) {
    queryParams.append("imageSize", imageSize);
  }

  const path = `/v2/providers/affiliate_open_api/apis/openapi/products/coupangPL?${queryParams.toString()}`;

  try {
    const result = await coupangRequest("GET", path, accessKey, secretKey);

    if (result.rCode !== 0) {
      logger.warn("Coupang PL products failed:", result.rMessage);
      return { success: false, message: result.rMessage, products: [] };
    }

    return {
      success: true,
      products: result.data ?? [],
    };
  } catch (error) {
    logger.error("Coupang PL products error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "쿠팡 PL 조회 실패",
      products: [],
    };
  }
}

/**
 * 쿠팡 PL 브랜드별 상품 조회
 * @param {Object} params - { brandId, limit, subId, imageSize }
 * @param {Object} credentials - { accessKey, secretKey }
 */
export async function getCoupangPLBrandProducts(params, credentials) {
  const { brandId, limit = 100, subId, imageSize } = params;
  const { accessKey, secretKey } = credentials;

  const queryParams = new URLSearchParams({
    limit: String(limit),
  });

  if (subId) {
    queryParams.append("subId", subId);
  }

  if (imageSize) {
    queryParams.append("imageSize", imageSize);
  }

  const path = `/v2/providers/affiliate_open_api/apis/openapi/products/coupangPL/${brandId}?${queryParams.toString()}`;

  try {
    const result = await coupangRequest("GET", path, accessKey, secretKey);

    if (result.rCode !== 0) {
      logger.warn(`Coupang PL brand ${brandId} failed:`, result.rMessage);
      return { success: false, message: result.rMessage, products: [] };
    }

    return {
      success: true,
      products: result.data ?? [],
      brandId,
    };
  } catch (error) {
    logger.error(`Coupang PL brand ${brandId} error:`, error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "쿠팡 PL 브랜드 조회 실패",
      products: [],
    };
  }
}

/**
 * 딥링크 생성 API
 * @param {Object} params - { urls, subId }
 * @param {Object} credentials - { accessKey, secretKey }
 */
export async function createDeeplinks(params, credentials) {
  const { urls, subId } = params;
  const { accessKey, secretKey } = credentials;

  // 공식 문서 엔드포인트: v1 포함
  const path = `/v2/providers/affiliate_open_api/apis/openapi/v1/deeplink`;

  const body = {
    coupangUrls: Array.isArray(urls) ? urls : [urls],
    subId: subId || "",
  };

  try {
    const result = await coupangRequest("POST", path, accessKey, secretKey, body);

    if (result.rCode !== 0) {
      logger.warn("Coupang deeplink failed:", result.rMessage);
      return { success: false, message: result.rMessage, deeplinks: [] };
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

/**
 * 카테고리 추천 API
 * @param {Object} params - { productName }
 * @param {Object} credentials - { accessKey, secretKey }
 */
export async function recommendCategory(params, credentials) {
  const { productName } = params;
  const { accessKey, secretKey } = credentials;

  const queryParams = new URLSearchParams({
    query: productName,
  });

  const path = `/v2/providers/affiliate_open_api/apis/openapi/category/recommend?${queryParams.toString()}`;

  try {
    const result = await coupangRequest("GET", path, accessKey, secretKey);

    if (result.rCode !== 0) {
      logger.warn("Coupang category recommend failed:", result.rMessage);
      return { success: false, message: result.rMessage, categories: [] };
    }

    return {
      success: true,
      categories: result.data ?? [],
    };
  } catch (error) {
    logger.error("Coupang category recommend error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "카테고리 추천 실패",
      categories: [],
    };
  }
}

/**
 * 리포트 API - 일별 클릭 수 조회
 * @param {Object} params - { startDate, endDate } (YYYYMMDD 형식)
 * @param {Object} credentials - { accessKey, secretKey }
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
 * @param {Object} params - { startDate, endDate } (YYYYMMDD 형식)
 * @param {Object} credentials - { accessKey, secretKey }
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
 * @param {Object} params - { startDate, endDate } (YYYYMMDD 형식)
 * @param {Object} credentials - { accessKey, secretKey }
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
 * @param {Object} params - { startDate, endDate } (YYYYMMDD 형식)
 * @param {Object} credentials - { accessKey, secretKey }
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

/**
 * 쿠팡 API 클라이언트 인스턴스 생성
 */
export function createCoupangClient(accessKey, secretKey, partnerId, subId = "") {
  const credentials = { accessKey, secretKey };

  return {
    // 상품 조회 API
    searchProducts: (keyword, limit) =>
      searchProducts({ keyword, limit, subId: subId || partnerId }, credentials),

    getBestProducts: (categoryId, limit) =>
      getBestProducts({ categoryId, limit, subId: subId || partnerId }, credentials),

    getGoldboxProducts: (imageSize) =>
      getGoldboxProducts({ subId: subId || partnerId, imageSize }, credentials),

    getCoupangPLProducts: (limit, imageSize) =>
      getCoupangPLProducts({ limit, subId: subId || partnerId, imageSize }, credentials),

    getCoupangPLBrandProducts: (brandId, limit, imageSize) =>
      getCoupangPLBrandProducts({ brandId, limit, subId: subId || partnerId, imageSize }, credentials),

    // 딥링크 API
    createDeeplinks: (urls) =>
      createDeeplinks({ urls, subId: subId || partnerId }, credentials),

    // 카테고리 추천 API
    recommendCategory: (productName) =>
      recommendCategory({ productName }, credentials),

    // 리포트 API
    getClicksReport: (startDate, endDate) =>
      getClicksReport({ startDate, endDate }, credentials),

    getOrdersReport: (startDate, endDate) =>
      getOrdersReport({ startDate, endDate }, credentials),

    getCancelsReport: (startDate, endDate) =>
      getCancelsReport({ startDate, endDate }, credentials),

    getCommissionReport: (startDate, endDate) =>
      getCommissionReport({ startDate, endDate }, credentials),

    // 연결 테스트
    testConnection: async () => {
      try {
        const result = await createDeeplinks(
          { urls: ["https://www.coupang.com"], subId: subId || partnerId },
          credentials
        );
        return { success: result.success, message: result.message };
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : "연결 테스트 실패",
        };
      }
    },
  };
}
