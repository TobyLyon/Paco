// ===== MANUAL LEADERBOARD RESET SCRIPT =====
// Use this to manually trigger a fresh leaderboard start
// COMPLETE RESET: Local cache + Database + Timer

console.log('🔄 MANUAL LEADERBOARD RESET INITIATED');

// Method 1: Reset to next day immediately
function resetLeaderboardNow() {
    console.log('💥 Forcing immediate leaderboard reset...');
    
    // Clear all cached leaderboard data
    localStorage.removeItem('leaderboard_reset_time');
    localStorage.removeItem('timer_display_state');
    localStorage.removeItem('last_leaderboard_fetch');
    
    // Set reset time to RIGHT NOW (triggers immediate reset)
    const resetData = {
        resetTime: new Date().toISOString(),
        extendedAt: new Date().toISOString(),
        timezone: 'MANUAL',
        manualReset: true,
        description: 'Manual reset - fresh start'
    };
    
    localStorage.setItem('leaderboard_reset_time', JSON.stringify(resetData));
    
    console.log('✅ Reset time set to NOW - leaderboard will reset immediately');
    console.log('🔄 Refresh the page to see the fresh leaderboard');
    
    return resetData;
}

// Method 2: Clear local data and set next standard reset
function clearAndResetToDaily() {
    console.log('🧹 Clearing leaderboard cache and setting standard daily reset...');
    
    // Clear all cached data
    localStorage.removeItem('leaderboard_reset_time');
    localStorage.removeItem('timer_display_state');
    localStorage.removeItem('last_leaderboard_fetch');
    
    console.log('✅ Leaderboard cache cleared');
    console.log('🔄 Refresh to start with fresh daily countdown');
    
    return 'Cache cleared - will use default daily reset';
}

// Method 3: Set custom reset time (hours from now)
function setCustomResetTime(hoursFromNow = 24) {
    console.log(`⏰ Setting custom reset time ${hoursFromNow} hours from now...`);
    
    const customResetTime = new Date();
    customResetTime.setHours(customResetTime.getHours() + hoursFromNow);
    
    const resetData = {
        resetTime: customResetTime.toISOString(),
        extendedAt: new Date().toISOString(),
        timezone: 'CUSTOM',
        customHours: hoursFromNow,
        description: `Custom reset in ${hoursFromNow} hours`
    };
    
    localStorage.setItem('leaderboard_reset_time', JSON.stringify(resetData));
    
    console.log(`✅ Custom reset time set: ${customResetTime.toLocaleString()}`);
    console.log('🔄 Refresh to see the new countdown');
    
    return resetData;
}

// Display options
console.log(`
🎯 LEADERBOARD RESET OPTIONS:

1. resetLeaderboardNow()       - Immediate fresh start (keeps existing scores)
2. clearAndResetToDaily()      - Clear cache, use daily reset  
3. setCustomResetTime(24)      - Custom reset in X hours
4. completeLeaderboardReset()  - 🚨 DELETE ALL SCORES + fresh start

🚀 RECOMMENDED FOR FRESH START: resetLeaderboardNow()
💥 FOR COMPLETE WIPE: completeLeaderboardReset()

Type one of the above commands to execute.
`);

// Method 4: COMPLETE DATABASE RESET (clears all scores!)
async function completeLeaderboardReset() {
    console.log('🚨 FUNCTION DISABLED - This would delete ALL historical data!');
    console.log('❌ Historical data preservation is now ENABLED');
    console.log('📊 Use daily/all-time tabs instead of deleting data');
    console.log('');
    console.log('✅ If you need to start fresh, only delete TODAY\'s scores:');
    console.log('   DELETE FROM game_scores WHERE game_date = CURRENT_DATE;');
    console.log('');
    console.log('🏆 This preserves all-time leaderboard history!');
    
    return; // Exit immediately
    
    // DISABLED - This was deleting all historical data
    /*
    console.log('💥 COMPLETE LEADERBOARD RESET - CLEARING ALL DATA!');
    console.log('⚠️  WARNING: This will delete ALL scores from the database!');
    
    if (!confirm('🚨 DELETE ALL LEADERBOARD SCORES? This cannot be undone!')) {
        console.log('❌ Reset cancelled');
        return;
    }
    
    try {
        // Step 1: Clear local cache
        localStorage.removeItem('leaderboard_reset_time');
        localStorage.removeItem('timer_display_state');
        localStorage.removeItem('last_leaderboard_fetch');
        console.log('✅ Local cache cleared');
        
        // Step 2: Try to clear database
        if (typeof supabase !== 'undefined') {
            console.log('🗑️ Clearing database scores...');
            
            const { data, error } = await supabase
                .from('game_scores')
                .delete()
                .gte('id', 0); // Delete all records
            
            if (error) {
                console.error('❌ Database clear failed:', error);
                console.log('📝 Manual SQL needed in Supabase:');
                console.log('   DELETE FROM game_scores;');
            } else {
                console.log('✅ Database cleared successfully!');
            }
        } else {
            console.log('⚠️ Supabase not available - manual database clear needed');
            console.log('📝 Run this SQL in your Supabase dashboard:');
            console.log('   DELETE FROM game_scores;');
        }
    */
        
        // Step 3: Reset timer to immediate
        const resetData = {
            resetTime: new Date().toISOString(),
            extendedAt: new Date().toISOString(),
            timezone: 'MANUAL',
            completeReset: true,
            description: 'Complete reset - fresh start with empty leaderboard'
        };
        
        localStorage.setItem('leaderboard_reset_time', JSON.stringify(resetData));
        
        console.log('🎉 COMPLETE RESET FINISHED!');
        console.log('🔄 Refresh the page for fresh leaderboard');
        
        // Try to refresh leaderboard if available
        if (typeof leaderboard !== 'undefined' && leaderboard.fetchTodayLeaderboard) {
            await leaderboard.fetchTodayLeaderboard();
            console.log('✅ Leaderboard refreshed');
        }
        
        return 'Complete reset successful';
        
    } catch (error) {
        console.error('❌ Reset error:', error);
        return 'Reset failed - check console';
    }
}

// Export functions to global scope
window.resetLeaderboardNow = resetLeaderboardNow;
window.clearAndResetToDaily = clearAndResetToDaily;
window.setCustomResetTime = setCustomResetTime;
window.completeLeaderboardReset = completeLeaderboardReset;
