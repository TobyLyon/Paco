// ===== IMMEDIATE FIX FOR LEADERBOARD DATE =====
// Run this RIGHT NOW to force today's leaderboard

(function() {
    console.log('🚨 EMERGENCY: FIXING LEADERBOARD DATE NOW!');
    
    const today = new Date();
    const todayString = today.toISOString().split('T')[0]; // 2025-08-06
    
    console.log(`📅 Forcing date to: ${todayString}`);
    console.log(`🕐 Current time: ${today.toLocaleString()}`);
    
    // Step 1: Clear localStorage date cache
    localStorage.removeItem('leaderboard_reset_time');
    localStorage.removeItem('timer_display_state');
    console.log('🗑️ Cleared date cache');
    
    // Step 2: Force leaderboard to refresh for today
    if (typeof window.leaderboard !== 'undefined') {
        console.log('📊 Forcing leaderboard refresh...');
        
        // Clear current data
        window.leaderboard.currentLeaderboard = [];
        
        // Force today's date
        const originalMethod = window.leaderboard.getCurrentGameDate;
        window.leaderboard.getCurrentGameDate = function() {
            return todayString; // Force 2025-08-06
        };
        
        // Fetch fresh data
        window.leaderboard.fetchTodayLeaderboard().then(() => {
            console.log('✅ Leaderboard refreshed for today!');
            console.log(`📊 Entries found: ${window.leaderboard.currentLeaderboard.length}`);
            
            // Show leaderboard if it's already open
            const container = document.querySelector('.leaderboard-container');
            if (container && container.classList.contains('visible')) {
                window.leaderboard.hideLeaderboard();
                setTimeout(() => window.leaderboard.showLeaderboard(), 200);
            }
        });
    }
    
    // Step 3: Force database query for today
    if (typeof window.supabaseClient !== 'undefined' || typeof supabaseClient !== 'undefined') {
        const supabase = window.supabaseClient || supabaseClient;
        console.log('🔍 Checking database for today...');
        
        // Direct query for today's data
        supabase
            .from('game_scores')
            .select('*')
            .eq('game_date', todayString)
            .order('score', { ascending: false })
            .then(({ data, error }) => {
                if (error) {
                    console.error('❌ Database error:', error);
                } else {
                    console.log(`📊 Found ${data?.length || 0} scores for today (${todayString})`);
                    if (data && data.length > 0) {
                        console.log('🏆 Today\'s scores:');
                        data.forEach((score, i) => {
                            console.log(`  ${i+1}. @${score.username || score.twitter_username}: ${score.score}`);
                        });
                    } else {
                        console.log('📭 No scores for today yet - play a game to create the first entry!');
                    }
                }
            });
    }
    
    console.log('🎯 DONE! Leaderboard should now show today\'s date.');
    console.log('🔄 If still showing Aug 5th, refresh the page and run this again.');
    
    return {
        dateForced: todayString,
        cacheCleared: true,
        status: 'completed'
    };
})();