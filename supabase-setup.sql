-- ============================================
-- AVADH CONNECT - SUPABASE DATABASE SETUP
-- ============================================
-- This SQL script sets up the complete database schema for Avadh Connect
-- Run this in your Supabase SQL Editor

-- ============================================
-- 1. ENABLE EXTENSIONS
-- ============================================

-- Enable UUID extension for generating unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 2. CREATE TABLES
-- ============================================

-- -----------------------------
-- Users Table
-- -----------------------------
-- Stores user information for both normal and business accounts
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    business_name TEXT,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    account_type TEXT NOT NULL CHECK (account_type IN ('normal', 'business')),
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user')),
    is_approved BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------
-- Categories Table
-- -----------------------------
-- Stores business categories
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    icon TEXT NOT NULL,
    description TEXT,
    "order" INTEGER DEFAULT 100,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------
-- Businesses Table
-- -----------------------------
-- Stores business listings
CREATE TABLE IF NOT EXISTS public.businesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    phone TEXT NOT NULL,
    email TEXT,
    address TEXT NOT NULL,
    website TEXT,
    images TEXT[] DEFAULT '{}',
    owner_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------
-- Products Table
-- -----------------------------
-- Stores products/services for each business
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10, 2),
    images TEXT[] DEFAULT '{}',
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- ============================================

-- Index on users email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Index on users account_type for filtering
CREATE INDEX IF NOT EXISTS idx_users_account_type ON public.users(account_type);


-- Index on categories order for sorting
CREATE INDEX IF NOT EXISTS idx_categories_order ON public.categories("order");

-- Index on businesses owner_id for filtering by owner
CREATE INDEX IF NOT EXISTS idx_businesses_owner_id ON public.businesses(owner_id);

-- Index on businesses category_id for filtering by category
CREATE INDEX IF NOT EXISTS idx_businesses_category_id ON public.businesses(category_id);

-- Index on businesses status for filtering
CREATE INDEX IF NOT EXISTS idx_businesses_status ON public.businesses(status);

-- Index on products business_id for filtering by business
CREATE INDEX IF NOT EXISTS idx_products_business_id ON public.products(business_id);

-- Index on products is_active for filtering active products
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);

-- Full-text search index on businesses
CREATE INDEX IF NOT EXISTS idx_businesses_name_search ON public.businesses USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_businesses_description_search ON public.businesses USING gin(to_tsvector('english', COALESCE(description, '')));

-- Full-text search index on products
CREATE INDEX IF NOT EXISTS idx_products_name_search ON public.products USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_products_description_search ON public.products USING gin(to_tsvector('english', COALESCE(description, '')));

-- ============================================
-- 4. CREATE FUNCTIONS AND TRIGGERS
-- ============================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update trigger to users table
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply update trigger to categories table
DROP TRIGGER IF EXISTS update_categories_updated_at ON public.categories;
CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON public.categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply update trigger to businesses table
DROP TRIGGER IF EXISTS update_businesses_updated_at ON public.businesses;
CREATE TRIGGER update_businesses_updated_at
    BEFORE UPDATE ON public.businesses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply update trigger to products table
DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- -----------------------------
-- USERS TABLE POLICIES
-- -----------------------------

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;

-- Allow users to read all user profiles
CREATE POLICY "Users can view all profiles"
    ON public.users FOR SELECT
    USING (true);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = id);

-- Allow users to insert their own profile (for registration)
CREATE POLICY "Users can insert own profile"
    ON public.users FOR INSERT
    WITH CHECK (auth.uid() = id);


-- -----------------------------
-- CATEGORIES TABLE POLICIES
-- -----------------------------

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view categories" ON public.categories;
DROP POLICY IF EXISTS "Only admins can delete categories" ON public.categories;

-- Allow everyone to read categories
CREATE POLICY "Anyone can view categories"
    ON public.categories FOR SELECT
    USING (true);


-- -----------------------------
-- BUSINESSES TABLE POLICIES
-- -----------------------------

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view approved businesses" ON public.businesses;
DROP POLICY IF EXISTS "Business owners can create businesses" ON public.businesses;
DROP POLICY IF EXISTS "Business owners can update own businesses" ON public.businesses;
DROP POLICY IF EXISTS "Business owners can update own businesses" ON public.businesses;

-- Allow everyone to view approved businesses
CREATE POLICY "Anyone can view approved businesses"
    ON public.businesses FOR SELECT
    USING (status = 'approved' OR owner_id = auth.uid());

-- Business owners can insert their own businesses
CREATE POLICY "Business owners can create businesses"
    ON public.businesses FOR INSERT
    WITH CHECK (
        auth.uid() = owner_id AND
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND account_type = 'business'
        )
    );

-- Business owners can update their own businesses
CREATE POLICY "Business owners can update own businesses"
    ON public.businesses FOR UPDATE
    USING (auth.uid() = owner_id);

-- Business owners can delete businesses
CREATE POLICY "Business owners can delete businesses"
    ON public.businesses FOR DELETE
    USING (auth.uid() = owner_id);

-- -----------------------------
-- PRODUCTS TABLE POLICIES
-- -----------------------------

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;
DROP POLICY IF EXISTS "Business owners can create products" ON public.products;
DROP POLICY IF EXISTS "Business owners can update own products" ON public.products;
DROP POLICY IF EXISTS "Business owners can update own products" ON public.products;

-- Allow everyone to view active products from approved businesses
CREATE POLICY "Anyone can view active products"
    ON public.products FOR SELECT
    USING (
        is_active = true OR
        EXISTS (
            SELECT 1 FROM public.businesses
            WHERE id = business_id AND owner_id = auth.uid()
        )
    );

-- Business owners can insert products for their businesses
CREATE POLICY "Business owners can create products"
    ON public.products FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.businesses
            WHERE id = business_id AND owner_id = auth.uid()
        )
    );

-- Business owners can update their own products
CREATE POLICY "Business owners can update own products"
    ON public.products FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.businesses
            WHERE id = business_id AND owner_id = auth.uid()
        )
    );

-- Business owners can delete products
CREATE POLICY "Business owners can delete products"
    ON public.products FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.businesses
            WHERE id = business_id AND owner_id = auth.uid()
        )
    );

-- ============================================
-- 6. STORAGE BUCKET SETUP
-- ============================================

-- Create storage bucket for images
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Anyone can view images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;

-- Storage policies for images bucket
CREATE POLICY "Anyone can view images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'images');

CREATE POLICY "Authenticated users can upload images"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'images' AND
        auth.role() = 'authenticated'
    );

CREATE POLICY "Users can update their own images"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'images' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own images"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'images' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- ============================================
-- 7. INSERT DEFAULT CATEGORIES
-- ============================================

-- Insert default categories for the application
-- Using DO block to handle duplicates gracefully
DO $$
BEGIN
    -- Restaurants
    IF NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Restaurants') THEN
        INSERT INTO public.categories (name, icon, description, "order") 
        VALUES ('Restaurants', '🍽️', 'Food and dining establishments', 1);
    END IF;
    
    -- Groceries
    IF NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Groceries') THEN
        INSERT INTO public.categories (name, icon, description, "order") 
        VALUES ('Groceries', '🛒', 'Grocery stores and markets', 2);
    END IF;
    
    -- Healthcare
    IF NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Healthcare') THEN
        INSERT INTO public.categories (name, icon, description, "order") 
        VALUES ('Healthcare', '🏥', 'Medical services and pharmacies', 3);
    END IF;
    
    -- Education
    IF NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Education') THEN
        INSERT INTO public.categories (name, icon, description, "order") 
        VALUES ('Education', '📚', 'Schools, tutors, and educational services', 4);
    END IF;
    
    -- Beauty & Wellness
    IF NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Beauty & Wellness') THEN
        INSERT INTO public.categories (name, icon, description, "order") 
        VALUES ('Beauty & Wellness', '💆', 'Salons, spas, and fitness centers', 5);
    END IF;
    
    -- Home Services
    IF NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Home Services') THEN
        INSERT INTO public.categories (name, icon, description, "order") 
        VALUES ('Home Services', '🔧', 'Plumbing, electrical, and repairs', 6);
    END IF;
    
    -- Electronics
    IF NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Electronics') THEN
        INSERT INTO public.categories (name, icon, description, "order") 
        VALUES ('Electronics', '💻', 'Electronic stores and services', 7);
    END IF;
    
    -- Fashion
    IF NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Fashion') THEN
        INSERT INTO public.categories (name, icon, description, "order") 
        VALUES ('Fashion', '👔', 'Clothing and accessories', 8);
    END IF;
    
    -- Real Estate
    IF NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Real Estate') THEN
        INSERT INTO public.categories (name, icon, description, "order") 
        VALUES ('Real Estate', '🏘️', 'Property and rental services', 9);
    END IF;
    
    -- Automotive
    IF NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Automotive') THEN
        INSERT INTO public.categories (name, icon, description, "order") 
        VALUES ('Automotive', '🚗', 'Car repairs and services', 10);
    END IF;
    
    -- Entertainment
    IF NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Entertainment') THEN
        INSERT INTO public.categories (name, icon, description, "order") 
        VALUES ('Entertainment', '🎭', 'Events, cinema, and entertainment', 11);
    END IF;
    
    -- Professional Services
    IF NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Professional Services') THEN
        INSERT INTO public.categories (name, icon, description, "order") 
        VALUES ('Professional Services', '💼', 'Legal, accounting, and consulting', 12);
    END IF;
END $$;

-- SETUP COMPLETE!
-- ============================================
-- Your Avadh Connect database is now ready to use.
-- 
-- Next steps:
-- 1. Update your .env.example with your Supabase credentials
-- 2. Test registration and login
-- 3. Create your first business listing
-- 4. Add products to your business!
