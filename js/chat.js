
// Main Chat Entry Point
const ui = new UIManager();
let chatManager = null;
let currentUser = null;

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
    console.log("Chat Initializing...");

    // Auth Check
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
        return;
    }
    currentUser = session.user;

    // Init Manager
    chatManager = new ChatManager(supabase, currentUser);

    // Setup Callbacks
    chatManager.setCallbacks({
        onMessageReceived: (msg) => {
            if (msg.conversation_id === chatManager.currentConversationId) {
                ui.appendMessage(msg, currentUser.id);
                ui.scrollToBottom();
                if (msg.sender_id !== currentUser.id) {
                    chatManager.markAsRead(msg.conversation_id);
                }
            }
            loadAndRenderConversations();
        },
        onStatusUpdated: (msg) => {
            ui.updateMessageStatus(msg);
        },
        onPresenceSync: (state) => {
            if (!chatManager.currentConversationId || !ui.activeOtherUserId) return;
            const activeUserId = ui.activeOtherUserId;
            let isOnline = false;
            let isTyping = false;

            Object.keys(state).forEach(key => {
                const presences = state[key];
                if (presences && presences.length > 0 && key === activeUserId) {
                    isOnline = true;
                    const p = presences[0];
                    if (p.typing && p.conversation_id === chatManager.currentConversationId) {
                        isTyping = true;
                    }
                }
            });
            ui.updateStatus(isOnline, isTyping);
        }
    });

    // Initial Load
    await loadAndRenderConversations();

    // Auto-open if query param exists
    const urlParams = new URLSearchParams(window.location.search);
    const openConvId = urlParams.get('conversation_id');
    if (openConvId) {
        const convs = await chatManager.loadConversations();
        const target = convs.find(c => c.id === openConvId);
        if (target) handleConversationSelect(target);
    }

    setupInputListeners();
    setupGlobalFunctions();
});

async function loadAndRenderConversations() {
    ui.toggleLoading(true);
    const conversations = await chatManager.loadConversations();
    ui.renderConversations(conversations, handleConversationSelect);
}

async function handleConversationSelect(conv) {
    ui.openChatView(conv);
    const messages = await chatManager.loadMessages(conv.id);
    ui.renderMessages(messages, currentUser.id);
    chatManager.markAsRead(conv.id);
    chatManager.setupRealtime();
    chatManager.setupPresence(currentUser.id);
}

function setupInputListeners() {
    const { messageInput, sendBtn } = ui.elements;
    let typingTimeout;

    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    messageInput.addEventListener('input', () => {
        if (!chatManager.currentConversationId) return;
        clearTimeout(typingTimeout);
        chatManager.sendTyping(true, chatManager.currentConversationId);
        typingTimeout = setTimeout(() => {
            chatManager.sendTyping(false, chatManager.currentConversationId);
        }, 2000);

        messageInput.style.height = 'auto';
        messageInput.style.height = Math.min(messageInput.scrollHeight, 128) + 'px';
    });

    sendBtn.addEventListener('click', () => sendMessage());

    // Emoji Picker
    const emojiBtn = document.getElementById('emojiBtn');
    const emojiPickerContainer = document.getElementById('emojiPickerContainer');
    const emojiPicker = document.querySelector('emoji-picker');

    if (emojiBtn && emojiPickerContainer) {
        emojiBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            emojiPickerContainer.classList.toggle('hidden');
        });
        document.addEventListener('click', (e) => {
            if (!emojiPickerContainer.contains(e.target) && !emojiBtn.contains(e.target)) {
                emojiPickerContainer.classList.add('hidden');
            }
        });
        if (emojiPicker) {
            emojiPicker.addEventListener('emoji-click', (e) => {
                messageInput.value += e.detail.unicode;
                messageInput.focus();
            });
        }
    }

    // File Attachment
    const attachmentBtn = document.getElementById('attachmentBtn');
    const fileInput = document.getElementById('fileInput');

    if (attachmentBtn && fileInput) {
        attachmentBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file || !file.type.startsWith('image/')) return;

            try {
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
                const filePath = `chat-attachments/${fileName}`;

                const { error } = await supabase.storage.from('chat-attachments').upload(filePath, file);
                if (error) throw error;

                const { data: { publicUrl } } = supabase.storage.from('chat-attachments').getPublicUrl(filePath);
                await chatManager.sendMessage(publicUrl, chatManager.currentConversationId, 'image');
                fileInput.value = '';
            } catch (err) {
                console.error('Upload failed:', err);
                alert('Failed to upload image.');
            }
        });
    }
}

async function sendMessage(contentOverride = null, conversationIdOverride = null, type = 'text') {
    const input = ui.elements.messageInput;
    const content = contentOverride || input.value.trim();
    const conversationId = conversationIdOverride || chatManager.currentConversationId;

    if (!content || !conversationId) return;

    if (!contentOverride) {
        input.value = '';
        input.style.height = 'auto';
    }

    try {
        const sentMsg = await chatManager.sendMessage(content, conversationId, type);
        if (sentMsg) {
            ui.appendMessage(sentMsg, currentUser.id);
            ui.scrollToBottom();
        }
    } catch (err) {
        console.error("Error sending message:", err);
    }
}

function setupGlobalFunctions() {
    window.openNewChatModal = () => {
        document.getElementById('newChatModal').classList.remove('hidden');
        document.getElementById('userSearchInput').focus();
    };

    window.closeNewChatModal = () => {
        document.getElementById('newChatModal').classList.add('hidden');
    };

    let searchTimeout;
    window.debounceSearchUsers = (query) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => searchUsers(query), 300);
    };

    window.startChatWithBusiness = async (business) => {
        console.log("startChatWithBusiness called for:", business);
        if (!currentUser) {
            console.error("No current user found");
            alert("Please log in again.");
            return;
        }
        if (business.owner_id === currentUser.id) {
            alert("You cannot chat with yourself");
            return;
        }

        try {
            // Check if conversation exists (fetch all for this business and filter in JS for reliability)
            const { data: existingConvs, error: fetchError } = await supabase
                .from('conversations')
                .select('id, participant1_id, participant2_id')
                .eq('business_id', business.id);

            if (fetchError) {
                console.error("Error fetching conversations:", fetchError);
                throw fetchError;
            }

            const targetConv = existingConvs?.find(c =>
                (c.participant1_id === currentUser.id && c.participant2_id === business.owner_id) ||
                (c.participant1_id === business.owner_id && c.participant2_id === currentUser.id)
            );

            let targetId;
            if (targetConv) {
                console.log("Found existing conversation:", targetConv.id);
                targetId = targetConv.id;
            } else {
                console.log("Creating new conversation...");
                const { data: newConv, error } = await supabase.from('conversations').insert({
                    participant1_id: currentUser.id,
                    participant2_id: business.owner_id,
                    business_id: business.id
                }).select().single();

                if (error) {
                    console.error("Error creating conversation:", error);
                    throw error;
                }
                targetId = newConv.id;
                console.log("New conversation created:", targetId);
            }

            window.closeNewChatModal();
            await loadAndRenderConversations();

            // Find and select
            const convs = await chatManager.loadConversations();
            const t = convs.find(c => c.id === targetId);
            if (t) {
                console.log("Selecting conversation:", t.id);
                handleConversationSelect(t);
            } else {
                console.error("Could not find the conversation in the list after loading");
            }
        } catch (err) {
            console.error("Failed to start chat:", err);
            alert("Failed to start chat: " + (err.message || "Unknown error"));
        }
    };

    initPeerJS();
}

async function searchUsers(query) {
    const resultsDiv = document.getElementById('userSearchResults');
    if (!query) {
        resultsDiv.innerHTML = '<div class="text-center text-gray-500 py-4">Type to search...</div>';
        return;
    }

    const { data: businesses, error } = await supabase
        .from('businesses')
        .select(`id, name, owner_id`)
        .ilike('name', `%${query}%`)
        .limit(10);

    if (error || !businesses.length) {
        resultsDiv.innerHTML = '<div class="text-center text-gray-500 py-4">No businesses found</div>';
        return;
    }

    resultsDiv.innerHTML = '';
    businesses.forEach(biz => {
        const div = document.createElement('div');
        div.className = 'p-4 hover:bg-primary-500/5 dark:hover:bg-white/5 cursor-pointer border-b border-white/5 flex items-center justify-between transition-all rounded-xl';
        div.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-primary-500/10 text-primary-600 flex items-center justify-center font-bold">${biz.name[0].toUpperCase()}</div>
                <span class="font-bold text-gray-800 dark:text-gray-200">${biz.name}</span>
            </div>
            <button class="chat-action-btn px-4 py-1.5 text-xs font-bold bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/20">Chat</button>
        `;

        const btn = div.querySelector('.chat-action-btn');
        btn.onclick = (e) => {
            e.stopPropagation();
            window.startChatWithBusiness(biz);
        };

        // Also allow clicking the whole row
        div.onclick = () => window.startChatWithBusiness(biz);

        resultsDiv.appendChild(div);
    });
}

// PeerJS & Calls
let peer = null;
let currentCall = null;
let localStream = null;

function initPeerJS() {
    if (!currentUser) return;
    peer = new Peer(currentUser.id, { debug: 1 });
    peer.on('call', handleIncomingCall);
    peer.on('error', err => console.error('PeerJS:', err));
}

function handleIncomingCall(call) {
    if (!confirm(`Incoming call... Answer?`)) return;
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
        setupVideoUI(stream);
        call.answer(stream);
        setupCallEvents(call);
    });
}

window.startCall = (type) => {
    if (!chatManager.currentConversationId || !ui.activeOtherUserId) {
        alert("Please select a conversation first.");
        return;
    }

    navigator.mediaDevices.getUserMedia({ video: type === 'video', audio: true }).then(stream => {
        setupVideoUI(stream);
        const call = peer.call(ui.activeOtherUserId, stream);
        if (call) setupCallEvents(call);
    }).catch(e => {
        alert("Could not access camera/mic: " + e.message);
    });
};

function setupVideoUI(stream) {
    document.getElementById('callModal').classList.remove('hidden');
    document.getElementById('localVideo').srcObject = stream;
    localStream = stream;
}

function setupCallEvents(call) {
    currentCall = call;
    call.on('stream', remoteStream => {
        document.getElementById('remoteVideo').srcObject = remoteStream;
        document.getElementById('callStatusText').textContent = "Connected";
    });
    call.on('close', endCall);
    call.on('error', endCall);
}

window.endCall = () => {
    if (currentCall) currentCall.close();
    if (localStream) localStream.getTracks().forEach(t => t.stop());
    document.getElementById('callModal').classList.add('hidden');
    currentCall = null;
};

window.toggleMute = () => {
    if (localStream) localStream.getAudioTracks().forEach(t => t.enabled = !t.enabled);
};

window.toggleVideo = () => {
    if (localStream) localStream.getVideoTracks().forEach(t => t.enabled = !t.enabled);
};
