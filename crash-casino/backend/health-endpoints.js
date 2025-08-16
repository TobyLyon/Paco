/**
 * 🏥 Health Check Endpoints
 * 
 * Production-grade health monitoring with:
 * - Ledger invariant checks
 * - System metrics
 * - Circuit breaker status
 * - Real-time diagnostics
 */

const express = require('express');
const { createClient } = require('@supabase/supabase-js');

class HealthEndpoints {
    constructor(config = {}) {
        this.config = config;
        this.supabase = createClient(
            config.supabaseUrl || process.env.SUPABASE_URL,
            config.supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY
        );
        
        this.router = express.Router();
        this.setupRoutes();
        
        // Metrics tracking
        this.metrics = {
            totalRequests: 0,
            healthChecks: 0,
            invariantChecks: 0,
            lastInvariantCheck: null,
            errors: []
        };
        
        console.log('🏥 Health endpoints initialized');
    }

    setupRoutes() {
        // Basic health check
        this.router.get('/health', this.handleBasicHealth.bind(this));
        
        // Detailed system health
        this.router.get('/health/detailed', this.handleDetailedHealth.bind(this));
        
        // Ledger invariant checks
        this.router.get('/health/invariants', this.handleInvariantChecks.bind(this));
        
        // Indexer status
        this.router.get('/health/indexer', this.handleIndexerHealth.bind(this));
        
        // Socket status
        this.router.get('/health/sockets', this.handleSocketHealth.bind(this));
        
        // Metrics endpoint
        this.router.get('/metrics', this.handleMetrics.bind(this));
        
        // Force invariant recheck
        this.router.post('/internal/recheck-invariants', this.handleForceInvariantCheck.bind(this));
    }

    /**
     * 🏥 Basic health check
     */
    async handleBasicHealth(req, res) {
        this.metrics.healthChecks++;
        
        try {
            // Quick database connectivity check
            const { data, error } = await this.supabase
                .from('accounts')
                .select('count')
                .limit(1);

            if (error) {
                throw error;
            }

            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                version: process.env.npm_package_version || '1.0.0'
            });

        } catch (error) {
            this.logError('Basic health check failed', error);
            res.status(503).json({
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * 🏥 Detailed system health
     */
    async handleDetailedHealth(req, res) {
        this.metrics.healthChecks++;
        
        try {
            const health = {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                services: {},
                metrics: {
                    uptime: process.uptime(),
                    memory: process.memoryUsage(),
                    cpu: process.cpuUsage()
                }
            };

            // Check database
            try {
                const dbStart = Date.now();
                const { data } = await this.supabase
                    .from('accounts')
                    .select('count')
                    .limit(1);
                
                health.services.database = {
                    status: 'healthy',
                    latency: Date.now() - dbStart,
                    accessible: true
                };
            } catch (error) {
                health.services.database = {
                    status: 'unhealthy',
                    error: error.message
                };
                health.status = 'degraded';
            }

            // Check indexer if available
            if (global.depositIndexer) {
                try {
                    const indexerStatus = await global.depositIndexer.getStatus();
                    health.services.indexer = indexerStatus;
                } catch (error) {
                    health.services.indexer = {
                        status: 'unhealthy',
                        error: error.message
                    };
                    health.status = 'degraded';
                }
            }

            // Check socket manager if available
            if (global.socketManager) {
                try {
                    health.services.sockets = global.socketManager.getHealthStatus();
                } catch (error) {
                    health.services.sockets = {
                        status: 'unhealthy',
                        error: error.message
                    };
                }
            }

            // Check balance API if available
            if (global.balanceAPI) {
                try {
                    const balanceHealth = await global.balanceAPI.healthCheck();
                    health.services.balance = balanceHealth;
                } catch (error) {
                    health.services.balance = {
                        status: 'unhealthy',
                        error: error.message
                    };
                    health.status = 'degraded';
                }
            }

            res.json(health);

        } catch (error) {
            this.logError('Detailed health check failed', error);
            res.status(503).json({
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * 🔍 Ledger invariant checks
     */
    async handleInvariantChecks(req, res) {
        this.metrics.invariantChecks++;
        this.metrics.lastInvariantCheck = new Date().toISOString();
        
        try {
            const checks = await this.runInvariantChecks();
            
            const hasViolations = checks.some(check => check.violations > 0);
            const status = hasViolations ? 'violations_detected' : 'healthy';
            
            res.json({
                status,
                timestamp: new Date().toISOString(),
                checks,
                summary: {
                    totalChecks: checks.length,
                    passedChecks: checks.filter(c => c.violations === 0).length,
                    totalViolations: checks.reduce((sum, c) => sum + c.violations, 0)
                }
            });

        } catch (error) {
            this.logError('Invariant checks failed', error);
            res.status(500).json({
                status: 'error',
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * 📊 Run all ledger invariant checks
     */
    async runInvariantChecks() {
        const checks = [];

        // 1. No negative balances
        try {
            const { data: negativeBalances } = await this.supabase
                .from('accounts')
                .select('user_id, available, locked')
                .or('available.lt.0,locked.lt.0');

            checks.push({
                name: 'no_negative_balances',
                description: 'Verify no accounts have negative balances',
                violations: negativeBalances?.length || 0,
                details: negativeBalances?.slice(0, 5) || [], // First 5 violations
                severity: 'critical'
            });
        } catch (error) {
            checks.push({
                name: 'no_negative_balances',
                error: error.message,
                severity: 'critical'
            });
        }

        // 2. Ledger-snapshot consistency
        try {
            const { data: consistency } = await this.supabase.rpc('check_ledger_consistency');
            const drift = consistency?.[0]?.snapshot_drift || 0;

            checks.push({
                name: 'ledger_snapshot_consistency',
                description: 'Verify ledger totals match account snapshots',
                violations: Math.abs(drift) > 0 ? 1 : 0,
                details: { snapshot_drift_wei: drift },
                severity: 'critical'
            });
        } catch (error) {
            // If RPC doesn't exist, calculate manually
            try {
                const { data: ledgerData } = await this.supabase
                    .from('ledger')
                    .select('op_type, amount');

                const { data: accountData } = await this.supabase
                    .from('accounts')
                    .select('available, locked');

                const ledgerTotal = ledgerData?.reduce((sum, entry) => {
                    if (['deposit', 'bet_win', 'adjustment'].includes(entry.op_type)) {
                        return sum + parseInt(entry.amount);
                    } else if (['withdraw', 'bet_lose'].includes(entry.op_type)) {
                        return sum - parseInt(entry.amount);
                    }
                    return sum;
                }, 0) || 0;

                const accountTotal = accountData?.reduce((sum, account) => {
                    return sum + parseInt(account.available) + parseInt(account.locked);
                }, 0) || 0;

                const drift = ledgerTotal - accountTotal;

                checks.push({
                    name: 'ledger_snapshot_consistency',
                    description: 'Verify ledger totals match account snapshots',
                    violations: Math.abs(drift) > 0 ? 1 : 0,
                    details: { 
                        ledger_total: ledgerTotal,
                        account_total: accountTotal,
                        snapshot_drift_wei: drift 
                    },
                    severity: 'critical'
                });
            } catch (calcError) {
                checks.push({
                    name: 'ledger_snapshot_consistency',
                    error: calcError.message,
                    severity: 'critical'
                });
            }
        }

        // 3. Idempotency violations
        try {
            const { data: duplicates } = await this.supabase
                .from('ledger')
                .select('user_id, ref')
                .not('ref->client_id', 'is', null);

            const clientIds = new Map();
            let violations = 0;

            duplicates?.forEach(entry => {
                const key = `${entry.user_id}-${entry.ref?.client_id}`;
                if (clientIds.has(key)) {
                    violations++;
                } else {
                    clientIds.set(key, true);
                }
            });

            checks.push({
                name: 'idempotency_violations',
                description: 'Verify no duplicate client_ids in ledger',
                violations,
                severity: 'high'
            });
        } catch (error) {
            checks.push({
                name: 'idempotency_violations',
                error: error.message,
                severity: 'high'
            });
        }

        // 4. Recent activity check
        try {
            const { data: recentActivity } = await this.supabase
                .from('ledger')
                .select('count')
                .gte('created_at', new Date(Date.now() - 3600000).toISOString()) // Last hour
                .single();

            const activityCount = recentActivity?.count || 0;

            checks.push({
                name: 'recent_activity',
                description: 'Check for recent ledger activity',
                violations: 0, // Not a violation, just info
                details: { entries_last_hour: activityCount },
                severity: 'info'
            });
        } catch (error) {
            checks.push({
                name: 'recent_activity',
                error: error.message,
                severity: 'info'
            });
        }

        return checks;
    }

    /**
     * 🔍 Indexer health check
     */
    async handleIndexerHealth(req, res) {
        try {
            if (!global.depositIndexer) {
                return res.json({
                    status: 'not_configured',
                    message: 'Deposit indexer not available'
                });
            }

            const status = await global.depositIndexer.getStatus();
            res.json(status);

        } catch (error) {
            res.status(500).json({
                status: 'error',
                error: error.message
            });
        }
    }

    /**
     * 🌐 Socket health check
     */
    async handleSocketHealth(req, res) {
        try {
            if (!global.socketManager) {
                return res.json({
                    status: 'not_configured',
                    message: 'Socket manager not available'
                });
            }

            const status = global.socketManager.getHealthStatus();
            res.json(status);

        } catch (error) {
            res.status(500).json({
                status: 'error',
                error: error.message
            });
        }
    }

    /**
     * 📊 Metrics endpoint
     */
    async handleMetrics(req, res) {
        try {
            const metrics = {
                ...this.metrics,
                timestamp: new Date().toISOString(),
                process: {
                    uptime: process.uptime(),
                    memory: process.memoryUsage(),
                    cpu: process.cpuUsage()
                }
            };

            // Add custom metrics if available
            if (global.customMetrics) {
                metrics.custom = global.customMetrics;
            }

            res.json(metrics);

        } catch (error) {
            res.status(500).json({
                error: error.message
            });
        }
    }

    /**
     * 🔄 Force invariant check
     */
    async handleForceInvariantCheck(req, res) {
        try {
            const checks = await this.runInvariantChecks();
            
            // Log critical violations
            const criticalViolations = checks.filter(c => c.severity === 'critical' && c.violations > 0);
            if (criticalViolations.length > 0) {
                console.error('🚨 CRITICAL INVARIANT VIOLATIONS DETECTED:');
                criticalViolations.forEach(v => {
                    console.error(`   - ${v.name}: ${v.violations} violations`);
                    if (v.details) console.error(`     Details:`, v.details);
                });
            }

            res.json({
                status: 'completed',
                timestamp: new Date().toISOString(),
                checks
            });

        } catch (error) {
            res.status(500).json({
                status: 'error',
                error: error.message
            });
        }
    }

    /**
     * 📝 Log error
     */
    logError(message, error) {
        const errorEntry = {
            timestamp: new Date().toISOString(),
            message,
            error: error?.message || error
        };
        
        this.metrics.errors.push(errorEntry);
        
        // Keep only last 50 errors
        if (this.metrics.errors.length > 50) {
            this.metrics.errors = this.metrics.errors.slice(-50);
        }
        
        console.error(`🏥 Health check error: ${message}`, error);
    }

    /**
     * 📊 Get router for Express app
     */
    getRouter() {
        return this.router;
    }
}

module.exports = HealthEndpoints;
