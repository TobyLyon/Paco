/**
 * 🧪 PacoRocko Production System Testing Suite
 * 
 * Comprehensive testing for the crash casino system
 */

const io = require('socket.io-client');
const fetch = require('node-fetch');

class PacoRockoTester {
    constructor(config = {}) {
        this.config = {
            serverUrl: config.serverUrl || 'http://localhost:3000',
            wsUrl: config.wsUrl || 'ws://localhost:3000',
            testWallet: config.testWallet || '0x1234567890123456789012345678901234567890',
            ...config
        };
        
        this.socket = null;
        this.testResults = [];
        this.currentRound = null;
        this.betPlaced = false;
    }

    /**
     * 🚀 Run all tests
     */
    async runAllTests() {
        console.log('🧪 Starting PacoRocko Production System Tests...\n');
        
        try {
            await this.testAPIEndpoints();
            await this.testWebSocketConnection();
            await this.testGameFlow();
            await this.testWalletIntegration();
            await this.testErrorHandling();
            
            this.printResults();
            
        } catch (error) {
            console.error('❌ Test suite failed:', error);
        } finally {
            if (this.socket) {
                this.socket.disconnect();
            }
        }
    }

    /**
     * 🌐 Test API Endpoints
     */
    async testAPIEndpoints() {
        console.log('📡 Testing API Endpoints...');
        
        const tests = [
            {
                name: 'Health Check',
                url: '/api/crash/health',
                expectedStatus: 200
            },
            {
                name: 'Game Statistics',
                url: '/api/crash/stats',
                expectedStatus: 200
            },
            {
                name: 'Game History',
                url: '/api/crash/history',
                expectedStatus: 200
            },
            {
                name: 'Player Balance',
                url: `/api/crash/wallet/${this.config.testWallet}/balance`,
                expectedStatus: 200
            },
            {
                name: 'Player Statistics',
                url: `/api/crash/player/${this.config.testWallet}`,
                expectedStatus: 200
            }
        ];

        for (const test of tests) {
            try {
                const response = await fetch(`${this.config.serverUrl}${test.url}`);
                const success = response.status === test.expectedStatus;
                
                this.testResults.push({
                    category: 'API',
                    name: test.name,
                    success,
                    details: success ? 'OK' : `Expected ${test.expectedStatus}, got ${response.status}`
                });

                console.log(`  ${success ? '✅' : '❌'} ${test.name}: ${success ? 'PASS' : 'FAIL'}`);
                
            } catch (error) {
                this.testResults.push({
                    category: 'API',
                    name: test.name,
                    success: false,
                    details: error.message
                });
                console.log(`  ❌ ${test.name}: FAIL - ${error.message}`);
            }
        }
        
        console.log('');
    }

    /**
     * 🔌 Test WebSocket Connection
     */
    async testWebSocketConnection() {
        console.log('🔌 Testing WebSocket Connection...');
        
        return new Promise((resolve) => {
            this.socket = io(`${this.config.serverUrl}/crash-ws`, {
                transports: ['websocket', 'polling'],
                timeout: 10000
            });

            let connected = false;
            let authenticated = false;
            let gameStateReceived = false;

            // Test connection
            this.socket.on('connect', () => {
                connected = true;
                console.log('  ✅ WebSocket Connected: PASS');
                
                // Test authentication
                this.socket.emit('authenticate', {
                    walletAddress: this.config.testWallet,
                    token: 'test-token'
                });
            });

            this.socket.on('message', (message) => {
                switch (message.type) {
                    case 'authenticated':
                        if (message.data.success) {
                            authenticated = true;
                            console.log('  ✅ Authentication: PASS');
                        }
                        break;
                        
                    case 'gameState':
                        gameStateReceived = true;
                        this.currentRound = message.data.roundId;
                        console.log('  ✅ Game State Received: PASS');
                        break;
                        
                    case 'roundStarted':
                        console.log('  ✅ Round Started Event: PASS');
                        break;
                        
                    case 'multiplierUpdate':
                        console.log('  ✅ Multiplier Update: PASS');
                        break;
                }
            });

            this.socket.on('disconnect', () => {
                console.log('  🔌 WebSocket Disconnected');
            });

            this.socket.on('connect_error', (error) => {
                console.log(`  ❌ WebSocket Connection: FAIL - ${error.message}`);
            });

            // Wait for tests to complete
            setTimeout(() => {
                this.testResults.push(
                    {
                        category: 'WebSocket',
                        name: 'Connection',
                        success: connected,
                        details: connected ? 'Connected successfully' : 'Failed to connect'
                    },
                    {
                        category: 'WebSocket',
                        name: 'Authentication',
                        success: authenticated,
                        details: authenticated ? 'Authenticated successfully' : 'Authentication failed'
                    },
                    {
                        category: 'WebSocket',
                        name: 'Game State',
                        success: gameStateReceived,
                        details: gameStateReceived ? 'Game state received' : 'No game state received'
                    }
                );
                
                console.log('');
                resolve();
            }, 5000);
        });
    }

    /**
     * 🎮 Test Game Flow
     */
    async testGameFlow() {
        console.log('🎮 Testing Game Flow...');
        
        if (!this.socket || !this.socket.connected) {
            console.log('  ❌ Cannot test game flow - no WebSocket connection');
            return;
        }

        return new Promise((resolve) => {
            let betPlaced = false;
            let roundStarted = false;
            let multiplierUpdates = 0;
            let roundCrashed = false;

            // Test bet placement
            this.socket.emit('placeBet', {
                amount: 0.01 // 0.01 ETH
            });

            this.socket.on('message', (message) => {
                switch (message.type) {
                    case 'betPlaced':
                        betPlaced = message.data.success;
                        this.betPlaced = betPlaced;
                        console.log(`  ${betPlaced ? '✅' : '❌'} Bet Placement: ${betPlaced ? 'PASS' : 'FAIL'}`);
                        break;
                        
                    case 'roundStarted':
                        roundStarted = true;
                        console.log('  ✅ Round Started: PASS');
                        break;
                        
                    case 'multiplierUpdate':
                        multiplierUpdates++;
                        if (multiplierUpdates === 1) {
                            console.log('  ✅ Multiplier Updates: PASS');
                        }
                        
                        // Test cash out at 2x
                        if (this.betPlaced && message.data.multiplier >= 2.0) {
                            this.socket.emit('cashOut');
                            this.betPlaced = false;
                        }
                        break;
                        
                    case 'cashOutSuccess':
                        console.log('  ✅ Cash Out: PASS');
                        break;
                        
                    case 'roundCrashed':
                        roundCrashed = true;
                        console.log('  ✅ Round Crashed: PASS');
                        break;
                        
                    case 'error':
                        console.log(`  ⚠️ Game Error: ${message.data.message}`);
                        break;
                }
            });

            // Wait for game flow to complete
            setTimeout(() => {
                this.testResults.push(
                    {
                        category: 'Game Flow',
                        name: 'Bet Placement',
                        success: betPlaced,
                        details: betPlaced ? 'Bet placed successfully' : 'Bet placement failed'
                    },
                    {
                        category: 'Game Flow',
                        name: 'Round Progression',
                        success: roundStarted,
                        details: roundStarted ? 'Round started properly' : 'Round failed to start'
                    },
                    {
                        category: 'Game Flow',
                        name: 'Multiplier Updates',
                        success: multiplierUpdates > 0,
                        details: `Received ${multiplierUpdates} updates`
                    }
                );
                
                console.log('');
                resolve();
            }, 15000); // Wait 15 seconds for a full round
        });
    }

    /**
     * 💰 Test Wallet Integration
     */
    async testWalletIntegration() {
        console.log('💰 Testing Wallet Integration...');
        
        try {
            // Test balance endpoint
            const balanceResponse = await fetch(
                `${this.config.serverUrl}/api/crash/wallet/${this.config.testWallet}/balance`
            );
            const balanceData = await balanceResponse.json();
            
            const balanceTest = balanceResponse.status === 200 && 
                               typeof balanceData.available === 'number';
            
            console.log(`  ${balanceTest ? '✅' : '❌'} Balance Check: ${balanceTest ? 'PASS' : 'FAIL'}`);
            
            // Test player stats
            const statsResponse = await fetch(
                `${this.config.serverUrl}/api/crash/player/${this.config.testWallet}`
            );
            const statsData = await statsResponse.json();
            
            const statsTest = statsResponse.status === 200 && 
                             statsData.address === this.config.testWallet;
            
            console.log(`  ${statsTest ? '✅' : '❌'} Player Stats: ${statsTest ? 'PASS' : 'FAIL'}`);
            
            this.testResults.push(
                {
                    category: 'Wallet',
                    name: 'Balance Check',
                    success: balanceTest,
                    details: balanceTest ? `Balance: ${balanceData.available}` : 'Balance check failed'
                },
                {
                    category: 'Wallet',
                    name: 'Player Stats',
                    success: statsTest,
                    details: statsTest ? 'Stats retrieved successfully' : 'Stats retrieval failed'
                }
            );
            
        } catch (error) {
            console.log(`  ❌ Wallet Integration: FAIL - ${error.message}`);
            this.testResults.push({
                category: 'Wallet',
                name: 'Integration',
                success: false,
                details: error.message
            });
        }
        
        console.log('');
    }

    /**
     * ⚠️ Test Error Handling
     */
    async testErrorHandling() {
        console.log('⚠️ Testing Error Handling...');
        
        const tests = [
            {
                name: 'Invalid Bet Amount',
                action: () => this.socket.emit('placeBet', { amount: -1 }),
                expectedError: true
            },
            {
                name: 'Bet Without Auth',
                action: () => {
                    // Create temporary socket without auth
                    const tempSocket = io(`${this.config.serverUrl}/crash-ws`);
                    tempSocket.emit('placeBet', { amount: 0.01 });
                    setTimeout(() => tempSocket.disconnect(), 1000);
                },
                expectedError: true
            },
            {
                name: 'Cash Out Without Bet',
                action: () => this.socket.emit('cashOut'),
                expectedError: true
            }
        ];

        for (const test of tests) {
            let errorReceived = false;
            
            const errorHandler = (message) => {
                if (message.type === 'error') {
                    errorReceived = true;
                }
            };
            
            this.socket.on('message', errorHandler);
            
            await new Promise((resolve) => {
                test.action();
                setTimeout(() => {
                    this.socket.off('message', errorHandler);
                    
                    const success = test.expectedError ? errorReceived : !errorReceived;
                    console.log(`  ${success ? '✅' : '❌'} ${test.name}: ${success ? 'PASS' : 'FAIL'}`);
                    
                    this.testResults.push({
                        category: 'Error Handling',
                        name: test.name,
                        success,
                        details: success ? 'Error handled correctly' : 'Error handling failed'
                    });
                    
                    resolve();
                }, 2000);
            });
        }
        
        console.log('');
    }

    /**
     * 📊 Print Test Results
     */
    printResults() {
        console.log('📊 Test Results Summary:');
        console.log('='.repeat(50));
        
        const categories = [...new Set(this.testResults.map(r => r.category))];
        let totalTests = 0;
        let passedTests = 0;
        
        categories.forEach(category => {
            const categoryTests = this.testResults.filter(r => r.category === category);
            const passed = categoryTests.filter(r => r.success).length;
            
            console.log(`\n${category}:`);
            categoryTests.forEach(test => {
                console.log(`  ${test.success ? '✅' : '❌'} ${test.name}: ${test.details}`);
            });
            
            console.log(`  → ${passed}/${categoryTests.length} tests passed`);
            
            totalTests += categoryTests.length;
            passedTests += passed;
        });
        
        console.log('\n' + '='.repeat(50));
        console.log(`🎯 OVERALL: ${passedTests}/${totalTests} tests passed (${Math.round(passedTests/totalTests*100)}%)`);
        
        if (passedTests === totalTests) {
            console.log('🎉 All tests passed! Production system is ready! 🚀');
        } else {
            console.log('⚠️  Some tests failed. Please review the issues above.');
        }
    }
}

// Run tests if called directly
if (require.main === module) {
    const tester = new PacoRockoTester({
        serverUrl: process.env.TEST_SERVER_URL || 'http://localhost:3000',
        testWallet: process.env.TEST_WALLET || '0x1234567890123456789012345678901234567890'
    });
    
    tester.runAllTests().then(() => {
        process.exit(0);
    }).catch((error) => {
        console.error('❌ Test suite failed:', error);
        process.exit(1);
    });
}

module.exports = PacoRockoTester;
