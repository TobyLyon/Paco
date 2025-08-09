/**
 * 💬 Enhanced Global Chat System for PacoRocko
 * 
 * Features:
 * - Persistent chat messages via Supabase
 * - Real-time message updates
 * - Rate limiting and spam protection
 * - Twitter authentication integration
 * - Message moderation capabilities
 */

class EnhancedGlobalChat {
    constructor() {
        this.messagesContainer = null;
        this.chatInput = null;
        this.sendButton = null;
        this.twitterSignInButton = null;
        this.authStatusContainer = null;
        this.maxMessages = 50; // Keep last 50 messages visible
        this.userName = null;
        this.userAvatar = null;
        this.isAuthenticated = false;
        
        // Twitter authentication
        this.twitterAuth = null;
        this.currentUser = null;
        
        // Database integration
        this.supabase = null;
        this.messageSubscription = null;
        this.isLoadingMessages = false;
        
        // Rate limiting
        this.lastMessageTime = 0;
        this.messageQueue = [];
        this.rateLimitDelay = 2000; // 2 seconds between messages
        this.isRateLimited = false;
        
        // UI state
        this.messages = [];
        
        this.init();
    }
    
    /**
     * 🚀 Initialize the enhanced chat system
     */
    async init() {
        console.log('💬 Initializing enhanced global chat with database...');
        
        // Get DOM elements
        this.messagesContainer = document.getElementById('chatMessages');
        this.chatInput = document.getElementById('chatInput');
        this.sendButton = document.getElementById('chatSendBtn');
        this.twitterSignInButton = document.getElementById('twitterSignInBtn');
        
        if (!this.messagesContainer || !this.chatInput || !this.sendButton) {
            console.error('❌ Chat DOM elements not found');
            return;
        }
        
        console.log('✅ Chat DOM elements found');
        
        // Initialize database connection
        await this.initDatabase();
        
        // Initialize Twitter authentication
        this.initTwitterAuth();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Load recent messages from database
        await this.loadRecentMessages();
        
        // Setup real-time message subscription
        this.setupMessageSubscription();
        
        // Update UI based on auth state
        this.updateAuthUI();
        
        console.log('💬 Enhanced global chat initialized successfully');
    }
    
    /**
     * 🗄️ Initialize Supabase database connection
     */
    async initDatabase() {
        try {
            // Try to use existing supabase client from main site
            if (window.supabaseClient) {
                this.supabase = window.supabaseClient;
                console.log('✅ Using existing Supabase client');
                return;
            }
            
            // Check if Supabase is available globally
            if (typeof supabase !== 'undefined') {
                // Use environment variables or fallback to known values
                const supabaseUrl = 'https://tbowrsbjoijdtpdgnoio.supabase.co';
                const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRib3dyc2Jqb2lqZHRwZGdub2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NTM5NDQsImV4cCI6MjA2OTQyOTk0NH0.-A1uzl0uuzS5ZyHhRAffLEPo10PH1K7dwNPHNW5r1FQ';
                
                this.supabase = supabase.createClient(supabaseUrl, supabaseKey);
                console.log('✅ Created new Supabase client for chat');
                return;
            }
            
            console.warn('⚠️ Supabase not available - chat will work in memory only');
        } catch (error) {
            console.error('❌ Failed to initialize Supabase:', error);
        }
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
            console.warn('⚠️ TwitterAuthChat not available');
        }
    }
    
    /**
     * 📥 Load recent messages from database
     */
    async loadRecentMessages() {
        if (!this.supabase || this.isLoadingMessages) return;
        
        try {
            this.isLoadingMessages = true;
            console.log('📥 Loading recent chat messages...');
            
            const { data, error } = await this.supabase.rpc('get_recent_chat_messages', {
                limit_count: this.maxMessages
            });
            
            if (error) {
                console.error('❌ Failed to load messages:', error);
                this.showFallbackWelcomeMessage();
                return;
            }
            
            // Clear existing messages
            this.clearMessages();
            
            if (data && data.length > 0) {
                // Add messages in chronological order (reverse since we got them newest first)
                const messages = data.reverse();
                messages.forEach(msg => {
                    this.addMessageToUI({
                        content: msg.content,
                        type: msg.message_type,
                        author: msg.username,
                        displayName: msg.display_name,
                        avatar: msg.avatar_url,
                        verified: msg.verified,
                        timestamp: new Date(msg.created_at)
                    });
                });
                
                console.log(`✅ Loaded ${messages.length} recent messages`);
            } else {
                this.showFallbackWelcomeMessage();
            }
            
        } catch (error) {
            console.error('❌ Error loading messages:', error);
            this.showFallbackWelcomeMessage();
        } finally {
            this.isLoadingMessages = false;
        }
    }
    
    /**
     * 🔄 Setup real-time message subscription
     */
    setupMessageSubscription() {
        if (!this.supabase) return;
        
        try {
            this.messageSubscription = this.supabase
                .channel('chat_messages')
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'chat_messages'
                }, (payload) => {
                    console.log('📨 New message received:', payload);
                    this.handleRealtimeMessage(payload.new);
                })
                .subscribe();
                
            console.log('🔄 Real-time message subscription active');
        } catch (error) {
            console.error('❌ Failed to setup message subscription:', error);
        }
    }
    
    /**
     * 📨 Handle real-time message from database
     */
    async handleRealtimeMessage(messageData) {
        try {
            // Get user details for the message
            const { data: userData, error } = await this.supabase
                .from('chat_users')
                .select('username, display_name, avatar_url, verified')
                .eq('id', messageData.user_id)
                .single();
                
            if (error || !userData) {
                console.error('❌ Failed to get user data for message:', error);
                return;
            }
            
            // Don't show our own messages twice
            if (this.currentUser && userData.username === this.currentUser.username) {
                return;
            }
            
            // Add message to UI
            this.addMessageToUI({
                content: messageData.content,
                type: messageData.message_type,
                author: userData.username,
                displayName: userData.display_name,
                avatar: userData.avatar_url,
                verified: userData.verified,
                timestamp: new Date(messageData.created_at)
            });
            
        } catch (error) {
            console.error('❌ Error handling real-time message:', error);
        }
    }
    
    /**
     * 🎯 Setup event listeners
     */
    setupEventListeners() {
        // Send button click
        this.sendButton.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleSendMessage();
        });
        
        // Enter key in input
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSendMessage();
            }
        });
        
        // Twitter sign-in button
        if (this.twitterSignInButton) {
            this.twitterSignInButton.addEventListener('click', () => {
                this.initiateTwitterAuth();
            });
        }
        
        // Input validation
        this.chatInput.addEventListener('input', (e) => {
            this.validateInput();
        });
    }
    
    /**
     * 📤 Handle sending a message
     */
    async handleSendMessage() {
        if (!this.isAuthenticated) {
            this.showNotification('Please sign in with Twitter to chat', 'warning');
            return;
        }
        
        const content = this.chatInput.value.trim();
        if (!content) return;
        
        // Check rate limiting
        if (this.isRateLimited) {
            this.showNotification('Please wait before sending another message', 'warning');
            return;
        }
        
        try {
            // Disable input temporarily
            this.chatInput.disabled = true;
            this.sendButton.disabled = true;
            
            if (this.supabase && this.currentUser) {
                // Save to database
                const { data, error } = await this.supabase.rpc('add_chat_message', {
                    twitter_id_param: this.currentUser.id,
                    content_param: content
                });
                
                if (error) {
                    throw new Error(error.message);
                }
                
                // Add message to UI immediately for better UX
                this.addMessageToUI({
                    content: content,
                    type: 'user',
                    author: this.currentUser.username,
                    displayName: this.currentUser.name,
                    avatar: this.currentUser.profileImage,
                    verified: this.currentUser.verified,
                    timestamp: new Date()
                });
                
                console.log('✅ Message sent successfully');
            } else {
                // Fallback: Add to UI only (memory-only mode)
                this.addMessageToUI({
                    content: content,
                    type: 'user',
                    author: this.currentUser?.username || 'Anonymous',
                    displayName: this.currentUser?.name || 'Anonymous User',
                    avatar: this.currentUser?.profileImage,
                    verified: this.currentUser?.verified || false,
                    timestamp: new Date()
                });
            }
            
            // Clear input
            this.chatInput.value = '';
            
            // Apply rate limiting
            this.applyRateLimit();
            
        } catch (error) {
            console.error('❌ Failed to send message:', error);
            this.showNotification(`Failed to send message: ${error.message}`, 'error');
        } finally {
            // Re-enable input
            this.chatInput.disabled = false;
            this.sendButton.disabled = false;
            this.chatInput.focus();
        }
    }
    
    /**
     * ⏱️ Apply rate limiting
     */
    applyRateLimit() {
        this.isRateLimited = true;
        this.lastMessageTime = Date.now();
        
        setTimeout(() => {
            this.isRateLimited = false;
        }, this.rateLimitDelay);
    }
    
    /**
     * ➕ Add message to UI
     */
    addMessageToUI(messageData) {
        // Hide empty state when first message is added
        const emptyState = document.getElementById('chatEmptyState');
        if (emptyState) {
            emptyState.style.display = 'none';
        }
        
        const messageElement = document.createElement('div');
        messageElement.className = `chat-message ${messageData.type}`;
        
        let content = '';
        
        if (messageData.type === 'system') {
            content = `<span class="message-text">${this.escapeHtml(messageData.content)}</span>`;
        } else {
            content = `
                <div class="message-header">
                    ${messageData.avatar ? `<img src="${messageData.avatar}" alt="${messageData.displayName}" class="message-avatar">` : ''}
                    <span class="message-author${messageData.verified ? ' verified' : ''}">${this.escapeHtml(messageData.displayName || messageData.author)}</span>
                    <span class="message-time">${this.formatTime(messageData.timestamp)}</span>
                </div>
                <span class="message-text">${this.escapeHtml(messageData.content)}</span>
            `;
        }
        
        messageElement.innerHTML = content;
        
        // Add to messages array
        this.messages.push({ element: messageElement, data: messageData });
        
        // Add to DOM
        this.messagesContainer.appendChild(messageElement);
        
        // Limit messages in memory and DOM
        if (this.messages.length > this.maxMessages) {
            const oldMessage = this.messages.shift();
            if (oldMessage.element.parentNode) {
                oldMessage.element.remove();
            }
        }
        
        // Auto-scroll to bottom
        this.scrollToBottom();
    }
    
    /**
     * 🔄 Update authentication UI
     */
    updateAuthUI() {
        const twitterSignInBtn = document.getElementById('twitterSignInBtn');
        const chatUserInfo = document.getElementById('chatUserInfo');
        const userAvatar = document.getElementById('userAvatar');
        const userName = document.getElementById('userName');
        
        if (this.isAuthenticated && this.currentUser) {
            // Hide sign-in button, show user info
            if (twitterSignInBtn) twitterSignInBtn.style.display = 'none';
            if (chatUserInfo) chatUserInfo.style.display = 'flex';
            
            // Update user info
            if (userAvatar && this.currentUser.profileImage) {
                userAvatar.src = this.currentUser.profileImage;
                userAvatar.style.display = 'block';
            }
            if (userName) {
                userName.textContent = `@${this.currentUser.username}`;
                if (this.currentUser.verified) {
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
     * 🐦 Initiate Twitter authentication
     */
    async initiateTwitterAuth() {
        if (!this.twitterAuth) {
            console.error('❌ Twitter auth not available');
            return;
        }
        
        try {
            console.log('🐦 Starting Twitter authentication...');
            await this.twitterAuth.initiateAuth();
        } catch (error) {
            console.error('❌ Twitter auth failed:', error);
            this.showNotification('Twitter authentication failed', 'error');
        }
    }
    
    /**
     * ✅ Handle successful authentication
     */
    async handleAuthSuccess(user) {
        console.log('✅ Twitter auth successful:', user);
        
        this.currentUser = user;
        this.isAuthenticated = true;
        this.userName = user.username;
        this.userAvatar = user.profileImage;
        
        // Create or update user in database
        if (this.supabase) {
            try {
                await this.supabase.rpc('upsert_chat_user', {
                    twitter_id_param: user.id,
                    username_param: user.username,
                    display_name_param: user.name,
                    avatar_url_param: user.profileImage,
                    verified_param: user.verified || false
                });
                
                console.log('✅ User profile updated in database');
            } catch (error) {
                console.error('❌ Failed to update user profile:', error);
            }
        }
        
        this.updateAuthUI();
        this.showNotification(`Welcome, @${user.username}!`, 'success');
    }
    
    /**
     * 🧹 Clear all messages
     */
    clearMessages() {
        this.messages = [];
        if (this.messagesContainer) {
            this.messagesContainer.innerHTML = '';
        }
    }
    
    /**
     * 📜 Scroll to bottom of messages
     */
    scrollToBottom() {
        if (this.messagesContainer) {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        }
    }
    
    /**
     * 🛡️ Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * 🕒 Format timestamp
     */
    formatTime(timestamp) {
        if (!timestamp) return '';
        const now = new Date();
        const time = new Date(timestamp);
        const diff = now - time;
        
        if (diff < 60000) return 'now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
        return time.toLocaleDateString();
    }
    
    /**
     * 📢 Show notification
     */
    showNotification(message, type = 'info') {
        console.log(`${type.toUpperCase()}: ${message}`);
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `chat-notification ${type}`;
        notification.textContent = message;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
    
    /**
     * 💭 Show fallback welcome message
     */
    showFallbackWelcomeMessage() {
        // Only show if no messages loaded
        if (this.messages.length === 0) {
            this.addMessageToUI({
                content: '🎰 Welcome to PacoRocko! Sign in with Twitter to join the conversation.',
                type: 'system',
                timestamp: new Date()
            });
        }
    }
    
    /**
     * ✅ Validate input
     */
    validateInput() {
        const content = this.chatInput.value.trim();
        const isValid = content.length > 0 && content.length <= 500;
        
        this.sendButton.disabled = !isValid || !this.isAuthenticated || this.isRateLimited;
    }
    
    /**
     * 🗑️ Cleanup on destroy
     */
    destroy() {
        if (this.messageSubscription) {
            this.messageSubscription.unsubscribe();
        }
    }
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.globalChat === 'undefined') {
        window.globalChat = new EnhancedGlobalChat();
    }
});
