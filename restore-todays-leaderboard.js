// ===== RESTORE TODAY'S LEADERBOARD =====
// This script restores today's leaderboard by checking for existing data and fixing any issues

(function() {
    console.log('🏆 RESTORING TODAY\'S LEADERBOARD...');
    
    const today = new Date();
    const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    console.log(`📅 Restoring leaderboard for: ${todayString}`);
    console.log(`🕐 Current time: ${today.toLocaleString()}`);
    
    // Check if we have the necessary components
    if (typeof window.supabaseClient === 'undefined') {
        console.log('❌ Supabase client not available. Make sure you\'re on the game page.');
        return { error: 'Supabase not available' };
    }
    
    if (typeof window.leaderboard === 'undefined') {
        console.log('❌ Leaderboard system not available. Make sure you\'re on the game page.');
        return { error: 'Leaderboard not available' };
    }
    
    const supabase = window.supabaseClient;
    const leaderboard = window.leaderboard;
    
    // Main restoration function
    async function restoreLeaderboard() {
        try {
            console.log('🔍 Step 1: Checking for today\'s existing data...');
            
            // Method 1: Try the database function
            let todaysData = null;
            try {
                const { data: functionData, error: functionError } = await supabase
                    .rpc('get_daily_leaderboard', { 
                        target_date: todayString 
                    });
                
                if (!functionError && functionData && functionData.length > 0) {
                    console.log(`✅ Found ${functionData.length} entries via database function`);
                    todaysData = functionData.map(entry => ({
                        username: entry.username || entry.twitter_username,
                        score: entry.best_score || entry.score,
                        user_id: entry.user_id,
                        created_at: entry.latest_score_time || entry.created_at
                    }));
                }
            } catch (error) {
                console.log('⚠️ Database function failed:', error.message);
            }
            
            // Method 2: Direct query if function failed
            if (!todaysData) {
                console.log('🔄 Step 2: Trying direct database query...');
                
                const startOfDay = `${todayString}T00:00:00.000Z`;
                const endOfDay = `${todayString}T23:59:59.999Z`;
                
                const { data: directData, error: directError } = await supabase
                    .from('game_scores')
                    .select('*')
                    .gte('created_at', startOfDay)
                    .lt('created_at', endOfDay)
                    .order('score', { ascending: false });
                
                if (!directError && directData && directData.length > 0) {
                    console.log(`✅ Found ${directData.length} scores via direct query`);
                    
                    // Deduplicate by user (keep highest score per user)
                    const userBestScores = {};
                    directData.forEach(score => {
                        const userId = score.user_id || score.twitter_username;
                        if (!userBestScores[userId] || score.score > userBestScores[userId].score) {
                            userBestScores[userId] = score;
                        }
                    });
                    
                    todaysData = Object.values(userBestScores)
                        .map(entry => ({
                            username: entry.twitter_username || entry.username,
                            score: entry.score,
                            user_id: entry.user_id,
                            created_at: entry.created_at
                        }))
                        .sort((a, b) => b.score - a.score);
                        
                    console.log(`📊 Deduplicated to ${todaysData.length} unique players`);
                }
            }
            
            // Step 3: Apply the data to the leaderboard
            if (todaysData && todaysData.length > 0) {
                console.log('🚀 Step 3: Applying data to leaderboard system...');
                
                // Set the leaderboard data
                leaderboard.currentLeaderboard = todaysData;
                
                // Force refresh the leaderboard display
                if (typeof leaderboard.showLeaderboard === 'function') {
                    leaderboard.showLeaderboard();
                }
                
                // Update any displayed elements
                const leaderboardContainer = document.querySelector('.leaderboard-container');
                if (leaderboardContainer && leaderboardContainer.classList.contains('visible')) {
                    leaderboard.hideLeaderboard();
                    setTimeout(() => leaderboard.showLeaderboard(), 100);
                }
                
                console.log('✅ LEADERBOARD RESTORED SUCCESSFULLY!');
                console.log(`🏆 Top score: ${todaysData[0].score} by @${todaysData[0].username}`);
                console.log(`👥 Total players: ${todaysData.length}`);
                
                return {
                    success: true,
                    data: todaysData,
                    topScore: todaysData[0].score,
                    totalPlayers: todaysData.length
                };
                
            } else {
                console.log('😔 No data found for today');
                console.log('💡 This could mean:');
                console.log('   - No games played today yet');
                console.log('   - Data was cleared during the reset issue');
                console.log('   - Database connection issues');
                
                // Check if there's data from yesterday that might need to be considered
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayString = yesterday.toISOString().split('T')[0];
                
                console.log(`🔍 Checking yesterday (${yesterdayString}) for comparison...`);
                
                const { data: yesterdayData, error: yesterdayError } = await supabase
                    .from('game_scores')
                    .select('*')
                    .gte('created_at', `${yesterdayString}T00:00:00.000Z`)
                    .lt('created_at', `${yesterdayString}T23:59:59.999Z`)
                    .order('score', { ascending: false })
                    .limit(5);
                
                if (!yesterdayError && yesterdayData && yesterdayData.length > 0) {
                    console.log(`📊 Yesterday had ${yesterdayData.length} scores. Top score: ${yesterdayData[0].score}`);
                    console.log('💡 Consider if any of today\'s games should have been recorded');
                }
                
                return {
                    success: false,
                    message: 'No data found for today',
                    yesterdayCount: yesterdayData?.length || 0
                };
            }
            
        } catch (error) {
            console.error('❌ Error restoring leaderboard:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Execute the restoration
    console.log('🚀 Starting leaderboard restoration...');
    return restoreLeaderboard();
    
})();