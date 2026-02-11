import express from 'express';
import { getDb } from '../config/database.js';
import { notifySlack } from '../services/slack.js';
import { authenticateToken, requireAdmin } from '../config/auth.js';
import { invalidateSettingsCache } from '../services/settingsService.js';

const router = express.Router();

// 모든 admin 라우트에 인증 미들웨어 적용
router.use(authenticateToken);

// ==================== Reviews ====================

/**
 * GET /api/admin/reviews
 * 리뷰 목록 조회
 */
router.get('/reviews', async (req, res) => {
  try {
    const db = getDb();
    const { limit = 20, offset = 0, statuses, search, dateRange } = req.query;

    let query = 'SELECT * FROM reviews';
    let countQuery = 'SELECT COUNT(*) as count FROM reviews';
    const conditions = [];
    const params = [];
    let paramIdx = 1;

    if (statuses) {
      const statusList = statuses.split(',');
      conditions.push(`status = ANY($${paramIdx}::text[])`);
      params.push(statusList);
      paramIdx++;
    }

    if (search) {
      conditions.push(`(product_name ILIKE $${paramIdx} OR content ILIKE $${paramIdx} OR title ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }

    if (dateRange && dateRange !== 'all') {
      const hours = dateRange === '24h' ? 24 : dateRange === '7d' ? 168 : dateRange === '30d' ? 720 : 0;
      if (hours > 0) {
        conditions.push(`created_at >= NOW() - INTERVAL '${hours} hours'`);
      }
    }

    const where = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';
    query += where + ` ORDER BY created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
    countQuery += where;

    const countParams = [...params];
    params.push(parseInt(limit), parseInt(offset));

    const [reviewsResult, countResult] = await Promise.all([
      db.query(query, params),
      db.query(countQuery, countParams),
    ]);

    res.json({
      success: true,
      data: {
        reviews: reviewsResult.rows.map(mapReviewRow),
        totalCount: parseInt(countResult.rows[0].count),
        hasMore: parseInt(offset) + reviewsResult.rows.length < parseInt(countResult.rows[0].count),
      },
    });
  } catch (error) {
    console.error('리뷰 목록 조회 오류:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/admin/reviews/:id
 * 리뷰 상세 조회
 */
router.get('/reviews/:id', async (req, res) => {
  try {
    const db = getDb();
    const result = await db.query('SELECT * FROM reviews WHERE id = $1', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '리뷰를 찾을 수 없습니다.' });
    }

    res.json({ success: true, data: mapReviewRow(result.rows[0]) });
  } catch (error) {
    console.error('리뷰 조회 오류:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/admin/reviews/:id
 * 리뷰 수정
 */
router.put('/reviews/:id', async (req, res) => {
  try {
    const db = getDb();
    const { content, status, productName, category, affiliateUrl } = req.body;
    const fields = [];
    const params = [];
    let idx = 1;

    if (content !== undefined) { fields.push(`content = $${idx++}`); params.push(content); }
    if (status !== undefined) { fields.push(`status = $${idx++}`); params.push(status); }
    if (productName !== undefined) { fields.push(`product_name = $${idx++}`); params.push(productName); }
    if (category !== undefined) { fields.push(`category = $${idx++}`); params.push(category); }
    if (affiliateUrl !== undefined) { fields.push(`affiliate_url = $${idx++}`); params.push(affiliateUrl); }

    if (status === 'published') {
      fields.push(`published_at = NOW()`);
    }

    fields.push('updated_at = NOW()');
    params.push(req.params.id);

    const result = await db.query(
      `UPDATE reviews SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '리뷰를 찾을 수 없습니다.' });
    }

    res.json({ success: true, data: mapReviewRow(result.rows[0]) });
  } catch (error) {
    console.error('리뷰 수정 오류:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/admin/reviews/:id
 * 리뷰 삭제
 */
router.delete('/reviews/:id', async (req, res) => {
  try {
    const db = getDb();
    const result = await db.query('DELETE FROM reviews WHERE id = $1 RETURNING id', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '리뷰를 찾을 수 없습니다.' });
    }

    res.json({ success: true, message: '리뷰가 삭제되었습니다.' });
  } catch (error) {
    console.error('리뷰 삭제 오류:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== Products ====================

/**
 * GET /api/admin/products
 * 상품 목록 조회
 */
router.get('/products', async (req, res) => {
  try {
    const db = getDb();
    const { limit = 20, offset = 0, statuses, search, source, dateRange } = req.query;

    let query = 'SELECT * FROM products';
    let countQuery = 'SELECT COUNT(*) as count FROM products';
    const conditions = [];
    const params = [];
    let paramIdx = 1;

    if (statuses) {
      const statusList = statuses.split(',');
      conditions.push(`status = ANY($${paramIdx}::text[])`);
      params.push(statusList);
      paramIdx++;
    }

    if (search) {
      conditions.push(`(product_name ILIKE $${paramIdx} OR product_id ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }

    if (source) {
      conditions.push(`source ILIKE $${paramIdx}`);
      params.push(`%${source}%`);
      paramIdx++;
    }

    if (dateRange && dateRange !== 'all') {
      const hours = dateRange === '24h' ? 24 : dateRange === '7d' ? 168 : dateRange === '30d' ? 720 : 0;
      if (hours > 0) {
        conditions.push(`created_at >= NOW() - INTERVAL '${hours} hours'`);
      }
    }

    const where = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';
    query += where + ` ORDER BY created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
    countQuery += where;

    const countParams = [...params];
    params.push(parseInt(limit), parseInt(offset));

    const [productsResult, countResult] = await Promise.all([
      db.query(query, params),
      db.query(countQuery, countParams),
    ]);

    res.json({
      success: true,
      data: {
        products: productsResult.rows.map(mapProductRow),
        totalCount: parseInt(countResult.rows[0].count),
        hasMore: parseInt(offset) + productsResult.rows.length < parseInt(countResult.rows[0].count),
      },
    });
  } catch (error) {
    console.error('상품 목록 조회 오류:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/admin/products/stats
 * 상품 통계
 */
router.get('/products/stats', async (req, res) => {
  try {
    const db = getDb();

    const [totalResult, sourceResult, statusResult] = await Promise.all([
      db.query('SELECT COUNT(*) as count FROM products'),
      db.query(`
        SELECT
          CASE
            WHEN source LIKE 'keyword:%' THEN 'keyword'
            WHEN source LIKE 'category:%' THEN 'category'
            WHEN source LIKE 'coupangPL:%' THEN 'coupangPL'
            WHEN source = 'goldbox' THEN 'goldbox'
            ELSE 'other'
          END as source_group,
          COUNT(*) as count
        FROM products
        GROUP BY source_group
      `),
      db.query('SELECT status, COUNT(*) as count FROM products GROUP BY status'),
    ]);

    const bySource = {};
    sourceResult.rows.forEach(row => { bySource[row.source_group] = parseInt(row.count); });

    const byStatus = {};
    statusResult.rows.forEach(row => { byStatus[row.status] = parseInt(row.count); });

    res.json({
      success: true,
      data: {
        total: parseInt(totalResult.rows[0].count),
        bySource,
        byStatus,
      },
    });
  } catch (error) {
    console.error('상품 통계 조회 오류:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== Logs ====================

/**
 * GET /api/admin/logs
 * 로그 목록 조회
 */
router.get('/logs', async (req, res) => {
  try {
    const db = getDb();
    const { limit = 50, offset = 0, levels, search, dateRange } = req.query;

    let query = 'SELECT * FROM logs';
    let countQuery = 'SELECT COUNT(*) as count FROM logs';
    const conditions = [];
    const params = [];
    let paramIdx = 1;

    if (levels) {
      const levelList = levels.split(',');
      conditions.push(`level = ANY($${paramIdx}::text[])`);
      params.push(levelList);
      paramIdx++;
    }

    if (search) {
      conditions.push(`(message ILIKE $${paramIdx} OR type ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }

    if (dateRange && dateRange !== 'all') {
      const hours = dateRange === '24h' ? 24 : dateRange === '7d' ? 168 : dateRange === '30d' ? 720 : 0;
      if (hours > 0) {
        conditions.push(`created_at >= NOW() - INTERVAL '${hours} hours'`);
      }
    }

    const where = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';
    query += where + ` ORDER BY created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
    countQuery += where;

    const countParams = [...params];
    params.push(parseInt(limit), parseInt(offset));

    const [logsResult, countResult] = await Promise.all([
      db.query(query, params),
      db.query(countQuery, countParams),
    ]);

    res.json({
      success: true,
      data: {
        logs: logsResult.rows.map(row => ({
          id: String(row.id),
          level: row.level || 'info',
          message: row.message,
          type: row.type,
          createdAt: row.created_at?.toISOString(),
          context: row.type || '',
          payload: row.payload,
        })),
        totalCount: parseInt(countResult.rows[0].count),
        hasMore: parseInt(offset) + logsResult.rows.length < parseInt(countResult.rows[0].count),
      },
    });
  } catch (error) {
    console.error('로그 목록 조회 오류:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/admin/logs/stats
 * 로그 통계 조회
 */
router.get('/logs/stats', async (req, res) => {
  try {
    const db = getDb();

    const [totalResult, byLevelResult, byTypeResult, byDateResult] = await Promise.all([
      db.query('SELECT COUNT(*) as count FROM logs'),
      db.query('SELECT level, COUNT(*) as count FROM logs GROUP BY level'),
      db.query('SELECT type, COUNT(*) as count FROM logs GROUP BY type'),
      db.query(`SELECT DATE(created_at) as date, COUNT(*) as count FROM logs
                WHERE created_at >= NOW() - INTERVAL '30 days'
                GROUP BY DATE(created_at) ORDER BY date DESC`),
    ]);

    const byLevel = {};
    byLevelResult.rows.forEach(row => { byLevel[row.level || 'unknown'] = parseInt(row.count); });

    const byType = {};
    byTypeResult.rows.forEach(row => { byType[row.type || 'unknown'] = parseInt(row.count); });

    const byDate = {};
    byDateResult.rows.forEach(row => { byDate[row.date.toISOString().split('T')[0]] = parseInt(row.count); });

    res.json({
      success: true,
      data: {
        total: parseInt(totalResult.rows[0].count),
        byLevel,
        byType,
        byDate,
      },
    });
  } catch (error) {
    console.error('로그 통계 조회 오류:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/admin/log
 * 프론트엔드에서 보내는 로그를 DB에 저장
 */
router.post('/log', async (req, res) => {
  try {
    const { level = 'info', message, context, type } = req.body;
    const db = getDb();

    await db.query(
      'INSERT INTO logs (level, message, type, payload) VALUES ($1, $2, $3, $4)',
      [level, message || '', type || context || 'frontend', req.body.payload ? JSON.stringify(req.body.payload) : null]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('로그 저장 오류:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== Earnings ====================

/**
 * GET /api/admin/earnings
 * 수익 지표 조회
 */
router.get('/earnings', async (req, res) => {
  try {
    const db = getDb();
    const reviewCount = await db.query("SELECT COUNT(*) as count FROM reviews WHERE status = 'published'");
    const viewCount = await db.query("SELECT COALESCE(SUM(view_count), 0) as total FROM reviews");

    res.json({
      success: true,
      data: [
        { id: '1', label: '발행된 리뷰', value: reviewCount.rows[0].count, trend: '' },
        { id: '2', label: '총 조회수', value: String(viewCount.rows[0].total), trend: '' },
      ],
    });
  } catch (error) {
    console.error('수익 조회 오류:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== Settings ====================

/**
 * GET /api/admin/settings
 * 시스템 설정 조회
 */
router.get('/settings', async (req, res) => {
  try {
    const db = getDb();
    const result = await db.query("SELECT value FROM settings WHERE key = 'system'");

    if (result.rows.length === 0) {
      return res.json({ success: true, data: {} });
    }

    res.json({ success: true, data: result.rows[0].value });
  } catch (error) {
    console.error('설정 조회 오류:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/admin/settings
 * 시스템 설정 업데이트
 */
router.put('/settings', requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const settings = req.body;

    await db.query(
      `INSERT INTO settings (key, value) VALUES ('system', $1::jsonb)
       ON CONFLICT (key) DO UPDATE SET value = settings.value || $1::jsonb, updated_at = NOW()`,
      [JSON.stringify(settings)]
    );

    // 설정 캐시 즉시 무효화 (다음 조회 시 DB에서 새로 로드)
    invalidateSettingsCache();

    res.json({ success: true, message: '설정이 업데이트되었습니다.' });
  } catch (error) {
    console.error('설정 업데이트 오류:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== Upload ====================

/**
 * POST /api/admin/upload
 * 파일 업로드 (placeholder)
 */
router.post('/upload', async (req, res) => {
  // TODO: MinIO 파일 업로드 구현
  res.status(501).json({ success: false, message: '파일 업로드는 아직 구현되지 않았습니다.' });
});

// ==================== Helper Functions ====================

function mapReviewRow(row) {
  return {
    id: String(row.id),
    productId: row.product_id,
    productName: row.product_name,
    title: row.title,
    content: row.content,
    slug: row.slug,
    status: row.status,
    category: row.category,
    affiliateUrl: row.affiliate_url,
    author: row.author,
    media: row.media,
    toneScore: row.tone_score ? parseFloat(row.tone_score) : undefined,
    charCount: row.char_count,
    viewCount: row.view_count,
    createdAt: row.created_at?.toISOString(),
    updatedAt: row.updated_at?.toISOString(),
    publishedAt: row.published_at?.toISOString(),
  };
}

function mapProductRow(row) {
  return {
    id: String(row.id),
    productId: row.product_id,
    productName: row.product_name,
    productPrice: row.product_price,
    productImage: row.product_image,
    productUrl: row.product_url,
    categoryId: row.category_id,
    categoryName: row.category_name,
    affiliateUrl: row.affiliate_url,
    source: row.source,
    status: row.status,
    createdAt: row.created_at?.toISOString(),
    updatedAt: row.updated_at?.toISOString(),
  };
}

/**
 * POST /api/admin/cleanup-logs
 * 오래된 로그 정리
 */
router.post('/cleanup-logs', async (req, res) => {
  try {
    const { daysToKeep = 30 } = req.body;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const db = getDb();

    // 삭제할 로그 수 조회
    const countResult = await db.query(
      'SELECT COUNT(*) as count FROM logs WHERE created_at < $1',
      [cutoffDate]
    );
    const deletedCount = parseInt(countResult.rows[0].count);

    // 오래된 로그 삭제
    await db.query(
      'DELETE FROM logs WHERE created_at < $1',
      [cutoffDate]
    );

    await notifySlack({
      route: 'cleanup',
      level: 'info',
      title: '로그 정리 완료',
      text: `${deletedCount}개의 오래된 로그가 삭제되었습니다.`,
      fields: [
        { label: '보관 기간', value: `${daysToKeep}일` },
        { label: '삭제된 로그', value: `${deletedCount}개` },
      ],
    });

    res.json({
      success: true,
      message: `${deletedCount}개의 로그가 삭제되었습니다.`,
      data: {
        deletedCount,
        cutoffDate: cutoffDate.toISOString(),
      },
    });
  } catch (error) {
    console.error('로그 정리 중 오류:', error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/admin/stats
 * 시스템 통계
 */
router.get('/stats', async (req, res) => {
  try {
    const db = getDb();

    const [productsResult, reviewsResult, logsResult] = await Promise.all([
      db.query('SELECT COUNT(*) as count FROM products'),
      db.query('SELECT COUNT(*) as count FROM reviews'),
      db.query('SELECT COUNT(*) as count FROM logs'),
    ]);

    const stats = {
      products: parseInt(productsResult.rows[0].count),
      reviews: parseInt(reviewsResult.rows[0].count),
      logs: parseInt(logsResult.rows[0].count),
      timestamp: new Date().toISOString(),
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('통계 조회 중 오류:', error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
