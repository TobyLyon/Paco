/**
 * 💬 Global Chat System for PacoRocko
 * 
 * Handles real-time chat messaging for the crash casino page
 * Features: Persistent messages, rate limiting, real-time updates
 */

class GlobalChat {
    constructor() {
        this.messagesContainer = null;
        this.chatInput = null;
        this.sendButton = null;
        this.twitterSignInButton = null;
        this.authStatusContainer = null;
        this.maxMessages = 50; // Keep last 50 messages
        this.userName = null;
        this.userAvatar = null;
        this.isAuthenticated = false;
        
        // Twitter authentication
        this.twitterAuth = null;
        
        // Database integration
        this.supabase = null;
        this.messageSubscription = null;
        this.isLoadingMessages = false;
        
        // Rate limiting
        this.lastMessageTime = 0;
        this.messageQueue = [];
        this.rateLimitDelay = 2000; // 2 seconds between messages
        
        this.init();
    }
    
    /**
     * 🚀 Initialize the chat system with Twitter auth
     */
    init() {
        console.log('💬 Initializing global chat with Twitter auth...');
        
        // Get DOM elements
        this.messagesContainer = document.getElementById('chatMessages');
        this.chatInput = document.getElementById('chatInput');
        this.sendButton = document.getElementById('chatSendBtn');
        
        if (!this.messagesContainer || !this.chatInput || !this.sendButton) {
            console.error('❌ Chat elements not found');
            return;
        }
        
        // Initialize Twitter authentication
        this.initTwitterAuth();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Set up auth event listeners
        this.setupAuthEventListeners();
        
        // Initialize with clean chat (no demo messages)
        
        // Update UI based on auth state
        this.updateAuthUI();
        
        console.log('✅ Global chat with Twitter auth initialized');
    }
    
    /**
     * 🐦 Initialize Twitter authentication
     */
    initTwitterAuth() {
        if (typeof TwitterAuthChat !== 'undefined') {
            this.twitterAuth = new TwitterAuthChat();
            
            // Check if already authenticated
            if (this.twitterAuth.authenticated) {
                this.handleAuthSuccess(this.twitterAuth.currentUser);
            }
        } else {
            console.warn('⚠️ TwitterAuthChat not loaded, falling back to anonymous chat');
        }
    }
    
    /**
     * 🔔 Set up authentication event listeners
     */
    setupAuthEventListeners() {
        window.addEventListener('twitterChatAuthStateChange', (event) => {
            const { type, data } = event.detail;
            
            if (type === 'success') {
                this.handleAuthSuccess(data);
            } else if (type === 'signout') {
                this.handleSignOut();
            } else if (type === 'error') {
                this.handleAuthError(data);
            }
        });
    }
    
    /**
     * 🎲 Generate random username
     */
    generateUserName() {
        const adjectives = ['Paco', 'Chicken', 'Rocket', 'Golden', 'Crispy', 'Spicy', 'Lucky', 'Fast'];
        const nouns = ['Pilot', 'Chef', 'Master', 'Rider', 'Player', 'Fan', 'Legend', 'Pro'];
        const randomNum = Math.floor(Math.random() * 999) + 1;
        
        const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const noun = nouns[Math.floor(Math.random() * nouns.length)];
        
        return `${adj}${noun}${randomNum}`;
    }
    
    /**
     * 🎮 Set up event listeners
     */
    setupEventListeners() {
        // Send button click
        this.sendButton.addEventListener('click', () => {
            this.sendMessage();
        });
        
        // Enter key press
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
        
        // Focus management
        this.chatInput.addEventListener('focus', () => {
            if (!this.chatInput.disabled) {
                this.chatInput.style.borderColor = 'var(--restaurant-green)';
            }
        });
        
        this.chatInput.addEventListener('blur', () => {
            this.chatInput.style.borderColor = 'rgba(16, 185, 129, 0.3)';
        });
        
        // Twitter sign-in button
        const twitterSignInBtn = document.getElementById('twitterSignInBtn');
        if (twitterSignInBtn) {
            twitterSignInBtn.addEventListener('click', async () => {
                try {
                    twitterSignInBtn.textContent = '⏳ Connecting...';
                    twitterSignInBtn.disabled = true;
                    
                    if (this.twitterAuth) {
                        await this.twitterAuth.initiateAuth();
                    }
                } catch (error) {
                    console.error('Twitter sign-in error:', error);
                    twitterSignInBtn.textContent = '🐦 Sign in with Twitter to chat';
                    twitterSignInBtn.disabled = false;
                    
                    this.addMessage({
                        type: 'system',
                        text: `⚠️ Sign-in failed: ${error.message}`
                    });
                }
            });
        }
        
        // Sign out button
        const signOutBtn = document.getElementById('signOutBtn');
        if (signOutBtn) {
            signOutBtn.addEventListener('click', () => {
                if (this.twitterAuth) {
                    this.twitterAuth.signOut();
                }
            });
        }
    }
    
    /**
     * 📝 Send a chat message (Twitter authenticated users only)
     */
    sendMessage() {
        if (!this.isAuthenticated) {
            console.warn('⚠️ Cannot send message - user not authenticated');
            return;
        }
        
        const message = this.chatInput.value.trim();
        
        if (!message) return;
        
        // Clear input
        this.chatInput.value = '';
        
        // Add user message with Twitter info
        this.addMessage({
            type: 'twitter',
            author: this.userName,
            avatar: this.userAvatar,
            verified: this.twitterAuth?.currentUser?.verified || false,
            text: message,
            timestamp: new Date()
        });
        
        console.log(`💬 Twitter message sent: ${message}`);
        
        // TODO: Send to server via socket
        // this.socket.emit('chat_message', { 
        //     message, 
        //     author: this.userName, 
        //     twitterId: this.twitterAuth.currentUser.id,
        //     verified: this.twitterAuth.currentUser.verified
        // });
    }
    
    /**
     * ✅ Handle successful Twitter authentication
     */
    handleAuthSuccess(user) {
        console.log('✅ Chat auth success:', user);
        
        this.isAuthenticated = true;
        this.userName = user.username;
        this.userAvatar = user.profileImage;
        
        // Update UI
        this.updateAuthUI();
        
        // Add welcome message
        this.addMessage({
            type: 'system',
            text: `🎉 Welcome @${user.username}! You can now chat with other players.`
        });
    }
    
    /**
     * 🚪 Handle sign out
     */
    handleSignOut() {
        console.log('🚪 Chat user signed out');
        
        this.isAuthenticated = false;
        this.userName = null;
        this.userAvatar = null;
        
        // Update UI
        this.updateAuthUI();
        
        // Add system message
        this.addMessage({
            type: 'system',
            text: '👋 You have been signed out. Sign in again to continue chatting.'
        });
    }
    
    /**
     * ❌ Handle authentication error
     */
    handleAuthError(error) {
        console.error('❌ Chat auth error:', error);
        
        // Add error message
        this.addMessage({
            type: 'system',
            text: `⚠️ Authentication failed: ${error.message}. Please try again.`
        });
    }
    
    /**
     * 🔄 Update authentication UI
     */
    updateAuthUI() {
        const twitterSignInBtn = document.getElementById('twitterSignInBtn');
        const chatUserInfo = document.getElementById('chatUserInfo');
        const userAvatar = document.getElementById('userAvatar');
        const userName = document.getElementById('userName');
        const signOutBtn = document.getElementById('signOutBtn');
        
        if (this.isAuthenticated && this.userName) {
            // Hide sign-in button, show user info
            if (twitterSignInBtn) twitterSignInBtn.style.display = 'none';
            if (chatUserInfo) chatUserInfo.style.display = 'flex';
            
            // Update user info
            if (userAvatar && this.userAvatar) {
                userAvatar.src = this.userAvatar;
                userAvatar.style.display = 'block';
            }
            if (userName) {
                userName.textContent = `@${this.userName}`;
                if (this.twitterAuth?.currentUser?.verified) {
                    userName.classList.add('verified');
                }
            }
            
            // Enable chat input
            if (this.chatInput) {
                this.chatInput.disabled = false;
                this.chatInput.placeholder = 'Type your message...';
            }
            if (this.sendButton) {
                this.sendButton.disabled = false;
            }
            
        } else {
            // Show sign-in button, hide user info
            if (twitterSignInBtn) twitterSignInBtn.style.display = 'block';
            if (chatUserInfo) chatUserInfo.style.display = 'none';
            
            // Disable chat input
            if (this.chatInput) {
                this.chatInput.disabled = true;
                this.chatInput.placeholder = 'Connect Twitter to join the conversation...';
            }
            if (this.sendButton) {
                this.sendButton.disabled = true;
            }
        }
    }
    
    /**
     * ➕ Add a message to the chat
     */
    addMessage(messageData) {
        // Hide empty state when first message is added
        const emptyState = document.getElementById('chatEmptyState');
        if (emptyState) {
            emptyState.style.display = 'none';
        }
        
        const messageElement = document.createElement('div');
        messageElement.className = `chat-message ${messageData.type}`;
        
        let content = '';
        
        if (messageData.type === 'system') {
            content = `<span class="message-text">${messageData.text}</span>`;
        } else if (messageData.type === 'twitter') {
            // Twitter authenticated user message with avatar
            const verifiedBadge = messageData.verified ? ' ✓' : '';
            const avatarImg = messageData.avatar ? 
                `<img class="user-avatar" src="${messageData.avatar}" alt="@${messageData.author}">` : 
                '';
            
            content = `
                ${avatarImg}
                <span class="message-author${messageData.verified ? ' verified' : ''}">@${messageData.author}${verifiedBadge}:</span>
                <span class="message-text">${messageData.text}</span>
            `;
        } else {
            // Regular message (demo users)
            content = `
                <span class="message-author">${messageData.author}:</span>
                <span class="message-text">${messageData.text}</span>
            `;
        }
        
        messageElement.innerHTML = content;
        
        // Add to container
        this.messagesContainer.appendChild(messageElement);
        
        // Remove old messages if too many
        const messages = this.messagesContainer.children;
        if (messages.length > this.maxMessages) {
            this.messagesContainer.removeChild(messages[0]);
        }
        
        // Scroll to bottom
        this.scrollToBottom();
    }
    
    /**
     * ⬇️ Scroll chat to bottom
     */
    scrollToBottom() {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
    

    
    /**
     * 🔌 Connect to socket (for future real implementation)
     */
    connectSocket() {
        // TODO: Implement real socket connection
        // this.socket = io();
        // this.socket.on('chat_message', (data) => {
        //     this.addMessage({
        //         type: 'other',
        //         author: data.author,
        //         text: data.message,
        //         timestamp: new Date(data.timestamp)
        //     });
        // });
    }
    
    /**
     * 🗑️ Destroy chat system
     */
    destroy() {
        if (this.sendButton) {
            this.sendButton.removeEventListener('click', this.sendMessage);
        }
        if (this.chatInput) {
            this.chatInput.removeEventListener('keypress', this.sendMessage);
        }
    }
}

// Global instance
window.GlobalChat = GlobalChat;

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GlobalChat;
}
