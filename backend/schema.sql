-- Nibbles & nOOk: orders table (Supabase / PostgreSQL)
-- This file contains both the full schema (for fresh setups) and a migration script.

-- ============================================================
-- MIGRATION: run this if you already have an orders table
-- and want to migrate from the old 4-item schema to the new 8-item schema.
-- Safe to run multiple times — uses IF EXISTS / IF NOT EXISTS.
-- ============================================================

-- Drop the old order_items table (no longer used)
DROP TABLE IF EXISTS order_items;

-- Rename ikan → rendang first (skip if columns don't exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'qty_nasi_bakar_ikan') THEN
    ALTER TABLE orders RENAME COLUMN qty_nasi_bakar_ikan TO qty_nasi_bakar_rendang;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'qty_nasi_bakar_ikan_and_cendol') THEN
    ALTER TABLE orders RENAME COLUMN qty_nasi_bakar_ikan_and_cendol TO qty_nasi_bakar_rendang_and_cendol;
  END IF;
END $$;

-- Add new item columns (safe to run multiple times)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS qty_nasi_bakar_ayam INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS qty_nasi_bakar_cumi INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS qty_nasi_bakar_rendang INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS qty_nasi_bakar_cumi_and_cendol INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS qty_nasi_bakar_ayam_and_cendol INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS qty_nasi_bakar_rendang_and_cendol INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_price INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_option VARCHAR(64) NOT NULL DEFAULT '';

-- Drop old columns that no longer apply
ALTER TABLE orders DROP COLUMN IF EXISTS qty_nasi_bakar_3_rasa;
ALTER TABLE orders DROP COLUMN IF EXISTS qty_nasi_bakar_and_cendol;

-- ============================================================
-- FULL SCHEMA: for fresh setups only (creates table from scratch)
-- Uncomment below if starting from zero.
-- ============================================================

-- CREATE TABLE orders (
--     id VARCHAR(36) PRIMARY KEY,
--     created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
--     customer_name VARCHAR(255) NOT NULL,
--     customer_email VARCHAR(255) NOT NULL,
--     customer_phone VARCHAR(64) NOT NULL,
--     pickup_option VARCHAR(64) NOT NULL DEFAULT '',
--     qty_nasi_bakar_ayam INTEGER NOT NULL DEFAULT 0,
--     qty_nasi_bakar_cumi INTEGER NOT NULL DEFAULT 0,
--     qty_nasi_bakar_rendang INTEGER NOT NULL DEFAULT 0,
--     qty_cendol INTEGER NOT NULL DEFAULT 0,
--     qty_nasi_bakar_cumi_and_cendol INTEGER NOT NULL DEFAULT 0,
--     qty_nasi_bakar_ayam_and_cendol INTEGER NOT NULL DEFAULT 0,
--     qty_nasi_bakar_rendang_and_cendol INTEGER NOT NULL DEFAULT 0,
--     qty_nasi_ulam_betawi INTEGER NOT NULL DEFAULT 0,
--     total_price INTEGER NOT NULL DEFAULT 0,
--     proof_original_filename VARCHAR(512) NOT NULL,
--     proof_file_path VARCHAR(1024) NOT NULL
-- );

CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
