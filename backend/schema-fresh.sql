-- =============================================================================
-- Nibbles & nOOk — fresh `orders` table (new database only)
-- =============================================================================
-- For an existing Supabase project, use upgrade-schema.sql instead.
-- =============================================================================

CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(36) PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(64) NOT NULL,
    total_price INTEGER NOT NULL,
    proof_original_filename VARCHAR(512) NOT NULL,
    proof_file_path VARCHAR(1024) NOT NULL,
    paid_rsvp BOOLEAN NOT NULL DEFAULT false,

    -- Main dish
    qty_nasi_bakar_ayam_kemangi INTEGER NOT NULL DEFAULT 0,
    qty_nasi_bakar_cumi INTEGER NOT NULL DEFAULT 0,
    qty_nasi_bakar_ikan INTEGER NOT NULL DEFAULT 0,
    qty_bakmi_no_pork_no_lard INTEGER NOT NULL DEFAULT 0,

    -- Sate
    qty_sate_quail_eggs INTEGER NOT NULL DEFAULT 0,
    qty_sate_kulit INTEGER NOT NULL DEFAULT 0,

    -- Extra sambal
    qty_sambel_bawang INTEGER NOT NULL DEFAULT 0,
    qty_sambel_ijo INTEGER NOT NULL DEFAULT 0,
    qty_sambel_matah INTEGER NOT NULL DEFAULT 0,

    -- Pastries
    qty_nama_donut_earl_grey INTEGER NOT NULL DEFAULT 0,
    qty_nama_donut_mocha_nougat INTEGER NOT NULL DEFAULT 0,
    qty_nama_donut_mango_pomelo_sago INTEGER NOT NULL DEFAULT 0,
    qty_butter_tteok INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

COMMENT ON COLUMN orders.total_price IS
  'Food orders: total in cents. RSVP-only rows may use whole dollars.';
