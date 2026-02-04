import cron from 'node-cron';
import axios from 'axios';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:4000';

/**
 * Cron 작업 초기화
 */
export function initCronJobs() {
  console.log('📅 Initializing cron jobs...');

  // 매일 새벽 2시 - 상품 자동 수집
  cron.schedule('0 2 * * *', async () => {
    console.log('⏰ Running scheduled product collection...');

    try {
      const response = await axios.post(`${API_BASE}/api/collect/auto`);
      console.log('✅ Product collection completed:', response.data);
    } catch (error) {
      console.error('❌ Product collection failed:', error.message);
    }
  }, {
    timezone: 'Asia/Seoul'
  });

  // 매일 새벽 3시 - 리뷰 자동 생성 (pending 상품에 대해)
  cron.schedule('0 3 * * *', async () => {
    console.log('⏰ Running scheduled review generation...');

    try {
      // pending 상품 조회하여 리뷰 생성
      // 이 부분은 별도 엔드포인트 추가 필요
      console.log('Review generation scheduled task - to be implemented');
    } catch (error) {
      console.error('❌ Review generation failed:', error.message);
    }
  }, {
    timezone: 'Asia/Seoul'
  });

  // 매주 일요일 자정 - 로그 정리
  cron.schedule('0 0 * * 0', async () => {
    console.log('⏰ Running scheduled log cleanup...');

    try {
      const response = await axios.post(`${API_BASE}/api/admin/cleanup-logs`, {
        daysToKeep: 30
      });
      console.log('✅ Log cleanup completed:', response.data);
    } catch (error) {
      console.error('❌ Log cleanup failed:', error.message);
    }
  }, {
    timezone: 'Asia/Seoul'
  });

  console.log('✅ Cron jobs initialized:');
  console.log('   - Product collection: Every day at 2:00 AM KST');
  console.log('   - Review generation: Every day at 3:00 AM KST');
  console.log('   - Log cleanup: Every Sunday at 12:00 AM KST');
}
