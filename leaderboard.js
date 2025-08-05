// ===== PACO JUMP - LEADERBOARD MODULE =====

/**
 * Leaderboard Management System
 * Handles score submission, daily rankings, and leaderboard display
 * Integrates with Supabase for persistent storage and real-time updates
 */

class Leaderboard {
    constructor() {
        this.tableName = 'game_scores';
        this.currentLeaderboard = [];
        this.userBestScore = 0;
        this.dailyResetTime = this.getResetTime();
        this.realtimeChannel = null;
        this.countdownInterval = null;
        
        console.log('🏆 Leaderboard system initialized');
        console.log(`⏰ Daily reset time: ${this.dailyResetTime.toLocaleString()}`);
    }

    // Get reset time - check for custom time first, then default
    getResetTime() {
        // Check if there's a custom reset time set
        const customResetData = localStorage.getItem('leaderboard_reset_time');
        if (customResetData) {
            try {
                const resetData = JSON.parse(customResetData);
                const customResetTime = new Date(resetData.resetTime);
                
                // Only use custom time if it's in the future
                if (customResetTime.getTime() > Date.now()) {
                    console.log('⏰ Using custom reset time:', customResetTime.toLocaleString());
                    return customResetTime;
                } else {
                    // Custom time has passed, remove it and use default
                    localStorage.removeItem('leaderboard_reset_time');
                    console.log('⏰ Custom reset time expired, using default');
                }
            } catch (error) {
                console.warn('⚠️ Invalid custom reset time data, using default');
                localStorage.removeItem('leaderboard_reset_time');
            }
        }
        
        // Use default daily reset time
        return this.getTodayResetTime();
    }

    // Get today's reset time (UTC midnight)
    getTodayResetTime() {
        const now = new Date();
        const resetTime = new Date(now);
        resetTime.setUTCHours(0, 0, 0, 0);
        
        // If it's past midnight, set for next day
        if (now.getTime() >= resetTime.getTime()) {
            resetTime.setUTCDate(resetTime.getUTCDate() + 1);
        }
        
        return resetTime;
    }

    // Check if leaderboard needs reset
    needsReset() {
        return Date.now() >= this.dailyResetTime.getTime();
    }

    // Restart/extend the countdown timer
    restartCountdown(hoursToExtend = 24) {
        console.log(`🔄 Restarting leaderboard countdown by ${hoursToExtend} hours`);
        
        // Set new reset time to current time + specified hours
        const newResetTime = new Date();
        newResetTime.setTime(newResetTime.getTime() + (hoursToExtend * 60 * 60 * 1000));
        
        this.dailyResetTime = newResetTime;
        
        // Save the new reset time to localStorage so it persists
        const resetData = {
            resetTime: this.dailyResetTime.toISOString(),
            extendedAt: new Date().toISOString(),
            hoursExtended: hoursToExtend
        };
        localStorage.setItem('leaderboard_reset_time', JSON.stringify(resetData));
        
        console.log(`⏰ New countdown reset time: ${this.dailyResetTime.toLocaleString()}`);
        console.log(`⏱️ Time remaining: ${this.getTimeUntilReset()}`);
        
        // Refresh the leaderboard display to show new countdown
        if (this.currentLeaderboard.length > 0) {
            this.showLeaderboard();
        }
        
        // Restart countdown timer with new time
        this.startCountdownTimer();
        
        return this.dailyResetTime;
    }

    // Reset countdown back to normal daily schedule
    resetToDefaultSchedule() {
        console.log('🔄 Resetting countdown to default daily schedule');
        
        // Clear any custom reset time
        localStorage.removeItem('leaderboard_reset_time');
        
        // Set back to normal daily reset
        this.dailyResetTime = this.getTodayResetTime();
        
        console.log(`⏰ Reset to default schedule: ${this.dailyResetTime.toLocaleString()}`);
        
        // Refresh the leaderboard display
        if (this.currentLeaderboard.length > 0) {
            this.showLeaderboard();
        }
        
        // Restart countdown timer with new time
        this.startCountdownTimer();
        
        return this.dailyResetTime;
    }

    // Get formatted time until reset
    getTimeUntilReset() {
        const now = Date.now();
        const resetTime = this.dailyResetTime.getTime();
        const diff = resetTime - now;
        
        if (diff <= 0) {
            return 'Contest ended!';
        }
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        } else {
            return `${seconds}s`;
        }
    }

    // Start countdown timer updates
    startCountdownTimer() {
        // Clear existing timer
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }
        
        // Update every second
        this.countdownInterval = setInterval(() => {
            // Check if leaderboard is visible
            const overlay = document.getElementById('gameOverlay');
            if (overlay && overlay.classList.contains('show')) {
                // Update countdown display
                const timerElement = document.querySelector('.reset-timer strong');
                if (timerElement) {
                    const timeRemaining = this.getTimeUntilReset();
                    timerElement.textContent = timeRemaining;
                    
                    // Check if contest ended
                    if (timeRemaining === 'Contest ended!') {
                        timerElement.style.color = '#ef4444'; // Red color
                        timerElement.parentElement.innerHTML = '🏁 Contest ended! New contest starts soon...';
                        clearInterval(this.countdownInterval);
                        this.countdownInterval = null;
                    }
                }
            }
        }, 1000);
        
        console.log('⏱️ Countdown timer started');
    }

    // Stop countdown timer
    stopCountdownTimer() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
            console.log('⏱️ Countdown timer stopped');
        }
    }

    // Submit score to leaderboard
    async submitScore(score) {
        try {
            // Check if user is authenticated
            if (!twitterAuth.authenticated) {
                throw new Error('Twitter authentication required for leaderboard');
            }

            // Anti-cheat validation
            let secureSubmission = null;
            if (typeof antiCheat !== 'undefined') {
                try {
                    secureSubmission = antiCheat.createSecureSubmission(score);
                    console.log('🛡️ Score passed anti-cheat validation');
                } catch (error) {
                    console.error('🚨 Anti-cheat validation failed:', error.message);
                    throw new Error(`Score validation failed: ${error.message}`);
                }
            } else {
                console.warn('⚠️ Anti-cheat system not available');
            }

            const user = twitterAuth.currentUser;
            const scoreData = {
                user_id: user.id,
                username: user.username,
                display_name: user.name,
                profile_image: user.profileImage,
                score: score,
                created_at: new Date().toISOString(),
                game_date: this.getCurrentGameDate(),
                // Add anti-cheat data if available
                ...(secureSubmission && {
                    session_id: secureSubmission.sessionId,
                    game_time: secureSubmission.gameTime,
                    platforms_jumped: secureSubmission.platformsJumped,
                    checksum: secureSubmission.checksum
                })
            };

            // Submit to Supabase
            if (orderTracker && typeof orderTracker.recordGameScore === 'function') {
                const result = await orderTracker.recordGameScore(scoreData);
                
                if (result.success) {
                    if (result.skipped) {
                        console.log('📊 Score not submitted - existing score is higher');
                    } else {
                        console.log('✅ Score submitted successfully');
                    }
                    
                    // Update local best score
                    this.userBestScore = Math.max(this.userBestScore, score);
                    this.saveBestScore();
                    
                    // Refresh leaderboard
                    await this.fetchTodayLeaderboard();
                    
                    return result;
                } else {
                    throw new Error(result.error);
                }
            } else {
                // Fallback: store locally only
                console.warn('⚠️ Supabase not available, storing score locally');
                this.storeScoreLocally(scoreData);
                return { success: true, local: true };
            }
            
        } catch (error) {
            console.error('Score submission failed:', error);
            
            // Provide more specific error information
            let errorMessage = 'Score submission failed';
            if (error.message) {
                errorMessage += ': ' + error.message;
            }
            
            // Try to store locally as fallback
            try {
                const user = twitterAuth.currentUser;
                if (user) {
                    const scoreData = {
                        user_id: user.id,
                        username: user.username,
                        display_name: user.name,
                        score: score,
                        created_at: new Date().toISOString(),
                        game_date: this.getCurrentGameDate(),
                        local_fallback: true
                    };
                    this.storeScoreLocally(scoreData);
                    console.log('💾 Score saved locally as fallback');
                    return { success: true, local: true, fallback: true };
                }
            } catch (fallbackError) {
                console.error('Local fallback also failed:', fallbackError);
            }
            
            throw new Error(errorMessage);
        }
    }

    // Fetch today's leaderboard
    async fetchTodayLeaderboard() {
        try {
            if (orderTracker && typeof orderTracker.getTodayLeaderboard === 'function') {
                const result = await orderTracker.getTodayLeaderboard();
                
                if (result.success) {
                    // FORCE PROPER SORTING - highest scores first
                    this.currentLeaderboard = (result.data || [])
                        .filter(entry => entry && typeof entry.score === 'number')
                        .sort((a, b) => b.score - a.score); // Highest to lowest
                    
                    console.log(`📊 Loaded ${this.currentLeaderboard.length} leaderboard entries (sorted by score)`);
                    console.log('Top 3 scores:', this.currentLeaderboard.slice(0, 3).map(e => `${e.username}: ${e.score}`));
                    return this.currentLeaderboard;
                } else {
                    throw new Error(result.error);
                }
            } else {
                // Fallback: use local scores
                console.warn('⚠️ Supabase not available, using local scores');
                this.currentLeaderboard = this.getLocalLeaderboard();
                return this.currentLeaderboard;
            }
            
        } catch (error) {
            console.error('Leaderboard fetch failed:', error);
            return [];
        }
    }

    // Get current game date (for daily reset tracking)
    getCurrentGameDate() {
        const now = new Date();
        const gameDate = new Date(now);
        gameDate.setUTCHours(0, 0, 0, 0);
        return gameDate.toISOString().split('T')[0]; // YYYY-MM-DD format
    }

    // Store score locally as fallback
    storeScoreLocally(scoreData) {
        try {
            const localScores = JSON.parse(localStorage.getItem('paco_game_scores') || '[]');
            localScores.push(scoreData);
            
            // Keep only today's scores for local storage
            const today = this.getCurrentGameDate();
            const todayScores = localScores.filter(score => 
                score.game_date === today
            );
            
            localStorage.setItem('paco_game_scores', JSON.stringify(todayScores));
            
            // Update local best score
            this.userBestScore = Math.max(this.userBestScore, scoreData.score);
            this.saveBestScore();
            
        } catch (error) {
            console.error('Local score storage failed:', error);
        }
    }

    // Get local leaderboard as fallback
    getLocalLeaderboard() {
        try {
            const localScores = JSON.parse(localStorage.getItem('paco_game_scores') || '[]');
            const today = this.getCurrentGameDate();
            
            // Filter today's scores and sort by score (highest first)
            return localScores
                .filter(score => score.game_date === today)
                .sort((a, b) => b.score - a.score)
                .slice(0, 10); // Top 10
                
        } catch (error) {
            console.error('Local leaderboard fetch failed:', error);
            return [];
        }
    }

    // Get user's rank in current leaderboard
    getUserRank(userId) {
        const userEntry = this.currentLeaderboard.find(entry => entry.user_id === userId);
        if (userEntry) {
            return this.currentLeaderboard.indexOf(userEntry) + 1;
        }
        return null;
    }

    // Get user's best score for today
    getUserBestScore(userId) {
        const userScores = this.currentLeaderboard.filter(entry => entry.user_id === userId);
        if (userScores.length > 0) {
            return Math.max(...userScores.map(entry => entry.score));
        }
        return 0;
    }

    // Display leaderboard in UI - SIMPLE AND CLEAN
    showLeaderboard(expandedMode = false) {
        if (expandedMode) {
            this.showExpandedModal();
            return;
        }
        
        const overlay = document.getElementById('gameOverlay');
        const overlayContent = document.getElementById('overlayContent');
        
        if (!overlay || !overlayContent) {
            console.error('Leaderboard UI elements not found');
            return;
        }

        // Clean, simple leaderboard HTML
        let leaderboardHTML = '<div class="leaderboard-container compact">';
        leaderboardHTML += '<button class="leaderboard-toggle" onclick="leaderboard.showExpandedLeaderboard()" title="Expand">🔍</button>';
        leaderboardHTML += '<h3 style="margin: 0 0 12px 0; font-size: 1.1rem;">🏆 Leaderboard</h3>';
        
        if (this.currentLeaderboard.length === 0) {
            leaderboardHTML += `
                <div style="text-align: center; padding: 20px; color: var(--text-secondary);">
                    <div style="font-size: 2rem; margin-bottom: 8px;">🐔</div>
                    <p>No scores yet today!</p>
                    <p style="font-size: 0.9rem; color: var(--restaurant-yellow);">Be the first Paco champion!</p>
                </div>
            `;
        } else {
            leaderboardHTML += '<div class="leaderboard-list" style="max-height: none; overflow: visible;">';
            
            const maxEntries = 5; // Show top 5 instantly visible
            this.currentLeaderboard.slice(0, maxEntries).forEach((entry, index) => {
                // Validate entry data
                if (!entry || typeof entry.score !== 'number' || !entry.username) {
                    console.warn('Invalid leaderboard entry:', entry);
                    return;
                }
                
                const rank = index + 1;
                const isCurrentUser = twitterAuth.authenticated && 
                                    entry.user_id === twitterAuth.currentUser?.id;
                
                const rankEmoji = this.getRankEmoji(rank);
                const userClass = isCurrentUser ? 'current-user' : '';
                
                // Add live indicator for recent scores (with null check)
                let isRecentScore = false;
                if (entry.created_at) {
                    try {
                        isRecentScore = Date.now() - new Date(entry.created_at).getTime() < 300000; // 5 minutes
                    } catch (e) {
                        // Invalid date format, ignore
                    }
                }
                const liveIndicator = isRecentScore ? ' 🔴' : '';
                
                leaderboardHTML += `
                    <div class="leaderboard-entry ${userClass}" style="padding: 6px 8px; margin: 2px 0;">
                        <span class="rank" style="font-size: 0.8rem;">${rankEmoji} ${rank}</span>
                        <span class="username" style="font-size: 0.8rem;">
                            <a href="https://twitter.com/${entry.username}" target="_blank" rel="noopener noreferrer" class="twitter-handle">
                                @${entry.username}
                            </a>${liveIndicator}
                        </span>
                        <span class="score" style="font-size: 0.8rem;">${entry.score.toLocaleString()}</span>
                    </div>
                `;
            });
            
            leaderboardHTML += '</div>';
            
            // Compact reset timer
            const timeUntilReset = this.getTimeUntilReset();
            leaderboardHTML += `
                <div style="text-align: center; margin: 4px 0; padding: 2px; font-size: 0.65rem; color: #94a3b8;">
                    Resets in: ${timeUntilReset}
                </div>
            `;
        }
        
        // Add trophy generation for current user if they're in top 5
        if (twitterAuth.authenticated) {
            const userEntry = this.currentLeaderboard.find(entry => 
                entry.user_id === twitterAuth.currentUser.id
            );
            if (userEntry) {
                const userRank = this.currentLeaderboard.indexOf(userEntry) + 1;
                if (userRank <= 5) {
                    leaderboardHTML += `
                        <div style="margin: 6px 0; padding: 6px; background: rgba(251, 191, 36, 0.1); border-radius: 6px; border: 1px solid rgba(251, 191, 36, 0.3);">
                            <p style="color: var(--restaurant-yellow); font-size: 0.7rem; margin-bottom: 4px; text-align: center;">
                                🏆 Top ${userRank <= 3 ? '3' : '5'}! Share:
                            </p>
                            <!-- UNIFIED SHARE & DOWNLOAD BUTTON -->
                            <button onclick="leaderboardShareAndDownload(${userEntry.score}, ${userRank})" style="
                                background: linear-gradient(135deg, #1d9bf0 0%, #1a8cd8 100%);
                                color: white;
                                border: none;
                                border-radius: 6px;
                                padding: 6px 10px;
                                font-family: var(--font-display);
                                font-weight: 600;
                                font-size: 0.7rem;
                                cursor: pointer;
                                transition: all 0.2s ease;
                                width: 100%;
                                text-transform: uppercase;
                                box-shadow: 0 2px 6px rgba(29, 155, 240, 0.3);
                            " onmouseover="
                                this.style.transform='translateY(-1px)';
                                this.style.background='linear-gradient(135deg, #2ea8ff 0%, #1d9bf0 100%)';
                            " onmouseout="
                                this.style.transform='translateY(0)';
                                this.style.background='linear-gradient(135deg, #1d9bf0 0%, #1a8cd8 100%)';
                            ">
                                🐦📥 Share & Save
                            </button>
                        </div>
                    `;
                }
            }
        }
        
        leaderboardHTML += '<button onclick="hideLeaderboard()" class="close-btn">Close</button>';
        leaderboardHTML += '</div>';
        
        overlayContent.innerHTML = leaderboardHTML;
        overlay.classList.add('show');
        
        // Start countdown timer updates
        this.startCountdownTimer();
    }

    // Hide leaderboard
    hideLeaderboard() {
        const overlay = document.getElementById('gameOverlay');
        if (overlay) {
            overlay.classList.remove('show');
        }
        this.removeLeaderboardBackdrop();
        
        // Stop countdown timer
        this.stopCountdownTimer();
    }

    // Show expanded leaderboard
    showExpandedLeaderboard() {
        this.showLeaderboard(true);
    }

    // Close expanded leaderboard
    closeExpandedLeaderboard() {
        // Remove expanded modal
        const expandedModal = document.getElementById('expandedLeaderboardModal');
        if (expandedModal) {
            expandedModal.remove();
        }
        
        // Remove backdrop
        this.removeLeaderboardBackdrop();
        
        // Stop countdown timer
        this.stopCountdownTimer();
        
        console.log('❌ Expanded leaderboard closed');
    }

    // Create backdrop for expanded leaderboard
    createLeaderboardBackdrop() {
        // Remove existing backdrop if any
        this.removeLeaderboardBackdrop();
        
        const backdrop = document.createElement('div');
        backdrop.className = 'leaderboard-backdrop';
        backdrop.id = 'leaderboardBackdrop';
        backdrop.onclick = () => this.closeExpandedLeaderboard();
        
        document.body.appendChild(backdrop);
        
        // Trigger animation
        setTimeout(() => {
            backdrop.classList.add('active');
        }, 10);
    }

    // Remove backdrop
    removeLeaderboardBackdrop() {
        const backdrop = document.getElementById('leaderboardBackdrop');
        if (backdrop) {
            backdrop.classList.remove('active');
            setTimeout(() => {
                backdrop.remove();
            }, 300);
        }
    }

    // Show expanded modal outside game container
    showExpandedModal() {
        // Create backdrop
        this.createLeaderboardBackdrop();
        
        // Create expanded modal container
        const expandedModal = document.createElement('div');
        expandedModal.id = 'expandedLeaderboardModal';
        expandedModal.className = 'leaderboard-container expanded';
        
        // Build leaderboard HTML
        let leaderboardHTML = '';
        
        // Add close button
        leaderboardHTML += '<button class="leaderboard-close" onclick="leaderboard.closeExpandedLeaderboard()" title="Close">×</button>';
        
        leaderboardHTML += '<h3>🏆 Daily Contest Leaderboard</h3>';
        
        if (this.currentLeaderboard.length === 0) {
            leaderboardHTML += `
                <div style="text-align: center; padding: 20px; color: var(--text-secondary);">
                    <div style="font-size: 2rem; margin-bottom: 8px;">🐔</div>
                    <p>No scores yet today!</p>
                    <p style="font-size: 0.9rem; color: var(--restaurant-yellow);">Be the first Paco champion!</p>
                </div>
            `;
        } else {
            leaderboardHTML += '<div class="leaderboard-list">';
            
            const maxEntries = 25; // Show more entries in expanded mode
            this.currentLeaderboard.slice(0, maxEntries).forEach((entry, index) => {
                if (!entry || typeof entry.score !== 'number' || !entry.username) {
                    return;
                }
                
                const rank = index + 1;
                const isCurrentUser = twitterAuth.authenticated && 
                                    entry.user_id === twitterAuth.currentUser?.id;
                
                const rankEmoji = this.getRankEmoji(rank);
                const displayName = entry.display_name || entry.username || 'Anonymous';
                const formattedScore = entry.score.toLocaleString();
                
                leaderboardHTML += `
                    <div class="leaderboard-entry ${isCurrentUser ? 'current-user' : ''}">
                        <div class="player-info">
                            <span class="rank">${rankEmoji} ${rank}</span>
                            <span class="username">@${displayName}</span>
                        </div>
                        <div class="score">${formattedScore}</div>
                    </div>
                `;
            });
            
            leaderboardHTML += '</div>';
            
            // Enhanced reset timer with contest theme and restart button
            const timeUntilReset = this.getTimeUntilReset();
            leaderboardHTML += `
                <div style="text-align: center; margin: 12px 0; padding: 8px; background: rgba(251, 191, 36, 0.1); border-radius: 6px; border: 1px solid rgba(251, 191, 36, 0.3);">
                    <p class="reset-timer">🎯 Contest resets in: <strong>${timeUntilReset}</strong></p>

                </div>
            `;
        }
        
        // Add trophy generation for current user if they're in top 10
        if (twitterAuth.authenticated) {
            const userEntry = this.currentLeaderboard.find(entry => 
                entry.user_id === twitterAuth.currentUser.id
            );
            if (userEntry) {
                const userRank = this.currentLeaderboard.indexOf(userEntry) + 1;
                if (userRank <= 10) {
                    leaderboardHTML += `
                        <div style="text-align: center; margin-top: 16px; padding: 12px; background: rgba(251, 191, 36, 0.1); border-radius: 8px; border: 1px solid rgba(251, 191, 36, 0.3);">
                            <p style="color: var(--restaurant-yellow); font-weight: 600; margin: 0 0 8px 0;">
                                🏆 You're in the Top ${userRank}! Share your achievement.
                            </p>
                            <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
                                <button 
                                    onclick="generateAndShareLeaderboardTrophy(${userEntry.score}, '${userEntry.username}', ${userRank})"
                                    style="
                                        background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                                        border: none;
                                        color: white;
                                        padding: 8px 12px;
                                        border-radius: 6px;
                                        font-size: 0.85rem;
                                        cursor: pointer;
                                        transition: all 0.3s ease;
                                        font-weight: 600;
                                    "
                                    onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(59, 130, 246, 0.4)'"
                                    onmouseout="this.style.transform='translateY(0px)'; this.style.boxShadow='none'"
                                >
                                    🚀 Trophy + Tweet
                                </button>
                            </div>
                        </div>
                    `;
                }
            }
        }
        
        leaderboardHTML += '<button onclick="leaderboard.closeExpandedLeaderboard()" class="close-btn">Close</button>';
        
        expandedModal.innerHTML = leaderboardHTML;
        document.body.appendChild(expandedModal);
        
        // Start countdown timer
        this.startCountdownTimer();
        
        console.log('🔍 Expanded leaderboard modal created');
    }

    // Get emoji for rank
    getRankEmoji(rank) {
        switch(rank) {
            case 1: return '🥇';
            case 2: return '🥈';
            case 3: return '🥉';
            default: return '🏅';
        }
    }



    // Save user's best score locally
    saveBestScore() {
        if (twitterAuth.authenticated) {
            const key = `paco_best_score_${twitterAuth.currentUser.id}`;
            localStorage.setItem(key, this.userBestScore.toString());
        }
    }

    // Load user's best score locally
    loadBestScore() {
        if (twitterAuth.authenticated) {
            const key = `paco_best_score_${twitterAuth.currentUser.id}`;
            const stored = localStorage.getItem(key);
            this.userBestScore = stored ? parseInt(stored, 10) : 0;
        }
        return this.userBestScore;
    }

    // Set up real-time leaderboard updates
    setupRealTimeUpdates() {
        if (orderTracker && typeof orderTracker.subscribeToGameScores === 'function') {
            try {
                orderTracker.subscribeToGameScores((newScore) => {
                    console.log('🔴 LIVE: New score submitted!', newScore);
                    
                    // Add to current leaderboard if it's for today
                    if (newScore.game_date === this.getCurrentGameDate()) {
                        this.currentLeaderboard.push(newScore);
                        
                        // Re-sort leaderboard
                        this.currentLeaderboard.sort((a, b) => b.score - a.score);
                        
                        // Keep only top 50 for performance
                        this.currentLeaderboard = this.currentLeaderboard.slice(0, 50);
                        
                        // Update UI if leaderboard is currently shown
                        const overlay = document.getElementById('gameOverlay');
                        if (overlay && overlay.classList.contains('show')) {
                            this.showLeaderboard(); // Refresh display
                        }
                    }
                });
                
                console.log('✅ Real-time leaderboard updates enabled');
            } catch (error) {
                console.warn('⚠️ Real-time updates not available:', error);
            }
        }
    }

    // Initialize leaderboard system
    async initialize() {
        try {
            // Load user's best score
            this.loadBestScore();
            
            // Fetch today's leaderboard
            await this.fetchTodayLeaderboard();
            
            // Set up real-time updates
            this.setupRealTimeUpdates();
            
            console.log('✅ Leaderboard system ready');
            
        } catch (error) {
            console.error('Leaderboard initialization failed:', error);
        }
    }
}

// Global functions for UI interaction
function showLeaderboard() {
    if (leaderboard) {
        leaderboard.showLeaderboard();
    }
}

function hideLeaderboard() {
    if (leaderboard) {
        leaderboard.hideLeaderboard();
    }
}

// Share leaderboard achievement on Twitter
async function shareLeaderboardAchievement(score, rank) {
    try {
        if (!twitterAuth.authenticated) {
            alert('❌ Please connect Twitter first');
            return;
        }

        console.log('🐦 Sharing leaderboard achievement...');
        const success = await twitterAuth.shareAchievement(score, rank);
        
        if (success) {
            alert('🐦 Twitter share window opened!');
        } else {
            alert('❌ Failed to open Twitter share');
        }

    } catch (error) {
        console.error('Leaderboard Twitter sharing error:', error);
        alert('❌ Twitter sharing failed');
    }
}

// Generate trophy from leaderboard
async function generateLeaderboardTrophy(score, username, rank) {
    try {
        console.log('🏆 Generating leaderboard trophy for:', username, 'rank:', rank);
        
        const playerData = {
            score: score,
            username: username,
            rank: rank,
            gameMode: 'Daily Contest',
            date: new Date().toLocaleDateString()
        };
        
        if (typeof trophyGenerator === 'undefined') {
            console.error('Trophy generator not available');
            alert('❌ Trophy generator not available');
            return;
        }
        
        // Wait for trophy image to load if needed
        if (!trophyGenerator.isLoaded) {
            console.log('⏳ Loading trophy image...');
            await trophyGenerator.loadTrophyImage();
        }
        
        const result = await trophyGenerator.generateAndShare(playerData, {
            download: true,
            copyToClipboard: true
        });
        
        if (result.success) {
            let message = '🏆 Trophy image generated!';
            if (result.downloaded) message += '\n📥 Downloaded to your device';
            if (result.copied) message += '\n📋 Copied to clipboard';
            alert(message);
            console.log('✅ Leaderboard trophy generation successful');
        } else {
            alert('❌ Failed to generate trophy: ' + result.error);
            console.error('Trophy generation failed:', result.error);
        }
        
    } catch (error) {
        console.error('Leaderboard trophy generation error:', error);
        alert('❌ Trophy generation failed');
    }
}

// Generate trophy and share on Twitter from leaderboard
async function generateAndShareLeaderboardTrophy(score, username, rank) {
    try {
        if (!twitterAuth.authenticated) {
            alert('❌ Please connect Twitter first');
            return;
        }

        console.log('🏆 Generating trophy and preparing Twitter share...');
        
        // First generate the trophy image
        await generateLeaderboardTrophy(score, username, rank);

        // Then share achievement on Twitter
        console.log('🐦 Opening Twitter share for leaderboard trophy...');
        const shareSuccess = await twitterAuth.shareTrophyAchievement(score, rank);
        
        if (shareSuccess) {
            alert('🏆 Trophy generated! Twitter share opened!');
        } else {
            alert('🏆 Trophy generated! Twitter share failed.');
        }

    } catch (error) {
        console.error('Leaderboard trophy share error:', error);
        alert('❌ Trophy sharing failed');
    }
}

// Unified share and download function for leaderboard
async function leaderboardShareAndDownload(score, rank) {
    try {
        // Generate trophy image first
        if (window.trophyGenerator) {
            const playerData = {
                username: twitterAuth.currentUser?.username || 'Anonymous',
                score: score,
                rank: rank || null
            };

            const trophyCanvas = await window.trophyGenerator.generateTrophy(playerData);
            
            if (trophyCanvas) {
                // Download the image
                const link = document.createElement('a');
                link.download = `paco-champion-${score}-${Date.now()}.png`;
                link.href = trophyCanvas.toDataURL();
                link.click();
                
                console.log('🏆 Trophy image downloaded!');
            }
        }
        
        // Share on Twitter (no auth needed for web intent)
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

        tweetText += `\n\nCan you beat my score? 🤔\n\nPlay now: ${window.location.origin}`;

        const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
        
        const shareWindow = window.open(
            tweetUrl,
            'twitterShare',
            'width=550,height=420,scrollbars=yes,resizable=yes'
        );

        if (shareWindow) {
            console.log('🐦 Twitter share opened!');
        } else {
            console.log('⚠️ Please allow popups for sharing');
        }

    } catch (error) {
        console.error('Share and download error:', error);
        alert('❌ Share and download failed');
    }
}

// Export singleton instance
const leaderboard = new Leaderboard();

// Console commands removed for contest security

console.log('📊 Leaderboard module loaded');