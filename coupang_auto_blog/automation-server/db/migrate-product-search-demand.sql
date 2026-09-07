BEGIN;

ALTER TABLE products ADD COLUMN IF NOT EXISTS search_demand_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS last_user_searched_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_products_search_demand
  ON products(last_user_searched_at DESC, search_demand_count DESC);

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

COMMIT;
