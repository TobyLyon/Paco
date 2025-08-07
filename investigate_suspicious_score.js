// FORENSIC INVESTIGATION: 1.6 Million Score Analysis
// This script investigates the suspicious high score for evidence of manipulation

console.log('🚨 STARTING FORENSIC INVESTIGATION OF SUSPICIOUS SCORE');
console.log('🔍 Target: 1.6 million point score');
console.log('⏰ Analysis started at:', new Date().toISOString());

// Initialize investigation
async function investigateSuspiciousScore() {
    if (!orderTracker) {
        console.error('❌ OrderTracker not available');
        return;
    }

    try {
        console.log('\n📊 STEP 1: Fetching current leaderboard data...');
        
        // Get current leaderboard to identify the suspicious score
        const leaderboardResult = await orderTracker.getTodayLeaderboard();
        
        if (!leaderboardResult.success) {
            console.error('❌ Failed to fetch leaderboard:', leaderboardResult.error);
            return;
        }
        
        const scores = leaderboardResult.data || [];
        console.log(`📋 Found ${scores.length} total scores`);
        
        // Sort by score descending to find top scores
        const sortedScores = scores.sort((a, b) => b.score - a.score);
        console.log('\n🏆 TOP 10 SCORES:');
        sortedScores.slice(0, 10).forEach((entry, index) => {
            console.log(`${index + 1}. ${entry.username || entry.display_name} - ${entry.score.toLocaleString()} pts`);
        });
        
        // Identify scores above 1 million (highly suspicious)
        const suspiciousScores = sortedScores.filter(entry => entry.score >= 1000000);
        
        if (suspiciousScores.length === 0) {
            console.log('✅ No scores above 1 million found');
            return;
        }
        
        console.log(`\n🚨 FOUND ${suspiciousScores.length} SUSPICIOUS SCORE(S) ABOVE 1 MILLION:`);
        
        for (const suspiciousEntry of suspiciousScores) {
            await analyzeSuspiciousEntry(suspiciousEntry);
        }
        
    } catch (error) {
        console.error('❌ Investigation failed:', error);
    }
}

// Detailed analysis of a suspicious score entry
async function analyzeSuspiciousEntry(entry) {
    console.log('\n' + '='.repeat(60));
    console.log('🕵️ DETAILED FORENSIC ANALYSIS');
    console.log('='.repeat(60));
    
    console.log('👤 Player Information:');
    console.log(`   Username: ${entry.username || entry.display_name || 'UNKNOWN'}`);
    console.log(`   User ID: ${entry.user_id || 'UNKNOWN'}`);
    console.log(`   Score: ${entry.score.toLocaleString()} points`);
    console.log(`   Date: ${entry.game_date || entry.created_at}`);
    console.log(`   Submitted: ${new Date(entry.created_at).toLocaleString()}`);
    
    // Calculate mathematical plausibility
    console.log('\n🧮 MATHEMATICAL ANALYSIS:');
    
    // Maximum theoretical score calculation
    const maxRealisticScore = 50000; // Our defined limit
    const scoreExceeds = (entry.score / maxRealisticScore * 100).toFixed(1);
    console.log(`   Score vs Max Realistic (50k): ${scoreExceeds}% (${entry.score > maxRealisticScore ? '❌ EXCEEDS' : '✅ WITHIN'})`);
    
    if (entry.game_time) {
        const gameTimeMinutes = (entry.game_time / 1000 / 60).toFixed(2);
        const pointsPerSecond = (entry.score / (entry.game_time / 1000)).toFixed(1);
        const pointsPerMinute = (entry.score / (entry.game_time / 1000 / 60)).toFixed(0);
        
        console.log(`   Game Duration: ${gameTimeMinutes} minutes`);
        console.log(`   Points/Second: ${pointsPerSecond} (Max realistic: 500)`);
        console.log(`   Points/Minute: ${pointsPerMinute}`);
        
        if (pointsPerSecond > 500) {
            console.log('   🚨 VIOLATION: Points per second exceeds realistic limits');
        }
    } else {
        console.log('   ⚠️ No game time data available');
    }
    
    if (entry.platforms_jumped) {
        const pointsPerPlatform = (entry.score / entry.platforms_jumped).toFixed(1);
        console.log(`   Platforms Jumped: ${entry.platforms_jumped}`);
        console.log(`   Points/Platform: ${pointsPerPlatform} (Max realistic: 200)`);
        
        if (pointsPerPlatform > 200) {
            console.log('   🚨 VIOLATION: Points per platform exceeds realistic limits');
        }
    } else {
        console.log('   ⚠️ No platform jump data available');
    }
    
    // Anti-cheat metadata analysis
    console.log('\n🛡️ ANTI-CHEAT METADATA ANALYSIS:');
    console.log(`   Session ID: ${entry.session_id ? '✅ Present' : '❌ Missing'}`);
    console.log(`   Checksum: ${entry.checksum ? '✅ Present' : '❌ Missing'}`);
    console.log(`   User Agent: ${entry.user_agent ? '✅ Present' : '❌ Missing'}`);
    
    if (entry.user_agent) {
        console.log(`   Browser: ${entry.user_agent.substring(0, 100)}...`);
    }
    
    // Pattern analysis
    console.log('\n🔍 PATTERN ANALYSIS:');
    
    // Check for round numbers (sign of manipulation)
    if (entry.score % 1000 === 0) {
        console.log('   🚨 SUSPICIOUS: Score is exactly divisible by 1000');
    }
    if (entry.score % 100 === 0) {
        console.log('   ⚠️ WARNING: Score is exactly divisible by 100');
    }
    if (entry.score % 10000 === 0) {
        console.log('   🚨 HIGHLY SUSPICIOUS: Score is exactly divisible by 10,000');
    }
    
    // Check for impossible score values
    if (entry.score === 1600000) {
        console.log('   🚨 EXACT MATCH: This is the reported 1.6 million score');
    }
    
    // Score legitimacy assessment
    console.log('\n⚖️ LEGITIMACY ASSESSMENT:');
    let violations = [];
    
    if (entry.score > maxRealisticScore) violations.push('Exceeds maximum realistic score');
    if (!entry.session_id) violations.push('Missing session tracking');
    if (!entry.checksum) violations.push('Missing integrity checksum');
    if (entry.game_time && (entry.score / (entry.game_time / 1000)) > 500) violations.push('Impossible scoring rate');
    if (entry.platforms_jumped && (entry.score / entry.platforms_jumped) > 200) violations.push('Impossible points per platform');
    if (entry.score % 10000 === 0) violations.push('Suspiciously round number');
    
    console.log(`   Violations Found: ${violations.length}`);
    violations.forEach(violation => console.log(`   ❌ ${violation}`));
    
    // Final verdict
    if (violations.length === 0) {
        console.log('\n✅ VERDICT: Score appears legitimate');
    } else if (violations.length <= 2) {
        console.log('\n⚠️ VERDICT: Score is questionable - requires manual review');
    } else {
        console.log('\n🚨 VERDICT: Score is highly likely to be manipulated');
        console.log('   🔨 RECOMMENDATION: Remove from leaderboard and flag user');
    }
    
    // Suggest corrective action
    if (violations.length > 0) {
        console.log('\n💡 SUGGESTED ACTIONS:');
        console.log('   1. Remove score from leaderboard');
        console.log('   2. Flag user account for review');
        console.log('   3. Implement stricter validation (already done)');
        console.log('   4. Review other scores from same user');
        console.log('   5. Add score to blacklist/monitoring');
    }
}

// Check if anti-cheat validation would catch this score
function simulateValidation(entry) {
    console.log('\n🧪 VALIDATION SIMULATION:');
    console.log('Testing if current anti-cheat would block this score...');
    
    // Simulate our current validation
    const scoreData = {
        score: entry.score,
        game_time: entry.game_time,
        platforms_jumped: entry.platforms_jumped,
        session_id: entry.session_id,
        checksum: entry.checksum,
        user_agent: entry.user_agent,
        user_id: entry.user_id,
        game_date: entry.game_date
    };
    
    if (typeof orderTracker.validateScoreSubmission === 'function') {
        const validation = orderTracker.validateScoreSubmission(scoreData);
        
        console.log(`   Validation Result: ${validation.valid ? '✅ PASS' : '❌ FAIL'}`);
        if (!validation.valid) {
            console.log('   Rejection Reasons:');
            validation.reasons.forEach(reason => console.log(`   - ${reason}`));
        }
        
        return validation;
    } else {
        console.log('   ⚠️ Validation function not available');
        return null;
    }
}

// Start the investigation
console.log('🚀 Initializing investigation...');
setTimeout(investigateSuspiciousScore, 1000);

// Export for manual use
window.investigateSuspiciousScore = investigateSuspiciousScore;
window.analyzeSuspiciousEntry = analyzeSuspiciousEntry;

console.log('📝 Investigation script loaded. Run window.investigateSuspiciousScore() to start manually.');
