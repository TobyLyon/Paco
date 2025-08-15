/**
 * 🎯 Centralized Multiplier Calculator
 * 
 * CRITICAL: Single source of truth for all multiplier calculations
 * Prevents race conditions between different components
 */

class MultiplierCalculator {
    /**
     * Calculate current multiplier based on elapsed time
     * @param {number} phaseStartTime - When the game phase started (timestamp)
     * @param {number} currentTime - Current timestamp (defaults to now)
     * @returns {number} Current multiplier rounded to 2 decimal places
     */
    static calculateMultiplier(phaseStartTime, currentTime = Date.now()) {
        const elapsed = (currentTime - phaseStartTime) / 1000;
        return parseFloat((1.0024 * Math.pow(1.0718, elapsed)).toFixed(2));
    }
    
    /**
     * Validate if current multiplier is safe for cashout
     * @param {number} multiplier - Current calculated multiplier
     * @param {number} crashPoint - Predetermined crash point
     * @returns {boolean} True if safe to cashout
     */
    static validateMultiplier(multiplier, crashPoint) {
        // Add small buffer to prevent timing attacks
        const buffer = 0.01;
        return multiplier < (crashPoint - buffer);
    }
    
    /**
     * Calculate exact crash timing
     * @param {number} crashPoint - Target crash multiplier
     * @returns {number} Milliseconds from start when crash should occur
     */
    static calculateCrashTiming(crashPoint) {
        // Inverse of the multiplier formula to find exact timing
        const timeSeconds = Math.log(crashPoint / 1.0024) / Math.log(1.0718);
        return Math.max(0, timeSeconds * 1000);
    }
    
    /**
     * Get safe cashout window in milliseconds before crash
     * @returns {number} Buffer time in milliseconds
     */
    static getCashoutBuffer() {
        return 50; // 50ms buffer to prevent timing attacks
    }
}

module.exports = MultiplierCalculator;
