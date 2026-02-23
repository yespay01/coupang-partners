import express from 'express';
import { searchProducts } from '../services/coupang/products.js';
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

    // productUrl은 이미 제휴 파라미터가 포함된 제휴 링크이므로 딥링크 변환 불필요
    const products = (result.products || []).map(p => ({
      ...p,
      affiliateUrl: p.productUrl,
    }));

    res.json({
      success: true,
      data: {
        products,
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
