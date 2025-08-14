/**
 * 🧪 Balance System Diagnostic Tool
 * 
 * Simple script to test the balance and deposit system
 */

const { createClient } = require('@supabase/supabase-js');
const { indexDeposits } = require('./backend/deposit-indexer');
const { BalanceAPI } = require('./backend/balance-api');

async function testBalanceSystem() {
    console.log('🧪 Testing Balance System...\n');
    
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error('❌ Missing environment variables:');
        console.error('   SUPABASE_URL:', process.env.SUPABASE_URL ? 'SET' : 'MISSING');
        console.error('   SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING');
        return;
    }
    
    try {
        // Test Supabase connection
        console.log('1️⃣ Testing Supabase connection...');
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        
        const { data: testQuery, error: testError } = await supabase
            .from('user_balances')
            .select('count', { count: 'exact', head: true });
            
        if (testError) {
            console.error('❌ Supabase connection failed:', testError.message);
            return;
        }
        console.log('✅ Supabase connected successfully');
        
        // Test Balance API
        console.log('\n2️⃣ Testing Balance API...');
        const balanceAPI = new BalanceAPI(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        
        // Test with a dummy address
        const testAddress = '0x1234567890abcdef1234567890abcdef12345678';
        const balance = await balanceAPI.getBalance(testAddress);
        console.log(`✅ Balance API working. Test address balance: ${balance} ETH`);
        
        // Test deposit indexer
        console.log('\n3️⃣ Testing Deposit Indexer...');
        const hotWalletAddress = process.env.HOT_WALLET_ADDRESS || '0x02B4bFbA6D16308F5B40A5DF1f136C9472da52FF';
        console.log(`   Hot Wallet Address: ${hotWalletAddress}`);
        
        const indexResult = await indexDeposits({ 
            supabase, 
            hotWalletAddress,
            minConfirmations: 1,
            windowBlocks: 100n  // Small window for testing
        });
        console.log(`✅ Deposit indexer working. Scanned ${indexResult.scanned} blocks`);
        
        // Check recent deposits
        console.log('\n4️⃣ Checking recent deposits...');
        const { data: recentDeposits, error: depositsError } = await supabase
            .from('balance_deposits')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);
            
        if (depositsError) {
            console.error('❌ Error checking deposits:', depositsError.message);
        } else {
            console.log(`✅ Found ${recentDeposits.length} recent deposits:`);
            recentDeposits.forEach((deposit, i) => {
                console.log(`   ${i + 1}. ${deposit.from_address}: ${deposit.amount} ETH (${deposit.created_at})`);
            });
        }
        
        // Check user balances
        console.log('\n5️⃣ Checking user balances...');
        const { data: userBalances, error: balancesError } = await supabase
            .from('user_balances')
            .select('*')
            .gt('balance', 0)
            .order('balance', { ascending: false })
            .limit(5);
            
        if (balancesError) {
            console.error('❌ Error checking balances:', balancesError.message);
        } else {
            console.log(`✅ Found ${userBalances.length} users with balances:`);
            userBalances.forEach((user, i) => {
                console.log(`   ${i + 1}. ${user.address}: ${user.balance} ETH (updated: ${user.updated_at})`);
            });
        }
        
        console.log('\n🎉 Balance system diagnostic completed!');
        console.log('\n📋 Summary:');
        console.log('   ✅ Supabase connection: Working');
        console.log('   ✅ Balance API: Working');
        console.log('   ✅ Deposit Indexer: Working');
        console.log(`   📊 Recent deposits: ${recentDeposits?.length || 0}`);
        console.log(`   👥 Users with balance: ${userBalances?.length || 0}`);
        
    } catch (error) {
        console.error('❌ Diagnostic failed:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Run the test if this file is executed directly
if (require.main === module) {
    testBalanceSystem().then(() => process.exit(0));
}

module.exports = { testBalanceSystem };
