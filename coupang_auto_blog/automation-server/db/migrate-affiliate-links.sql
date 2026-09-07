-- Idempotent P1 migration: affiliate registry, /go click context, analytics events.
-- Production execution/deployment is intentionally separate from this source change.

BEGIN;

CREATE TABLE IF NOT EXISTS affiliate_links (
  link_id UUID PRIMARY KEY,
  destination_fingerprint CHAR(64) UNIQUE NOT NULL,
  product_id VARCHAR(255),
  destination_url TEXT NOT NULL,
  landing_url TEXT,
  partner_tracking_code VARCHAR(50) NOT NULL,
  sub_id VARCHAR(255) NOT NULL DEFAULT '',
  link_source VARCHAR(30) NOT NULL,
  validation_status VARCHAR(30) NOT NULL DEFAULT 'verified',
  validation_reason VARCHAR(100),
  validated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_links_product_id ON affiliate_links(product_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_links_status ON affiliate_links(validation_status, is_active);

ALTER TABLE products ADD COLUMN IF NOT EXISTS affiliate_link_id UUID;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS affiliate_link_id UUID;
ALTER TABLE coupang_clicks ADD COLUMN IF NOT EXISTS link_id UUID;
ALTER TABLE coupang_clicks ADD COLUMN IF NOT EXISTS surface VARCHAR(30);
ALTER TABLE coupang_clicks ADD COLUMN IF NOT EXISTS content_id VARCHAR(128);
ALTER TABLE coupang_clicks ADD COLUMN IF NOT EXISTS session_id_hash CHAR(64);
ALTER TABLE coupang_clicks ADD COLUMN IF NOT EXISTS page_view_id UUID;

CREATE INDEX IF NOT EXISTS idx_products_affiliate_link_id ON products(affiliate_link_id);
CREATE INDEX IF NOT EXISTS idx_reviews_affiliate_link_id ON reviews(affiliate_link_id);
CREATE INDEX IF NOT EXISTS idx_coupang_clicks_link_id ON coupang_clicks(link_id);

CREATE TABLE IF NOT EXISTS analytics_events (
  event_id UUID PRIMARY KEY,
  event_name VARCHAR(50) NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  business_date_kst DATE NOT NULL,
  anonymous_id_hash CHAR(64),
  session_id_hash CHAR(64),
  page_view_id UUID,
  surface VARCHAR(30),
  content_id VARCHAR(128),
  product_id VARCHAR(255),
  position VARCHAR(30),
  experiment_id VARCHAR(64),
  variant_id VARCHAR(64),
  source VARCHAR(100),
  device_type VARCHAR(20),
  link_id UUID,
  is_bot BOOLEAN NOT NULL DEFAULT FALSE,
  is_duplicate BOOLEAN NOT NULL DEFAULT FALSE,
  schema_version SMALLINT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_business_date ON analytics_events(business_date_kst);
CREATE INDEX IF NOT EXISTS idx_analytics_events_name_time ON analytics_events(event_name, occurred_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON analytics_events(session_id_hash, occurred_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_link_id ON analytics_events(link_id);

COMMIT;
