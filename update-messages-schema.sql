-- Add type and media_url columns to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'text',
ADD COLUMN IF NOT EXISTS media_url TEXT;

-- Update existing messages to have type 'text'
UPDATE messages SET type = 'text' WHERE type IS NULL;
