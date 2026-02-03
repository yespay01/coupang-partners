/**
 * 상품 자동 수집 스케줄러
 * system_settings에서 설정을 읽어와 쿠팡 API로 상품을 수집합니다.
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { onCall } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { createCoupangClient } from "./coupang/index.js";
import { notifySlack } from "./slack.js";
import { getSystemSettings } from "./services/settingsService.js";

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

/**
 * 상품 저장
 */
async function saveProduct(product, source) {
  const productRef = db.collection("products").doc(product.productId);
  const existing = await productRef.get();

  if (existing.exists) {
    logger.debug(`상품 이미 존재: ${product.productId}`);
    return false;
  }

  await productRef.set({
    productId: product.productId,
    productName: product.productName,
    productPrice: product.productPrice,
    productImage: product.productImage,
    productUrl: product.productUrl,
    categoryId: product.categoryId,
    categoryName: product.categoryName,
    affiliateUrl: product.affiliateUrl,
    source,
    createdAt: new Date(),
    status: "pending",
  });

  logger.info(`상품 저장: ${product.productName}`);
  return true;
}

/**
 * 키워드로 상품 수집
 * 배치 딥링크 생성으로 성능 개선
 */
async function collectByKeywords(client, keywords, maxProducts) {
  let collected = 0;

  if (keywords.length === 0) {
    logger.info("검색 키워드가 없습니다.");
    return 0;
  }

  if (maxProducts <= 0) {
    logger.info(`키워드 수집 건너뜀: 할당량 부족 (${maxProducts})`);
    return 0;
  }

  const productsPerKeyword = Math.ceil(maxProducts / keywords.length);

  for (const keyword of keywords) {
    if (collected >= maxProducts) break;

    try {
      const result = await client.searchProducts(keyword, productsPerKeyword);

      if (!result.success) {
        logger.warn(`키워드 검색 실패 (${keyword}): ${result.message}`);
        continue;
      }

      const products = result.products.slice(0, maxProducts - collected);
      if (products.length === 0) {
        continue;
      }

      // 배치 딥링크 생성
      const productUrls = products.map((p) => p.productUrl);
      const deeplinkResult = await client.createDeeplinks(productUrls);

      // URL -> affiliateUrl 매핑
      const deeplinkMap = new Map();
      if (deeplinkResult.success && deeplinkResult.deeplinks) {
        deeplinkResult.deeplinks.forEach((dl, index) => {
          if (dl.shortenUrl) {
            deeplinkMap.set(productUrls[index], dl.shortenUrl);
          }
        });
        logger.info(`딥링크 매핑 완료: ${deeplinkMap.size}/${productUrls.length}개 성공`);
      } else {
        logger.warn(`딥링크 생성 실패, 원본 URL 사용: ${deeplinkResult.message || '알 수 없는 오류'}`);
      }

      // 저장
      for (const product of products) {
        if (collected >= maxProducts) break;

        const affiliateUrl = deeplinkMap.get(product.productUrl) || product.productUrl;
        const saved = await saveProduct(
          { ...product, affiliateUrl },
          `keyword:${keyword}`
        );

        if (saved) collected++;
      }
    } catch (error) {
      logger.error(`키워드 수집 오류 (${keyword}):`, error);
    }
  }

  return collected;
}

/**
 * 골드박스 상품 수집 (매일 오전 7:30 업데이트)
 * 배치 딥링크 생성으로 성능 개선
 */
async function collectGoldbox(client, maxProducts) {
  try {
    const result = await client.getGoldboxProducts();

    if (!result.success) {
      logger.warn(`골드박스 조회 실패: ${result.message}`);
      return 0;
    }

    // 수집할 상품 목록
    const products = result.products.slice(0, maxProducts);
    if (products.length === 0) {
      return 0;
    }

    // 배치 딥링크 생성 (N+1 문제 해결)
    const productUrls = products.map((p) => p.productUrl);
    const deeplinkResult = await client.createDeeplinks(productUrls);

    // URL -> affiliateUrl 매핑
    const deeplinkMap = new Map();
    if (deeplinkResult.success && deeplinkResult.deeplinks) {
      deeplinkResult.deeplinks.forEach((dl, index) => {
        if (dl.shortenUrl) {
          deeplinkMap.set(productUrls[index], dl.shortenUrl);
        }
      });
    }

    // 저장
    let collected = 0;
    for (const product of products) {
      const affiliateUrl = deeplinkMap.get(product.productUrl) || product.productUrl;
      const saved = await saveProduct(
        { ...product, affiliateUrl },
        "goldbox"
      );
      if (saved) collected++;
    }

    logger.info(`골드박스 수집 완료: ${collected}개`);
    return collected;
  } catch (error) {
    logger.error("골드박스 수집 오류:", error);
    return 0;
  }
}

/**
 * 쿠팡 PL 상품 수집
 * 배치 딥링크 생성으로 성능 개선
 */
async function collectCoupangPL(client, brands, maxProducts) {
  if (!brands || brands.length === 0) {
    logger.info("선택된 쿠팡 PL 브랜드가 없습니다.");
    return 0;
  }

  let collected = 0;
  const productsPerBrand = Math.ceil(maxProducts / brands.length);

  for (const brandId of brands) {
    if (collected >= maxProducts) break;

    try {
      const result = await client.getCoupangPLBrandProducts(brandId, productsPerBrand);

      if (!result.success) {
        logger.warn(`쿠팡 PL 브랜드 ${brandId} 조회 실패: ${result.message}`);
        continue;
      }

      const products = result.products.slice(0, maxProducts - collected);
      if (products.length === 0) {
        continue;
      }

      // 배치 딥링크 생성
      const productUrls = products.map((p) => p.productUrl);
      const deeplinkResult = await client.createDeeplinks(productUrls);

      // URL -> affiliateUrl 매핑
      const deeplinkMap = new Map();
      if (deeplinkResult.success && deeplinkResult.deeplinks) {
        deeplinkResult.deeplinks.forEach((dl, index) => {
          if (dl.shortenUrl) {
            deeplinkMap.set(productUrls[index], dl.shortenUrl);
          }
        });
        logger.info(`딥링크 매핑 완료: ${deeplinkMap.size}/${productUrls.length}개 성공`);
      } else {
        logger.warn(`딥링크 생성 실패, 원본 URL 사용: ${deeplinkResult.message || '알 수 없는 오류'}`);
      }

      // 저장
      for (const product of products) {
        if (collected >= maxProducts) break;

        const affiliateUrl = deeplinkMap.get(product.productUrl) || product.productUrl;
        const saved = await saveProduct(
          { ...product, affiliateUrl },
          `coupangPL:${brandId}`
        );

        if (saved) collected++;
      }
    } catch (error) {
      logger.error(`쿠팡 PL 브랜드 ${brandId} 수집 오류:`, error);
    }
  }

  logger.info(`쿠팡 PL 수집 완료: ${collected}개`);
  return collected;
}

/**
 * 카테고리별 베스트 상품 수집
 * 배치 딥링크 생성으로 성능 개선
 */
async function collectByCategories(client, categories, maxProducts) {
  let collected = 0;
  const enabledCategories = categories.filter((cat) => cat.enabled);

  if (enabledCategories.length === 0) {
    logger.info("활성화된 카테고리가 없습니다.");
    return 0;
  }

  if (maxProducts <= 0) {
    logger.info(`카테고리 수집 건너뜀: 할당량 부족 (${maxProducts})`);
    return 0;
  }

  const productsPerCategory = Math.ceil(maxProducts / enabledCategories.length);

  for (const category of enabledCategories) {
    if (collected >= maxProducts) break;

    try {
      const result = await client.getBestProducts(category.id, productsPerCategory);

      if (!result.success) {
        logger.warn(`카테고리 조회 실패 (${category.name}): ${result.message}`);
        continue;
      }

      const products = result.products.slice(0, maxProducts - collected);
      if (products.length === 0) {
        continue;
      }

      // 배치 딥링크 생성
      const productUrls = products.map((p) => p.productUrl);
      const deeplinkResult = await client.createDeeplinks(productUrls);

      // URL -> affiliateUrl 매핑
      const deeplinkMap = new Map();
      if (deeplinkResult.success && deeplinkResult.deeplinks) {
        deeplinkResult.deeplinks.forEach((dl, index) => {
          if (dl.shortenUrl) {
            deeplinkMap.set(productUrls[index], dl.shortenUrl);
          }
        });
        logger.info(`딥링크 매핑 완료: ${deeplinkMap.size}/${productUrls.length}개 성공`);
      } else {
        logger.warn(`딥링크 생성 실패, 원본 URL 사용: ${deeplinkResult.message || '알 수 없는 오류'}`);
      }

      // 저장
      for (const product of products) {
        if (collected >= maxProducts) break;

        const affiliateUrl = deeplinkMap.get(product.productUrl) || product.productUrl;
        const saved = await saveProduct(
          {
            ...product,
            categoryId: category.id,
            categoryName: category.name,
            affiliateUrl,
          },
          `category:${category.id}`
        );

        if (saved) collected++;
      }
    } catch (error) {
      logger.error(`카테고리 수집 오류 (${category.name}):`, error);
    }
  }

  return collected;
}

/**
 * 상품 자동 수집 스케줄러
 * 매일 지정된 시간에 실행
 */
export const collectProductsScheduler = onSchedule(
  {
    schedule: "0 2 * * *", // 매일 새벽 2시 (기본값, 설정에서 변경 가능)
    timeZone: "Asia/Seoul",
    retryCount: 1,
  },
  async () => {
    logger.info("상품 자동 수집 시작");

    const settings = await getSystemSettings();

    // 설정 확인
    if (!settings) {
      logger.warn("시스템 설정이 없어 수집을 건너뜁니다.");
      return;
    }

    const { automation, topics, coupang } = settings;

    // 자동 수집 활성화 확인
    if (!automation?.enabled) {
      logger.info("자동 수집이 비활성화되어 있습니다.");
      return;
    }

    // 쿠팡 API 설정 확인
    if (!coupang?.enabled || !coupang.accessKey || !coupang.secretKey) {
      logger.warn("쿠팡 API가 설정되지 않았습니다.");
      await notifySlack({
        route: "collection",
        level: "warn",
        title: "상품 수집 건너뜀",
        text: "쿠팡 API가 설정되지 않았습니다.",
      });
      return;
    }

    // 쿠팡 클라이언트 생성
    const client = createCoupangClient(
      coupang.accessKey,
      coupang.secretKey,
      coupang.partnerId,
      coupang.subId
    );

    const maxProducts = automation.maxProductsPerRun || 10;
    let totalCollected = 0;
    const collectionStats = {
      goldbox: 0,
      categories: 0,
      keywords: 0,
      coupangPL: 0,
    };

    try {
      // 우선순위 기반 수집 전략
      // 1. 골드박스 (타임딜 - 최우선, 20%)
      const goldboxEnabled = topics?.goldboxEnabled ?? true; // 기본값 true
      if (goldboxEnabled) {
        const goldboxCount = await collectGoldbox(client, Math.floor(maxProducts * 0.2));
        totalCollected += goldboxCount;
        collectionStats.goldbox = goldboxCount;
      }

      // 2. 카테고리 베스트 (40%)
      const categories = topics?.categories || [];
      if (categories.length > 0) {
        const categoryCollected = await collectByCategories(
          client,
          categories,
          Math.floor(maxProducts * 0.4)
        );
        totalCollected += categoryCollected;
        collectionStats.categories = categoryCollected;
      }

      // 3. 키워드 검색 (30%)
      const keywords = topics?.keywords || [];
      if (keywords.length > 0) {
        const keywordCollected = await collectByKeywords(
          client,
          keywords,
          Math.floor(maxProducts * 0.3)
        );
        totalCollected += keywordCollected;
        collectionStats.keywords = keywordCollected;
      }

      // 4. 쿠팡 PL (나머지 10%)
      const coupangPLBrands = topics?.coupangPLBrands || [];
      const remaining = maxProducts - totalCollected;
      if (remaining > 0 && coupangPLBrands.length > 0) {
        const plCollected = await collectCoupangPL(client, coupangPLBrands, remaining);
        totalCollected += plCollected;
        collectionStats.coupangPL = plCollected;
      }

      // 결과 로깅
      await db.collection("logs").add({
        type: "collection",
        level: "info",
        message: `상품 자동 수집 완료: ${totalCollected}개`,
        context: JSON.stringify({
          totalCollected,
          stats: {
            goldbox: collectionStats.goldbox,
            categories: collectionStats.categories,
            keywords: collectionStats.keywords,
            coupangPL: collectionStats.coupangPL,
          },
          source: "scheduler",
          settings: {
            keywordCount: keywords.length,
            categoryCount: categories.filter((c) => c.enabled).length,
            plBrandCount: coupangPLBrands.length,
          },
        }),
        createdAt: new Date(),
      });

      // Slack 알림
      if (totalCollected > 0) {
        await notifySlack({
          route: "collection",
          level: "success",
          title: "상품 자동 수집 완료",
          text: `${totalCollected}개의 새 상품이 수집되었습니다.`,
          fields: [
            { label: "골드박스", value: String(collectionStats.goldbox) },
            { label: "카테고리 베스트", value: String(collectionStats.categories) },
            { label: "키워드 검색", value: String(collectionStats.keywords) },
            { label: "쿠팡 PL", value: String(collectionStats.coupangPL) },
          ],
        });
      }
    } catch (error) {
      logger.error("상품 수집 중 오류:", error);

      await notifySlack({
        route: "collection",
        level: "error",
        title: "상품 수집 오류",
        text: error instanceof Error ? error.message : "알 수 없는 오류",
      });
    }
  }
);

/**
 * 수동 상품 수집 트리거 (HTTP 호출용)
 */
export async function manualCollect(credentials, options = {}) {
  const { accessKey, secretKey, partnerId, subId } = credentials;
  const { keywords = [], categories = [], maxProducts = 10 } = options;

  const client = createCoupangClient(accessKey, secretKey, partnerId, subId);
  let totalCollected = 0;

  if (keywords.length > 0) {
    totalCollected += await collectByKeywords(client, keywords, Math.floor(maxProducts / 2));
  }

  if (categories.length > 0) {
    const remaining = maxProducts - totalCollected;
    if (remaining > 0) {
      totalCollected += await collectByCategories(client, categories, remaining);
    }
  }

  return { collected: totalCollected };
}

/**
 * HTTP-callable 수동 수집 함수
 * 웹 대시보드에서 호출 가능
 */
export const manualCollectProducts = onCall(async (request) => {
  logger.info("수동 상품 수집 시작");

  const settings = await getSystemSettings();

  // 설정 확인
  if (!settings) {
    throw new Error("시스템 설정이 없습니다.");
  }

  const { topics, coupang } = settings;

  // 쿠팡 API 설정 확인
  if (!coupang?.enabled || !coupang.accessKey || !coupang.secretKey) {
    throw new Error("쿠팡 API가 설정되지 않았습니다.");
  }

  // 쿠팡 클라이언트 생성
  const client = createCoupangClient(
    coupang.accessKey,
    coupang.secretKey,
    coupang.partnerId,
    coupang.subId
  );

  const maxProducts = request.data?.maxProducts || 10;
  let totalCollected = 0;
  const collectionStats = {
    goldbox: 0,
    categories: 0,
    keywords: 0,
    coupangPL: 0,
  };

  try {
    // 골드박스 수집
    const goldboxEnabled = topics?.goldboxEnabled ?? true;
    if (goldboxEnabled) {
      const goldboxCount = await collectGoldbox(client, Math.floor(maxProducts * 0.2));
      totalCollected += goldboxCount;
      collectionStats.goldbox = goldboxCount;
    }

    // 카테고리 베스트 수집
    const categories = topics?.categories || [];
    if (categories.length > 0) {
      const categoryCollected = await collectByCategories(
        client,
        categories,
        Math.floor(maxProducts * 0.4)
      );
      totalCollected += categoryCollected;
      collectionStats.categories = categoryCollected;
    }

    // 키워드 검색 수집
    const keywords = topics?.keywords || [];
    if (keywords.length > 0) {
      const keywordCollected = await collectByKeywords(
        client,
        keywords,
        Math.floor(maxProducts * 0.3)
      );
      totalCollected += keywordCollected;
      collectionStats.keywords = keywordCollected;
    }

    // 쿠팡 PL 수집
    const coupangPLBrands = topics?.coupangPLBrands || [];
    const remaining = maxProducts - totalCollected;
    if (remaining > 0 && coupangPLBrands.length > 0) {
      const plCollected = await collectCoupangPL(client, coupangPLBrands, remaining);
      totalCollected += plCollected;
      collectionStats.coupangPL = plCollected;
    }

    // 결과 로깅
    await db.collection("logs").add({
      type: "collection",
      level: "info",
      message: `수동 상품 수집 완료: ${totalCollected}개 (Functions)`,
      context: JSON.stringify({
        totalCollected,
        stats: {
          goldbox: collectionStats.goldbox,
          categories: collectionStats.categories,
          keywords: collectionStats.keywords,
          coupangPL: collectionStats.coupangPL,
        },
        source: "manual-functions",
      }),
      createdAt: new Date(),
    });

    // Slack 알림
    if (totalCollected > 0) {
      await notifySlack({
        route: "collection",
        level: "success",
        title: "수동 상품 수집 완료",
        text: `${totalCollected}개의 새 상품이 수집되었습니다.`,
        fields: [
          { label: "골드박스", value: String(collectionStats.goldbox) },
          { label: "카테고리 베스트", value: String(collectionStats.categories) },
          { label: "키워드 검색", value: String(collectionStats.keywords) },
          { label: "쿠팡 PL", value: String(collectionStats.coupangPL) },
        ],
      });
    }

    return {
      success: true,
      message: `${totalCollected}개의 상품이 수집되었습니다.`,
      data: {
        totalCollected,
        stats: collectionStats,
      },
    };
  } catch (error) {
    logger.error("수동 상품 수집 중 오류:", error);

    await notifySlack({
      route: "collection",
      level: "error",
      title: "수동 상품 수집 오류",
      text: error instanceof Error ? error.message : "알 수 없는 오류",
    });

    throw error;
  }
});
