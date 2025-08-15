/**
 * 🚀 Startup Validation Script
 * 
 * Validates that all security systems are properly integrated before starting the server
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating Paco Rocko Security Integration...\n');

// Track validation results
let validationErrors = [];
let validationWarnings = [];

/**
 * Check if a file exists
 */
function checkFile(filePath, description, required = true) {
    const fullPath = path.join(__dirname, filePath);
    if (fs.existsSync(fullPath)) {
        console.log(`✅ ${description}`);
        return true;
    } else {
        const message = `❌ Missing: ${description} (${filePath})`;
        if (required) {
            validationErrors.push(message);
        } else {
            validationWarnings.push(message);
        }
        console.log(message);
        return false;
    }
}

/**
 * Check environment variable
 */
function checkEnvVar(varName, description, required = true) {
    if (process.env[varName]) {
        console.log(`✅ ${description}: Set`);
        return true;
    } else {
        const message = `${required ? '❌' : '⚠️'} ${description}: Not set (${varName})`;
        if (required) {
            validationErrors.push(message);
        } else {
            validationWarnings.push(message);
        }
        console.log(message);
        return false;
    }
}

/**
 * Validate file imports
 */
function validateImports() {
    console.log('📦 Validating security module imports...');
    try {
        require('./shared/multiplier-calculator');
        console.log('✅ MultiplierCalculator import');
        
        require('./utils/input-validator');
        console.log('✅ InputValidator import');
        
        require('./backend/bet-validator');
        console.log('✅ BetValidator import');
        
        require('./backend/provably-fair-rng');
        console.log('✅ ProvablyFairRNG import');
        
        require('./backend/solvency-manager');
        console.log('✅ SolvencyManager import');
        
        require('./backend/unified-crash-engine');
        console.log('✅ UnifiedCrashEngine import');
        
        require('./unified-production-integration');
        console.log('✅ UnifiedPacoRockoProduction import');
        
        return true;
    } catch (error) {
        validationErrors.push(`❌ Import error: ${error.message}`);
        console.log(`❌ Import error: ${error.message}`);
        return false;
    }
}

// Start validation
console.log('🔒 === PACO ROCKO SECURITY VALIDATION ===\n');

// 1. Check core security files
console.log('📁 Checking security files...');
checkFile('shared/multiplier-calculator.js', 'MultiplierCalculator');
checkFile('utils/input-validator.js', 'InputValidator');
checkFile('backend/bet-validator.js', 'BetValidator');
checkFile('backend/provably-fair-rng.js', 'ProvablyFairRNG');
checkFile('backend/solvency-manager.js', 'SolvencyManager');
checkFile('backend/balance-api.js', 'BalanceAPI');
checkFile('backend/unified-crash-engine.js', 'UnifiedCrashEngine');
checkFile('unified-production-integration.js', 'UnifiedPacoRockoProduction');

console.log();

// 2. Check database files
console.log('🗄️ Checking database files...');
checkFile('database/atomic-bet-functions.sql', 'Atomic database functions');

console.log();

// 3. Check test files
console.log('🧪 Checking test files...');
checkFile('tests/security-tests.js', 'Security test suite');
checkFile('test-integration.js', 'Integration test script');

console.log();

// 4. Check environment variables
console.log('🌍 Checking environment variables...');
checkEnvVar('SUPABASE_URL', 'Supabase URL');
checkEnvVar('SUPABASE_SERVICE_ROLE_KEY', 'Supabase Service Key');
checkEnvVar('HOUSE_WALLET_PRIVATE_KEY', 'House Wallet Private Key');
checkEnvVar('HOT_WALLET_ADDRESS', 'Hot Wallet Address');

// Optional environment variables
checkEnvVar('MAX_LIABILITY_FACTOR', 'Max Liability Factor', false);
checkEnvVar('MIN_RESERVE_ETH', 'Min Reserve ETH', false);
checkEnvVar('EMERGENCY_THRESHOLD', 'Emergency Threshold', false);
checkEnvVar('MIN_BET_AMOUNT', 'Min Bet Amount', false);
checkEnvVar('MAX_BET_AMOUNT', 'Max Bet Amount', false);
checkEnvVar('BET_COOLDOWN_MS', 'Bet Cooldown', false);
checkEnvVar('HOUSE_EDGE', 'House Edge', false);

console.log();

// 5. Validate imports
validateImports();

console.log();

// 6. Final results
console.log('📊 === VALIDATION RESULTS ===\n');

if (validationErrors.length === 0) {
    console.log('🎉 ALL VALIDATIONS PASSED!');
    console.log('✨ Your Paco Rocko security systems are ready for deployment!\n');
    
    if (validationWarnings.length > 0) {
        console.log('⚠️ Warnings (optional items):');
        validationWarnings.forEach(warning => console.log(`   ${warning}`));
        console.log();
    }
    
    console.log('🚀 Next steps:');
    console.log('1. Run: node crash-casino/tests/security-tests.js');
    console.log('2. Install database functions: Copy crash-casino/database/atomic-bet-functions.sql to your database');
    console.log('3. Start your server with enhanced security enabled');
    console.log('4. Monitor admin endpoints: /api/admin/health, /api/admin/solvency, /api/admin/security');
    
    process.exit(0);
} else {
    console.log('❌ VALIDATION FAILED!');
    console.log('\nErrors that must be fixed:');
    validationErrors.forEach(error => console.log(`   ${error}`));
    
    if (validationWarnings.length > 0) {
        console.log('\nWarnings (optional):');
        validationWarnings.forEach(warning => console.log(`   ${warning}`));
    }
    
    console.log('\n💡 Please fix the errors above before deploying.');
    process.exit(1);
}
