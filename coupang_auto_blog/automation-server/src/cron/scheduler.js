import cron from 'node-cron';
import axios from 'axios';
import { generateToken } from '../config/auth.js';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:4000';
const CRON_REVIEW_LIMIT = parseInt(process.env.CRON_REVIEW_GENERATION_LIMIT || '5', 10);

function hhmmToCronExpression(hhmm, fallback = '0 3 * * *') {
  if (typeof hhmm !== 'string') return fallback;
  const match = hhmm.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!match) return fallback;

  const hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  return `${minute} ${hour} * * *`;
}

function getCronAuthHeaders() {
  const token = generateToken({
    id: 0,
    email: 'cron@system.local',
    role: 'admin',
  });

  return {
    Authorization: `Bearer ${token}`,
  };
}

function getErrorMessage(error) {
  return error?.response?.data?.message || error?.message || 'Unknown error';
}

async function fetchPendingProductsForReview(limit = CRON_REVIEW_LIMIT) {
  const response = await axios.get(`${API_BASE}/api/admin/products`, {
    headers: getCronAuthHeaders(),
    params: {
      limit,
      offset: 0,
      statuses: 'pending',
    },
  });

  return response.data?.data?.products || [];
}

async function fetchAutomationSettings() {
  const response = await axios.get(`${API_BASE}/api/admin/settings`, {
    headers: getCronAuthHeaders(),
  });

  return response.data?.data || {};
}

async function resolveCronSchedules() {
  try {
    const settings = await fetchAutomationSettings();
    const automation = settings?.automation || {};
    const reviewGeneration = automation?.reviewGeneration || {};

    const collectTime = automation.collectSchedule || '02:00';
    const reviewTime = reviewGeneration.schedule || '03:00';

    return {
      collect: {
        label: collectTime,
        expr: hhmmToCronExpression(collectTime, '0 2 * * *'),
      },
      review: {
        label: reviewTime,
        expr: hhmmToCronExpression(reviewTime, '0 3 * * *'),
      },
    };
  } catch (error) {
    console.error('⚠️ Failed to load cron schedules from settings. Using defaults:', getErrorMessage(error));
    return {
      collect: { label: '02:00', expr: '0 2 * * *' },
      review: { label: '03:00', expr: '0 3 * * *' },
    };
  }
}

async function generateReviewsForPendingProducts(limit = CRON_REVIEW_LIMIT) {
  const settings = await fetchAutomationSettings();
  const reviewGeneration = settings?.automation?.reviewGeneration || {};

  if (reviewGeneration.enabled === false) {
    console.log('ℹ️ Review auto-generation is disabled in settings.');
    return { attempted: 0, succeeded: 0, failed: 0, skipped: 'disabled' };
  }

  const effectiveLimit = Math.max(
    1,
    parseInt(String(reviewGeneration.maxPerRun ?? limit), 10) || limit
  );

  const draftLimit = Math.max(
    0,
    parseInt(String(reviewGeneration.pauseWhenDraftCountExceeds ?? 0), 10) || 0
  );

  if (draftLimit > 0) {
    try {
      const draftReviewsResponse = await axios.get(`${API_BASE}/api/admin/reviews`, {
        headers: getCronAuthHeaders(),
        params: {
          limit: 1,
          offset: 0,
          statuses: 'draft',
        },
      });
      const currentDraftCount = draftReviewsResponse.data?.data?.totalCount || 0;
      if (currentDraftCount >= draftLimit) {
        console.log(`ℹ️ Review auto-generation paused: draft backlog ${currentDraftCount} >= ${draftLimit}`);
        return { attempted: 0, succeeded: 0, failed: 0, skipped: 'draft_backlog', currentDraftCount };
      }
    } catch (error) {
      console.error('⚠️ Failed to check draft backlog before review generation:', getErrorMessage(error));
    }
  }

  const products = await fetchPendingProductsForReview(effectiveLimit);

  if (!Array.isArray(products) || products.length === 0) {
    return { attempted: 0, succeeded: 0, failed: 0 };
  }

  let succeeded = 0;
  let failed = 0;

  for (const product of products) {
    const productId = product?.productId;
    if (!productId) {
      failed++;
      continue;
    }

    try {
      await axios.post(
        `${API_BASE}/api/review/generate`,
        { productId },
        { headers: getCronAuthHeaders() }
      );
      succeeded++;
      console.log(`✅ Review generated for productId=${productId}`);
    } catch (error) {
      failed++;
      console.error(`❌ Review generation failed for productId=${productId}:`, getErrorMessage(error));
    }
  }

  return {
    attempted: products.length,
    succeeded,
    failed,
    limit: effectiveLimit,
  };
}

/**
 * Cron 작업 초기화
 */
export async function initCronJobs() {
  console.log('📅 Initializing cron jobs...');
  const schedules = await resolveCronSchedules();

  // 매일 새벽 2시 - 상품 자동 수집
  cron.schedule(schedules.collect.expr, async () => {
    console.log('⏰ Running scheduled product collection...');

    try {
      const response = await axios.post(`${API_BASE}/api/collect/auto`, {}, {
        headers: getCronAuthHeaders(),
      });
      console.log('✅ Product collection completed:', response.data);
    } catch (error) {
      console.error('❌ Product collection failed:', error.message);
    }
  }, {
    timezone: 'Asia/Seoul'
  });

  // 매일 새벽 3시 - 리뷰 자동 생성 (pending 상품에 대해)
  cron.schedule(schedules.review.expr, async () => {
    console.log('⏰ Running scheduled review generation...');

    try {
      const result = await generateReviewsForPendingProducts();
      console.log('✅ Review generation completed:', result);
    } catch (error) {
      console.error('❌ Review generation failed:', getErrorMessage(error));
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
      }, {
        headers: getCronAuthHeaders(),
      });
      console.log('✅ Log cleanup completed:', response.data);
    } catch (error) {
      console.error('❌ Log cleanup failed:', error.message);
    }
  }, {
    timezone: 'Asia/Seoul'
  });

  console.log('✅ Cron jobs initialized:');
  console.log(`   - Product collection: Every day at ${schedules.collect.label} KST`);
  console.log(`   - Review generation: Every day at ${schedules.review.label} KST`);
  console.log('   - Log cleanup: Every Sunday at 12:00 AM KST');
}
