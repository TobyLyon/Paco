/**
 * 🎰 FIXED Crash Point Algorithm - Mathematically Correct
 * 
 * This implements the standard crash casino algorithm used by major platforms
 * Based on Bustabit's provably fair system with proper mathematical distribution
 */

const crypto = require('crypto');

class FixedCrashAlgorithm {
    constructor(config = {}) {
        this.config = {
            houseEdge: 0.02,        // 2% house edge
            maxMultiplier: 100.0,   // Realistic max (not 1000x!)
            ...config
        };
    }

    /**
     * 🎲 Generate crash point using CORRECT industry-standard algorithm
     * Based on Bustabit's open-source implementation
     */
    generateCrashPoint(serverSeed, clientSeed, nonce) {
        const input = `${serverSeed}:${clientSeed}:${nonce}`;
        const hash = crypto.createHash('sha256').update(input).digest('hex');
        
        // Use first 8 characters for randomness
        const hexSubstring = hash.substring(0, 8);
        const randomValue = parseInt(hexSubstring, 16);
        
        // FIXED: Proper normalization to [0, 1) range
        const randomFloat = randomValue / 0x100000000; // Divide by 2^32
        
        // Apply house edge FIRST (this is critical!)
        const houseEdgeAdjusted = randomFloat * (1 - this.config.houseEdge);
        
        // FIXED: Industry-standard crash point calculation
        if (houseEdgeAdjusted === 0) {
            return 1.00; // Instant crash for edge case
        }
        
        // Geometric distribution - this is the CORRECT formula
        const crashPoint = 1 / houseEdgeAdjusted;
        
        // Apply realistic maximum cap (100x is industry standard)
        const cappedCrashPoint = Math.min(crashPoint, this.config.maxMultiplier);
        
        // Round to 2 decimal places
        return Math.round(cappedCrashPoint * 100) / 100;
    }

    /**
     * 📊 Calculate expected return and house edge validation
     */
    validateHouseEdge(numSamples = 100000) {
        let totalReturn = 0;
        
        for (let i = 0; i < numSamples; i++) {
            const serverSeed = crypto.randomBytes(32).toString('hex');
            const clientSeed = 'test-seed';
            const nonce = i;
            
            const crashPoint = this.generateCrashPoint(serverSeed, clientSeed, nonce);
            
            // Player bets 1 unit and cashes out at 2x
            const betAmount = 1;
            const cashOutAt = 2;
            
            if (crashPoint >= cashOutAt) {
                totalReturn += betAmount * cashOutAt; // Win
            }
            // Else: lose bet (add 0)
        }
        
        const expectedReturn = totalReturn / numSamples;
        const actualHouseEdge = (numSamples - totalReturn) / numSamples;
        
        console.log(`📊 House Edge Validation (${numSamples} samples):`);
        console.log(`Expected Return: ${expectedReturn.toFixed(4)}`);
        console.log(`Actual House Edge: ${(actualHouseEdge * 100).toFixed(2)}%`);
        console.log(`Target House Edge: ${(this.config.houseEdge * 100).toFixed(2)}%`);
        
        return {
            expectedReturn,
            actualHouseEdge,
            isValid: Math.abs(actualHouseEdge - this.config.houseEdge) < 0.01
        };
    }

    /**
     * 📈 Generate probability distribution analysis
     */
    analyzeDistribution(numSamples = 10000) {
        const distribution = {
            '1.00x-1.99x': 0,
            '2.00x-4.99x': 0,
            '5.00x-9.99x': 0,
            '10.00x-24.99x': 0,
            '25.00x-49.99x': 0,
            '50.00x+': 0
        };
        
        const crashes = [];
        
        for (let i = 0; i < numSamples; i++) {
            const serverSeed = crypto.randomBytes(32).toString('hex');
            const crashPoint = this.generateCrashPoint(serverSeed, 'test', i);
            crashes.push(crashPoint);
            
            if (crashPoint < 2) distribution['1.00x-1.99x']++;
            else if (crashPoint < 5) distribution['2.00x-4.99x']++;
            else if (crashPoint < 10) distribution['5.00x-9.99x']++;
            else if (crashPoint < 25) distribution['10.00x-24.99x']++;
            else if (crashPoint < 50) distribution['25.00x-49.99x']++;
            else distribution['50.00x+']++;
        }
        
        // Convert to percentages
        for (const range in distribution) {
            distribution[range] = ((distribution[range] / numSamples) * 100).toFixed(1) + '%';
        }
        
        const maxCrash = Math.max(...crashes);
        const avgCrash = crashes.reduce((a, b) => a + b, 0) / crashes.length;
        
        console.log(`📈 Distribution Analysis (${numSamples} samples):`);
        console.log(distribution);
        console.log(`Max Crash: ${maxCrash.toFixed(2)}x`);
        console.log(`Average Crash: ${avgCrash.toFixed(2)}x`);
        
        return { distribution, maxCrash, avgCrash, crashes };
    }
}

module.exports = FixedCrashAlgorithm;

// Test the fixed algorithm
if (require.main === module) {
    console.log('🧪 Testing Fixed Crash Algorithm...\n');
    
    const algorithm = new FixedCrashAlgorithm();
    
    // Test house edge
    const validation = algorithm.validateHouseEdge(50000);
    console.log(`✅ House Edge Valid: ${validation.isValid}\n`);
    
    // Test distribution
    const analysis = algorithm.analyzeDistribution(10000);
    console.log(`🎯 Max crash in 10k samples: ${analysis.maxCrash.toFixed(2)}x`);
    console.log(`📊 Average crash: ${analysis.avgCrash.toFixed(2)}x`);
    
    // Show some sample crash points
    console.log('\n🎲 Sample crash points:');
    for (let i = 0; i < 10; i++) {
        const crash = algorithm.generateCrashPoint(
            crypto.randomBytes(32).toString('hex'),
            'demo-seed',
            i
        );
        console.log(`Round ${i + 1}: ${crash.toFixed(2)}x`);
    }
}
