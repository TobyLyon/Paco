// ===== PACO JUMP - TWITTER AUTHENTICATION MODULE =====

/**
 * Twitter OAuth Integration
 * Handles Twitter authentication for leaderboard access
 * Uses Twitter API v2 with OAuth 1.0a for web applications
 */

class TwitterAuth {
    constructor() {
        this.isAuthenticated = false;
        this.user = null;
        this.token = null;
        this.authWindow = null;
        
        // Twitter API configuration - Get client ID from build-time configuration
        this.config = {
            clientId: window.TWITTER_CLIENT_ID || this.getClientIdFromMeta(), // Get from build configuration
            redirectUri: this.getRedirectUri(),
            scopes: ['tweet.read', 'users.read', 'tweet.write', 'offline.access'],
            authUrl: 'https://twitter.com/i/oauth2/authorize'
        };
        
        // Load saved authentication state
        this.loadAuthState();
        
        console.log('🐦 Twitter auth module initialized');
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
            console.log('🐦 Starting Twitter OAuth flow...');
            
            // Generate PKCE challenge for security
            const codeVerifier = this.generateCodeVerifier();
            const codeChallenge = await this.generateCodeChallenge(codeVerifier);
            
            // Store code verifier for later use
            localStorage.setItem('twitter_code_verifier', codeVerifier);
            
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
            
            // Open popup window for authentication
            const popup = window.open(
                authUrl,
                'twitterAuth',
                'width=500,height=600,scrollbars=yes,resizable=yes'
            );
            
            this.authWindow = popup;
            
            // Listen for popup messages with enhanced error handling
            return new Promise((resolve, reject) => {
                let authCompleted = false;
                let messageReceived = false;
                
                const messageHandler = (event) => {
                    // Filter out browser extension messages (like MetaMask)
                    if (event.data && event.data.target && event.data.target.includes('metamask')) {
                        console.log('🦊 Ignoring MetaMask message');
                        return;
                    }
                    
                    // Filter out other browser extension messages
                    if (event.data && (
                        event.data.target || 
                        event.data.source === 'react-devtools' ||
                        event.data.type === 'webpackWarnings' ||
                        typeof event.data === 'string'
                    )) {
                        console.log('🔌 Ignoring browser extension message:', event.data);
                        return;
                    }
                    
                    console.log('📨 Received message:', event.data, 'from origin:', event.origin);
                    
                    if (event.data && event.data.type === 'TWITTER_AUTH_SUCCESS') {
                        console.log('✅ Received authentication success message!');
                        console.log('🔑 Auth code received:', event.data.code ? 'YES' : 'NO');
                        messageReceived = true;
                        authCompleted = true;
                        clearInterval(checkClosed);
                        clearTimeout(authTimeout);
                        window.removeEventListener('message', messageHandler);
                        
                        // Close popup after a delay to ensure message processing
                        setTimeout(() => {
                            if (popup && !popup.closed) {
                                popup.close();
                            }
                        }, 100);
                        
                        this.handleAuthSuccess(event.data.code, codeVerifier)
                            .then(resolve)
                            .catch(reject);
                            
                    } else if (event.data && event.data.type === 'TWITTER_AUTH_ERROR') {
                        console.log('❌ Received authentication error message:', event.data.error);
                        messageReceived = true;
                        authCompleted = true;
                        clearInterval(checkClosed);
                        clearTimeout(authTimeout);
                        window.removeEventListener('message', messageHandler);
                        
                        setTimeout(() => {
                            if (popup && !popup.closed) {
                                popup.close();
                            }
                        }, 100);
                        
                        reject(new Error(event.data.error));
                    }
                };
                
                window.addEventListener('message', messageHandler);
                
                // Add timeout for the entire auth process
                const authTimeout = setTimeout(() => {
                    if (!authCompleted) {
                        console.warn('⏰ Authentication timeout - no response received');
                        authCompleted = true;
                        clearInterval(checkClosed);
                        window.removeEventListener('message', messageHandler);
                        if (popup && !popup.closed) {
                            popup.close();
                        }
                        reject(new Error('Authentication timeout'));
                    }
                }, 30000); // 30 second timeout
                
                // Check if popup was closed manually (but not if auth completed)
                const checkClosed = setInterval(() => {
                    if (popup.closed && !authCompleted) {
                        console.log('🚪 Popup window closed by user');
                        clearInterval(checkClosed);
                        clearTimeout(authTimeout);
                        window.removeEventListener('message', messageHandler);
                        
                        if (messageReceived) {
                            console.log('📨 Message was received before popup closed - authentication may still succeed');
                            // Don't reject immediately if we received a message
                            setTimeout(() => {
                                if (!authCompleted) {
                                    reject(new Error('Authentication cancelled'));
                                }
                            }, 1000);
                        } else {
                            reject(new Error('Authentication cancelled'));
                        }
                    }
                }, 1000); // Check every 1 second
            });
            
        } catch (error) {
            console.error('Authentication initiation failed:', error);
            throw error;
        }
    }



    // Handle successful authentication
    async handleAuthSuccess(authCode, codeVerifier) {
        try {
            console.log('🔄 Processing authentication success...');
            console.log('📋 Auth code received:', authCode ? 'YES' : 'NO');
            console.log('🔑 Code verifier available:', codeVerifier ? 'YES' : 'NO');
            
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
                    
                    console.log('✅ Twitter authentication successful');
                    return this.user;
                } else {
                    throw new Error('Failed to fetch user information');
                }
            } else {
                throw new Error('Failed to get access token');
            }
            
        } catch (error) {
            console.error('Authentication handling failed:', error);
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
            
            // Call our Vercel serverless function for secure token exchange
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
            
            // Provide more specific error messages
            let errorMessage = 'Twitter authentication failed';
            if (error.message.includes('Failed to fetch')) {
                errorMessage = 'Cannot connect to Twitter API. Check your internet connection or try again later.';
            } else if (error.message.includes('400')) {
                errorMessage = 'Invalid authentication request. Please try connecting again.';
            } else if (error.message.includes('401')) {
                errorMessage = 'Twitter authentication failed. Please check your app permissions.';
            } else if (error.message.includes('500')) {
                errorMessage = 'Server error during authentication. Please try again.';
            } else {
                errorMessage = `Twitter authentication failed: ${error.message}`;
            }
            
            throw new Error(errorMessage);
        }
    }

    // Fetch user information from Twitter API
    async fetchUserInfo(accessToken) {
        try {
            // Call our Vercel serverless function for user info
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
            
            // Don't fallback to demo mode - show real error
            throw new Error(`Failed to get Twitter user info: ${error.message}`);
        }
    }

    // Sign out user
    signOut() {
        this.isAuthenticated = false;
        this.user = null;
        this.token = null;
        
        // Clear stored authentication state
        localStorage.removeItem('twitter_auth_state');
        localStorage.removeItem('twitter_code_verifier');
        
        console.log('👋 User signed out');
    }

    // Save authentication state to localStorage
    saveAuthState() {
        if (this.isAuthenticated && this.user) {
            const authState = {
                user: this.user,
                token: this.token,
                timestamp: Date.now()
            };
            
            localStorage.setItem('twitter_auth_state', JSON.stringify(authState));
        }
    }

    // Load authentication state from localStorage
    loadAuthState() {
        try {
            const stored = localStorage.getItem('twitter_auth_state');
            if (stored) {
                const authState = JSON.parse(stored);
                
                // Check if token is not too old (24 hours)
                const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
                if (Date.now() - authState.timestamp < maxAge) {
                    this.user = authState.user;
                    this.token = authState.token;
                    this.isAuthenticated = true;
                    
                    console.log('✅ Restored Twitter authentication state');
                } else {
                    // Token expired, clear it
                    localStorage.removeItem('twitter_auth_state');
                    console.log('⏰ Twitter token expired, cleared');
                }
            }
        } catch (error) {
            console.error('Failed to load auth state:', error);
            localStorage.removeItem('twitter_auth_state');
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

    // Update UI based on authentication state
    updateUI() {
        const authButton = document.getElementById('twitterAuthButton');
        const leaderboardButton = document.getElementById('leaderboardButton');
        
        if (this.authenticated) {
            // Hide auth button, show leaderboard access
            if (authButton) authButton.style.display = 'none';
            if (leaderboardButton) {
                leaderboardButton.disabled = false;
                leaderboardButton.textContent = '🏆 Leaderboard';
            }
            
            // Update any user display elements
            this.updateUserDisplay();
        } else {
            // Show auth button, disable leaderboard
            if (authButton) {
                authButton.style.display = 'block';
                authButton.textContent = '🐦 Connect Twitter for Contest';
            }
            if (leaderboardButton) {
                leaderboardButton.disabled = true;
                leaderboardButton.textContent = '🔒 Twitter Required';
            }
        }
    }

    // Update user display in UI
    updateUserDisplay() {
        if (this.user) {
            // You can add user info display here
            console.log(`👋 Welcome back, @${this.user.username}!`);
        }
    }

    // Share achievement on Twitter - SIMPLE VERSION (NO AUTH NEEDED!)
    async shareAchievement(score, rank = null) {
        try {
            // Create engaging tweet text
            let tweetText = `🐔 Just scored ${score.toLocaleString()} points in PACO JUMP! 🎮`;
            
            if (rank) {
                if (rank === 1) {
                    tweetText += `\n\n🥇 I'm currently #1 on the leaderboard! 🏆`;
                } else if (rank <= 3) {
                    tweetText += `\n\n🏅 Ranked #${rank} on the leaderboard!`;
                } else if (rank <= 10) {
                    tweetText += `\n\n🎯 Made it to the top 10 at rank #${rank}!`;
                } else {
                    tweetText += `\n\n📈 Ranked #${rank} on the leaderboard!`;
                }
            }

            tweetText += `\n\nCan you beat my score? 🤔\n\n#PacoJump #Gaming #Contest`;

            // Add game URL if available
            const gameUrl = window.location.origin;
            if (gameUrl) {
                tweetText += `\n\nPlay now: ${gameUrl}`;
            }

            // Use Twitter Web Intent for sharing - NO AUTH REQUIRED!
            const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
            
            // Open in new window
            const shareWindow = window.open(
                tweetUrl,
                'twitterShare',
                'width=550,height=420,scrollbars=yes,resizable=yes'
            );

            // Check if window was opened successfully
            if (shareWindow) {
                console.log('🐦 Opened Twitter share window');
                return true;
            } else {
                console.error('❌ Failed to open Twitter share window');
                return false;
            }

        } catch (error) {
            console.error('Twitter sharing error:', error);
            return false;
        }
    }

    // Share trophy image with achievement
    async shareTrophyAchievement(score, rank = null, imageUrl = null) {
        try {
            // NO AUTH NEEDED FOR SIMPLE SHARING!

            let tweetText = `🏆 ACHIEVEMENT UNLOCKED! 🏆\n\n🐔 Scored ${score.toLocaleString()} points in PACO JUMP!`;
            
            if (rank) {
                if (rank === 1) {
                    tweetText += `\n🥇 CHAMPION - #1 on the leaderboard!`;
                } else if (rank <= 3) {
                    tweetText += `\n🏅 #${rank} on the leaderboard!`;
                } else {
                    tweetText += `\n📊 Ranked #${rank}!`;
                }
            }

            tweetText += `\n\n🎮 Think you can beat this? Try PACO JUMP now!\n\n#PacoJump #Gaming #Achievement #Contest`;

            // Add game URL
            const gameUrl = window.location.origin;
            if (gameUrl) {
                tweetText += `\n\nPlay: ${gameUrl}`;
            }

            const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
            
            const shareWindow = window.open(
                tweetUrl,
                'twitterTrophyShare',
                'width=550,height=420,scrollbars=yes,resizable=yes'
            );

            if (shareWindow) {
                console.log('🏆 Opened Twitter trophy share window');
                return true;
            } else {
                console.error('❌ Failed to open Twitter trophy share window');
                return false;
            }

        } catch (error) {
            console.error('Twitter trophy sharing error:', error);
            return false;
        }
    }
}

// Export singleton instance
const twitterAuth = new TwitterAuth();

// Auto-update UI when page loads
document.addEventListener('DOMContentLoaded', () => {
    twitterAuth.updateUI();
});

console.log('🔐 Twitter authentication loaded');