import express from 'express';
import { getDb } from '../config/database.js';

const router = express.Router();

function mapRecipeRow(row) {
  return {
    id: String(row.id),
    title: row.title,
    description: row.description,
    cookingTime: row.cooking_time || '',
    difficulty: row.difficulty || '',
    ingredients: row.ingredients || [],
    instructions: row.instructions,
    coupangProducts: row.coupang_products || [],
    imageUrl: row.image_url,
    slug: row.slug,
    status: row.status,
    viewCount: row.view_count || 0,
    createdAt: row.created_at?.toISOString(),
    updatedAt: row.updated_at?.toISOString(),
  };
}

/**
 * GET /api/recipes
 * 공개 레시피 목록 (published만)
 */
router.get('/recipes', async (req, res) => {
  try {
    const db = getDb();
    const { limit = 12, offset = 0 } = req.query;

    const [recipesResult, countResult] = await Promise.all([
      db.query(
        `SELECT * FROM recipes WHERE status = 'published' ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
        [parseInt(limit), parseInt(offset)]
      ),
      db.query(`SELECT COUNT(*) as count FROM recipes WHERE status = 'published'`),
    ]);

    res.json({
      success: true,
      data: {
        recipes: recipesResult.rows.map(mapRecipeRow),
        totalCount: parseInt(countResult.rows[0].count),
        hasMore: parseInt(offset) + recipesResult.rows.length < parseInt(countResult.rows[0].count),
      },
    });
  } catch (error) {
    console.error('레시피 목록 조회 오류:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/recipes/id/:id
 * 공개 레시피 상세 조회 + 조회수 증가
 */
router.get('/recipes/id/:id', async (req, res) => {
  try {
    const db = getDb();
    const result = await db.query(
      `SELECT * FROM recipes WHERE id = $1 AND status = 'published'`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '레시피를 찾을 수 없습니다.' });
    }

    const row = result.rows[0];

    db.query(
      'UPDATE recipes SET view_count = COALESCE(view_count, 0) + 1 WHERE id = $1',
      [row.id]
    ).catch(err => console.error('조회수 증가 실패:', err));

    res.json({ success: true, data: { ...mapRecipeRow(row), viewCount: (row.view_count || 0) + 1 } });
  } catch (error) {
    console.error('레시피 상세 조회 오류:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/recipes/by-slug?slug=...
 * 공개 레시피 상세 조회 (slug 쿼리 파라미터 기반) - 한글 slug 인코딩 문제 방지
 */
router.get('/recipes/by-slug', async (req, res) => {
  try {
    const db = getDb();
    const rawSlug = req.query.slug;
    if (!rawSlug) {
      return res.status(400).json({ success: false, message: 'slug가 필요합니다.' });
    }
    const slug = decodeURIComponent(rawSlug);

    const result = await db.query(
      `SELECT * FROM recipes WHERE slug = $1 AND status = 'published'`,
      [slug]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '레시피를 찾을 수 없습니다.' });
    }

    const row = result.rows[0];
    db.query(
      'UPDATE recipes SET view_count = COALESCE(view_count, 0) + 1 WHERE id = $1',
      [row.id]
    ).catch(err => console.error('조회수 증가 실패:', err));

    res.json({ success: true, data: { ...mapRecipeRow(row), viewCount: (row.view_count || 0) + 1 } });
  } catch (error) {
    console.error('레시피 slug 조회 오류:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/recipes/:slug
 * 공개 레시피 상세 조회 (slug 기반)
 */
router.get('/recipes/:slug', async (req, res) => {
  try {
    const db = getDb();
    const result = await db.query(
      `SELECT * FROM recipes WHERE slug = $1 AND status = 'published'`,
      [req.params.slug]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '레시피를 찾을 수 없습니다.' });
    }

    const row = result.rows[0];

    db.query(
      'UPDATE recipes SET view_count = COALESCE(view_count, 0) + 1 WHERE id = $1',
      [row.id]
    ).catch(err => console.error('조회수 증가 실패:', err));

    res.json({ success: true, data: { ...mapRecipeRow(row), viewCount: (row.view_count || 0) + 1 } });
  } catch (error) {
    console.error('레시피 상세 조회 오류:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
