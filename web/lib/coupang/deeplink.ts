/**
 * 쿠팡 딥링크 API
 */

import { coupangPost } from "./client";
import type { CoupangConfig, DeeplinkRequest, DeeplinkResponse } from "./types";

/**
 * 단일 상품 URL을 딥링크로 변환
 * @param productUrl 쿠팡 상품 URL
 * @param config 쿠팡 API 설정
 * @returns 딥링크 URL (실패 시 원본 URL 반환)
 */
export async function createDeeplink(
  productUrl: string,
  config: CoupangConfig
): Promise<string> {
  try {
    const result = await createDeeplinks([productUrl], config);
    return result[0] || productUrl;
  } catch (error) {
    console.error("딥링크 생성 오류:", error);
    return productUrl;
  }
}

/**
 * 여러 상품 URL을 딥링크로 변환 (배치 처리)
 * @param productUrls 쿠팡 상품 URL 배열
 * @param config 쿠팡 API 설정
 * @returns 딥링크 URL 배열 (실패한 항목은 원본 URL 반환)
 */
export async function createDeeplinks(
  productUrls: string[],
  config: CoupangConfig
): Promise<string[]> {
  try {
    const path = `/v2/providers/affiliate_open_api/apis/openapi/deeplink`;
    const body: DeeplinkRequest = { coupangUrls: productUrls };

    const result = await coupangPost<DeeplinkResponse>(path, config, body);

    // data 또는 deeplinks 필드에서 결과 추출
    const deeplinks = result.data || result.deeplinks || [];

    // 각 URL에 대응하는 딥링크 추출
    return productUrls.map((originalUrl, index) => {
      const deeplinkItem = deeplinks[index];
      return deeplinkItem?.shortenUrl || originalUrl;
    });
  } catch (error) {
    console.error("딥링크 배치 생성 오류:", error);
    // 실패 시 원본 URL 배열 반환
    return productUrls;
  }
}

/**
 * 상품 URL과 딥링크를 매핑한 Map 생성
 * @param productUrls 쿠팡 상품 URL 배열
 * @param config 쿠팡 API 설정
 * @returns URL -> 딥링크 매핑
 */
export async function createDeeplinkMap(
  productUrls: string[],
  config: CoupangConfig
): Promise<Map<string, string>> {
  const deeplinks = await createDeeplinks(productUrls, config);
  const map = new Map<string, string>();

  productUrls.forEach((url, index) => {
    map.set(url, deeplinks[index]);
  });

  return map;
}
