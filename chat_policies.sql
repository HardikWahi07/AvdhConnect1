-- Enable RLS for Chat Tables
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- CONVERSATIONS Policies

-- View: Users can view conversations they are part of
CREATE POLICY "Users can view their conversations" ON conversations
    FOR SELECT
    USING (auth.uid() = participant1_id OR auth.uid() = participant2_id);

-- Insert: Users can start conversations (must be one of the participants)
CREATE POLICY "Users can create conversations" ON conversations
    FOR INSERT
    WITH CHECK (auth.uid() = participant1_id OR auth.uid() = participant2_id);

-- MESSAGES Policies

-- View: Users can view messages in conversations they belong to
CREATE POLICY "Users can view messages in their conversations" ON messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE id = messages.conversation_id 
            AND (participant1_id = auth.uid() OR participant2_id = auth.uid())
        )
    );

-- Insert: Users can send messages as themselves
CREATE POLICY "Users can insert their own messages" ON messages
    FOR INSERT
    WITH CHECK (
        auth.uid() = sender_id 
    );

-- Update: Users can mark messages as read? (Typically status updates)
-- For now, allow updating messages in their conversations (e.g. read status)
CREATE POLICY "Users can update messages in their conversations" ON messages
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE id = messages.conversation_id 
            AND (participant1_id = auth.uid() OR participant2_id = auth.uid())
        )
    );
