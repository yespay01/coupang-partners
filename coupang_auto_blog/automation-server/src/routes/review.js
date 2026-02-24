import express from 'express';
import { getDb } from '../config/database.js';
import { notifySlack } from '../services/slack.js';
import { getSystemSettings } from '../services/settingsService.js';
import { generateText } from '../services/aiProviders.js';
import { buildPromptFromSettings, validateReviewContentWithSettings, analyzeToneScore } from '../services/reviewUtils.js';
import { collectAllImages } from '../services/imageUtils.js';
import { logger, dbLog } from '../utils/logger.js';

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
 * GET /api/reviews/id/:id
 * 공개 리뷰 상세 조회 (ID 기반) + 조회수 증가
 * 반드시 /reviews/:slug 보다 먼저 등록해야 함
 */
router.get('/reviews/id/:id', async (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;

    const result = await db.query(
      `SELECT * FROM reviews WHERE id = $1 AND status = 'published'`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '리뷰를 찾을 수 없습니다.',
      });
    }

    const row = result.rows[0];

    // 조회수 증가 (비동기, 실패해도 무시)
    db.query(
      'UPDATE reviews SET view_count = COALESCE(view_count, 0) + 1 WHERE id = $1',
      [row.id]
    ).catch(err => console.error('조회수 증가 실패:', err));

    const review = {
      id: String(row.id),
      productId: row.product_id,
      productName: row.product_name,
      productPrice: row.product_price,
      productImage: row.product_image,
      title: row.title,
      content: row.content,
      slug: row.slug,
      status: row.status,
      category: row.category,
      affiliateUrl: row.affiliate_url,
      author: row.author,
      media: row.media,
      charCount: row.char_count,
      viewCount: (row.view_count || 0) + 1,
      seoMeta: row.seo_meta,
      createdAt: row.created_at?.toISOString(),
      updatedAt: row.updated_at?.toISOString(),
      publishedAt: row.published_at?.toISOString(),
    };

    res.json({ success: true, data: review });
  } catch (error) {
    console.error('리뷰 ID 상세 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/reviews/by-slug?slug=...
 * 공개 리뷰 상세 조회 (slug 쿼리 파라미터 기반) - 한글 slug 인코딩 문제 방지
 */
router.get('/reviews/by-slug', async (req, res) => {
  try {
    const db = getDb();
    const { slug } = req.query;

    if (!slug) {
      return res.status(400).json({ success: false, message: 'slug가 필요합니다.' });
    }

    // URL 인코딩된 slug 디코딩 (한글 slug가 %EC%B2%9C... 형태로 전달될 수 있음)
    const decodedSlug = decodeURIComponent(slug);

    const result = await db.query(
      `SELECT * FROM reviews WHERE slug = $1 AND status = 'published'`,
      [decodedSlug]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '리뷰를 찾을 수 없습니다.' });
    }

    const row = result.rows[0];

    db.query(
      'UPDATE reviews SET view_count = COALESCE(view_count, 0) + 1 WHERE id = $1',
      [row.id]
    ).catch(err => console.error('조회수 증가 실패:', err));

    const review = {
      id: String(row.id),
      productId: row.product_id,
      productName: row.product_name,
      productPrice: row.product_price,
      productImage: row.product_image,
      title: row.title,
      content: row.content,
      slug: row.slug,
      status: row.status,
      category: row.category,
      affiliateUrl: row.affiliate_url,
      author: row.author,
      media: row.media,
      charCount: row.char_count,
      viewCount: (row.view_count || 0) + 1,
      seoMeta: row.seo_meta,
      createdAt: row.created_at?.toISOString(),
      updatedAt: row.updated_at?.toISOString(),
      publishedAt: row.published_at?.toISOString(),
    };

    res.json({ success: true, data: review });
  } catch (error) {
    console.error('리뷰 slug 조회 오류:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/reviews/:slug
 * 공개 리뷰 상세 조회 (slug 기반) + 조회수 증가
 */
router.get('/reviews/:slug', async (req, res) => {
  try {
    const db = getDb();
    const { slug } = req.params;

    const result = await db.query(
      `SELECT * FROM reviews WHERE slug = $1 AND status = 'published'`,
      [slug]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '리뷰를 찾을 수 없습니다.',
      });
    }

    const row = result.rows[0];

    // 조회수 증가 (비동기, 실패해도 무시)
    db.query(
      'UPDATE reviews SET view_count = COALESCE(view_count, 0) + 1 WHERE id = $1',
      [row.id]
    ).catch(err => console.error('조회수 증가 실패:', err));

    const review = {
      id: String(row.id),
      productId: row.product_id,
      productName: row.product_name,
      productPrice: row.product_price,
      productImage: row.product_image,
      title: row.title,
      content: row.content,
      slug: row.slug,
      status: row.status,
      category: row.category,
      affiliateUrl: row.affiliate_url,
      author: row.author,
      media: row.media,
      charCount: row.char_count,
      viewCount: (row.view_count || 0) + 1,
      seoMeta: row.seo_meta,
      createdAt: row.created_at?.toISOString(),
      updatedAt: row.updated_at?.toISOString(),
      publishedAt: row.published_at?.toISOString(),
    };

    res.json({ success: true, data: review });
  } catch (error) {
    console.error('리뷰 상세 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/review/generate
 * AI 기반 리뷰 생성 파이프라인
 */
router.post('/generate', async (req, res) => {
  const db = getDb();
  let product = null;

  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'productId가 필요합니다.',
      });
    }

    // 1. 상품 조회
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

    product = productResult.rows[0];

    // 상품 상태를 processing으로 변경
    await db.query(
      "UPDATE products SET status = 'processing', updated_at = NOW() WHERE product_id = $1",
      [productId]
    );

    await dbLog('review-generate', 'info', `리뷰 생성 시작: ${product.product_name}`, {
      productId,
      productName: product.product_name,
    });

    // 2. 시스템 설정 로드
    const settings = await getSystemSettings();

    // 3. 프롬프트 설정 결정: 기본 템플릿이 있으면 템플릿 값 사용
    let promptSettings = settings.prompt;
    let templateSource = '시스템 설정';

    if (settings.prompt?.templates?.length > 0) {
      const defaultTemplate = settings.prompt.templates.find(t => t.isDefault);
      if (defaultTemplate) {
        promptSettings = {
          ...settings.prompt,
          systemPrompt: defaultTemplate.systemPrompt || settings.prompt.systemPrompt,
          reviewTemplate: defaultTemplate.reviewTemplate || settings.prompt.reviewTemplate,
          additionalGuidelines: defaultTemplate.additionalGuidelines || settings.prompt.additionalGuidelines,
          minLength: defaultTemplate.minLength ?? settings.prompt.minLength,
          maxLength: defaultTemplate.maxLength ?? settings.prompt.maxLength,
          toneScoreThreshold: defaultTemplate.toneScoreThreshold ?? settings.prompt.toneScoreThreshold,
        };
        templateSource = `템플릿: ${defaultTemplate.name}`;
      }
    }

    logger.info('=== 적용된 설정 ===', {
      ai: {
        provider: settings.ai.defaultProvider,
        model: settings.ai[settings.ai.defaultProvider]?.model,
        hasApiKey: !!settings.ai[settings.ai.defaultProvider]?.apiKey,
        temperature: settings.ai.temperature,
        maxTokens: settings.ai.maxTokens,
      },
      prompt: {
        source: templateSource,
        systemPrompt: promptSettings.systemPrompt?.substring(0, 50) + '...',
        reviewTemplate: promptSettings.reviewTemplate?.substring(0, 50) + '...',
        minLength: promptSettings.minLength,
        maxLength: promptSettings.maxLength,
        toneScoreThreshold: promptSettings.toneScoreThreshold,
      },
      images: {
        stockEnabled: settings.images?.stockImages?.enabled,
        stockProvider: settings.images?.stockImages?.provider,
        aiEnabled: settings.images?.aiImages?.enabled,
        coupangDetailEnabled: settings.images?.coupangDetailImages?.enabled,
      },
    });

    // 4. 프롬프트 빌드
    const productForPrompt = {
      name: product.product_name,
      productName: product.product_name,
      category: product.category_name,
      categoryName: product.category_name,
    };
    const userPrompt = buildPromptFromSettings(productForPrompt, promptSettings);
    logger.info('빌드된 프롬프트:', userPrompt);

    // 5. AI 리뷰 생성
    const aiResult = await generateText(settings.ai, userPrompt, promptSettings.systemPrompt);
    const reviewText = aiResult.text;
    logger.info('AI 리뷰 생성 완료', {
      provider: aiResult.provider,
      model: aiResult.model,
      textLength: reviewText.length,
      usage: aiResult.usage,
    });

    // 6. 품질 검증 (실패 시 에러 throw)
    let toneScore, charCount;
    try {
      const validation = validateReviewContentWithSettings(reviewText, promptSettings);
      toneScore = validation.toneScore;
      charCount = validation.charCount;
    } catch (validationError) {
      // 검증 실패해도 리뷰는 저장하되 경고 로그
      logger.warn('리뷰 품질 검증 경고 (저장은 진행):', validationError.message);
      toneScore = analyzeToneScore(reviewText);
      charCount = Array.from(reviewText).length;
      await dbLog('review-generate', 'warn', `리뷰 품질 검증 경고: ${validationError.message}`, {
        productId,
        toneScore,
        charCount,
      });
    }

    // 6. 이미지 수집
    const productForImages = {
      productId: product.product_id,
      name: product.product_name,
      productName: product.product_name,
      category: product.category_name,
      categoryName: product.category_name,
      categoryId: product.category_id,
      productImage: product.product_image,
      productUrl: product.product_url,
    };
    const media = await collectAllImages(productForImages, settings);
    logger.info('이미지 수집 완료', { imageCount: media.length });

    // 7. DB에 리뷰 저장
    const reviewResult = await db.query(
      `INSERT INTO reviews (
        product_id, product_name, content, status, category,
        affiliate_url, media, tone_score, char_count,
        product_price, product_image
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
      [
        product.product_id,
        product.product_name,
        reviewText,
        'draft',
        product.category_name,
        product.product_url,
        JSON.stringify(media),
        toneScore,
        charCount,
        product.product_price,
        product.product_image,
      ]
    );

    const reviewId = reviewResult.rows[0].id;

    // 8. 상품 상태를 completed로 업데이트
    await db.query(
      "UPDATE products SET status = 'completed', updated_at = NOW() WHERE product_id = $1",
      [productId]
    );

    // 9. 성공 로그
    await dbLog('review-generate', 'info', `리뷰 생성 완료: ${product.product_name}`, {
      productId,
      reviewId,
      provider: aiResult.provider,
      model: aiResult.model,
      charCount,
      toneScore,
      imageCount: media.length,
      imageSources: media.map(m => m.credit || 'unknown'),
      usage: aiResult.usage,
      appliedSettings: {
        templateSource,
        promptMinLength: promptSettings.minLength,
        promptMaxLength: promptSettings.maxLength,
        reviewTemplate: promptSettings.reviewTemplate?.substring(0, 80),
      },
    });

    res.json({
      success: true,
      message: '리뷰가 생성되었습니다.',
      data: {
        reviewId,
        charCount,
        toneScore,
        imageCount: media.length,
        provider: aiResult.provider,
        model: aiResult.model,
      },
    });
  } catch (error) {
    logger.error('리뷰 생성 중 오류:', error);

    // 상품 상태를 failed로 업데이트
    if (product) {
      try {
        await db.query(
          "UPDATE products SET status = 'failed', updated_at = NOW() WHERE product_id = $1",
          [product.product_id]
        );
      } catch (updateError) {
        logger.error('상품 상태 업데이트 실패:', updateError);
      }
    }

    // 에러 로그
    await dbLog('review-generate', 'error', `리뷰 생성 실패: ${error.message}`, {
      productId: req.body?.productId,
      productName: product?.product_name,
      error: error.message,
      stack: error.stack,
    });

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
