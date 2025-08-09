/**
 * 🎰 INDUSTRY STANDARD Crash Algorithm - Exact Implementation
 * 
 * Based on the original wbrandon25/Online-Crash-Gambling-Simulator
 * This is the EXACT algorithm used by real crash casinos
 */

const crypto = require('crypto');

class IndustryStandardCrashAlgorithm {
    constructor(config = {}) {
        this.config = {
            houseEdge: 0.03,        // 3% house edge (standard)
            instantCrashChance: 33, // 1/33 chance of instant crash (3.03%)
            minMultiplier: 1.00,
            maxMultiplier: 1000.0,  // Safety cap
            ...config
        };
    }

    /**
     * 🎲 Generate crash point - EXACT ORIGINAL ALGORITHM
     * This is the mathematically correct implementation
     */
    generateCrashPoint(serverSeed, clientSeed, nonce) {
        // Step 1: Create provably fair random value
        const input = `${serverSeed}:${clientSeed}:${nonce}`;
        const hash = crypto.createHash('sha256').update(input).digest('hex');
        
        // Step 2: Convert to large random integer (like original)
        const hexSubstring = hash.substring(0, 10); // Use 10 chars for larger range
        const randomInt = parseInt(hexSubstring, 16);
        
        // Step 3: EXACT ORIGINAL ALGORITHM
        if (randomInt % this.config.instantCrashChance === 0) {
            // 3% chance of instant crash (1.00x)
            return 1.00;
        } else {
            // Generate random float [0, 1) but never exactly 0
            let randomFloat = (randomInt % 1000000) / 1000000; // Normalize to [0, 1)
            
            // Ensure never exactly 0 (like original while loop)
            while (randomFloat === 0) {
                // If somehow 0, generate new value
                const newHash = crypto.createHash('sha256').update(input + nonce.toString()).digest('hex');
                const newInt = parseInt(newHash.substring(0, 6), 16);
                randomFloat = (newInt % 1000000) / 1000000;
            }
            
            // EXACT ORIGINAL FORMULA: 0.01 + (0.99 / randomFloat)
            // This gives proper distribution with house edge built-in
            let crashPoint = 0.01 + (0.99 / randomFloat);
            
            // Apply safety cap
            crashPoint = Math.min(crashPoint, this.config.maxMultiplier);
            
            // Round to 2 decimal places (like original)
            return Math.round(crashPoint * 100) / 100;
        }
    }

    /**
     * 🎲 Alternative: Pure Random Version (for testing/demo)
     * This matches the original's Math.random() approach exactly
     */
    generateCrashPointRandom() {
        // EXACT original random approach
        const randomInt = Math.floor(Math.random() * (9999999999 - 0 + 1) + 0);
        
        if (randomInt % 33 === 0) {
            return 1.00; // 3% chance instant crash
        } else {
            let randomFloat = Math.random();
            
            // Ensure not zero (exact original logic)
            while (randomFloat === 0) {
                randomFloat = Math.random();
            }
            
            // EXACT original formula
            let crashPoint = 0.01 + (0.99 / randomFloat);
            
            // Round to 2 decimal places
            return Math.round(crashPoint * 100) / 100;
        }
    }

    /**
     * 📈 Calculate multiplier in real-time (original growth formula)
     */
    calculateCurrentMultiplier(timeElapsed) {
        // EXACT original formula from line 374 & 230
        return parseFloat((1.0024 * Math.pow(1.0718, timeElapsed)).toFixed(2));
    }

    /**
     * 📊 Analyze algorithm correctness
     */
    analyzeDistribution(samples = 100000) {
        console.log(`🧪 Analyzing ${samples} crash points...`);
        
        const crashes = [];
        const distribution = {
            '1.00x (Instant)': 0,
            '1.01x-1.99x': 0,
            '2.00x-4.99x': 0,
            '5.00x-9.99x': 0,
            '10.00x-24.99x': 0,
            '25.00x-99.99x': 0,
            '100.00x+': 0
        };

        for (let i = 0; i < samples; i++) {
            const serverSeed = crypto.randomBytes(32).toString('hex');
            const crashPoint = this.generateCrashPoint(serverSeed, 'test-seed', i);
            crashes.push(crashPoint);

            // Categorize
            if (crashPoint === 1.00) distribution['1.00x (Instant)']++;
            else if (crashPoint < 2.00) distribution['1.01x-1.99x']++;
            else if (crashPoint < 5.00) distribution['2.00x-4.99x']++;
            else if (crashPoint < 10.00) distribution['5.00x-9.99x']++;
            else if (crashPoint < 25.00) distribution['10.00x-24.99x']++;
            else if (crashPoint < 100.00) distribution['25.00x-99.99x']++;
            else distribution['100.00x+']++;
        }

        // Convert to percentages
        for (const range in distribution) {
            distribution[range] = ((distribution[range] / samples) * 100).toFixed(2) + '%';
        }

        const maxCrash = Math.max(...crashes);
        const avgCrash = crashes.reduce((a, b) => a + b, 0) / crashes.length;
        const instantCrashCount = crashes.filter(x => x === 1.00).length;
        const instantCrashPercent = (instantCrashCount / samples * 100).toFixed(2);

        console.log('\n📊 Distribution Analysis:');
        console.log(distribution);
        console.log(`\n📈 Statistics:`);
        console.log(`• Instant Crash Rate: ${instantCrashPercent}% (target: ~3%)`);
        console.log(`• Average Crash: ${avgCrash.toFixed(2)}x`);
        console.log(`• Maximum Crash: ${maxCrash.toFixed(2)}x`);
        console.log(`• Crashes > 100x: ${crashes.filter(x => x >= 100).length} (${(crashes.filter(x => x >= 100).length/samples*100).toFixed(2)}%)`);

        return {
            distribution,
            maxCrash,
            avgCrash,
            instantCrashPercent: parseFloat(instantCrashPercent),
            crashes: crashes.slice(0, 20) // Return first 20 for inspection
        };
    }

    /**
     * 🧪 Test provably fair verification
     */
    testProvablyFair() {
        console.log('\n🔍 Testing Provably Fair Mechanics...');
        
        const serverSeed = '7f8a9b2c3d4e5f6a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c';
        const clientSeed = 'player-chosen-seed-12345';
        
        // Test that same inputs always produce same output
        const crash1 = this.generateCrashPoint(serverSeed, clientSeed, 1);
        const crash2 = this.generateCrashPoint(serverSeed, clientSeed, 1);
        const crash3 = this.generateCrashPoint(serverSeed, clientSeed, 2); // Different nonce
        
        console.log(`• Same inputs produce same result: ${crash1 === crash2 ? '✅' : '❌'} (${crash1}x)`);
        console.log(`• Different nonce produces different result: ${crash1 !== crash3 ? '✅' : '❌'} (${crash3}x)`);
        
        // Show sequence of crashes
        console.log('\n🎲 Sample crash sequence:');
        for (let i = 1; i <= 10; i++) {
            const crash = this.generateCrashPoint(serverSeed, clientSeed, i);
            console.log(`Round ${i}: ${crash.toFixed(2)}x`);
        }
    }
}

module.exports = IndustryStandardCrashAlgorithm;

// Test the implementation
if (require.main === module) {
    console.log('🎰 Testing Industry Standard Crash Algorithm\n');
    
    const algorithm = new IndustryStandardCrashAlgorithm();
    
    // Run comprehensive analysis
    const analysis = algorithm.analyzeDistribution(50000);
    
    // Test provably fair mechanics
    algorithm.testProvablyFair();
    
    // Compare random vs provably fair
    console.log('\n🔄 Comparing Random vs Provably Fair:');
    
    console.log('\nRandom method (10 samples):');
    for (let i = 0; i < 10; i++) {
        const crash = algorithm.generateCrashPointRandom();
        console.log(`${crash.toFixed(2)}x`);
    }
    
    console.log('\nProvably Fair method (10 samples):');
    for (let i = 0; i < 10; i++) {
        const crash = algorithm.generateCrashPoint('test-server-seed', 'test-client-seed', i);
        console.log(`${crash.toFixed(2)}x`);
    }
}
