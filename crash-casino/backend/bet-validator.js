/**
 * 🛡️ Comprehensive Bet Validation System
 * 
 * Validates all bet parameters and prevents invalid bets
 */

const InputValidator = require('../utils/input-validator');

class BetValidator {
    constructor(config = {}) {
        this.config = {
            minBet: config.minBet || 0.001,     // 0.001 ETH minimum
            maxBet: config.maxBet || 100.0,     // 100 ETH maximum
            maxMultiplier: config.maxMultiplier || 1000.0,
            minMultiplier: config.minMultiplier || 1.01,
            maxBetsPerPlayer: config.maxBetsPerPlayer || 1,
            maxBetsPerRound: config.maxBetsPerRound || 1000,
            betCooldownMs: config.betCooldownMs || 1000, // 1 second between bets
            ...config
        };
        
        // Track recent bets for rate limiting
        this.recentBets = new Map(); // playerId -> timestamp
        this.roundBetCount = 0;
        
        console.log('🛡️ BetValidator initialized with config:', this.config);
    }
    
    /**
     * Validate a bet comprehensively
     * @param {string} playerId - Player identifier
     * @param {string|number} betAmount - Bet amount in ETH
     * @param {number} payoutMultiplier - Target payout multiplier
     * @param {Array} activePlayersList - List of currently active players
     * @param {Map} queuedBets - Map of queued bets
     * @param {string} betType - Type of bet ('balance' or 'blockchain')
     * @returns {object} Validated bet data
     * @throws {Error} If validation fails
     */
    validateBet(playerId, betAmount, payoutMultiplier, activePlayersList, queuedBets, betType = 'balance') {
        try {
            // Validate inputs using InputValidator
            const validatedAmount = InputValidator.validateAmount(betAmount);
            const validatedMultiplier = InputValidator.validateMultiplier(payoutMultiplier);
            const sanitizedPlayerId = InputValidator.sanitizeString(playerId, 100);
            
            // Check bet amount limits
            this.validateBetAmount(validatedAmount);
            
            // Check multiplier limits
            this.validateMultiplier(validatedMultiplier);
            
            // Check duplicate bets
            this.validateNoDuplicateBets(sanitizedPlayerId, activePlayersList, queuedBets);
            
            // Check rate limiting
            this.validateRateLimit(sanitizedPlayerId);
            
            // Check round limits
            this.validateRoundLimits();
            
            // Validate bet type
            this.validateBetType(betType);
            
            // Update tracking
            this.recentBets.set(sanitizedPlayerId, Date.now());
            this.roundBetCount++;
            
            console.log(`✅ Bet validation passed: ${sanitizedPlayerId} - ${validatedAmount} ETH @ ${validatedMultiplier}x (${betType})`);
            
            return {
                playerId: sanitizedPlayerId,
                amount: validatedAmount,
                multiplier: validatedMultiplier,
                type: betType
            };
            
        } catch (error) {
            console.error('❌ Bet validation failed:', error.message);
            throw error;
        }
    }
    
    /**
     * Validate bet amount is within limits
     */
    validateBetAmount(amount) {
        // Convert string amount to number for validation
        const amountNum = typeof amount === 'string' ? parseFloat(amount) : amount;
        
        if (amountNum < this.config.minBet) {
            throw new Error(`Minimum bet is ${this.config.minBet} ETH`);
        }
        if (amountNum > this.config.maxBet) {
            throw new Error(`Maximum bet is ${this.config.maxBet} ETH`);
        }
        
        // Additional validation for unusual amounts
        if (amountNum > 10 && amountNum % 0.001 !== 0) {
            throw new Error('Large bets must be in increments of 0.001 ETH');
        }
    }
    
    /**
     * Validate payout multiplier is within limits
     */
    validateMultiplier(multiplier) {
        if (multiplier < this.config.minMultiplier) {
            throw new Error(`Minimum multiplier is ${this.config.minMultiplier}x`);
        }
        if (multiplier > this.config.maxMultiplier) {
            throw new Error(`Maximum multiplier is ${this.config.maxMultiplier}x`);
        }
        
        // Validate reasonable precision (no more than 2 decimal places)
        if (Math.round(multiplier * 100) !== multiplier * 100) {
            throw new Error('Multiplier can have at most 2 decimal places');
        }
    }
    
    /**
     * Validate player doesn't have duplicate bets
     */
    validateNoDuplicateBets(playerId, activePlayersList, queuedBets) {
        if (activePlayersList.includes(playerId)) {
            throw new Error('Player already has an active bet');
        }
        if (queuedBets.has(playerId)) {
            throw new Error('Player already has a bet queued for next round');
        }
    }
    
    /**
     * Validate rate limiting (prevent spam betting)
     */
    validateRateLimit(playerId) {
        const lastBetTime = this.recentBets.get(playerId);
        if (lastBetTime) {
            const timeSinceLastBet = Date.now() - lastBetTime;
            if (timeSinceLastBet < this.config.betCooldownMs) {
                const remainingMs = this.config.betCooldownMs - timeSinceLastBet;
                throw new Error(`Please wait ${Math.ceil(remainingMs / 1000)} seconds before placing another bet`);
            }
        }
    }
    
    /**
     * Validate round hasn't exceeded maximum bets
     */
    validateRoundLimits() {
        if (this.roundBetCount >= this.config.maxBetsPerRound) {
            throw new Error('Maximum bets per round exceeded');
        }
    }
    
    /**
     * Validate bet type is supported
     */
    validateBetType(betType) {
        const validTypes = ['balance', 'blockchain'];
        if (!validTypes.includes(betType)) {
            throw new Error(`Invalid bet type: ${betType}. Must be one of: ${validTypes.join(', ')}`);
        }
    }
    
    /**
     * Reset round-specific counters when new round starts
     */
    resetRoundCounters() {
        this.roundBetCount = 0;
        console.log('🧹 BetValidator round counters reset');
    }
    
    /**
     * Clean up old rate limit entries
     */
    cleanupRateLimits() {
        const now = Date.now();
        const maxAge = this.config.betCooldownMs * 10; // Keep for 10x cooldown period
        
        for (const [playerId, timestamp] of this.recentBets.entries()) {
            if (now - timestamp > maxAge) {
                this.recentBets.delete(playerId);
            }
        }
    }
    
    /**
     * Get validation statistics
     */
    getStats() {
        return {
            roundBetCount: this.roundBetCount,
            recentBetsTracked: this.recentBets.size,
            config: this.config
        };
    }
    
    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console.log('🔧 BetValidator config updated:', newConfig);
    }
}

module.exports = BetValidator;
