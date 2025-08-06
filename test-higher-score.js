// Test higher score submission to verify replacement works
(async function() {
    console.log('🧪 TESTING HIGHER SCORE SUBMISSION...');
    
    if (!twitterAuth.authenticated) {
        console.error('❌ Not authenticated');
        return;
    }
    
    const user = twitterAuth.currentUser;
    console.log(`👤 Testing for user: @${user.username} (${user.id})`);
    
    // Get current best score first
    if (orderTracker && typeof orderTracker.getUserBestScore === 'function') {
        const currentBest = await orderTracker.getUserBestScore(user.id);
        console.log('🏆 Current best score:', currentBest);
        
        if (currentBest && currentBest.score) {
            const testScore = currentBest.score + 1000; // Add 1000 points
            console.log(`🚀 Testing with score: ${testScore} (current best: ${currentBest.score})`);
            
            // Create test score data
            const scoreData = {
                user_id: user.id,
                username: user.username,
                display_name: user.name,
                profile_image: user.profileImage,
                score: testScore,
                created_at: new Date().toISOString(),
                game_date: '2025-08-05' // Force August 5th
            };
            
            console.log('📤 Submitting test score:', scoreData);
            
            try {
                const result = await orderTracker.recordGameScore(scoreData);
                console.log('📥 Submission result:', result);
                
                if (result.success) {
                    if (result.skipped) {
                        console.log('⚠️ Score was skipped (might be lower than existing)');
                    } else {
                        console.log('✅ Score updated successfully!');
                    }
                    
                    // Check the updated leaderboard
                    const leaderboard = await orderTracker.getTodayLeaderboard();
                    console.log('🏆 Updated leaderboard:', leaderboard);
                    
                    // Find your new position
                    if (leaderboard.success && leaderboard.data) {
                        const yourEntry = leaderboard.data.find(entry => entry.user_id === user.id);
                        if (yourEntry) {
                            console.log(`🎯 Your new position: Rank ${yourEntry.rank || 'Unknown'} with ${yourEntry.score} points`);
                        }
                    }
                } else {
                    console.error('❌ Score submission failed:', result.error);
                }
            } catch (error) {
                console.error('💥 Error during submission:', error);
            }
        } else {
            console.log('📭 No existing score found, testing with 10000 points');
            
            const scoreData = {
                user_id: user.id,
                username: user.username,
                display_name: user.name,
                profile_image: user.profileImage,
                score: 10000,
                created_at: new Date().toISOString(),
                game_date: '2025-08-05'
            };
            
            const result = await orderTracker.recordGameScore(scoreData);
            console.log('📥 First score result:', result);
        }
    } else {
        console.error('❌ OrderTracker not available');
    }
    
    console.log('🧪 Test complete!');
})();