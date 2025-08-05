// ===== SOLO LEADERBOARD TESTING SCRIPT =====
// Test your leaderboard coordination without needing other players
// Run this in your browser console

/**
 * Solo testing class for leaderboard functionality
 */
class SoloLeaderboardTester {
    constructor() {
        this.testUsers = [];
        this.testResults = [];
    }

    // Generate test user data
    generateTestUser(index) {
        const usernames = [
            'TestChicken1', 'TestRooster2', 'TestHen3', 'TestPaco4', 'TestBird5',
            'TestWing6', 'TestClaw7', 'TestBeak8', 'TestFeather9', 'TestEgg10'
        ];
        
        return {
            user_id: `test_user_${Date.now()}_${index}`,
            username: usernames[index] || `TestUser${index}`,
            display_name: `Test User ${index}`,
            profile_image: 'https://example.com/test-avatar.png'
        };
    }

    // Create test score data
    createTestScore(user, score) {
        const today = new Date().toISOString().split('T')[0];
        
        return {
            ...user,
            score: score,
            game_date: today,
            created_at: new Date().toISOString(),
            session_id: `test_session_${Date.now()}`,
            game_time: Math.floor(Math.random() * 60000) + 10000, // 10-70 seconds
            platforms_jumped: Math.floor(score / 10), // Approximate platforms
            checksum: this.generateChecksum(score)
        };
    }

    // Generate a simple checksum for testing
    generateChecksum(score) {
        return btoa(`${score}_${Date.now()}_test`).slice(0, 16);
    }

    // Test 1: Create test data and submit scores
    async createTestData() {
        console.log('🧪 Creating test leaderboard data...');
        
        // Create 10 test users with different scores
        const testScores = [850, 720, 680, 650, 600, 580, 540, 520, 480, 450];
        
        for (let i = 0; i < testScores.length; i++) {
            const user = this.generateTestUser(i);
            const scoreData = this.createTestScore(user, testScores[i]);
            
            console.log(`📝 Submitting test score: ${user.username} = ${testScores[i]}`);
            
            try {
                const result = await orderTracker.recordGameScore(scoreData);
                this.testResults.push({
                    user: user.username,
                    score: testScores[i],
                    success: result.success,
                    result: result
                });
                
                if (result.success) {
                    console.log(`✅ ${user.username}: ${testScores[i]} points`);
                } else {
                    console.error(`❌ ${user.username}: Failed -`, result.error);
                }
                
                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                console.error(`❌ Error submitting ${user.username}:`, error);
            }
        }
        
        console.log('✅ Test data creation completed!');
        return this.testResults;
    }

    // Test 2: Verify leaderboard retrieval
    async testLeaderboardRetrieval() {
        console.log('\n🔍 Testing leaderboard retrieval...');
        
        try {
            // Test database function directly
            const dbResult = await orderTracker.getTodayLeaderboard();
            console.log('📊 Database function result:', dbResult);
            
            if (!dbResult.success) {
                throw new Error('Database function failed: ' + dbResult.error);
            }
            
            // Test leaderboard class
            const lbResult = await leaderboard.fetchTodayLeaderboard();
            console.log('📊 Leaderboard class result:', lbResult);
            
            if (!Array.isArray(lbResult)) {
                throw new Error('Leaderboard result is not an array');
            }
            
            return {
                databaseEntries: dbResult.data?.length || 0,
                leaderboardEntries: lbResult.length,
                success: true
            };
            
        } catch (error) {
            console.error('❌ Leaderboard retrieval test failed:', error);
            return { success: false, error: error.message };
        }
    }

    // Test 3: Check for duplicates
    async testDuplicatePrevention() {
        console.log('\n🔍 Testing duplicate prevention...');
        
        try {
            // Get current leaderboard
            const leaderboardData = await leaderboard.fetchTodayLeaderboard();
            
            // Check for duplicate user_ids
            const userIds = leaderboardData.map(entry => entry.user_id);
            const uniqueUserIds = [...new Set(userIds)];
            
            const hasDuplicates = userIds.length !== uniqueUserIds.length;
            
            if (hasDuplicates) {
                console.error('❌ Found duplicate users!');
                console.error('Total entries:', userIds.length);
                console.error('Unique users:', uniqueUserIds.length);
                
                // Find duplicates
                const duplicates = userIds.filter((id, index) => userIds.indexOf(id) !== index);
                console.error('Duplicate user_ids:', [...new Set(duplicates)]);
                
                return { success: false, hasDuplicates: true, duplicates };
            } else {
                console.log('✅ No duplicates found!');
                console.log(`📊 ${leaderboardData.length} unique entries`);
                
                return { success: true, hasDuplicates: false, uniqueEntries: leaderboardData.length };
            }
            
        } catch (error) {
            console.error('❌ Duplicate prevention test failed:', error);
            return { success: false, error: error.message };
        }
    }

    // Test 4: Check score sorting
    async testScoreSorting() {
        console.log('\n🔍 Testing score sorting...');
        
        try {
            const leaderboardData = await leaderboard.fetchTodayLeaderboard();
            
            // Check if scores are properly sorted (highest to lowest)
            let properlysorted = true;
            for (let i = 1; i < leaderboardData.length; i++) {
                if (leaderboardData[i].score > leaderboardData[i-1].score) {
                    properlysorted = false;
                    break;
                }
            }
            
            if (properlysorted) {
                console.log('✅ Scores properly sorted (highest to lowest)');
                console.log('🏆 Top 3 scores:', leaderboardData.slice(0, 3).map(e => `${e.username}: ${e.score}`));
                return { success: true, properlySorted: true };
            } else {
                console.error('❌ Scores not properly sorted!');
                return { success: false, properlySorted: false };
            }
            
        } catch (error) {
            console.error('❌ Score sorting test failed:', error);
            return { success: false, error: error.message };
        }
    }

    // Test 5: Test score updates (higher score replaces lower)
    async testScoreUpdates() {
        console.log('\n🔍 Testing score update logic...');
        
        try {
            const testUser = this.generateTestUser(999);
            
            // Submit initial score
            const initialScore = 300;
            const initialData = this.createTestScore(testUser, initialScore);
            const result1 = await orderTracker.recordGameScore(initialData);
            
            if (!result1.success) {
                throw new Error('Initial score submission failed: ' + result1.error);
            }
            
            console.log(`📝 Initial score: ${testUser.username} = ${initialScore}`);
            
            // Submit higher score (should update)
            const higherScore = 400;
            const higherData = this.createTestScore(testUser, higherScore);
            const result2 = await orderTracker.recordGameScore(higherData);
            
            if (!result2.success) {
                throw new Error('Higher score submission failed: ' + result2.error);
            }
            
            console.log(`📝 Higher score: ${testUser.username} = ${higherScore}`);
            
            // Submit lower score (should be skipped)
            const lowerScore = 250;
            const lowerData = this.createTestScore(testUser, lowerScore);
            const result3 = await orderTracker.recordGameScore(lowerData);
            
            console.log(`📝 Lower score: ${testUser.username} = ${lowerScore}`);
            console.log('📊 Lower score result:', result3);
            
            // Verify final score in leaderboard
            const leaderboardData = await leaderboard.fetchTodayLeaderboard();
            const userEntry = leaderboardData.find(entry => entry.user_id === testUser.user_id);
            
            if (userEntry && userEntry.score === higherScore) {
                console.log('✅ Score update logic working correctly!');
                console.log(`✅ Final score for ${testUser.username}: ${userEntry.score}`);
                return { success: true, finalScore: userEntry.score, expectedScore: higherScore };
            } else {
                throw new Error(`Score update failed. Expected: ${higherScore}, Got: ${userEntry?.score}`);
            }
            
        } catch (error) {
            console.error('❌ Score update test failed:', error);
            return { success: false, error: error.message };
        }
    }

    // Run all tests
    async runFullTest() {
        console.log('🧪 ===== SOLO LEADERBOARD TEST SUITE =====');
        console.log('🧪 Testing leaderboard coordination without other players\n');
        
        const results = {};
        
        try {
            // Test 1: Create test data
            results.dataCreation = await this.createTestData();
            
            // Test 2: Leaderboard retrieval
            results.retrieval = await this.testLeaderboardRetrieval();
            
            // Test 3: Duplicate prevention
            results.duplicates = await this.testDuplicatePrevention();
            
            // Test 4: Score sorting
            results.sorting = await this.testScoreSorting();
            
            // Test 5: Score updates
            results.updates = await this.testScoreUpdates();
            
            // Summary
            this.printTestSummary(results);
            
            return results;
            
        } catch (error) {
            console.error('❌ Test suite failed:', error);
            return { success: false, error: error.message };
        }
    }

    // Print test summary
    printTestSummary(results) {
        console.log('\n🧪 ===== TEST SUMMARY =====');
        
        const tests = [
            { name: 'Data Creation', result: results.dataCreation },
            { name: 'Leaderboard Retrieval', result: results.retrieval },
            { name: 'Duplicate Prevention', result: results.duplicates },
            { name: 'Score Sorting', result: results.sorting },
            { name: 'Score Updates', result: results.updates }
        ];
        
        let passed = 0;
        let failed = 0;
        
        tests.forEach(test => {
            if (test.result?.success) {
                console.log(`✅ ${test.name}: PASS`);
                passed++;
            } else {
                console.log(`❌ ${test.name}: FAIL`);
                failed++;
            }
        });
        
        console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
        
        if (failed === 0) {
            console.log('🎉 ALL TESTS PASSED! Your leaderboard coordination is working perfectly!');
        } else {
            console.log('⚠️ Some tests failed. Check the errors above for details.');
        }
    }

    // Quick test function
    async quickTest() {
        console.log('🧪 Running quick leaderboard test...');
        
        try {
            // Test database function
            const dbResult = await orderTracker.getTodayLeaderboard();
            console.log('✅ Database function:', dbResult.success ? 'OK' : 'FAILED');
            
            // Test leaderboard fetch
            const lbResult = await leaderboard.fetchTodayLeaderboard();
            console.log('✅ Leaderboard fetch:', Array.isArray(lbResult) ? 'OK' : 'FAILED');
            console.log('📊 Current entries:', lbResult.length);
            
            if (lbResult.length > 0) {
                console.log('🏆 Top score:', lbResult[0].username, '-', lbResult[0].score);
                
                // Check for duplicates
                const userIds = lbResult.map(e => e.user_id);
                const unique = [...new Set(userIds)];
                console.log('✅ No duplicates:', userIds.length === unique.length ? 'OK' : 'FAILED');
            }
            
            console.log('🎉 Quick test completed!');
            
        } catch (error) {
            console.error('❌ Quick test failed:', error);
        }
    }
}

// Create global instance
window.SoloTester = SoloLeaderboardTester;
window.soloTester = new SoloLeaderboardTester();

// Export quick functions
window.testSolo = {
    async quick() {
        await soloTester.quickTest();
    },
    
    async full() {
        await soloTester.runFullTest();
    },
    
    async createData() {
        await soloTester.createTestData();
    },
    
    async checkDuplicates() {
        await soloTester.testDuplicatePrevention();
    }
};

console.log('🧪 Solo leaderboard tester loaded!');
console.log('🧪 Run: testSolo.quick() for quick test');
console.log('🧪 Run: testSolo.full() for complete test suite');
console.log('🧪 Run: testSolo.createData() to add test players');