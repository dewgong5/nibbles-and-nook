-- Nibbles & nOOk: `orders` table (Supabase / PostgreSQL)
-- Pop-up menu: one quantity column per dish + optional paid standalone RSVP.
-- Safe to run multiple times where noted with IF NOT EXISTS.
--
-- Existing database? Run: backend/upgrade-schema.sql
-- Remove old columns? Run: backend/cleanup-dead-columns.sql (after backup if needed)
-- Brand-new database? Run: backend/schema-fresh.sql

-- ============================================================
-- Core columns + paid_rsvp
-- ============================================================

ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_rsvp BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN orders.paid_rsvp IS
  'true = paid RSVP-only (no food). false = food pre-order (RSVP included with purchase).';

-- Server: set RSVP_PRICE_DOLLARS in .env to match the fee shown in the app (see DEFAULT_RSVP_PRICE_DOLLARS in src/lib/orders-schema.ts).

-- ============================================================
-- Pop-up quantity columns (3 dishes)
-- Names must match src/lib/orders-schema.ts
-- ============================================================

ALTER TABLE orders ADD COLUMN IF NOT EXISTS qty_nasi_bakar_ayam_kemangi INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS qty_nasi_bakar_cumi INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS qty_nasi_bakar_ikan INTEGER NOT NULL DEFAULT 0;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS qty_sate_quail_eggs INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS qty_sate_kulit INTEGER NOT NULL DEFAULT 0;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS qty_sambel_bawang INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS qty_sambel_ijo INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS qty_sambel_matah INTEGER NOT NULL DEFAULT 0;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS qty_klepon INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS qty_nama_donut_earl_grey INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS qty_nama_donut_mocha_nougat INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS qty_nama_donut_mango_pomelo_sago INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS qty_butter_tteok INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN orders.total_price IS
  'Order total in cents (e.g. 250 = $2.50). RSVP-only rows may still use whole dollars until migrated.';

CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
