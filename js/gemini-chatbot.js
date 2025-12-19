// ============ GEMINI AI CHATBOT ============

class GeminiChatbot {
    constructor() {
        this.chatButton = document.getElementById('aiChatBtn');
        this.chatModal = document.getElementById('chatModal');
        this.closeChatBtn = document.getElementById('closeChatBtn');
        this.chatMessages = document.getElementById('chatMessages');
        this.chatInput = document.getElementById('chatInput');
        this.sendChatBtn = document.getElementById('sendChatBtn');

        this.conversationHistory = [];
        this.isProcessing = false;
        this.lastRequestTime = 0;
        this.minRequestInterval = 2000; // Minimum 2 seconds between requests
        this.retryAttempts = 0;
        this.maxRetries = 3;

        this.init();
    }

    init() {
        // Event listeners
        if (this.chatButton) this.chatButton.addEventListener('click', () => this.openChat());
        if (this.closeChatBtn) this.closeChatBtn.addEventListener('click', () => this.closeChat());
        if (this.sendChatBtn) this.sendChatBtn.addEventListener('click', () => this.sendMessage());
        if (this.chatInput) {
            this.chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }

        // Add welcome message
        this.addMessage('ai', 'Hello! I\'m your AI assistant for BizHub. I can help you find businesses, answer questions about services, or assist with anything related to our business directory. How can I help you today?');
    }

    openChat() {
        this.chatModal.classList.add('active');
        if (this.chatInput) this.chatInput.focus();
    }

    closeChat() {
        this.chatModal.classList.remove('active');
    }

    async sendMessage() {
        if (!this.chatInput) return;

        const message = this.chatInput.value.trim();
        if (!message || this.isProcessing) return;

        // Check if we need to throttle
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        if (timeSinceLastRequest < this.minRequestInterval) {
            const waitTime = Math.ceil((this.minRequestInterval - timeSinceLastRequest) / 1000);
            this.addMessage('ai', `⏰ Please wait ${waitTime} second${waitTime > 1 ? 's' : ''} before sending another message.`);
            return;
        }

        // Add user message to chat
        this.addMessage('user', message);
        this.chatInput.value = '';
        this.isProcessing = true;
        this.sendChatBtn.disabled = true;
        this.lastRequestTime = now;

        // Show typing indicator
        this.addTypingIndicator();

        try {
            // Build context for Gemini
            // Build context for Gemini
            const systemContext = `You are an AI assistant for BizHub, a local business directory platform that connects residents with businesses.
      
Key information about BizHub:
- It's a platform where residents can browse and search for local businesses
- Businesses can create profiles, list products/services, and connect with customers
- Categories include: Food & Dining, Home Services, Healthcare, Education, Retail, Professional Services, etc.

WEBSITE AUTOMATION:
You are an AGENT that can control the website. DON'T just describe what to do - DO IT using the available tools.
- If a user asks to find something -> Use the search tool.
- If a user wants to go somewhere -> Use the navigate tool.
- If a user mentions dark/light mode -> Use the setTheme tool.
- If a user wants to scroll -> Use the scroll tool.

When answering questions:
- Be helpful, friendly, and concise
- For general questions, provide helpful answers while relating back to BizHub when appropriate
- Keep responses conversational and easy to understand`;

            // Use the shared AI service
            if (!window.aiService) {
                throw new Error("AI Service not initialized");
            }

            const response = await window.aiService.chat(message, systemContext, this.conversationHistory);

            // Remove typing indicator
            this.removeTypingIndicator();

            // Add AI response
            this.addMessage('ai', response);

            // Update history
            this.conversationHistory.push({ role: 'user', text: message });
            this.conversationHistory.push({ role: 'ai', text: response });

            this.retryAttempts = 0; // Reset retry counter on success

        } catch (error) {
            console.error('Error calling AI Service:', error);
            this.removeTypingIndicator();

            // Show user-friendly error message
            let errorMessage = 'Sorry, I encountered an error. ';

            if (error.message.includes('Rate limit') || error.message.includes('429')) {
                errorMessage = '⚡ The AI is currently experiencing high traffic (Rate Limit Exceeded). Please wait a minute before trying again.';
                // Backoff for UI interaction too
                this.minRequestInterval = 10000;
            } else if (error.message.includes('network') || error.message.includes('fetch')) {
                errorMessage = '🌐 Network error. Please check your internet connection.';
            } else {
                errorMessage += 'Please try again later.';
            }

            this.addMessage('ai', errorMessage);
        } finally {
            this.isProcessing = false;
            this.sendChatBtn.disabled = false;
            this.chatInput.focus();
        }
    }

    addMessage(role, text) {
        if (!this.chatMessages) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `ai-chat-message ${role}`;

        const avatar = document.createElement('div');
        avatar.className = `ai-message-avatar ${role}`;
        avatar.textContent = role === 'ai' ? 'AI' : 'U';

        const content = document.createElement('div');
        content.className = `ai-message-content`;
        content.textContent = text;

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(content);
        this.chatMessages.appendChild(messageDiv);

        // Scroll to bottom
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    addTypingIndicator() {
        if (!this.chatMessages) return;

        const indicator = document.createElement('div');
        indicator.className = 'ai-chat-message ai typing-indicator-container';
        indicator.id = 'typingIndicator';

        const avatar = document.createElement('div');
        avatar.className = `ai-message-avatar ai`;
        avatar.textContent = 'AI';

        const typingContent = document.createElement('div');
        typingContent.className = 'typing-indicator';
        typingContent.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';

        indicator.appendChild(avatar);
        indicator.appendChild(typingContent);
        this.chatMessages.appendChild(indicator);

        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    removeTypingIndicator() {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) {
            indicator.remove();
        }
    }
}

// Initialize chatbot when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new GeminiChatbot();
    });
} else {
    new GeminiChatbot();
}
