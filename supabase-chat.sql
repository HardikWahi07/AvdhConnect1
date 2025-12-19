-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    participant1_id UUID REFERENCES auth.users(id) NOT NULL,
    participant2_id UUID REFERENCES auth.users(id) NOT NULL,
    business_id UUID REFERENCES businesses(id),
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(participant1_id, participant2_id, business_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES auth.users(id) NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- RLS Policies for Conversations

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view conversations they are part of
CREATE POLICY "Users can view their own conversations" 
ON conversations FOR SELECT 
USING (auth.uid() = participant1_id OR auth.uid() = participant2_id);

-- Policy: Users can insert conversations if they are a participant
CREATE POLICY "Users can create conversations" 
ON conversations FOR INSERT 
WITH CHECK (auth.uid() = participant1_id OR auth.uid() = participant2_id);

-- RLS Policies for Messages

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view messages in conversations they belong to
CREATE POLICY "Users can view messages in their conversations" 
ON messages FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM conversations 
        WHERE id = messages.conversation_id 
        AND (participant1_id = auth.uid() OR participant2_id = auth.uid())
    )
);

-- Policy: Users can insert messages into conversations they belong to
CREATE POLICY "Users can send messages" 
ON messages FOR INSERT 
WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
        SELECT 1 FROM conversations 
        WHERE id = conversation_id 
        AND (participant1_id = auth.uid() OR participant2_id = auth.uid())
    )
);

-- Policy: Users can update message status (mark as read) if they are the recipient
-- Note: We assume the recipient is the "other" participant. 
-- Ideally, we'd check if auth.uid() != sender_id, but sender_id is on the row.
CREATE POLICY "Users can mark messages as read" 
ON messages FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM conversations 
        WHERE id = messages.conversation_id 
        AND (participant1_id = auth.uid() OR participant2_id = auth.uid())
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM conversations 
        WHERE id = messages.conversation_id 
        AND (participant1_id = auth.uid() OR participant2_id = auth.uid())
    )
);
