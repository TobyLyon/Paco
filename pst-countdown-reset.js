// ===== PST LEADERBOARD COUNTDOWN RESET =====
// Sets the leaderboard to reset at PST midnight (not UTC)

(function() {
    console.log('🌴 Setting leaderboard reset to PST midnight...');
    
    const now = new Date();
    
    // Calculate next PST midnight
    // PST is UTC-8, so PST midnight = 8 AM UTC
    const nextPstMidnight = new Date();
    nextPstMidnight.setUTCHours(8, 0, 0, 0); // 8 AM UTC = Midnight PST
    
    // If we're already past today's PST midnight, set for tomorrow
    if (now.getTime() >= nextPstMidnight.getTime()) {
        nextPstMidnight.setUTCDate(nextPstMidnight.getUTCDate() + 1);
    }
    
    console.log(`🎯 Next PST midnight: ${nextPstMidnight.toLocaleString()}`);
    console.log(`📍 That's ${nextPstMidnight.toUTCString()} (8 AM UTC)`);
    
    // Calculate time remaining
    const remaining = nextPstMidnight.getTime() - now.getTime();
    const hoursRemaining = Math.floor(remaining / (1000 * 60 * 60));
    const minutesRemaining = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    
    console.log(`⏰ Time until PST midnight: ${hoursRemaining}h ${minutesRemaining}m`);
    
    // Set the reset time in localStorage
    const resetData = {
        resetTime: nextPstMidnight.toISOString(),
        extendedAt: now.toISOString(),
        timezone: 'PST',
        pstFix: true,
        description: 'Leaderboard resets at PST midnight (8 AM UTC)'
    };
    
    localStorage.setItem('leaderboard_reset_time', JSON.stringify(resetData));
    
    // Clear any cached timer state
    localStorage.removeItem('timer_display_state');
    
    console.log('✅ PST reset time configured!');
    console.log('🔄 Refresh the leaderboard to see the PST countdown');
    
    return {
        pstMidnight: nextPstMidnight,
        utcTime: nextPstMidnight.toUTCString(),
        timeRemaining: `${hoursRemaining}h ${minutesRemaining}m`,
        timezone: 'PST (UTC-8)'
    };
})();