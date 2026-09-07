-- Idempotent price history migration.
-- Only real Coupang Product API observations are allowed; no synthetic backfill.

BEGIN;

CREATE TABLE IF NOT EXISTS price_observations (
  observation_id UUID PRIMARY KEY,
  product_id VARCHAR(255) NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
  price_krw BIGINT NOT NULL CHECK (price_krw > 0),
  currency CHAR(3) NOT NULL DEFAULT 'KRW' CHECK (currency = 'KRW'),
  observed_at TIMESTAMPTZ NOT NULL,
  business_date_kst DATE NOT NULL,
  observation_source VARCHAR(40) NOT NULL CHECK (
    observation_source IN ('collection', 'daily_search_match')
  ),
  collection_context VARCHAR(255),
  is_synthetic BOOLEAN NOT NULL DEFAULT FALSE CHECK (is_synthetic = FALSE),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, business_date_kst)
);

CREATE INDEX IF NOT EXISTS idx_price_observations_product_date
  ON price_observations(product_id, business_date_kst DESC);

COMMIT;
