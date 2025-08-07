// ===== LIVE SCORE SUBMISSION DEBUG TEST =====
// Run this in browser console to test the ACTUAL submission flow

window.testScoreSubmissionFlow = async function() {
    console.log('🔍 TESTING LIVE SCORE SUBMISSION FLOW...');
    
    // Step 1: Check if we're authenticated
    console.log('\\n🐦 STEP 1: Twitter Authentication Check');
    if (typeof twitterAuth === 'undefined') {
        console.error('❌ TwitterAuth not loaded!');
        return;
    }
    
    console.log('- Authenticated:', twitterAuth.isAuthenticated);
    console.log('- User:', twitterAuth.user ? twitterAuth.user.username : 'None');
    
    if (!twitterAuth.isAuthenticated) {
        console.log('⚠️ Not authenticated - scores cannot be submitted');
        return;
    }
    
    // Step 2: Test Supabase connection
    console.log('\\n🗄️ STEP 2: Supabase Connection Test');
    try {
        const { data, error } = await supabase
            .from('game_scores')
            .select('count')
            .limit(1);
        
        if (error) {
            console.error('❌ Supabase connection failed:', error);
            return;
        }
        console.log('✅ Supabase connection working');
    } catch (e) {
        console.error('❌ Supabase test failed:', e);
        return;
    }
    
    // Step 3: Test a real score submission
    console.log('\\n📊 STEP 3: Test Score Submission');
    const testScore = {
        score: 1337,
        user_id: twitterAuth.user.id,
        username: twitterAuth.user.username,
        game_time: 30,
        session_id: 'test_session_' + Date.now(),
        checksum: 'test_checksum'
    };
    
    console.log('Submitting test score:', testScore);
    
    try {
        const result = await orderTracker.submitScore(
            testScore.score,
            testScore.user_id,
            testScore.username,
            testScore.game_time,
            testScore.session_id,
            testScore.checksum
        );
        
        console.log('✅ Score submission result:', result);
        
        // Step 4: Verify score appears in leaderboard
        console.log('\\n🏆 STEP 4: Verify Leaderboard');
        const leaderboardData = await orderTracker.getLeaderboard();
        console.log('Current leaderboard:', leaderboardData);
        
        const userScore = leaderboardData.find(entry => entry.user_id === testScore.user_id);
        if (userScore) {
            console.log('✅ Score found in leaderboard:', userScore);
        } else {
            console.log('❌ Score NOT found in leaderboard');
        }
        
    } catch (error) {
        console.error('❌ Score submission failed:', error);
        console.log('Error details:', {
            message: error.message,
            stack: error.stack,
            cause: error.cause
        });
    }
};

// Auto-run on load if authenticated
if (typeof twitterAuth !== 'undefined' && twitterAuth.isAuthenticated) {
    console.log('🚀 Auto-running score submission test...');
    setTimeout(() => testScoreSubmissionFlow(), 2000);
} else {
    console.log('💡 Run testScoreSubmissionFlow() after Twitter authentication');
}
