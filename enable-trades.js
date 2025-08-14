#!/usr/bin/env node

/**
 * 🐔 Paco Trades Enabler
 * 
 * This script helps enable the Paco Trades feature on your deployment platform.
 * It provides instructions for setting the required environment variable.
 */

console.log('🐔 PACO TRADES ENABLER');
console.log('====================\n');

console.log('🎯 To enable the Paco Trades P2P NFT trading platform:\n');

console.log('📋 STEP 1: Set Environment Variable');
console.log('   On Render.com:');
console.log('   1. Go to your service dashboard');
console.log('   2. Navigate to "Environment" tab');
console.log('   3. Add new environment variable:');
console.log('      Key: TRADES_ENABLED');
console.log('      Value: true');
console.log('   4. Save and deploy\n');

console.log('📋 STEP 2: Verify Feature is Active');
console.log('   1. Visit: https://your-domain.com/config');
console.log('   2. Check that "trades": true in the response');
console.log('   3. Visit: https://your-domain.com/trades');
console.log('   4. You should see the Paco Trades dashboard! 🎉\n');

console.log('📋 STEP 3: Complete Setup (Optional)');
console.log('   - Deploy SwapEscrow contract to Abstract Mainnet');
console.log('   - Configure Supabase database tables');
console.log('   - Set additional TRADES_* environment variables');
console.log('   - See README_TRADES.md for full setup guide\n');

console.log('🔍 Current Configuration Check');
console.log('==============================');

const tradesEnabled = process.env.TRADES_ENABLED === 'true';
console.log(`TRADES_ENABLED: ${tradesEnabled ? '✅ true' : '❌ false (set to "true" to enable)'}`);

if (tradesEnabled) {
    console.log('\n🎉 Trades feature is ENABLED!');
    console.log('   Your NFT trading platform should be live at /trades');
} else {
    console.log('\n⚠️  Trades feature is DISABLED');
    console.log('   Set TRADES_ENABLED=true in your environment to activate');
}

console.log('\n🐔 Happy trading! - The Paco Team');