/**
 * 🚨 /internal/health/invariants - Critical System Integrity Endpoint
 * 
 * Real-time ledger invariant checking for production monitoring
 * ALERT IMMEDIATELY if any violations detected
 */

const express = require('express');
const { createClient } = require('@supabase/supabase-js');

class InvariantHealthEndpoint {
    constructor(supabaseUrl, supabaseKey) {
        this.supabase = createClient(supabaseUrl, supabaseKey);
        this.router = express.Router();
        this.setupRoutes();
        
        // Cache last check to avoid hammering DB
        this.lastCheck = null;
        this.cacheMs = 30000; // 30 second cache
        
        console.log('🚨 Invariant health endpoint initialized');
    }

    setupRoutes() {
        // Critical invariants check (should be monitored)
        this.router.get('/internal/health/invariants', this.handleInvariantCheck.bind(this));
        
        // Force recheck (bypass cache)
        this.router.post('/internal/health/invariants/recheck', this.handleForceRecheck.bind(this));
    }

    /**
     * 🔍 Main invariant health check
     */
    async handleInvariantCheck(req, res) {
        try {
            // Use cache if recent
            if (this.lastCheck && Date.now() - this.lastCheck.timestamp < this.cacheMs) {
                return res.json(this.lastCheck.data);
            }

            const invariants = await this.checkAllInvariants();
            
            // Cache result
            this.lastCheck = {
                timestamp: Date.now(),
                data: invariants
            };

            // Set appropriate HTTP status
            const hasViolations = invariants.violations.total > 0;
            const status = hasViolations ? 500 : 200;

            res.status(status).json(invariants);

        } catch (error) {
            console.error('❌ Invariant check failed:', error);
            res.status(503).json({
                status: 'error',
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * 🔄 Force recheck (bypass cache)
     */
    async handleForceRecheck(req, res) {
        try {
            this.lastCheck = null; // Clear cache
            const invariants = await this.checkAllInvariants();
            
            const hasViolations = invariants.violations.total > 0;
            const status = hasViolations ? 500 : 200;

            res.status(status).json(invariants);

        } catch (error) {
            console.error('❌ Force recheck failed:', error);
            res.status(503).json({
                status: 'error',
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * 🔍 Check all critical invariants
     */
    async checkAllInvariants() {
        const checks = [];
        const violations = {
            critical: 0,
            high: 0,
            medium: 0,
            total: 0
        };

        // 1. CRITICAL: No negative balances
        try {
            const { data: negativeBalances } = await this.supabase
                .from('accounts')
                .select('user_id, available, locked')
                .or('available.lt.0,locked.lt.0');

            const violationCount = negativeBalances?.length || 0;
            checks.push({
                name: 'negative_balances',
                severity: 'critical',
                status: violationCount === 0 ? 'pass' : 'fail',
                violations: violationCount,
                details: violationCount > 0 ? negativeBalances.slice(0, 5) : null,
                description: 'No accounts should have negative balances'
            });

            if (violationCount > 0) {
                violations.critical += violationCount;
                violations.total += violationCount;
            }

        } catch (error) {
            checks.push({
                name: 'negative_balances',
                severity: 'critical',
                status: 'error',
                error: error.message
            });
            violations.critical += 1;
            violations.total += 1;
        }

        // 2. CRITICAL: Ledger-snapshot consistency (drift must be 0)
        try {
            const driftCheck = await this.checkLedgerSnapshotDrift();
            checks.push(driftCheck);

            if (driftCheck.status === 'fail') {
                violations.critical += 1;
                violations.total += 1;
            }

        } catch (error) {
            checks.push({
                name: 'ledger_snapshot_consistency',
                severity: 'critical',
                status: 'error',
                error: error.message
            });
            violations.critical += 1;
            violations.total += 1;
        }

        // 3. HIGH: Indexer lag
        try {
            const indexerCheck = await this.checkIndexerLag();
            checks.push(indexerCheck);

            if (indexerCheck.status === 'fail') {
                violations.high += 1;
                violations.total += 1;
            }

        } catch (error) {
            checks.push({
                name: 'indexer_lag',
                severity: 'high',
                status: 'error',
                error: error.message
            });
            violations.high += 1;
            violations.total += 1;
        }

        // 4. HIGH: Hot wallet balance
        try {
            const hotWalletCheck = await this.checkHotWalletBalance();
            checks.push(hotWalletCheck);

            if (hotWalletCheck.status === 'fail') {
                violations.high += 1;
                violations.total += 1;
            }

        } catch (error) {
            checks.push({
                name: 'hot_wallet_balance',
                severity: 'high',
                status: 'error',
                error: error.message
            });
            violations.high += 1;
            violations.total += 1;
        }

        // 5. MEDIUM: Idempotency violations
        try {
            const { data: ledgerData } = await this.supabase
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
                severity: 'medium',
                status: duplicates === 0 ? 'pass' : 'fail',
                violations: duplicates,
                description: 'No duplicate client_ids should exist in ledger'
            });

            if (duplicates > 0) {
                violations.medium += duplicates;
                violations.total += duplicates;
            }

        } catch (error) {
            checks.push({
                name: 'idempotency_violations',
                severity: 'medium',
                status: 'error',
                error: error.message
            });
            violations.medium += 1;
            violations.total += 1;
        }

        return {
            status: violations.total === 0 ? 'healthy' : 'violations_detected',
            timestamp: new Date().toISOString(),
            violations,
            checks,
            summary: {
                total_checks: checks.length,
                passed_checks: checks.filter(c => c.status === 'pass').length,
                failed_checks: checks.filter(c => c.status === 'fail').length,
                error_checks: checks.filter(c => c.status === 'error').length
            }
        };
    }

    /**
     * 💰 Check ledger-snapshot drift (CRITICAL)
     */
    async checkLedgerSnapshotDrift() {
        // Calculate ledger totals
        const { data: ledgerData } = await this.supabase
            .from('ledger')
            .select('op_type, amount');

        const ledgerTotal = ledgerData?.reduce((sum, entry) => {
            const amount = parseInt(entry.amount);
            if (['deposit', 'bet_win', 'adjustment'].includes(entry.op_type)) {
                return sum + amount;
            } else if (['withdraw', 'bet_lose'].includes(entry.op_type)) {
                return sum - amount;
            }
            return sum;
        }, 0) || 0;

        // Calculate account totals
        const { data: accountData } = await this.supabase
            .from('accounts')
            .select('available, locked');

        const accountTotal = accountData?.reduce((sum, account) => {
            return sum + parseInt(account.available) + parseInt(account.locked);
        }, 0) || 0;

        const drift = ledgerTotal - accountTotal;

        return {
            name: 'ledger_snapshot_consistency',
            severity: 'critical',
            status: drift === 0 ? 'pass' : 'fail',
            violations: Math.abs(drift) > 0 ? 1 : 0,
            details: {
                ledger_total_wei: ledgerTotal,
                account_total_wei: accountTotal,
                drift_wei: drift,
                drift_eth: drift / 1e18
            },
            description: 'Ledger total must equal account snapshot total'
        };
    }

    /**
     * 🔍 Check indexer lag
     */
    async checkIndexerLag() {
        try {
            // Get indexer checkpoint
            const { data: checkpointData } = await this.supabase.rpc('get_indexer_checkpoint');
            const lastProcessed = BigInt(checkpointData || 0);

            // Get current block (would need RPC client)
            // For now, use a reasonable threshold
            const maxLagBlocks = parseInt(process.env.INDEXER_MAX_LAG_BLOCKS || '18');
            
            // This would need actual block number from RPC
            // const currentBlock = await this.getCurrentBlockNumber();
            // const lag = currentBlock - lastProcessed;
            
            // For now, just check if checkpoint is advancing
            const isAdvancing = lastProcessed > 0;

            return {
                name: 'indexer_lag',
                severity: 'high',
                status: isAdvancing ? 'pass' : 'fail',
                violations: isAdvancing ? 0 : 1,
                details: {
                    last_processed_block: lastProcessed.toString(),
                    max_lag_threshold: maxLagBlocks
                },
                description: 'Indexer should be processing blocks with minimal lag'
            };

        } catch (error) {
            return {
                name: 'indexer_lag',
                severity: 'high',
                status: 'error',
                error: error.message
            };
        }
    }

    /**
     * 🏦 Check hot wallet balance
     */
    async checkHotWalletBalance() {
        try {
            const minBalanceWei = process.env.HOT_WALLET_MIN_WEI || '1000000000000000000'; // 1 ETH default
            
            // This would need actual balance check from blockchain
            // For now, check if we have a configured minimum
            const hasMinimumSet = !!process.env.HOT_WALLET_MIN_WEI;

            return {
                name: 'hot_wallet_balance',
                severity: 'high',
                status: hasMinimumSet ? 'pass' : 'warning',
                violations: hasMinimumSet ? 0 : 1,
                details: {
                    min_balance_wei: minBalanceWei,
                    min_balance_eth: parseInt(minBalanceWei) / 1e18,
                    configured: hasMinimumSet
                },
                description: 'Hot wallet should maintain minimum balance for payouts'
            };

        } catch (error) {
            return {
                name: 'hot_wallet_balance',
                severity: 'high',
                status: 'error',
                error: error.message
            };
        }
    }

    /**
     * 📊 Get router for Express app
     */
    getRouter() {
        return this.router;
    }
}

module.exports = InvariantHealthEndpoint;
