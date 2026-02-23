import express from 'express';
import { searchProducts } from '../services/coupang/products.js';
import { createDeeplinks } from '../services/coupang/deeplink.js';
import { getSystemSettings } from '../services/settingsService.js';

const router = express.Router();

/**
 * GET /api/search
 * 쿠팡 상품 실시간 검색 (공개 API)
 */
router.get('/search', async (req, res) => {
  try {
    const { keyword, limit = 20 } = req.query;

    if (!keyword || !keyword.trim()) {
      return res.status(400).json({ success: false, message: '검색어를 입력해주세요.' });
    }

    const settings = await getSystemSettings();
    const { accessKey, secretKey, subId } = settings.coupang || {};

    if (!accessKey || !secretKey) {
      return res.status(503).json({ success: false, message: '쿠팡 API가 설정되지 않았습니다.' });
    }

    const result = await searchProducts(
      { keyword: keyword.trim(), limit: parseInt(limit), subId },
      { accessKey, secretKey }
    );

    if (!result.success) {
      return res.status(502).json({ success: false, message: result.message || '상품 검색 실패' });
    }

    // 딥링크 생성
    const products = result.products || [];
    let productsWithLinks = products;

    if (products.length > 0) {
      const urls = products.map(p => p.productUrl).filter(Boolean);
      if (urls.length > 0) {
        try {
          const deeplinkResult = await createDeeplinks({ urls, subId }, { accessKey, secretKey });
          if (deeplinkResult.success && deeplinkResult.deeplinks) {
            const deeplinkMap = {};
            deeplinkResult.deeplinks.forEach(dl => {
              deeplinkMap[dl.originalUrl] = dl.shortenUrl;
            });
            productsWithLinks = products.map(p => ({
              ...p,
              affiliateUrl: deeplinkMap[p.productUrl] || p.productUrl,
            }));
          }
        } catch (dlErr) {
          console.error('딥링크 생성 실패 (검색결과는 반환):', dlErr);
        }
      }
    }

    res.json({
      success: true,
      data: {
        products: productsWithLinks,
        totalCount: result.totalCount || products.length,
        keyword: keyword.trim(),
      },
    });
  } catch (error) {
    console.error('상품 검색 오류:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
