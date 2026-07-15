import cron from 'node-cron';
import axios from 'axios';
import { generateToken } from '../config/auth.js';
import { pickTrendingTopic } from '../services/trendingTopics.js';
import { refreshNaverSession } from '../services/naverSearchAdvisor.js';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:4000';
const CRON_REVIEW_LIMIT = parseInt(process.env.CRON_REVIEW_GENERATION_LIMIT || '5', 10);
const CRON_SCHEDULE_SYNC_MS = parseInt(process.env.CRON_SCHEDULE_SYNC_MS || '30000', 10);

let productCollectionTask = null;
let reviewGenerationTask = null;
let newsMorningTask = null;
let newsAfternoonTask = null;
let logCleanupTask = null;
let naverSessionTask = null;
let currentScheduleSnapshot = null;
let scheduleSyncTimer = null;
let isSyncingSchedules = false;

let lastNewsCategory = null;

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
    const newsGeneration = automation?.newsGeneration || {};

    const collectTime = automation.collectSchedule || '02:00';
    const reviewTime = reviewGeneration.schedule || '03:00';
    const newsMorning = newsGeneration.morningSchedule || '07:00';
    const newsAfternoon = newsGeneration.afternoonSchedule || '18:00';

    return {
      collect: {
        label: collectTime,
        expr: hhmmToCronExpression(collectTime, '0 2 * * *'),
      },
      review: {
        label: reviewTime,
        expr: hhmmToCronExpression(reviewTime, '0 3 * * *'),
      },
      newsMorning: {
        label: newsMorning,
        expr: hhmmToCronExpression(newsMorning, '0 7 * * *'),
      },
      newsAfternoon: {
        label: newsAfternoon,
        expr: hhmmToCronExpression(newsAfternoon, '0 18 * * *'),
      },
    };
  } catch (error) {
    console.error('⚠️ Failed to load cron schedules from settings. Using defaults:', getErrorMessage(error));
    return {
      collect: { label: '02:00', expr: '0 2 * * *' },
      review: { label: '03:00', expr: '0 3 * * *' },
      newsMorning: { label: '07:00', expr: '0 7 * * *' },
      newsAfternoon: { label: '18:00', expr: '0 18 * * *' },
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

async function runScheduledProductCollection() {
  console.log('⏰ Running scheduled product collection...');

  try {
    const response = await axios.post(`${API_BASE}/api/collect/auto`, {}, {
      headers: getCronAuthHeaders(),
    });
    console.log('✅ Product collection completed:', response.data);
  } catch (error) {
    console.error('❌ Product collection failed:', getErrorMessage(error));
  }
}

async function runScheduledReviewGeneration() {
  console.log('⏰ Running scheduled review generation...');

  try {
    const result = await generateReviewsForPendingProducts();
    console.log('✅ Review generation completed:', result);
  } catch (error) {
    console.error('❌ Review generation failed:', getErrorMessage(error));
  }
}

async function runScheduledNewsGeneration(slot) {
  console.log(`⏰ Running scheduled news generation (${slot})...`);

  try {
    const settings = await fetchAutomationSettings();
    const newsGen = settings?.automation?.newsGeneration || {};

    if (newsGen.enabled === false) {
      console.log('ℹ️ News auto-generation is disabled in settings.');
      return;
    }

    const excludeCategories = lastNewsCategory ? [lastNewsCategory] : [];
    const { topic, category } = await pickTrendingTopic({ excludeCategories });

    if (!topic) {
      console.warn('⚠️ No trending topic resolved. Skipping news generation.');
      return;
    }

    console.log(`📰 [${slot}] 자동 뉴스 생성: [${category}] "${topic}"`);

    const response = await axios.post(
      `${API_BASE}/api/admin/news/generate`,
      { topic, category, autoPublish: true },
      { headers: getCronAuthHeaders() }
    );

    lastNewsCategory = category;
    console.log(`✅ [${slot}] 자동 뉴스 게시 완료:`, response.data?.data);
  } catch (error) {
    console.error(`❌ News generation (${slot}) failed:`, getErrorMessage(error));
  }
}

async function runScheduledLogCleanup() {
  console.log('⏰ Running scheduled log cleanup...');

  try {
    const response = await axios.post(`${API_BASE}/api/admin/cleanup-logs`, {
      daysToKeep: 30
    }, {
      headers: getCronAuthHeaders(),
    });
    console.log('✅ Log cleanup completed:', response.data);
  } catch (error) {
    console.error('❌ Log cleanup failed:', getErrorMessage(error));
  }
}

function stopTask(task) {
  if (!task) return;
  try {
    task.stop();
    task.destroy?.();
  } catch (error) {
    console.error('⚠️ Failed to stop cron task:', getErrorMessage(error));
  }
}

function scheduleKeyFromSnapshot(snapshot) {
  return `${snapshot.collect.expr}|${snapshot.review.expr}|${snapshot.newsMorning.expr}|${snapshot.newsAfternoon.expr}`;
}

function applyCronSchedules(schedules) {
  stopTask(productCollectionTask);
  stopTask(reviewGenerationTask);
  stopTask(newsMorningTask);
  stopTask(newsAfternoonTask);

  productCollectionTask = cron.schedule(schedules.collect.expr, runScheduledProductCollection, {
    timezone: 'Asia/Seoul'
  });

  reviewGenerationTask = cron.schedule(schedules.review.expr, runScheduledReviewGeneration, {
    timezone: 'Asia/Seoul'
  });

  newsMorningTask = cron.schedule(
    schedules.newsMorning.expr,
    () => runScheduledNewsGeneration('morning'),
    { timezone: 'Asia/Seoul' }
  );

  newsAfternoonTask = cron.schedule(
    schedules.newsAfternoon.expr,
    () => runScheduledNewsGeneration('afternoon'),
    { timezone: 'Asia/Seoul' }
  );

  currentScheduleSnapshot = schedules;

  console.log('✅ Cron schedules applied:');
  console.log(`   - Product collection: Every day at ${schedules.collect.label} KST`);
  console.log(`   - Review generation: Every day at ${schedules.review.label} KST`);
  console.log(`   - News (morning): Every day at ${schedules.newsMorning.label} KST`);
  console.log(`   - News (afternoon): Every day at ${schedules.newsAfternoon.label} KST`);
}

async function syncCronSchedulesIfNeeded() {
  if (isSyncingSchedules) return;
  isSyncingSchedules = true;

  try {
    const nextSchedules = await resolveCronSchedules();

    if (!currentScheduleSnapshot) {
      applyCronSchedules(nextSchedules);
      return;
    }

    const prevKey = scheduleKeyFromSnapshot(currentScheduleSnapshot);
    const nextKey = scheduleKeyFromSnapshot(nextSchedules);

    if (prevKey !== nextKey) {
      console.log('🔄 Cron schedule change detected from settings. Reapplying...');
      applyCronSchedules(nextSchedules);
    }
  } catch (error) {
    console.error('⚠️ Failed to sync cron schedules:', getErrorMessage(error));
  } finally {
    isSyncingSchedules = false;
  }
}

/**
 * Cron 작업 초기화
 */
export async function initCronJobs() {
  console.log('📅 Initializing cron jobs...');
  await syncCronSchedulesIfNeeded();

  // 매주 일요일 자정 - 로그 정리 (고정)
  stopTask(logCleanupTask);
  logCleanupTask = cron.schedule('0 0 * * 0', runScheduledLogCleanup, {
    timezone: 'Asia/Seoul'
  });

  // 6시간마다 - 네이버 SA 세션 유지 (고정)
  stopTask(naverSessionTask);
  naverSessionTask = cron.schedule('0 */6 * * *', async () => {
    console.log('⏰ Running Naver SA session keep-alive...');
    try {
      const result = await refreshNaverSession();
      console.log('✅ Naver SA session keep-alive:', result);
    } catch (error) {
      console.error('❌ Naver SA session keep-alive failed:', error.message);
    }
  }, { timezone: 'Asia/Seoul' });

  if (scheduleSyncTimer) {
    clearInterval(scheduleSyncTimer);
  }
  scheduleSyncTimer = setInterval(() => {
    syncCronSchedulesIfNeeded().catch(() => {});
  }, CRON_SCHEDULE_SYNC_MS);

  console.log('✅ Cron jobs initialized:');
  if (currentScheduleSnapshot) {
    console.log(`   - Product collection: Every day at ${currentScheduleSnapshot.collect.label} KST`);
    console.log(`   - Review generation: Every day at ${currentScheduleSnapshot.review.label} KST`);
    console.log(`   - News (morning): Every day at ${currentScheduleSnapshot.newsMorning.label} KST`);
    console.log(`   - News (afternoon): Every day at ${currentScheduleSnapshot.newsAfternoon.label} KST`);
  }
  console.log('   - Log cleanup: Every Sunday at 12:00 AM KST');
  console.log('   - Naver SA keep-alive: Every 6 hours');
  console.log(`   - Schedule sync: Every ${Math.floor(CRON_SCHEDULE_SYNC_MS / 1000)}s`);
}
