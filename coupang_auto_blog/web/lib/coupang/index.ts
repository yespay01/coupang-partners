/**
 * 쿠팡 API 클라이언트 모듈
 *
 * 쿠팡 파트너스 API와 통신하기 위한 공통 모듈
 */

// 클라이언트
export { coupangRequest, coupangGet, coupangPost } from "./client";

// 서명
export { formatDatetime, generateHmac } from "./signature";

// 딥링크
export {
  createDeeplink,
  createDeeplinks,
  createDeeplinkMap,
} from "./deeplink";

// 상품
export {
  getGoldboxProducts,
  searchProducts,
  getBestCategoryProducts,
  getCoupangPLProducts,
} from "./products";

// 타입
export type {
  CoupangConfig,
  CoupangProduct,
  CoupangApiResponse,
  DeeplinkRequest,
  DeeplinkResponse,
  ProductSearchResponse,
  BestCategoryResponse,
  GoldboxResponse,
} from "./types";
