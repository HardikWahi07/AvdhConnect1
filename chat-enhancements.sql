-- Add status columns to messages if they don't exist
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'sent', -- sent, delivered, read
ADD COLUMN IF NOT EXISTS read_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]';

-- Create an index/policy for faster updates if needed (optional but good practice)
CREATE INDEX IF NOT EXISTS idx_messages_conversation_status ON public.messages(conversation_id, status);

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_read(p_conversation_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.messages
  SET status = 'read',
      read_at = now()
  WHERE conversation_id = p_conversation_id
    AND sender_id != p_user_id
    AND status != 'read';
END;
$$;
