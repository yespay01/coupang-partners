/**
 * 이미지 수집 테스트 함수
 * 관리자 대시보드에서 호출하여 이미지 수집이 정상 작동하는지 확인
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { collectAllImages } from "./imageUtils.js";
import { getSystemSettings } from "./services/settingsService.js";

export const testImageCollection = onCall(
  {
    region: "asia-northeast3",
    timeoutSeconds: 60,
    memory: "512MiB",
  },
  async (request) => {
    try {
      logger.info("=== 이미지 수집 테스트 시작 ===");

      // 설정 로드
      const settings = await getSystemSettings();
      logger.info("시스템 설정 로드 완료", {
        stockEnabled: settings.images?.stockImages?.enabled,
        aiEnabled: settings.images?.aiImages?.enabled,
        coupangEnabled: settings.images?.coupangDetailImages?.enabled,
      });

      // 테스트용 가짜 상품 데이터
      const testProduct = {
        productId: "test-123",
        productName: "테스트 상품",
        name: "테스트 상품",
        categoryId: "1001", // 여성패션
        categoryName: "패션의류",
        productImage: "https://via.placeholder.com/400",
        productUrl: "https://www.coupang.com/vp/products/123456",
      };

      logger.info("테스트 상품 데이터 준비 완료", { testProduct });

      // 이미지 수집 실행
      logger.info("collectAllImages 호출 시작...");
      const images = await collectAllImages(testProduct, settings);
      logger.info("collectAllImages 호출 완료", {
        imageCount: images.length,
        images: images.map((img) => ({
          type: img.type,
          credit: img.credit,
          url: img.url?.substring(0, 50) + "...",
        })),
      });

      return {
        success: true,
        imageCount: images.length,
        images: images,
        settings: {
          stockEnabled: settings.images?.stockImages?.enabled || false,
          stockProvider: settings.images?.stockImages?.provider,
          stockApiKey: settings.images?.stockImages?.apiKey ? "설정됨" : "미설정",
          aiEnabled: settings.images?.aiImages?.enabled || false,
          coupangEnabled: settings.images?.coupangDetailImages?.enabled || false,
        },
      };
    } catch (error) {
      logger.error("이미지 수집 테스트 실패:", error);

      return {
        success: false,
        error: error.message,
        stack: error.stack,
      };
    }
  }
);
