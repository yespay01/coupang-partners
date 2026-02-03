/**
 * 쿠팡 API HTTP 클라이언트
 */

import { logger } from "firebase-functions";
import { createAuthHeader } from "./signature.js";

const API_BASE_URL = "https://api-gateway.coupang.com";

/**
 * 쿠팡 API 요청
 * @param {string} method - HTTP 메서드
 * @param {string} path - API 경로
 * @param {string} accessKey - 쿠팡 액세스 키
 * @param {string} secretKey - 쿠팡 시크릿 키
 * @param {Object|null} body - 요청 바디
 * @returns {Promise<Object>} API 응답
 */
export async function coupangRequest(method, path, accessKey, secretKey, body = null) {
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
 * CoupangClient 클래스 - 인스턴스 기반 사용
 */
export class CoupangClient {
  constructor(accessKey, secretKey) {
    this.accessKey = accessKey;
    this.secretKey = secretKey;
  }

  /**
   * API 요청
   */
  async request(method, path, body = null) {
    return coupangRequest(method, path, this.accessKey, this.secretKey, body);
  }

  /**
   * GET 요청
   */
  async get(path) {
    return this.request("GET", path);
  }

  /**
   * POST 요청
   */
  async post(path, body) {
    return this.request("POST", path, body);
  }
}
