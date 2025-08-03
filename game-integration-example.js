// ===== EXAMPLE: GAME.JS INTEGRATION WITH UNIVERSAL LEADERBOARD =====
// This shows exactly how to modify your existing game.js to use the new universal system

// ADD THESE PROPERTIES TO YOUR GAME CLASS CONSTRUCTOR
class Game {
    constructor() {
        // ... existing constructor code ...
        
        // ADD: Universal leaderboard tracking
        this.universalLeaderboard = window.universalLeaderboard;
        this.gameSessionStats = {
            evil_flockos_defeated: 0,
            perfect_bounces: 0,
            power_ups_collected: 0,
            platforms_jumped: 0,
            session_start: Date.now()
        };
        
        console.log('🎮 Game initialized with universal tracking');
    }

    // MODIFY: Your existing resetGame method
    resetGame() {
        // ... existing reset code ...
        
        // ADD: Reset session tracking
        this.gameSessionStats = {
            evil_flockos_defeated: 0,
            perfect_bounces: 0,
            power_ups_collected: 0,
            platforms_jumped: 0,
            session_start: Date.now()
        };
    }

    // MODIFY: Your existing platform collision detection
    checkCollisions() {
        // ... existing collision code ...
        
        for (let i = this.platforms.length - 1; i >= 0; i--) {
            const platform = this.platforms[i];
            
            if (gamePhysics.checkPlatformCollision(this.player, platform)) {
                // ADD: Track platform jumps
                this.gameSessionStats.platforms_jumped++;
                
                // Special handling for evil platforms
                if (platform.type === 'evil') {
                    if (this.player.isFlying && this.activePowerups.has('corn')) {
                        // Player defeated evil flocko!
                        this.defeatEvilFlocko(platform, i);
                        
                        // ADD: Track evil flocko defeat
                        this.gameSessionStats.evil_flockos_defeated++;
                        
                        // Award points immediately via universal system
                        if (this.universalLeaderboard?.isAuthenticated()) {
                            this.universalLeaderboard.awardActivity('game_evil_defeat', {
                                platform_type: 'evil',
                                power_up_used: 'corn',
                                score_when_defeated: this.score
                            });
                        }
                        
                        continue;
                    } else {
                        // Player dies to evil flocko
                        this.handleEvilFlockoDamage(platform);
                        return;
                    }
                }
                
                // ... rest of existing collision handling ...
                break;
            }
        }
    }

    // MODIFY: Your existing perfect timing bounce method
    activateTimingBounce() {
        const currentTime = Date.now();
        
        // Prevent spam (cooldown of 100ms)
        if (currentTime - this.player.lastSpacebarTime < 100) return;
        
        this.player.lastSpacebarTime = currentTime;
        
        // Apply extra bounce force (subtle 1.15x boost)
        const extraJumpForce = gameAssets.config.player.jumpForce * 1.15;
        this.player.velocityY = -extraJumpForce;
        
        // Award bonus points
        const bonusPoints = 25;
        this.score += bonusPoints;
        this.updateScoreDisplay();
        
        // ADD: Track perfect bounce
        this.gameSessionStats.perfect_bounces++;
        
        // Award via universal system
        if (this.universalLeaderboard?.isAuthenticated()) {
            this.universalLeaderboard.awardActivity('game_perfect_bounce', {
                timing_bonus: bonusPoints,
                current_score: this.score
            });
        }
        
        // Play special sound
        this.playSound('perfectBounce');
        
        // Create special visual effect
        this.createPerfectBounceEffect();
        
        console.log(`⚡ Timing boost +${bonusPoints}`);
    }

    // MODIFY: Your existing power-up collection
    collectPowerup(powerup) {
        if (powerup.collected) return;
        
        powerup.collected = true;
        
        // ... existing power-up logic ...
        
        // ADD: Track power-up collection
        this.gameSessionStats.power_ups_collected++;
        
        // Award universal points for power-up collection
        if (this.universalLeaderboard?.isAuthenticated()) {
            this.universalLeaderboard.awardActivity('game_power_up_collect', {
                power_up_type: powerup.type,
                current_score: this.score
            });
        }
        
        console.log(`⚡ Power-up collected: ${powerup.type}`);
    }

    // MODIFY: Your existing startGame method  
    startGame() {
        // ... existing start code ...
        
        // ADD: Award daily play bonus (once per session)
        if (this.universalLeaderboard?.isAuthenticated() && !this.dailyPlayAwarded) {
            this.universalLeaderboard.awardActivity('game_daily_play', {
                session_start: new Date().toISOString()
            });
            this.dailyPlayAwarded = true;
        }
    }

    // MODIFY: Your existing endGame method
    async endGame() {
        this.gameState = 'gameOver';
        
        // Calculate session duration
        const sessionDuration = Math.floor((Date.now() - this.gameSessionStats.session_start) / 1000);
        
        // Prepare comprehensive game stats
        const detailedGameStats = {
            ...this.gameSessionStats,
            session_duration: sessionDuration,
            final_score: this.score,
            platforms_generated: this.platforms.length,
            tacos_collected: this.tacosCollected || 0,
            power_ups_used: this.powerUpsUsed || 0
        };
        
        console.log('🎮 Game session ended:', detailedGameStats);
        
        // Submit score via universal system
        if (this.universalLeaderboard?.isAuthenticated()) {
            try {
                await this.universalLeaderboard.submitGameScore(this.score, detailedGameStats);
                
                // Check for score milestones
                await this.checkScoreMilestones(this.score);
                
            } catch (error) {
                console.error('❌ Error submitting universal score:', error);
                
                // Fallback to old system
                if (typeof leaderboard !== 'undefined') {
                    await leaderboard.submitScore(this.score);
                }
            }
        } else {
            // User not authenticated - show auth prompt
            this.showAuthenticationPrompt();
        }
        
        // Show game over screen
        this.showGameOverScreen();
    }

    // ADD: Check for score milestone achievements
    async checkScoreMilestones(score) {
        if (!this.universalLeaderboard?.isAuthenticated()) return;
        
        try {
            // Check various score milestones
            if (score >= 1000 && !this.milestoneReached1000) {
                await this.universalLeaderboard.awardActivity('score_milestone_1000', { score });
                this.milestoneReached1000 = true;
            }
            
            if (score >= 2500 && !this.milestoneReached2500) {
                await this.universalLeaderboard.awardActivity('score_milestone_2500', { score });
                this.milestoneReached2500 = true;
            }
            
            if (score >= 5000 && !this.milestoneReached5000) {
                await this.universalLeaderboard.awardActivity('score_milestone_5000', { score });
                this.milestoneReached5000 = true;
            }
            
            // Check for personal best
            const userStats = this.universalLeaderboard.getUserStats();
            if (userStats?.user && score > (userStats.best_game_score || 0)) {
                await this.universalLeaderboard.awardActivity('game_high_score', {
                    new_score: score,
                    previous_best: userStats.best_game_score || 0
                });
            }
            
        } catch (error) {
            console.error('❌ Error checking milestones:', error);
        }
    }

    // ADD: Show authentication prompt for unauthenticated users
    showAuthenticationPrompt() {
        this.showOverlay(`
            <div style="max-width: 300px; margin: 0 auto; text-align: center; padding: 20px;">
                <h3>🏆 Join the Leaderboard!</h3>
                <p>Connect with Twitter to:</p>
                <ul style="text-align: left; margin: 10px 0;">
                    <li>🎯 Save your high scores</li>
                    <li>⭐ Earn points and XP</li>
                    <li>🏆 Unlock achievements</li>
                    <li>👥 Compete with friends</li>
                    <li>🎨 Access exclusive PFPs</li>
                </ul>
                <button onclick="twitterAuth.initiateAuth(); game.hideOverlay();" 
                        class="game-btn primary">
                    🐦 Connect Twitter
                </button>
                <button onclick="game.hideOverlay();" class="game-btn secondary">
                    Continue Without Saving
                </button>
            </div>
        `);
    }

    // MODIFY: Your existing showGameOverScreen method
    async showGameOverScreen() {
        // Get current user stats if authenticated
        let userStats = null;
        let userRank = null;
        
        if (this.universalLeaderboard?.isAuthenticated()) {
            try {
                userStats = this.universalLeaderboard.getUserStats();
                userRank = await this.universalLeaderboard.getUserRank('game', 'daily');
            } catch (error) {
                console.error('❌ Error loading user stats:', error);
            }
        }
        
        // Enhanced game over screen with universal stats
        this.showOverlay(`
            <div style="max-width: 400px; margin: 0 auto; text-align: center; padding: 20px;">
                <h2 style="color: var(--restaurant-orange); margin-bottom: 20px;">
                    🍗 Game Over!
                </h2>
                
                <!-- Score Display -->
                <div style="background: rgba(0,0,0,0.5); padding: 15px; border-radius: 10px; margin-bottom: 20px;">
                    <h3 style="color: #fbbf24; margin: 0;">Final Score: ${this.score.toLocaleString()}</h3>
                    ${userRank ? `<p style="color: #10b981; margin: 5px 0;">Daily Rank: #${userRank}</p>` : ''}
                </div>
                
                <!-- Session Stats -->
                <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 8px; margin-bottom: 15px;">
                    <h4 style="margin-top: 0;">Session Stats:</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.9rem;">
                        <div>👹 Evil Defeated: ${this.gameSessionStats.evil_flockos_defeated}</div>
                        <div>⚡ Perfect Bounces: ${this.gameSessionStats.perfect_bounces}</div>
                        <div>🎁 Power-ups: ${this.gameSessionStats.power_ups_collected}</div>
                        <div>🏃 Platforms: ${this.gameSessionStats.platforms_jumped}</div>
                    </div>
                </div>
                
                <!-- User Progress (if authenticated) -->
                ${userStats ? `
                    <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 8px; margin-bottom: 15px;">
                        <h4 style="margin-top: 0;">Your Progress:</h4>
                        <div style="font-size: 0.9rem;">
                            <div style="color: ${userStats.user.level.color_hex};">
                                ${userStats.user.level.icon_emoji} ${userStats.user.level.name}
                            </div>
                            <div>⭐ ${userStats.user.total_points.toLocaleString()} Total Points</div>
                            <div>📈 ${userStats.user.total_xp.toLocaleString()} Total XP</div>
                            <div>🎯 +${userStats.daily_stats.today_points} Points Today</div>
                        </div>
                    </div>
                ` : ''}
                
                <!-- Action Buttons -->
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button onclick="game.startGame(); game.hideOverlay();" class="game-btn primary">
                        🔄 Play Again
                    </button>
                    <button onclick="showLeaderboard(); game.hideOverlay();" class="game-btn secondary">
                        🏆 Leaderboard
                    </button>
                    ${!this.universalLeaderboard?.isAuthenticated() ? `
                        <button onclick="twitterAuth.initiateAuth();" class="game-btn secondary">
                            🐦 Join Leaderboard
                        </button>
                    ` : ''}
                </div>
            </div>
        `);
    }

    // ADD: Initialize universal system when user authenticates
    async initializeUniversalSystem() {
        if (this.universalLeaderboard && window.twitterAuth?.authenticated) {
            try {
                const user = window.twitterAuth.currentUser;
                await this.universalLeaderboard.createOrUpdateUser(user);
                console.log('✅ Universal leaderboard system connected for user:', user.username);
                
                // Load user stats and update UI
                await this.updateUserStatsDisplay();
                
            } catch (error) {
                console.error('❌ Error initializing universal system:', error);
            }
        }
    }

    // ADD: Update user stats display in UI
    async updateUserStatsDisplay() {
        if (!this.universalLeaderboard?.isAuthenticated()) return;
        
        try {
            const stats = this.universalLeaderboard.getUserStats();
            
            if (stats?.user) {
                // Update points display in UI (if you have these elements)
                const pointsElement = document.getElementById('user-points');
                const levelElement = document.getElementById('user-level');
                const xpElement = document.getElementById('user-xp');
                
                if (pointsElement) pointsElement.textContent = stats.user.total_points.toLocaleString();
                if (levelElement) {
                    levelElement.textContent = `${stats.user.level.icon_emoji} ${stats.user.level.name}`;
                    levelElement.style.color = stats.user.level.color_hex;
                }
                if (xpElement) xpElement.textContent = stats.user.total_xp.toLocaleString();
            }
            
        } catch (error) {
            console.error('❌ Error updating user stats display:', error);
        }
    }
}

// ADD: Event listeners for universal system integration
document.addEventListener('DOMContentLoaded', () => {
    // Listen for authentication events
    document.addEventListener('twitter-auth:success', async (event) => {
        console.log('🐦 Twitter auth successful, initializing universal system...');
        if (window.game) {
            await window.game.initializeUniversalSystem();
        }
    });
    
    // Listen for universal leaderboard events
    document.addEventListener('universal-leaderboard:achievementUnlock', (event) => {
        const achievement = event.detail;
        
        // Show achievement notification in game
        if (window.game && typeof window.game.showNotification === 'function') {
            window.game.showNotification(`🏆 Achievement Unlocked: ${achievement.name}!`);
        }
        
        console.log('🏆 Achievement unlocked in game context:', achievement);
    });
    
    document.addEventListener('universal-leaderboard:leaderboardUpdate', (event) => {
        console.log('📊 Leaderboard updated, refreshing displays...');
        
        // Refresh any leaderboard displays in your UI
        if (typeof refreshLeaderboardDisplay === 'function') {
            refreshLeaderboardDisplay();
        }
    });
});

// ADD: Helper function to show rich notifications with universal system context
function showRichNotification(message, type = 'info', duration = 3000) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'achievement' ? 'linear-gradient(135deg, #fbbf24, #f59e0b)' : 
                     type === 'points' ? 'linear-gradient(135deg, #10b981, #059669)' :
                     'linear-gradient(135deg, #3b82f6, #2563eb)'};
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        z-index: 10000;
        font-weight: 600;
        font-family: var(--font-display);
        animation: slideInRight 0.3s ease-out;
        max-width: 300px;
    `;
    
    notification.innerHTML = message;
    document.body.appendChild(notification);
    
    // Auto-remove after duration
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, duration);
}

// ADD: CSS animations for notifications (add to your styles.css)
const notificationStyles = `
@keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}

@keyframes slideOutRight {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
}
`;

// Inject styles
const styleSheet = document.createElement('style');
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);

console.log('🎮 Universal Game Integration Example Loaded');

/* 
SUMMARY OF CHANGES NEEDED IN YOUR ACTUAL GAME.JS:

1. Add gameSessionStats tracking to constructor
2. Update resetGame() to reset session stats  
3. Modify checkCollisions() to track platform jumps and evil flocko defeats
4. Update activateTimingBounce() to award universal points
5. Modify collectPowerup() to track power-up collection
6. Update startGame() to award daily play bonus
7. Enhance endGame() with universal score submission
8. Add checkScoreMilestones() for achievement tracking
9. Add showAuthenticationPrompt() for unauthenticated users
10. Enhance showGameOverScreen() with universal stats
11. Add initializeUniversalSystem() for user setup
12. Add updateUserStatsDisplay() for UI updates
13. Add event listeners for auth and leaderboard events

The universal system is designed to work alongside your existing code,
so you can implement these changes gradually while maintaining compatibility.
*/