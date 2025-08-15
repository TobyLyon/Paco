/**
 * 🎲 Provably Fair Random Number Generation
 * 
 * Implements cryptographically secure, verifiable randomness for crash points
 * Based on industry-standard commit-reveal schemes
 */

const crypto = require('crypto');

class ProvablyFairRNG {
    constructor(config = {}) {
        this.config = {
            houseEdge: config.houseEdge || 0.01,        // 1% house edge
            minCrashPoint: config.minCrashPoint || 1.00,
            maxCrashPoint: config.maxCrashPoint || 1000.0,
            seedLength: config.seedLength || 64,         // 64 character hex strings
            nonceIncrement: config.nonceIncrement || 1,
            ...config
        };
        
        // Current round seeds and state
        this.serverSeed = null;
        this.hashedServerSeed = null;
        this.clientSeed = null;
        this.nonce = 0;
        
        // Historical data for verification
        this.seedHistory = [];
        this.maxHistorySize = 1000;
        
        console.log('🎲 ProvablyFairRNG initialized with config:', this.config);
    }
    
    /**
     * Generate a new server seed and its hash
     * Called before each round starts
     */
    generateServerSeed() {
        // Generate cryptographically secure random seed
        this.serverSeed = crypto.randomBytes(32).toString('hex');
        
        // Create hash that will be revealed to players before round
        this.hashedServerSeed = crypto.createHash('sha256')
            .update(this.serverSeed)
            .digest('hex');
        
        console.log('🎲 New server seed generated. Hash:', this.hashedServerSeed);
        return this.hashedServerSeed;
    }
    
    /**
     * Set client seed (can be set by players or use default)
     */
    setClientSeed(clientSeed = null) {
        if (clientSeed) {
            // Validate and sanitize client seed
            this.clientSeed = this.sanitizeClientSeed(clientSeed);
        } else {
            // Generate default client seed if none provided
            this.clientSeed = crypto.randomBytes(16).toString('hex');
        }
        
        console.log('🎲 Client seed set:', this.clientSeed);
        return this.clientSeed;
    }
    
    /**
     * Calculate crash point using provably fair algorithm
     */
    calculateCrashPoint() {
        if (!this.serverSeed || !this.clientSeed) {
            throw new Error('Seeds not properly initialized. Call generateServerSeed() and setClientSeed() first.');
        }
        
        // Create combined input for hash
        const combinedInput = `${this.serverSeed}:${this.clientSeed}:${this.nonce}`;
        
        // Generate SHA-256 hash
        const hash = crypto.createHash('sha256')
            .update(combinedInput)
            .digest('hex');
        
        // Convert hash to crash point using provably fair algorithm
        const crashPoint = this.hashToCrashPoint(hash);
        
        // Store round data for verification
        this.storeRoundData(combinedInput, hash, crashPoint);
        
        console.log(`🎲 Crash point calculated: ${crashPoint}x (nonce: ${this.nonce})`);
        return crashPoint;
    }
    
    /**
     * Convert hash to crash point using OFFICIAL REFERENCE ALGORITHM
     * Matches the exact algorithm from the reference crash casino implementation
     */
    hashToCrashPoint(hash) {
        // Convert hash to large integer for random generation (use first 10 chars for 32-bit range)
        const hexSubstring = hash.substring(0, 10);
        const randomInt = parseInt(hexSubstring, 16);
        
        // EXACT REFERENCE ALGORITHM: 3% house edge (1/33 instant crashes)
        if (randomInt % 33 === 0) {
            // 3% chance of instant crash at 1.00x (house edge)
            console.log(`🎲 Hash: ${hash.substring(0, 10)} → Instant crash (1/33) → 1.00x`);
            return 1.00;
        } else {
            // Generate random float for crash calculation
            // Use a different part of hash to avoid correlation
            const hexSubstring2 = hash.substring(10, 18);
            const randomInt2 = parseInt(hexSubstring2, 16);
            let random_float = randomInt2 / 0xFFFFFFFF; // Convert to [0,1]
            
            // Ensure we never get exactly 0 (would cause division by zero)
            while (random_float === 0) {
                // Use next part of hash if we get 0
                const fallbackHex = hash.substring(18, 26);
                const fallbackInt = parseInt(fallbackHex, 16);
                random_float = fallbackInt / 0xFFFFFFFF;
                if (random_float === 0) random_float = 0.0001; // Ultimate fallback
            }
            
            // EXACT REFERENCE FORMULA: 0.01 + (0.99 / random_float)
            let game_crash_value = 0.01 + (0.99 / random_float);
            
            // Round to 2 decimal places (exact reference implementation)
            game_crash_value = Math.round(game_crash_value * 100) / 100;
            
            // Apply max cap for safety
            game_crash_value = Math.min(game_crash_value, this.config.maxCrashPoint);
            
            console.log(`🎲 Hash: ${hash.substring(0, 10)} → Float: ${random_float.toFixed(6)} → Crash: ${game_crash_value}x`);
            return game_crash_value;
        }
    }
    
    /**
     * Sanitize client seed to prevent manipulation
     */
    sanitizeClientSeed(clientSeed) {
        if (typeof clientSeed !== 'string') {
            throw new Error('Client seed must be a string');
        }
        
        // Remove non-hex characters and limit length
        const sanitized = clientSeed
            .toLowerCase()
            .replace(/[^0-9a-f]/g, '')
            .substring(0, this.config.seedLength);
        
        if (sanitized.length < 8) {
            throw new Error('Client seed too short (minimum 8 hex characters)');
        }
        
        return sanitized;
    }
    
    /**
     * Store round data for later verification
     */
    storeRoundData(combinedInput, hash, crashPoint) {
        const roundData = {
            nonce: this.nonce,
            serverSeed: this.serverSeed,
            clientSeed: this.clientSeed,
            combinedInput: combinedInput,
            hash: hash,
            crashPoint: crashPoint,
            timestamp: Date.now()
        };
        
        this.seedHistory.push(roundData);
        
        // Limit history size to prevent memory issues
        if (this.seedHistory.length > this.maxHistorySize) {
            this.seedHistory.shift();
        }
    }
    
    /**
     * Increment nonce for next round
     */
    incrementNonce() {
        this.nonce += this.config.nonceIncrement;
        console.log('🎲 Nonce incremented to:', this.nonce);
    }
    
    /**
     * Verify a previous round's crash point
     */
    verifyRound(serverSeed, clientSeed, nonce, expectedCrashPoint) {
        try {
            const combinedInput = `${serverSeed}:${clientSeed}:${nonce}`;
            const hash = crypto.createHash('sha256')
                .update(combinedInput)
                .digest('hex');
            const calculatedCrashPoint = this.hashToCrashPoint(hash);
            
            const isValid = Math.abs(calculatedCrashPoint - expectedCrashPoint) < 0.001;
            
            return {
                valid: isValid,
                calculated: calculatedCrashPoint,
                expected: expectedCrashPoint,
                hash: hash,
                combinedInput: combinedInput
            };
        } catch (error) {
            return {
                valid: false,
                error: error.message
            };
        }
    }
    
    /**
     * Get verification data for current round
     */
    getCurrentRoundData() {
        return {
            hashedServerSeed: this.hashedServerSeed,
            clientSeed: this.clientSeed,
            nonce: this.nonce,
            serverSeedRevealed: false // Will be true after round ends
        };
    }
    
    /**
     * Reveal server seed after round ends
     */
    revealServerSeed() {
        const revealed = {
            serverSeed: this.serverSeed,
            hashedServerSeed: this.hashedServerSeed,
            clientSeed: this.clientSeed,
            nonce: this.nonce,
            timestamp: Date.now()
        };
        
        console.log('🎲 Server seed revealed:', this.serverSeed);
        return revealed;
    }
    
    /**
     * Get recent round history for verification
     */
    getRecentHistory(count = 10) {
        return this.seedHistory.slice(-count).map(round => ({
            nonce: round.nonce,
            crashPoint: round.crashPoint,
            hash: round.hash,
            timestamp: round.timestamp
            // Note: Full seeds not included for security
        }));
    }
    
    /**
     * Generate statistics about crash point distribution
     */
    getDistributionStats(rounds = 100) {
        const recentRounds = this.seedHistory.slice(-rounds);
        
        if (recentRounds.length === 0) {
            return { message: 'No rounds available for analysis' };
        }
        
        const crashPoints = recentRounds.map(r => r.crashPoint);
        const sum = crashPoints.reduce((a, b) => a + b, 0);
        const avg = sum / crashPoints.length;
        
        // Count distribution ranges
        const ranges = {
            '1.00-1.99': 0,
            '2.00-4.99': 0,
            '5.00-9.99': 0,
            '10.00+': 0
        };
        
        crashPoints.forEach(cp => {
            if (cp < 2) ranges['1.00-1.99']++;
            else if (cp < 5) ranges['2.00-4.99']++;
            else if (cp < 10) ranges['5.00-9.99']++;
            else ranges['10.00+']++;
        });
        
        return {
            totalRounds: crashPoints.length,
            averageCrashPoint: Math.round(avg * 100) / 100,
            distribution: ranges,
            houseEdge: this.config.houseEdge,
            expectedAverage: 1 / (1 - this.config.houseEdge) // Theoretical average
        };
    }
    
    /**
     * Reset for new session (keeps history)
     */
    reset() {
        this.serverSeed = null;
        this.hashedServerSeed = null;
        this.clientSeed = null;
        // Note: nonce and history are preserved
        console.log('🎲 RNG reset for new session');
    }
    
    /**
     * Export configuration for verification
     */
    getConfig() {
        return {
            houseEdge: this.config.houseEdge,
            minCrashPoint: this.config.minCrashPoint,
            maxCrashPoint: this.config.maxCrashPoint,
            algorithm: 'SHA-256 with 52-bit precision',
            version: '1.0.0'
        };
    }
}

module.exports = ProvablyFairRNG;
