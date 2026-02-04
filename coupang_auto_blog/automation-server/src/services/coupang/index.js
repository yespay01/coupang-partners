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
