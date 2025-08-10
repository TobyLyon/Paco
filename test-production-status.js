/**
 * 🔍 Production Status Test
 * Test all production endpoints and provide detailed diagnostics
 */

const https = require('https');

async function checkServerHealth() {
    console.log('🩺 Checking server health...');
    
    return new Promise((resolve) => {
        const req = https.get('https://paco-x57j.onrender.com/health', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log('✅ Health check result:', result);
                    resolve(result);
                } catch (error) {
                    console.error('❌ Health check failed:', error);
                    resolve(null);
                }
            });
        });
        
        req.on('error', (error) => {
            console.error('❌ Health request failed:', error);
            resolve(null);
        });
    });
}

async function checkGameStats() {
    console.log('📊 Checking game statistics...');
    
    return new Promise((resolve) => {
        const req = https.get('https://paco-x57j.onrender.com/api/crash/stats', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log('✅ Game stats result:', result);
                    resolve(result);
                } catch (error) {
                    console.error('❌ Game stats failed:', error);
                    resolve(null);
                }
            });
        });
        
        req.on('error', (error) => {
            console.error('❌ Game stats request failed:', error);
            resolve(null);
        });
    });
}

async function checkSocketIOHandshake() {
    console.log('🤝 Testing Socket.IO handshake...');
    
    return new Promise((resolve) => {
        const req = https.get('https://paco-x57j.onrender.com/crash-ws/?EIO=4&transport=polling', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log('📊 Socket.IO handshake status:', res.statusCode);
                console.log('📊 Socket.IO response:', data.substring(0, 100));
                resolve(res.statusCode === 200);
            });
        });
        
        req.on('error', (error) => {
            console.error('❌ Socket.IO handshake failed:', error);
            resolve(false);
        });
    });
}

async function runAllChecks() {
    console.log('🎯 PRODUCTION STATUS CHECK');
    console.log('==========================\n');
    
    const health = await checkServerHealth();
    const stats = await checkGameStats();
    const socketIO = await checkSocketIOHandshake();
    
    console.log('\n📋 SUMMARY:');
    console.log('============');
    console.log(`Health Endpoint: ${health ? '✅ Working' : '❌ Failed'}`);
    console.log(`Game Statistics: ${stats ? '✅ Working' : '❌ Failed'}`);
    console.log(`Socket.IO Handshake: ${socketIO ? '✅ Working' : '❌ Failed'}`);
    
    if (health && stats && socketIO) {
        console.log('\n🎉 ALL SYSTEMS GO! PacoRocko is ready for production!');
    } else {
        console.log('\n⚠️ Some systems need attention. Check the logs above.');
    }
    
    // Check if game engine is running
    if (stats && stats.totalRounds !== undefined) {
        console.log(`\n🎮 Game Engine Status:`);
        console.log(`- Total Rounds: ${stats.totalRounds || 0}`);
        console.log(`- Server Time: ${new Date(stats.serverTime).toLocaleString()}`);
        console.log(`- Version: ${stats.version || 'Unknown'}`);
    }
}

runAllChecks().catch(console.error);
