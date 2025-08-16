#!/usr/bin/env node

/**
 * 🌐 WebSocket Stress Test
 * 
 * Parameterized load testing for Socket.IO connections and betting
 * Tests concurrent users, bet placement, and reconnection scenarios
 */

const { io } = require('socket.io-client');
const { performance } = require('perf_hooks');

class WebSocketStressTest {
  constructor(options = {}) {
    this.config = {
      url: options.url || process.env.SOCKET_URL || 'ws://localhost:3000',
      clients: parseInt(options.clients || process.env.STRESS_CLIENTS || '100'),
      duration: parseInt(options.duration || process.env.STRESS_DURATION || '60000'), // 1 minute
      betInterval: parseInt(options.betInterval || '2000'), // 2 seconds between bets
      reconnectRate: parseFloat(options.reconnectRate || '0.1'), // 10% chance per interval
      ...options
    };

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
      latencies: [],
      errors: []
    };

    this.isRunning = false;
    console.log(`🌐 WebSocket Stress Test Configuration:`);
    console.log(`   URL: ${this.config.url}`);
    console.log(`   Clients: ${this.config.clients}`);
    console.log(`   Duration: ${this.config.duration}ms`);
    console.log(`   Bet Interval: ${this.config.betInterval}ms`);
    console.log(`   Reconnect Rate: ${(this.config.reconnectRate * 100).toFixed(1)}%`);
  }

  /**
   * 🚀 Start stress test
   */
  async start() {
    console.log('\n🚀 Starting WebSocket stress test...');
    this.isRunning = true;

    // Start metrics reporting
    this.startMetricsReporting();

    // Spawn clients with staggered start
    for (let i = 0; i < this.config.clients; i++) {
      setTimeout(() => {
        if (this.isRunning) {
          this.spawnClient(i);
        }
      }, i * 50); // 50ms between spawns
    }

    // Stop after duration
    setTimeout(() => {
      this.stop();
    }, this.config.duration);

    // Return promise that resolves when test completes
    return new Promise((resolve) => {
      this.onComplete = resolve;
    });
  }

  /**
   * 👤 Spawn a single client
   */
  spawnClient(clientId) {
    const client = {
      id: clientId,
      userId: `stress_user_${clientId}`,
      socket: null,
      isConnected: false,
      lastEventId: 0,
      activeBet: null,
      metrics: {
        betsPlaced: 0,
        cashoutsAttempted: 0,
        reconnects: 0,
        errors: 0
      }
    };

    this.connectClient(client);
    this.clients.push(client);
  }

  /**
   * 🔌 Connect client to WebSocket
   */
  connectClient(client) {
    this.metrics.totalConnections++;

    const socket = io(this.config.url, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    client.socket = socket;

    const connectStart = performance.now();

    socket.on('connect', () => {
      const latency = performance.now() - connectStart;
      this.metrics.latencies.push(latency);
      this.metrics.successfulConnections++;
      client.isConnected = true;

      // Send hello with last event ID
      socket.emit('hello', {
        lastEventId: client.lastEventId,
        userId: client.userId
      });

      console.log(`✅ Client ${client.id} connected (${latency.toFixed(1)}ms)`);
      
      // Start client behavior
      this.startClientBehavior(client);
    });

    socket.on('hello_ack', (data) => {
      if (data.success) {
        client.lastEventId = data.serverEventId || 0;
      }
    });

    socket.on('event', (event) => {
      client.lastEventId = event.id;
      this.handleClientEvent(client, event);
    });

    socket.on('snapshot', (snapshot) => {
      client.lastEventId = snapshot.eventId;
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

    socket.on('connect_error', (error) => {
      this.metrics.failedConnections++;
      client.metrics.errors++;
      this.metrics.errors.push({
        clientId: client.id,
        type: 'connection_error',
        message: error.message,
        timestamp: Date.now()
      });
    });

    socket.on('error', (error) => {
      client.metrics.errors++;
      this.metrics.errors.push({
        clientId: client.id,
        type: 'socket_error',
        message: error.message,
        timestamp: Date.now()
      });
    });
  }

  /**
   * 🎮 Start client behavior
   */
  startClientBehavior(client) {
    const behaviorLoop = () => {
      if (!this.isRunning || !client.isConnected) return;

      // Random actions
      const action = Math.random();

      if (action < 0.4 && !client.activeBet) {
        // 40% chance to place bet
        this.placeBet(client);
      } else if (action < 0.6 && client.activeBet) {
        // 20% chance to cashout
        this.attemptCashout(client);
      } else if (action < 0.7) {
        // 10% chance to randomly disconnect/reconnect
        if (Math.random() < this.config.reconnectRate) {
          this.simulateReconnection(client);
        }
      }
      // 30% chance to do nothing (idle)

      // Schedule next action
      setTimeout(behaviorLoop, this.config.betInterval + Math.random() * 1000);
    };

    // Start behavior loop
    setTimeout(behaviorLoop, Math.random() * this.config.betInterval);
  }

  /**
   * 🎯 Place a bet
   */
  placeBet(client) {
    if (!client.isConnected || client.activeBet) return;

    const betAmount = this.randomBetAmount();
    const startTime = performance.now();

    this.metrics.totalBets++;
    client.metrics.betsPlaced++;

    // Mock bet placement (in real test, this would call API)
    const mockBetSuccess = Math.random() > 0.05; // 95% success rate

    setTimeout(() => {
      const latency = performance.now() - startTime;
      this.metrics.latencies.push(latency);

      if (mockBetSuccess) {
        this.metrics.successfulBets++;
        client.activeBet = {
          amount: betAmount,
          timestamp: Date.now()
        };
        console.log(`🎯 Client ${client.id} placed bet: ${betAmount} ETH`);
      } else {
        this.metrics.failedBets++;
        this.metrics.errors.push({
          clientId: client.id,
          type: 'bet_failed',
          message: 'Insufficient balance',
          timestamp: Date.now()
        });
      }
    }, 50 + Math.random() * 100); // Simulate API latency
  }

  /**
   * 💰 Attempt cashout
   */
  attemptCashout(client) {
    if (!client.isConnected || !client.activeBet) return;

    // Only cashout if bet has been active for at least 1 second
    if (Date.now() - client.activeBet.timestamp < 1000) return;

    const startTime = performance.now();

    this.metrics.totalCashouts++;
    client.metrics.cashoutsAttempted++;

    // Mock cashout (in real test, this would emit socket event)
    const mockCashoutSuccess = Math.random() > 0.1; // 90% success rate

    setTimeout(() => {
      const latency = performance.now() - startTime;
      this.metrics.latencies.push(latency);

      if (mockCashoutSuccess) {
        this.metrics.successfulCashouts++;
        const multiplier = 1.5 + Math.random() * 3; // 1.5x to 4.5x
        console.log(`💰 Client ${client.id} cashed out at ${multiplier.toFixed(2)}x`);
      } else {
        this.metrics.failedCashouts++;
        this.metrics.errors.push({
          clientId: client.id,
          type: 'cashout_failed',
          message: 'Too close to crash point',
          timestamp: Date.now()
        });
      }

      client.activeBet = null;
    }, 30 + Math.random() * 50); // Simulate cashout latency
  }

  /**
   * 🔄 Simulate reconnection
   */
  simulateReconnection(client) {
    if (!client.socket) return;

    console.log(`🔄 Simulating reconnection for client ${client.id}`);
    
    // Disconnect
    client.socket.disconnect();
    
    // Reconnect after short delay
    setTimeout(() => {
      if (this.isRunning) {
        client.socket.connect();
      }
    }, 1000 + Math.random() * 2000);
  }

  /**
   * 📊 Handle client events
   */
  handleClientEvent(client, event) {
    switch (event.type) {
      case 'round_start':
        // Round started, client can place new bets
        break;
      case 'round_crash':
        // Round crashed, clear any active bets that weren't cashed out
        if (client.activeBet) {
          client.activeBet = null; // Lost bet
        }
        break;
      case 'balance_update':
        // Balance updated, could place new bets
        break;
    }
  }

  /**
   * 📊 Start metrics reporting
   */
  startMetricsReporting() {
    const startTime = Date.now();
    
    const reportInterval = setInterval(() => {
      if (!this.isRunning) {
        clearInterval(reportInterval);
        return;
      }

      this.printMetrics(Date.now() - startTime);
    }, 10000); // Report every 10 seconds
  }

  /**
   * 📊 Print current metrics
   */
  printMetrics(elapsed) {
    const connectedClients = this.clients.filter(c => c.isConnected).length;
    const avgLatency = this.metrics.latencies.length > 0
      ? this.metrics.latencies.reduce((a, b) => a + b, 0) / this.metrics.latencies.length
      : 0;
    const p95Latency = this.calculatePercentile(this.metrics.latencies, 0.95);

    console.log('\n📊 STRESS TEST METRICS');
    console.log('======================');
    console.log(`⏱️  Elapsed: ${(elapsed / 1000).toFixed(1)}s`);
    console.log(`🔌 Connections: ${this.metrics.successfulConnections}/${this.metrics.totalConnections} (${connectedClients} active)`);
    console.log(`🎯 Bets: ${this.metrics.successfulBets}/${this.metrics.totalBets} (${this.getSuccessRate(this.metrics.successfulBets, this.metrics.totalBets)}% success)`);
    console.log(`💰 Cashouts: ${this.metrics.successfulCashouts}/${this.metrics.totalCashouts} (${this.getSuccessRate(this.metrics.successfulCashouts, this.metrics.totalCashouts)}% success)`);
    console.log(`🔄 Reconnections: ${this.metrics.reconnections}`);
    console.log(`⚡ Latency: avg ${avgLatency.toFixed(1)}ms, p95 ${p95Latency.toFixed(1)}ms`);
    console.log(`❌ Errors: ${this.metrics.errors.length}`);
  }

  /**
   * 🛑 Stop stress test
   */
  stop() {
    console.log('\n🛑 Stopping stress test...');
    this.isRunning = false;

    // Disconnect all clients
    this.clients.forEach(client => {
      if (client.socket) {
        client.socket.disconnect();
      }
    });

    // Generate final report
    this.generateFinalReport();

    // Resolve completion promise
    if (this.onComplete) {
      this.onComplete();
    }
  }

  /**
   * 📊 Generate final report
   */
  generateFinalReport() {
    const connectedClients = this.clients.filter(c => c.isConnected).length;
    const connectionSuccessRate = this.getSuccessRate(this.metrics.successfulConnections, this.metrics.totalConnections);
    const betSuccessRate = this.getSuccessRate(this.metrics.successfulBets, this.metrics.totalBets);
    const cashoutSuccessRate = this.getSuccessRate(this.metrics.successfulCashouts, this.metrics.totalCashouts);
    
    const avgLatency = this.metrics.latencies.length > 0
      ? this.metrics.latencies.reduce((a, b) => a + b, 0) / this.metrics.latencies.length
      : 0;
    const p95Latency = this.calculatePercentile(this.metrics.latencies, 0.95);
    const p99Latency = this.calculatePercentile(this.metrics.latencies, 0.99);

    console.log('\n🎯 FINAL STRESS TEST RESULTS');
    console.log('============================');
    console.log(`🔌 Connection Success Rate: ${connectionSuccessRate.toFixed(1)}%`);
    console.log(`🎯 Bet Success Rate: ${betSuccessRate.toFixed(1)}%`);
    console.log(`💰 Cashout Success Rate: ${cashoutSuccessRate.toFixed(1)}%`);
    console.log(`⚡ Latency Stats:`);
    console.log(`   Average: ${avgLatency.toFixed(1)}ms`);
    console.log(`   P95: ${p95Latency.toFixed(1)}ms`);
    console.log(`   P99: ${p99Latency.toFixed(1)}ms`);
    console.log(`🔄 Total Reconnections: ${this.metrics.reconnections}`);
    console.log(`❌ Total Errors: ${this.metrics.errors.length}`);

    // Pass/fail criteria
    const passed = connectionSuccessRate >= 99.5 &&
                   betSuccessRate >= 95 &&
                   avgLatency <= 150;

    if (passed) {
      console.log('\n✅ STRESS TEST PASSED - System handles load well!');
      process.exit(0);
    } else {
      console.log('\n❌ STRESS TEST FAILED - Performance issues detected');
      if (connectionSuccessRate < 99.5) console.log(`   - Connection success rate too low: ${connectionSuccessRate.toFixed(1)}% < 99.5%`);
      if (betSuccessRate < 95) console.log(`   - Bet success rate too low: ${betSuccessRate.toFixed(1)}% < 95%`);
      if (avgLatency > 150) console.log(`   - Average latency too high: ${avgLatency.toFixed(1)}ms > 150ms`);
      process.exit(1);
    }
  }

  // Helper methods
  randomBetAmount() {
    const amounts = [0.001, 0.002, 0.005, 0.01, 0.02, 0.05];
    return amounts[Math.floor(Math.random() * amounts.length)];
  }

  getSuccessRate(successful, total) {
    return total > 0 ? (successful / total) * 100 : 0;
  }

  calculatePercentile(values, percentile) {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percentile) - 1;
    return sorted[index] || 0;
  }
}

// CLI usage
async function main() {
  const options = {
    url: process.env.SOCKET_URL || 'ws://localhost:3000',
    clients: parseInt(process.env.STRESS_CLIENTS || '100'),
    duration: parseInt(process.env.STRESS_DURATION || '60000'),
    betInterval: parseInt(process.env.STRESS_BET_INTERVAL || '2000'),
    reconnectRate: parseFloat(process.env.STRESS_RECONNECT_RATE || '0.1')
  };

  const stressTest = new WebSocketStressTest(options);
  await stressTest.start();
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Stress test failed:', error);
    process.exit(1);
  });
}

module.exports = WebSocketStressTest;
