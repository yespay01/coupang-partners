import express from 'express';

import { getDb } from '../config/database.js';
import { getSystemSettings } from '../services/settingsService.js';
import {
  buildPublicGoUrl,
  validateRegisteredAffiliateLink,
} from '../services/coupang/affiliateLinkRegistry.js';
import { buildPriceHistoryDto } from '../services/priceObservations.js';
import { logger } from '../utils/logger.js';

const router = express.Router();
const PRODUCT_ID_PATTERN = /^[A-Za-z0-9:_-]{1,255}$/;
const PRODUCT_SITEMAP_DEFAULT_LIMIT = 45000;

export function parseProductSitemapPagination(limitValue, offsetValue) {
  const parsedLimit = /^\d{1,5}$/.test(String(limitValue ?? ''))
    ? Number(limitValue)
    : PRODUCT_SITEMAP_DEFAULT_LIMIT;
  const parsedOffset = /^\d{1,6}$/.test(String(offsetValue ?? ''))
    ? Number(offsetValue)
    : 0;
  return {
    limit: Math.min(Math.max(parsedLimit, 1), PRODUCT_SITEMAP_DEFAULT_LIMIT),
    offset: Math.min(Math.max(parsedOffset, 0), 100000),
  };
}

export async function loadProductSitemapRows(db, currentPartnerId, pagination = {}) {
  if (!currentPartnerId) return { products: [], totalCount: 0 };
  const { limit, offset } = parseProductSitemapPagination(
    pagination.limit,
    pagination.offset
  );
  const result = await db.query(
    `SELECT p.product_id, p.product_image, p.updated_at,
            COUNT(*) OVER()::int AS total_count
      FROM products p
      JOIN affiliate_links al ON al.link_id = p.affiliate_link_id
      WHERE EXISTS (
        SELECT 1 FROM price_observations po WHERE po.product_id = p.product_id
      )
        AND p.product_name IS NOT NULL AND p.product_name <> ''
        AND al.is_active = TRUE
        AND al.validation_status = 'verified'
        AND al.partner_tracking_code = $1
      ORDER BY p.updated_at DESC, p.id DESC
      LIMIT $2 OFFSET $3`,
    [currentPartnerId, limit, offset]
  );
  return {
    products: result.rows.map((row) => ({
      productId: String(row.product_id),
      productImage: row.product_image || null,
      updatedAt: row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : row.updated_at || null,
    })),
    totalCount: Number(result.rows[0]?.total_count || 0),
  };
}

export function parsePriceHistoryDays(value = '90') {
  const raw = String(value);
  const days = /^\d{1,3}$/.test(raw) ? Number(raw) : Number.NaN;
  if (!Number.isInteger(days) || days < 1 || days > 365) {
    const error = new Error('days는 1일부터 365일까지 사용할 수 있습니다.');
    error.status = 400;
    throw error;
  }
  return days;
}

export function mapPublicProductSummary(row, currentPartnerId) {
  const registryLink = row.link_id ? {
    link_id: row.link_id,
    product_id: row.product_id,
    destination_url: row.destination_url,
    landing_url: row.landing_url,
    partner_tracking_code: row.partner_tracking_code,
    sub_id: row.sub_id,
    link_source: row.link_source,
    validation_status: row.validation_status,
    validation_reason: row.validation_reason,
    validated_at: row.validated_at,
    is_active: row.is_active,
  } : null;
  const validation = validateRegisteredAffiliateLink(registryLink, currentPartnerId);
  const linkId = registryLink?.link_id ? String(registryLink.link_id) : null;
  const goUrl = linkId ? buildPublicGoUrl(linkId) : null;
  return {
    productId: String(row.product_id),
    productName: row.product_name,
    currentPriceKrw: row.latest_price_krw == null ? null : Number(row.latest_price_krw),
    priceObservedAt: row.last_observed_at instanceof Date
      ? row.last_observed_at.toISOString()
      : row.last_observed_at || null,
    productImage: row.product_image || null,
    categoryId: row.category_id || null,
    categoryName: row.category_name || null,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
    affiliateLink: validation.valid && goUrl ? { linkId, goUrl } : undefined,
  };
}

export function mapPriceCoverage(row = {}) {
  const eligibleProductCount = Number(row.eligible_product_count || 0);
  const trackedProductCount = Number(row.tracked_product_count || 0);
  return {
    eligibleProductCount,
    trackedProductCount,
    untrackedProductCount: Math.max(eligibleProductCount - trackedProductCount, 0),
    observedTodayCount: Number(row.observed_today_count || 0),
    coveragePercent: eligibleProductCount > 0
      ? Number(((trackedProductCount / eligibleProductCount) * 100).toFixed(1))
      : 0,
  };
}

async function getCurrentPartnerId() {
  try {
    return (await getSystemSettings())?.coupang?.partnerId || null;
  } catch (error) {
    logger.warn('공개 상품 Partner ID 조회 실패', { message: error.message });
    return null;
  }
}

const PUBLIC_PRODUCT_SELECT = `
  SELECT p.product_id, p.product_name, p.product_image, p.category_id, p.category_name, p.updated_at,
         latest.price_krw AS latest_price_krw,
         latest.observed_at AS last_observed_at,
         al.link_id, al.destination_url, al.landing_url,
         al.partner_tracking_code, al.sub_id, al.link_source,
         al.validation_status, al.validation_reason, al.validated_at, al.is_active
    FROM products p
    LEFT JOIN LATERAL (
      SELECT po.price_krw, po.observed_at
        FROM price_observations po
       WHERE po.product_id = p.product_id
       ORDER BY po.observed_at DESC
       LIMIT 1
    ) latest ON TRUE
    LEFT JOIN affiliate_links al ON al.link_id = p.affiliate_link_id
`;

export async function loadPublicProductCategories(db, currentPartnerId) {
  if (!currentPartnerId) return [];
  const result = await db.query(
    `SELECT p.category_id, p.category_name,
            COUNT(DISTINCT p.product_id)::int AS product_count,
            MAX(p.updated_at) AS updated_at
       FROM products p
       JOIN affiliate_links al ON al.link_id = p.affiliate_link_id
      WHERE p.category_id IS NOT NULL AND p.category_id <> ''
        AND p.category_name IS NOT NULL AND p.category_name <> ''
        AND EXISTS (SELECT 1 FROM price_observations po WHERE po.product_id = p.product_id)
        AND al.is_active = TRUE
        AND al.validation_status = 'verified'
        AND al.partner_tracking_code = $1
      GROUP BY p.category_id, p.category_name
      HAVING COUNT(DISTINCT p.product_id) >= 3
      ORDER BY product_count DESC, p.category_name ASC
      LIMIT 100`,
    [currentPartnerId]
  );
  return result.rows.map((row) => ({
    categoryId: String(row.category_id),
    categoryName: row.category_name,
    productCount: Number(row.product_count),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at || null,
  }));
}

/** GET /api/products?limit=100 - 리뷰 본문과 분리된 공개 상품 목록 */
router.get('/products', async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 100, 1), 100);
    const offset = Math.min(Math.max(Number.parseInt(req.query.offset, 10) || 0, 0), 100000);
    const categoryId = String(req.query.categoryId || '').trim();
    if (categoryId && !PRODUCT_ID_PATTERN.test(categoryId)) {
      return res.status(400).json({ success: false, message: 'categoryId가 올바르지 않습니다.' });
    }
    const currentPartnerId = await getCurrentPartnerId();
    const categoryFilter = categoryId ? ' AND p.category_id = $3' : '';
    const observedFilter = categoryId
      ? ' AND EXISTS (SELECT 1 FROM price_observations listed_po WHERE listed_po.product_id = p.product_id)'
      : '';
    const listParams = categoryId ? [limit, offset, categoryId] : [limit, offset];
    const countCategoryFilter = categoryId ? ' AND p.category_id = $2' : '';
    const countParams = categoryId ? [currentPartnerId, categoryId] : [currentPartnerId];
    const [result, countResult] = await Promise.all([
      getDb().query(
        `${PUBLIC_PRODUCT_SELECT}
         WHERE p.product_name IS NOT NULL AND p.product_name <> ''
         ${categoryFilter}
         ${observedFilter}
         ORDER BY latest.observed_at DESC NULLS LAST, p.updated_at DESC, p.id DESC
         LIMIT $1 OFFSET $2`,
        listParams
      ),
      currentPartnerId
        ? getDb().query(
          `SELECT COUNT(DISTINCT p.product_id)::int AS eligible_product_count,
                  COUNT(DISTINCT p.product_id) FILTER (
                    WHERE po.product_id IS NOT NULL
                  )::int AS tracked_product_count,
                  COUNT(DISTINCT p.product_id) FILTER (
                    WHERE po.business_date_kst = (NOW() AT TIME ZONE 'Asia/Seoul')::date
                  )::int AS observed_today_count
             FROM products p
             JOIN affiliate_links al ON al.link_id = p.affiliate_link_id
             LEFT JOIN price_observations po ON po.product_id = p.product_id
            WHERE p.product_name IS NOT NULL AND p.product_name <> ''
              AND al.is_active = TRUE
              AND al.validation_status = 'verified'
              AND al.partner_tracking_code = $1
              ${countCategoryFilter}
              ${observedFilter}`,
          countParams
        )
        : Promise.resolve({ rows: [{}] }),
    ]);
    const products = result.rows
      .map((row) => mapPublicProductSummary(row, currentPartnerId))
      .filter((product) => product.affiliateLink);
    return res.json({
      success: true,
      data: {
        products,
        totalCount: Number(countResult.rows[0]?.eligible_product_count || 0),
        priceCoverage: mapPriceCoverage(countResult.rows[0]),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/** GET /api/products/categories - 검색엔진과 사용자가 탐색할 공개 카테고리 허브 */
router.get('/products/categories', async (_req, res) => {
  try {
    const currentPartnerId = await getCurrentPartnerId();
    const categories = await loadPublicProductCategories(getDb(), currentPartnerId);
    return res.json({ success: true, data: { categories } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/** GET /api/products/sitemap - Search sitemap용 검증 상품 목록 */
router.get('/products/sitemap', async (req, res) => {
  try {
    const currentPartnerId = await getCurrentPartnerId();
    const data = await loadProductSitemapRows(getDb(), currentPartnerId, req.query);
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/** 기존 리뷰 URL을 리뷰 본문 노출 없이 상품 팩트 페이지로 전환한다. */
router.get('/legacy/reviews/by-slug', async (req, res) => {
  try {
    const slug = String(req.query.slug || '');
    if (!slug || slug.length > 255 || /[\u0000-\u001f\u007f]/.test(slug)) {
      return res.status(400).json({ success: false, message: 'slug가 올바르지 않습니다.' });
    }
    const result = await getDb().query(
      `SELECT r.product_id
         FROM reviews r
         JOIN products p ON p.product_id = r.product_id
        WHERE r.slug = $1
        LIMIT 1`,
      [slug]
    );
    if (!result.rows[0]?.product_id) {
      return res.status(404).json({ success: false, message: '상품 연결 정보를 찾을 수 없습니다.' });
    }
    return res.json({ success: true, data: { productId: String(result.rows[0].product_id) } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/legacy/reviews/id/:id', async (req, res) => {
  try {
    if (!/^\d{1,12}$/.test(req.params.id)) {
      return res.status(400).json({ success: false, message: 'id가 올바르지 않습니다.' });
    }
    const result = await getDb().query(
      `SELECT r.product_id
         FROM reviews r
         JOIN products p ON p.product_id = r.product_id
        WHERE r.id = $1
        LIMIT 1`,
      [req.params.id]
    );
    if (!result.rows[0]?.product_id) {
      return res.status(404).json({ success: false, message: '상품 연결 정보를 찾을 수 없습니다.' });
    }
    return res.json({ success: true, data: { productId: String(result.rows[0].product_id) } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/** GET /api/products/:productId/summary */
router.get('/products/:productId/summary', async (req, res) => {
  try {
    const { productId } = req.params;
    if (!PRODUCT_ID_PATTERN.test(productId)) {
      return res.status(400).json({ success: false, message: 'productId가 올바르지 않습니다.' });
    }
    const currentPartnerId = await getCurrentPartnerId();
    const result = await getDb().query(
      `${PUBLIC_PRODUCT_SELECT}
       WHERE p.product_id = $1`,
      [productId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '상품을 찾을 수 없습니다.' });
    }
    return res.json({
      success: true,
      data: mapPublicProductSummary(result.rows[0], currentPartnerId),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/** GET /api/products/:productId/price-history?days=90 */
router.get('/products/:productId/price-history', async (req, res) => {
  try {
    const { productId } = req.params;
    if (!PRODUCT_ID_PATTERN.test(productId)) {
      return res.status(400).json({ success: false, message: 'productId가 올바르지 않습니다.' });
    }
    const days = parsePriceHistoryDays(req.query.days || '90');
    const result = await getDb().query(
      `SELECT business_date_kst, observed_at, price_krw, currency, observation_source
         FROM price_observations
        WHERE product_id = $1
          AND business_date_kst >= ((NOW() AT TIME ZONE 'Asia/Seoul')::date - ($2::int - 1))
        ORDER BY business_date_kst ASC`,
      [productId, days]
    );
    return res.json({ success: true, data: buildPriceHistoryDto(productId, result.rows) });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
});

export default router;
