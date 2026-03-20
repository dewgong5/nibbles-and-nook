-- Nibbles & nOOk: `orders` table (Supabase / PostgreSQL)
-- Pop-up menu: per-dish chili counts + optional paid standalone RSVP.
-- Safe to run multiple times where noted with IF NOT EXISTS.

-- ============================================================
-- Core columns + paid_rsvp
-- ============================================================

ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_rsvp BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN orders.paid_rsvp IS
  'true = paid RSVP-only (no food). false = food pre-order (RSVP included with purchase).';

-- Server: set RSVP_PRICE_DOLLARS in .env to match the fee shown in the app (see DEFAULT_RSVP_PRICE_DOLLARS in src/lib/orders-schema.ts).

-- ============================================================
-- Pop-up quantity columns (3 dishes × 4 chili variants)
-- Names must match src/lib/orders-schema.ts
-- ============================================================

ALTER TABLE orders ADD COLUMN IF NOT EXISTS qty_nasi_kulit_ayam_cabe_ijo INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS qty_nasi_kulit_ayam_sambal_matah INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS qty_nasi_kulit_ayam_sambal_bawang INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS qty_nasi_kulit_ayam_sambal_terasi INTEGER NOT NULL DEFAULT 0;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS qty_nasi_ayam_geprek_cabe_ijo INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS qty_nasi_ayam_geprek_sambal_matah INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS qty_nasi_ayam_geprek_sambal_bawang INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS qty_nasi_ayam_geprek_sambal_terasi INTEGER NOT NULL DEFAULT 0;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS qty_nasi_oseng_sapi_cabe_ijo INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS qty_nasi_oseng_sapi_sambal_matah INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS qty_nasi_oseng_sapi_sambal_bawang INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS qty_nasi_oseng_sapi_sambal_terasi INTEGER NOT NULL DEFAULT 0;

-- ============================================================
-- Optional cleanup (legacy menu / pickup)
-- Uncomment if you are done with the old schema.
-- ============================================================

-- ALTER TABLE orders DROP COLUMN IF EXISTS pickup_option;
-- ALTER TABLE orders DROP COLUMN IF EXISTS qty_nasi_bakar_ayam;
-- ALTER TABLE orders DROP COLUMN IF EXISTS qty_nasi_bakar_cumi;
-- ALTER TABLE orders DROP COLUMN IF EXISTS qty_nasi_bakar_rendang;
-- ALTER TABLE orders DROP COLUMN IF EXISTS qty_cendol;
-- ALTER TABLE orders DROP COLUMN IF EXISTS qty_nasi_bakar_cumi_and_cendol;
-- ALTER TABLE orders DROP COLUMN IF EXISTS qty_nasi_bakar_ayam_and_cendol;
-- ALTER TABLE orders DROP COLUMN IF EXISTS qty_nasi_bakar_rendang_and_cendol;
-- ALTER TABLE orders DROP COLUMN IF EXISTS qty_nasi_ulam_betawi;

-- ============================================================
-- FULL SCHEMA (fresh database — run once, adjust types if needed)
-- ============================================================

-- CREATE TABLE orders (
--     id VARCHAR(36) PRIMARY KEY,
--     created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
--     customer_name VARCHAR(255) NOT NULL,
--     customer_email VARCHAR(255) NOT NULL,
--     customer_phone VARCHAR(64) NOT NULL,
--     total_price INTEGER NOT NULL,
--     proof_original_filename VARCHAR(512) NOT NULL,
--     proof_file_path VARCHAR(1024) NOT NULL,
--     paid_rsvp BOOLEAN NOT NULL DEFAULT false,
--     qty_nasi_kulit_ayam_cabe_ijo INTEGER NOT NULL DEFAULT 0,
--     qty_nasi_kulit_ayam_sambal_matah INTEGER NOT NULL DEFAULT 0,
--     qty_nasi_kulit_ayam_sambal_bawang INTEGER NOT NULL DEFAULT 0,
--     qty_nasi_kulit_ayam_sambal_terasi INTEGER NOT NULL DEFAULT 0,
--     qty_nasi_ayam_geprek_cabe_ijo INTEGER NOT NULL DEFAULT 0,
--     qty_nasi_ayam_geprek_sambal_matah INTEGER NOT NULL DEFAULT 0,
--     qty_nasi_ayam_geprek_sambal_bawang INTEGER NOT NULL DEFAULT 0,
--     qty_nasi_ayam_geprek_sambal_terasi INTEGER NOT NULL DEFAULT 0,
--     qty_nasi_oseng_sapi_cabe_ijo INTEGER NOT NULL DEFAULT 0,
--     qty_nasi_oseng_sapi_sambal_matah INTEGER NOT NULL DEFAULT 0,
--     qty_nasi_oseng_sapi_sambal_bawang INTEGER NOT NULL DEFAULT 0,
--     qty_nasi_oseng_sapi_sambal_terasi INTEGER NOT NULL DEFAULT 0
-- );

CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
