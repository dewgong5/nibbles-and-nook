-- Nibbles & nOOk: single flat orders table (Supabase / PostgreSQL)
-- Run this in the Supabase SQL Editor to migrate from the old two-table schema.

-- Drop old tables if they exist
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;

CREATE TABLE orders (
    id VARCHAR(36) PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(64) NOT NULL,
    qty_nasi_bakar_3_rasa INTEGER NOT NULL DEFAULT 0,
    qty_cendol INTEGER NOT NULL DEFAULT 0,
    qty_nasi_bakar_and_cendol INTEGER NOT NULL DEFAULT 0,
    qty_nasi_ulam_betawi INTEGER NOT NULL DEFAULT 0,
    total_price INTEGER NOT NULL DEFAULT 0,
    proof_original_filename VARCHAR(512) NOT NULL,
    proof_file_path VARCHAR(1024) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
