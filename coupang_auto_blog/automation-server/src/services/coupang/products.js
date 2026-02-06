/**
 * 쿠팡 상품 API
 */

import { logger } from "../../utils/logger.js";
import { coupangRequest } from "./client.js";

/**
 * 상품 검색 API
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

    if (result.rCode != 0) {
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
 * 골드박스 상품 조회
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

    // 디버깅용 로그
    logger.info("Goldbox API response:", {
      rCode: result.rCode,
      rMessage: result.rMessage,
      hasData: !!result.data,
      dataLength: result.data?.length
    });

    // rCode는 문자열 '0' 또는 숫자 0일 수 있으므로 느슨한 비교 사용
    if (result.rCode != 0) {
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

    if (result.rCode != 0) {
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

    if (result.rCode != 0) {
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

    if (result.rCode != 0) {
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
 * 카테고리 추천 API
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

    if (result.rCode != 0) {
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
