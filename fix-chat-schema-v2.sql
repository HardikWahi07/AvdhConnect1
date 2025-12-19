-- ============================================
-- FIX CHAT SCHEMA FOREIGN KEYS
-- ============================================
-- This script updates the foreign keys in 'conversations' and 'messages' tables
-- to reference 'public.users' instead of 'auth.users'.
-- This is necessary for the application to fetch user names during chat.

-- 1. Fix CONVERSATIONS Table
-- Drop existing foreign keys (assuming standard naming)
ALTER TABLE conversations
    DROP CONSTRAINT IF EXISTS conversations_participant1_id_fkey,
    DROP CONSTRAINT IF EXISTS conversations_participant2_id_fkey;

-- Add new foreign keys referencing public.users
ALTER TABLE conversations
    ADD CONSTRAINT conversations_participant1_id_fkey
    FOREIGN KEY (participant1_id)
    REFERENCES public.users(id)
    ON DELETE CASCADE;

ALTER TABLE conversations
    ADD CONSTRAINT conversations_participant2_id_fkey
    FOREIGN KEY (participant2_id)
    REFERENCES public.users(id)
    ON DELETE CASCADE;


-- 2. Fix MESSAGES Table
-- Drop existing foreign key
ALTER TABLE messages
    DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;

-- Add new foreign key referencing public.users
ALTER TABLE messages
    ADD CONSTRAINT messages_sender_id_fkey
    FOREIGN KEY (sender_id)
    REFERENCES public.users(id)
    ON DELETE CASCADE;

-- 3. Verify Columns (Optional, ensures they exist)
DO $$
BEGIN
    -- Ensure status column exists in messages (from previous fix)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'status') THEN
        ALTER TABLE messages ADD COLUMN status TEXT DEFAULT 'sent';
    END IF;
END $$;
