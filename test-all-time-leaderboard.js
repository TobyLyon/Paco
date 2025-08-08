// Quick test to debug all-time leaderboard issues
(function() {
    console.log('🔍 TESTING ALL-TIME LEADERBOARD...');
    
    async function runTests() {
        try {
            // Test 1: Check if orderTracker is available
            console.log('📦 OrderTracker available:', typeof orderTracker !== 'undefined');
            console.log('📦 getAllTimeLeaderboard method:', typeof orderTracker?.getAllTimeLeaderboard);
            
            if (typeof orderTracker !== 'undefined' && typeof orderTracker.getAllTimeLeaderboard === 'function') {
                console.log('✅ OrderTracker and getAllTimeLeaderboard are available');
                
                // Test 2: Call the all-time leaderboard function
                console.log('📊 Calling getAllTimeLeaderboard...');
                const result = await orderTracker.getAllTimeLeaderboard();
                
                if (result.success) {
                    console.log(`✅ Got ${result.data.length} scores from database`);
                    
                    if (result.data.length > 0) {
                        // Show date breakdown
                        const scoresByDate = {};
                        result.data.forEach(entry => {
                            const date = entry.game_date;
                            if (!scoresByDate[date]) {
                                scoresByDate[date] = [];
                            }
                            scoresByDate[date].push(entry);
                        });
                        
                        console.log('📅 SCORES BY DATE:');
                        Object.keys(scoresByDate).sort().forEach(date => {
                            const scores = scoresByDate[date];
                            const topScore = Math.max(...scores.map(s => s.score));
                            console.log(`  ${date}: ${scores.length} scores (top: ${topScore})`);
                        });
                        
                        // Show top 10 overall
                        const top10 = result.data
                            .sort((a, b) => b.score - a.score)
                            .slice(0, 10);
                        
                        console.log('🏆 TOP 10 ALL-TIME SCORES:');
                        top10.forEach((entry, i) => {
                            console.log(`${i + 1}. ${entry.username}: ${entry.score} (${entry.game_date})`);
                        });
                        
                    } else {
                        console.log('⚠️ No scores found in database!');
                    }
                    
                } else {
                    console.error('❌ getAllTimeLeaderboard failed:', result.error);
                }
                
                // Test 3: Test the leaderboard.loadAllTimeLeaderboard function
                console.log('\n📊 Testing leaderboard.loadAllTimeLeaderboard...');
                if (typeof leaderboard !== 'undefined') {
                    await leaderboard.loadAllTimeLeaderboard();
                    console.log(`📊 Leaderboard loaded ${leaderboard.currentLeaderboard.length} entries`);
                    
                    if (leaderboard.currentLeaderboard.length > 0) {
                        console.log('🏆 CURRENT ALL-TIME DISPLAY:');
                        leaderboard.currentLeaderboard.forEach((entry, i) => {
                            console.log(`${i + 1}. ${entry.username}: ${entry.score} (${entry.game_date})`);
                        });
                    }
                } else {
                    console.error('❌ Leaderboard object not available');
                }
                
            } else {
                console.error('❌ OrderTracker or getAllTimeLeaderboard not available');
                
                // Fallback: try direct supabase access
                if (typeof supabase !== 'undefined') {
                    console.log('🔄 Trying direct Supabase access...');
                    const { data, error } = await supabase
                        .from('game_scores')
                        .select('*')
                        .order('created_at', { ascending: false })
                        .limit(50);
                    
                    if (error) {
                        console.error('❌ Direct Supabase query failed:', error);
                    } else {
                        console.log(`📊 Direct query found ${data.length} scores`);
                        if (data.length > 0) {
                            const dates = [...new Set(data.map(entry => entry.game_date))].sort();
                            console.log(`📅 Dates in database: ${dates.join(', ')}`);
                        }
                    }
                } else {
                    console.error('❌ No Supabase access available');
                }
            }
            
        } catch (error) {
            console.error('❌ Test failed:', error);
        }
    }
    
    // Make function available globally
    window.testAllTimeLeaderboard = runTests;
    
    // Auto-run
    runTests();
    
})();
