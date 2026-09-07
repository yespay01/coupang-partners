import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('P1 migration은 재실행 가능한 IF NOT EXISTS/ON CONFLICT 스키마만 사용한다', async () => {
  const sql = await readFile(new URL('../db/migrate-affiliate-links.sql', import.meta.url), 'utf8');
  assert.match(sql, /CREATE TABLE IF NOT EXISTS affiliate_links/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS analytics_events/);
  assert.match(sql, /ALTER TABLE products ADD COLUMN IF NOT EXISTS affiliate_link_id/);
  assert.match(sql, /ALTER TABLE reviews ADD COLUMN IF NOT EXISTS affiliate_link_id/);
  assert.match(sql, /ALTER TABLE coupang_clicks ADD COLUMN IF NOT EXISTS link_id/);
  assert.doesNotMatch(sql, /DROP TABLE|DROP COLUMN|TRUNCATE/i);
});

test('P2 일별 분석 migration은 멱등 스키마만 만들고 파괴적 SQL을 쓰지 않는다', async () => {
  const sql = await readFile(new URL('../db/migrate-daily-analytics.sql', import.meta.url), 'utf8');
  assert.match(sql, /CREATE TABLE IF NOT EXISTS daily_metric_rollups/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS job_runs/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS metric_anomalies/);
  assert.match(sql, /qualified_outbound_ctr_pct[^;]+CHECK[^;]+<= 100/s);
  assert.match(sql, /UNIQUE \(job_name, business_date_kst\)/);
  assert.doesNotMatch(sql, /DROP TABLE|DROP COLUMN|TRUNCATE/i);
});

test('가격 이력 migration은 실제값 전용 멱등 테이블이며 합성값을 금지한다', async () => {
  const sql = await readFile(new URL('../db/migrate-price-observations.sql', import.meta.url), 'utf8');
  assert.match(sql, /CREATE TABLE IF NOT EXISTS price_observations/);
  assert.match(sql, /UNIQUE \(product_id, business_date_kst\)/);
  assert.match(sql, /CHECK \(price_krw > 0\)/);
  assert.match(sql, /CHECK \(is_synthetic = FALSE\)/);
  assert.doesNotMatch(sql, /generate_series|random\(|TRUNCATE|DROP TABLE/i);
});

test('상품 검색 수요 migration은 일별 집계만 보존하는 멱등 스키마다', async () => {
  const sql = await readFile(new URL('../db/migrate-product-search-demand.sql', import.meta.url), 'utf8');
  assert.match(sql, /CREATE TABLE IF NOT EXISTS product_search_demand/);
  assert.match(sql, /PRIMARY KEY \(business_date_kst, normalized_keyword\)/);
  assert.match(sql, /CHECK \(search_count > 0\)/);
  assert.doesNotMatch(sql, /DROP TABLE|DROP COLUMN|TRUNCATE|DELETE FROM/i);
});

test('P2 개선 후보 계약은 startup schema와 standalone transaction에 동일하게 존재한다', async () => {
  const [schema, migration] = await Promise.all([
    readFile(new URL('../db/schema.sql', import.meta.url), 'utf8'),
    readFile(new URL('../db/migrate-improvement-candidates.sql', import.meta.url), 'utf8'),
  ]);

  for (const sql of [schema, migration]) {
    assert.match(sql, /CREATE TABLE IF NOT EXISTS improvement_candidates/);
    assert.match(sql, /status IN \('proposed', 'approved', 'rejected', 'expired'\)/);
    assert.match(sql, /evidence JSONB NOT NULL/);
    assert.match(sql, /sample JSONB NOT NULL/);
    assert.match(sql, /guardrails JSONB NOT NULL/);
    assert.match(sql, /rollback_plan TEXT NOT NULL/);
    assert.match(sql, /winner_declared = FALSE/);
    assert.match(sql, /requires_human_approval = TRUE/);
    assert.match(sql, /automatic_change_allowed = FALSE/);
    assert.match(sql, /UNIQUE \(candidate_key, business_date_kst\)/);
  }

  assert.match(migration, /^\s*--[\s\S]*?BEGIN;/);
  assert.match(migration, /COMMIT;\s*$/);
  assert.doesNotMatch(migration, /DROP TABLE|DROP COLUMN|TRUNCATE|DELETE FROM/i);
});
