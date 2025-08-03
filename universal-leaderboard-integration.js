// ===== UNIVERSAL LEADERBOARD & POINT SYSTEM INTEGRATION =====
// JavaScript module for integrating with the universal point tracking system
// Use this to replace/extend your existing leaderboard.js

class UniversalLeaderboard {
    constructor() {
        this.supabaseClient = null; // Initialize with your Supabase client
        this.currentUser = null;
        this.userStats = {};
        this.realtimeChannels = new Map();
        
        console.log('🌟 Universal Leaderboard System initialized');
    }

    // Initialize with Supabase client
    initialize(supabaseClient) {
        this.supabaseClient = supabaseClient;
        this.setupRealtimeSubscriptions();
        console.log('✅ Universal Leaderboard connected to Supabase');
    }

    // ===== USER MANAGEMENT =====

    // Create or update user profile (call on login)
    async createOrUpdateUser(twitterUserData) {
        try {
            const userData = {
                twitter_id: twitterUserData.id,
                username: twitterUserData.username,
                display_name: twitterUserData.name || twitterUserData.username,
                profile_image: twitterUserData.profile_image_url,
                last_active_at: new Date().toISOString(),
                registration_source: 'game' // or 'pfp' depending on entry point
            };

            const { data, error } = await this.supabaseClient
                .from('user_profiles')
                .upsert(userData, { 
                    onConflict: 'twitter_id',
                    ignoreDuplicates: false 
                })
                .select()
                .single();

            if (error) throw error;

            this.currentUser = data;
            await this.loadUserStats();
            
            console.log('👤 User profile updated:', data);
            return data;

        } catch (error) {
            console.error('❌ Error creating/updating user:', error);
            throw error;
        }
    }

    // Load comprehensive user stats
    async loadUserStats() {
        if (!this.currentUser) return null;

        try {
            const { data, error } = await this.supabaseClient
                .rpc('get_user_stats', { p_user_id: this.currentUser.id });

            if (error) throw error;

            this.userStats = data;
            console.log('📊 User stats loaded:', data);
            return data;

        } catch (error) {
            console.error('❌ Error loading user stats:', error);
            return null;
        }
    }

    // ===== POINT & XP SYSTEM =====

    // Award points for any activity across the site
    async awardActivity(activityTypeId, contextData = {}) {
        if (!this.currentUser) {
            console.warn('⚠️ Cannot award activity - user not logged in');
            return null;
        }

        try {
            const { data, error } = await this.supabaseClient
                .rpc('award_user_activity', {
                    p_user_id: this.currentUser.id,
                    p_activity_type_id: activityTypeId,
                    p_context_data: contextData
                });

            if (error) throw error;

            const result = data[0];
            
            // Update local user stats
            if (this.userStats.user) {
                this.userStats.user.total_points += result.points_awarded;
                this.userStats.user.total_xp += result.xp_awarded;
            }

            // Show level up notification if applicable
            if (result.level_up) {
                this.showLevelUpNotification();
            }

            // Show points notification
            if (result.points_awarded > 0) {
                this.showPointsNotification(result.points_awarded, result.xp_awarded);
            }

            console.log(`⭐ Activity awarded: ${activityTypeId}`, result);
            return result;

        } catch (error) {
            console.error('❌ Error awarding activity:', error);
            return null;
        }
    }

    // ===== GAME INTEGRATION =====

    // Submit game score (enhanced version of existing method)
    async submitGameScore(score, gameStats = {}) {
        try {
            // First, award the base game activity
            await this.awardActivity('game_score_submit', { 
                score: score,
                ...gameStats 
            });

            // Check for high score achievement
            if (this.userStats?.user && score > (this.userStats.best_game_score || 0)) {
                await this.awardActivity('game_high_score', { 
                    new_score: score,
                    previous_best: this.userStats.best_game_score || 0
                });
            }

            // Award milestone achievements
            if (score >= 1000) {
                await this.awardActivity('score_master', { score: score });
            }

            // Award evil flocko defeats
            if (gameStats.evil_flockos_defeated > 0) {
                for (let i = 0; i < gameStats.evil_flockos_defeated; i++) {
                    await this.awardActivity('game_evil_defeat');
                }
            }

            // Award perfect bounces
            if (gameStats.perfect_bounces > 0) {
                for (let i = 0; i < gameStats.perfect_bounces; i++) {
                    await this.awardActivity('game_perfect_bounce');
                }
            }

            // Insert into existing game_scores table for compatibility
            const { data: gameScore, error: gameError } = await this.supabaseClient
                .from('game_scores')
                .insert({
                    user_id: this.currentUser.twitter_id,
                    username: this.currentUser.username,
                    display_name: this.currentUser.display_name,
                    profile_image: this.currentUser.profile_image,
                    score: score,
                    user_profile_id: this.currentUser.id,
                    user_agent: navigator.userAgent
                })
                .select()
                .single();

            if (gameError) throw gameError;

            console.log('🎮 Game score submitted with universal tracking:', { score, gameStats });
            return gameScore;

        } catch (error) {
            console.error('❌ Error submitting game score:', error);
            throw error;
        }
    }

    // ===== PFP INTEGRATION =====

    // Track PFP order creation
    async trackPFPOrder(orderData) {
        try {
            // Award PFP creation activity
            const isFirstOrder = (this.userStats?.user?.total_orders || 0) === 0;
            
            if (isFirstOrder) {
                await this.awardActivity('pfp_first_order', orderData);
            } else {
                await this.awardActivity('pfp_order_create', orderData);
            }

            // Check for unique trait combinations
            if (this.isRareTraitCombo(orderData)) {
                await this.awardActivity('pfp_trait_combo', orderData);
            }

            // Update existing paco_orders table
            if (this.currentUser) {
                const { error } = await this.supabaseClient
                    .from('paco_orders')
                    .update({ 
                        user_profile_id: this.currentUser.id 
                    })
                    .eq('id', orderData.order_id);

                if (error) console.warn('⚠️ Could not link order to user profile:', error);
            }

            console.log('🎨 PFP order tracked with universal system:', orderData);

        } catch (error) {
            console.error('❌ Error tracking PFP order:', error);
        }
    }

    // Check if trait combination is rare (implement your logic)
    isRareTraitCombo(orderData) {
        // Example: Crown + Taco combination is rare
        return orderData.hat_name === 'Royal Roast' && orderData.item_name === 'Money Munchies';
    }

    // ===== LEADERBOARD VIEWS =====

    // Get universal leaderboard (replaces existing daily leaderboard)
    async getLeaderboard(type = 'points', period = 'daily', limit = 50) {
        try {
            const { data, error } = await this.supabaseClient
                .rpc('get_universal_leaderboard', {
                    p_leaderboard_type: type,
                    p_time_period: period,
                    p_limit: limit
                });

            if (error) throw error;

            console.log(`🏆 ${type} leaderboard (${period}) loaded:`, data.length, 'entries');
            return data;

        } catch (error) {
            console.error('❌ Error loading leaderboard:', error);
            return [];
        }
    }

    // Get user's current rank
    async getUserRank(type = 'points', period = 'daily') {
        if (!this.currentUser) return null;

        try {
            const leaderboard = await this.getLeaderboard(type, period, 1000);
            const userEntry = leaderboard.find(entry => entry.user_id === this.currentUser.id);
            
            return userEntry ? userEntry.rank : null;

        } catch (error) {
            console.error('❌ Error getting user rank:', error);
            return null;
        }
    }

    // ===== ACHIEVEMENT SYSTEM =====

    // Get all available achievements
    async getAchievements() {
        try {
            const { data, error } = await this.supabaseClient
                .from('achievements')
                .select('*')
                .eq('is_active', true)
                .order('difficulty', { ascending: true });

            if (error) throw error;
            return data;

        } catch (error) {
            console.error('❌ Error loading achievements:', error);
            return [];
        }
    }

    // Get user's achievement progress
    async getUserAchievements() {
        if (!this.currentUser) return [];

        try {
            const { data, error } = await this.supabaseClient
                .from('user_achievements')
                .select(`
                    *,
                    achievements (*)
                `)
                .eq('user_id', this.currentUser.id);

            if (error) throw error;
            return data;

        } catch (error) {
            console.error('❌ Error loading user achievements:', error);
            return [];
        }
    }

    // ===== REAL-TIME UPDATES =====

    // Setup real-time subscriptions for live updates
    setupRealtimeSubscriptions() {
        if (!this.supabaseClient) return;

        // Subscribe to leaderboard updates
        const leaderboardChannel = this.supabaseClient
            .channel('leaderboard-updates')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'daily_leaderboards'
            }, (payload) => {
                this.handleLeaderboardUpdate(payload);
            })
            .subscribe();

        this.realtimeChannels.set('leaderboard', leaderboardChannel);

        // Subscribe to user achievements
        if (this.currentUser) {
            const achievementChannel = this.supabaseClient
                .channel('user-achievements')
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'user_achievements',
                    filter: `user_id=eq.${this.currentUser.id}`
                }, (payload) => {
                    this.handleAchievementUnlock(payload);
                })
                .subscribe();

            this.realtimeChannels.set('achievements', achievementChannel);
        }

        console.log('🔴 Real-time subscriptions active');
    }

    // Handle real-time leaderboard updates
    handleLeaderboardUpdate(payload) {
        console.log('📊 Leaderboard updated:', payload);
        // Trigger UI refresh for leaderboard components
        this.dispatchEvent('leaderboardUpdate', payload);
    }

    // Handle achievement unlocks
    handleAchievementUnlock(payload) {
        console.log('🏆 Achievement unlocked!', payload);
        this.showAchievementNotification(payload.new);
    }

    // ===== UI NOTIFICATIONS =====

    // Show points gained notification
    showPointsNotification(points, xp) {
        if (typeof showNotification === 'function') {
            showNotification(`⭐ +${points} points, +${xp} XP!`);
        }
        console.log(`⭐ Points gained: +${points} points, +${xp} XP`);
    }

    // Show level up notification
    showLevelUpNotification() {
        if (typeof showNotification === 'function') {
            showNotification('🎉 Level Up! You reached a new level!');
        }
        console.log('🎉 LEVEL UP!');
    }

    // Show achievement unlock notification
    showAchievementNotification(achievement) {
        if (typeof showNotification === 'function') {
            showNotification(`🏆 Achievement Unlocked: ${achievement.name}!`);
        }
        console.log('🏆 Achievement unlocked:', achievement);
    }

    // ===== EVENT SYSTEM =====

    // Dispatch custom events for UI updates
    dispatchEvent(eventName, data) {
        const event = new CustomEvent(`universal-leaderboard:${eventName}`, {
            detail: data
        });
        document.dispatchEvent(event);
    }

    // ===== UTILITY METHODS =====

    // Check if user is authenticated
    isAuthenticated() {
        return !!this.currentUser;
    }

    // Get current user info
    getCurrentUser() {
        return this.currentUser;
    }

    // Get current user stats
    getUserStats() {
        return this.userStats;
    }

    // Cleanup subscriptions
    cleanup() {
        this.realtimeChannels.forEach(channel => {
            this.supabaseClient.removeChannel(channel);
        });
        this.realtimeChannels.clear();
        console.log('🧹 Universal Leaderboard cleaned up');
    }
}

// ===== INTEGRATION EXAMPLES =====

// Example: Integrating with your existing game.js
/*
// In your game.js file, replace the existing leaderboard calls:

// OLD way:
// await leaderboard.submitScore(this.score);

// NEW way with universal system:
const gameStats = {
    evil_flockos_defeated: this.enemiesDefeated || 0,
    perfect_bounces: this.perfectBounces || 0,
    power_ups_collected: this.powerUpsCollected || 0
};

await universalLeaderboard.submitGameScore(this.score, gameStats);
*/

// Example: Integrating with your PFP system
/*
// In your script.js where PFP orders are created:

// After creating an order:
await universalLeaderboard.trackPFPOrder({
    order_id: newOrderId,
    hat_name: selectedHat.name,
    item_name: selectedItem.name,
    total_price: totalPrice,
    traits_count: uniqueTraitsUsed
});
*/

// Example: Daily login tracking
/*
// Call this when user logs in or visits the site:
await universalLeaderboard.awardActivity('game_daily_play');
*/

// Example: Setting up event listeners for UI updates
/*
document.addEventListener('universal-leaderboard:leaderboardUpdate', (event) => {
    // Refresh leaderboard display
    refreshLeaderboardUI();
});

document.addEventListener('universal-leaderboard:achievementUnlock', (event) => {
    // Show achievement popup
    showAchievementPopup(event.detail);
});
*/

// Export singleton instance
const universalLeaderboard = new UniversalLeaderboard();

// Make it globally available (if needed)
if (typeof window !== 'undefined') {
    window.universalLeaderboard = universalLeaderboard;
}

console.log('🌟 Universal Leaderboard Integration loaded');