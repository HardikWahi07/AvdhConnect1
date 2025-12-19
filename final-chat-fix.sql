-- ============================================
-- FINAL CHAT SCHEMA FIX
-- ============================================

-- 1. Add missing 'type' column to messages table
-- This is required for image and file attachments
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'text';

-- 2. Ensure foreign keys point to public.users
-- Conversations table
ALTER TABLE conversations
    DROP CONSTRAINT IF EXISTS conversations_participant1_id_fkey,
    DROP CONSTRAINT IF EXISTS conversations_participant2_id_fkey;

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

-- Messages table
ALTER TABLE messages
    DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;

ALTER TABLE messages
    ADD CONSTRAINT messages_sender_id_fkey
    FOREIGN KEY (sender_id)
    REFERENCES public.users(id)
    ON DELETE CASCADE;

-- 3. Ensure status column exists
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent';

-- 4. Verify RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Add missing update policy for conversations (to update last_message_at)
DROP POLICY IF EXISTS "Users can update their own conversations" ON conversations;
CREATE POLICY "Users can update their own conversations" 
ON conversations FOR UPDATE 
USING (auth.uid() = participant1_id OR auth.uid() = participant2_id)
WITH CHECK (auth.uid() = participant1_id OR auth.uid() = participant2_id);
