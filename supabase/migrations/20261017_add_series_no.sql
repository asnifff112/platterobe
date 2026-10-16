-- ==============================================================================
-- Migration: Add Product Series Number & Uniqueness Index
-- Date: 2026-10-17
-- Safe and non-destructive for existing products, orders, and users.
-- ==============================================================================

-- 1. Add series_no column to public.products if it doesn't exist
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS series_no TEXT;

-- 2. Create case-insensitive partial unique index
-- The WHERE clause ensures existing products with NULL or empty series numbers
-- do NOT cause constraint violations.
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_series_no
ON public.products (UPPER(TRIM(series_no)))
WHERE series_no IS NOT NULL AND TRIM(series_no) <> '';

-- 3. Comments for schema documentation
COMMENT ON COLUMN public.products.series_no IS 'Unique public series number for QR indexing and physical platter label verification (e.g. PLTR.001)';
