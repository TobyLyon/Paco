// ===== SCORE SUBMISSION DEBUG TEST =====
// Run this in browser console to debug score submission issues

window.debugScoreSubmission = async function() {
    console.log('🔍 DEBUGGING SCORE SUBMISSION PROCESS...');
    
    // Step 1: Check if required components are loaded
    console.log('\n📋 STEP 1: Component Check');
    console.log('- orderTracker:', typeof orderTracker !== 'undefined' ? '✅ LOADED' : '❌ MISSING');
    console.log('- leaderboard:', typeof leaderboard !== 'undefined' ? '✅ LOADED' : '❌ MISSING');
    console.log('- twitterAuth:', typeof twitterAuth !== 'undefined' ? '✅ LOADED' : '❌ MISSING');
    console.log('- antiCheat:', typeof antiCheat !== 'undefined' ? '✅ LOADED' : '❌ MISSING');
    
    // Step 2: Check Twitter authentication
    console.log('\n🐦 STEP 2: Twitter Authentication Check');
    if (typeof twitterAuth !== 'undefined') {
        console.log('- Authenticated:', twitterAuth.authenticated ? '✅ YES' : '❌ NO');
        if (twitterAuth.authenticated) {
            console.log('- User ID:', twitterAuth.currentUser?.id || 'MISSING');
            console.log('- Username:', twitterAuth.currentUser?.username || 'MISSING');
        } else {
            console.log('❌ USER NOT AUTHENTICATED - This will block score submission');
            return;
        }
    } else {
        console.log('❌ Twitter auth module not loaded');
        return;
    }
    
    // Step 3: Test Supabase connection
    console.log('\n🗄️ STEP 3: Supabase Connection Test');
    if (typeof orderTracker !== 'undefined' && typeof orderTracker.getTodayLeaderboard === 'function') {
        try {
            const result = await orderTracker.getTodayLeaderboard();
            if (result.success) {
                console.log('✅ Supabase connection working');
                console.log('- Current entries:', result.data?.length || 0);
            } else {
                console.log('❌ Supabase connection failed:', result.error);
                return;
            }
        } catch (error) {
            console.log('❌ Supabase connection error:', error);
            return;
        }
    }
    
    // Step 4: Test anti-cheat system
    console.log('\n🛡️ STEP 4: Anti-cheat System Test');
    if (typeof antiCheat !== 'undefined') {
        try {
            const testSubmission = antiCheat.createSecureSubmission(1000);
            console.log('✅ Anti-cheat system working');
            console.log('- Session ID:', testSubmission.sessionId ? '✅ PRESENT' : '❌ MISSING');
            console.log('- Checksum:', testSubmission.checksum ? '✅ PRESENT' : '❌ MISSING');
        } catch (error) {
            console.log('❌ Anti-cheat system error:', error.message);
        }
    } else {
        console.log('⚠️ Anti-cheat system not loaded - submissions will use basic validation only');
    }
    
    // Step 5: Test score validation
    console.log('\n🔍 STEP 5: Validation Test');
    if (typeof orderTracker !== 'undefined' && typeof orderTracker.validateScoreSubmission === 'function') {
        const testScoreData = {
            user_id: twitterAuth.currentUser.id,
            username: twitterAuth.currentUser.username,
            score: 1500,
            game_time: 45000, // 45 seconds
            platforms_jumped: 15,
            session_id: 'test_session',
            checksum: 'test_checksum'
        };
        
        const validation = orderTracker.validateScoreSubmission(testScoreData);
        console.log('- Validation result:', validation.valid ? '✅ PASS' : '❌ FAIL');
        if (!validation.valid) {
            console.log('- Rejection reasons:');
            validation.reasons.forEach(reason => console.log(`  - ${reason}`));
        }
        if (validation.reasons.length > 0) {
            console.log('- Warnings:');
            validation.reasons.forEach(reason => console.log(`  - ${reason}`));
        }
    }
    
    // Step 6: Test actual score submission with dummy data
    console.log('\n🎯 STEP 6: Test Score Submission');
    try {
        const testScore = Math.floor(Math.random() * 1000) + 500; // Random score 500-1500
        console.log(`Testing with score: ${testScore}`);
        
        const result = await leaderboard.submitScore(testScore);
        if (result) {
            console.log('✅ Score submission successful!');
            console.log('- Result:', result);
        } else {
            console.log('❌ Score submission failed - no result returned');
        }
    } catch (error) {
        console.log('❌ Score submission error:', error.message);
        console.log('- Full error:', error);
    }
    
    console.log('\n🏁 DEBUG COMPLETE');
    console.log('If you see errors above, that\'s likely why scores aren\'t submitting!');
};

console.log('🚀 Score submission debug loaded!');
console.log('Run: debugScoreSubmission()');
