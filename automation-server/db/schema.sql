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
