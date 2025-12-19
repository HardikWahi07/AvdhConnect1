-- Enable RLS on tables
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- USERS Table Policies
-- Allow users to read their own data
CREATE POLICY "Users can view own data" ON users
    FOR SELECT
    USING (auth.uid() = id);


-- Allow users to update their own data
CREATE POLICY "Users can update own data" ON users
    FOR UPDATE
    USING (auth.uid() = id);

-- CATEGORIES Table Policies
-- Allow public read access
CREATE POLICY "Public can view categories" ON categories
    FOR SELECT
    USING (true);


-- BUSINESSES Table Policies
-- Allow public read access (for approved businesses)
CREATE POLICY "Public can view approved businesses" ON businesses
    FOR SELECT
    USING (status = 'approved' OR auth.uid() = owner_id);

-- Allow business owners to insert their own business
CREATE POLICY "Owners can create business" ON businesses
    FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

-- Allow owners to update their own business
CREATE POLICY "Owners can update own business" ON businesses
    FOR UPDATE
    USING (auth.uid() = owner_id);

-- Allow owners to delete their own business
CREATE POLICY "Owners can delete own business" ON businesses
    FOR DELETE
    USING (auth.uid() = owner_id);

