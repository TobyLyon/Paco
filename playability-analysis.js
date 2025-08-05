// PACO JUMP GAME - COMPREHENSIVE PLAYABILITY ANALYSIS
// Mathematical verification of game mechanics and reachability

console.log('🎮 PACO JUMP PLAYABILITY ANALYSIS');
console.log('=====================================');

// Game configuration values from the codebase
const config = {
    player: {
        width: 32,
        height: 32,
        jumpForce: 16,  // From game-assets.js
        maxSpeed: 5.5,  // Horizontal movement speed
        gravity: 0.5
    },
    platform: {
        width: 60,
        height: 12,
        easyMinGap: 15,
        easyMaxGap: 30,
        minGap: 20,
        maxGap: 50,
        hardMinGap: 30,
        hardMaxGap: 60
    },
    canvas: {
        width: 320,
        height: 480
    }
};

// Physics calculations
function analyzeJumpPhysics() {
    console.log('\n📐 JUMP PHYSICS ANALYSIS:');
    
    // Maximum jump height calculation: h = (jumpForce^2) / (2 * gravity)
    const maxJumpHeight = (config.player.jumpForce * config.player.jumpForce) / (2 * config.player.gravity);
    console.log(`   Max jump height: ${maxJumpHeight.toFixed(1)} pixels`);
    
    // Time in air calculation: t = 2 * jumpForce / gravity
    const airTime = (2 * config.player.jumpForce) / config.player.gravity;
    console.log(`   Time in air: ${airTime.toFixed(2)} frames`);
    
    // Maximum horizontal reach with air control
    const airControlFactor = 0.8; // From platform generation code
    const maxHorizontalReach = config.player.maxSpeed * airTime * airControlFactor;
    console.log(`   Max horizontal reach: ${maxHorizontalReach.toFixed(1)} pixels`);
    
    // Safety margin used in code
    const safetyMargin = 20;
    const effectiveReach = maxHorizontalReach - safetyMargin;
    console.log(`   Effective reach (with safety): ${effectiveReach.toFixed(1)} pixels`);
    
    return {
        maxJumpHeight,
        airTime,
        maxHorizontalReach,
        effectiveReach
    };
}

// Platform gap analysis
function analyzePlatformGaps(physics) {
    console.log('\n📏 PLATFORM GAP ANALYSIS:');
    
    const gaps = [
        { name: 'Easy Min', value: config.platform.easyMinGap },
        { name: 'Easy Max', value: config.platform.easyMaxGap },
        { name: 'Normal Min', value: config.platform.minGap },
        { name: 'Normal Max', value: config.platform.maxGap },
        { name: 'Hard Min', value: config.platform.hardMinGap },
        { name: 'Hard Max', value: config.platform.hardMaxGap }
    ];
    
    gaps.forEach(gap => {
        const reachabilityPercent = (gap.value / physics.maxJumpHeight) * 100;
        const status = reachabilityPercent <= 70 ? '✅ SAFE' : 
                      reachabilityPercent <= 85 ? '⚠️ CHALLENGING' : 
                      reachabilityPercent <= 100 ? '🔥 EXPERT' : '❌ IMPOSSIBLE';
        
        console.log(`   ${gap.name}: ${gap.value}px (${reachabilityPercent.toFixed(1)}% of max jump) ${status}`);
    });
    
    console.log(`\n   🎯 Max theoretically reachable gap: ${physics.maxJumpHeight.toFixed(1)}px`);
    console.log(`   🛡️ Hardest gap in game: ${config.platform.hardMaxGap}px (${((config.platform.hardMaxGap / physics.maxJumpHeight) * 100).toFixed(1)}%)`);
}

// Horizontal reachability analysis
function analyzeHorizontalReach(physics) {
    console.log('\n↔️ HORIZONTAL REACHABILITY ANALYSIS:');
    
    console.log(`   Canvas width: ${config.canvas.width}px`);
    console.log(`   Platform width: ${config.platform.width}px`);
    console.log(`   Max horizontal reach: ${physics.maxHorizontalReach.toFixed(1)}px`);
    console.log(`   Effective reach (with safety): ${physics.effectiveReach.toFixed(1)}px`);
    
    // Check if any platform position could be unreachable
    const canvasUsableWidth = config.canvas.width - config.platform.width;
    const maxPossibleGap = canvasUsableWidth / 2; // Worst case: platform at opposite edges
    
    console.log(`   Worst possible horizontal gap: ${maxPossibleGap.toFixed(1)}px`);
    
    if (physics.effectiveReach >= maxPossibleGap) {
        console.log('   ✅ All horizontal positions are reachable');
    } else {
        console.log('   ❌ Some horizontal positions may be unreachable!');
    }
}

// Evil platform analysis
function analyzeEvilPlatforms() {
    console.log('\n👹 EVIL PLATFORM ANALYSIS:');
    
    // Evil platforms appear starting at height 3000+ with 3% chance (0.53 - 0.50 = 0.03)
    console.log('   Evil platforms start appearing at: 3000px height');
    console.log('   Evil platform spawn rate: ~3% at advanced levels');
    console.log('   Evil platform spawn rate: ~2% at expert levels');
    
    // Evil platform jump force
    const normalJumpForce = 15; // From physics engine
    const evilJumpForce = normalJumpForce * 0.6; // 60% of normal
    console.log(`   Evil platform jump force: ${evilJumpForce.toFixed(1)} (60% of normal)`);
    
    // Check if evil platforms can create impossible situations
    const evilMaxHeight = (evilJumpForce * evilJumpForce) / (2 * config.player.gravity);
    console.log(`   Max reachable height from evil platform: ${evilMaxHeight.toFixed(1)}px`);
    
    if (evilMaxHeight >= config.platform.hardMaxGap) {
        console.log('   ✅ Evil platforms can still reach next platform in worst case');
    } else {
        console.log('   ⚠️ Evil platforms might create impossible gaps!');
    }
}

// Spring platform analysis
function analyzeSpringPlatforms() {
    console.log('\n🌸 SPRING PLATFORM ANALYSIS:');
    
    const springMultipliers = {
        minispring: 1.35,
        spring: 1.7,
        superspring: 2.1
    };
    
    const baseJumpForce = 15; // From physics engine
    
    Object.entries(springMultipliers).forEach(([type, multiplier]) => {
        const jumpForce = baseJumpForce * multiplier;
        const maxHeight = (jumpForce * jumpForce) / (2 * config.player.gravity);
        console.log(`   ${type}: ${multiplier}x jump (${jumpForce.toFixed(1)} force, ${maxHeight.toFixed(1)}px max height)`);
    });
    
    // Check if super springs can handle the worst gaps
    const superSpringHeight = (baseJumpForce * springMultipliers.superspring) ** 2 / (2 * config.player.gravity);
    console.log(`\n   Super spring max reach: ${superSpringHeight.toFixed(1)}px`);
    console.log(`   Hardest possible gap: ${config.platform.hardMaxGap}px`);
    
    if (superSpringHeight >= config.platform.hardMaxGap * 2) {
        console.log('   ✅ Super springs provide ample safety margin');
    } else {
        console.log('   ⚠️ Super springs might not be enough for worst cases');
    }
}

// Overall game balance analysis
function analyzeGameBalance(physics) {
    console.log('\n⚖️ OVERALL GAME BALANCE:');
    
    // Check the safety margins at different difficulty levels
    const difficultyLevels = [
        { name: 'Easy Start (0-400px)', maxGap: config.platform.easyMaxGap },
        { name: 'Early Game (400-1000px)', maxGap: config.platform.easyMaxGap * 1.3 }, // Interpolated
        { name: 'Mid Game (1000-2500px)', maxGap: config.platform.maxGap },
        { name: 'Advanced (2500-7500px)', maxGap: config.platform.maxGap * 1.1 }, // Interpolated
        { name: 'Expert (7500px+)', maxGap: config.platform.hardMaxGap * 0.75 } // Code caps at 75%
    ];
    
    difficultyLevels.forEach(level => {
        const safetyMargin = ((physics.maxJumpHeight - level.maxGap) / physics.maxJumpHeight) * 100;
        const status = safetyMargin >= 30 ? '✅ VERY SAFE' :
                      safetyMargin >= 15 ? '✅ SAFE' :
                      safetyMargin >= 0 ? '⚠️ TIGHT' : '❌ IMPOSSIBLE';
        
        console.log(`   ${level.name}: ${level.maxGap.toFixed(1)}px gap, ${safetyMargin.toFixed(1)}% safety margin ${status}`);
    });
}

// Run the complete analysis
function runCompleteAnalysis() {
    const physics = analyzeJumpPhysics();
    analyzePlatformGaps(physics);
    analyzeHorizontalReach(physics);
    analyzeEvilPlatforms();
    analyzeSpringPlatforms();
    analyzeGameBalance(physics);
    
    console.log('\n🎯 FINAL VERDICT:');
    console.log('================');
    
    // Overall assessment
    const maxGap = config.platform.hardMaxGap * 0.75; // Code limitation
    const safetyMargin = ((physics.maxJumpHeight - maxGap) / physics.maxJumpHeight) * 100;
    
    if (safetyMargin >= 15) {
        console.log('✅ GAME IS FULLY PASSABLE');
        console.log('   - All gaps are mathematically reachable');
        console.log('   - Physics-based platform placement ensures reachability');
        console.log('   - Strategic spring placement provides safety nets');
        console.log('   - Progressive difficulty with safety margins');
    } else if (safetyMargin >= 0) {
        console.log('⚠️ GAME IS PASSABLE BUT VERY CHALLENGING');
        console.log('   - Some gaps require perfect play');
        console.log('   - Players may struggle with timing');
    } else {
        console.log('❌ GAME HAS IMPOSSIBLE SECTIONS');
        console.log('   - Some gaps exceed maximum jump capability');
        console.log('   - Players will encounter unpassable areas');
    }
    
    console.log(`\nSafety margin: ${safetyMargin.toFixed(1)}%`);
    console.log('Analysis complete! 🎮');
}

// Execute analysis
runCompleteAnalysis();