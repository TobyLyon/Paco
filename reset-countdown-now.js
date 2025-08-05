// One-time countdown reset to 24 hours from now
// Run this once and delete the file

console.log('🔄 Setting countdown to 24 hours from now...');

const resetData = {
    resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    extendedAt: new Date().toISOString(),
    hoursExtended: 24,
    oneTimeReset: true
};

localStorage.setItem('leaderboard_reset_time', JSON.stringify(resetData));

console.log('✅ Countdown set to:', new Date(resetData.resetTime).toLocaleString());
console.log('⏰ Contest will reset in 24 hours from now');
console.log('🎮 System will now operate normally on its own');

// Clean up - remove this script
const script = document.querySelector('script[src*="reset-countdown-now.js"]');
if (script) {
    script.remove();
}