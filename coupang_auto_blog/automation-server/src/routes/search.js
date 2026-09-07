import express from 'express';
import { searchProducts } from '../services/coupang/products.js';
import { getSystemSettings } from '../services/settingsService.js';
import { isValidPartnerId, validateProductApiProducts } from '../services/coupang/affiliateUrl.js';
import { getDb } from '../config/database.js';
import {
  buildPublicGoUrl,
  registerAffiliateLink,
} from '../services/coupang/affiliateLinkRegistry.js';
import { normalizeObservedPrice, recordPriceObservation } from '../services/priceObservations.js';
import { recordProductSearchDemand } from '../services/searchDemand.js';

const router = express.Router();
const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;
const SEARCH_CACHE_MAX_ENTRIES = 200;
const searchCache = new Map();

function getCachedSearch(key, now = Date.now()) {
  const cached = searchCache.get(key);
  if (!cached || cached.expiresAt <= now) {
    if (cached) searchCache.delete(key);
    return null;
  }
  return cached;
}

function setCachedSearch(key, result, observedAt = new Date()) {
  if (searchCache.size >= SEARCH_CACHE_MAX_ENTRIES) {
    searchCache.delete(searchCache.keys().next().value);
  }
  searchCache.set(key, {
    result,
    observedAt,
    expiresAt: observedAt.getTime() + SEARCH_CACHE_TTL_MS,
  });
}

export async function persistPopularSearchProduct(
  db, product, registeredLink, keyword, observedAt = new Date()
) {
  const connection = typeof db.connect === 'function' ? await db.connect() : db;
  try {
    await connection.query('BEGIN');
    await connection.query(
      `INSERT INTO products (
         product_id, product_name, product_price, product_image, product_url,
         category_id, category_name, affiliate_url, affiliate_link_id, source, status,
         search_demand_count, last_user_searched_at, created_at, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$5,$8,'search_demand','pending',1,NOW(),NOW(),NOW())
       ON CONFLICT (product_id) DO UPDATE SET
         product_name = COALESCE(EXCLUDED.product_name, products.product_name),
         product_price = COALESCE(EXCLUDED.product_price, products.product_price),
         product_image = COALESCE(EXCLUDED.product_image, products.product_image),
         product_url = EXCLUDED.product_url,
         affiliate_url = EXCLUDED.affiliate_url,
         affiliate_link_id = EXCLUDED.affiliate_link_id,
         category_id = COALESCE(EXCLUDED.category_id, products.category_id),
         category_name = COALESCE(EXCLUDED.category_name, products.category_name),
         search_demand_count = products.search_demand_count + 1,
         last_user_searched_at = NOW(),
         updated_at = NOW()`,
      [
        String(product.productId), product.productName || null,
        normalizeObservedPrice(product.productPrice), product.productImage || null,
        product.productUrl, product.categoryId || null, product.categoryName || null,
        registeredLink.link_id,
      ]
    );
    const price = normalizeObservedPrice(product.productPrice);
    if (price != null) {
      await recordPriceObservation(connection, {
        productId: String(product.productId), priceKrw: price,
        observedAt, source: 'collection',
        context: `public_search:${String(keyword).slice(0, 50)}`,
      });
    }
    await connection.query('COMMIT');
  } catch (error) {
    try { await connection.query('ROLLBACK'); } catch {}
    throw error;
  } finally {
    if (connection !== db && typeof connection.release === 'function') connection.release();
  }
}

async function searchLocalCatalog(db, keyword, limit, partnerId) {
  const escaped = keyword.replace(/[\\%_]/g, '\\$&');
  const result = await db.query(
    `SELECT p.product_id, p.product_name, p.product_image, p.category_name,
            COALESCE(latest.price_krw, p.product_price) AS product_price,
            al.link_id
       FROM products p
       JOIN affiliate_links al ON al.link_id = p.affiliate_link_id
       LEFT JOIN LATERAL (
         SELECT po.price_krw
           FROM price_observations po
          WHERE po.product_id = p.product_id
          ORDER BY po.observed_at DESC
          LIMIT 1
       ) latest ON TRUE
      WHERE p.product_name ILIKE ('%' || $1 || '%') ESCAPE '\\'
        AND al.is_active = TRUE
        AND al.validation_status = 'verified'
        AND al.partner_tracking_code = $3
      ORDER BY p.last_user_searched_at DESC NULLS LAST,
               p.search_demand_count DESC, p.updated_at DESC
      LIMIT $2`,
    [escaped, limit, partnerId]
  );
  return result.rows.map((row) => ({
    productId: String(row.product_id),
    productName: row.product_name,
    productPrice: row.product_price == null ? null : Number(row.product_price),
    productImage: row.product_image || null,
    categoryName: row.category_name || null,
    affiliateLink: {
      linkId: String(row.link_id),
      goUrl: buildPublicGoUrl(String(row.link_id)),
    },
  }));
}

/** 공개 상품 검색은 목적지 원문 대신 중앙 /go 계약만 노출한다. */
export function mapPublicSearchProduct(product, registeredLink) {
  const linkId = registeredLink?.link_id ? String(registeredLink.link_id) : null;
  const goUrl = linkId ? buildPublicGoUrl(linkId) : null;
  if (!goUrl) {
    const error = new Error('중앙 제휴 링크 ID가 올바르지 않습니다.');
    error.status = 502;
    throw error;
  }

  const { productUrl: _productUrl, affiliateUrl: _affiliateUrl, ...publicProduct } = product;
  return {
    ...publicProduct,
    affiliateLink: { linkId, goUrl },
  };
}

/**
 * GET /api/search
 * 쿠팡 상품 실시간 검색 (공개 API)
 */
router.get('/search', async (req, res) => {
  try {
    const { keyword, limit = 10 } = req.query;

    if (!keyword || !keyword.trim()) {
      return res.status(400).json({ success: false, message: '검색어를 입력해주세요.' });
    }
    const cleanKeyword = String(keyword).normalize('NFKC').replace(/\s+/g, ' ').trim();
    if (cleanKeyword.length < 2 || cleanKeyword.length > 50) {
      return res.status(400).json({ success: false, message: '검색어는 2자에서 50자까지 입력해주세요.' });
    }

    // 쿠팡 API limit 범위: 1~100 (기본값 10)
    const safeLimit = Math.min(Math.max(parseInt(limit) || 10, 1), 100);

    const settings = await getSystemSettings();
    const { accessKey, secretKey, partnerId, subId } = settings.coupang || {};

    if (!accessKey || !secretKey || !isValidPartnerId(partnerId)) {
      return res.status(503).json({ success: false, message: '쿠팡 API가 설정되지 않았습니다.' });
    }

    let demand = { recorded: false, normalizedKeyword: null, rollingCount: 0 };
    try {
      demand = await recordProductSearchDemand(getDb(), cleanKeyword);
    } catch (error) {
      console.warn('공개 상품 검색 수요 기록 실패:', error.message);
    }

    const cacheKey = `${cleanKeyword}:${safeLimit}`;
    const cached = getCachedSearch(cacheKey);
    const observedAt = cached?.observedAt || new Date();
    const result = cached?.result || await searchProducts(
      { keyword: cleanKeyword, limit: safeLimit, subId },
      { accessKey, secretKey }
    );

    if (!result.success) {
      const fallbackProducts = await searchLocalCatalog(getDb(), cleanKeyword, safeLimit, partnerId);
      if (fallbackProducts.length > 0) {
        return res.json({
          success: true,
          data: {
            products: fallbackProducts,
            totalCount: fallbackProducts.length,
            keyword: cleanKeyword,
            catalogEligible: true,
            source: 'catalog_fallback',
            notice: '실시간 검색 제한으로 보유 상품의 최근 실제 관측 가격을 표시합니다.',
          },
        });
      }
      return res.status(502).json({ success: false, message: result.message || '상품 검색 실패' });
    }
    if (!cached) setCachedSearch(cacheKey, result, observedAt);

    // productUrl은 이미 제휴 파라미터가 포함된 제휴 링크이므로 딥링크 변환 불필요

    const sourceProducts = result.products || [];
    const { validProducts } = validateProductApiProducts(sourceProducts, partnerId);
    const products = await Promise.all(validProducts.map(async (product, index) => {
      const link = await registerAffiliateLink(getDb(), {
        productId: product.productId,
        destinationUrl: product.productUrl,
        partnerId,
        subId,
        linkSource: 'product_api',
      });
      // 첫 검색부터 사용자가 본 상품과 실제 응답 가격을 저장한다. 추가 API 호출은 없다.
      if (index < safeLimit) {
        try {
          await persistPopularSearchProduct(
            getDb(), product, link, demand.normalizedKeyword || cleanKeyword, observedAt
          );
        } catch (error) {
          console.warn('반복 검색 상품 카탈로그 반영 실패:', error.message);
        }
      }
      return mapPublicSearchProduct(product, link);
    }));

    if (sourceProducts.length > 0 && products.length === 0) {
      return res.status(502).json({
        success: false,
        message: '쿠팡 제휴 링크의 Partner ID를 검증할 수 없습니다.',
      });
    }

    res.json({
      success: true,
      data: {
        products,
        totalCount: result.totalCount || products.length,
        keyword: cleanKeyword,
        catalogEligible: true,
        source: cached ? 'coupang_cache' : 'coupang_live',
      },
    });
  } catch (error) {
    console.error('상품 검색 오류:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
