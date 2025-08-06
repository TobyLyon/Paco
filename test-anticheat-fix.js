// ===== TEST ANTI-CHEAT FIX =====
// Test if the anti-cheat system allows legitimate scores now

(function() {
    console.log('🧪 TESTING ANTI-CHEAT SYSTEM...');
    
    if (typeof antiCheat === 'undefined') {
        console.log('❌ Anti-cheat system not available.');
        return { error: 'Anti-cheat not available' };
    }
    
    console.log('✅ Anti-cheat system found');
    
    // Test different score scenarios
    const testScores = [
        { score: 100, description: 'Low score (should pass)' },
        { score: 319, description: 'Your recent score (should pass after fix)' },
        { score: 500, description: 'Medium score (should pass)' },
        { score: 1000, description: 'High score (should pass with enough time)' },
        { score: 2000, description: 'Very high score (should pass with more time)' }
    ];
    
    console.log('🔍 Testing score validation...');
    
    testScores.forEach(test => {
        console.log(`\n📊 Testing: ${test.description}`);
        
        try {
            // Start a new session for testing
            antiCheat.startNewGame();
            
            // Simulate some game time (to avoid time-based rejection)
            antiCheat.gameStartTime = Date.now() - 30000; // 30 seconds ago
            antiCheat.totalGameTime = 30000; // 30 seconds of play
            
            // Simulate some platform jumps
            for (let i = 0; i < Math.min(test.score / 10, 50); i++) {
                antiCheat.trackGameEvent('platform_jump');
            }
            
            // Test score validation
            const validation = antiCheat.validateScore(test.score);
            
            console.log(`   Result: ${validation.valid ? '✅ PASS' : '❌ FAIL'}`);
            console.log(`   Risk Level: ${validation.riskLevel}`);
            
            if (!validation.valid) {
                console.log(`   Reasons: ${validation.reasons.join(', ')}`);
            }
            
            // Test secure submission creation
            if (validation.valid) {
                try {
                    const submission = antiCheat.createSecureSubmission(test.score);
                    console.log(`   ✅ Secure submission created successfully`);
                    console.log(`   Session ID: ${submission.sessionId}`);
                    console.log(`   Game Time: ${submission.gameTime}ms`);
                    console.log(`   Platforms: ${submission.platformsJumped}`);
                } catch (submissionError) {
                    console.log(`   ❌ Secure submission failed: ${submissionError.message}`);
                }
            }
            
        } catch (error) {
            console.log(`   ❌ Test failed: ${error.message}`);
        }
    });
    
    console.log('\n🎯 SUMMARY:');
    console.log('If your score (319) shows ✅ PASS above, the anti-cheat fix worked!');
    console.log('If it still shows ❌ FAIL, we need to adjust the limits further.');
    
    return {
        antiCheatAvailable: true,
        testCompleted: true
    };
})();