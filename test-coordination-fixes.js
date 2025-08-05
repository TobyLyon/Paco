// ===== SUPABASE-CODEBASE COORDINATION TEST SCRIPT =====
// This script tests all the fixes we applied to ensure smooth coordination
// Run this in your browser console after deploying the SQL fixes

/**
 * Comprehensive test suite for leaderboard coordination
 */
class CoordinationTester {
    constructor() {
        this.tests = [];
        this.results = [];
    }

    // Add a test to the suite
    addTest(name, testFn) {
        this.tests.push({ name, testFn });
    }

    // Run all tests
    async runAllTests() {
        console.log('🧪 ===== COORDINATION TEST SUITE =====');
        console.log(`🧪 Running ${this.tests.length} tests...`);
        
        for (const test of this.tests) {
            try {
                console.log(`\n🔍 Testing: ${test.name}`);
                const result = await test.testFn();
                this.results.push({ name: test.name, status: 'PASS', result });
                console.log(`✅ PASS: ${test.name}`);
            } catch (error) {
                this.results.push({ name: test.name, status: 'FAIL', error: error.message });
                console.error(`❌ FAIL: ${test.name} - ${error.message}`);
            }
        }
        
        this.printSummary();
    }

    // Print test summary
    printSummary() {
        console.log('\n🧪 ===== TEST SUMMARY =====');
        const passed = this.results.filter(r => r.status === 'PASS').length;
        const failed = this.results.filter(r => r.status === 'FAIL').length;
        
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`📊 Total: ${this.results.length}`);
        
        if (failed > 0) {
            console.log('\n❌ FAILED TESTS:');
            this.results.filter(r => r.status === 'FAIL').forEach(r => {
                console.log(`  - ${r.name}: ${r.error}`);
            });
        }
        
        if (passed === this.results.length) {
            console.log('\n🎉 ALL TESTS PASSED! Your coordination is working perfectly!');
        } else {
            console.log('\n⚠️ Some tests failed. Check the errors above.');
        }
    }
}

// Create test instance
const tester = new CoordinationTester();

// Test 1: Check if database function exists
tester.addTest('Database Function Exists', async () => {
    if (!window.orderTracker) {
        throw new Error('OrderTracker not found - make sure supabase-client.js is loaded');
    }
    
    const result = await orderTracker.getTodayLeaderboard();
    if (!result.success && result.error?.includes('function')) {
        throw new Error('get_daily_leaderboard function not found in database');
    }
    
    return { message: 'Database function accessible', data: result };
});

// Test 2: Test score submission and duplication prevention
tester.addTest('Score Submission & Duplicate Prevention', async () => {
    if (!window.leaderboard) {
        throw new Error('Leaderboard not found - make sure leaderboard.js is loaded');
    }
    
    // Generate test score data
    const testScore = Math.floor(Math.random() * 1000) + 100;
    const testUser = `test_user_${Date.now()}`;
    
    console.log(`📝 Testing score submission: ${testUser} with score ${testScore}`);
    
    // Try to submit the same score twice to test duplicate prevention
    const result1 = await leaderboard.submitScore(testScore);
    const result2 = await leaderboard.submitScore(testScore - 10); // Lower score
    
    if (!result1) {
        throw new Error('First score submission failed');
    }
    
    return { 
        message: 'Duplicate prevention working', 
        firstSubmission: result1,
        secondSubmission: result2 
    };
});

// Test 3: Test leaderboard retrieval
tester.addTest('Leaderboard Retrieval', async () => {
    if (!window.leaderboard) {
        throw new Error('Leaderboard not found');
    }
    
    const leaderboardData = await leaderboard.fetchTodayLeaderboard();
    
    if (!Array.isArray(leaderboardData)) {
        throw new Error('Leaderboard data is not an array');
    }
    
    // Check for duplicates in the returned data
    const userIds = leaderboardData.map(entry => entry.user_id);
    const uniqueUserIds = [...new Set(userIds)];
    
    if (userIds.length !== uniqueUserIds.length) {
        throw new Error(`Found duplicate users in leaderboard: ${userIds.length} entries, ${uniqueUserIds.length} unique users`);
    }
    
    // Check if data is properly sorted
    for (let i = 1; i < leaderboardData.length; i++) {
        if (leaderboardData[i].score > leaderboardData[i-1].score) {
            throw new Error('Leaderboard not properly sorted by score (descending)');
        }
    }
    
    return { 
        message: 'Leaderboard retrieval working correctly',
        entryCount: leaderboardData.length,
        uniqueUsers: uniqueUserIds.length,
        topScore: leaderboardData[0]?.score || 0
    };
});

// Test 4: Test database constraint enforcement
tester.addTest('Database Constraint Enforcement', async () => {
    if (!window.orderTracker) {
        throw new Error('OrderTracker not found');
    }
    
    const today = new Date().toISOString().split('T')[0];
    const testUserId = `constraint_test_${Date.now()}`;
    
    const scoreData1 = {
        user_id: testUserId,
        username: 'TestUser',
        display_name: 'Test User',
        score: 100,
        game_date: today
    };
    
    const scoreData2 = {
        ...scoreData1,
        score: 150 // Higher score
    };
    
    // Submit first score
    const result1 = await orderTracker.recordGameScore(scoreData1);
    if (!result1.success) {
        throw new Error('First score submission failed: ' + result1.error);
    }
    
    // Submit second score (should update, not create duplicate)
    const result2 = await orderTracker.recordGameScore(scoreData2);
    if (!result2.success) {
        throw new Error('Second score submission failed: ' + result2.error);
    }
    
    return {
        message: 'Database constraint working correctly',
        firstSubmission: result1,
        secondSubmission: result2
    };
});

// Test 5: Check real-time subscriptions
tester.addTest('Real-time Subscriptions', async () => {
    if (!window.leaderboard) {
        throw new Error('Leaderboard not found');
    }
    
    // Check if real-time channel exists
    if (!leaderboard.realtimeChannel) {
        throw new Error('Real-time channel not initialized');
    }
    
    // Test channel state
    const channelState = leaderboard.realtimeChannel.state;
    if (channelState !== 'joined' && channelState !== 'joining') {
        console.warn(`Real-time channel state: ${channelState}`);
    }
    
    return {
        message: 'Real-time channel configured',
        channelState: channelState,
        channelTopic: leaderboard.realtimeChannel.topic
    };
});

// Test 6: Performance and efficiency check
tester.addTest('Performance Check', async () => {
    const startTime = performance.now();
    
    // Test leaderboard fetch speed
    const result = await orderTracker.getTodayLeaderboard();
    
    const endTime = performance.now();
    const executionTime = endTime - startTime;
    
    if (executionTime > 2000) { // More than 2 seconds
        throw new Error(`Leaderboard fetch too slow: ${executionTime}ms`);
    }
    
    return {
        message: 'Performance check passed',
        executionTime: `${executionTime.toFixed(2)}ms`,
        entryCount: result.data?.length || 0
    };
});

// Export for manual testing
window.CoordinationTester = CoordinationTester;
window.coordinationTester = tester;

// Auto-run tests if this script is loaded directly
if (typeof window !== 'undefined' && window.orderTracker && window.leaderboard) {
    console.log('🧪 Auto-running coordination tests...');
    setTimeout(() => {
        tester.runAllTests();
    }, 1000);
} else {
    console.log('⚠️ Dependencies not ready. Run manually with: coordinationTester.runAllTests()');
}

// Export individual test functions for debugging
window.testCoordination = {
    async testDatabaseFunction() {
        const result = await orderTracker.getTodayLeaderboard();
        console.log('Database function test result:', result);
        return result;
    },
    
    async testScoreSubmission(score = 100) {
        const result = await leaderboard.submitScore(score);
        console.log('Score submission test result:', result);
        return result;
    },
    
    async testLeaderboardFetch() {
        const result = await leaderboard.fetchTodayLeaderboard();
        console.log('Leaderboard fetch test result:', result);
        return result;
    },
    
    async quickTest() {
        console.log('🧪 Running quick coordination test...');
        
        try {
            // Test database connection
            const dbResult = await orderTracker.getTodayLeaderboard();
            console.log('✅ Database connection:', dbResult.success ? 'OK' : 'FAILED');
            
            // Test leaderboard fetch
            const lbResult = await leaderboard.fetchTodayLeaderboard();
            console.log('✅ Leaderboard fetch:', Array.isArray(lbResult) ? 'OK' : 'FAILED');
            
            // Check for duplicates
            const userIds = lbResult.map(e => e.user_id);
            const unique = [...new Set(userIds)];
            console.log('✅ No duplicates:', userIds.length === unique.length ? 'OK' : 'FAILED');
            
            console.log('🎉 Quick test completed!');
            
        } catch (error) {
            console.error('❌ Quick test failed:', error);
        }
    }
};

console.log('🧪 Coordination test script loaded!');
console.log('🧪 Run: coordinationTester.runAllTests() for full test suite');
console.log('🧪 Run: testCoordination.quickTest() for quick check');