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
        // Only check timing safety, allow any multiplier (even losses)
        const buffer = 0.01;
        return multiplier < (crashPoint - buffer);
    }
    
    /**
     * Check if multiplier represents a profitable cashout
     * @param {number} multiplier - Current calculated multiplier  
     * @returns {boolean} True if multiplier is profitable (2.0x or higher)
     */
    static isProfitable(multiplier) {
        return multiplier >= 2.0;
    }
    
    /**
     * Calculate loss/gain from cashout
     * @param {number} betAmount - Original bet amount
     * @param {number} multiplier - Cashout multiplier
     * @returns {object} {isProfit: boolean, amount: number, percentage: number}
     */
    static calculateCashoutResult(betAmount, multiplier) {
        const payout = betAmount * multiplier;
        const netResult = payout - betAmount;
        const isProfit = netResult > 0;
        const percentage = ((payout - betAmount) / betAmount) * 100;
        
        return {
            isProfit,
            netResult: Math.abs(netResult), // Always positive for display
            percentage: Math.abs(percentage), // Always positive for display
            payout,
            originalBet: betAmount
        };
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
