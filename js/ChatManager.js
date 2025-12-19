
class ChatManager {
    constructor(supabase, currentUser) {
        this.supabase = supabase;
        this.currentUser = currentUser;
        this.realtimeSubscription = null;
        this.presenceChannel = null;
        this.onMessageReceived = null;
        this.onStatusUpdated = null;
        this.onPresenceSync = null;
        this.currentConversationId = null;
    }

    setCallbacks({ onMessageReceived, onStatusUpdated, onPresenceSync }) {
        this.onMessageReceived = onMessageReceived;
        this.onStatusUpdated = onStatusUpdated;
        this.onPresenceSync = onPresenceSync;
    }

    async loadConversations() {
        if (!this.currentUser) return [];

        try {
            const { data: conversations, error } = await this.supabase
                .from('conversations')
                .select(`
                    *,
                    participant1:users!conversations_participant1_id_fkey(id, name),
                    participant2:users!conversations_participant2_id_fkey(id, name),
                    business:businesses(id, name, owner_id)
                `)
                .or(`participant1_id.eq.${this.currentUser.id},participant2_id.eq.${this.currentUser.id}`)
                .order('last_message_at', { ascending: false });

            if (error) {
                console.error('Supabase error loading conversations:', error);
                // Fallback for debugging - tell user to check SQL script
                if (window.showToast) window.showToast("Database error. Ensure SQL script was run.", "error");
                throw error;
            }

            return conversations.map(conv => this._formatConversation(conv));
        } catch (error) {
            console.error('Error loading conversations:', error);
            return [];
        }
    }

    _formatConversation(conv) {
        let otherUser = null;
        // Determine who the "other" participant is
        if (conv.participant1_id === this.currentUser.id) {
            otherUser = conv.participant2;
        } else {
            otherUser = conv.participant1;
        }

        // Determine Display Name
        // Logic: If chatting with a business owner about their business, show Business Name.
        // Unless I am the owner, then show the User's Name.
        let displayName = 'Unknown User';

        if (conv.business) {
            if (this.currentUser.id === conv.business.owner_id) {
                // I am the owner, show the other person's name
                displayName = otherUser ? otherUser.name : 'User';
            } else {
                // I am the user, show the Business Name
                displayName = conv.business.name;
            }
        } else {
            // No business context (direct chat?), fallback to user name
            displayName = otherUser ? otherUser.name : 'User';
        }

        return {
            id: conv.id,
            displayName: displayName,
            otherUserId: otherUser ? otherUser.id : null,
            businessId: conv.business_id,
            lastMessageAt: conv.last_message_at,
            initial: (displayName[0] || '?').toUpperCase()
        };
    }

    async loadMessages(conversationId) {
        this.currentConversationId = conversationId;
        try {
            const { data: messages, error } = await this.supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            return messages;
        } catch (error) {
            console.error('Error loading messages:', error);
            return [];
        }
    }

    async sendMessage(content, conversationId, type = 'text') {
        if (!content || !conversationId) return null;

        try {
            // 1. Insert Message
            const { data: msg, error } = await this.supabase
                .from('messages')
                .insert({
                    conversation_id: conversationId,
                    sender_id: this.currentUser.id,
                    content: String(content), // Ensure it's a string
                    type: type
                })
                .select()
                .single();

            if (error) {
                console.error('Supabase error inserting message:', error);
                throw error;
            }

            // 2. Update Conversation Timestamp (Fire and forget)
            this.supabase
                .from('conversations')
                .update({ last_message_at: new Date().toISOString() })
                .eq('id', conversationId)
                .then(({ error }) => {
                    if (error) console.error("Error updating conversation timestamp:", error);
                });

            return msg;
        } catch (error) {
            console.error('Error sending message:', error);
            return null;
        }
    }

    async markAsRead(conversationId) {
        if (!conversationId) return;

        // Mark all messages in this conversation as read where I am NOT the sender
        const { error } = await this.supabase
            .from('messages')
            .update({
                status: 'read'
            })
            .eq('conversation_id', conversationId)
            .neq('sender_id', this.currentUser.id)
            .neq('status', 'read');

        if (error) console.error("Error marking read:", error);
    }

    setupRealtime() {
        if (this.realtimeSubscription) return;

        this.realtimeSubscription = this.supabase
            .channel('public:messages')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
                if (this.onMessageReceived) this.onMessageReceived(payload.new);
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, payload => {
                if (this.onStatusUpdated) this.onStatusUpdated(payload.new);
            })
            .subscribe();
    }

    setupPresence(userId) {
        // If already connected, maybe unsubscribe first or just return?
        // For simplicity, let's keep one channel per app session for now.
        if (this.presenceChannel) return;

        this.presenceChannel = this.supabase.channel('online-users', {
            config: { presence: { key: userId } },
        });

        this.presenceChannel
            .on('presence', { event: 'sync' }, () => {
                const state = this.presenceChannel.presenceState();
                if (this.onPresenceSync) this.onPresenceSync(state);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await this.presenceChannel.track({
                        online_at: new Date().toISOString(),
                        typing: false
                    });
                }
            });
    }

    sendTyping(isTyping, conversationId) {
        if (!this.presenceChannel) return;
        this.presenceChannel.track({
            user_id: this.currentUser.id,
            online_at: new Date().toISOString(),
            typing: isTyping,
            conversation_id: conversationId
        });
    }
}
