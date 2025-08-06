// ===== CHECK TODAY'S LEADERBOARD DATA =====
// This script checks what leaderboard data exists for today

(function() {
    console.log('🔍 CHECKING TODAY\'S LEADERBOARD DATA...');
    
    const today = new Date();
    const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    console.log(`📅 Today's date: ${todayString}`);
    console.log(`🕐 Current time: ${today.toLocaleString()}`);
    
    // Check if we have supabase client available
    if (typeof window.supabaseClient === 'undefined') {
        console.log('❌ Supabase client not available. Make sure you\'re on the game page.');
        return;
    }
    
    const supabase = window.supabaseClient;
    
    // Query today's scores
    async function checkTodaysData() {
        try {
            console.log('🔍 Querying today\'s scores...');
            
            // Get all scores from today
            const { data: todaysScores, error: scoresError } = await supabase
                .from('game_scores')
                .select('*')
                .gte('created_at', `${todayString}T00:00:00.000Z`)
                .lt('created_at', `${todayString}T23:59:59.999Z`)
                .order('score', { ascending: false });
            
            if (scoresError) {
                console.error('❌ Error querying today\'s scores:', scoresError);
                return;
            }
            
            console.log(`📊 Found ${todaysScores.length} scores for today:`, todaysScores);
            
            if (todaysScores.length > 0) {
                const topScore = todaysScores[0];
                const uniquePlayers = [...new Set(todaysScores.map(s => s.twitter_username))].length;
                
                console.log(`🏆 Top score today: ${topScore.score} by @${topScore.twitter_username}`);
                console.log(`👥 Unique players today: ${uniquePlayers}`);
                console.log(`⏰ Latest score time: ${new Date(todaysScores[0].created_at).toLocaleString()}`);
            }
            
            // Try to call the daily leaderboard function
            console.log('📋 Calling get_daily_leaderboard function...');
            
            const { data: leaderboardData, error: leaderboardError } = await supabase
                .rpc('get_daily_leaderboard', { 
                    target_date: todayString,
                    limit_count: 10 
                });
            
            if (leaderboardError) {
                console.error('❌ Error calling get_daily_leaderboard:', leaderboardError);
                
                // If function fails, try direct query
                console.log('🔄 Trying direct query instead...');
                const { data: directData, error: directError } = await supabase
                    .from('game_scores')
                    .select('twitter_username, score, created_at')
                    .gte('created_at', `${todayString}T00:00:00.000Z`)
                    .lt('created_at', `${todayString}T23:59:59.999Z`)
                    .order('score', { ascending: false })
                    .limit(10);
                
                if (!directError && directData.length > 0) {
                    console.log('✅ Direct query successful:', directData);
                    return directData;
                }
            } else {
                console.log('✅ Leaderboard function successful:', leaderboardData);
                return leaderboardData;
            }
            
        } catch (error) {
            console.error('❌ Unexpected error:', error);
        }
    }
    
    // Run the check
    checkTodaysData().then(data => {
        if (data && data.length > 0) {
            console.log('🎉 TODAY\'S LEADERBOARD DATA FOUND!');
            console.log('📋 You can restore this data to your leaderboard.');
        } else {
            console.log('😔 No leaderboard data found for today.');
            console.log('💡 This might be because:');
            console.log('   - No games played today yet');
            console.log('   - Data was cleared during the reset');
            console.log('   - Database function needs fixing');
        }
    });
    
    return {
        date: todayString,
        checkFunction: checkTodaysData
    };
})();