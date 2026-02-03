/**
 * 쿠팡 API HMAC 서명 생성
 */

import crypto from "crypto";

/**
 * 현재 시간을 쿠팡 API 형식으로 포맷 (YYMMDDTHHMMSSz - 2자리 연도)
 */
export function formatDatetime() {
  const now = new Date();
  const year = String(now.getUTCFullYear()).slice(-2);
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
export function generateSignature(method, url, secretKey, datetime) {
  const parts = url.split("?");
  const [path, query = ""] = parts;
  const message = datetime + method + path + query;
  return crypto.createHmac("sha256", secretKey).update(message).digest("hex");
}

/**
 * Authorization 헤더 생성
 */
export function createAuthHeader(method, url, accessKey, secretKey) {
  const datetime = formatDatetime();
  const signature = generateSignature(method, url, secretKey, datetime);
  return {
    Authorization: `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${datetime}, signature=${signature}`,
    "Content-Type": "application/json",
  };
}
