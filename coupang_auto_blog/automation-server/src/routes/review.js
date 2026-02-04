import express from 'express';
import { getFirestore } from 'firebase-admin/firestore';
import { buildPromptFromSettings, validateReviewContentWithSettings } from '../services/reviewUtils.js';
import { notifySlack } from '../services/slack.js';
import { generateText } from '../services/aiProviders.js';
import { getSystemSettings } from '../services/settingsService.js';
import { collectAllImages } from '../services/imageUtils.js';

const router = express.Router();
const db = getFirestore();

/**
 * AI를 사용하여 리뷰 생성
 */
async function createReviewWithAI(product, settings) {
  const { ai, prompt: promptSettings } = settings;

  const userPrompt = buildPromptFromSettings(product, promptSettings);
  const systemPrompt = promptSettings.systemPrompt;

  const result = await generateText(ai, userPrompt, systemPrompt);

  if (!result.text) {
    throw new Error('AI 응답에 리뷰 텍스트가 없습니다.');
  }

  return {
    reviewText: result.text,
    promptTokens: result.usage.promptTokens,
    completionTokens: result.usage.completionTokens,
    provider: result.provider,
    model: result.model,
  };
}

/**
 * POST /api/review/generate
 * 리뷰 자동 생성
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

    // 상품 조회
    const productDoc = await db.collection('products').doc(productId).get();

    if (!productDoc.exists) {
      return res.status(404).json({
        success: false,
        message: '상품을 찾을 수 없습니다.',
      });
    }

    const product = productDoc.data();
    const settings = await getSystemSettings();

    // AI로 리뷰 생성
    const { reviewText, promptTokens, completionTokens, provider, model } = await createReviewWithAI(product, settings);
    const { toneScore, charCount } = validateReviewContentWithSettings(reviewText, settings.prompt);

    // 이미지 수집
    const media = await collectAllImages(product, settings);

    // Firestore에 리뷰 저장
    const reviewRef = await db.collection('reviews').add({
      productId,
      productName: product.productName || '',
      content: reviewText,
      status: 'draft',
      category: product.categoryName || product.category || '',
      affiliateUrl: product.affiliateUrl || '',
      author: 'auto-bot',
      media,
      toneScore,
      charCount,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 로그 저장
    await db.collection('logs').add({
      type: 'generation',
      level: 'info',
      payload: {
        productId,
        reviewId: reviewRef.id,
        message: '후기 초안 생성 완료',
        tokens: {
          prompt: promptTokens,
          completion: completionTokens,
          toneScore,
          charCount,
          provider,
          model,
        },
      },
      createdAt: new Date(),
    });

    // Slack 알림
    await notifySlack({
      route: 'generation',
      level: 'success',
      title: '후기 초안 생성 완료',
      text: `상품 ID: \`${productId}\``,
      fields: [
        { label: '톤 점수', value: toneScore.toFixed(2) },
        { label: '글자 수', value: `${charCount}` },
        { label: 'AI', value: `${provider} (${model})` },
      ],
    });

    res.json({
      success: true,
      message: '리뷰가 생성되었습니다.',
      data: {
        reviewId: reviewRef.id,
        toneScore,
        charCount,
        provider,
        model,
      },
    });
  } catch (error) {
    console.error('리뷰 생성 중 오류:', error);

    await notifySlack({
      route: 'generation',
      level: 'error',
      title: '후기 생성 오류',
      text: error.message,
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

    const reviewRef = db.collection('reviews').doc(reviewId);
    const reviewDoc = await reviewRef.get();

    if (!reviewDoc.exists) {
      return res.status(404).json({
        success: false,
        message: '리뷰를 찾을 수 없습니다.',
      });
    }

    const review = reviewDoc.data();

    // slug 생성 (간단한 버전)
    const slug = `${reviewId}-${Date.now()}`;

    // 상태 업데이트
    await reviewRef.update({
      status: 'published',
      slug,
      publishedAt: new Date(),
      updatedAt: new Date(),
    });

    // 로그 저장
    await db.collection('logs').add({
      type: 'publish',
      level: 'info',
      payload: {
        reviewId,
        productId: review.productId,
        message: '후기 게시 완료',
      },
      createdAt: new Date(),
    });

    // Slack 알림
    await notifySlack({
      route: 'publish',
      level: 'success',
      title: '후기 게시 완료',
      text: `리뷰 ID: \`${reviewId}\``,
      fields: [
        { label: '상품명', value: review.productName || '미상' },
        { label: 'Slug', value: slug },
      ],
    });

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

    await notifySlack({
      route: 'publish',
      level: 'error',
      title: '후기 게시 오류',
      text: error.message,
    });

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
