-- =============================================================================
-- Nibbles & nOOk — drop unused `orders` columns (Supabase / PostgreSQL)
-- =============================================================================
--
-- Run AFTER upgrade-schema.sql, when you no longer need historical data in
-- these columns. Safe to re-run (IF EXISTS).
--
-- Keeps only columns used by src/lib/orders-schema.ts today.
-- =============================================================================

-- Pickup (removed from order flow)
ALTER TABLE orders DROP COLUMN IF EXISTS pickup_option;

-- Old menu: per-chili breakdown (3 dishes × 4 sambals)
ALTER TABLE orders DROP COLUMN IF EXISTS qty_nasi_kulit_ayam_cabe_ijo;
ALTER TABLE orders DROP COLUMN IF EXISTS qty_nasi_kulit_ayam_sambal_matah;
ALTER TABLE orders DROP COLUMN IF EXISTS qty_nasi_kulit_ayam_sambal_bawang;
ALTER TABLE orders DROP COLUMN IF EXISTS qty_nasi_kulit_ayam_sambal_terasi;
ALTER TABLE orders DROP COLUMN IF EXISTS qty_nasi_ayam_geprek_cabe_ijo;
ALTER TABLE orders DROP COLUMN IF EXISTS qty_nasi_ayam_geprek_sambal_matah;
ALTER TABLE orders DROP COLUMN IF EXISTS qty_nasi_ayam_geprek_sambal_bawang;
ALTER TABLE orders DROP COLUMN IF EXISTS qty_nasi_ayam_geprek_sambal_terasi;
ALTER TABLE orders DROP COLUMN IF EXISTS qty_nasi_oseng_sapi_cabe_ijo;
ALTER TABLE orders DROP COLUMN IF EXISTS qty_nasi_oseng_sapi_sambal_matah;
ALTER TABLE orders DROP COLUMN IF EXISTS qty_nasi_oseng_sapi_sambal_bawang;
ALTER TABLE orders DROP COLUMN IF EXISTS qty_nasi_oseng_sapi_sambal_terasi;

-- Butter tteok cream picker (never shipped; app uses qty_butter_tteok only)
ALTER TABLE orders DROP COLUMN IF EXISTS qty_butter_tteok_cream_original;
ALTER TABLE orders DROP COLUMN IF EXISTS qty_butter_tteok_cream_matcha;
ALTER TABLE orders DROP COLUMN IF EXISTS qty_butter_tteok_cream_chocolate;

-- Earlier pop-up menus (superseded by current nasi bakar / pastries)
ALTER TABLE orders DROP COLUMN IF EXISTS qty_nasi_bakar_ayam;
ALTER TABLE orders DROP COLUMN IF EXISTS qty_nasi_bakar_rendang;
ALTER TABLE orders DROP COLUMN IF EXISTS qty_cendol;
ALTER TABLE orders DROP COLUMN IF EXISTS qty_nasi_bakar_cumi_and_cendol;
ALTER TABLE orders DROP COLUMN IF EXISTS qty_nasi_bakar_ayam_and_cendol;
ALTER TABLE orders DROP COLUMN IF EXISTS qty_nasi_bakar_rendang_and_cendol;
ALTER TABLE orders DROP COLUMN IF EXISTS qty_nasi_ulam_betawi;
ALTER TABLE orders DROP COLUMN IF EXISTS qty_klepon;

-- -----------------------------------------------------------------------------
-- Verify: should match orders-schema.ts (13 qty columns)
-- -----------------------------------------------------------------------------
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'orders'
  AND column_name LIKE 'qty_%'
ORDER BY column_name;
