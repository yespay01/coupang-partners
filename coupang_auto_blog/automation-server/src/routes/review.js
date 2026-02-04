import express from 'express';
import { getDb } from '../config/database.js';
import { notifySlack } from '../services/slack.js';

const router = express.Router();

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
