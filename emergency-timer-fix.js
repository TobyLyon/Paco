// ===== EMERGENCY LEADERBOARD TIMER FIX (PST) =====
// Run this in your browser console IMMEDIATELY to fix the premature reset

(function() {
    console.log('🚨 EMERGENCY: Fixing premature leaderboard reset (PST timezone)...');
    
    // Calculate what the reset time SHOULD be (24 hours from contest start)
    // Using PST timezone instead of UTC
    const now = new Date();
    
    // Create PST midnight for today
    const pstMidnight = new Date();
    pstMidnight.setUTCHours(8, 0, 0, 0); // 8 AM UTC = Midnight PST
    
    // If we're past PST midnight, use yesterday's PST midnight as start
    const originalStartTime = now.getTime() >= pstMidnight.getTime() ? 
        pstMidnight : 
        new Date(pstMidnight.getTime() - (24 * 60 * 60 * 1000));
    
    // Calculate how long the contest has been running
    const contestRunTime = now.getTime() - originalStartTime.getTime();
    const hoursRunning = contestRunTime / (1000 * 60 * 60);
    
    console.log(`⏰ Contest has been running for ${hoursRunning.toFixed(1)} hours`);
    
    // Set reset time to next PST midnight (24 hours from PST midnight start)
    const nextPstMidnight = new Date(originalStartTime.getTime() + (24 * 60 * 60 * 1000));
    
    // If that time is in the past, extend to the next PST midnight
    const finalResetTime = nextPstMidnight.getTime() < now.getTime() ? 
        new Date(nextPstMidnight.getTime() + (24 * 60 * 60 * 1000)) : 
        nextPstMidnight;
    
    console.log(`🎯 Setting correct PST reset time to: ${finalResetTime.toLocaleString()}`);
    console.log(`📍 That's PST midnight (8 AM UTC)`);
    
    // Force set the correct reset time
    const resetData = {
        resetTime: finalResetTime.toISOString(),
        extendedAt: now.toISOString(),
        hoursExtended: 24,
        emergencyFix: true,
        timezone: 'PST',
        originalIssue: 'Premature UTC midnight reset - fixed to PST'
    };
    
    localStorage.setItem('leaderboard_reset_time', JSON.stringify(resetData));
    
    // Clear any cached timer state that might interfere
    localStorage.removeItem('timer_display_state');
    
    // Calculate remaining time
    const remaining = finalResetTime.getTime() - now.getTime();
    const hoursRemaining = Math.floor(remaining / (1000 * 60 * 60));
    const minutesRemaining = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    
    console.log(`✅ FIXED! Contest now has ${hoursRemaining}h ${minutesRemaining}m remaining`);
    console.log(`🔄 Refresh the leaderboard to see the corrected timer`);
    
    return {
        originalRunTime: hoursRunning,
        newResetTime: finalResetTime,
        timeRemaining: `${hoursRemaining}h ${minutesRemaining}m`
    };
})();