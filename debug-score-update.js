// ===== SCORE UPDATE DEBUG SCRIPT =====
// Run this in browser console to debug why higher scores aren't updating

class ScoreUpdateDebugger {
    constructor() {
        this.debugResults = [];
    }

    async debugScoreUpdate(testScore = 26000) {
        console.log('🔍 DEBUGGING SCORE UPDATE ISSUE...');
        console.log('🎯 Test score:', testScore);
        
        if (!twitterAuth.authenticated) {
            console.error('❌ Not authenticated! Please log in first.');
            return;
        }

        const user = twitterAuth.currentUser;
        console.log('👤 User:', user.username, 'ID:', user.id);

        try {
            // Step 1: Check what's currently in the database
            await this.checkCurrentScores(user.id);
            
            // Step 2: Test the score submission logic
            await this.testScoreSubmission(testScore);
            
            // Step 3: Check database again
            await this.checkCurrentScores(user.id);
            
            console.log('🔍 Debug complete. Check results above.');
            
        } catch (error) {
            console.error('❌ Debug failed:', error);
        }
    }

    async checkCurrentScores(userId) {
        console.log('\n📊 CHECKING CURRENT DATABASE STATE...');
        
        if (!orderTracker) {
            console.error('❌ OrderTracker not available');
            return;
        }

        try {
            // Get today's date
            const today = new Date().toISOString().split('T')[0];
            console.log('📅 Today:', today);

            // Check if we can access supabase directly
            if (window.supabase) {
                const { data, error } = await window.supabase
                    .from('game_scores')
                    .select('*')
                    .eq('user_id', userId)
                    .eq('game_date', today)
                    .order('score', { ascending: false });

                if (error) {
                    console.error('❌ Database query failed:', error);
                } else {
                    console.log('📊 Current scores for user:', data);
                    if (data.length > 0) {
                        console.log('🎯 Highest score:', data[0].score);
                        console.log('📝 Record details:', data[0]);
                    } else {
                        console.log('📊 No scores found for today');
                    }
                }
            } else {
                console.log('⚠️ Direct supabase access not available');
            }

        } catch (error) {
            console.error('❌ Error checking scores:', error);
        }
    }

    async testScoreSubmission(score) {
        console.log('\n🎯 TESTING SCORE SUBMISSION...');
        console.log('📤 Submitting score:', score);

        if (!leaderboard) {
            console.error('❌ Leaderboard not available');
            return;
        }

        try {
            const result = await leaderboard.submitScore(score);
            console.log('📊 Submission result:', result);
        } catch (error) {
            console.error('❌ Score submission failed:', error);
        }
    }

    // Test with a specific score that should definitely update
    async testWithHighScore() {
        const megaScore = 99999;
        console.log(`🚀 TESTING WITH MEGA SCORE: ${megaScore}`);
        await this.debugScoreUpdate(megaScore);
    }

    // Check database constraints
    async checkDatabaseConstraints() {
        console.log('\n🔧 CHECKING DATABASE CONSTRAINTS...');
        
        if (window.supabase) {
            try {
                // Try to get schema information
                const { data, error } = await window.supabase.rpc('get_table_constraints', {
                    table_name: 'game_scores'
                });
                
                if (error) {
                    console.log('⚠️ Cannot check constraints (function may not exist)');
                } else {
                    console.log('🔧 Table constraints:', data);
                }
            } catch (error) {
                console.log('⚠️ Constraint check not available');
            }
        }
    }

    // Manual database check
    async manualDbCheck() {
        console.log('\n🔍 MANUAL DATABASE CHECK...');
        
        if (!window.supabase) {
            console.error('❌ Supabase not available');
            return;
        }

        const userId = twitterAuth.currentUser.id;
        const today = new Date().toISOString().split('T')[0];

        try {
            // Get ALL records for this user today
            const { data, error } = await window.supabase
                .from('game_scores')
                .select('*')
                .eq('user_id', userId)
                .eq('game_date', today)
                .order('created_at', { ascending: true });

            if (error) {
                console.error('❌ Query failed:', error);
            } else {
                console.log('📊 ALL records for user today:');
                data.forEach((record, index) => {
                    console.log(`   ${index + 1}. Score: ${record.score}, Created: ${record.created_at}, ID: ${record.id}`);
                });

                if (data.length > 1) {
                    console.warn('⚠️ FOUND MULTIPLE RECORDS! This suggests the constraint is not working.');
                }
            }
        } catch (error) {
            console.error('❌ Manual check failed:', error);
        }
    }

    // Full diagnostic
    async fullDiagnostic() {
        console.log('🚀 RUNNING FULL SCORE UPDATE DIAGNOSTIC...');
        await this.checkCurrentScores(twitterAuth.currentUser.id);
        await this.checkDatabaseConstraints();
        await this.manualDbCheck();
        console.log('✅ Full diagnostic complete');
    }
}

// Create global instance
window.scoreDebugger = new ScoreUpdateDebugger();

console.log('🔧 Score Update Debugger loaded!');
console.log('📖 Usage:');
console.log('   scoreDebugger.debugScoreUpdate(26000)  - Debug with your 26k score');
console.log('   scoreDebugger.testWithHighScore()      - Test with 99,999 score');
console.log('   scoreDebugger.fullDiagnostic()         - Complete diagnostic');
console.log('   scoreDebugger.manualDbCheck()          - Check for duplicate records');