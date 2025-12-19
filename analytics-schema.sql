-- ============================================
-- BUSINESS ANALYTICS SCHEMA
-- ============================================

-- 1. Create Analytics Table
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

-- 2. Create Indexes
CREATE INDEX IF NOT EXISTS idx_business_stats_business_id ON public.business_stats(business_id);
CREATE INDEX IF NOT EXISTS idx_business_stats_date ON public.business_stats(date);

-- 3. RLS Policies
ALTER TABLE public.business_stats ENABLE ROW LEVEL SECURITY;

-- Allow updates (via RPC) and reads for owners
CREATE POLICY "Owners can view own stats"
    ON public.business_stats FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.businesses
            WHERE id = business_stats.business_id AND owner_id = auth.uid()
        )
    );

-- 4. RPC Function for Atomic Updates
-- securely increments stats without giving direct update access
CREATE OR REPLACE FUNCTION increment_business_stat(
    p_business_id UUID,
    p_metric_type TEXT -- 'view', 'click', 'inquiry'
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
