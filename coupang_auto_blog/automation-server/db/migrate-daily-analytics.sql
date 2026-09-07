-- Idempotent P2 migration: KST daily rollups, job audit, metric anomalies.
-- This file is not executed automatically by this change.

BEGIN;

CREATE TABLE IF NOT EXISTS daily_metric_rollups (
  business_date_kst DATE PRIMARY KEY,
  eligible_impression_sessions INTEGER NOT NULL DEFAULT 0 CHECK (eligible_impression_sessions >= 0),
  qualified_outbound_sessions INTEGER NOT NULL DEFAULT 0 CHECK (qualified_outbound_sessions >= 0),
  raw_outbound_sessions INTEGER NOT NULL DEFAULT 0 CHECK (raw_outbound_sessions >= 0),
  orphan_outbound_sessions INTEGER NOT NULL DEFAULT 0 CHECK (orphan_outbound_sessions >= 0),
  qualified_outbound_ctr_pct NUMERIC(7,4) NOT NULL DEFAULT 0 CHECK (qualified_outbound_ctr_pct >= 0 AND qualified_outbound_ctr_pct <= 100),
  impression_events INTEGER NOT NULL DEFAULT 0 CHECK (impression_events >= 0),
  outbound_events INTEGER NOT NULL DEFAULT 0 CHECK (outbound_events >= 0),
  total_events INTEGER NOT NULL DEFAULT 0 CHECK (total_events >= 0),
  bot_events INTEGER NOT NULL DEFAULT 0 CHECK (bot_events >= 0),
  duplicate_events INTEGER NOT NULL DEFAULT 0 CHECK (duplicate_events >= 0),
  source_max_received_at TIMESTAMPTZ,
  data_status VARCHAR(20) NOT NULL DEFAULT 'no_data',
  calculation_version SMALLINT NOT NULL DEFAULT 1,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE daily_metric_rollups
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS job_runs (
  run_id UUID PRIMARY KEY,
  job_name VARCHAR(100) NOT NULL,
  business_date_kst DATE NOT NULL,
  status VARCHAR(20) NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 1,
  rows_affected INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  error_code VARCHAR(100),
  error_message VARCHAR(500),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (job_name, business_date_kst)
);

CREATE INDEX IF NOT EXISTS idx_job_runs_status_updated ON job_runs(status, updated_at);

CREATE TABLE IF NOT EXISTS metric_anomalies (
  anomaly_id UUID PRIMARY KEY,
  business_date_kst DATE NOT NULL,
  metric_name VARCHAR(100) NOT NULL,
  anomaly_type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  observed_value NUMERIC,
  baseline_value NUMERIC,
  threshold_value NUMERIC,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_date_kst, metric_name, anomaly_type)
);

CREATE INDEX IF NOT EXISTS idx_metric_anomalies_status_date ON metric_anomalies(status, business_date_kst DESC);

COMMIT;
