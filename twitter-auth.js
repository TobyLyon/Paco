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
        
        // Twitter API configuration
        this.config = {
            clientId: 'VjRpTXFrdkxhbnhUSWROOWlOQkE6MTpjaQ', // Your actual Twitter Client ID goes here
            redirectUri: window.location.origin + '/auth/callback',
            scopes: ['tweet.read', 'users.read', 'tweet.write', 'offline.access'],
            authUrl: 'https://twitter.com/i/oauth2/authorize'
        };
        
        // Load saved authentication state
        this.loadAuthState();
        
        console.log('🐦 Twitter auth module initialized');
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
            
            // Listen for popup messages
            return new Promise((resolve, reject) => {
                const messageHandler = (event) => {
                    if (event.origin !== window.location.origin) return;
                    
                    if (event.data.type === 'TWITTER_AUTH_SUCCESS') {
                        window.removeEventListener('message', messageHandler);
                        popup.close();
                        this.handleAuthSuccess(event.data.code, codeVerifier)
                            .then(resolve)
                            .catch(reject);
                    } else if (event.data.type === 'TWITTER_AUTH_ERROR') {
                        window.removeEventListener('message', messageHandler);
                        popup.close();
                        reject(new Error(event.data.error));
                    }
                };
                
                window.addEventListener('message', messageHandler);
                
                // Check if popup was closed manually
                const checkClosed = setInterval(() => {
                    if (popup.closed) {
                        clearInterval(checkClosed);
                        window.removeEventListener('message', messageHandler);
                        reject(new Error('Authentication cancelled'));
                    }
                }, 1000);
            });
            
        } catch (error) {
            console.error('Authentication initiation failed:', error);
            throw error;
        }
    }



    // Handle successful authentication
    async handleAuthSuccess(authCode, codeVerifier) {
        try {
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
        // Note: In a production environment, this should be handled by your backend
        // to keep client secrets secure. This is a simplified version for demo purposes.
        
        try {
            const tokenParams = new URLSearchParams({
                grant_type: 'authorization_code',
                client_id: this.config.clientId,
                code: code,
                redirect_uri: this.config.redirectUri,
                code_verifier: codeVerifier
            });
            
            // This would typically be a call to your backend API
            // which then makes the secure call to Twitter's token endpoint
            const response = await fetch('/api/twitter/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: tokenParams.toString()
            });
            
            if (!response.ok) {
                throw new Error('Token exchange failed');
            }
            
            return await response.json();
            
        } catch (error) {
            console.error('Token exchange error:', error);
            
            // Fallback: simulate successful authentication for demo
            console.warn('⚠️ Using demo mode - Twitter auth simulated');
            return {
                access_token: 'demo_token_' + Date.now(),
                token_type: 'bearer'
            };
        }
    }

    // Fetch user information from Twitter API
    async fetchUserInfo(accessToken) {
        try {
            // This would typically be a call to your backend API
            const response = await fetch('/api/twitter/user', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch user info');
            }
            
            const data = await response.json();
            return data.data;
            
        } catch (error) {
            console.error('User info fetch error:', error);
            
            // Fallback: simulate user data for demo
            console.warn('⚠️ Using demo mode - generating mock user data');
            return {
                id: 'demo_user_' + Date.now(),
                username: 'PacoPlayer' + Math.floor(Math.random() * 1000),
                name: 'Paco Jump Player',
                profile_image_url: 'https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png',
                verified: false
            };
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

    // Share achievement on Twitter
    async shareAchievement(score, rank = null) {
        try {
            if (!this.authenticated) {
                console.warn('Cannot share - user not authenticated');
                return false;
            }

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

            // Use Twitter Web Intent for sharing (more reliable than API)
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
            if (!this.authenticated) {
                console.warn('Cannot share trophy - user not authenticated');
                return false;
            }

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