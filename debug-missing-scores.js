// Debug script to find missing yesterday's scores in all-time leaderboard
(function() {
    console.log('🔍 DEBUGGING MISSING YESTERDAY SCORES...');
    
    // First, let's check what dates we have in our database
    async function checkDatabaseDates() {
        try {
            console.log('📊 Checking all scores in database...');
            
            // This should work if we have access to orderTracker's Supabase client
            if (typeof orderTracker !== 'undefined' && orderTracker.supabase) {
                const { data, error } = await orderTracker.supabase
                    .from('game_scores')
                    .select('game_date, created_at, username, score')
                    .order('created_at', { ascending: false })
                    .limit(100);
                
                if (error) {
                    console.error('❌ Database query failed:', error);
                    return;
                }
                
                console.log(`📊 Found ${data.length} total scores in database`);
                
                // Group by date to see what we have
                const scoresByDate = {};
                data.forEach(entry => {
                    const date = entry.game_date;
                    if (!scoresByDate[date]) {
                        scoresByDate[date] = [];
                    }
                    scoresByDate[date].push({
                        username: entry.username,
                        score: entry.score,
                        created_at: entry.created_at
                    });
                });
                
                console.log('📅 SCORES BY DATE:');
                Object.keys(scoresByDate).sort().forEach(date => {
                    const scores = scoresByDate[date];
                    const topScore = Math.max(...scores.map(s => s.score));
                    const topPlayer = scores.find(s => s.score === topScore);
                    console.log(`📊 ${date}: ${scores.length} scores (top: ${topScore} by ${topPlayer.username})`);
                    
                    // Show top 3 for each date
                    const top3 = scores.sort((a, b) => b.score - a.score).slice(0, 3);
                    top3.forEach((entry, i) => {
                        console.log(`  ${i + 1}. ${entry.username}: ${entry.score}`);
                    });
                });
                
                return scoresByDate;
                
            } else {
                console.error('❌ OrderTracker or Supabase not available');
                console.log('Available globals:', Object.keys(window).filter(k => k.includes('supabase') || k.includes('order')));
            }
            
        } catch (error) {
            console.error('❌ Error checking database:', error);
        }
    }
    
    // Test the all-time leaderboard function specifically
    async function testAllTimeFunction() {
        console.log('🧪 Testing loadAllTimeLeaderboard function...');
        
        if (typeof leaderboard !== 'undefined') {
            try {
                await leaderboard.loadAllTimeLeaderboard();
                console.log('📊 All-time leaderboard loaded:', leaderboard.currentLeaderboard.length, 'entries');
                
                if (leaderboard.currentLeaderboard.length > 0) {
                    console.log('🏆 Current all-time top scores:');
                    leaderboard.currentLeaderboard.forEach((entry, i) => {
                        console.log(`${i + 1}. ${entry.username}: ${entry.score} (${entry.game_date})`);
                    });
                } else {
                    console.log('⚠️ All-time leaderboard is empty!');
                }
                
            } catch (error) {
                console.error('❌ All-time leaderboard function failed:', error);
            }
        } else {
            console.error('❌ Leaderboard object not available');
        }
    }
    
    // Check current date settings
    function checkDateSettings() {
        console.log('📅 CURRENT DATE SETTINGS:');
        
        if (typeof leaderboard !== 'undefined') {
            const currentGameDate = leaderboard.getCurrentGameDate();
            console.log('🎮 Game thinks current date is:', currentGameDate);
        }
        
        if (typeof orderTracker !== 'undefined') {
            const supabaseDate = orderTracker.getCurrentPSTDate();
            console.log('🗄️ Supabase thinks current date is:', supabaseDate);
        }
        
        const actualPST = new Date().toLocaleString("en-US", {timeZone: "America/Los_Angeles"});
        const actualPSTDate = new Date(actualPST).toISOString().split('T')[0];
        console.log('🌎 Actual PST date is:', actualPSTDate);
        console.log('🌎 Actual PST time is:', actualPST);
    }
    
    // Run all checks
    async function runAllChecks() {
        checkDateSettings();
        console.log('\n' + '='.repeat(50) + '\n');
        
        const scoresByDate = await checkDatabaseDates();
        console.log('\n' + '='.repeat(50) + '\n');
        
        await testAllTimeFunction();
        
        return scoresByDate;
    }
    
    // Make function available globally
    window.debugMissingScores = runAllChecks;
    
    // Auto-run
    runAllChecks();
    
})();
