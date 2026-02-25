import express from 'express';
import { getDb } from '../config/database.js';

const router = express.Router();

function mapNewsRow(row) {
  return {
    id: String(row.id),
    title: row.title,
    summary: row.summary,
    content: row.content,
    category: row.category,
    imageUrl: row.image_url,
    slug: row.slug,
    status: row.status,
    viewCount: row.view_count || 0,
    publishedAt: row.published_at?.toISOString(),
    createdAt: row.created_at?.toISOString(),
    updatedAt: row.updated_at?.toISOString(),
  };
}

/**
 * GET /api/news
 * 공개 뉴스 목록 (published만)
 */
router.get('/news', async (req, res) => {
  try {
    const db = getDb();
    const { limit = 12, offset = 0 } = req.query;

    const [newsResult, countResult] = await Promise.all([
      db.query(
        `SELECT * FROM news WHERE status = 'published' ORDER BY published_at DESC, created_at DESC LIMIT $1 OFFSET $2`,
        [parseInt(limit), parseInt(offset)]
      ),
      db.query(`SELECT COUNT(*) as count FROM news WHERE status = 'published'`),
    ]);

    res.json({
      success: true,
      data: {
        news: newsResult.rows.map(mapNewsRow),
        totalCount: parseInt(countResult.rows[0].count),
        hasMore: parseInt(offset) + newsResult.rows.length < parseInt(countResult.rows[0].count),
      },
    });
  } catch (error) {
    console.error('뉴스 목록 조회 오류:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/news/id/:id
 * 공개 뉴스 상세 조회 + 조회수 증가
 */
router.get('/news/id/:id', async (req, res) => {
  try {
    const db = getDb();
    const result = await db.query(
      `SELECT * FROM news WHERE id = $1 AND status = 'published'`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '뉴스를 찾을 수 없습니다.' });
    }

    const row = result.rows[0];

    db.query(
      'UPDATE news SET view_count = COALESCE(view_count, 0) + 1 WHERE id = $1',
      [row.id]
    ).catch(err => console.error('조회수 증가 실패:', err));

    res.json({ success: true, data: { ...mapNewsRow(row), viewCount: (row.view_count || 0) + 1 } });
  } catch (error) {
    console.error('뉴스 상세 조회 오류:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/news/by-slug?slug=...
 * 공개 뉴스 상세 조회 (slug 쿼리 파라미터 기반) - 인코딩 문제 방지
 */
router.get('/news/by-slug', async (req, res) => {
  try {
    const db = getDb();
    const rawSlug = req.query.slug;
    if (!rawSlug) {
      return res.status(400).json({ success: false, message: 'slug가 필요합니다.' });
    }
    const slug = decodeURIComponent(rawSlug);

    const result = await db.query(
      `SELECT * FROM news WHERE slug = $1 AND status = 'published'`,
      [slug]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '뉴스를 찾을 수 없습니다.' });
    }

    const row = result.rows[0];
    db.query(
      'UPDATE news SET view_count = COALESCE(view_count, 0) + 1 WHERE id = $1',
      [row.id]
    ).catch(err => console.error('조회수 증가 실패:', err));

    res.json({ success: true, data: { ...mapNewsRow(row), viewCount: (row.view_count || 0) + 1 } });
  } catch (error) {
    console.error('뉴스 slug 조회 오류:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/news/:slug
 * 공개 뉴스 상세 조회 (slug 기반)
 */
router.get('/news/:slug', async (req, res) => {
  try {
    const db = getDb();
    const result = await db.query(
      `SELECT * FROM news WHERE slug = $1 AND status = 'published'`,
      [req.params.slug]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '뉴스를 찾을 수 없습니다.' });
    }

    const row = result.rows[0];

    db.query(
      'UPDATE news SET view_count = COALESCE(view_count, 0) + 1 WHERE id = $1',
      [row.id]
    ).catch(err => console.error('조회수 증가 실패:', err));

    res.json({ success: true, data: { ...mapNewsRow(row), viewCount: (row.view_count || 0) + 1 } });
  } catch (error) {
    console.error('뉴스 상세 조회 오류:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
