// ===== PACO ROCKO CRASH CASINO - TWITTER AUTHENTICATION FOR CHAT =====

/**
 * Twitter OAuth Integration for Chat
 * Handles Twitter authentication for chat access
 * Uses Twitter API v2 with OAuth 1.0a for web applications
 */

class TwitterAuthChat {
    constructor() {
        this.isAuthenticated = false;
        this.user = null;
        this.token = null;
        this.authWindow = null;
        
        // Twitter API configuration - Get client ID from build-time configuration
        this.config = {
            clientId: window.TWITTER_CLIENT_ID || this.getClientIdFromMeta(), // Get from build configuration
            redirectUri: this.getRedirectUri(),
            scopes: ['tweet.read', 'users.read', 'offline.access'], // Removed tweet.write for chat
            authUrl: 'https://twitter.com/i/oauth2/authorize'
        };
        
        // Load saved authentication state
        this.loadAuthState();
        
        // Check for mobile auth callback data
        this.checkMobileAuthCallback();
        
        console.log('🐦 Twitter chat auth module initialized');
        console.log('🔗 Redirect URI:', this.config.redirectUri);
        console.log('🆔 Client ID:', this.config.clientId ? 'SET' : 'NOT SET');
    }

    // Get client ID from meta tag (set during build)
    getClientIdFromMeta() {
        const metaTag = document.querySelector('meta[name="twitter-client-id"]');
        const clientId = metaTag ? metaTag.getAttribute('content') : null;
        
        // Debugging: Log what we found
        console.log('🔍 Twitter Client ID from meta tag:', clientId);
        
        // If still a placeholder, return fallback
        if (clientId === '__TWITTER_CLIENT_ID__' || !clientId) {
            console.warn('⚠️  Twitter Client ID placeholder not replaced!');
            console.warn('⚠️  Make sure to run: npm run build');
            console.warn('⚠️  And create .env file with TWITTER_CLIENT_ID');
            
            // Use your existing client ID as fallback (this was already in your env-template)
            // NOTE: Client IDs are public information, not secrets
            const fallbackClientId = 'N3BYdkxPZFJIS1lmSzkyRUJkcUM6MTpjaQ';
            console.log('🔄 Using fallback client ID (public info, not secret)');
            return fallbackClientId;
        }
        
        console.log('✅ Client ID successfully loaded from meta tag');
        return clientId;
    }

    // Get appropriate redirect URI based on environment
    getRedirectUri() {
        const hostname = window.location.hostname;
        const port = window.location.port;
        
        // Check if we're running on localhost
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            const localPort = port || '3000'; // Default to 3000 if no port specified
            return `http://localhost:${localPort}/auth/callback`;
        }
        
        // Production environment
        return 'https://pacothechicken.xyz/auth/callback';
    }

    // Check if user is authenticated
    get authenticated() {
        return this.isAuthenticated && this.user && this.token;
    }

    // Get current user info
    get currentUser() {
        return this.user;
    }

    // Initialize OAuth flow
    async initiateAuth() {
        try {
            console.log('🐦 Starting Twitter OAuth flow for chat...');
            
            // Generate PKCE challenge for security
            const codeVerifier = this.generateCodeVerifier();
            const codeChallenge = await this.generateCodeChallenge(codeVerifier);
            
            // Store code verifier for later use
            localStorage.setItem('twitter_chat_code_verifier', codeVerifier);
            
            // Build authorization URL
            const authParams = new URLSearchParams({
                response_type: 'code',
                client_id: this.config.clientId,
                redirect_uri: this.config.redirectUri,
                scope: this.config.scopes.join(' '),
                state: this.generateState(),
                code_challenge: codeChallenge,
                code_challenge_method: 'S256'
            });
            
            const authUrl = `${this.config.authUrl}?${authParams.toString()}`;
            
            console.log('🔗 Opening Twitter authorization window...');
            
            // Enhanced mobile detection
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            const isSmallScreen = window.innerWidth <= 768 || window.innerHeight <= 600;
            const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            const shouldUseMobileFlow = isMobile || isSmallScreen || isTouchDevice;
            
            if (shouldUseMobileFlow) {
                // Mobile: Force same window redirect
                console.log('📱 MOBILE: Using same-window redirect for chat auth');
                window.location.href = authUrl;
                return;
            }
            
            // Desktop: Use popup window for authentication
            const popupWidth = 500;
            const popupHeight = 600;
            const left = (window.screen.width / 2) - (popupWidth / 2);
            const top = (window.screen.height / 2) - (popupHeight / 2);
            
            const popup = window.open(
                authUrl,
                'twitterChatAuth',
                `width=${popupWidth},height=${popupHeight},left=${left},top=${top},scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no,status=no`
            );
            
            if (!popup) {
                throw new Error('Popup blocked! Please allow popups for this site and try again.');
            }
            
            this.authWindow = popup;
            
            // Listen for popup messages
            return new Promise((resolve, reject) => {
                let authCompleted = false;
                
                const messageHandler = (event) => {
                    if (!event.data || !event.data.type) return;
                    
                    console.log('📨 Chat auth message:', event.data, 'from:', event.origin);

                    if (event.data.type === 'TWITTER_AUTH_SUCCESS') {
                        console.log('✅ Chat auth success message received!');
                        authCompleted = true;
                        
                        clearInterval(checkClosed);
                        clearTimeout(authTimeout);
                        window.removeEventListener('message', messageHandler);

                        setTimeout(() => {
                            if (popup && !popup.closed) {
                                popup.close();
                            }
                        }, 200);

                        this.handleAuthSuccess(event.data.code, localStorage.getItem('twitter_chat_code_verifier'))
                            .then(resolve)
                            .catch(reject);

                    } else if (event.data.type === 'TWITTER_AUTH_ERROR') {
                        console.error('❌ Chat auth error:', event.data.error);
                        reject(new Error(event.data.error || 'Authentication failed'));
                        
                        clearInterval(checkClosed);
                        clearTimeout(authTimeout);
                        window.removeEventListener('message', messageHandler);
                    }
                };
                
                window.addEventListener('message', messageHandler);
                
                // Add timeout for the entire auth process
                const authTimeout = setTimeout(() => {
                    if (!authCompleted) {
                        console.warn('⏰ Chat auth timeout');
                        authCompleted = true;
                        clearInterval(checkClosed);
                        window.removeEventListener('message', messageHandler);
                        if (popup && !popup.closed) {
                            popup.close();
                        }
                        reject(new Error('Authentication timeout'));
                    }
                }, 30000);
                
                // Check if popup was closed manually
                const checkClosed = setInterval(() => {
                    if (popup.closed && !authCompleted) {
                        console.log('🚪 Chat auth popup closed');
                        clearInterval(checkClosed);
                        clearTimeout(authTimeout);
                        window.removeEventListener('message', messageHandler);
                        reject(new Error('Authentication cancelled'));
                    }
                }, 1000);
            });
            
        } catch (error) {
            console.error('Chat auth initiation failed:', error);
            throw error;
        }
    }

    // Handle successful authentication
    async handleAuthSuccess(authCode, codeVerifier) {
        try {
            console.log('🔄 Processing chat auth success...');
            
            // Exchange authorization code for access token
            const tokenResponse = await this.exchangeCodeForToken(authCode, codeVerifier);
            
            if (tokenResponse.access_token) {
                this.token = tokenResponse.access_token;
                
                // Get user information
                const userInfo = await this.fetchUserInfo(this.token);
                
                if (userInfo) {
                    this.user = {
                        id: userInfo.id,
                        username: userInfo.username,
                        name: userInfo.name,
                        profileImage: userInfo.profile_image_url,
                        verified: userInfo.verified || false
                    };
                    
                    this.isAuthenticated = true;
                    this.saveAuthState();
                    
                    console.log('✅ Twitter chat authentication successful');
                    
                    // Dispatch event for chat system
                    this.dispatchAuthEvent('success', this.user);
                    
                    return this.user;
                } else {
                    throw new Error('Failed to fetch user information');
                }
            } else {
                throw new Error('Failed to get access token');
            }
            
        } catch (error) {
            console.error('Chat auth handling failed:', error);
            throw error;
        }
    }

    // Exchange authorization code for access token
    async exchangeCodeForToken(code, codeVerifier) {
        try {
            const tokenParams = {
                grant_type: 'authorization_code',
                client_id: this.config.clientId,
                code: code,
                redirect_uri: this.config.redirectUri,
                code_verifier: codeVerifier
            };
            
            const response = await fetch('/api/twitter/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(tokenParams)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Token exchange failed: ${errorData.error || response.statusText}`);
            }
            
            return await response.json();
            
        } catch (error) {
            console.error('Token exchange error:', error);
            throw new Error(`Twitter authentication failed: ${error.message}`);
        }
    }

    // Fetch user information from Twitter API
    async fetchUserInfo(accessToken) {
        try {
            const response = await fetch('/api/twitter/user', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Failed to fetch user info: ${errorData.error || response.statusText}`);
            }
            
            const data = await response.json();
            return data.data;
            
        } catch (error) {
            console.error('User info fetch error:', error);
            throw new Error(`Failed to get Twitter user info: ${error.message}`);
        }
    }

    // Sign out user
    signOut() {
        this.isAuthenticated = false;
        this.user = null;
        this.token = null;
        
        // Clear stored authentication state
        localStorage.removeItem('twitter_chat_auth_state');
        localStorage.removeItem('twitter_chat_code_verifier');
        
        // Dispatch event for chat system
        this.dispatchAuthEvent('signout', null);
        
        console.log('👋 User signed out from chat');
    }

    // Save authentication state to localStorage
    saveAuthState() {
        if (this.isAuthenticated && this.user) {
            const authState = {
                user: this.user,
                token: this.token,
                timestamp: Date.now()
            };
            
            localStorage.setItem('twitter_chat_auth_state', JSON.stringify(authState));
        }
    }

    // Load authentication state from localStorage
    loadAuthState() {
        try {
            const stored = localStorage.getItem('twitter_chat_auth_state');
            if (stored) {
                const authState = JSON.parse(stored);
                
                // Check if token is not too old (24 hours)
                const maxAge = 24 * 60 * 60 * 1000;
                if (Date.now() - authState.timestamp < maxAge) {
                    this.user = authState.user;
                    this.token = authState.token;
                    this.isAuthenticated = true;
                    
                    console.log('✅ Restored Twitter chat authentication state');
                } else {
                    localStorage.removeItem('twitter_chat_auth_state');
                    console.log('⏰ Twitter chat token expired, cleared');
                }
            }
        } catch (error) {
            console.error('Failed to load chat auth state:', error);
            localStorage.removeItem('twitter_chat_auth_state');
        }
    }
    
    // Check for mobile auth callback data
    checkMobileAuthCallback() {
        const authCode = localStorage.getItem('twitter_chat_auth_code');
        const authTimestamp = localStorage.getItem('twitter_chat_auth_timestamp');
        
        if (authCode && authTimestamp) {
            const timestamp = parseInt(authTimestamp);
            const now = Date.now();
            
            if (now - timestamp < 5 * 60 * 1000) {
                console.log('📱 MOBILE: Found chat auth callback data, processing...');
                
                localStorage.removeItem('twitter_chat_auth_code');
                localStorage.removeItem('twitter_chat_auth_timestamp');
                
                this.handleAuthCallback(authCode);
            } else {
                console.log('📱 MOBILE: Chat auth data expired, cleaning up...');
                localStorage.removeItem('twitter_chat_auth_code');
                localStorage.removeItem('twitter_chat_auth_timestamp');
            }
        }
    }
    
    // Handle auth callback data (mobile flow)
    async handleAuthCallback(authCode) {
        try {
            console.log('📱 MOBILE: Processing stored chat auth callback data...');
            
            const codeVerifier = localStorage.getItem('twitter_chat_code_verifier');
            
            if (!codeVerifier) {
                throw new Error('Code verifier not found - authentication expired');
            }
            
            const user = await this.handleAuthSuccess(authCode, codeVerifier);
            
            console.log('✅ MOBILE: Chat authentication completed successfully!', user);
            
            this.dispatchAuthEvent('success', user);
            
            return user;
            
        } catch (error) {
            console.error('❌ MOBILE: Chat auth callback handling failed:', error);
            localStorage.removeItem('twitter_chat_code_verifier');
            this.dispatchAuthEvent('error', error);
            throw error;
        }
    }
    
    // Dispatch authentication events for chat integration
    dispatchAuthEvent(type, data) {
        try {
            const event = new CustomEvent('twitterChatAuthStateChange', {
                detail: { type, data, authenticated: this.authenticated }
            });
            window.dispatchEvent(event);
            console.log(`🔔 Dispatched chat auth event: ${type}`);
        } catch (error) {
            console.warn('Failed to dispatch chat auth event:', error);
        }
    }

    // Generate PKCE code verifier
    generateCodeVerifier() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return btoa(String.fromCharCode.apply(null, array))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }

    // Generate PKCE code challenge
    async generateCodeChallenge(verifier) {
        const encoder = new TextEncoder();
        const data = encoder.encode(verifier);
        const digest = await crypto.subtle.digest('SHA-256', data);
        return btoa(String.fromCharCode.apply(null, new Uint8Array(digest)))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }

    // Generate random state parameter
    generateState() {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        return btoa(String.fromCharCode.apply(null, array))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }
}

// Export for global use
window.TwitterAuthChat = TwitterAuthChat;

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TwitterAuthChat;
}

console.log('🔐 Twitter chat authentication loaded');
