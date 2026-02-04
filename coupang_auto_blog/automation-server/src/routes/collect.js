import express from 'express';
import { getFirestore } from 'firebase-admin/firestore';
import { createCoupangClient } from '../services/coupang/index.js';
import { notifySlack } from '../services/slack.js';
import { getSystemSettings } from '../services/settingsService.js';

const router = express.Router();
const db = getFirestore();

/**
 * 상품 저장
 */
async function saveProduct(product, source) {
  const productRef = db.collection('products').doc(product.productId);
  const existing = await productRef.get();

  if (existing.exists) {
    console.debug(`상품 이미 존재: ${product.productId}`);
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
    status: 'pending',
  });

  console.info(`상품 저장: ${product.productName}`);
  return true;
}

/**
 * 키워드로 상품 수집
 */
async function collectByKeywords(client, keywords, maxProducts) {
  let collected = 0;

  if (keywords.length === 0) {
    console.info('검색 키워드가 없습니다.');
    return 0;
  }

  if (maxProducts <= 0) {
    console.info(`키워드 수집 건너뜀: 할당량 부족 (${maxProducts})`);
    return 0;
  }

  const productsPerKeyword = Math.ceil(maxProducts / keywords.length);

  for (const keyword of keywords) {
    if (collected >= maxProducts) break;

    try {
      const result = await client.searchProducts(keyword, productsPerKeyword);

      if (!result.success) {
        console.warn(`키워드 검색 실패 (${keyword}): ${result.message}`);
        continue;
      }

      const products = result.products.slice(0, maxProducts - collected);
      if (products.length === 0) {
        continue;
      }

      // 배치 딥링크 생성
      const productUrls = products.map((p) => p.productUrl);
      const deeplinkResult = await client.createDeeplinks(productUrls);

      const deeplinkMap = new Map();
      if (deeplinkResult.success && deeplinkResult.deeplinks) {
        deeplinkResult.deeplinks.forEach((dl, index) => {
          if (dl.shortenUrl) {
            deeplinkMap.set(productUrls[index], dl.shortenUrl);
          }
        });
      }

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
      console.error(`키워드 수집 오류 (${keyword}):`, error);
    }
  }

  return collected;
}

/**
 * 골드박스 상품 수집
 */
async function collectGoldbox(client, maxProducts) {
  try {
    const result = await client.getGoldboxProducts();

    if (!result.success) {
      console.warn(`골드박스 조회 실패: ${result.message}`);
      return 0;
    }

    const products = result.products.slice(0, maxProducts);
    if (products.length === 0) {
      return 0;
    }

    const productUrls = products.map((p) => p.productUrl);
    const deeplinkResult = await client.createDeeplinks(productUrls);

    const deeplinkMap = new Map();
    if (deeplinkResult.success && deeplinkResult.deeplinks) {
      deeplinkResult.deeplinks.forEach((dl, index) => {
        if (dl.shortenUrl) {
          deeplinkMap.set(productUrls[index], dl.shortenUrl);
        }
      });
    }

    let collected = 0;
    for (const product of products) {
      const affiliateUrl = deeplinkMap.get(product.productUrl) || product.productUrl;
      const saved = await saveProduct({ ...product, affiliateUrl }, 'goldbox');
      if (saved) collected++;
    }

    console.info(`골드박스 수집 완료: ${collected}개`);
    return collected;
  } catch (error) {
    console.error('골드박스 수집 오류:', error);
    return 0;
  }
}

/**
 * 쿠팡 PL 상품 수집
 */
async function collectCoupangPL(client, brands, maxProducts) {
  if (!brands || brands.length === 0) {
    console.info('선택된 쿠팡 PL 브랜드가 없습니다.');
    return 0;
  }

  let collected = 0;
  const productsPerBrand = Math.ceil(maxProducts / brands.length);

  for (const brandId of brands) {
    if (collected >= maxProducts) break;

    try {
      const result = await client.getCoupangPLBrandProducts(brandId, productsPerBrand);

      if (!result.success) {
        console.warn(`쿠팡 PL 브랜드 ${brandId} 조회 실패: ${result.message}`);
        continue;
      }

      const products = result.products.slice(0, maxProducts - collected);
      if (products.length === 0) {
        continue;
      }

      const productUrls = products.map((p) => p.productUrl);
      const deeplinkResult = await client.createDeeplinks(productUrls);

      const deeplinkMap = new Map();
      if (deeplinkResult.success && deeplinkResult.deeplinks) {
        deeplinkResult.deeplinks.forEach((dl, index) => {
          if (dl.shortenUrl) {
            deeplinkMap.set(productUrls[index], dl.shortenUrl);
          }
        });
      }

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
      console.error(`쿠팡 PL 브랜드 ${brandId} 수집 오류:`, error);
    }
  }

  console.info(`쿠팡 PL 수집 완료: ${collected}개`);
  return collected;
}

/**
 * 카테고리별 베스트 상품 수집
 */
async function collectByCategories(client, categories, maxProducts) {
  let collected = 0;
  const enabledCategories = categories.filter((cat) => cat.enabled);

  if (enabledCategories.length === 0) {
    console.info('활성화된 카테고리가 없습니다.');
    return 0;
  }

  if (maxProducts <= 0) {
    console.info(`카테고리 수집 건너뜀: 할당량 부족 (${maxProducts})`);
    return 0;
  }

  const productsPerCategory = Math.ceil(maxProducts / enabledCategories.length);

  for (const category of enabledCategories) {
    if (collected >= maxProducts) break;

    try {
      const result = await client.getBestProducts(category.id, productsPerCategory);

      if (!result.success) {
        console.warn(`카테고리 조회 실패 (${category.name}): ${result.message}`);
        continue;
      }

      const products = result.products.slice(0, maxProducts - collected);
      if (products.length === 0) {
        continue;
      }

      const productUrls = products.map((p) => p.productUrl);
      const deeplinkResult = await client.createDeeplinks(productUrls);

      const deeplinkMap = new Map();
      if (deeplinkResult.success && deeplinkResult.deeplinks) {
        deeplinkResult.deeplinks.forEach((dl, index) => {
          if (dl.shortenUrl) {
            deeplinkMap.set(productUrls[index], dl.shortenUrl);
          }
        });
      }

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
      console.error(`카테고리 수집 오류 (${category.name}):`, error);
    }
  }

  return collected;
}

/**
 * POST /api/collect/auto
 * 자동 상품 수집 (스케줄러 대체)
 */
router.post('/auto', async (req, res) => {
  try {
    console.info('상품 자동 수집 시작');

    const settings = await getSystemSettings();

    if (!settings) {
      return res.status(400).json({
        success: false,
        message: '시스템 설정이 없습니다.',
      });
    }

    const { automation, topics, coupang } = settings;

    if (!automation?.enabled) {
      return res.json({
        success: true,
        message: '자동 수집이 비활성화되어 있습니다.',
        collected: 0,
      });
    }

    if (!coupang?.enabled || !coupang.accessKey || !coupang.secretKey) {
      return res.status(400).json({
        success: false,
        message: '쿠팡 API가 설정되지 않았습니다.',
      });
    }

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

    // 로그 저장
    await db.collection('logs').add({
      type: 'collection',
      level: 'info',
      message: `상품 자동 수집 완료: ${totalCollected}개`,
      context: JSON.stringify({
        totalCollected,
        stats: collectionStats,
        source: 'automation-server',
      }),
      createdAt: new Date(),
    });

    // Slack 알림
    if (totalCollected > 0) {
      await notifySlack({
        route: 'collection',
        level: 'success',
        title: '상품 자동 수집 완료',
        text: `${totalCollected}개의 새 상품이 수집되었습니다.`,
        fields: [
          { label: '골드박스', value: String(collectionStats.goldbox) },
          { label: '카테고리 베스트', value: String(collectionStats.categories) },
          { label: '키워드 검색', value: String(collectionStats.keywords) },
          { label: '쿠팡 PL', value: String(collectionStats.coupangPL) },
        ],
      });
    }

    res.json({
      success: true,
      message: `${totalCollected}개의 상품이 수집되었습니다.`,
      data: {
        totalCollected,
        stats: collectionStats,
      },
    });
  } catch (error) {
    console.error('상품 수집 중 오류:', error);

    await notifySlack({
      route: 'collection',
      level: 'error',
      title: '상품 수집 오류',
      text: error.message,
    });

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/collect/manual
 * 수동 상품 수집
 */
router.post('/manual', async (req, res) => {
  try {
    console.info('수동 상품 수집 시작');

    const { maxProducts = 10 } = req.body;

    const settings = await getSystemSettings();

    if (!settings) {
      return res.status(400).json({
        success: false,
        message: '시스템 설정이 없습니다.',
      });
    }

    const { topics, coupang } = settings;

    if (!coupang?.enabled || !coupang.accessKey || !coupang.secretKey) {
      return res.status(400).json({
        success: false,
        message: '쿠팡 API가 설정되지 않았습니다.',
      });
    }

    const client = createCoupangClient(
      coupang.accessKey,
      coupang.secretKey,
      coupang.partnerId,
      coupang.subId
    );

    let totalCollected = 0;
    const collectionStats = {
      goldbox: 0,
      categories: 0,
      keywords: 0,
      coupangPL: 0,
    };

    // 동일한 수집 로직
    const goldboxEnabled = topics?.goldboxEnabled ?? true;
    if (goldboxEnabled) {
      const goldboxCount = await collectGoldbox(client, Math.floor(maxProducts * 0.2));
      totalCollected += goldboxCount;
      collectionStats.goldbox = goldboxCount;
    }

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

    const coupangPLBrands = topics?.coupangPLBrands || [];
    const remaining = maxProducts - totalCollected;
    if (remaining > 0 && coupangPLBrands.length > 0) {
      const plCollected = await collectCoupangPL(client, coupangPLBrands, remaining);
      totalCollected += plCollected;
      collectionStats.coupangPL = plCollected;
    }

    // 로그 저장
    await db.collection('logs').add({
      type: 'collection',
      level: 'info',
      message: `수동 상품 수집 완료: ${totalCollected}개`,
      context: JSON.stringify({
        totalCollected,
        stats: collectionStats,
        source: 'manual-automation-server',
      }),
      createdAt: new Date(),
    });

    // Slack 알림
    if (totalCollected > 0) {
      await notifySlack({
        route: 'collection',
        level: 'success',
        title: '수동 상품 수집 완료',
        text: `${totalCollected}개의 새 상품이 수집되었습니다.`,
        fields: [
          { label: '골드박스', value: String(collectionStats.goldbox) },
          { label: '카테고리 베스트', value: String(collectionStats.categories) },
          { label: '키워드 검색', value: String(collectionStats.keywords) },
          { label: '쿠팡 PL', value: String(collectionStats.coupangPL) },
        ],
      });
    }

    res.json({
      success: true,
      message: `${totalCollected}개의 상품이 수집되었습니다.`,
      data: {
        totalCollected,
        stats: collectionStats,
      },
    });
  } catch (error) {
    console.error('수동 상품 수집 중 오류:', error);

    await notifySlack({
      route: 'collection',
      level: 'error',
      title: '수동 상품 수집 오류',
      text: error.message,
    });

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
