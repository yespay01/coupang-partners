import express from 'express';
import { getDb } from '../config/database.js';
import { notifySlack } from '../services/slack.js';

const router = express.Router();

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
