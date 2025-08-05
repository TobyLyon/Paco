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
        this.currentTimeRemaining = null; // Store current countdown state
        
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
        
        // Restart countdown timer with new time (force restart since reset time changed)
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
        
        // Restart countdown timer with new time (force restart since reset time changed)
        this.startCountdownTimer();
        
        return this.dailyResetTime;
    }

    // Get formatted time until reset - CONTINUOUS COUNTDOWN
    getTimeUntilReset() {
        // If we already have a current time remaining (from restored state), use that
        if (this.currentTimeRemaining !== null && this.currentTimeRemaining > 0) {
            const diff = this.currentTimeRemaining;
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
        
        const now = Date.now();
        const resetTime = this.dailyResetTime.getTime();
        let diff = resetTime - now;
        
        // Check if contest ended
        if (diff <= 0) {
            console.log('⏰ Contest ended! Reset time:', new Date(resetTime).toLocaleString(), 'Current time:', new Date(now).toLocaleString());
            // Auto-reset to next day if contest ended
            this.dailyResetTime = this.getTodayResetTime();
            localStorage.removeItem('leaderboard_reset_time');
            localStorage.removeItem('timer_display_state');
            this.currentTimeRemaining = null;
            return 'Contest ended!';
        }
        
        // Initialize timer state if not already set
        if (this.currentTimeRemaining === null) {
            this.currentTimeRemaining = diff;
            
            // Store initial state
            localStorage.setItem('timer_display_state', JSON.stringify({
                remaining: diff,
                timestamp: now,
                resetTime: resetTime
            }));
            
            console.log('🆕 Initialized timer state:', Math.floor(diff / 1000), 'seconds remaining');
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
            console.log('⏱️ Clearing existing countdown timer...');
            clearInterval(this.countdownInterval);
        }
        
        console.log('⏱️ Starting countdown timer...');
        
        // Update every second - CONTINUOUS COUNTDOWN
        this.countdownInterval = setInterval(() => {
            // Find all timer elements (could be in leaderboard or game over screen)
            const timerElements = document.querySelectorAll('.reset-timer strong');
            
            if (timerElements.length > 0) {
                // Decrement the current time remaining for smooth countdown
                if (this.currentTimeRemaining !== null && this.currentTimeRemaining > 0) {
                    this.currentTimeRemaining -= 1000; // Subtract 1 second
                    
                    // Update localStorage with new state
                    localStorage.setItem('timer_display_state', JSON.stringify({
                        remaining: this.currentTimeRemaining,
                        timestamp: Date.now(),
                        resetTime: this.dailyResetTime.getTime()
                    }));
                    
                    // Format the display
                    const diff = this.currentTimeRemaining;
                    let timeRemaining;
                    
                    if (diff <= 0) {
                        timeRemaining = 'Contest ended!';
                        this.currentTimeRemaining = null;
                    } else {
                        const hours = Math.floor(diff / (1000 * 60 * 60));
                        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                        
                        if (hours > 0) {
                            timeRemaining = `${hours}h ${minutes}m`;
                        } else if (minutes > 0) {
                            timeRemaining = `${minutes}m ${seconds}s`;
                        } else {
                            timeRemaining = `${seconds}s`;
                        }
                    }
                    
                    // Update all timer elements
                    timerElements.forEach(timerElement => {
                    timerElement.textContent = timeRemaining;
                    
                    // Check if contest ended
                    if (timeRemaining === 'Contest ended!') {
                        timerElement.style.color = '#ef4444'; // Red color
                        timerElement.parentElement.innerHTML = '🏁 Contest ended! New contest starts soon...';
                        }
                    });
                    
                    // Stop timer if contest ended
                    if (timeRemaining === 'Contest ended!') {
                        clearInterval(this.countdownInterval);
                        this.countdownInterval = null;
                        console.log('⏰ Contest ended, timer stopped');
                    }
                } else {
                    // Fallback to recalculated time if state is lost
                    const timeRemaining = this.getTimeUntilReset();
                    timerElements.forEach(timerElement => {
                        timerElement.textContent = timeRemaining;
                    });
                }
            } else {
                // Debug: No timer elements found
                console.log('🔍 No .reset-timer strong elements found');
            }
        }, 1000);
        
        console.log('⏱️ Countdown timer started, updating every second');
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
                console.log('🎯 Submitting score data:', scoreData);
                console.log('🎯 User ID:', scoreData.user_id, 'Score:', scoreData.score, 'Date:', scoreData.game_date);
                
                const result = await orderTracker.recordGameScore(scoreData);
                console.log('🎯 Score submission result:', result);
                
                if (result.success) {
                    if (result.skipped) {
                        console.log('📊 Score not submitted - existing score is higher');
                        console.log('📊 Existing score data:', result.data);
                        console.log('📊 SKIPPED: New score', scoreData.score, 'vs existing', result.data.score);
                    } else {
                        console.log('✅ Score submitted successfully to database!');
                        console.log('✅ New score data:', result.data);
                        console.log('✅ DATABASE UPDATED: User', scoreData.username, 'score', scoreData.score);
                    }
                    
                    // Update local best score
                    this.userBestScore = Math.max(this.userBestScore, score);
                    this.saveBestScore();
                    
                    // Refresh leaderboard
                    console.log('🔄 Refreshing leaderboard after score submission...');
                    const oldCount = this.currentLeaderboard.length;
                    await this.fetchTodayLeaderboard();
                    const newCount = this.currentLeaderboard.length;
                    console.log('🔄 Leaderboard refreshed:', oldCount, '→', newCount, 'entries');
                    
                    if (!result.skipped && newCount === oldCount) {
                        console.error('🚨 DATABASE ISSUE: Score submitted but leaderboard count unchanged!');
                        console.error('🚨 This indicates the database write may have failed silently');
                    }
                    
                    return result;
                } else {
                    console.error('🚨 SCORE SUBMISSION FAILED:', result.error);
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
                <div class="reset-timer" style="text-align: center; margin: 4px 0; padding: 2px; font-size: 0.65rem; color: #94a3b8;">
                    Resets in: <strong>${timeUntilReset}</strong>
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
        
        // Start countdown timer updates (only if not already running)
        if (!this.countdownInterval) {
        this.startCountdownTimer();
        }
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
                        console.log('🔴 Processing real-time score update:', newScore);
                        
                        // Check if user already exists in leaderboard
                        const existingIndex = this.currentLeaderboard.findIndex(entry => 
                            entry.user_id === newScore.user_id
                        );
                        
                        if (existingIndex !== -1) {
                            // User exists - replace if new score is higher
                            const existingScore = this.currentLeaderboard[existingIndex];
                            if (newScore.score > existingScore.score) {
                                console.log(`🔄 Updating ${newScore.username}: ${existingScore.score} → ${newScore.score}`);
                                this.currentLeaderboard[existingIndex] = newScore;
                            } else {
                                console.log(`📊 Keeping existing higher score for ${newScore.username}: ${existingScore.score} vs ${newScore.score}`);
                                return; // Don't update UI if score wasn't improved
                            }
                        } else {
                            // New user - add to leaderboard
                            console.log(`🆕 Adding new user ${newScore.username} with score ${newScore.score}`);
                        this.currentLeaderboard.push(newScore);
                        }
                        
                        // Re-sort leaderboard
                        this.currentLeaderboard.sort((a, b) => b.score - a.score);
                        
                        // Keep only top 50 for performance
                        this.currentLeaderboard = this.currentLeaderboard.slice(0, 50);
                        
                        console.log('🔴 Updated leaderboard entries:', this.currentLeaderboard.length);
                        
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

// Initialize timer state from localStorage on page load
function initializeTimerState() {
    const stored = localStorage.getItem('timer_display_state');
    if (stored) {
        try {
            const state = JSON.parse(stored);
            const now = Date.now();
            const timeSinceStore = now - state.timestamp;
            const adjustedRemaining = Math.max(0, state.remaining - timeSinceStore);
            
            // Restore the timer state
            leaderboard.currentTimeRemaining = adjustedRemaining;
            console.log('🔄 Restored timer state:', Math.floor(adjustedRemaining / 1000), 'seconds remaining');
        } catch (e) {
            console.log('⚠️ Invalid stored timer state');
        }
    }
}

// Start the countdown timer when the module loads (only once)
document.addEventListener('DOMContentLoaded', () => {
    console.log('🏁 DOM loaded, initializing timer state...');
    initializeTimerState();
    leaderboard.startCountdownTimer();
});

// Fallback for cases where DOM is already loaded
if (document.readyState === 'loading') {
    // DOM is still loading, event listener will handle it
} else {
    // DOM is already loaded
    console.log('🏁 DOM already loaded, initializing timer state...');
    initializeTimerState();
    leaderboard.startCountdownTimer();
}

// Debug functions for countdown timer
window.debugCountdown = function() {
    console.log('🔍 COUNTDOWN DEBUG INFO:');
    console.log('Current time:', new Date().toLocaleString());
    console.log('Reset time:', leaderboard.dailyResetTime.toLocaleString());
    console.log('Time until reset:', leaderboard.getTimeUntilReset());
    console.log('LocalStorage data:', localStorage.getItem('leaderboard_reset_time'));
    console.log('Timer interval active:', !!leaderboard.countdownInterval);
    console.log('Timer elements found:', document.querySelectorAll('.reset-timer strong').length);
    console.log('Game overlay visible:', document.getElementById('gameOverlay')?.classList.contains('show'));
    
    // List all timer elements
    const timerElements = document.querySelectorAll('.reset-timer strong');
    timerElements.forEach((el, i) => {
        console.log(`Timer element ${i}:`, el.textContent, el);
    });
    
    return {
        now: new Date(),
        resetTime: leaderboard.dailyResetTime,
        timeUntilReset: leaderboard.getTimeUntilReset(),
        localStorage: localStorage.getItem('leaderboard_reset_time'),
        timerActive: !!leaderboard.countdownInterval,
        timerElementsCount: timerElements.length
    };
};

window.fixCountdown = function() {
    console.log('🔧 FIXING COUNTDOWN TIMER...');
    localStorage.removeItem('leaderboard_reset_time');
    leaderboard.dailyResetTime = leaderboard.getTodayResetTime();
    leaderboard.startCountdownTimer();
    console.log('✅ Countdown reset to:', leaderboard.dailyResetTime.toLocaleString());
    console.log('⏰ Time remaining:', leaderboard.getTimeUntilReset());
    return leaderboard.getTimeUntilReset();
};

window.testTimer = function() {
    console.log('🧪 TESTING TIMER UPDATE...');
    const timerElements = document.querySelectorAll('.reset-timer strong');
    console.log('Found', timerElements.length, 'timer elements');
    
    if (timerElements.length > 0) {
        const newTime = leaderboard.getTimeUntilReset();
        console.log('Updating to:', newTime);
        timerElements.forEach((el, i) => {
            console.log(`Updating element ${i} from "${el.textContent}" to "${newTime}"`);
            el.textContent = newTime;
        });
        return 'Timer elements updated';
    } else {
        return 'No timer elements found';
    }
};

window.checkTimerState = function() {
    console.log('📊 TIMER STATE CHECK:');
    console.log('Current time remaining:', leaderboard.currentTimeRemaining);
    console.log('Stored state:', localStorage.getItem('timer_display_state'));
    console.log('Timer interval running:', !!leaderboard.countdownInterval);
    
    const stored = localStorage.getItem('timer_display_state');
    if (stored) {
        const state = JSON.parse(stored);
        const now = Date.now();
        const timeSinceStore = now - state.timestamp;
        console.log('Time since last store:', Math.floor(timeSinceStore / 1000), 'seconds');
        console.log('Adjusted remaining:', Math.floor((state.remaining - timeSinceStore) / 1000), 'seconds');
    }
    
    return {
        currentTimeRemaining: leaderboard.currentTimeRemaining,
        timerRunning: !!leaderboard.countdownInterval,
        storedState: stored ? JSON.parse(stored) : null
    };
};

window.debugScoreSubmission = function() {
    console.log('🔍 SCORE SUBMISSION DEBUG:');
    console.log('Twitter authenticated:', twitterAuth.authenticated);
    console.log('Current user:', twitterAuth.currentUser);
    console.log('Current game date:', leaderboard.getCurrentGameDate());
    console.log('Leaderboard entries:', leaderboard.currentLeaderboard.length);
    console.log('User best score:', leaderboard.userBestScore);
    
    console.log('📊 FULL LEADERBOARD DATA:');
    leaderboard.currentLeaderboard.forEach((entry, index) => {
        console.log(`${index + 1}. ${entry.username} (${entry.user_id}): ${entry.score} - ${entry.game_date}`);
    });
    
    if (twitterAuth.currentUser) {
        const userEntry = leaderboard.currentLeaderboard.find(entry => 
            entry.user_id === twitterAuth.currentUser.id
        );
        console.log('User in leaderboard:', userEntry);
    }
    
    return {
        authenticated: twitterAuth.authenticated,
        currentUser: twitterAuth.currentUser,
        gameDate: leaderboard.getCurrentGameDate(),
        leaderboardCount: leaderboard.currentLeaderboard.length,
        userBestScore: leaderboard.userBestScore,
        fullLeaderboard: leaderboard.currentLeaderboard
    };
};

window.forceRefreshLeaderboard = async function() {
    console.log('🔄 FORCING LEADERBOARD REFRESH...');
    try {
        await leaderboard.fetchTodayLeaderboard();
        console.log('✅ Leaderboard refreshed, entries:', leaderboard.currentLeaderboard.length);
        
        // If leaderboard is currently shown, refresh the display
        const overlay = document.getElementById('gameOverlay');
        if (overlay && overlay.classList.contains('show')) {
            leaderboard.showLeaderboard();
            console.log('🔄 UI refreshed');
        }
        
        return leaderboard.currentLeaderboard;
    } catch (error) {
        console.error('❌ Refresh failed:', error);
        return null;
    }
};

window.checkRealtimeStatus = function() {
    console.log('📡 REAL-TIME STATUS CHECK:');
    console.log('Real-time channel exists:', !!leaderboard.realtimeChannel);
    console.log('OrderTracker available:', !!orderTracker);
    console.log('SubscribeToGameScores function:', typeof orderTracker?.subscribeToGameScores);
    
    if (orderTracker && orderTracker.realtimeChannel) {
        console.log('Supabase channel state:', orderTracker.realtimeChannel.state);
    }
    
    return {
        channelExists: !!leaderboard.realtimeChannel,
        orderTrackerAvailable: !!orderTracker,
        subscribeFunction: typeof orderTracker?.subscribeToGameScores,
        channelState: orderTracker?.realtimeChannel?.state
    };
};

window.compareLeaderboardData = async function() {
    console.log('🔍 COMPARING DATABASE VS MEMORY:');
    
    if (!orderTracker) {
        console.error('OrderTracker not available');
        return;
    }
    
    try {
        const dbResult = await orderTracker.getTodayLeaderboard();
        console.log('📊 Database leaderboard entries:', dbResult.data?.length || 0);
        console.log('🧠 Memory leaderboard entries:', leaderboard.currentLeaderboard.length);
        
        if (dbResult.success && dbResult.data) {
            console.log('📊 DATABASE TOP 10:');
            dbResult.data.slice(0, 10).forEach((entry, index) => {
                console.log(`${index + 1}. ${entry.username}: ${entry.score} (${entry.game_date})`);
            });
        }
        
        console.log('🧠 MEMORY TOP 10:');
        leaderboard.currentLeaderboard.slice(0, 10).forEach((entry, index) => {
            console.log(`${index + 1}. ${entry.username}: ${entry.score} (${entry.game_date})`);
        });
        
        return {
            databaseCount: dbResult.data?.length || 0,
            memoryCount: leaderboard.currentLeaderboard.length,
            databaseData: dbResult.data,
            memoryData: leaderboard.currentLeaderboard
        };
    } catch (error) {
        console.error('Error comparing data:', error);
        return null;
    }
};

// NEW: Test if we can actually write to Supabase
window.testSupabaseConnection = async function() {
    console.log('🔍 TESTING SUPABASE CONNECTION...');
    
    try {
        // Test basic connection by trying to read the table structure
        const { data: tableInfo, error: tableError } = await supabase
            .from('game_scores')
            .select('*')
            .limit(1);
            
        if (tableError) {
            console.error('❌ Cannot read from game_scores table:', tableError);
            return { connected: false, error: tableError };
        }
        
        console.log('✅ Can read from game_scores table');
        
        // Test basic insert permission (we'll rollback)
        const testRecord = {
            user_id: 'test_connection_' + Date.now(),
            username: 'connection_test',
            display_name: 'Connection Test',
            profile_image: '',
            score: 1,
            game_date: new Date().toISOString().split('T')[0],
            user_agent: navigator.userAgent
        };
        
        console.log('🧪 Testing insert permission...');
        const { data: insertData, error: insertError } = await supabase
            .from('game_scores')
            .insert([testRecord])
            .select();
            
        if (insertError) {
            console.error('❌ Cannot insert to game_scores:', insertError);
            return { 
                connected: true, 
                canRead: true, 
                canWrite: false, 
                error: insertError 
            };
        }
        
        console.log('✅ Successfully inserted test record:', insertData[0]?.id);
        
        // Clean up test record
        if (insertData && insertData[0]) {
            await supabase
                .from('game_scores')
                .delete()
                .eq('id', insertData[0].id);
            console.log('🧹 Cleaned up test record');
        }
        
        return { 
            connected: true, 
            canRead: true, 
            canWrite: true,
            tableExists: true
        };
        
    } catch (error) {
        console.error('❌ Supabase connection test failed:', error);
        return { connected: false, error: error.message };
    }
};

console.log('📊 Leaderboard module loaded');
console.log('🔧 Debug commands: debugCountdown(), fixCountdown(), testTimer(), checkTimerState()');
console.log('🔧 Score debug: debugScoreSubmission(), forceRefreshLeaderboard(), checkRealtimeStatus()');
console.log('🔧 Data compare: compareLeaderboardData(), testSupabaseConnection()');

// Console commands removed for contest security