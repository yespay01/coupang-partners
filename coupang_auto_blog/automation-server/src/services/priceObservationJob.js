import crypto from 'node:crypto';

import { createCoupangClient } from './coupang/index.js';
import { getKstBusinessDate } from './dailyMetrics.js';
import { getSystemSettings } from './settingsService.js';
import { applyObservedProductPrice, normalizeObservedPrice } from './priceObservations.js';

export const PRICE_OBSERVATION_JOB_NAME = 'daily_price_observations';
// Search API 시간당 10회 중 사용자 검색과 신규 수집용 여유를 남긴 자동 보완 상한.
export const MAX_PRICE_OBSERVATIONS_PER_RUN = 4;
export const DEMAND_PRIORITY_SHARE = 0.5;

export function isPriceObservationEnabled(env = process.env) {
  return env.PRICE_OBSERVATION_ENABLED === 'true';
}

export function normalizePriceObservationLimit(value, fallback = 4) {
  const raw = String(value ?? fallback);
  const parsed = /^\d+$/.test(raw) ? Number(raw) : fallback;
  return Math.min(Math.max(parsed, 1), MAX_PRICE_OBSERVATIONS_PER_RUN);
}

async function startJob(db, { runId, businessDateKst }) {
  await db.query(
    `INSERT INTO job_runs (
       run_id, job_name, business_date_kst, status, attempt_count,
       rows_affected, started_at, finished_at, error_code, error_message,
       metadata, created_at, updated_at
     ) VALUES ($1,$2,$3,'running',1,0,NOW(),NULL,NULL,NULL,'{}'::jsonb,NOW(),NOW())
     ON CONFLICT (job_name, business_date_kst) DO UPDATE SET
       run_id = EXCLUDED.run_id,
       status = 'running',
       attempt_count = job_runs.attempt_count + 1,
       rows_affected = 0,
       started_at = NOW(),
       finished_at = NULL,
       error_code = NULL,
       error_message = NULL,
       metadata = '{}'::jsonb,
       updated_at = NOW()`,
    [runId, PRICE_OBSERVATION_JOB_NAME, businessDateKst]
  );
}

async function finishJob(db, {
  businessDateKst, status, rowsAffected = 0, errorCode = null,
  errorMessage = null, metadata = {},
}) {
  await db.query(
    `UPDATE job_runs
        SET status = $3, rows_affected = $4, finished_at = NOW(),
            error_code = $5, error_message = $6, metadata = $7::jsonb,
            updated_at = NOW()
      WHERE job_name = $1 AND business_date_kst = $2::date`,
    [PRICE_OBSERVATION_JOB_NAME, businessDateKst, status, rowsAffected,
      errorCode, errorMessage ? String(errorMessage).slice(0, 500) : null, JSON.stringify(metadata)]
  );
}

export async function runDailyPriceObservationJob(db, {
  now = new Date(),
  limit = normalizePriceObservationLimit(process.env.PRICE_OBSERVATION_DAILY_LIMIT),
  loadSettings = getSystemSettings,
  makeClient = createCoupangClient,
  applyObservation = applyObservedProductPrice,
} = {}) {
  const safeLimit = normalizePriceObservationLimit(limit);
  const demandPriorityLimit = Math.max(1, Math.floor(safeLimit * DEMAND_PRIORITY_SHARE));
  const businessDateKst = getKstBusinessDate(now);
  const runId = crypto.randomUUID();
  const lockClient = typeof db.connect === 'function' ? await db.connect() : db;
  let lockAcquired = false;
  try {
    const lock = await lockClient.query(
      'SELECT pg_try_advisory_lock(hashtext($1)) AS acquired',
      [PRICE_OBSERVATION_JOB_NAME]
    );
    lockAcquired = Boolean(lock.rows[0]?.acquired);
    if (!lockAcquired) return { status: 'skipped_locked', businessDateKst, observed: 0 };

    await startJob(db, { runId, businessDateKst });
    const settings = await loadSettings();
    const coupang = settings?.coupang || {};
    if (!coupang.enabled || !coupang.accessKey || !coupang.secretKey || !coupang.partnerId) {
      const error = new Error('쿠팡 Product API 설정이 없어 가격 관측을 실행할 수 없습니다.');
      error.code = 'COUPANG_API_NOT_CONFIGURED';
      throw error;
    }
    const apiClient = makeClient(
      coupang.accessKey, coupang.secretKey, coupang.partnerId, coupang.subId
    );
    const candidates = await db.query(
      `WITH eligible AS (
         SELECT p.id, p.product_id, p.product_name,
                p.search_demand_count, p.last_user_searched_at,
                latest.observed_at AS latest_observed_at,
                COALESCE(clicks.recent_clicks, 0)::int AS recent_clicks
           FROM products p
           LEFT JOIN LATERAL (
             SELECT MAX(po.observed_at) AS observed_at
               FROM price_observations po
              WHERE po.product_id = p.product_id
           ) latest ON TRUE
           LEFT JOIN LATERAL (
             SELECT COUNT(*)::int AS recent_clicks
               FROM affiliate_links al
               JOIN coupang_clicks cc ON cc.link_id = al.link_id
              WHERE al.product_id = p.product_id
                AND cc.created_at >= ($2::timestamptz - INTERVAL '14 days')
           ) clicks ON TRUE
          WHERE p.product_name IS NOT NULL AND p.product_name <> ''
            AND NOT EXISTS (
              SELECT 1 FROM price_observations today
               WHERE today.product_id = p.product_id
                 AND today.business_date_kst = ($2::timestamptz AT TIME ZONE 'Asia/Seoul')::date
            )
       ), demand_priority AS (
         SELECT product_id
           FROM eligible
          WHERE recent_clicks > 0
             OR last_user_searched_at >= ($2::timestamptz - INTERVAL '30 days')
          ORDER BY recent_clicks DESC, search_demand_count DESC,
                   last_user_searched_at DESC NULLS LAST,
                   latest_observed_at ASC NULLS FIRST, id ASC
          LIMIT $3
       )
       SELECT e.product_id, e.product_name
         FROM eligible e
         LEFT JOIN demand_priority d ON d.product_id = e.product_id
        ORDER BY (d.product_id IS NOT NULL) DESC,
                 CASE WHEN d.product_id IS NOT NULL THEN e.recent_clicks END DESC,
                 CASE WHEN d.product_id IS NOT NULL THEN e.search_demand_count END DESC,
                 e.latest_observed_at ASC NULLS FIRST,
                 e.id ASC
        LIMIT $1`,
      [safeLimit, now.toISOString(), demandPriorityLimit]
    );

    const stats = { requested: candidates.rows.length, observed: 0, unmatched: 0, invalidPrice: 0, failed: 0, rateLimited: false };
    for (const product of candidates.rows) {
      try {
        const keyword = String(product.product_name).trim().slice(0, 50);
        const result = await apiClient.searchProducts(keyword, 10);
        if (!result.success) {
          stats.failed += 1;
          if (result.rateLimited || /사용 횟수|횟수.*초과|rate.?limit|쿨다운/i.test(String(result.message || ''))) {
            stats.rateLimited = true;
            break;
          }
          continue;
        }
        const match = (result.products || []).find(
          (item) => String(item.productId) === String(product.product_id)
        );
        if (!match) {
          stats.unmatched += 1;
          continue;
        }
        const price = normalizeObservedPrice(match.productPrice);
        if (price == null) {
          stats.invalidPrice += 1;
          continue;
        }
        await applyObservation(db, {
          productId: String(product.product_id),
          priceKrw: price,
          observedAt: now,
          source: 'daily_search_match',
          context: 'exact_product_id_search_match',
        });
        stats.observed += 1;
      } catch {
        stats.failed += 1;
      }
    }

    await finishJob(db, {
      businessDateKst, status: 'success', rowsAffected: stats.observed,
      metadata: { ...stats, safeLimit, demandPriorityLimit, syntheticValuesCreated: 0 },
    });
    return { status: 'success', businessDateKst, ...stats, safeLimit, demandPriorityLimit };
  } catch (error) {
    try {
      await finishJob(db, {
        businessDateKst, status: 'failed',
        errorCode: error.code || 'PRICE_OBSERVATION_JOB_FAILED',
        errorMessage: error.message,
        metadata: { safeLimit, syntheticValuesCreated: 0 },
      });
    } catch {}
    throw error;
  } finally {
    if (lockAcquired) {
      try {
        await lockClient.query('SELECT pg_advisory_unlock(hashtext($1))', [PRICE_OBSERVATION_JOB_NAME]);
      } catch {}
    }
    if (lockClient !== db && typeof lockClient.release === 'function') lockClient.release();
  }
}
