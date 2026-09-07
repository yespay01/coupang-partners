-- PostgreSQL Schema for Coupang Blog Automation

-- Users Table (인증)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100),
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products Table (수집된 상품)
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  product_id VARCHAR(255) UNIQUE NOT NULL,
  product_name TEXT NOT NULL,
  product_price INTEGER,
  product_image TEXT,
  product_url TEXT,
  category_id VARCHAR(100),
  category_name VARCHAR(255),
  affiliate_url TEXT,
  source VARCHAR(100),
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);

-- 공개 검색에서 실제로 노출된 상품을 가격 추적 우선순위에 반영한다.
ALTER TABLE products ADD COLUMN IF NOT EXISTS search_demand_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS last_user_searched_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_products_search_demand
  ON products(last_user_searched_at DESC, search_demand_count DESC);

-- 쿠팡 Product API에서 실제로 관측한 일별 가격만 저장한다. 합성/보간값은 금지한다.
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

-- 공개 상품 검색에서 인기가 확인된 키워드만 일별 수요로 집계한다.
CREATE TABLE IF NOT EXISTS product_search_demand (
  business_date_kst DATE NOT NULL,
  normalized_keyword VARCHAR(50) NOT NULL,
  search_count INTEGER NOT NULL DEFAULT 1 CHECK (search_count > 0),
  first_searched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_searched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (business_date_kst, normalized_keyword)
);

CREATE INDEX IF NOT EXISTS idx_product_search_demand_keyword_date
  ON product_search_demand(normalized_keyword, business_date_kst DESC);

CREATE INDEX IF NOT EXISTS idx_product_search_demand_date_count
  ON product_search_demand(business_date_kst DESC, search_count DESC);

-- Reviews Table (생성된 리뷰)
CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  product_id VARCHAR(255) REFERENCES products(product_id),
  product_name TEXT,
  title VARCHAR(500),
  content TEXT NOT NULL,
  slug VARCHAR(255) UNIQUE,
  status VARCHAR(50) DEFAULT 'draft',
  category VARCHAR(255),
  affiliate_url TEXT,
  author VARCHAR(100) DEFAULT 'auto-bot',
  media JSONB,
  tone_score DECIMAL(3,2),
  char_count INTEGER,
  view_count INTEGER DEFAULT 0,
  product_price INTEGER,
  product_image TEXT,
  seo_meta JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  published_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_slug ON reviews(slug);
CREATE INDEX IF NOT EXISTS idx_reviews_published_at ON reviews(published_at);

-- Settings Table (시스템 설정)
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Recipes Table (AI 요리 레시피)
CREATE TABLE IF NOT EXISTS recipes (
  id SERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  cooking_time VARCHAR(100),
  difficulty VARCHAR(50),
  ingredients JSONB DEFAULT '[]'::jsonb,
  instructions TEXT,
  coupang_products JSONB DEFAULT '[]'::jsonb,
  image_url TEXT,
  slug VARCHAR(255) UNIQUE,
  status VARCHAR(50) DEFAULT 'draft',
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 기존 테이블에 컬럼 추가 (이미 있으면 무시)
DO $$ BEGIN
  ALTER TABLE recipes ADD COLUMN IF NOT EXISTS cooking_time VARCHAR(100);
  ALTER TABLE recipes ADD COLUMN IF NOT EXISTS difficulty VARCHAR(50);
END $$;

CREATE INDEX IF NOT EXISTS idx_recipes_status ON recipes(status);
CREATE INDEX IF NOT EXISTS idx_recipes_slug ON recipes(slug);
CREATE INDEX IF NOT EXISTS idx_recipes_created_at ON recipes(created_at);

-- News Table (AI 뉴스 기사)
CREATE TABLE IF NOT EXISTS news (
  id SERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  summary TEXT,
  content TEXT,
  category VARCHAR(255),
  image_url TEXT,
  slug VARCHAR(255) UNIQUE,
  status VARCHAR(50) DEFAULT 'draft',
  view_count INTEGER DEFAULT 0,
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_news_status ON news(status);
CREATE INDEX IF NOT EXISTS idx_news_slug ON news(slug);
CREATE INDEX IF NOT EXISTS idx_news_published_at ON news(published_at);

-- Logs Table (시스템 로그)
CREATE TABLE IF NOT EXISTS logs (
  id SERIAL PRIMARY KEY,
  type VARCHAR(100),
  level VARCHAR(50),
  message TEXT,
  payload JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_logs_type ON logs(type);
CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at);

-- Visitor Logs Table (방문자 접속 로그)
CREATE TABLE IF NOT EXISTS visitor_logs (
  id SERIAL PRIMARY KEY,
  page_type VARCHAR(50),
  page_slug VARCHAR(255),
  page_url TEXT,
  referrer TEXT,
  referrer_domain VARCHAR(255),
  keyword TEXT,
  utm_source VARCHAR(255),
  utm_medium VARCHAR(255),
  utm_campaign VARCHAR(255),
  ip_address VARCHAR(45),
  device_type VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_visitor_logs_created_at ON visitor_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_page_type ON visitor_logs(page_type);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_referrer_domain ON visitor_logs(referrer_domain);

-- Coupang Click Logs Table (쿠팡 링크 클릭 추적: 글별·버튼 위치별 클릭 집계용)
CREATE TABLE IF NOT EXISTS coupang_clicks (
  id SERIAL PRIMARY KEY,
  review_id INTEGER,
  review_slug VARCHAR(255),
  product_name VARCHAR(500),
  position VARCHAR(30),
  page_url TEXT,
  referrer_domain VARCHAR(255),
  device_type VARCHAR(20),
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_coupang_clicks_created_at ON coupang_clicks(created_at);
CREATE INDEX IF NOT EXISTS idx_coupang_clicks_review_id ON coupang_clicks(review_id);
CREATE INDEX IF NOT EXISTS idx_coupang_clicks_position ON coupang_clicks(position);

-- Affiliate Link Registry (검증된 목적지만 /go/:linkId로 이동)
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

-- Unified analytics events. Raw visitor/session identifiers are never stored.
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

-- Idempotent KST daily analytics rollups (overall scope: one row per business day)
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

-- Human-reviewed diagnostic proposals only. Never applies UI or content changes.
CREATE TABLE IF NOT EXISTS improvement_candidates (
  candidate_id UUID PRIMARY KEY,
  candidate_key VARCHAR(160) NOT NULL,
  business_date_kst DATE NOT NULL,
  candidate_type VARCHAR(30) NOT NULL CHECK (
    candidate_type IN ('data_quality', 'measurement', 'ux_experiment')
  ),
  surface VARCHAR(30) NOT NULL DEFAULT 'all',
  title VARCHAR(300) NOT NULL,
  hypothesis TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'proposed' CHECK (
    status IN ('proposed', 'approved', 'rejected', 'expired')
  ),
  priority_score NUMERIC(5,2) NOT NULL CHECK (priority_score BETWEEN 0 AND 100),
  evidence JSONB NOT NULL CHECK (
    jsonb_typeof(evidence) = 'object' AND evidence <> '{}'::jsonb
  ),
  sample JSONB NOT NULL CHECK (
    jsonb_typeof(sample) = 'object' AND sample <> '{}'::jsonb
  ),
  primary_metric JSONB NOT NULL CHECK (jsonb_typeof(primary_metric) = 'object'),
  guardrails JSONB NOT NULL CHECK (
    jsonb_typeof(guardrails) = 'array' AND jsonb_array_length(guardrails) > 0
  ),
  rollback_plan TEXT NOT NULL CHECK (length(trim(rollback_plan)) > 0),
  risks JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(risks) = 'array'),
  recommendation JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(recommendation) = 'object'),
  winner_declared BOOLEAN NOT NULL DEFAULT FALSE CHECK (winner_declared = FALSE),
  requires_human_approval BOOLEAN NOT NULL DEFAULT TRUE CHECK (requires_human_approval = TRUE),
  automatic_change_allowed BOOLEAN NOT NULL DEFAULT FALSE CHECK (automatic_change_allowed = FALSE),
  reviewed_by VARCHAR(100),
  review_note TEXT,
  reviewed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (candidate_key, business_date_kst)
);

CREATE INDEX IF NOT EXISTS idx_improvement_candidates_status_priority
  ON improvement_candidates(status, priority_score DESC, business_date_kst DESC);

CREATE INDEX IF NOT EXISTS idx_improvement_candidates_expires_at
  ON improvement_candidates(expires_at)
  WHERE status = 'proposed';

COMMENT ON TABLE improvement_candidates IS
  'Human-reviewed diagnostic proposals only. Rows never apply UI or content changes.';

COMMENT ON COLUMN improvement_candidates.status IS
  'proposed awaits human review; approved still requires a separate implementation workflow.';

-- Insert default settings
INSERT INTO settings (key, value, description) VALUES
('system', '{
  "automation": {
    "enabled": true,
    "maxProductsPerRun": 10
  },
  "topics": {
    "keywords": [],
    "categories": [],
    "goldboxEnabled": true,
    "coupangPLBrands": []
  },
  "coupang": {
    "enabled": false,
    "accessKey": "",
    "secretKey": "",
    "partnerId": "",
    "subId": ""
  },
  "ai": {
    "provider": "openai",
    "apiKey": ""
  },
  "prompt": {
    "systemPrompt": "You are a helpful product reviewer.",
    "userPromptTemplate": "Write a review for {productName}"
  }
}'::jsonb, 'System configuration')
ON CONFLICT (key) DO NOTHING;

-- Create admin user (password: admin123)
-- bcrypt hash of 'admin123': $2b$10$rF7vZ8kGQx9K5mN2wJ3pJ.xQH5Y8K9mN2wJ3pJ.xQH5Y8K9mN2wJ3
INSERT INTO users (email, password_hash, name, role) VALUES
('admin@coupang.com', '$2b$10$rF7vZ8kGQx9K5mN2wJ3pJ.xQH5Y8K9mN2wJ3pJ.xQH5Y8K9mN2wJ3', 'Admin', 'admin')
ON CONFLICT (email) DO NOTHING;
