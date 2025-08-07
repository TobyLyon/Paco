/**
 * 🧪 Test PacoRocko Crash Casino Integration
 */

const axios = require('axios');

async function testCrashIntegration() {
    console.log('🧪 Testing PacoRocko Crash Casino Integration...\n');
    
    try {
        // Test main website
        console.log('1. Testing main website...');
        const mainResponse = await axios.get('http://localhost:3000');
        console.log('✅ Main website is running');
        
        // Test PacoRocko route
        console.log('2. Testing PacoRocko route...');
        const pacoRockoResponse = await axios.get('http://localhost:3000/PacoRocko');
        console.log('✅ PacoRocko route is accessible');
        
        // Test crash casino stats API
        console.log('3. Testing crash casino stats API...');
        const statsResponse = await axios.get('http://localhost:3000/api/crash/stats');
        console.log('✅ Crash casino API is running');
        console.log('📊 Game Stats:', JSON.stringify(statsResponse.data, null, 2));
        
        // Test crash casino history API
        console.log('4. Testing crash casino history API...');
        const historyResponse = await axios.get('http://localhost:3000/api/crash/history');
        console.log('✅ Crash casino history API is working');
        console.log('📈 History:', JSON.stringify(historyResponse.data, null, 2));
        
        console.log('\n🎉 All tests passed! PacoRocko Crash Casino is ready!');
        console.log('\n🎮 To play:');
        console.log('   1. Visit: http://localhost:3000/PacoRocko');
        console.log('   2. Connect your MetaMask wallet');
        console.log('   3. Place bets and enjoy the crash casino!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.log('\n🔧 Server not running. Please start with: npm start');
        } else if (error.response?.status === 404) {
            console.log('\n🔧 Route not found. Check the server integration.');
        }
    }
}

// Run test if called directly
if (require.main === module) {
    testCrashIntegration();
}

module.exports = testCrashIntegration;