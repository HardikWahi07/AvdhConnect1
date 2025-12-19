-- ============================================
-- FIX PERMISSIONS & SCHEMA
-- ============================================

-- 1. Enable Delete for Business Owners
-- Run this to allow the delete button to work!
DROP POLICY IF EXISTS "Enable delete for owners" ON "public"."businesses";

CREATE POLICY "Enable delete for owners" ON "public"."businesses"
AS PERMISSIVE FOR DELETE
TO public
USING (auth.uid() = owner_id);


-- 2. Create Analytics Table (If you missed the previous file)
-- This fixes the "Could not find table business_stats" error
CREATE TABLE IF NOT EXISTS public.business_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    views INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    inquiries INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(business_id, date)
);

-- 3. Analytics RLS
ALTER TABLE public.business_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can view own stats" ON public.business_stats;

CREATE POLICY "Owners can view own stats"
    ON public.business_stats FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.businesses
            WHERE id = business_stats.business_id AND owner_id = auth.uid()
        )
    );

-- 4. Analytics Function
CREATE OR REPLACE FUNCTION increment_business_stat(
    p_business_id UUID,
    p_metric_type TEXT
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.business_stats (business_id, date, views, clicks, inquiries)
    VALUES (
        p_business_id, 
        CURRENT_DATE, 
        CASE WHEN p_metric_type = 'view' THEN 1 ELSE 0 END,
        CASE WHEN p_metric_type = 'click' THEN 1 ELSE 0 END,
        CASE WHEN p_metric_type = 'inquiry' THEN 1 ELSE 0 END
    )
    ON CONFLICT (business_id, date)
    DO UPDATE SET
        views = business_stats.views + CASE WHEN p_metric_type = 'view' THEN 1 ELSE 0 END,
        clicks = business_stats.clicks + CASE WHEN p_metric_type = 'click' THEN 1 ELSE 0 END,
        inquiries = business_stats.inquiries + CASE WHEN p_metric_type = 'inquiry' THEN 1 ELSE 0 END,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Fix Chat Relationships (Fixes 400 Error)
-- Change references from auth.users to public.users to allow fetching names
DO $$
BEGIN
    -- Drop old constraints (if they exist pointing to auth.users)
    -- We try to catch possible names. Default is usually conversations_participant1_id_fkey
    BEGIN
        ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_participant1_id_fkey;
    EXCEPTION WHEN OTHERS THEN NULL; END;
    
    BEGIN
        ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_participant2_id_fkey;
    EXCEPTION WHEN OTHERS THEN NULL; END;
    
    -- Add new constraints pointing to public.users
    -- This enables joining: participant1:participant1_id(name)
    ALTER TABLE conversations 
    ADD CONSTRAINT conversations_participant1_id_fkey 
    FOREIGN KEY (participant1_id) REFERENCES public.users(id);

    ALTER TABLE conversations 
    ADD CONSTRAINT conversations_participant2_id_fkey 
    FOREIGN KEY (participant2_id) REFERENCES public.users(id);
    
    -- Ensure last_message_at exists (fixes sorting error if missing)
    ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error updating chat constraints: %', SQLERRM;
END $$;
