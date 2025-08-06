// ===== RESTORE ORIGINAL DAY 1 LEADERBOARD =====
// This script restores the original Day 1 contest timing with PST midnight reset

(function() {
    console.log('🏆 RESTORING ORIGINAL DAY 1 LEADERBOARD...');
    
    const now = new Date();
    
    // Calculate when Day 1 should have originally started (yesterday PST midnight)
    const day1StartTime = new Date();
    day1StartTime.setUTCHours(8, 0, 0, 0); // PST midnight = 8 AM UTC
    
    // If we're before today's PST midnight, Day 1 started yesterday
    // If we're after today's PST midnight, Day 1 started today
    if (now.getTime() < day1StartTime.getTime()) {
        // We're still in Day 1, it started yesterday
        day1StartTime.setUTCDate(day1StartTime.getUTCDate() - 1);
    }
    
    // Day 1 should end at the next PST midnight (24 hours from start)
    const day1EndTime = new Date(day1StartTime.getTime() + (24 * 60 * 60 * 1000));
    
    console.log(`📅 Day 1 Started: ${day1StartTime.toLocaleString()} PST`);
    console.log(`📅 Day 1 Ends: ${day1EndTime.toLocaleString()} PST`);
    console.log(`📍 UTC Times: ${day1StartTime.toUTCString()} → ${day1EndTime.toUTCString()}`);
    
    // Calculate time remaining in Day 1
    const remaining = day1EndTime.getTime() - now.getTime();
    
    if (remaining > 0) {
        const hoursRemaining = Math.floor(remaining / (1000 * 60 * 60));
        const minutesRemaining = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        
        console.log(`⏰ Time remaining in Day 1: ${hoursRemaining}h ${minutesRemaining}m`);
        
        // Set the leaderboard to end at Day 1 end time
        const resetData = {
            resetTime: day1EndTime.toISOString(),
            extendedAt: now.toISOString(),
            timezone: 'PST',
            contestDay: 1,
            originalDay1: true,
            description: 'Original Day 1 contest restored with PST timing'
        };
        
        localStorage.setItem('leaderboard_reset_time', JSON.stringify(resetData));
        console.log('✅ Day 1 contest timing restored!');
        
    } else {
        console.log('⚠️ Day 1 has already ended. Setting up Day 2...');
        
        // Day 1 ended, set up Day 2 (next PST midnight)
        const day2EndTime = new Date(day1EndTime.getTime() + (24 * 60 * 60 * 1000));
        const day2Remaining = day2EndTime.getTime() - now.getTime();
        const day2Hours = Math.floor(day2Remaining / (1000 * 60 * 60));
        const day2Minutes = Math.floor((day2Remaining % (1000 * 60 * 60)) / (1000 * 60));
        
        console.log(`📅 Day 2 Ends: ${day2EndTime.toLocaleString()} PST`);
        console.log(`⏰ Time remaining in Day 2: ${day2Hours}h ${day2Minutes}m`);
        
        const resetData = {
            resetTime: day2EndTime.toISOString(),
            extendedAt: now.toISOString(),
            timezone: 'PST',
            contestDay: 2,
            originalDay1Restored: true,
            description: 'Day 2 contest with corrected PST timing'
        };
        
        localStorage.setItem('leaderboard_reset_time', JSON.stringify(resetData));
        console.log('✅ Day 2 contest timing set!');
    }
    
    // Clear any cached timer state to force refresh
    localStorage.removeItem('timer_display_state');
    
    console.log('🔄 Refresh the leaderboard to see the restored Day 1 timing!');
    console.log('🌴 All future resets will happen at PST midnight (not UTC)');
    
    return {
        day1Start: day1StartTime,
        day1End: day1EndTime,
        currentTime: now,
        timeRemaining: remaining > 0 ? `${Math.floor(remaining / (1000 * 60 * 60))}h ${Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))}m` : 'Day 1 ended',
        timezone: 'PST (UTC-8)'
    };
})();