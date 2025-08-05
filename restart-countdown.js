// Script to restart leaderboard countdown by 24 hours
// This will be automatically executed when the page loads

(function() {
    console.log('🔄 Auto-restarting leaderboard countdown by 24 hours...');
    
    // Function to restart countdown
    function restartCountdownTimer() {
        const hoursToExtend = 24;
        const newResetTime = new Date();
        newResetTime.setTime(newResetTime.getTime() + (hoursToExtend * 60 * 60 * 1000));
        
        // Save the new reset time to localStorage so it persists
        const resetData = {
            resetTime: newResetTime.toISOString(),
            extendedAt: new Date().toISOString(),
            hoursExtended: hoursToExtend,
            autoRestarted: true
        };
        localStorage.setItem('leaderboard_reset_time', JSON.stringify(resetData));
        
        console.log(`⏰ Countdown extended by ${hoursToExtend} hours`);
        console.log(`🎯 New reset time: ${newResetTime.toLocaleString()}`);
        
        // Calculate time remaining
        const now = Date.now();
        const diff = newResetTime.getTime() - now;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        console.log(`⏱️ Time remaining: ${hours}h ${minutes}m`);
        
        return newResetTime;
    }
    
    // Execute immediately
    restartCountdownTimer();
    
    // Also set up the global function if leaderboard exists
    if (typeof window !== 'undefined') {
        window.extendContestTimer = function(hours = 24) {
            console.log(`🔄 Manually extending contest timer by ${hours} hours`);
            const newTime = new Date();
            newTime.setTime(newTime.getTime() + (hours * 60 * 60 * 1000));
            
            const resetData = {
                resetTime: newTime.toISOString(),
                extendedAt: new Date().toISOString(),
                hoursExtended: hours,
                manualExtension: true
            };
            localStorage.setItem('leaderboard_reset_time', JSON.stringify(resetData));
            
            console.log(`✅ Contest timer extended to: ${newTime.toLocaleString()}`);
            
            // Refresh page to show new timer
            if (confirm('Contest timer extended! Refresh page to see updated countdown?')) {
                window.location.reload();
            }
            
            return newTime;
        };
        
        console.log('🎮 Contest timer extended! Use extendContestTimer(hours) to extend further.');
    }
})();