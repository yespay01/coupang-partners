/**
 * 쿠팡 API HTTP 클라이언트
 */

import { generateHmac } from "./signature";
import type { CoupangConfig, CoupangApiResponse } from "./types";

const API_BASE_URL = "https://api-gateway.coupang.com";

/**
 * 쿠팡 API 요청
 * @param method HTTP 메서드
 * @param path API 경로 (쿼리스트링 포함 가능)
 * @param config 쿠팡 API 설정
 * @param body 요청 바디 (POST 요청 시)
 * @returns API 응답 데이터
 */
export async function coupangRequest<T = any>(
  method: string,
  path: string,
  config: CoupangConfig,
  body?: any
): Promise<CoupangApiResponse<T>> {
  const { authorization } = generateHmac(
    method,
    path,
    config.secretKey,
    config.accessKey
  );

  const headers: Record<string, string> = {
    Authorization: authorization,
    "Content-Type": "application/json",
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, options);

  if (!response.ok) {
    throw new Error(`Coupang API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * GET 요청 헬퍼
 */
export async function coupangGet<T = any>(
  path: string,
  config: CoupangConfig
): Promise<CoupangApiResponse<T>> {
  return coupangRequest<T>("GET", path, config);
}

/**
 * POST 요청 헬퍼
 */
export async function coupangPost<T = any>(
  path: string,
  config: CoupangConfig,
  body: any
): Promise<CoupangApiResponse<T>> {
  return coupangRequest<T>("POST", path, config, body);
}
