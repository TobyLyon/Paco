/**
 * 🌐 Socket.IO Load Test - Stress test for 200-1000 concurrent clients
 * 
 * Simulates realistic user behavior:
 * - Connect with WebSocket
 * - Authenticate
 * - Place random bets
 * - Random cashouts
 * - Handle reconnections
 */

import { io } from 'socket.io-client';
import fetch from 'node-fetch';

const N = Number(process.env.N || 300);
const URL = process.env.URL || 'ws://localhost:3001';
const API_URL = process.env.API_URL || 'http://localhost:3000/api';
const DURATION_MS = Number(process.env.DURATION_MS || 300000); // 5 minutes

class SocketLoadTest {
    constructor() {
        this.clients = [];
        this.metrics = {
            totalConnections: 0,
            successfulConnections: 0,
            failedConnections: 0,
            totalBets: 0,
            successfulBets: 0,
            failedBets: 0,
            totalCashouts: 0,
            successfulCashouts: 0,
            failedCashouts: 0,
            reconnections: 0,
            avgLatency: 0,
            maxLatency: 0,
            errors: []
        };
        this.startTime = Date.now();
        this.isRunning = false;
    }

    /**
     * 🚀 Start load test
     */
    async start() {
        console.log(`🚀 Starting Socket.IO load test`);
        console.log(`   Clients: ${N}`);
        console.log(`   URL: ${URL}`);
        console.log(`   Duration: ${DURATION_MS / 1000}s`);
        console.log(`   API: ${API_URL}`);

        this.isRunning = true;
        this.startTime = Date.now();

        // Start metrics reporting
        this.startMetricsReporting();

        // Spawn clients with staggered start
        for (let i = 0; i < N; i++) {
            setTimeout(() => {
                if (this.isRunning) {
                    this.spawnClient(i);
                }
            }, i * 50); // 50ms between spawns to avoid thundering herd
        }

        // Stop after duration
        setTimeout(() => {
            this.stop();
        }, DURATION_MS);
    }

    /**
     * 👤 Spawn a single client
     */
    async spawnClient(clientId) {
        const client = {
            id: clientId,
            userId: `test-user-${clientId}`,
            socket: null,
            isConnected: false,
            lastEventId: 0,
            balance: 0.1, // Starting balance
            activeBet: null,
            metrics: {
                betsPlaced: 0,
                cashoutsAttempted: 0,
                reconnects: 0,
                errors: 0
            }
        };

        try {
            await this.connectClient(client);
            this.clients.push(client);
            this.startClientBehavior(client);
        } catch (error) {
            this.metrics.failedConnections++;
            this.logError(`Client ${clientId} spawn failed:`, error);
        }
    }

    /**
     * 🔌 Connect client to WebSocket
     */
    async connectClient(client) {
        return new Promise((resolve, reject) => {
            this.metrics.totalConnections++;

            const socket = io(URL, {
                transports: ['websocket'],
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000
            });

            client.socket = socket;

            const connectTimeout = setTimeout(() => {
                reject(new Error('Connection timeout'));
            }, 10000);

            socket.on('connect', () => {
                clearTimeout(connectTimeout);
                client.isConnected = true;
                this.metrics.successfulConnections++;

                // Send hello with last event ID
                socket.emit('hello', {
                    lastEventId: client.lastEventId,
                    userId: client.userId
                });

                resolve();
            });

            socket.on('hello_ack', (data) => {
                if (data.success) {
                    console.log(`✅ Client ${client.id} connected and acknowledged`);
                } else {
                    this.logError(`Client ${client.id} hello failed:`, data.error);
                }
            });

            socket.on('event', (event) => {
                client.lastEventId = event.id;
                this.handleClientEvent(client, event);
            });

            socket.on('snapshot', (snapshot) => {
                client.lastEventId = snapshot.eventId;
                this.handleClientSnapshot(client, snapshot);
            });

            socket.on('disconnect', (reason) => {
                client.isConnected = false;
                console.log(`💔 Client ${client.id} disconnected: ${reason}`);
            });

            socket.on('reconnect', () => {
                client.isConnected = true;
                client.metrics.reconnects++;
                this.metrics.reconnections++;
                console.log(`🔄 Client ${client.id} reconnected`);
            });

            socket.on('error', (error) => {
                client.metrics.errors++;
                this.logError(`Client ${client.id} socket error:`, error);
            });

            socket.on('connect_error', (error) => {
                clearTimeout(connectTimeout);
                reject(error);
            });
        });
    }

    /**
     * 🎮 Start client behavior (betting, cashouts, etc.)
     */
    startClientBehavior(client) {
        const behaviorLoop = async () => {
            while (this.isRunning && client.isConnected) {
                try {
                    await this.jitter(1000, 3000); // Wait 1-3 seconds

                    // Random action
                    const action = Math.random();
                    
                    if (action < 0.6 && !client.activeBet) {
                        // 60% chance to place bet if no active bet
                        await this.placeBet(client);
                    } else if (action < 0.8 && client.activeBet) {
                        // 20% chance to cashout if has active bet
                        await this.cashOut(client);
                    }
                    // 20% chance to do nothing (idle)

                } catch (error) {
                    client.metrics.errors++;
                    this.logError(`Client ${client.id} behavior error:`, error);
                    await this.jitter(5000, 10000); // Longer wait on error
                }
            }
        };

        behaviorLoop();
    }

    /**
     * 🎯 Place a bet
     */
    async placeBet(client) {
        if (!client.isConnected || client.activeBet) return;

        const betAmount = this.randomBetAmount();
        if (betAmount > client.balance) return; // Insufficient balance

        const startTime = Date.now();
        this.metrics.totalBets++;
        client.metrics.betsPlaced++;

        try {
            const response = await fetch(`${API_URL}/bet/place`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': client.userId
                },
                body: JSON.stringify({
                    userAddress: client.userId,
                    amountEth: betAmount,
                    roundId: 'current-round',
                    clientId: this.generateClientId(),
                    expectedVersion: 0
                }),
                timeout: 5000
            });

            const latency = Date.now() - startTime;
            this.updateLatencyMetrics(latency);

            if (response.ok) {
                const result = await response.json();
                client.balance = result.newBalance?.available || client.balance;
                client.activeBet = { amount: betAmount, timestamp: Date.now() };
                this.metrics.successfulBets++;
                
                console.log(`🎯 Client ${client.id} placed bet: ${betAmount} ETH (${latency}ms)`);
            } else {
                this.metrics.failedBets++;
                const error = await response.text();
                this.logError(`Client ${client.id} bet failed:`, error);
            }

        } catch (error) {
            this.metrics.failedBets++;
            this.logError(`Client ${client.id} bet request failed:`, error);
        }
    }

    /**
     * 💰 Attempt cashout
     */
    async cashOut(client) {
        if (!client.isConnected || !client.activeBet) return;

        // Only cashout if bet has been active for at least 2 seconds
        if (Date.now() - client.activeBet.timestamp < 2000) return;

        const startTime = Date.now();
        this.metrics.totalCashouts++;
        client.metrics.cashoutsAttempted++;

        try {
            // Emit cashout via socket
            client.socket.emit('cash_out', {
                userId: client.userId,
                clientId: this.generateClientId()
            });

            // Listen for response
            const cashoutPromise = new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('Cashout timeout')), 5000);

                const successHandler = (data) => {
                    clearTimeout(timeout);
                    client.socket.off('cashout_success', successHandler);
                    client.socket.off('cashout_error', errorHandler);
                    resolve(data);
                };

                const errorHandler = (error) => {
                    clearTimeout(timeout);
                    client.socket.off('cashout_success', successHandler);
                    client.socket.off('cashout_error', errorHandler);
                    reject(error);
                };

                client.socket.on('cashout_success', successHandler);
                client.socket.on('cashout_error', errorHandler);
            });

            const result = await cashoutPromise;
            const latency = Date.now() - startTime;
            this.updateLatencyMetrics(latency);

            client.activeBet = null;
            client.balance = result.newBalance || client.balance;
            this.metrics.successfulCashouts++;
            
            console.log(`💰 Client ${client.id} cashed out: ${result.multiplier}x (${latency}ms)`);

        } catch (error) {
            this.metrics.failedCashouts++;
            this.logError(`Client ${client.id} cashout failed:`, error);
        }
    }

    /**
     * 📊 Handle client event
     */
    handleClientEvent(client, event) {
        switch (event.type) {
            case 'balance_update':
                client.balance = event.payload.available || client.balance;
                break;
            case 'round_start':
                // Round started, clear any stale bets
                if (client.activeBet && Date.now() - client.activeBet.timestamp > 30000) {
                    client.activeBet = null;
                }
                break;
            case 'round_crash':
                // Round crashed, clear active bet if not cashed out
                if (client.activeBet) {
                    client.activeBet = null;
                }
                break;
        }
    }

    /**
     * 📸 Handle client snapshot
     */
    handleClientSnapshot(client, snapshot) {
        console.log(`📸 Client ${client.id} received snapshot`);
        // Update client state from snapshot
        if (snapshot.gameState) {
            // Process game state
        }
    }

    /**
     * 📊 Start metrics reporting
     */
    startMetricsReporting() {
        const reportInterval = setInterval(() => {
            if (!this.isRunning) {
                clearInterval(reportInterval);
                return;
            }

            this.printMetrics();
        }, 10000); // Report every 10 seconds
    }

    /**
     * 📊 Print current metrics
     */
    printMetrics() {
        const elapsed = (Date.now() - this.startTime) / 1000;
        const connectedClients = this.clients.filter(c => c.isConnected).length;
        
        console.log('\n📊 LOAD TEST METRICS');
        console.log('====================================');
        console.log(`⏱️  Elapsed: ${elapsed.toFixed(1)}s`);
        console.log(`🔌 Connections: ${this.metrics.successfulConnections}/${this.metrics.totalConnections} (${connectedClients} active)`);
        console.log(`🎯 Bets: ${this.metrics.successfulBets}/${this.metrics.totalBets} (${((this.metrics.successfulBets/this.metrics.totalBets)*100 || 0).toFixed(1)}% success)`);
        console.log(`💰 Cashouts: ${this.metrics.successfulCashouts}/${this.metrics.totalCashouts} (${((this.metrics.successfulCashouts/this.metrics.totalCashouts)*100 || 0).toFixed(1)}% success)`);
        console.log(`🔄 Reconnections: ${this.metrics.reconnections}`);
        console.log(`⚡ Latency: avg ${this.metrics.avgLatency.toFixed(0)}ms, max ${this.metrics.maxLatency}ms`);
        console.log(`❌ Errors: ${this.metrics.errors.length}`);
        
        if (this.metrics.errors.length > 0) {
            console.log(`   Recent errors: ${this.metrics.errors.slice(-3).map(e => e.message).join(', ')}`);
        }
    }

    /**
     * 📊 Update latency metrics
     */
    updateLatencyMetrics(latency) {
        this.metrics.maxLatency = Math.max(this.metrics.maxLatency, latency);
        
        // Rolling average
        if (this.metrics.avgLatency === 0) {
            this.metrics.avgLatency = latency;
        } else {
            this.metrics.avgLatency = (this.metrics.avgLatency * 0.9) + (latency * 0.1);
        }
    }

    /**
     * 🛑 Stop load test
     */
    stop() {
        console.log('\n🛑 Stopping load test...');
        this.isRunning = false;

        // Disconnect all clients
        this.clients.forEach(client => {
            if (client.socket) {
                client.socket.disconnect();
            }
        });

        // Final metrics
        this.printFinalResults();
    }

    /**
     * 📊 Print final results
     */
    printFinalResults() {
        const elapsed = (Date.now() - this.startTime) / 1000;
        
        console.log('\n🎯 FINAL LOAD TEST RESULTS');
        console.log('====================================');
        console.log(`⏱️  Total Duration: ${elapsed.toFixed(1)}s`);
        console.log(`🔌 Connection Success Rate: ${((this.metrics.successfulConnections/this.metrics.totalConnections)*100).toFixed(1)}%`);
        console.log(`🎯 Bet Success Rate: ${((this.metrics.successfulBets/this.metrics.totalBets)*100 || 0).toFixed(1)}%`);
        console.log(`💰 Cashout Success Rate: ${((this.metrics.successfulCashouts/this.metrics.totalCashouts)*100 || 0).toFixed(1)}%`);
        console.log(`⚡ Average Latency: ${this.metrics.avgLatency.toFixed(0)}ms`);
        console.log(`⚡ Max Latency: ${this.metrics.maxLatency}ms`);
        console.log(`🔄 Total Reconnections: ${this.metrics.reconnections}`);
        console.log(`❌ Total Errors: ${this.metrics.errors.length}`);

        // Pass/fail criteria
        const connectionSuccessRate = (this.metrics.successfulConnections/this.metrics.totalConnections) * 100;
        const betSuccessRate = (this.metrics.successfulBets/this.metrics.totalBets) * 100 || 100;
        const avgLatency = this.metrics.avgLatency;

        const passed = connectionSuccessRate >= 99.5 && 
                       betSuccessRate >= 95 && 
                       avgLatency <= 150;

        if (passed) {
            console.log('\n✅ LOAD TEST PASSED - System handles load well!');
        } else {
            console.log('\n❌ LOAD TEST FAILED - Performance issues detected');
            if (connectionSuccessRate < 99.5) console.log(`   - Connection success rate too low: ${connectionSuccessRate.toFixed(1)}% < 99.5%`);
            if (betSuccessRate < 95) console.log(`   - Bet success rate too low: ${betSuccessRate.toFixed(1)}% < 95%`);
            if (avgLatency > 150) console.log(`   - Average latency too high: ${avgLatency.toFixed(0)}ms > 150ms`);
        }

        process.exit(passed ? 0 : 1);
    }

    // Helper methods
    jitter(min, max) {
        const delay = Math.random() * (max - min) + min;
        return new Promise(resolve => setTimeout(resolve, delay));
    }

    randomBetAmount() {
        const amounts = [0.001, 0.002, 0.005, 0.01, 0.02, 0.05];
        return amounts[Math.floor(Math.random() * amounts.length)];
    }

    generateClientId() {
        return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    logError(message, error) {
        const errorMsg = error?.message || error || 'Unknown error';
        this.metrics.errors.push({ timestamp: Date.now(), message: `${message} ${errorMsg}` });
        
        if (this.metrics.errors.length > 100) {
            this.metrics.errors = this.metrics.errors.slice(-50); // Keep last 50 errors
        }
    }
}

// CLI usage
if (process.argv[1] === new URL(import.meta.url).pathname) {
    const loadTest = new SocketLoadTest();
    loadTest.start();
}

export default SocketLoadTest;
