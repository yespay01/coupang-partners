import express from 'express';
import { getDb } from '../config/database.js';
import { authenticateToken } from '../config/auth.js';
import { createCoupangClient } from '../services/coupang/index.js';
import { notifySlack } from '../services/slack.js';
import { registerAffiliateLink } from '../services/coupang/affiliateLinkRegistry.js';
import { normalizeObservedPrice, recordPriceObservation } from '../services/priceObservations.js';
import { getPopularSearchDemandKeywords } from '../services/searchDemand.js';

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
export async function saveProduct(product, source, client, db = getDb()) {
  const connection = typeof db.connect === 'function' ? await db.connect() : db;

  try {
    await connection.query('BEGIN');
    // 중복 확인
    const existing = await connection.query(
      'SELECT id FROM products WHERE product_id = $1',
      [product.productId]
    );
    const affiliateLink = await registerAffiliateLink(connection, {
      productId: product.productId,
      destinationUrl: product.productUrl,
      partnerId: client.partnerId,
      subId: client.subId,
      linkSource: 'product_api',
    });
    const observedPrice = normalizeObservedPrice(product.productPrice);

    if (existing.rows.length > 0) {
      await connection.query(
        `UPDATE products SET
           product_name = COALESCE($2, product_name),
           product_price = COALESCE($3, product_price),
           product_image = COALESCE($4, product_image),
           product_url = $5,
           affiliate_url = $5,
           affiliate_link_id = $6,
           updated_at = NOW()
         WHERE product_id = $1`,
        [product.productId, product.productName || null, observedPrice,
          product.productImage || null, product.productUrl, affiliateLink.link_id]
      );
      if (observedPrice != null) {
        await connection.query(
          'UPDATE reviews SET product_price = $2, updated_at = NOW() WHERE product_id = $1',
          [product.productId, observedPrice]
        );
        await recordPriceObservation(connection, {
          productId: String(product.productId), priceKrw: observedPrice,
          observedAt: new Date(), source: 'collection', context: source,
        });
      }
      await connection.query('COMMIT');
      console.debug(`기존 상품 실제 가격 관측 갱신: ${product.productId}`);
      return false;
    }

    // 상품 저장
    await connection.query(
      `INSERT INTO products (
        product_id, product_name, product_price, product_image,
        product_url, category_id, category_name, affiliate_url,
        source, status, affiliate_link_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        product.productId,
        product.productName,
        observedPrice,
        product.productImage,
        product.productUrl,
        product.categoryId,
        product.categoryName,
        product.affiliateUrl,
        source,
        'pending',
        affiliateLink.link_id,
      ]
    );

    if (observedPrice != null) {
      await recordPriceObservation(connection, {
        productId: String(product.productId), priceKrw: observedPrice,
        observedAt: new Date(), source: 'collection', context: source,
      });
    }

    await connection.query('COMMIT');

    console.info(`상품 저장: ${product.productName}`);
    return true;
  } catch (error) {
    try { await connection.query('ROLLBACK'); } catch {}
    console.error('상품 저장 오류:', error);
    return false;
  } finally {
    if (connection !== db && typeof connection.release === 'function') connection.release();
  }
}

/**
 * 목록형 API 한 번의 응답으로 이미 보유한 상품 여러 개의 실제 가격을 갱신한다.
 * 새 상품 추가 한도와 무관하며, 응답에 없는 상품 가격을 추정하지 않는다.
 */
export async function refreshExistingProductPrices(products, source, db = getDb()) {
  const candidates = [...new Map((Array.isArray(products) ? products : [])
    .map((product) => [String(product?.productId || ''), product])
    .filter(([productId, product]) => productId && normalizeObservedPrice(product?.productPrice) != null))
    .values()];
  if (candidates.length === 0) return 0;

  const connection = typeof db.connect === 'function' ? await db.connect() : db;
  try {
    await connection.query('BEGIN');
    const existing = await connection.query(
      'SELECT product_id FROM products WHERE product_id = ANY($1::varchar[])',
      [candidates.map((product) => String(product.productId))]
    );
    const existingIds = new Set(existing.rows.map((row) => String(row.product_id)));
    let refreshed = 0;
    for (const product of candidates) {
      const productId = String(product.productId);
      if (!existingIds.has(productId)) continue;
      const price = normalizeObservedPrice(product.productPrice);
      await connection.query(
        `UPDATE products SET product_price = $2, updated_at = NOW()
          WHERE product_id = $1`,
        [productId, price]
      );
      await connection.query(
        'UPDATE reviews SET product_price = $2, updated_at = NOW() WHERE product_id = $1',
        [productId, price]
      );
      await recordPriceObservation(connection, {
        productId, priceKrw: price, observedAt: new Date(), source: 'collection', context: source,
      });
      refreshed += 1;
    }
    await connection.query('COMMIT');
    if (refreshed > 0) console.info(`목록 응답 기존 상품 가격 갱신 (${source}): ${refreshed}개`);
    return refreshed;
  } catch (error) {
    try { await connection.query('ROLLBACK'); } catch {}
    throw error;
  } finally {
    if (connection !== db && typeof connection.release === 'function') connection.release();
  }
}

/**
 * 키워드로 상품 수집
 */
function rotateDaily(items) {
  if (!Array.isArray(items) || items.length < 2) return items || [];
  const kstDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
  const offset = Math.abs([...kstDate].reduce((sum, char) => sum + char.charCodeAt(0), 0)) % items.length;
  return [...items.slice(offset), ...items.slice(0, offset)];
}

function throwIfCoupangRateLimited(result) {
  if (result?.success !== false) return;
  if (!result.rateLimited && !/사용 횟수|횟수.*초과|rate.?limit|쿨다운/i.test(String(result.message || ''))) return;
  const error = new Error('쿠팡 API 사용 한도가 확인되어 남은 상품 수집을 중단합니다.');
  error.code = 'COUPANG_RATE_LIMITED';
  throw error;
}

async function collectByKeywords(client, keywords, maxProducts, {
  rotate = true, maxSourceCalls = 2,
} = {}) {
  let collected = 0;

  if (keywords.length === 0) {
    console.info('검색 키워드가 없습니다.');
    return 0;
  }

  if (maxProducts <= 0) {
    console.info(`키워드 수집 건너뜀: 할당량 부족 (${maxProducts})`);
    return 0;
  }

  const uniqueKeywords = [...new Set(keywords
    .map((keyword) => String(keyword || '').normalize('NFKC').replace(/\s+/g, ' ').trim().slice(0, 50))
    .filter((keyword) => keyword.length >= 2))];
  const selectedKeywords = (rotate ? rotateDaily(uniqueKeywords) : uniqueKeywords)
    .slice(0, Math.min(uniqueKeywords.length, maxProducts, maxSourceCalls));
  if (selectedKeywords.length === 0) return 0;
  const productsPerKeyword = Math.max(1, Math.ceil(maxProducts / selectedKeywords.length));
  const candidateLimit = Math.min(10, Math.max(5, productsPerKeyword * 5));

  for (const keyword of selectedKeywords) {
    if (collected >= maxProducts) break;

    try {
      const result = await client.searchProducts(keyword, candidateLimit);

      if (!result.success) {
        throwIfCoupangRateLimited(result);
        console.warn(`키워드 검색 실패 (${keyword}): ${result.message}`);
        continue;
      }

      await refreshExistingProductPrices(result.products, `keyword:${keyword}`);

      const products = result.products.slice(0, candidateLimit);
      if (products.length === 0) continue;

      let keywordCollected = 0;
      for (const product of products) {
        if (collected >= maxProducts || keywordCollected >= productsPerKeyword) break;

        // productUrl은 이미 제휴 링크이므로 그대로 사용
        const saved = await saveProduct(
          { ...product, affiliateUrl: product.productUrl },
          `keyword:${keyword}`,
          client
        );

        if (saved) {
          collected++;
          keywordCollected++;
        }
      }
    } catch (error) {
      if (error.code === 'COUPANG_RATE_LIMITED') throw error;
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
      throwIfCoupangRateLimited(result);
      console.warn(`골드박스 조회 실패: ${result.message}`);
      return 0;
    }

    await refreshExistingProductPrices(result.products, 'goldbox');

    const products = result.products.slice(0, 50);
    if (products.length === 0) return 0;

    let collected = 0;
    for (const product of products) {
      if (collected >= maxProducts) break;
      // productUrl은 이미 제휴 링크이므로 그대로 사용
      const saved = await saveProduct(
        { ...product, affiliateUrl: product.productUrl },
        'goldbox',
        client
      );
      if (saved) collected++;
    }

    console.info(`골드박스 수집 완료: ${collected}개`);
    return collected;
  } catch (error) {
    if (error.code === 'COUPANG_RATE_LIMITED') throw error;
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
  const selectedBrands = rotateDaily([...new Set(brands)]).slice(0, Math.min(brands.length, maxProducts, 2));
  const productsPerBrand = Math.ceil(maxProducts / selectedBrands.length);

  for (const brandId of selectedBrands) {
    if (collected >= maxProducts) break;

    try {
      const result = await client.getCoupangPLBrandProducts(brandId, 100);

      if (!result.success) {
        throwIfCoupangRateLimited(result);
        console.warn(`쿠팡 PL 브랜드 ${brandId} 조회 실패: ${result.message}`);
        continue;
      }

      await refreshExistingProductPrices(result.products, `coupangPL:${brandId}`);

      const products = result.products.slice(0, 20);
      if (products.length === 0) continue;

      let brandCollected = 0;
      for (const product of products) {
        if (collected >= maxProducts || brandCollected >= productsPerBrand) break;

        // productUrl은 이미 제휴 링크이므로 그대로 사용
        const saved = await saveProduct(
          { ...product, affiliateUrl: product.productUrl },
          `coupangPL:${brandId}`,
          client
        );

        if (saved) {
          collected++;
          brandCollected++;
        }
      }
    } catch (error) {
      if (error.code === 'COUPANG_RATE_LIMITED') throw error;
      console.error(`쿠팡 PL 브랜드 ${brandId} 수집 오류:`, error);
    }
  }

  console.info(`쿠팡 PL 수집 완료: ${collected}개`);
  return collected;
}

/**
 * 카테고리별 베스트 상품 수집
 */
async function collectByCategories(client, categories, maxProducts, { maxSourceCalls = 6 } = {}) {
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

  const selectedCategories = rotateDaily(enabledCategories)
    .slice(0, Math.min(enabledCategories.length, maxProducts, maxSourceCalls));
  const productsPerCategory = Math.max(1, Math.ceil(maxProducts / selectedCategories.length));
  const candidateLimit = 100;

  for (const category of selectedCategories) {
    if (collected >= maxProducts) break;

    try {
      const result = await client.getBestProducts(category.id, candidateLimit);

      if (!result.success) {
        throwIfCoupangRateLimited(result);
        console.warn(`카테고리 조회 실패 (${category.name}): ${result.message}`);
        continue;
      }

      await refreshExistingProductPrices(result.products, `category:${category.id}`);

      const products = result.products.slice(0, candidateLimit);
      if (products.length === 0) continue;

      let categoryCollected = 0;
      for (const product of products) {
        if (collected >= maxProducts || categoryCollected >= productsPerCategory) break;

        // productUrl은 이미 제휴 링크이므로 그대로 사용
        const saved = await saveProduct(
          {
            ...product,
            categoryId: category.id,
            categoryName: category.name,
            affiliateUrl: product.productUrl,
          },
          `category:${category.id}`,
          client
        );

        if (saved) {
          collected++;
          categoryCollected++;
        }
      }
    } catch (error) {
      if (error.code === 'COUPANG_RATE_LIMITED') throw error;
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

export async function runDiscoveryCollection(client, settings, requestedMaxProducts, db = getDb()) {
  const maxProducts = Math.min(Math.max(Number.parseInt(requestedMaxProducts, 10) || 100, 1), 200);
  const quotas = {
    goldbox: Math.max(1, Math.floor(maxProducts * 0.2)),
    categories: Math.max(1, Math.floor(maxProducts * 0.5)),
    searchDemand: Math.max(1, Math.floor(maxProducts * 0.2)),
  };
  quotas.curated = Math.max(0, maxProducts - quotas.goldbox - quotas.categories - quotas.searchDemand);

  let totalCollected = 0;
  const stats = { goldbox: 0, categories: 0, searchDemand: 0, keywords: 0, coupangPL: 0 };

  if (settings.topics?.goldboxEnabled ?? true) {
    stats.goldbox = await collectGoldbox(client, quotas.goldbox);
    totalCollected += stats.goldbox;
  }

  const categories = settings.topics?.categories || [];
  if (categories.length > 0) {
    stats.categories = await collectByCategories(client, categories, quotas.categories);
    totalCollected += stats.categories;
  }

  const demandKeywords = await getPopularSearchDemandKeywords(db, {
    days: 14, limit: quotas.searchDemand, minimumSearches: 2,
  });
  if (demandKeywords.length > 0) {
    stats.searchDemand = await collectByKeywords(
      client, demandKeywords, quotas.searchDemand, { rotate: false, maxSourceCalls: 2 }
    );
    totalCollected += stats.searchDemand;
  }

  const curatedKeywords = settings.topics?.keywords || [];
  const keywordCapacity = Math.min(
    maxProducts - totalCollected,
    quotas.curated + Math.max(0, quotas.searchDemand - stats.searchDemand)
  );
  if (curatedKeywords.length > 0 && keywordCapacity > 0) {
    stats.keywords = await collectByKeywords(
      client, curatedKeywords, keywordCapacity, { maxSourceCalls: 1 }
    );
    totalCollected += stats.keywords;
  }

  const coupangPLBrands = settings.topics?.coupangPLBrands || [];
  const remaining = maxProducts - totalCollected;
  if (remaining > 0 && coupangPLBrands.length > 0) {
    stats.coupangPL = await collectCoupangPL(client, coupangPLBrands, remaining);
    totalCollected += stats.coupangPL;
  }

  return { totalCollected, stats, quotas, demandKeywords };
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

    const collection = await runDiscoveryCollection(
      client, settings, settings.automation.maxProductsPerRun || 100
    );
    const totalCollected = collection.totalCollected;
    const collectionStats = collection.stats;

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
          { label: '실제 검색 수요', value: String(collectionStats.searchDemand) },
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

    const collection = await runDiscoveryCollection(client, settings, maxProducts);
    const totalCollected = collection.totalCollected;
    const collectionStats = collection.stats;

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
          { label: '실제 검색 수요', value: String(collectionStats.searchDemand) },
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
