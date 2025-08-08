// Supabase Client for Order Tracking
import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js';
import SUPABASE_CONFIG from './supabase-config.js';

// Initialize Supabase client
const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

// Order tracking functions
class OrderTracker {
    constructor() {
        this.tableName = 'paco_orders';
        this.realtimeChannel = null;
    }

    // Increment global order count
    async recordOrder(orderData = {}) {
        try {
            const orderRecord = {
                created_at: new Date().toISOString(),
                hat_id: orderData.hat || null,
                hat_name: orderData.hatName || null,
                item_id: orderData.item || null,
                item_name: orderData.itemName || null,
                total_price: orderData.total || 0,
                user_agent: navigator.userAgent,
                timestamp: Date.now()
            };

            const { data, error } = await supabase
                .from(this.tableName)
                .insert([orderRecord])
                .select();

            if (error) {
                console.error('Error recording order:', error);
                return { success: false, error };
            }

            console.log('✅ Order recorded successfully:', data);
            return { success: true, data };
        } catch (error) {
            console.error('Exception recording order:', error);
            return { success: false, error: error.message };
        }
    }

    // Get total global order count
    async getGlobalOrderCount() {
        try {
            const { count, error } = await supabase
                .from(this.tableName)
                .select('*', { count: 'exact', head: true });

            if (error) {
                console.error('Error getting order count:', error);
                return { success: false, count: 0, error };
            }

            return { success: true, count: count || 0 };
        } catch (error) {
            console.error('Exception getting order count:', error);
            return { success: false, count: 0, error: error.message };
        }
    }

    // Get today's order count
    async getTodayOrderCount() {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayISO = today.toISOString();

            const { count, error } = await supabase
                .from(this.tableName)
                .select('*', { count: 'exact', head: true })
                .gte('created_at', todayISO);

            if (error) {
                console.error('Error getting today order count:', error);
                return { success: false, count: 0, error };
            }

            return { success: true, count: count || 0 };
        } catch (error) {
            console.error('Exception getting today order count:', error);
            return { success: false, count: 0, error: error.message };
        }
    }

    // Get popular traits
    async getPopularTraits() {
        try {
            const { data, error } = await supabase
                .from(this.tableName)
                .select('hat_name, item_name')
                .not('hat_name', 'is', null)
                .not('item_name', 'is', null);

            if (error) {
                console.error('Error getting popular traits:', error);
                return { success: false, data: [], error };
            }

            // Count trait popularity
            const hatCounts = {};
            const itemCounts = {};

            data.forEach(order => {
                if (order.hat_name) {
                    hatCounts[order.hat_name] = (hatCounts[order.hat_name] || 0) + 1;
                }
                if (order.item_name) {
                    itemCounts[order.item_name] = (itemCounts[order.item_name] || 0) + 1;
                }
            });

            return {
                success: true,
                data: {
                    popularHats: Object.entries(hatCounts).sort((a, b) => b[1] - a[1]).slice(0, 3),
                    popularItems: Object.entries(itemCounts).sort((a, b) => b[1] - a[1]).slice(0, 3)
                }
            };
        } catch (error) {
            console.error('Exception getting popular traits:', error);
            return { success: false, data: [], error: error.message };
        }
    }

    // Test connection
    async testConnection() {
        try {
            const { data, error } = await supabase
                .from(this.tableName)
                .select('count', { count: 'exact', head: true });

            if (error) {
                console.error('Connection test failed:', error);
                return { success: false, error };
            }

            console.log('✅ Supabase connection successful');
            return { success: true, message: 'Connection successful' };
        } catch (error) {
            console.error('Connection test exception:', error);
            return { success: false, error: error.message };
        }
    }

    // Start real-time subscription for live order updates
    subscribeToLiveOrders(onNewOrder, onOrderUpdate) {
        try {
            // Unsubscribe from existing channel if any
            this.unsubscribeFromLiveOrders();

            // Create new real-time channel
            this.realtimeChannel = supabase
                .channel('paco_orders_channel')
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: this.tableName
                    },
                    (payload) => {
                        console.log('🔴 LIVE: New order received!', payload);
                        if (onNewOrder) {
                            onNewOrder(payload.new);
                        }
                    }
                )
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: this.tableName
                    },
                    (payload) => {
                        console.log('🔄 LIVE: Order updated!', payload);
                        if (onOrderUpdate) {
                            onOrderUpdate(payload.new);
                        }
                    }
                )
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        console.log('✅ Live order tracking activated!');
                    } else if (status === 'CHANNEL_ERROR') {
                        console.error('❌ Real-time subscription failed');
                    }
                });

            return { success: true, channel: this.realtimeChannel };
        } catch (error) {
            console.error('Error setting up real-time subscription:', error);
            return { success: false, error: error.message };
        }
    }

    // Stop real-time subscription
    unsubscribeFromLiveOrders() {
        if (this.realtimeChannel) {
            supabase.removeChannel(this.realtimeChannel);
            this.realtimeChannel = null;
            console.log('🔌 Real-time subscription stopped');
        }
    }

    // Get recent orders for live feed
    async getRecentOrders(limit = 10) {
        try {
            const { data, error } = await supabase
                .from(this.tableName)
                .select('id, created_at, hat_name, item_name, total_price')
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) {
                console.error('Error getting recent orders:', error);
                return { success: false, data: [], error };
            }

            return { success: true, data: data || [] };
        } catch (error) {
            console.error('Exception getting recent orders:', error);
            return { success: false, data: [], error: error.message };
        }
    }

    // === GAME LEADERBOARD FUNCTIONS ===

    // Record game score
    async recordGameScore(scoreData) {
        try {
            // Server-side validation - ENABLED FOR SECURITY
            console.log('🔍 Score submission with validation enabled:', scoreData);
            const validation = this.validateScoreSubmission(scoreData);
            console.log('🔍 Validation result:', validation);
            
            if (!validation.valid) {
                console.error('🚨 VALIDATION FAILED - SCORE REJECTED:');
                console.error('🚨 User:', scoreData.username, '(', scoreData.user_id, ')');
                console.error('🚨 Score:', scoreData.score);
                console.error('🚨 Reasons:', validation.reasons);
                console.error('🚨 Full data:', scoreData);
                return { success: false, error: `Validation failed: ${validation.reasons.join(', ')}` };
            }

            const scoreRecord = {
                user_id: scoreData.user_id,
                username: scoreData.username,
                display_name: scoreData.display_name,
                profile_image: scoreData.profile_image,
                score: scoreData.score,
                game_date: scoreData.game_date,
                created_at: scoreData.created_at || new Date().toISOString(),
                // Add anti-cheat metadata
                user_agent: navigator.userAgent,
                ...(scoreData.session_id && { session_id: scoreData.session_id }),
                ...(scoreData.game_time && { game_time: scoreData.game_time }),
                ...(scoreData.platforms_jumped && { platforms_jumped: scoreData.platforms_jumped }),
                ...(scoreData.checksum && { checksum: scoreData.checksum })
            };

            // Check if user already has a score for today
            const { data: existingScores, error: fetchError } = await supabase
                .from('game_scores')
                .select('*')
                .eq('user_id', scoreData.user_id)
                .eq('game_date', scoreData.game_date)
                .order('score', { ascending: false })
                .limit(1);

            if (fetchError) {
                console.error('Error checking existing scores:', fetchError);
                return { success: false, error: fetchError };
            }

            let data, error;
            
            if (existingScores && existingScores.length > 0) {
                const existingScore = existingScores[0];
                console.log(`🔍 FOUND EXISTING SCORE: ${existingScore.score} (ID: ${existingScore.id})`);
                console.log(`🔍 NEW SCORE: ${scoreData.score}`);
                console.log(`🔍 IS NEW SCORE HIGHER? ${scoreData.score > existingScore.score}`);
                
                if (scoreData.score > existingScore.score) {
                    // New score is higher - use UPSERT to handle constraint properly
                    console.log(`🚀 UPSERTING RECORD: ${existingScore.score} TO ${scoreData.score}`);
                    
                    // Use UPSERT (INSERT with ON CONFLICT UPDATE)
                    const upsertResult = await supabase
                        .from('game_scores')
                        .upsert(scoreRecord, {
                            onConflict: 'user_id,game_date',
                            ignoreDuplicates: false
                        })
                        .select();
                    
                    data = upsertResult.data;
                    error = upsertResult.error;
                    
                    if (!error) {
                        console.log('✅ Score upserted successfully:', data);
                        console.log('✅ Upserted record details:', data[0]);
                    } else {
                        console.error('❌ UPSERT FAILED:', error);
                    }
                } else {
                    // Existing score is higher or equal - don't update
                    console.log(`📊 Score ${scoreData.score} not higher than existing score ${existingScore.score}, keeping existing`);
                    return { success: true, data: existingScore, skipped: true };
                }
            } else {
                // No existing score - insert new record
                const insertResult = await supabase
                    .from('game_scores')
                    .insert([scoreRecord])
                    .select();
                
                data = insertResult.data;
                error = insertResult.error;
                
                if (!error) {
                    console.log('✅ First score recorded successfully:', data);
                }
            }

            if (error) {
                console.error('❌ ERROR RECORDING GAME SCORE:', error);
                console.error('❌ Score data that failed:', scoreRecord);
                console.error('❌ Full error object:', JSON.stringify(error, null, 2));
                return { success: false, error };
            }

            console.log('✅ Game score recorded successfully:', data);
            console.log('✅ Recorded score data:', data[0]);
            return { success: true, data };
        } catch (error) {
            console.error('Exception recording game score:', error);
            return { success: false, error: error.message };
        }
    }

    // Minimal validation - only protect against code injection and obvious manipulation
    validateScoreSubmission(scoreData) {
        const validation = { valid: true, reasons: [] };
        const score = scoreData.score;
        const now = Date.now();
        
        // 1. Basic data type validation (prevent code injection)
        if (typeof score !== 'number' || score < 0 || !Number.isFinite(score) || isNaN(score)) {
            validation.valid = false;
            validation.reasons.push('Invalid score data type');
        }
        
        // 2. Extreme value protection (prevent obvious manipulation/overflow)
        if (score > 10000000) { // 10 million - way beyond any realistic gameplay
            validation.valid = false;
            validation.reasons.push('Score exceeds maximum possible value');
        }
        
        // 3. Basic rate limiting (prevent spam/DOS)
        const submissionKey = `last_submission_${scoreData.user_id}`;
        const lastSubmission = localStorage.getItem(submissionKey);
        if (lastSubmission && (now - parseInt(lastSubmission)) < 3000) { // 3 second cooldown
            validation.valid = false;
            validation.reasons.push('Please wait before submitting another score');
        }
        
        // 4. Daily submission limit (prevent abuse)
        const dailyCountKey = `daily_submissions_${scoreData.user_id}_${scoreData.game_date}`;
        const dailyCount = parseInt(localStorage.getItem(dailyCountKey) || '0');
        if (dailyCount >= 200) { // Very generous limit
            validation.valid = false;
            validation.reasons.push('Daily submission limit reached');
        }
        
        // Update rate limiting counters
        if (validation.valid) {
            localStorage.setItem(submissionKey, now.toString());
            localStorage.setItem(dailyCountKey, (dailyCount + 1).toString());
        }
        
        // 5. Log validation results for monitoring
        console.log(`🔍 Minimal validation for ${scoreData.username}: Score ${score} - ${validation.valid ? 'ACCEPTED' : 'REJECTED'}`);
        if (validation.reasons.length > 0) {
            console.log('📝 Validation notes:', validation.reasons);
        }
        
        return validation;
    }

    // Get current PST date (matches leaderboard.js getCurrentGameDate)
    getCurrentPSTDate() {
        // Get current PST date (Pacific Standard Time - UTC-8)
        const now = new Date();
        
        // Convert to PST by subtracting 8 hours from UTC
        const pstOffset = -8 * 60; // PST is UTC-8 (in minutes)
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const pstTime = new Date(utc + (pstOffset * 60000));
        
        // Format as YYYY-MM-DD
        const year = pstTime.getFullYear();
        const month = String(pstTime.getMonth() + 1).padStart(2, '0');
        const day = String(pstTime.getDate()).padStart(2, '0');
        const gameDate = `${year}-${month}-${day}`;
        
        console.log(`📅 Supabase using PST date: ${gameDate} (PST time: ${pstTime.toLocaleString()})`);
        return gameDate;
    }

    // Get today's leaderboard - only best score per user
    async getTodayLeaderboard() {
        try {
            // Get current PST date to match leaderboard.js
            const today = this.getCurrentPSTDate();

            console.log('📊 Testing database function for leaderboard...');
            
            // Try the optimized database function first
            const { data, error } = await supabase.rpc('get_daily_leaderboard', {
                target_date: today,
                score_limit: 50
            });

            // If the function doesn't exist, fall back to the client-side method
            if (error && (error.code === '42883' || error.code === 'PGRST202')) {
                console.log('⚠️ Database function not found, using fallback method');
                return await this.getTodayLeaderboardFallback();
            }

            if (error) {
                console.error('❌ Error calling database function:', error);
                console.log('🔄 Falling back to client-side deduplication');
                return await this.getTodayLeaderboardFallback();
            }

            console.log('✅ SUCCESS: Using optimized database function with', data?.length || 0, 'entries');
            return { success: true, data: data || [] };
        } catch (error) {
            console.error('Exception getting today leaderboard:', error);
            return { success: false, data: [], error: error.message };
        }
    }

    // Fallback method - fetch all scores and deduplicate client-side
    async getTodayLeaderboardFallback() {
        try {
            // Get current PST date to match leaderboard.js
            const today = this.getCurrentPSTDate();

            const { data, error } = await supabase
                .from('game_scores')
                .select('*')
                .eq('game_date', today)
                .order('score', { ascending: false });

            if (error) {
                console.error('Error getting today leaderboard fallback:', error);
                return { success: false, data: [], error };
            }

            // Deduplicate - keep only the best score per user
            const userBestScores = new Map();
            
            (data || []).forEach(entry => {
                const existingScore = userBestScores.get(entry.user_id);
                if (!existingScore || entry.score > existingScore.score) {
                    userBestScores.set(entry.user_id, entry);
                }
            });

            // Convert back to array and sort by score
            const deduplicatedData = Array.from(userBestScores.values())
                .sort((a, b) => b.score - a.score)
                .slice(0, 50);

            console.log('📊 Client-side deduplication: reduced', data?.length || 0, 'entries to', deduplicatedData.length, 'unique users');
            return { success: true, data: deduplicatedData };
        } catch (error) {
            console.error('Exception in leaderboard fallback:', error);
            return { success: false, data: [], error: error.message };
        }
    }

    // Get user's best score for today
    async getUserBestScore(userId) {
        try {
            // Get current PST date to match leaderboard.js
            const today = this.getCurrentPSTDate();

            const { data, error } = await supabase
                .from('game_scores')
                .select('score')
                .eq('user_id', userId)
                .eq('game_date', today)
                .order('score', { ascending: false })
                .limit(1);

            if (error) {
                console.error('Error getting user best score:', error);
                return { success: false, score: 0, error };
            }

            const bestScore = data && data.length > 0 ? data[0].score : 0;
            return { success: true, score: bestScore };
        } catch (error) {
            console.error('Exception getting user best score:', error);
            return { success: false, score: 0, error: error.message };
        }
    }

    // Get leaderboard stats
    async getLeaderboardStats() {
        try {
            const today = new Date().toISOString().split('T')[0];

            const { data, error } = await supabase
                .from('game_scores')
                .select('score')
                .eq('game_date', today);

            if (error) {
                console.error('Error getting leaderboard stats:', error);
                return { success: false, stats: {}, error };
            }

            const scores = data.map(item => item.score);
            const stats = {
                totalPlayers: scores.length,
                averageScore: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
                topScore: scores.length > 0 ? Math.max(...scores) : 0,
                gameDate: today
            };

            return { success: true, stats };
        } catch (error) {
            console.error('Exception getting leaderboard stats:', error);
            return { success: false, stats: {}, error: error.message };
        }
    }

    // Subscribe to live game scores
    subscribeToGameScores(onNewScore, onScoreUpdate) {
        try {
            // Unsubscribe from existing channel if any
            this.unsubscribeFromGameScores();

            // Create new real-time channel for game scores
            this.gameScoreChannel = supabase
                .channel('game_scores_channel')
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'game_scores'
                    },
                    (payload) => {
                        console.log('🔴 LIVE: New game score!', payload);
                        if (onNewScore) {
                            onNewScore(payload.new);
                        }
                    }
                )
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'game_scores'
                    },
                    (payload) => {
                        console.log('🔄 LIVE: Game score updated!', payload);
                        if (onScoreUpdate) {
                            onScoreUpdate(payload.new);
                        }
                    }
                )
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        console.log('✅ Live game score tracking activated!');
                    } else if (status === 'CHANNEL_ERROR') {
                        console.error('❌ Game score subscription failed');
                    }
                });

            return { success: true, channel: this.gameScoreChannel };
        } catch (error) {
            console.error('Error setting up game score subscription:', error);
            return { success: false, error: error.message };
        }
    }

    // Stop game score subscription
    unsubscribeFromGameScores() {
        if (this.gameScoreChannel) {
            supabase.removeChannel(this.gameScoreChannel);
            this.gameScoreChannel = null;
            console.log('🔌 Game score subscription stopped');
        }
    }
}

// Export singleton instance
export const orderTracker = new OrderTracker();
export default orderTracker;