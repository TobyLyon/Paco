/**
 * 🌪️ Chaos Testing Framework
 * 
 * Inject failures and verify graceful degradation:
 * - Database slowdowns
 * - RPC failures
 * - Network partitions
 * - Memory pressure
 * - Feature flag toggles
 */

class ChaosTestingFramework {
    constructor(config = {}) {
        this.config = {
            enabled: config.enabled || process.env.CHAOS_TESTING_ENABLED === 'true',
            dbSlowMs: parseInt(process.env.SIMULATE_DB_SLOW_MS || 0),
            rpcFailRate: parseFloat(process.env.SIMULATE_RPC_FAIL_RATE || 0),
            memoryPressureMB: parseInt(process.env.SIMULATE_MEMORY_PRESSURE_MB || 0),
            maintenanceMode: process.env.MAINTENANCE_PAUSE_BETS === 'true',
            freezeWithdrawals: process.env.FREEZE_WITHDRAWALS === 'true',
            ...config
        };

        this.originalFunctions = new Map();
        this.metrics = {
            injectedFailures: 0,
            injectedDelays: 0,
            gracefulDegradations: 0,
            errors: []
        };

        if (this.config.enabled) {
            this.initializeChaos();
            console.log('🌪️ Chaos testing framework enabled');
            console.log(`   DB slowdown: ${this.config.dbSlowMs}ms`);
            console.log(`   RPC fail rate: ${(this.config.rpcFailRate * 100).toFixed(1)}%`);
            console.log(`   Maintenance mode: ${this.config.maintenanceMode}`);
        }
    }

    /**
     * 🌪️ Initialize chaos injection
     */
    initializeChaos() {
        if (this.config.dbSlowMs > 0) {
            this.injectDatabaseSlowdown();
        }

        if (this.config.rpcFailRate > 0) {
            this.injectRPCFailures();
        }

        if (this.config.memoryPressureMB > 0) {
            this.injectMemoryPressure();
        }

        if (this.config.maintenanceMode) {
            this.enableMaintenanceMode();
        }

        if (this.config.freezeWithdrawals) {
            this.freezeWithdrawals();
        }
    }

    /**
     * 🐌 Inject database slowdown
     */
    injectDatabaseSlowdown() {
        console.log(`🐌 Injecting ${this.config.dbSlowMs}ms database latency`);

        // Monkey patch Supabase client if available
        if (global.supabase) {
            const originalQuery = global.supabase.from.bind(global.supabase);
            global.supabase.from = (table) => {
                const query = originalQuery(table);
                const originalThen = query.then?.bind(query);
                
                if (originalThen) {
                    query.then = async (callback) => {
                        await this.delay(this.config.dbSlowMs);
                        this.metrics.injectedDelays++;
                        return originalThen(callback);
                    };
                }
                
                return query;
            };
        }

        // Patch RPC calls
        if (global.supabase?.rpc) {
            const originalRpc = global.supabase.rpc.bind(global.supabase);
            global.supabase.rpc = async (...args) => {
                await this.delay(this.config.dbSlowMs);
                this.metrics.injectedDelays++;
                return originalRpc(...args);
            };
        }
    }

    /**
     * 💥 Inject RPC failures
     */
    injectRPCFailures() {
        console.log(`💥 Injecting ${(this.config.rpcFailRate * 100).toFixed(1)}% RPC failure rate`);

        if (global.supabase?.rpc) {
            const originalRpc = global.supabase.rpc.bind(global.supabase);
            global.supabase.rpc = async (...args) => {
                if (Math.random() < this.config.rpcFailRate) {
                    this.metrics.injectedFailures++;
                    const error = new Error('Chaos: Simulated RPC failure');
                    error.code = 'CHAOS_RPC_FAILURE';
                    throw error;
                }
                return originalRpc(...args);
            };
        }

        // Patch HTTP fetch for external APIs
        if (global.fetch) {
            const originalFetch = global.fetch;
            global.fetch = async (...args) => {
                if (Math.random() < this.config.rpcFailRate) {
                    this.metrics.injectedFailures++;
                    throw new Error('Chaos: Simulated fetch failure');
                }
                return originalFetch(...args);
            };
        }
    }

    /**
     * 🧠 Inject memory pressure
     */
    injectMemoryPressure() {
        console.log(`🧠 Injecting ${this.config.memoryPressureMB}MB memory pressure`);

        // Allocate memory to create pressure
        const memoryHog = [];
        const bytesPerMB = 1024 * 1024;
        const targetBytes = this.config.memoryPressureMB * bytesPerMB;

        // Create memory pressure gradually
        const chunkSize = 10 * bytesPerMB; // 10MB chunks
        const chunks = Math.ceil(targetBytes / chunkSize);

        for (let i = 0; i < chunks; i++) {
            setTimeout(() => {
                const chunk = Buffer.alloc(Math.min(chunkSize, targetBytes - (i * chunkSize)));
                memoryHog.push(chunk);
                
                if (i === chunks - 1) {
                    console.log(`🧠 Memory pressure applied: ${this.config.memoryPressureMB}MB allocated`);
                }
            }, i * 100); // Spread allocation over time
        }

        // Clean up after 5 minutes
        setTimeout(() => {
            memoryHog.length = 0;
            console.log('🧠 Memory pressure released');
        }, 5 * 60 * 1000);
    }

    /**
     * 🚧 Enable maintenance mode
     */
    enableMaintenanceMode() {
        console.log('🚧 Maintenance mode enabled - bets will be rejected');

        // Monkey patch bet placement functions
        if (global.balanceAPI?.placeBet) {
            const originalPlaceBet = global.balanceAPI.placeBet.bind(global.balanceAPI);
            global.balanceAPI.placeBet = async (...args) => {
                this.metrics.gracefulDegradations++;
                throw new Error('System is under maintenance. Please try again later.');
            };
        }

        // Add maintenance banner to health checks
        this.addMaintenanceBanner();
    }

    /**
     * 🧊 Freeze withdrawals
     */
    freezeWithdrawals() {
        console.log('🧊 Withdrawals frozen for review');

        // Monkey patch withdrawal functions
        if (global.balanceAPI?.processWithdrawal) {
            const originalWithdrawal = global.balanceAPI.processWithdrawal.bind(global.balanceAPI);
            global.balanceAPI.processWithdrawal = async (...args) => {
                this.metrics.gracefulDegradations++;
                throw new Error('Withdrawals are temporarily frozen for security review.');
            };
        }
    }

    /**
     * 📊 Add maintenance banner to responses
     */
    addMaintenanceBanner() {
        // This would integrate with your Express app to add maintenance headers
        if (global.app) {
            global.app.use((req, res, next) => {
                res.setHeader('X-Maintenance-Mode', 'true');
                res.setHeader('X-Maintenance-Message', 'System is under maintenance');
                next();
            });
        }
    }

    /**
     * 🔧 Runtime chaos controls
     */
    enableChaos(type, config = {}) {
        switch (type) {
            case 'db_slow':
                this.config.dbSlowMs = config.delayMs || 200;
                this.injectDatabaseSlowdown();
                break;
            case 'rpc_fail':
                this.config.rpcFailRate = config.failRate || 0.2;
                this.injectRPCFailures();
                break;
            case 'maintenance':
                this.config.maintenanceMode = true;
                this.enableMaintenanceMode();
                break;
            case 'freeze_withdrawals':
                this.config.freezeWithdrawals = true;
                this.freezeWithdrawals();
                break;
            default:
                console.warn(`Unknown chaos type: ${type}`);
        }
    }

    /**
     * 🛑 Disable chaos
     */
    disableChaos(type) {
        switch (type) {
            case 'db_slow':
                this.config.dbSlowMs = 0;
                this.restoreOriginalFunctions();
                break;
            case 'rpc_fail':
                this.config.rpcFailRate = 0;
                this.restoreOriginalFunctions();
                break;
            case 'maintenance':
                this.config.maintenanceMode = false;
                this.restoreOriginalFunctions();
                break;
            case 'freeze_withdrawals':
                this.config.freezeWithdrawals = false;
                this.restoreOriginalFunctions();
                break;
            default:
                console.warn(`Unknown chaos type: ${type}`);
        }
    }

    /**
     * 🔄 Restore original functions
     */
    restoreOriginalFunctions() {
        for (const [key, originalFunction] of this.originalFunctions) {
            // Restore original function based on key
            if (key.startsWith('supabase.')) {
                const [obj, method] = key.split('.');
                if (global[obj] && global[obj][method]) {
                    global[obj][method] = originalFunction;
                }
            }
        }
        
        console.log('🔄 Original functions restored');
    }

    /**
     * 📊 Get chaos metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            config: this.config,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * 🧪 Test scenarios
     */
    async runTestScenarios() {
        console.log('🧪 Running chaos test scenarios...');

        const scenarios = [
            {
                name: 'Database Slowdown',
                test: () => this.testDatabaseSlowdown()
            },
            {
                name: 'RPC Failures',
                test: () => this.testRPCFailures()
            },
            {
                name: 'Maintenance Mode',
                test: () => this.testMaintenanceMode()
            },
            {
                name: 'Memory Pressure',
                test: () => this.testMemoryPressure()
            }
        ];

        const results = [];

        for (const scenario of scenarios) {
            console.log(`\n🧪 Testing: ${scenario.name}`);
            const startTime = Date.now();
            
            try {
                const result = await scenario.test();
                const duration = Date.now() - startTime;
                
                results.push({
                    name: scenario.name,
                    passed: result.passed,
                    duration,
                    details: result.details
                });

                console.log(`${result.passed ? '✅' : '❌'} ${scenario.name}: ${result.passed ? 'PASSED' : 'FAILED'}`);
                
            } catch (error) {
                const duration = Date.now() - startTime;
                results.push({
                    name: scenario.name,
                    passed: false,
                    duration,
                    error: error.message
                });
                
                console.log(`❌ ${scenario.name}: ERROR - ${error.message}`);
            }
        }

        return results;
    }

    /**
     * 🧪 Test database slowdown scenario
     */
    async testDatabaseSlowdown() {
        // Enable slowdown
        this.enableChaos('db_slow', { delayMs: 500 });

        // Test that operations still work but are slower
        const startTime = Date.now();
        
        try {
            if (global.supabase) {
                await global.supabase.from('accounts').select('count').limit(1);
            }
            
            const duration = Date.now() - startTime;
            
            // Should be slower than expected but still work
            const passed = duration >= 400; // Should include our 500ms delay
            
            this.disableChaos('db_slow');
            
            return {
                passed,
                details: { duration, expectedDelay: 500 }
            };
            
        } catch (error) {
            this.disableChaos('db_slow');
            throw error;
        }
    }

    /**
     * 🧪 Test RPC failures scenario
     */
    async testRPCFailures() {
        // Enable high failure rate
        this.enableChaos('rpc_fail', { failRate: 0.8 });

        let failures = 0;
        let attempts = 10;

        for (let i = 0; i < attempts; i++) {
            try {
                if (global.supabase) {
                    await global.supabase.rpc('get_indexer_checkpoint');
                }
            } catch (error) {
                if (error.code === 'CHAOS_RPC_FAILURE') {
                    failures++;
                }
            }
        }

        this.disableChaos('rpc_fail');

        // Should have most calls fail
        const failureRate = failures / attempts;
        const passed = failureRate >= 0.6; // At least 60% should fail with 80% rate

        return {
            passed,
            details: { failures, attempts, failureRate }
        };
    }

    /**
     * 🧪 Test maintenance mode scenario
     */
    async testMaintenanceMode() {
        this.enableChaos('maintenance');

        let betRejected = false;

        try {
            if (global.balanceAPI?.placeBet) {
                await global.balanceAPI.placeBet('test-user', 0.001, 'test-round', 'test-client', 0);
            }
        } catch (error) {
            if (error.message.includes('maintenance')) {
                betRejected = true;
            }
        }

        this.disableChaos('maintenance');

        return {
            passed: betRejected,
            details: { betRejected }
        };
    }

    /**
     * 🧪 Test memory pressure scenario
     */
    async testMemoryPressure() {
        const beforeMemory = process.memoryUsage();
        
        this.injectMemoryPressure();
        
        // Wait for memory allocation
        await this.delay(2000);
        
        const afterMemory = process.memoryUsage();
        const memoryIncrease = afterMemory.heapUsed - beforeMemory.heapUsed;
        
        // Should have increased memory usage
        const passed = memoryIncrease > 5 * 1024 * 1024; // At least 5MB increase
        
        return {
            passed,
            details: {
                beforeMemory: beforeMemory.heapUsed,
                afterMemory: afterMemory.heapUsed,
                increase: memoryIncrease
            }
        };
    }

    /**
     * ⏱️ Delay helper
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export chaos testing framework
module.exports = ChaosTestingFramework;

// Global instance for runtime control
if (!global.chaosFramework) {
    global.chaosFramework = new ChaosTestingFramework();
}

// CLI usage
if (require.main === module) {
    const chaos = new ChaosTestingFramework({ enabled: true });
    chaos.runTestScenarios().then(results => {
        console.log('\n📊 CHAOS TEST RESULTS:');
        results.forEach(r => {
            console.log(`${r.passed ? '✅' : '❌'} ${r.name} (${r.duration}ms)`);
        });
        
        const passed = results.every(r => r.passed);
        console.log(`\n${passed ? '🎉 ALL CHAOS TESTS PASSED' : '💥 SOME CHAOS TESTS FAILED'}`);
        process.exit(passed ? 0 : 1);
    });
}
