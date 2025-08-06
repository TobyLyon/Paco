// ===== DEBUG CURRENT SCORE UPDATE ISSUE =====
// Let's see exactly what's happening with score updates

(function() {
    console.log('🔍 DEBUGGING CURRENT SCORE UPDATE ISSUE...');
    
    // Try different ways to find Supabase client
    let supabase = null;
    if (typeof window.supabaseClient !== 'undefined') {
        supabase = window.supabaseClient;
    } else if (typeof window.supabase !== 'undefined') {
        supabase = window.supabase;
    } else if (typeof supabaseClient !== 'undefined') {
        supabase = supabaseClient;
    } else {
        // Try to find it in global scope
        const globals = Object.keys(window).filter(k => k.toLowerCase().includes('supabase'));
        console.log('🔍 Available Supabase globals:', globals);
        if (globals.length > 0) {
            supabase = window[globals[0]];
        }
    }
    
    if (!supabase) {
        console.log('❌ Supabase client not found. Available globals:');
        console.log(Object.keys(window).filter(k => k.toLowerCase().includes('supabase') || k.toLowerCase().includes('client')));
        return { error: 'Supabase not available' };
    }
    
    console.log('✅ Found Supabase client');
    
    async function debugCurrentIssue() {
        try {
            // Get current user info
            const twitterAuth = window.twitterAuth;
            if (!twitterAuth || !twitterAuth.user) {
                console.log('❌ No Twitter auth found. Please authenticate first.');
                return;
            }
            
            const userId = twitterAuth.user.id;
            const username = twitterAuth.user.username;
            
            console.log(`👤 Debugging for: @${username} (ID: ${userId})`);
            
            // Check what the game thinks the current date is
            let gameDate = null;
            if (typeof window.leaderboard !== 'undefined') {
                gameDate = leaderboard.getCurrentGameDate();
                console.log(`📅 Game thinks current date is: ${gameDate}`);
            }
            
            if (!gameDate) {
                // Fallback to PST calculation
                const now = new Date();
                const pstTime = new Date(now.getTime() - (8 * 60 * 60 * 1000));
                gameDate = pstTime.getUTCFullYear() + '-' + 
                          String(pstTime.getUTCMonth() + 1).padStart(2, '0') + '-' + 
                          String(pstTime.getUTCDate()).padStart(2, '0');
                console.log(`📅 Calculated PST date: ${gameDate}`);
            }
            
            // Step 1: Check database constraints
            console.log('\n🔍 STEP 1: Checking database constraints...');
            
            try {
                const { data: constraints, error: constraintError } = await supabase
                    .from('pg_constraint')
                    .select('conname, pg_get_constraintdef(oid) as definition')
                    .eq('conrelid', 'game_scores'::regclass)
                    .eq('contype', 'u');
                
                if (!constraintError && constraints) {
                    console.log('📋 Current unique constraints:');
                    constraints.forEach(c => {
                        console.log(`   ${c.conname}: ${c.definition}`);
                    });
                    
                    const hasOldConstraint = constraints.some(c => c.conname === 'game_scores_user_id_game_date_score_key');
                    const hasNewConstraint = constraints.some(c => c.conname === 'game_scores_user_date_unique');
                    
                    console.log(`🔍 Old constraint (bad): ${hasOldConstraint ? '⚠️ STILL ACTIVE' : '✅ Removed'}`);
                    console.log(`🔍 New constraint (good): ${hasNewConstraint ? '✅ Active' : '❌ Missing'}`);
                    
                    if (hasOldConstraint) {
                        console.log('🚨 PROBLEM: Old constraint still allows multiple scores per user!');
                        console.log('🔧 SOLUTION: Run the database constraint fix SQL');
                    }
                } else {
                    console.log('⚠️ Could not check constraints directly, trying alternative method...');
                    
                    // Alternative: Try to insert a duplicate and see what happens
                    console.log('🧪 Testing duplicate prevention by attempting duplicate insert...');
                }
            } catch (constraintCheckError) {
                console.log('⚠️ Could not check constraints:', constraintCheckError.message);
            }
            
            // Step 2: Check your current scores for today
            console.log('\n🔍 STEP 2: Checking your current scores for today...');
            
            const { data: userScores, error: scoresError } = await supabase
                .from('game_scores')
                .select('*')
                .eq('user_id', userId)
                .eq('game_date', gameDate)
                .order('score', { ascending: false });
            
            if (scoresError) {
                console.error('❌ Error fetching user scores:', scoresError);
                return;
            }
            
            console.log(`📊 Found ${userScores.length} scores for you on ${gameDate}:`);
            userScores.forEach((score, index) => {
                console.log(`  ${index + 1}. Score: ${score.score}, Time: ${new Date(score.created_at).toLocaleTimeString()}, ID: ${score.id}`);
            });
            
            if (userScores.length > 1) {
                console.log('🚨 PROBLEM CONFIRMED: Multiple scores found!');
                console.log('💡 This means the database constraint is NOT working properly.');
                console.log('🔧 You need to run the database constraint fix SQL script.');
            } else if (userScores.length === 1) {
                console.log('✅ Only one score found (good)');
                console.log('💡 If your higher score didn\'t update, the update logic might be failing.');
                
                // Test the update logic
                console.log('\n🧪 STEP 3: Testing update logic...');
                const currentScore = userScores[0];
                console.log(`📊 Your current score: ${currentScore.score}`);
                console.log(`💡 If you score higher than ${currentScore.score}, it should UPDATE record ID ${currentScore.id}`);
                
                // Check if anti-cheat might be blocking updates
                if (typeof antiCheat !== 'undefined') {
                    console.log('\n🛡️ STEP 4: Testing anti-cheat validation...');
                    try {
                        const testScore = currentScore.score + 50;
                        antiCheat.startNewGame();
                        antiCheat.gameStartTime = Date.now() - 30000; // 30 seconds ago
                        antiCheat.totalGameTime = 30000;
                        
                        const validation = antiCheat.validateScore(testScore);
                        console.log(`🧪 Test score ${testScore}: ${validation.valid ? '✅ PASS' : '❌ FAIL'}`);
                        if (!validation.valid) {
                            console.log(`   Reasons: ${validation.reasons.join(', ')}`);
                        }
                    } catch (antiCheatError) {
                        console.log(`⚠️ Anti-cheat test failed: ${antiCheatError.message}`);
                    }
                }
            } else {
                console.log('📭 No scores found for today');
            }
            
            return {
                userId: userId,
                username: username,
                gameDate: gameDate,
                scoresCount: userScores.length,
                scores: userScores
            };
            
        } catch (error) {
            console.error('❌ Debug error:', error);
            return { error: error.message };
        }
    }
    
    return debugCurrentIssue();
})();