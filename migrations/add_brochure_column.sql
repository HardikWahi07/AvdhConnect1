-- Add brochure_url column to businesses table
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS brochure_url TEXT;

-- Create storage bucket for brochures if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('brochures', 'brochures', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow authenticated users to upload brochures
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'brochures');

-- Policy to allow public to view brochures
CREATE POLICY "Allow public viewing" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'brochures');

-- Policy to allow owners to update/delete their brochures (simplified for now to authenticated)
CREATE POLICY "Allow authenticated updates" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'brochures');
