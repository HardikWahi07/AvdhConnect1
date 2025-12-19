
class UIManager {
    constructor() {
        this.elements = {
            sidebar: document.getElementById('chatSidebar'),
            conversationList: document.getElementById('conversationList'),
            chatMain: document.getElementById('chatMain'),
            messagesArea: document.getElementById('messagesArea'),
            emptyState: document.getElementById('emptyState'),
            chatHeaderName: document.getElementById('chatHeaderName'),
            chatHeaderAvatar: document.getElementById('chatHeaderAvatar'),
            chatHeaderStatus: document.getElementById('chatHeaderStatus'),
            messageInput: document.getElementById('messageInput'),
            sendBtn: document.getElementById('sendBtn')
        };

        this.gradients = [
            'from-indigo-500 to-purple-600',
            'from-amber-400 to-orange-600',
            'from-emerald-400 to-teal-600',
            'from-rose-400 to-pink-600',
            'from-blue-400 to-indigo-600'
        ];
        this.activeOtherUserId = null;
    }

    toggleLoading(isLoading) {
        if (isLoading) {
            this.elements.conversationList.innerHTML = `
                <div class="flex flex-col items-center justify-center h-40 text-gray-400 animate-pulse">
                    <div class="w-8 h-8 border-2 border-gray-300 border-t-primary-500 rounded-full animate-spin mb-2"></div>
                    <span class="text-xs font-medium tracking-wide uppercase">Loading Chats</span>
                </div>`;
        }
    }

    renderConversations(conversations, onSelect) {
        this.elements.conversationList.innerHTML = '';

        if (conversations.length === 0) {
            this.elements.conversationList.innerHTML = `
                <div class="flex flex-col items-center justify-center h-64 text-gray-400 p-6 text-center">
                    <p class="text-sm">No conversations yet.</p>
                    <button onclick="openNewChatModal()" class="mt-4 text-primary-600 hover:text-primary-500 text-sm font-medium transition-colors">Start a new chat</button>
                </div>`;
            return;
        }

        conversations.forEach(conv => {
            const gradientIndex = conv.initial.charCodeAt(0) % this.gradients.length;
            const gradientClass = this.gradients[gradientIndex];

            const div = document.createElement('div');
            div.className = 'sidebar-item group p-4 rounded-2xl cursor-pointer flex items-center gap-4';
            div.dataset.id = conv.id;

            let dateDisplay = '';
            if (conv.lastMessageAt) {
                const date = new Date(conv.lastMessageAt);
                const now = new Date();
                dateDisplay = date.toDateString() === now.toDateString()
                    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : date.toLocaleDateString();
            }

            div.innerHTML = `
                <div class="relative w-12 h-12 rounded-2xl bg-gradient-to-br ${gradientClass} text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-lg shadow-black/5 group-hover:scale-105 transition-transform duration-300">
                    ${conv.initial}
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex justify-between items-baseline mb-0.5">
                        <div class="font-bold text-gray-900 dark:text-white truncate text-[15px]">${this._escapeHtml(conv.displayName)}</div>
                        <div class="text-[10px] text-gray-400 font-medium">${dateDisplay}</div>
                    </div>
                    <div class="text-xs text-gray-500 truncate opacity-80">Click to view messages</div>
                </div>
            `;

            div.onclick = () => {
                this._setActiveConversation(div);
                onSelect(conv);
            };
            this.elements.conversationList.appendChild(div);
        });
    }

    _setActiveConversation(element) {
        document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
        element.classList.add('active');
    }

    openChatView(conv) {
        this.elements.emptyState.classList.add('hidden');
        this.elements.chatMain.classList.remove('hidden');
        this.elements.chatMain.classList.add('flex');

        if (window.innerWidth < 768) {
            this.elements.sidebar.classList.add('hidden');
        }

        this.elements.chatHeaderName.textContent = conv.displayName;

        const gradientIndex = conv.initial.charCodeAt(0) % this.gradients.length;
        const gradientClass = this.gradients[gradientIndex];
        this.elements.chatHeaderAvatar.className = `w-11 h-11 rounded-2xl bg-gradient-to-br ${gradientClass} text-white flex items-center justify-center font-bold text-lg shadow-lg`;
        this.elements.chatHeaderAvatar.textContent = conv.initial;

        this.elements.messagesArea.innerHTML = '';
        this.updateStatus(false, false);
        this.activeOtherUserId = conv.otherUserId;
    }

    renderMessages(messages, currentUserId) {
        this.elements.messagesArea.innerHTML = '';
        let lastDate = null;

        messages.forEach(msg => {
            const msgDate = new Date(msg.created_at).toDateString();
            if (msgDate !== lastDate) {
                this._renderDateDivider(msgDate);
                lastDate = msgDate;
            }
            this.appendMessage(msg, currentUserId);
        });
        this.scrollToBottom();
    }

    _renderDateDivider(dateStr) {
        const dateDiv = document.createElement('div');
        dateDiv.className = 'flex justify-center my-8';
        dateDiv.innerHTML = `
            <span class="px-4 py-1.5 rounded-full bg-white/10 dark:bg-slate-800/50 backdrop-blur-md border border-white/10 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                ${dateStr}
            </span>`;
        this.elements.messagesArea.appendChild(dateDiv);
    }

    appendMessage(msg, currentUserId) {
        if (document.getElementById(`msg-${msg.id}`)) return;

        const div = document.createElement('div');
        const isMe = msg.sender_id === currentUserId;
        const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        div.className = `flex w-full ${isMe ? 'justify-end' : 'justify-start'} animate-slide-in`;
        div.id = `msg-${msg.id}`;

        const bubbleClass = isMe ? 'msg-sent' : 'msg-received';
        const metaColor = isMe ? 'text-white/70' : 'text-gray-400';

        div.innerHTML = `
            <div class="msg-bubble ${bubbleClass}">
                <div class="break-words">${this._escapeHtml(msg.content)}</div>
                <div class="text-[9px] ${metaColor} mt-1.5 flex items-center justify-end gap-1 font-medium uppercase tracking-tighter">
                    ${time} ${isMe ? this._getStatusIcon(msg.is_read) : ''}
                </div>
            </div>
        `;
        this.elements.messagesArea.appendChild(div);
    }

    _getStatusIcon(isRead) {
        return isRead
            ? '<svg class="w-3 h-3 text-blue-300" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/></svg>'
            : '<svg class="w-3 h-3 opacity-50" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/></svg>';
    }

    updateMessageStatus(msg) {
        const msgEl = document.getElementById(`msg-${msg.id}`);
        if (msgEl) {
            const meta = msgEl.querySelector('.msg-bubble > div:last-child');
            if (meta) {
                const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                meta.innerHTML = `${time} ${this._getStatusIcon(msg.is_read)}`;
            }
        }
    }

    updateStatus(isOnline, isTyping) {
        if (isTyping) {
            this.elements.chatHeaderStatus.innerHTML = `<span class="text-primary-500 font-bold animate-pulse">typing...</span>`;
        } else if (isOnline) {
            this.elements.chatHeaderStatus.innerHTML = `<span class="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span>Online`;
        } else {
            this.elements.chatHeaderStatus.innerHTML = `<span class="w-2 h-2 rounded-full bg-gray-400"></span>Offline`;
        }
    }

    scrollToBottom() {
        this.elements.messagesArea.scrollTop = this.elements.messagesArea.scrollHeight;
    }

    _escapeHtml(text) {
        if (!text) return text;
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Global helper for mobile
window.showSidebarMobile = () => {
    document.getElementById('chatSidebar').classList.remove('hidden');
    document.getElementById('chatMain').classList.add('hidden');
};
