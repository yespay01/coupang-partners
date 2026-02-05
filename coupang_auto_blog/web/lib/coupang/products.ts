/**
 * 쿠팡 상품 API
 */

import { coupangGet } from "./client";
import type {
  CoupangConfig,
  CoupangProduct,
  ProductSearchResponse,
} from "./types";

/**
 * 골드박스 상품 조회
 * @param config 쿠팡 API 설정
 * @returns 골드박스 상품 배열
 */
export async function getGoldboxProducts(
  config: CoupangConfig
): Promise<CoupangProduct[]> {
  try {
    const path = `/v2/providers/affiliate_open_api/apis/openapi/products/goldbox`;
    const result = await coupangGet(path, config);

    if (result.rCode === "0") {
      return result.data || [];
    }

    console.error("골드박스 조회 실패:", result.rMessage);
    return [];
  } catch (error) {
    console.error("골드박스 조회 오류:", error);
    return [];
  }
}

/**
 * 키워드로 상품 검색
 * @param keyword 검색 키워드
 * @param limit 결과 개수 제한
 * @param config 쿠팡 API 설정
 * @returns 상품 배열
 */
export async function searchProducts(
  keyword: string,
  limit: number,
  config: CoupangConfig
): Promise<CoupangProduct[]> {
  try {
    const path = `/v2/providers/affiliate_open_api/apis/openapi/products/search?keyword=${encodeURIComponent(keyword)}&limit=${limit}`;
    const result = await coupangGet<ProductSearchResponse>(path, config);

    if (result.rCode === "0") {
      return result.data?.productData || [];
    }

    console.error(`키워드 검색 실패 (${keyword}):`, result.rMessage);
    return [];
  } catch (error) {
    console.error(`키워드 검색 오류 (${keyword}):`, error);
    return [];
  }
}

/**
 * 카테고리 베스트 상품 조회
 * @param categoryId 카테고리 ID
 * @param limit 결과 개수 제한
 * @param config 쿠팡 API 설정
 * @returns 상품 배열
 */
export async function getBestCategoryProducts(
  categoryId: string,
  limit: number,
  config: CoupangConfig
): Promise<CoupangProduct[]> {
  try {
    const path = `/v2/providers/affiliate_open_api/apis/openapi/products/bestcategories/${categoryId}?limit=${limit}`;
    const result = await coupangGet(path, config);

    if (result.rCode === "0") {
      return result.data || [];
    }

    console.error(`카테고리 조회 실패 (${categoryId}):`, result.rMessage);
    return [];
  } catch (error) {
    console.error(`카테고리 조회 오류 (${categoryId}):`, error);
    return [];
  }
}

/**
 * 쿠팡 PL 브랜드 상품 조회
 * @param brandId 브랜드 ID
 * @param limit 결과 개수 제한
 * @param config 쿠팡 API 설정
 * @returns 상품 배열
 */
export async function getCoupangPLProducts(
  brandId: string,
  limit: number,
  config: CoupangConfig
): Promise<CoupangProduct[]> {
  try {
    const path = `/v2/providers/affiliate_open_api/apis/openapi/products/coupangPL/${brandId}?limit=${limit}`;
    const result = await coupangGet(path, config);

    if (result.rCode === "0") {
      return result.data || [];
    }

    console.error(`쿠팡 PL 조회 실패 (${brandId}):`, result.rMessage);
    return [];
  } catch (error) {
    console.error(`쿠팡 PL 조회 오류 (${brandId}):`, error);
    return [];
  }
}
