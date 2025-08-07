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
        
        // Check for mobile auth callback data
        this.checkMobileAuthCallback();
        
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
            console.log('🌐 Auth URL:', authUrl);
            console.log('🔧 Auth params:', Object.fromEntries(authParams));
            
            // Enhanced mobile detection - be aggressive about forcing mobile flow
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            const isSmallScreen = window.innerWidth <= 768 || window.innerHeight <= 600;
            const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            const isLikelyMobile = window.innerWidth < window.innerHeight; // Portrait orientation
            const hasTouch = navigator.maxTouchPoints > 0;
            
            // Force mobile flow for better reliability
            const shouldUseMobileFlow = isMobile || isSmallScreen || isTouchDevice || isLikelyMobile || hasTouch;
            
            console.log('🔍 AGGRESSIVE MOBILE DETECTION:', {
                userAgent: navigator.userAgent.substring(0, 50) + '...',
                isMobile,
                isSmallScreen,
                isTouchDevice,
                isLikelyMobile,
                hasTouch,
                shouldUseMobileFlow,
                screenSize: `${window.innerWidth}x${window.innerHeight}`,
                orientation: window.innerWidth < window.innerHeight ? 'portrait' : 'landscape'
            });
            
            if (shouldUseMobileFlow) {
                // Mobile: Force same window redirect (most reliable for mobile)
                console.log('📱 MOBILE FORCED: Using same-window redirect for maximum compatibility');
                console.log('📱 This should redirect back automatically after authentication');
                window.location.href = authUrl;
                return;
            }
            
            // Desktop: Use popup window for authentication
            // On mobile, use smaller popup dimensions
            const popupWidth = isMobile ? Math.min(400, window.screen.width - 20) : 500;
            const popupHeight = isMobile ? Math.min(600, window.screen.height - 40) : 600;
            const left = isMobile ? 10 : (window.screen.width / 2) - (popupWidth / 2);
            const top = isMobile ? 20 : (window.screen.height / 2) - (popupHeight / 2);
            
            const popup = window.open(
                authUrl,
                'twitterAuth',
                `width=${popupWidth},height=${popupHeight},left=${left},top=${top},scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no,status=no`
            );
            
            // Debug popup loading (avoid CORS errors)
            setTimeout(() => {
                if (popup && !popup.closed) {
                    console.log('🔍 Popup status: OPEN');
                    console.log('🌐 Popup navigated to Twitter (cannot access URL due to CORS)');
                } else {
                    console.log('❌ Popup status: CLOSED OR BLOCKED');
                }
            }, 2000);
            
            if (!popup) {
                throw new Error('Popup blocked! Please allow popups for this site and try again.');
            }
            
            this.authWindow = popup;
            
            // Give user instructions
            console.log('🎯 IMPORTANT: Do NOT close the Twitter popup window!');
            console.log('📱 Complete the Twitter authorization and it will close automatically.');
            
            // Listen for popup messages with enhanced error handling
            return new Promise((resolve, reject) => {
                let authCompleted = false;
                let messageReceived = false;
                
                const messageHandler = (event) => {
                    // We ONLY care about messages with a 'type' property for our auth flow.
                    if (!event.data || !event.data.type) {
                        if (event.data && event.data.target && event.data.target.includes('metamask')) {
                            console.log('🦊 Ignoring MetaMask message (no type)');
                        }
                        return; // This will ignore MetaMask, other extensions, and random string messages.
                    }

                    // Log any message that looks like it might be for us.
                    console.log('📨 Received potential message:', event.data, 'from origin:', event.origin);

                    if (event.data.type === 'TWITTER_AUTH_SUCCESS') {
                        console.log('✅✅✅ SUCCESS MESSAGE RECEIVED! Processing...');
                        messageReceived = true;
                        authCompleted = true; // Mark as completed
                        
                        // Clean up listeners and timers
                        clearInterval(checkClosed);
                        clearTimeout(authTimeout);
                        window.removeEventListener('message', messageHandler);

                        // Close popup after a delay
                        setTimeout(() => {
                            if (popup && !popup.closed) {
                                popup.close();
                            }
                        }, 200);

                        this.handleAuthSuccess(event.data.code, localStorage.getItem('twitter_code_verifier'))
                            .then(resolve)
                            .catch(reject);

                    } else if (event.data.type === 'TWITTER_AUTH_ERROR') {
                        console.error('❌❌❌ ERROR MESSAGE RECEIVED!', event.data.error);
                        reject(new Error(event.data.error || 'Authentication failed in popup'));
                        
                        // Clean up
                        clearInterval(checkClosed);
                        clearTimeout(authTimeout);
                        window.removeEventListener('message', messageHandler);
                    } else {
                        console.log('🔌 Ignoring non-Twitter message with type:', event.data.type);
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
                let checkCount = 0;
                const checkClosed = setInterval(() => {
                    checkCount++;
                    
                    if (popup.closed && !authCompleted) {
                        console.log('🚪 Popup window closed');
                        console.log('📊 Auth status:', { authCompleted, messageReceived, checkCount });
                        console.log('⏱️ Popup was open for ~' + checkCount + ' seconds');
                        clearInterval(checkClosed);
                        clearTimeout(authTimeout);
                        window.removeEventListener('message', messageHandler);
                        
                        if (messageReceived) {
                            console.log('📨 Message was received before popup closed - giving extra time...');
                            // Don't reject immediately if we received a message
                            setTimeout(() => {
                                if (!authCompleted) {
                                    console.log('⏰ Authentication still not completed after extra time');
                                    reject(new Error('Authentication cancelled - popup closed too early'));
                                }
                            }, 2000); // Give more time
                        } else {
                            console.log('❌ No auth message received - possible causes:');
                            console.log('   1. User cancelled authentication');
                            console.log('   2. Twitter app not configured properly');
                            console.log('   3. Callback URL mismatch');
                            console.log('   4. Network/CORS issues');
                            reject(new Error('Authentication cancelled - no response from Twitter'));
                        }
                    } else if (!popup.closed && checkCount % 10 === 0) {
                        console.log('⏳ Popup still open... (' + checkCount + 's)');
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
    
    // Check for mobile auth callback data in localStorage
    checkMobileAuthCallback() {
        const authCode = localStorage.getItem('twitter_auth_code');
        const authState = localStorage.getItem('twitter_auth_state_mobile');
        const authTimestamp = localStorage.getItem('twitter_auth_timestamp');
        
        if (authCode && authTimestamp) {
            const timestamp = parseInt(authTimestamp);
            const now = Date.now();
            
            // Check if auth data is recent (within 5 minutes)
            if (now - timestamp < 5 * 60 * 1000) {
                console.log('📱 MOBILE: Found auth callback data, processing...');
                
                // Clean up stored data
                localStorage.removeItem('twitter_auth_code');
                localStorage.removeItem('twitter_auth_state_mobile');
                localStorage.removeItem('twitter_auth_timestamp');
                
                // Process the auth code
                this.handleAuthCallback(authCode, authState);
            } else {
                console.log('📱 MOBILE: Auth data expired, cleaning up...');
                localStorage.removeItem('twitter_auth_code');
                localStorage.removeItem('twitter_auth_state_mobile');
                localStorage.removeItem('twitter_auth_timestamp');
            }
        }
    }
    
    // Handle auth callback data (mobile flow)
    async handleAuthCallback(authCode, authState) {
        try {
            console.log('📱 MOBILE: Processing stored auth callback data...');
            console.log('📋 Auth code:', authCode ? 'PRESENT' : 'MISSING');
            console.log('🔑 Auth state:', authState ? 'PRESENT' : 'MISSING');
            
            // Get the stored code verifier
            const codeVerifier = localStorage.getItem('twitter_code_verifier');
            
            if (!codeVerifier) {
                throw new Error('Code verifier not found - authentication expired');
            }
            
            console.log('🔑 Code verifier found, proceeding with token exchange...');
            
            // Process the authentication using the existing handleAuthSuccess method
            const user = await this.handleAuthSuccess(authCode, codeVerifier);
            
            console.log('✅ MOBILE: Authentication completed successfully!', user);
            
            // Update UI to reflect authenticated state
            this.updateUI();
            
            // Trigger any callbacks or events
            this.dispatchAuthEvent('success', user);
            
            return user;
            
        } catch (error) {
            console.error('❌ MOBILE: Auth callback handling failed:', error);
            
            // Clean up any remaining auth data
            localStorage.removeItem('twitter_code_verifier');
            
            // Trigger error event
            this.dispatchAuthEvent('error', error);
            
            throw error;
        }
    }
    
    // Dispatch authentication events for better integration
    dispatchAuthEvent(type, data) {
        try {
            const event = new CustomEvent('twitterAuthStateChange', {
                detail: { type, data, authenticated: this.authenticated }
            });
            window.dispatchEvent(event);
            console.log(`🔔 Dispatched auth event: ${type}`);
        } catch (error) {
            console.warn('Failed to dispatch auth event:', error);
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
        
        console.log('🔄 Updating UI, authenticated:', this.authenticated, 'user:', this.user?.username);
        
        if (this.authenticated) {
            // Hide auth button, show leaderboard access
            if (authButton) {
                authButton.style.display = 'none';
                console.log('✅ UI: Auth button hidden');
            }
            if (leaderboardButton) {
                leaderboardButton.disabled = false;
                leaderboardButton.textContent = '🏆 Leaderboard';
                console.log('✅ UI: Leaderboard button enabled');
            }
            
            // Update any user display elements
            this.updateUserDisplay();
        } else {
            // Show auth button, but allow leaderboard viewing for guests
            if (authButton) {
                authButton.style.display = 'block';
                authButton.textContent = '🐦 Connect Twitter for Contest';
                authButton.disabled = false; // Ensure button is clickable
                console.log('✅ UI: Auth button shown and enabled');
            }
            if (leaderboardButton) {
                leaderboardButton.disabled = false; // Allow guests to view leaderboard
                leaderboardButton.textContent = '👀 View Leaderboard';
                console.log('✅ UI: Leaderboard button enabled for guest viewing');
            }
        }
        
        // Force DOM update by triggering a reflow
        if (authButton) authButton.offsetHeight;
        if (leaderboardButton) leaderboardButton.offsetHeight;
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

            tweetText += `\n\nCan you beat my score? 🤔\n\n`;

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

            tweetText += `\n\n🎮 Think you can beat this? Try PACO JUMP now!\n\n`;

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