// ===== TEST SCORE UPDATE LOGIC =====
// Since database constraints are working, let's test the update logic directly

(function() {
    console.log('🧪 TESTING SCORE UPDATE LOGIC...');
    
    // Find Supabase client
    let supabase = null;
    if (typeof window.supabaseClient !== 'undefined') {
        supabase = window.supabaseClient;
    } else {
        console.log('❌ Supabase client not found');
        return { error: 'Supabase not available' };
    }
    
    // Get current user
    const twitterAuth = window.twitterAuth;
    if (!twitterAuth || !twitterAuth.user) {
        console.log('❌ No Twitter auth found');
        return { error: 'Not authenticated' };
    }
    
    const userId = twitterAuth.user.id;
    const username = twitterAuth.user.username;
    
    console.log(`👤 Testing for: @${username} (ID: ${userId})`);
    
    async function testUpdateLogic() {
        try {
            // Get current PST date
            const now = new Date();
            const pstTime = new Date(now.getTime() - (8 * 60 * 60 * 1000));
            const gameDate = pstTime.getUTCFullYear() + '-' + 
                            String(pstTime.getUTCMonth() + 1).padStart(2, '0') + '-' + 
                            String(pstTime.getUTCDate()).padStart(2, '0');
            
            console.log(`📅 Testing for PST date: ${gameDate}`);
            
            // Step 1: Check current scores for today
            console.log('\n🔍 STEP 1: Checking current scores...');
            
            const { data: existingScores, error: fetchError } = await supabase
                .from('game_scores')
                .select('*')
                .eq('user_id', userId)
                .eq('game_date', gameDate)
                .order('score', { ascending: false })
                .limit(1);
            
            if (fetchError) {
                console.error('❌ Error fetching scores:', fetchError);
                return;
            }
            
            console.log(`📊 Found ${existingScores.length} existing scores:`);
            if (existingScores.length > 0) {
                const existing = existingScores[0];
                console.log(`   Current best: ${existing.score} (ID: ${existing.id})`);
                console.log(`   Created: ${new Date(existing.created_at).toLocaleString()}`);
                
                // Step 2: Test what happens with different score scenarios
                console.log('\n🧪 STEP 2: Testing score scenarios...');
                
                const testScores = [
                    { score: existing.score - 10, expected: 'SKIP (lower)' },
                    { score: existing.score, expected: 'SKIP (equal)' }, 
                    { score: existing.score + 50, expected: 'UPDATE (higher)' }
                ];
                
                testScores.forEach(test => {
                    console.log(`   Score ${test.score}: ${test.expected}`);
                    
                    if (test.score > existing.score) {
                        console.log(`   → Should UPDATE record ID ${existing.id}`);
                        console.log(`   → SQL: UPDATE game_scores SET score=${test.score} WHERE id=${existing.id}`);
                    } else {
                        console.log(`   → Should return existing record (no change)`);
                    }
                });
                
                // Step 3: Test anti-cheat validation
                console.log('\n🛡️ STEP 3: Testing anti-cheat for higher score...');
                
                if (typeof window.antiCheat !== 'undefined') {
                    try {
                        const testScore = existing.score + 50;
                        
                        // Simulate a game session
                        antiCheat.startNewGame();
                        antiCheat.gameStartTime = Date.now() - 30000; // 30 seconds ago
                        antiCheat.totalGameTime = 30000; // 30 seconds of play
                        
                        // Simulate some platform jumps
                        for (let i = 0; i < 20; i++) {
                            antiCheat.trackGameEvent('platform_jump');
                        }
                        
                        const validation = antiCheat.validateScore(testScore);
                        console.log(`   Test score ${testScore}: ${validation.valid ? '✅ VALID' : '❌ INVALID'}`);
                        
                        if (!validation.valid) {
                            console.log(`   ❌ Anti-cheat rejection reasons:`);
                            validation.reasons.forEach(reason => {
                                console.log(`      - ${reason}`);
                            });
                            console.log(`   🔧 This might be why your scores aren't updating!`);
                        } else {
                            console.log(`   ✅ Anti-cheat would allow this score`);
                            
                            // Test secure submission creation
                            try {
                                const submission = antiCheat.createSecureSubmission(testScore);
                                console.log(`   ✅ Secure submission created successfully`);
                                console.log(`      Session ID: ${submission.sessionId}`);
                                console.log(`      Game Time: ${submission.gameTime}ms`);
                                console.log(`      Platforms: ${submission.platformsJumped}`);
                            } catch (submissionError) {
                                console.log(`   ❌ Secure submission failed: ${submissionError.message}`);
                            }
                        }
                    } catch (antiCheatError) {
                        console.log(`   ❌ Anti-cheat test error: ${antiCheatError.message}`);
                    }
                } else {
                    console.log('   ⚠️ Anti-cheat system not found');
                }
                
                // Step 4: Check server-side validation
                console.log('\n🔍 STEP 4: Testing server-side validation...');
                
                if (typeof window.orderTracker !== 'undefined' && typeof orderTracker.validateScoreSubmission === 'function') {
                    const testScore = existing.score + 50;
                    const testData = {
                        user_id: userId,
                        score: testScore,
                        game_time: 30000 // 30 seconds
                    };
                    
                    const serverValidation = orderTracker.validateScoreSubmission(testData);
                    console.log(`   Server validation for ${testScore}: ${serverValidation.valid ? '✅ VALID' : '❌ INVALID'}`);
                    
                    if (!serverValidation.valid) {
                        console.log(`   ❌ Server rejection reasons:`);
                        serverValidation.reasons.forEach(reason => {
                            console.log(`      - ${reason}`);
                        });
                    }
                } else {
                    console.log('   ⚠️ Server validation function not found');
                }
                
            } else {
                console.log('   📭 No existing scores found for today');
                console.log('   💡 Next score should INSERT a new record');
            }
            
            // Step 5: Summary and recommendations
            console.log('\n📋 SUMMARY & RECOMMENDATIONS:');
            console.log('✅ Database constraints are working (no duplicates)');
            
            if (existingScores.length > 0) {
                console.log(`📊 You have 1 score today: ${existingScores[0].score}`);
                console.log('💡 To test score updates:');
                console.log('   1. Play the game and get a score higher than ' + existingScores[0].score);
                console.log('   2. Check browser console for any error messages');
                console.log('   3. If it fails, the anti-cheat or server validation might be blocking it');
            }
            
            return {
                userId: userId,
                username: username,
                gameDate: gameDate,
                existingScores: existingScores,
                testCompleted: true
            };
            
        } catch (error) {
            console.error('❌ Test error:', error);
            return { error: error.message };
        }
    }
    
    return testUpdateLogic();
})();