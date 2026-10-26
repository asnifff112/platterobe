-- ==============================================================================
-- PLATTEROBE Multi-Country Migration: India + UAE Support
-- ==============================================================================
-- Safe, backward-compatible migration. Does NOT delete or modify existing data.
-- All new columns have safe defaults:
--   - available_in_india defaults to TRUE (preserves current India visibility)
--   - available_in_uae defaults to FALSE (nothing auto-published in UAE)
--   - published_in_india defaults to 'published' (existing products stay published)
--   - published_in_uae defaults to 'draft' (nothing auto-published in UAE)
-- ==============================================================================

-- 1. UAE Pricing Columns
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS price_aed NUMERIC(10, 2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS original_price_aed NUMERIC(10, 2);

-- 2. Per-Country Availability Toggles
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS available_in_india BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS available_in_uae BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Per-Country Publication Status
-- Values: 'draft', 'published', 'unavailable'
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS published_in_india TEXT NOT NULL DEFAULT 'published';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS published_in_uae TEXT NOT NULL DEFAULT 'draft';

-- 4. Sync existing India availability from global `available` column
-- Ensures products that were marked unavailable stay unavailable in India
UPDATE public.products SET available_in_india = available;

-- 5. Performance Indexes for Country-Specific Queries
CREATE INDEX IF NOT EXISTS idx_products_available_india ON public.products(available_in_india);
CREATE INDEX IF NOT EXISTS idx_products_available_uae ON public.products(available_in_uae);
CREATE INDEX IF NOT EXISTS idx_products_published_india ON public.products(published_in_india);
CREATE INDEX IF NOT EXISTS idx_products_published_uae ON public.products(published_in_uae);
CREATE INDEX IF NOT EXISTS idx_products_price_aed ON public.products(price_aed);
