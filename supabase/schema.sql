-- ==============================================================================
-- PLATTEROBE Production Database Schema for Supabase PostgreSQL
-- ==============================================================================
-- Idempotent, safe to re-run multiple times without dropping data or duplicate-policy errors.
-- Preserves all existing records, products, users, and customer orders.
-- ==============================================================================

-- 1. Enable UUID Extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 2. Categories Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Seed Categories with UPSERT (Safe to re-run; will never delete or duplicate categories)
INSERT INTO public.categories (id, display_name, description, sort_order)
VALUES 
    -- Active PLATTEROBE Categories
    ('breakfast', 'The Morning Edit', 'Wholesome, slow-release breakfast platters to start your day right.', 1),
    ('lunch', 'Midday Plates', 'Satisfying, high-protein midday fuel built for lasting satiety.', 2),
    ('dinner', 'Evening Plates', 'Light, nourishing plates for an effortless, wholesome evening.', 3),
    ('shakes-smoothies', 'Blended Goodness', 'Thick, drinkable whole-food blends with clean macros.', 4),
    ('fresh-juice', 'Fresh Press', 'Pure, freshly pressed fruit and vegetable juices.', 5),
    -- Legacy Category Aliases (guarantees backward compatibility with legacy product records)
    ('oats', 'The Morning Edit (Oats)', 'Wholesome slow-release oats.', 90),
    ('eggs', 'The Morning Edit (Eggs)', 'Fresh egg breakfast platters.', 91),
    ('pancake', 'The Morning Edit (Pancakes)', 'Protein pancakes and toast.', 92),
    ('fruit', 'The Morning Edit (Fruit)', 'Fresh fruit bowls and platters.', 93),
    ('sandwich', 'Midday Plates (Sandwich)', 'Toasted artisan sandwiches.', 94),
    ('pudding', 'Evening Plates (Pudding)', 'Chia seed puddings and bowls.', 95),
    ('smoothie', 'Blended Goodness (Smoothie)', 'Nutritious smoothies and shakes.', 96)
ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order;

-- ==============================================================================
-- 3. Products Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    subtitle TEXT NOT NULL DEFAULT '',
    short_description TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    why_youll_like_it TEXT NOT NULL DEFAULT '',
    price NUMERIC(10, 2),
    original_price NUMERIC(10, 2),
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    image TEXT NOT NULL,
    ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,
    nutrition JSONB NOT NULL DEFAULT '{}'::jsonb,
    available BOOLEAN NOT NULL DEFAULT TRUE,
    category TEXT NOT NULL DEFAULT 'breakfast' REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE SET DEFAULT,
    weight TEXT DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Performance Indexes (Idempotent)
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_available ON public.products(available);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_featured ON public.products(is_featured);
CREATE INDEX IF NOT EXISTS idx_products_sort_order ON public.products(sort_order);

-- ==============================================================================
-- 4. Administrators Table (Protected Admin Credentials)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- ==============================================================================
-- 5. Customer Orders & Inquiries Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    customer_name TEXT,
    customer_phone TEXT,
    product_id TEXT REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(10, 2),
    total_amount NUMERIC(10, 2),
    notes TEXT,
    source TEXT NOT NULL DEFAULT 'whatsapp',
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'confirmed', 'completed', 'cancelled'
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);

-- ==============================================================================
-- 6. Row Level Security (RLS) Configuration
-- ==============================================================================
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- Categories RLS Policies
-- ------------------------------------------------------------------------------
-- Clean up existing policies to avoid duplicate policy errors on re-run
DROP POLICY IF EXISTS "Public read categories" ON public.categories;
DROP POLICY IF EXISTS "Service role full access categories" ON public.categories;
DROP POLICY IF EXISTS "Allow public read categories" ON public.categories;

-- Public can read all categories for navigation and filtering
CREATE POLICY "Public read categories" ON public.categories
    FOR SELECT USING (true);

-- Only service role (server-side admin operations) can insert/update/delete categories
CREATE POLICY "Service role full access categories" ON public.categories
    FOR ALL USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ------------------------------------------------------------------------------
-- Products RLS Policies
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public read available products" ON public.products;
DROP POLICY IF EXISTS "Public read products" ON public.products;
DROP POLICY IF EXISTS "Allow public read access" ON public.products;
DROP POLICY IF EXISTS "Service role full access products" ON public.products;

-- Public visitors can read products (enables viewing catalog, sold out status, and product details)
CREATE POLICY "Public read products" ON public.products
    FOR SELECT USING (true);

-- Only service role (server-side admin operations) can create, update, or delete products
CREATE POLICY "Service role full access products" ON public.products
    FOR ALL USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ------------------------------------------------------------------------------
-- Users (Admin) RLS Policies
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Service role only users" ON public.users;
DROP POLICY IF EXISTS "Admin only users" ON public.users;

-- Public users have ZERO access to admin accounts and password hashes.
-- Only server-side auth routines using service_role key can read/verify users.
CREATE POLICY "Service role only users" ON public.users
    FOR ALL USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ------------------------------------------------------------------------------
-- Orders RLS Policies
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Service role full access orders" ON public.orders;
DROP POLICY IF EXISTS "Public create order inquiry" ON public.orders;

-- Public can record an order inquiry, with input sanity validation to prevent junk data.
-- Notice: NO SELECT policy for public! Public visitors CANNOT read other customers' orders or phone numbers.
CREATE POLICY "Public create order inquiry" ON public.orders
    FOR INSERT WITH CHECK (
        product_name IS NOT NULL AND 
        length(trim(product_name)) > 0 AND 
        quantity > 0
    );

-- Only service role (authorized server-side admin sessions) can view, update status, or delete orders.
CREATE POLICY "Service role full access orders" ON public.orders
    FOR ALL USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ==============================================================================
-- 7. Supabase Storage Setup (product-images Bucket)
-- ==============================================================================
-- Creates or updates bucket metadata idempotently. Compatible with existing user-created buckets.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'product-images',
    'product-images',
    true,
    5242880, -- 5 MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Storage RLS Policies for product-images bucket
DROP POLICY IF EXISTS "Public Access to product-images" ON storage.objects;
DROP POLICY IF EXISTS "Public Access product-images" ON storage.objects;
DROP POLICY IF EXISTS "Service Role Upload to product-images" ON storage.objects;
DROP POLICY IF EXISTS "Service Role Update to product-images" ON storage.objects;
DROP POLICY IF EXISTS "Service Role Delete from product-images" ON storage.objects;

-- 1. Anyone can view public product images
CREATE POLICY "Public Access to product-images" ON storage.objects
    FOR SELECT USING (bucket_id = 'product-images');

-- 2. Only authorized server operations (service_role) can upload new images
CREATE POLICY "Service Role Upload to product-images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'product-images' AND 
        auth.role() = 'service_role'
    );

-- 3. Only authorized server operations (service_role) can replace/update existing images
CREATE POLICY "Service Role Update to product-images" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'product-images' AND 
        auth.role() = 'service_role'
    );

-- 4. Only authorized server operations (service_role) can delete images
CREATE POLICY "Service Role Delete from product-images" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'product-images' AND 
        auth.role() = 'service_role'
    );

-- ==============================================================================
-- 8. PostgreSQL Role Grants (Prerequisite for RLS Evaluation)
-- ==============================================================================
-- Allow schema access
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Service Role (Full administrative access for server-side operations & migration)
GRANT ALL ON TABLE public.categories TO service_role;
GRANT ALL ON TABLE public.products TO service_role;
GRANT ALL ON TABLE public.users TO service_role;
GRANT ALL ON TABLE public.orders TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Public Visitors & Authenticated Users (Strictly read products/categories, insert orders)
-- Notice: NO grants on public.users! Admin accounts remain 100% inaccessible to public.
GRANT SELECT ON TABLE public.categories TO anon, authenticated;
GRANT SELECT ON TABLE public.products TO anon, authenticated;
GRANT INSERT ON TABLE public.orders TO anon, authenticated;

