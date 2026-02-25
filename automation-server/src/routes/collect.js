import express from 'express';
import { getDb } from '../config/database.js';
import { authenticateToken } from '../config/auth.js';
import { createCoupangClient } from '../services/coupang/index.js';
import { notifySlack } from '../services/slack.js';

const router = express.Router();

// 수집 엔드포인트는 관리자/크론만 호출하도록 보호
router.use(authenticateToken);

/**
 * 시스템 설정 조회
 */
async function getSystemSettings() {
  const db = getDb();
  const result = await db.query(
    "SELECT value FROM settings WHERE key = 'system'"
  );

  return result.rows[0]?.value || {};
}

/**
 * 상품 저장
 */
async function saveProduct(product, source) {
  const db = getDb();

  try {
    // 중복 확인
    const existing = await db.query(
      'SELECT id FROM products WHERE product_id = $1',
      [product.productId]
    );

    if (existing.rows.length > 0) {
      console.debug(`상품 이미 존재: ${product.productId}`);
      return false;
    }

    // 상품 저장
    await db.query(
      `INSERT INTO products (
        product_id, product_name, product_price, product_image,
        product_url, category_id, category_name, affiliate_url,
        source, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        product.productId,
        product.productName,
        product.productPrice,
        product.productImage,
        product.productUrl,
        product.categoryId,
        product.categoryName,
        product.affiliateUrl,
        source,
        'pending'
      ]
    );

    console.info(`상품 저장: ${product.productName}`);
    return true;
  } catch (error) {
    console.error('상품 저장 오류:', error);
    return false;
  }
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
      if (products.length === 0) continue;

      for (const product of products) {
        if (collected >= maxProducts) break;

        // productUrl은 이미 제휴 링크이므로 그대로 사용
        const saved = await saveProduct(
          { ...product, affiliateUrl: product.productUrl },
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
    if (products.length === 0) return 0;

    let collected = 0;
    for (const product of products) {
      // productUrl은 이미 제휴 링크이므로 그대로 사용
      const saved = await saveProduct({ ...product, affiliateUrl: product.productUrl }, 'goldbox');
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
      if (products.length === 0) continue;

      for (const product of products) {
        if (collected >= maxProducts) break;

        // productUrl은 이미 제휴 링크이므로 그대로 사용
        const saved = await saveProduct(
          { ...product, affiliateUrl: product.productUrl },
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
      if (products.length === 0) continue;

      for (const product of products) {
        if (collected >= maxProducts) break;

        // productUrl은 이미 제휴 링크이므로 그대로 사용
        const saved = await saveProduct(
          {
            ...product,
            categoryId: category.id,
            categoryName: category.name,
            affiliateUrl: product.productUrl,
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
 * 로그 저장
 */
async function saveLog(type, level, message, payload = {}) {
  const db = getDb();
  await db.query(
    'INSERT INTO logs (type, level, message, payload) VALUES ($1, $2, $3, $4)',
    [type, level, message, JSON.stringify(payload)]
  );
}

/**
 * POST /api/collect/auto
 * 자동 상품 수집
 */
router.post('/auto', async (req, res) => {
  try {
    console.info('상품 자동 수집 시작');

    const settings = await getSystemSettings();

    if (!settings.automation?.enabled) {
      return res.json({
        success: true,
        message: '자동 수집이 비활성화되어 있습니다.',
        collected: 0,
      });
    }

    if (!settings.coupang?.enabled || !settings.coupang.accessKey || !settings.coupang.secretKey) {
      return res.status(400).json({
        success: false,
        message: '쿠팡 API가 설정되지 않았습니다.',
      });
    }

    const client = createCoupangClient(
      settings.coupang.accessKey,
      settings.coupang.secretKey,
      settings.coupang.partnerId,
      settings.coupang.subId
    );

    const maxProducts = settings.automation.maxProductsPerRun || 10;
    let totalCollected = 0;
    const collectionStats = {
      goldbox: 0,
      categories: 0,
      keywords: 0,
      coupangPL: 0,
    };

    // 골드박스
    const goldboxEnabled = settings.topics?.goldboxEnabled ?? true;
    if (goldboxEnabled) {
      const goldboxCount = await collectGoldbox(client, Math.floor(maxProducts * 0.2));
      totalCollected += goldboxCount;
      collectionStats.goldbox = goldboxCount;
    }

    // 카테고리
    const categories = settings.topics?.categories || [];
    if (categories.length > 0) {
      const categoryCollected = await collectByCategories(
        client,
        categories,
        Math.floor(maxProducts * 0.4)
      );
      totalCollected += categoryCollected;
      collectionStats.categories = categoryCollected;
    }

    // 키워드
    const keywords = settings.topics?.keywords || [];
    if (keywords.length > 0) {
      const keywordCollected = await collectByKeywords(
        client,
        keywords,
        Math.floor(maxProducts * 0.3)
      );
      totalCollected += keywordCollected;
      collectionStats.keywords = keywordCollected;
    }

    // 쿠팡 PL
    const coupangPLBrands = settings.topics?.coupangPLBrands || [];
    const remaining = maxProducts - totalCollected;
    if (remaining > 0 && coupangPLBrands.length > 0) {
      const plCollected = await collectCoupangPL(client, coupangPLBrands, remaining);
      totalCollected += plCollected;
      collectionStats.coupangPL = plCollected;
    }

    // 로그 저장
    await saveLog('collection', 'info', `상품 자동 수집 완료: ${totalCollected}개`, {
      totalCollected,
      stats: collectionStats,
      source: 'automation-server',
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

    await saveLog('collection', 'error', `상품 수집 오류: ${error.message}`, {});

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

    if (!settings.coupang?.enabled || !settings.coupang.accessKey || !settings.coupang.secretKey) {
      return res.status(400).json({
        success: false,
        message: '쿠팡 API가 설정되지 않았습니다.',
      });
    }

    const client = createCoupangClient(
      settings.coupang.accessKey,
      settings.coupang.secretKey,
      settings.coupang.partnerId,
      settings.coupang.subId
    );

    let totalCollected = 0;
    const collectionStats = {
      goldbox: 0,
      categories: 0,
      keywords: 0,
      coupangPL: 0,
    };

    // 동일한 수집 로직
    const goldboxEnabled = settings.topics?.goldboxEnabled ?? true;
    if (goldboxEnabled) {
      const goldboxCount = await collectGoldbox(client, Math.floor(maxProducts * 0.2));
      totalCollected += goldboxCount;
      collectionStats.goldbox = goldboxCount;
    }

    const categories = settings.topics?.categories || [];
    if (categories.length > 0) {
      const categoryCollected = await collectByCategories(
        client,
        categories,
        Math.floor(maxProducts * 0.4)
      );
      totalCollected += categoryCollected;
      collectionStats.categories = categoryCollected;
    }

    const keywords = settings.topics?.keywords || [];
    if (keywords.length > 0) {
      const keywordCollected = await collectByKeywords(
        client,
        keywords,
        Math.floor(maxProducts * 0.3)
      );
      totalCollected += keywordCollected;
      collectionStats.keywords = keywordCollected;
    }

    const coupangPLBrands = settings.topics?.coupangPLBrands || [];
    const remaining = maxProducts - totalCollected;
    if (remaining > 0 && coupangPLBrands.length > 0) {
      const plCollected = await collectCoupangPL(client, coupangPLBrands, remaining);
      totalCollected += plCollected;
      collectionStats.coupangPL = plCollected;
    }

    await saveLog('collection', 'info', `수동 상품 수집 완료: ${totalCollected}개`, {
      totalCollected,
      stats: collectionStats,
      source: 'manual-automation-server',
    });

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

    await saveLog('collection', 'error', `수동 상품 수집 오류: ${error.message}`, {});

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

/**
 * POST /api/collect/test
 * API 연결 테스트 (저장 안 함)
 */
router.post('/test', async (req, res) => {
  try {
    const { source, limit = 5, categoryId, brandId, keyword } = req.body;

    const settings = await getSystemSettings();

    if (!settings.coupang?.enabled || !settings.coupang.accessKey || !settings.coupang.secretKey) {
      return res.status(400).json({
        success: false,
        message: '쿠팡 API가 설정되지 않았습니다.',
      });
    }

    const client = createCoupangClient(
      settings.coupang.accessKey,
      settings.coupang.secretKey,
      settings.coupang.partnerId,
      settings.coupang.subId
    );

    let products = [];
    let sourceName = '';

    switch (source) {
      case 'goldbox':
        sourceName = '골드박스';
        const goldboxResult = await client.getGoldboxProducts();
        if (goldboxResult.success) {
          products = goldboxResult.products.slice(0, limit);
        } else {
          return res.status(400).json({
            success: false,
            message: `골드박스 조회 실패: ${goldboxResult.message}`,
          });
        }
        break;

      case 'coupangPL':
        if (!brandId) {
          return res.status(400).json({
            success: false,
            message: 'brandId가 필요합니다.',
          });
        }
        sourceName = `쿠팡 PL (브랜드 ${brandId})`;
        const plResult = await client.getCoupangPLBrandProducts(brandId, limit);
        if (plResult.success) {
          products = plResult.products;
        } else {
          return res.status(400).json({
            success: false,
            message: `쿠팡 PL 조회 실패: ${plResult.message}`,
          });
        }
        break;

      case 'category':
        if (!categoryId) {
          return res.status(400).json({
            success: false,
            message: 'categoryId가 필요합니다.',
          });
        }
        sourceName = `카테고리 ${categoryId}`;
        const categoryResult = await client.getBestProducts(categoryId, limit);
        if (categoryResult.success) {
          products = categoryResult.products;
        } else {
          return res.status(400).json({
            success: false,
            message: `카테고리 조회 실패: ${categoryResult.message}`,
          });
        }
        break;

      case 'keyword':
        if (!keyword) {
          return res.status(400).json({
            success: false,
            message: 'keyword가 필요합니다.',
          });
        }
        sourceName = `키워드: ${keyword}`;
        const keywordResult = await client.searchProducts(keyword, limit);
        if (keywordResult.success) {
          products = keywordResult.products;
        } else {
          return res.status(400).json({
            success: false,
            message: `키워드 검색 실패: ${keywordResult.message}`,
          });
        }
        break;

      default:
        return res.status(400).json({
          success: false,
          message: '지원하지 않는 소스입니다.',
        });
    }

    console.info(`${sourceName} 테스트 성공: ${products.length}개`);

    res.json({
      success: true,
      message: `${sourceName} 수집 테스트 성공`,
      source: sourceName,
      count: products.length,
      products: products,
    });
  } catch (error) {
    console.error('수집 테스트 오류:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '수집 중 오류 발생',
    });
  }
});

export default router;
