-- Migration: reviews 테이블에 누락된 컬럼 추가
-- 운영 서버에서 실행: docker exec -i <postgres_container> psql -U postgres -d blog < migrate-add-columns.sql

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS product_price INTEGER;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS product_image TEXT;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS seo_meta JSONB;
