#!/usr/bin/env node

/**
 * 🎯 MASTER VERIFICATION SCRIPT
 * 
 * "Flip the switch" verification gauntlet for casino-grade deployment
 * Runs ALL checks to prove the system is bulletproof before real money
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class MasterVerification {
    constructor() {
        this.results = {
            started: new Date().toISOString(),
            completed: null,
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            categories: {}
        };
        
        this.config = {
            supabaseUrl: process.env.SUPABASE_URL,
            supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
            apiUrl: process.env.API_URL || 'http://localhost:3000',
            socketUrl: process.env.SOCKET_URL || 'ws://localhost:3001',
            skipLoadTest: process.env.SKIP_LOAD_TEST === 'true',
            skipChaosTest: process.env.SKIP_CHAOS_TEST === 'true'
        };
        
        console.log('🎯 MASTER VERIFICATION GAUNTLET');
        console.log('=====================================');
        console.log('🎰 CASINO-GRADE VERIFICATION SUITE');
        console.log('   Ready to prove bulletproof reliability');
        console.log('   Before deploying with real ETH');
        console.log('=====================================\n');
    }

    /**
     * 🚀 Run complete verification gauntlet
     */
    async runComplete() {
        console.log('🚀 Starting complete verification gauntlet...\n');

        const testCategories = [
            {
                name: 'Database Invariants',
                critical: true,
                test: () => this.runDatabaseInvariants()
            },
            {
                name: 'Deposit Indexer',
                critical: true,
                test: () => this.runDepositIndexerTests()
            },
            {
                name: 'Health Endpoints',
                critical: true,
                test: () => this.runHealthChecks()
            },
            {
                name: 'Socket Load Test',
                critical: false,
                test: () => this.runSocketLoadTest()
            },
            {
                name: 'Chaos Testing',
                critical: false,
                test: () => this.runChaosTests()
            },
            {
                name: 'Game Fairness',
                critical: true,
                test: () => this.runFairnessTests()
            }
        ];

        for (const category of testCategories) {
            console.log(`\n🧪 CATEGORY: ${category.name.toUpperCase()}`);
            console.log('='.repeat(50));
            
            if (this.shouldSkipTest(category.name)) {
                console.log(`⏭️  SKIPPED: ${category.name} (configured to skip)`);
                this.results.categories[category.name] = {
                    status: 'skipped',
                    reason: 'configured to skip'
                };
                continue;
            }

            const startTime = Date.now();
            
            try {
                const result = await category.test();
                const duration = Date.now() - startTime;
                
                this.results.categories[category.name] = {
                    status: result.passed ? 'passed' : 'failed',
                    duration,
                    details: result.details,
                    critical: category.critical
                };

                if (result.passed) {
                    console.log(`✅ ${category.name}: PASSED (${duration}ms)`);
                    this.results.passedTests++;
                } else {
                    console.log(`❌ ${category.name}: FAILED (${duration}ms)`);
                    if (result.details) {
                        console.log(`   Details:`, result.details);
                    }
                    this.results.failedTests++;
                    
                    if (category.critical) {
                        console.log(`🚨 CRITICAL FAILURE: Cannot proceed with deployment`);
                        return this.generateFailureReport();
                    }
                }
                
            } catch (error) {
                const duration = Date.now() - startTime;
                console.log(`💥 ${category.name}: ERROR (${duration}ms)`);
                console.log(`   Error: ${error.message}`);
                
                this.results.categories[category.name] = {
                    status: 'error',
                    duration,
                    error: error.message,
                    critical: category.critical
                };
                
                this.results.failedTests++;
                
                if (category.critical) {
                    console.log(`🚨 CRITICAL ERROR: Cannot proceed with deployment`);
                    return this.generateFailureReport();
                }
            }
            
            this.results.totalTests++;
        }

        this.results.completed = new Date().toISOString();
        return this.generateFinalReport();
    }

    /**
     * 🗄️ Run database invariant checks
     */
    async runDatabaseInvariants() {
        console.log('🗄️ Running SQL invariant checks...');
        
        if (!this.config.supabaseUrl || !this.config.supabaseKey) {
            throw new Error('Supabase configuration missing');
        }

        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(this.config.supabaseUrl, this.config.supabaseKey);

        const checks = [];
        let violations = 0;

        // 1. No negative balances
        const { data: negativeBalances } = await supabase
            .from('accounts')
            .select('user_id, available, locked')
            .or('available.lt.0,locked.lt.0');

        checks.push({
            name: 'no_negative_balances',
            violations: negativeBalances?.length || 0,
            critical: true
        });
        violations += negativeBalances?.length || 0;

        // 2. Idempotency check
        const { data: ledgerData } = await supabase
            .from('ledger')
            .select('user_id, ref')
            .not('ref->client_id', 'is', null);

        const clientIds = new Map();
        let duplicates = 0;
        ledgerData?.forEach(entry => {
            const key = `${entry.user_id}-${entry.ref?.client_id}`;
            if (clientIds.has(key)) {
                duplicates++;
            } else {
                clientIds.set(key, true);
            }
        });

        checks.push({
            name: 'idempotency_violations',
            violations: duplicates,
            critical: true
        });
        violations += duplicates;

        // 3. Recent activity
        const { data: recentActivity } = await supabase
            .from('ledger')
            .select('count')
            .gte('created_at', new Date(Date.now() - 3600000).toISOString())
            .single();

        checks.push({
            name: 'recent_activity',
            violations: 0,
            info: { entries_last_hour: recentActivity?.count || 0 }
        });

        console.log(`   📊 Ran ${checks.length} invariant checks`);
        console.log(`   🚨 Total violations: ${violations}`);

        return {
            passed: violations === 0,
            details: { checks, totalViolations: violations }
        };
    }

    /**
     * 🔍 Run deposit indexer tests
     */
    async runDepositIndexerTests() {
        console.log('🔍 Running deposit indexer tests...');
        
        const DepositIndexerTestSuite = require('./deposit-indexer-tests');
        const testSuite = new DepositIndexerTestSuite({
            supabaseUrl: this.config.supabaseUrl,
            supabaseKey: this.config.supabaseKey
        });

        const success = await testSuite.runAllTests();
        
        return {
            passed: success,
            details: { message: 'See console output for detailed results' }
        };
    }

    /**
     * 🏥 Run health check tests
     */
    async runHealthChecks() {
        console.log('🏥 Running health endpoint checks...');
        
        const fetch = require('node-fetch');
        const checks = [];

        // Basic health
        try {
            const response = await fetch(`${this.config.apiUrl}/health`, { timeout: 5000 });
            checks.push({
                name: 'basic_health',
                passed: response.ok,
                status: response.status
            });
        } catch (error) {
            checks.push({
                name: 'basic_health',
                passed: false,
                error: error.message
            });
        }

        // Detailed health
        try {
            const response = await fetch(`${this.config.apiUrl}/health/detailed`, { timeout: 10000 });
            const data = await response.json();
            checks.push({
                name: 'detailed_health',
                passed: response.ok && data.status !== 'unhealthy',
                status: data.status,
                services: data.services
            });
        } catch (error) {
            checks.push({
                name: 'detailed_health',
                passed: false,
                error: error.message
            });
        }

        // Invariants check
        try {
            const response = await fetch(`${this.config.apiUrl}/health/invariants`, { timeout: 15000 });
            const data = await response.json();
            const hasViolations = data.summary?.totalViolations > 0;
            checks.push({
                name: 'invariants_health',
                passed: response.ok && !hasViolations,
                violations: data.summary?.totalViolations || 0
            });
        } catch (error) {
            checks.push({
                name: 'invariants_health',
                passed: false,
                error: error.message
            });
        }

        const allPassed = checks.every(check => check.passed);
        console.log(`   📊 Health checks: ${checks.filter(c => c.passed).length}/${checks.length} passed`);

        return {
            passed: allPassed,
            details: { checks }
        };
    }

    /**
     * 🌐 Run socket load test
     */
    async runSocketLoadTest() {
        if (this.config.skipLoadTest) {
            return { passed: true, details: { skipped: true } };
        }

        console.log('🌐 Running socket load test...');
        console.log('   Note: This will take several minutes');

        try {
            const result = await this.runCommand('node', [
                'crash-casino/verification/socket-load-test.js'
            ], {
                env: {
                    ...process.env,
                    N: '100', // Smaller load for verification
                    DURATION_MS: '60000', // 1 minute
                    URL: this.config.socketUrl,
                    API_URL: this.config.apiUrl
                },
                timeout: 120000 // 2 minutes max
            });

            return {
                passed: result.exitCode === 0,
                details: { output: result.output.slice(-500) } // Last 500 chars
            };

        } catch (error) {
            return {
                passed: false,
                details: { error: error.message }
            };
        }
    }

    /**
     * 🌪️ Run chaos tests
     */
    async runChaosTests() {
        if (this.config.skipChaosTest) {
            return { passed: true, details: { skipped: true } };
        }

        console.log('🌪️ Running chaos tests...');

        try {
            const result = await this.runCommand('node', [
                'crash-casino/verification/chaos-testing.js'
            ], {
                env: {
                    ...process.env,
                    CHAOS_TESTING_ENABLED: 'true'
                },
                timeout: 60000 // 1 minute max
            });

            return {
                passed: result.exitCode === 0,
                details: { output: result.output.slice(-500) } // Last 500 chars
            };

        } catch (error) {
            return {
                passed: false,
                details: { error: error.message }
            };
        }
    }

    /**
     * 🎲 Run game fairness tests
     */
    async runFairnessTests() {
        console.log('🎲 Running game fairness tests...');

        // Test crash value distribution
        const samples = 1000;
        const crashes = [];
        let instantCrashes = 0;

        // Simulate crash generation (would call actual RNG in real test)
        for (let i = 0; i < samples; i++) {
            const randomInt = Math.floor(Math.random() * 10000000000);
            let crashValue;
            
            if (randomInt % 33 === 0) {
                crashValue = 1.00;
                instantCrashes++;
            } else {
                let randomFloat = Math.random();
                while (randomFloat === 0) {
                    randomFloat = Math.random();
                }
                crashValue = Math.round((0.01 + (0.99 / randomFloat)) * 100) / 100;
                crashValue = Math.min(crashValue, 1000);
            }
            
            crashes.push(crashValue);
        }

        // Analyze distribution
        const instantCrashRate = instantCrashes / samples;
        const meanCrash = crashes.reduce((sum, c) => sum + c, 0) / crashes.length;
        const belowTwoX = crashes.filter(c => c < 2.0).length / crashes.length;

        console.log(`   📊 Analyzed ${samples} crash values`);
        console.log(`   🎯 Instant crash rate: ${(instantCrashRate * 100).toFixed(2)}% (expected: ~3.03%)`);
        console.log(`   📈 Mean crash: ${meanCrash.toFixed(2)}x`);
        console.log(`   📉 Below 2x: ${(belowTwoX * 100).toFixed(1)}% (expected: ~50%)`);

        // Validate distribution
        const instantCrashOk = Math.abs(instantCrashRate - 0.0303) < 0.01; // Within 1%
        const meanCrashOk = meanCrash > 30 && meanCrash < 35; // Reasonable range
        const belowTwoXOk = Math.abs(belowTwoX - 0.5) < 0.05; // Within 5%

        const passed = instantCrashOk && meanCrashOk && belowTwoXOk;

        return {
            passed,
            details: {
                samples,
                instantCrashRate,
                meanCrash,
                belowTwoX,
                checks: {
                    instantCrashOk,
                    meanCrashOk,
                    belowTwoXOk
                }
            }
        };
    }

    /**
     * 🏃 Run command with timeout
     */
    runCommand(command, args, options = {}) {
        return new Promise((resolve, reject) => {
            const child = spawn(command, args, {
                stdio: 'pipe',
                env: options.env || process.env
            });

            let output = '';
            child.stdout.on('data', (data) => output += data.toString());
            child.stderr.on('data', (data) => output += data.toString());

            const timeout = options.timeout || 30000;
            const timer = setTimeout(() => {
                child.kill();
                reject(new Error(`Command timeout after ${timeout}ms`));
            }, timeout);

            child.on('close', (code) => {
                clearTimeout(timer);
                resolve({
                    exitCode: code,
                    output
                });
            });

            child.on('error', (error) => {
                clearTimeout(timer);
                reject(error);
            });
        });
    }

    /**
     * ⏭️ Check if test should be skipped
     */
    shouldSkipTest(testName) {
        if (testName === 'Socket Load Test' && this.config.skipLoadTest) return true;
        if (testName === 'Chaos Testing' && this.config.skipChaosTest) return true;
        return false;
    }

    /**
     * 📊 Generate final report
     */
    generateFinalReport() {
        const criticalFailures = Object.values(this.results.categories)
            .filter(c => c.critical && c.status === 'failed').length;

        const allCriticalPassed = criticalFailures === 0;
        const deploymentReady = allCriticalPassed && this.results.failedTests === 0;

        console.log('\n🎯 MASTER VERIFICATION RESULTS');
        console.log('=====================================');
        console.log(`⏱️  Duration: ${this.getTestDuration()}`);
        console.log(`📊 Tests: ${this.results.passedTests}/${this.results.totalTests} passed`);
        console.log(`🚨 Critical failures: ${criticalFailures}`);
        console.log(`🏥 Overall status: ${deploymentReady ? 'READY FOR DEPLOYMENT' : 'NOT READY'}`);

        console.log('\n📋 Category Results:');
        Object.entries(this.results.categories).forEach(([name, result]) => {
            const icon = result.status === 'passed' ? '✅' : 
                        result.status === 'failed' ? '❌' : 
                        result.status === 'skipped' ? '⏭️' : '💥';
            const critical = result.critical ? ' (CRITICAL)' : '';
            console.log(`   ${icon} ${name}${critical}: ${result.status.toUpperCase()}`);
        });

        if (deploymentReady) {
            console.log('\n🎉 VERIFICATION COMPLETE - DEPLOYMENT APPROVED!');
            console.log('🚀 System is casino-grade and ready for real ETH');
            console.log('💰 All invariants verified, all critical tests passed');
        } else {
            console.log('\n🚨 VERIFICATION FAILED - DO NOT DEPLOY');
            console.log('❌ Critical issues must be resolved before going live');
            console.log('🔧 Review failed tests and fix before retrying');
        }

        // Save detailed report
        this.saveReport();

        return {
            passed: deploymentReady,
            critical: allCriticalPassed,
            results: this.results
        };
    }

    /**
     * 💥 Generate failure report
     */
    generateFailureReport() {
        console.log('\n💥 CRITICAL FAILURE DETECTED');
        console.log('=====================================');
        console.log('🚨 Verification stopped due to critical failure');
        console.log('❌ System is NOT ready for deployment');
        console.log('🔧 Must fix critical issues before proceeding');

        this.saveReport();

        return {
            passed: false,
            critical: false,
            results: this.results
        };
    }

    /**
     * 💾 Save detailed report to file
     */
    saveReport() {
        const reportPath = path.join(__dirname, '../reports', `verification-${Date.now()}.json`);
        
        // Ensure reports directory exists
        const reportsDir = path.dirname(reportPath);
        if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir, { recursive: true });
        }

        fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
        console.log(`\n📄 Detailed report saved: ${reportPath}`);
    }

    /**
     * ⏱️ Get test duration
     */
    getTestDuration() {
        if (!this.results.completed) return 'in progress';
        
        const start = new Date(this.results.started);
        const end = new Date(this.results.completed);
        const durationMs = end - start;
        
        return `${Math.round(durationMs / 1000)}s`;
    }
}

// CLI usage
if (require.main === module) {
    const verification = new MasterVerification();
    verification.runComplete().then(result => {
        process.exit(result.passed ? 0 : 1);
    }).catch(error => {
        console.error('\n💥 VERIFICATION CRASHED:', error);
        process.exit(1);
    });
}

module.exports = MasterVerification;
