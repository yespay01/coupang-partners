import express from 'express';
import { getFirestore } from 'firebase-admin/firestore';
import { notifySlack } from '../services/slack.js';

const router = express.Router();
const db = getFirestore();

/**
 * POST /api/admin/cleanup-logs
 * 오래된 로그 정리
 */
router.post('/cleanup-logs', async (req, res) => {
  try {
    const { daysToKeep = 30 } = req.body;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const oldLogs = await db
      .collection('logs')
      .where('createdAt', '<', cutoffDate)
      .get();

    const deletePromises = [];
    oldLogs.forEach((doc) => {
      deletePromises.push(doc.ref.delete());
    });

    await Promise.all(deletePromises);

    const deletedCount = oldLogs.size;

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
    const [productsSnapshot, reviewsSnapshot, logsSnapshot] = await Promise.all([
      db.collection('products').count().get(),
      db.collection('reviews').count().get(),
      db.collection('logs').count().get(),
    ]);

    const stats = {
      products: productsSnapshot.data().count,
      reviews: reviewsSnapshot.data().count,
      logs: logsSnapshot.data().count,
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
