/**
 * 쿠팡 API HMAC 서명 생성
 */

import crypto from "crypto";

/**
 * 쿠팡 API 날짜 포맷 생성
 * @returns YYMMDDTHHmmssZ 형식의 날짜 문자열
 */
export function formatDatetime(): string {
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
 * HMAC SHA256 서명 생성
 * @param method HTTP 메서드 (GET, POST 등)
 * @param path API 경로 (쿼리스트링 포함 가능)
 * @param secretKey 쿠팡 시크릿 키
 * @param accessKey 쿠팡 액세스 키
 * @returns Authorization 헤더와 datetime
 */
export function generateHmac(
  method: string,
  path: string,
  secretKey: string,
  accessKey: string
): { authorization: string; datetime: string } {
  const datetime = formatDatetime();
  const parts = path.split("?");
  const [pathOnly, query = ""] = parts;
  const message = datetime + method + pathOnly + query;
  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(message)
    .digest("hex");
  const authorization = `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${datetime}, signature=${signature}`;
  return { authorization, datetime };
}
