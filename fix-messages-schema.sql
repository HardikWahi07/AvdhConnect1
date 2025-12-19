-- Fix messages table schema to match what the code expects
-- Run this in Supabase SQL editor

-- Add missing columns to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent',
ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;

-- Update existing records to have status based on is_read
UPDATE messages 
SET status = CASE 
    WHEN is_read = TRUE THEN 'read'
    ELSE 'sent'
END
WHERE status IS NULL;

-- Optionally: can drop is_read column if not used elsewhere
-- ALTER TABLE messages DROP COLUMN IF EXISTS is_read;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
ON messages(conversation_id, created_at);

CREATE INDEX IF NOT EXISTS idx_messages_status 
ON messages(status);
