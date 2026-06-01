-- =============================================================================
-- Nibbles & nOOk — upgrade existing `orders` table (Supabase / PostgreSQL)
-- =============================================================================
--
-- Run this in: Supabase Dashboard → SQL Editor → New query → Run
--
-- Safe to re-run: every change uses IF NOT EXISTS.
-- Column names must match: src/lib/orders-schema.ts
--
-- After running:
--   • Food orders store total_price in CENTS (e.g. 450 = $4.50, 1300 = $13.00).
--   • RSVP-only rows may still use whole dollars ($5) until you migrate those separately.
--   • Update Google Sheets / Apps Script column maps if you sync qty_* fields.
--   • Drop obsolete columns: backend/cleanup-dead-columns.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Core
-- -----------------------------------------------------------------------------
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_rsvp BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN orders.paid_rsvp IS
  'true = paid RSVP-only (no food). false = food pre-order (RSVP included with purchase).';

COMMENT ON COLUMN orders.total_price IS
  'Food orders: total in cents (250 = $2.50). RSVP-only rows may still be whole dollars.';

-- -----------------------------------------------------------------------------
-- Main dishes
-- -----------------------------------------------------------------------------
ALTER TABLE orders ADD COLUMN IF NOT EXISTS qty_nasi_bakar_ayam_kemangi INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS qty_nasi_bakar_cumi INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS qty_nasi_bakar_ikan INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS qty_bakmi_no_pork_no_lard INTEGER NOT NULL DEFAULT 0;

-- -----------------------------------------------------------------------------
-- Sate
-- -----------------------------------------------------------------------------
ALTER TABLE orders ADD COLUMN IF NOT EXISTS qty_sate_quail_eggs INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS qty_sate_kulit INTEGER NOT NULL DEFAULT 0;

-- -----------------------------------------------------------------------------
-- Extra sambal (jars)
-- -----------------------------------------------------------------------------
ALTER TABLE orders ADD COLUMN IF NOT EXISTS qty_sambel_bawang INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS qty_sambel_ijo INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS qty_sambel_matah INTEGER NOT NULL DEFAULT 0;

-- -----------------------------------------------------------------------------
-- Pastries
-- -----------------------------------------------------------------------------
ALTER TABLE orders ADD COLUMN IF NOT EXISTS qty_klepon INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS qty_nama_donut_earl_grey INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS qty_nama_donut_mocha_nougat INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS qty_nama_donut_mango_pomelo_sago INTEGER NOT NULL DEFAULT 0;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS qty_butter_tteok INTEGER NOT NULL DEFAULT 0;

-- -----------------------------------------------------------------------------
-- Index
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- -----------------------------------------------------------------------------
-- Verify (optional — check new columns exist)
-- -----------------------------------------------------------------------------
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'orders'
  AND column_name LIKE 'qty_%'
ORDER BY column_name;
