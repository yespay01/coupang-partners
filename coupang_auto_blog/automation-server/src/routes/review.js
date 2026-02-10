import express from 'express';
import { getDb } from '../config/database.js';
import { notifySlack } from '../services/slack.js';

const router = express.Router();

/**
 * GET /api/reviews
 * 공개 리뷰 목록 조회 (published만)
 */
router.get('/reviews', async (req, res) => {
  try {
    const db = getDb();
    const { limit = 12, offset = 0 } = req.query;

    // published 상태의 리뷰만 조회
    const query = `
      SELECT * FROM reviews
      WHERE status = 'published'
      ORDER BY published_at DESC, created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const countQuery = `
      SELECT COUNT(*) as count FROM reviews
      WHERE status = 'published'
    `;

    const [reviewsResult, countResult] = await Promise.all([
      db.query(query, [parseInt(limit), parseInt(offset)]),
      db.query(countQuery),
    ]);

    const reviews = reviewsResult.rows.map(row => ({
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
      charCount: row.char_count,
      viewCount: row.view_count,
      createdAt: row.created_at?.toISOString(),
      updatedAt: row.updated_at?.toISOString(),
      publishedAt: row.published_at?.toISOString(),
    }));

    res.json({
      success: true,
      data: {
        reviews,
        totalCount: parseInt(countResult.rows[0].count),
        hasMore: parseInt(offset) + reviews.length < parseInt(countResult.rows[0].count),
      },
    });
  } catch (error) {
    console.error('공개 리뷰 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/review/generate
 * 리뷰 생성 (간소화 버전)
 */
router.post('/generate', async (req, res) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'productId가 필요합니다.',
      });
    }

    const db = getDb();

    // 상품 조회
    const productResult = await db.query(
      'SELECT * FROM products WHERE product_id = $1',
      [productId]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '상품을 찾을 수 없습니다.',
      });
    }

    const product = productResult.rows[0];

    // 간단한 리뷰 생성 (AI 통합은 나중에)
    const content = `${product.product_name}에 대한 리뷰입니다.`;

    // 리뷰 저장
    const reviewResult = await db.query(
      `INSERT INTO reviews (
        product_id, product_name, content, status, category, affiliate_url, author
      ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [
        product.product_id,
        product.product_name,
        content,
        'draft',
        product.category_name,
        product.affiliate_url,
        'auto-bot'
      ]
    );

    res.json({
      success: true,
      message: '리뷰가 생성되었습니다.',
      data: {
        reviewId: reviewResult.rows[0].id,
      },
    });
  } catch (error) {
    console.error('리뷰 생성 중 오류:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/review/publish
 * 리뷰 게시
 */
router.post('/publish', async (req, res) => {
  try {
    const { reviewId } = req.body;

    if (!reviewId) {
      return res.status(400).json({
        success: false,
        message: 'reviewId가 필요합니다.',
      });
    }

    const db = getDb();

    // slug 생성
    const slug = `review-${reviewId}-${Date.now()}`;

    // 상태 업데이트
    await db.query(
      'UPDATE reviews SET status = $1, slug = $2, published_at = NOW() WHERE id = $3',
      ['published', slug, reviewId]
    );

    res.json({
      success: true,
      message: '리뷰가 게시되었습니다.',
      data: {
        reviewId,
        slug,
      },
    });
  } catch (error) {
    console.error('리뷰 게시 중 오류:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
