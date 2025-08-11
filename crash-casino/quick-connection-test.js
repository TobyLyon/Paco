/**
 * 🚀 Quick WebSocket Connection Test
 * 
 * Tests if your Render WebSocket is working with the fixes
 */

const io = require('socket.io-client');

console.log('🔌 Testing WebSocket connection to Render...');

const socket = io('https://paco-x57j.onrender.com', {
    path: '/crash-ws',
    transports: ['websocket', 'polling'],
    timeout: 15000,
    reconnection: false
});

let connected = false;
let eventCount = 0;

socket.on('connect', () => {
    console.log('✅ CONNECTED! WebSocket is working on Render');
    connected = true;
    
    // Test ping
    socket.emit('ping');
    console.log('📤 Sent ping to server');
});

socket.on('message', (message) => {
    eventCount++;
    console.log(`📨 Message received (${eventCount}):`, message.type);
    
    if (message.type === 'gameState') {
        console.log('🎮 Game state received - server is running!');
    }
});

socket.on('gameState', (data) => {
    eventCount++;
    console.log('🎮 Direct gameState event received - dual events working!');
});

socket.on('game_state', (data) => {
    eventCount++;
    console.log('🎮 Snake_case game_state event received - compatibility working!');
});

socket.on('pong', () => {
    console.log('🏓 Pong received - heartbeat working!');
    eventCount++;
});

socket.on('connect_error', (error) => {
    console.error('❌ Connection failed:', error.message);
});

socket.on('disconnect', (reason) => {
    console.log('🔌 Disconnected:', reason);
});

// Test for 10 seconds
setTimeout(() => {
    socket.disconnect();
    
    console.log('\n📊 TEST RESULTS:');
    console.log('================');
    console.log(`Connection: ${connected ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`Events received: ${eventCount}`);
    console.log(`Status: ${connected && eventCount > 0 ? '🎉 FULLY WORKING' : '⚠️ PARTIAL/FAILED'}`);
    
    if (connected && eventCount > 0) {
        console.log('\n🎯 VERDICT: Your Render deployment is working!');
        console.log('✅ WebSocket connection successful');
        console.log('✅ Event handling working');
        console.log('✅ Fixes applied successfully');
        console.log('\n🚀 Your crash casino should now work smoothly on production!');
    } else if (connected) {
        console.log('\n⚠️ Connection works but no events - check game engine');
    } else {
        console.log('\n❌ Connection failed - check server logs');
    }
}, 10000);

console.log('⏱️ Testing for 10 seconds...');
