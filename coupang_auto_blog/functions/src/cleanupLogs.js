import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();
const LOG_RETENTION_DAYS = 30;
const BATCH_SIZE = 500;

/**
 * 오래된 로그 자동 삭제
 * 매일 새벽 2시 실행
 */
export const cleanupOldLogs = onSchedule(
  {
    schedule: "0 2 * * *", // 매일 02:00 (KST)
    timeZone: "Asia/Seoul",
    retryCount: 0,
  },
  async () => {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - LOG_RETENTION_DAYS);

      logger.info(`로그 삭제 시작: ${LOG_RETENTION_DAYS}일 이전 (${cutoffDate.toISOString()})`);

      let totalDeleted = 0;
      let hasMore = true;

      while (hasMore) {
        const snapshot = await db
          .collection("logs")
          .where("createdAt", "<", cutoffDate)
          .limit(BATCH_SIZE)
          .get();

        if (snapshot.empty) {
          hasMore = false;
          break;
        }

        const batch = db.batch();
        snapshot.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();

        totalDeleted += snapshot.size;
        logger.info(`${snapshot.size}개 로그 삭제됨 (총 ${totalDeleted}개)`);

        // 배치 간 간격 (Firestore 쿼터 보호)
        if (snapshot.size === BATCH_SIZE) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } else {
          hasMore = false;
        }
      }

      logger.info(`로그 삭제 완료: 총 ${totalDeleted}개 삭제됨`);

      // 삭제 로그 기록
      await db.collection("logs").add({
        type: "system",
        level: "info",
        message: `오래된 로그 ${totalDeleted}개 자동 삭제됨`,
        payload: {
          deletedCount: totalDeleted,
          cutoffDate: cutoffDate.toISOString(),
          retentionDays: LOG_RETENTION_DAYS,
        },
        createdAt: new Date(),
      });
    } catch (error) {
      logger.error("로그 삭제 실패:", error);

      // 실패 로그 기록
      await db.collection("logs").add({
        type: "system",
        level: "error",
        message: "로그 자동 삭제 실패",
        payload: {
          error: error.message,
          stack: error.stack,
        },
        createdAt: new Date(),
      });
    }
  }
);
