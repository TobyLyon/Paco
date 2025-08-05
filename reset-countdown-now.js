// 🔄 MANUAL COUNTDOWN RESET - Sets countdown to 24 hours from now
// This will run automatically when the page loads

(function() {
    console.log('🔄 Manually resetting countdown to 24 hours...');
    
    // Set countdown to exactly 24 hours from now
    const resetTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    const resetData = {
        resetTime: resetTime.toISOString(),
        extendedAt: new Date().toISOString(),
        hoursExtended: 24,
        manualReset: true,
        resetBy: 'manual_script'
    };
    
    // Save to localStorage
    localStorage.setItem('leaderboard_reset_time', JSON.stringify(resetData));
    
    console.log('✅ Countdown reset successfully!');
    console.log('⏰ Contest now ends at:', resetTime.toLocaleString());
    console.log('⏱️ Time remaining: 24 hours');
    
    // If leaderboard exists, update it
    if (typeof leaderboard !== 'undefined') {
        leaderboard.dailyResetTime = resetTime;
        console.log('🏆 Leaderboard updated with new countdown time');
        
        // If leaderboard is currently visible, refresh it
        const overlay = document.getElementById('gameOverlay');
        if (overlay && overlay.classList.contains('show')) {
            leaderboard.showLeaderboard();
            console.log('🔄 Refreshed visible leaderboard with new countdown');
        }
    }
    
    // Show success notification
    if (typeof showNotification !== 'undefined') {
        showNotification('⏰ Contest extended by 24 hours!', 'success');
    }
    
    console.log('🎯 Contest countdown reset complete!');
})();

// Also add a global function for easy manual resets
window.resetCountdownTo24Hours = function() {
    console.log('🔄 Resetting countdown to 24 hours via manual command...');
    
    const resetTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const resetData = {
        resetTime: resetTime.toISOString(),
        extendedAt: new Date().toISOString(),
        hoursExtended: 24,
        manualReset: true,
        resetBy: 'manual_command'
    };
    
    localStorage.setItem('leaderboard_reset_time', JSON.stringify(resetData));
    
    if (typeof leaderboard !== 'undefined') {
        leaderboard.dailyResetTime = resetTime;
        // Refresh leaderboard if visible
        const overlay = document.getElementById('gameOverlay');
        if (overlay && overlay.classList.contains('show')) {
            leaderboard.showLeaderboard();
        }
    }
    
    console.log('✅ Countdown reset to 24 hours!');
    console.log('⏰ New end time:', resetTime.toLocaleString());
    
    return resetTime;
};

console.log('🎮 Manual countdown reset loaded! Use resetCountdownTo24Hours() anytime.');