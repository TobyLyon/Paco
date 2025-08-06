// ===== FORCE AUGUST 5TH LEADERBOARD =====
// This script forces the game to show August 5th leaderboard instead of August 6th

(function() {
    console.log('📅 FORCING AUGUST 5TH LEADERBOARD...');
    
    // Check what the game thinks the current date is
    if (typeof window.leaderboard !== 'undefined') {
        const currentGameDate = leaderboard.getCurrentGameDate();
        console.log(`🔍 Current game date: ${currentGameDate}`);
        
        if (currentGameDate === '2025-08-06') {
            console.log('🚨 Game thinks it\'s August 6th, but it should be August 5th!');
        }
    }
    
    // Override the getCurrentGameDate function to return August 5th
    if (typeof window.leaderboard !== 'undefined') {
        const originalGetCurrentGameDate = leaderboard.getCurrentGameDate;
        
        leaderboard.getCurrentGameDate = function() {
            console.log('📅 FORCED: Returning August 5th date');
            return '2025-08-05';
        };
        
        console.log('✅ Overridden getCurrentGameDate to return August 5th');
        
        // Also check orderTracker
        if (typeof window.orderTracker !== 'undefined' && typeof orderTracker.getTodayLeaderboard === 'function') {
            console.log('🔄 Refreshing leaderboard to show August 5th data...');
            
            // Force refresh the leaderboard
            leaderboard.fetchTodayLeaderboard().then(data => {
                console.log(`📊 Loaded ${data.length} entries for August 5th`);
                
                if (data.length > 0) {
                    console.log('🏆 Top scores for August 5th:');
                    data.slice(0, 5).forEach((entry, index) => {
                        console.log(`  ${index + 1}. ${entry.username || entry.twitter_username}: ${entry.score || entry.best_score}`);
                    });
                    
                    // Update the leaderboard display
                    leaderboard.showLeaderboard();
                } else {
                    console.log('❌ No data found for August 5th');
                }
            }).catch(error => {
                console.error('❌ Error fetching August 5th leaderboard:', error);
            });
        }
        
        return {
            forcedDate: '2025-08-05',
            originalFunction: originalGetCurrentGameDate,
            success: true
        };
    } else {
        console.log('❌ Leaderboard system not found');
        return { error: 'Leaderboard not available' };
    }
})();