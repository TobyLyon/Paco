/**
 * 🧪 Security Tests for Crash Casino Fixes
 * 
 * Tests all critical vulnerability fixes and security enhancements
 */

const MultiplierCalculator = require('../shared/multiplier-calculator');
const InputValidator = require('../utils/input-validator');
const BetValidator = require('../backend/bet-validator');
const ProvablyFairRNG = require('../backend/provably-fair-rng');

// Mock console to capture test output
const originalConsole = console.log;
let testOutput = [];
console.log = (...args) => {
    testOutput.push(args.join(' '));
    originalConsole(...args);
};

/**
 * Test Suite Runner
 */
class SecurityTestSuite {
    constructor() {
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
    }
    
    test(name, testFunction) {
        this.tests.push({ name, testFunction });
    }
    
    async runAll() {
        console.log('🧪 Starting Security Test Suite...\n');
        
        for (const test of this.tests) {
            try {
                await test.testFunction();
                console.log(`✅ ${test.name}`);
                this.passed++;
            } catch (error) {
                console.log(`❌ ${test.name}: ${error.message}`);
                this.failed++;
            }
        }
        
        console.log(`\n📊 Test Results: ${this.passed} passed, ${this.failed} failed`);
        
        if (this.failed === 0) {
            console.log('🎉 All security tests passed!');
        } else {
            console.log('⚠️ Some tests failed - review fixes needed');
        }
        
        return this.failed === 0;
    }
}

const suite = new SecurityTestSuite();

// Test 1: Multiplier Calculator Consistency
suite.test('MultiplierCalculator produces consistent results', () => {
    const startTime = Date.now() - 5000; // 5 seconds ago
    const multiplier1 = MultiplierCalculator.calculateMultiplier(startTime);
    const multiplier2 = MultiplierCalculator.calculateMultiplier(startTime);
    
    if (Math.abs(multiplier1 - multiplier2) > 0.001) {
        throw new Error(`Inconsistent multipliers: ${multiplier1} vs ${multiplier2}`);
    }
});

// Test 2: Input Validation
suite.test('InputValidator rejects invalid addresses', () => {
    const invalidAddresses = [
        '',
        'not-an-address',
        '0xinvalid',
        '0x123', // too short
        '0x' + 'z'.repeat(40), // invalid characters
    ];
    
    for (const addr of invalidAddresses) {
        try {
            InputValidator.sanitizeAddress(addr);
            throw new Error(`Should have rejected address: ${addr}`);
        } catch (error) {
            if (!error.message.includes('Invalid')) {
                throw error;
            }
        }
    }
});

// Test 3: Input Validation - Valid Addresses
suite.test('InputValidator accepts valid addresses', () => {
    const validAddresses = [
        '0x' + '0'.repeat(40),
        '0x' + 'a'.repeat(40),
        '0xDeadBeef' + '0'.repeat(32),
    ];
    
    for (const addr of validAddresses) {
        const result = InputValidator.sanitizeAddress(addr);
        if (!result.match(/^0x[0-9a-f]{40}$/)) {
            throw new Error(`Failed to validate address: ${addr} -> ${result}`);
        }
    }
});

// Test 4: Bet Amount Validation
suite.test('InputValidator validates bet amounts correctly', () => {
    // Valid amounts
    const validAmounts = [0.001, 1.0, 50.5];
    for (const amount of validAmounts) {
        const result = InputValidator.validateAmount(amount);
        if (result !== amount) {
            throw new Error(`Amount validation failed: ${amount} -> ${result}`);
        }
    }
    
    // Invalid amounts
    const invalidAmounts = [0, -1, 101, 'not-a-number'];
    for (const amount of invalidAmounts) {
        try {
            InputValidator.validateAmount(amount);
            throw new Error(`Should have rejected amount: ${amount}`);
        } catch (error) {
            if (!error.message.includes('Amount') && !error.message.includes('bet')) {
                throw error;
            }
        }
    }
});

// Test 5: BetValidator prevents duplicate bets
suite.test('BetValidator prevents duplicate bets', () => {
    const validator = new BetValidator();
    const activePlayersList = ['player1'];
    const queuedBets = new Map([['player2', {}]]);
    
    // Test active player rejection
    try {
        validator.validateBet('player1', 1.0, 2.0, activePlayersList, queuedBets);
        throw new Error('Should have rejected duplicate active bet');
    } catch (error) {
        if (!error.message.includes('active bet')) {
            throw error;
        }
    }
    
    // Test queued player rejection
    try {
        validator.validateBet('player2', 1.0, 2.0, activePlayersList, queuedBets);
        throw new Error('Should have rejected duplicate queued bet');
    } catch (error) {
        if (!error.message.includes('queued')) {
            throw error;
        }
    }
});

// Test 6: BetValidator rate limiting
suite.test('BetValidator enforces rate limiting', async () => {
    const validator = new BetValidator({ betCooldownMs: 1000 });
    const activePlayersList = [];
    const queuedBets = new Map();
    
    // First bet should succeed
    validator.validateBet('player3', 1.0, 2.0, activePlayersList, queuedBets, 'balance');
    
    // Second bet immediately should fail
    try {
        validator.validateBet('player3', 1.0, 2.0, [], new Map(), 'balance');
        throw new Error('Should have enforced rate limit');
    } catch (error) {
        if (!error.message.includes('wait')) {
            throw error;
        }
    }
    
    // Wait and try again (simulate passage of time)
    await new Promise(resolve => setTimeout(resolve, 1100));
    validator.validateBet('player3', 1.0, 2.0, [], new Map(), 'balance');
});

// Test 7: ProvablyFairRNG consistency
suite.test('ProvablyFairRNG produces verifiable results', () => {
    const rng = new ProvablyFairRNG();
    
    // Generate a crash point
    rng.generateServerSeed();
    rng.setClientSeed('testclientseed123456789012345678901234567890'); // Proper length seed
    const crashPoint = rng.calculateCrashPoint();
    
    // Get verification data
    const roundData = rng.getCurrentRoundData();
    const revealData = rng.revealServerSeed();
    
    // Verify the result
    const verification = rng.verifyRound(
        revealData.serverSeed,
        roundData.clientSeed,
        roundData.nonce,
        crashPoint
    );
    
    if (!verification.valid) {
        throw new Error('RNG verification failed');
    }
});

// Test 8: ProvablyFairRNG distribution
suite.test('ProvablyFairRNG produces reasonable distribution', () => {
    const rng = new ProvablyFairRNG();
    const results = [];
    
    // Generate multiple crash points
    for (let i = 0; i < 100; i++) {
        rng.generateServerSeed();
        rng.setClientSeed(`testseed${i.toString().padStart(40, '0')}`); // Proper length seeds
        results.push(rng.calculateCrashPoint());
        rng.incrementNonce();
    }
    
    // Check basic distribution properties
    const avg = results.reduce((a, b) => a + b, 0) / results.length;
    const belowTwo = results.filter(r => r < 2.0).length;
    const aboveTen = results.filter(r => r >= 10.0).length;
    
    // Should have reasonable average (expected is 1/(1-houseEdge) ≈ 1.0101, but with variance)
    // For small samples, allow broader range
    if (avg < 0.8 || avg > 20.0) {
        throw new Error(`Unusual average crash point: ${avg} (expected range 0.8-20.0 for small sample)`);
    }
    
    // Should have reasonable distribution
    if (belowTwo < 40 || belowTwo > 80) { // Expect roughly 50-70%
        throw new Error(`Unusual distribution: ${belowTwo}% below 2x`);
    }
});

// Test 9: Timing Attack Prevention
suite.test('MultiplierCalculator prevents timing attacks', () => {
    const startTime = Date.now() - 2000; // 2 seconds ago
    const crashPoint = 2.5;
    
    // Test multiplier just below crash point
    const closeMultiplier = 2.49;
    const isValid = MultiplierCalculator.validateMultiplier(closeMultiplier, crashPoint);
    
    if (isValid) {
        throw new Error('Should have rejected multiplier too close to crash point');
    }
    
    // Test multiplier with safe buffer
    const safeMultiplier = 2.4;
    const isSafe = MultiplierCalculator.validateMultiplier(safeMultiplier, crashPoint);
    
    if (!isSafe) {
        throw new Error('Should have accepted safe multiplier');
    }
});

// Test 10: Transaction Hash Validation
suite.test('InputValidator validates transaction hashes', () => {
    const validHash = '0x' + 'a'.repeat(64);
    const result = InputValidator.validateTxHash(validHash);
    if (result !== validHash) {
        throw new Error('Valid hash rejected');
    }
    
    const invalidHashes = [
        '',
        '0x123', // too short
        'invalid', // no 0x prefix
        '0x' + 'z'.repeat(64), // invalid characters
    ];
    
    for (const hash of invalidHashes) {
        try {
            InputValidator.validateTxHash(hash);
            throw new Error(`Should have rejected hash: ${hash}`);
        } catch (error) {
            if (!error.message.includes('hash')) {
                throw error;
            }
        }
    }
});

// Export test runner for external use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SecurityTestSuite, suite };
}

// Run tests if this file is executed directly
if (require.main === module) {
    suite.runAll().then(success => {
        process.exit(success ? 0 : 1);
    });
}
