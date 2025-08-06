// Simple score update debug
(async function() {
    console.log('🔍 SIMPLE SCORE DEBUG...');
    
    // Get user info
    const userId = twitterAuth.user.id;
    const username = twitterAuth.user.username;
    console.log(`👤 User: @${username} (${userId})`);
    
    // Get current date
    const gameDate = leaderboard.getCurrentGameDate();
    console.log(`📅 Game date: ${gameDate}`);
    
    // Check current scores
    const { data: scores, error } = await supabaseClient
        .from('game_scores')
        .select('*')
        .eq('user_id', userId)
        .eq('game_date', gameDate)
        .order('score', { ascending: false });
    
    if (error) {
        console.error('❌ Error:', error);
        return;
    }
    
    console.log(`📊 Found ${scores.length} scores for ${gameDate}:`);
    scores.forEach((s, i) => {
        console.log(`  ${i+1}. Score: ${s.score}, Time: ${new Date(s.created_at).toLocaleString()}`);
    });
    
    if (scores.length > 1) {
        console.log('🚨 MULTIPLE SCORES FOUND - Database constraint not working!');
    } else if (scores.length === 1) {
        console.log('✅ One score found - constraint working');
        console.log(`💡 To update: score higher than ${scores[0].score}`);
    } else {
        console.log('📭 No scores found for today');
    }
    
    return scores;
})();