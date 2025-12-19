-- ============================================
-- FIX FOR RLS POLICY RECURSION ISSUE
-- ============================================
-- This fixes the 500 errors caused by recursive policy checks
-- Run this in your Supabase SQL Editor AFTER running the main setup

-- ============================================
-- DROP ALL EXISTING POLICIES
-- ============================================

-- Drop users policies
DROP POLICY IF EXISTS "Users can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;

-- Drop categories policies
DROP POLICY IF EXISTS "Anyone can view categories" ON public.categories;
DROP POLICY IF EXISTS "Only admins can delete categories" ON public.categories;

-- Drop businesses policies
DROP POLICY IF EXISTS "Anyone can view approved businesses" ON public.businesses;
DROP POLICY IF EXISTS "Business owners can create businesses" ON public.businesses;
DROP POLICY IF EXISTS "Business owners can update own businesses" ON public.businesses;
DROP POLICY IF EXISTS "Business owners can update own businesses" ON public.businesses;

-- Drop products policies
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;
DROP POLICY IF EXISTS "Business owners can create products" ON public.products;
DROP POLICY IF EXISTS "Business owners can update own products" ON public.products;
DROP POLICY IF EXISTS "Business owners can update own products" ON public.products;

-- ============================================
-- CREATE SIMPLIFIED, NON-RECURSIVE POLICIES
-- ============================================

-- -----------------------------
-- USERS TABLE POLICIES (SIMPLIFIED)
-- -----------------------------

-- Allow authenticated users to read all user profiles
CREATE POLICY "Users can view all profiles"
    ON public.users FOR SELECT
    TO authenticated
    USING (true);

-- Allow users to update their own profile only
CREATE POLICY "Users can update own profile"
    ON public.users FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Allow users to insert their own profile (for registration)
CREATE POLICY "Users can insert own profile"
    ON public.users FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- Allow users to delete their own profile
CREATE POLICY "Users can delete own profile"
    ON public.users FOR DELETE
    TO authenticated
    USING (auth.uid() = id);

-- -----------------------------
-- CATEGORIES TABLE POLICIES (SIMPLIFIED)
-- -----------------------------

-- Allow everyone (even unauthenticated) to view categories
CREATE POLICY "Anyone can view categories"
    ON public.categories FOR SELECT
    USING (true);

-- Allow authenticated users to manage categories
CREATE POLICY "Authenticated users can insert categories"
    ON public.categories FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update categories"
    ON public.categories FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can delete categories"
    ON public.categories FOR DELETE
    TO authenticated
    USING (true);

-- -----------------------------
-- BUSINESSES TABLE POLICIES (SIMPLIFIED)
-- -----------------------------

-- Allow everyone to view approved businesses
CREATE POLICY "Public can view approved businesses"
    ON public.businesses FOR SELECT
    USING (status = 'approved' OR owner_id = auth.uid());

-- Allow authenticated users to create businesses
CREATE POLICY "Authenticated users can create businesses"
    ON public.businesses FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = owner_id);

-- Allow business owners to update their own businesses
CREATE POLICY "Owners can update own businesses"
    ON public.businesses FOR UPDATE
    TO authenticated
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

-- Allow business owners to delete their own businesses
CREATE POLICY "Owners can delete own businesses"
    ON public.businesses FOR DELETE
    TO authenticated
    USING (auth.uid() = owner_id);

-- -----------------------------
-- PRODUCTS TABLE POLICIES (SIMPLIFIED)
-- -----------------------------

-- Allow everyone to view active products
CREATE POLICY "Public can view active products"
    ON public.products FOR SELECT
    USING (
        is_active = true OR
        EXISTS (
            SELECT 1 FROM public.businesses b
            WHERE b.id = products.business_id 
            AND b.owner_id = auth.uid()
        )
    );

-- Allow business owners to create products
CREATE POLICY "Owners can create products"
    ON public.products FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.businesses b
            WHERE b.id = business_id 
            AND b.owner_id = auth.uid()
        )
    );

-- Allow business owners to update their products
CREATE POLICY "Owners can update products"
    ON public.products FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.businesses b
            WHERE b.id = business_id 
            AND b.owner_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.businesses b
            WHERE b.id = business_id 
            AND b.owner_id = auth.uid()
        )
    );

-- Allow business owners to delete their products
CREATE POLICY "Owners can delete products"
    ON public.products FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.businesses b
            WHERE b.id = business_id 
            AND b.owner_id = auth.uid()
        )
    );


-- DONE! POLICIES FIXED
-- ============================================
-- Your app should now work without 500 errors
