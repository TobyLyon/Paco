// Remove fraudulent scores from Supabase database
// Run this in browser console on your game page

async function removeFraudulentScores() {
    console.log('🗑️ REMOVING FRAUDULENT SCORES FROM DATABASE');
    console.log('⚠️ This will permanently delete scores above 1 million points');
    
    if (!orderTracker) {
        console.error('❌ OrderTracker not available');
        return;
    }
    
    try {
        // First, let's see what we're about to delete
        console.log('🔍 Step 1: Identifying fraudulent scores...');
        
        const leaderboardResult = await orderTracker.getTodayLeaderboard();
        if (!leaderboardResult.success) {
            console.error('❌ Failed to fetch leaderboard:', leaderboardResult.error);
            return;
        }
        
        const allScores = leaderboardResult.data || [];
        const fraudulentScores = allScores.filter(score => score.score >= 1000000);
        
        console.log(`📊 Found ${fraudulentScores.length} fraudulent score(s) to remove:`);
        fraudulentScores.forEach(score => {
            console.log(`   - ${score.username}: ${score.score.toLocaleString()} points (${score.created_at})`);
        });
        
        if (fraudulentScores.length === 0) {
            console.log('✅ No fraudulent scores found to remove');
            return;
        }
        
        // Confirm deletion
        const confirmed = confirm(`Are you sure you want to delete ${fraudulentScores.length} fraudulent score(s)?`);
        if (!confirmed) {
            console.log('❌ Deletion cancelled by user');
            return;
        }
        
        console.log('🗑️ Step 2: Removing fraudulent scores...');
        
        // Note: We'll need to use Supabase directly since OrderTracker doesn't have a delete method
        if (typeof supabase === 'undefined') {
            console.error('❌ Supabase client not available');
            console.log('📝 Please run this SQL command in your Supabase dashboard:');
            console.log('   DELETE FROM game_scores WHERE score >= 1000000;');
            return;
        }
        
        // Delete fraudulent scores
        const { data, error } = await supabase
            .from('game_scores')
            .delete()
            .gte('score', 1000000);
        
        if (error) {
            console.error('❌ Failed to delete fraudulent scores:', error);
            console.log('📝 Please run this SQL command in your Supabase dashboard:');
            console.log('   DELETE FROM game_scores WHERE score >= 1000000;');
            return;
        }
        
        console.log('✅ Successfully removed fraudulent scores from database!');
        console.log('🔄 Refreshing leaderboard...');
        
        // Refresh leaderboard
        if (typeof leaderboard !== 'undefined' && leaderboard.fetchTodayLeaderboard) {
            await leaderboard.fetchTodayLeaderboard();
            console.log('✅ Leaderboard refreshed');
        }
        
        console.log('🎉 Cleanup complete! Leaderboard integrity restored.');
        
    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        console.log('📝 Please manually delete from Supabase dashboard or run:');
        console.log('   DELETE FROM game_scores WHERE score >= 1000000;');
    }
}

// Also create a function to flag suspicious scores for review
async function flagSuspiciousScores() {
    console.log('🚩 FLAGGING SUSPICIOUS SCORES FOR REVIEW');
    
    if (typeof supabase === 'undefined') {
        console.log('📝 Please run this SQL command in your Supabase dashboard:');
        console.log('   ALTER TABLE game_scores ADD COLUMN IF NOT EXISTS flagged_for_review BOOLEAN DEFAULT FALSE;');
        console.log('   UPDATE game_scores SET flagged_for_review = true WHERE score > 50000 AND score < 1000000;');
        return;
    }
    
    try {
        // First add the column if it doesn't exist
        console.log('📝 Note: You may need to add a flagged_for_review column to your table first');
        
        // Flag scores over 50k for manual review
        const { data, error } = await supabase
            .from('game_scores')
            .update({ flagged_for_review: true })
            .gt('score', 50000)
            .lt('score', 1000000);
        
        if (error) {
            console.error('❌ Failed to flag suspicious scores:', error);
        } else {
            console.log('✅ Suspicious scores flagged for review');
        }
        
    } catch (error) {
        console.error('❌ Error flagging scores:', error);
    }
}

// Export functions for manual use
window.removeFraudulentScores = removeFraudulentScores;
window.flagSuspiciousScores = flagSuspiciousScores;

console.log('🛠️ Cleanup tools loaded:');
console.log('   Run: removeFraudulentScores() - Remove scores above 1M');
console.log('   Run: flagSuspiciousScores() - Flag scores 50k-1M for review');
