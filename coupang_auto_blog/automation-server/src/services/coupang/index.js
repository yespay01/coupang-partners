/**
 * 쿠팡 API 클라이언트 모듈 (Firebase Functions용)
 */

export * from "./client.js";
export * from "./signature.js";
export * from "./products.js";
export * from "./deeplink.js";
export * from "./reports.js";

// 기존 API와의 호환성을 위한 클라이언트 팩토리
import {
  searchProducts,
  getBestProducts,
  getGoldboxProducts,
  getCoupangPLProducts,
  getCoupangPLBrandProducts,
  recommendCategory,
} from "./products.js";
import { createDeeplinks } from "./deeplink.js";
import {
  affiliateUrlReasonMessage,
  isValidPartnerId,
  normalizeSubId,
  validateProductApiProducts,
  validateShortAffiliateUrl,
} from "./affiliateUrl.js";
import { logger } from "../../utils/logger.js";
import {
  getClicksReport,
  getOrdersReport,
  getCancelsReport,
  getCommissionReport,
} from "./reports.js";

/**
 * 쿠팡 API 클라이언트 인스턴스 생성 (레거시 호환)
 */
export function createCoupangClient(accessKey, secretKey, partnerId, subId = "") {
  const credentials = { accessKey, secretKey };
  const configuredSubId = normalizeSubId(subId);

  const runProductRequest = async (request, source) => {
    if (!isValidPartnerId(partnerId)) {
      return {
        success: false,
        message: affiliateUrlReasonMessage('invalid_partner_id'),
        products: [],
      };
    }

    const response = await request();
    if (!response.success) return response;

    const products = response.products || [];
    const { validProducts, invalidProducts } = validateProductApiProducts(products, partnerId);
    const invalidProductCount = invalidProducts.length;

    if (invalidProductCount > 0) {
      logger.warn('쿠팡 Product API 제휴 URL 검증 실패', {
        source,
        invalidProductCount,
        totalProductCount: products.length,
      });
    }

    if (products.length > 0 && validProducts.length === 0) {
      return {
        ...response,
        success: false,
        message: '쿠팡 Product API 제휴 URL의 Partner ID를 검증할 수 없습니다.',
        products: [],
        invalidProductCount,
      };
    }

    return { ...response, products: validProducts, invalidProductCount };
  };

  const runDeeplinkRequest = async (urls) => {
    if (!isValidPartnerId(partnerId)) {
      return {
        success: false,
        message: affiliateUrlReasonMessage('invalid_partner_id'),
        deeplinks: [],
      };
    }

    const response = await createDeeplinks(
      { urls, subId: configuredSubId },
      credentials
    );
    if (!response.success) return response;

    const verifiedDeeplinks = [];
    for (const deeplink of response.deeplinks || []) {
      const validation = validateShortAffiliateUrl(
        deeplink?.shortenUrl,
        deeplink?.landingUrl,
        partnerId
      );
      if (!validation.valid) {
        return {
          success: false,
          message: affiliateUrlReasonMessage(validation.reason),
          deeplinks: [],
        };
      }
      verifiedDeeplinks.push(deeplink);
    }

    return { ...response, deeplinks: verifiedDeeplinks };
  };

  return {
    partnerId,
    subId: configuredSubId,

    // 상품 조회 API
    searchProducts: (keyword, limit) =>
      runProductRequest(
        () => searchProducts({ keyword, limit, subId: configuredSubId }, credentials),
        'search'
      ),

    getBestProducts: (categoryId, limit) =>
      runProductRequest(
        () => getBestProducts({ categoryId, limit, subId: configuredSubId }, credentials),
        'best-category'
      ),

    getGoldboxProducts: (imageSize) =>
      runProductRequest(
        () => getGoldboxProducts({ subId: configuredSubId, imageSize }, credentials),
        'goldbox'
      ),

    getCoupangPLProducts: (limit, imageSize) =>
      runProductRequest(
        () => getCoupangPLProducts({ limit, subId: configuredSubId, imageSize }, credentials),
        'coupang-pl'
      ),

    getCoupangPLBrandProducts: (brandId, limit, imageSize) =>
      runProductRequest(
        () => getCoupangPLBrandProducts({ brandId, limit, subId: configuredSubId, imageSize }, credentials),
        `coupang-pl-brand:${brandId}`
      ),

    // 딥링크 API
    createDeeplinks: (urls) =>
      runDeeplinkRequest(urls),

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
        const result = await runDeeplinkRequest(["https://www.coupang.com"]);
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
