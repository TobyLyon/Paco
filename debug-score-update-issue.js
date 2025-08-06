// ===== DEBUG SCORE UPDATE ISSUE =====
// This script checks why higher scores aren't updating properly

(function() {
    console.log('🔍 DEBUGGING SCORE UPDATE ISSUE...');
    
    // Try different ways to find Supabase client
    let supabase = null;
    if (typeof window.supabaseClient !== 'undefined') {
        supabase = window.supabaseClient;
    } else if (typeof window.supabase !== 'undefined') {
        supabase = window.supabase;
    } else if (typeof supabaseClient !== 'undefined') {
        supabase = supabaseClient;
    }
    
    if (!supabase) {
        console.log('❌ Supabase client not available. Trying global variables...');
        console.log('Available globals:', Object.keys(window).filter(k => k.toLowerCase().includes('supabase')));
        return { error: 'Supabase not available' };
    }
    
    console.log('✅ Found Supabase client');
    
    async function debugScoreUpdates() {
        try {
            const today = new Date().toISOString().split('T')[0];
            console.log(`📅 Checking scores for: ${today}`);
            
            // Step 1: Check current database constraints
            console.log('🔍 Step 1: Checking database constraints...');
            
            const { data: constraints, error: constraintError } = await supabase
                .rpc('query', {
                    query: `
                        SELECT conname, pg_get_constraintdef(oid) as definition 
                        FROM pg_constraint 
                        WHERE conrelid = 'game_scores'::regclass 
                        AND contype = 'u'
                    `
                });
            
            if (!constraintError && constraints) {
                console.log('📋 Current unique constraints:', constraints);
            } else {
                console.log('⚠️ Could not check constraints:', constraintError);
            }
            
            // Step 2: Check your current scores for today
            console.log('🔍 Step 2: Checking your current scores...');
            
            // Get current user info
            const twitterAuth = window.twitterAuth;
            if (!twitterAuth || !twitterAuth.user) {
                console.log('❌ No Twitter auth found. Please authenticate first.');
                return;
            }
            
            const userId = twitterAuth.user.id;
            const username = twitterAuth.user.username;
            
            console.log(`👤 Checking scores for: @${username} (ID: ${userId})`);
            
            // Query all scores for this user today
            const { data: userScores, error: scoresError } = await supabase
                .from('game_scores')
                .select('*')
                .eq('user_id', userId)
                .eq('game_date', today)
                .order('score', { ascending: false });
            
            if (scoresError) {
                console.error('❌ Error fetching user scores:', scoresError);
                return;
            }
            
            console.log(`📊 Found ${userScores.length} scores for you today:`);
            userScores.forEach((score, index) => {
                console.log(`  ${index + 1}. Score: ${score.score}, Time: ${new Date(score.created_at).toLocaleTimeString()}, ID: ${score.id}`);
            });
            
            if (userScores.length > 1) {
                console.log('🚨 PROBLEM DETECTED: Multiple scores found! This means the constraint is wrong.');
                console.log('💡 The database should only allow ONE score per user per day.');
                
                // Show which constraint is active
                const hasOldConstraint = constraints?.some(c => c.conname === 'game_scores_user_id_game_date_score_key');
                const hasNewConstraint = constraints?.some(c => c.conname === 'game_scores_user_date_unique');
                
                console.log(`🔍 Old constraint (allows duplicates): ${hasOldConstraint ? '✅ ACTIVE' : '❌ Not found'}`);
                console.log(`🔍 New constraint (prevents duplicates): ${hasNewConstraint ? '✅ ACTIVE' : '❌ Not found'}`);
                
                if (hasOldConstraint && !hasNewConstraint) {
                    console.log('🚨 ROOT CAUSE: Old constraint is still active, allowing multiple scores!');
                    console.log('🔧 SOLUTION: Run the database migration to fix constraints.');
                }
            } else if (userScores.length === 1) {
                console.log('✅ Only one score found (correct behavior)');
                console.log('💡 If your new higher score didn\'t update, let\'s test the update logic...');
                
                // Test if we can simulate an update
                const currentScore = userScores[0].score;
                console.log(`📊 Your current best score: ${currentScore}`);
                console.log(`💡 Next time you score higher than ${currentScore}, it should UPDATE this record.`);
                console.log(`💡 If it doesn\'t update, there might be a constraint or permission issue.`);
            } else {
                console.log('📭 No scores found for today - first score should INSERT normally.');
            }
            
            // Step 3: Test the update logic manually (simulation)
            console.log('🔍 Step 3: Testing update logic...');
            
            if (userScores.length > 0) {
                const testScore = userScores[0].score + 100; // Higher than current
                console.log(`🧪 Simulating score update: ${userScores[0].score} → ${testScore}`);
                
                // This is just a simulation, won't actually update
                console.log('💡 The code should do:');
                console.log(`   1. Check existing score: ${userScores[0].score}`);
                console.log(`   2. Compare with new score: ${testScore}`);
                console.log(`   3. Since ${testScore} > ${userScores[0].score}, UPDATE record ID ${userScores[0].id}`);
                console.log(`   4. If constraint allows it, update should succeed`);
            }
            
            return {
                userId: userId,
                username: username,
                scoresCount: userScores.length,
                scores: userScores,
                constraints: constraints,
                hasOldConstraint: constraints?.some(c => c.conname === 'game_scores_user_id_game_date_score_key'),
                hasNewConstraint: constraints?.some(c => c.conname === 'game_scores_user_date_unique')
            };
            
        } catch (error) {
            console.error('❌ Debug error:', error);
            return { error: error.message };
        }
    }
    
    return debugScoreUpdates();
})();