/**
 * 📊 Prometheus Metrics Middleware
 * 
 * Casino-grade metrics collection for production monitoring
 * All the casino_* gauges & histograms for Grafana dashboards
 */

const promClient = require('prom-client');

class PrometheusMetrics {
    constructor() {
        // Create a Registry
        this.register = new promClient.Registry();
        
        // Add default metrics (CPU, memory, etc.)
        promClient.collectDefaultMetrics({ register: this.register });
        
        // Initialize all casino metrics
        this.initializeMetrics();
        
        console.log('📊 Prometheus metrics initialized');
    }

    initializeMetrics() {
        // =======================
        // CRITICAL BUSINESS METRICS
        // =======================

        // Round status and crash values
        this.casino_round_active = new promClient.Gauge({
            name: 'casino_round_active',
            help: 'Whether a crash round is currently active (1) or not (0)',
            labelNames: ['env']
        });

        this.casino_round_crash_value = new promClient.Gauge({
            name: 'casino_round_crash_value',
            help: 'The crash multiplier of the last completed round',
            labelNames: ['env']
        });

        this.casino_round_duration_seconds = new promClient.Histogram({
            name: 'casino_round_duration_seconds',
            help: 'Duration of crash rounds in seconds',
            buckets: [5, 10, 15, 30, 60, 120, 300],
            labelNames: ['env', 'phase'] // betting, running, crashed
        });

        // =======================
        // FINANCIAL INTEGRITY
        // =======================

        this.casino_ledger_snapshot_drift_wei = new promClient.Gauge({
            name: 'casino_ledger_snapshot_drift_wei',
            help: 'Difference between ledger total and account snapshots in wei (MUST be 0)',
            labelNames: ['env']
        });

        this.casino_hot_wallet_eth_wei = new promClient.Gauge({
            name: 'casino_hot_wallet_eth_wei',
            help: 'Hot wallet balance in wei',
            labelNames: ['env', 'wallet_type'] // hot, house
        });

        this.casino_total_balance_eth_wei = new promClient.Gauge({
            name: 'casino_total_balance_eth_wei',
            help: 'Total player balances in wei',
            labelNames: ['env', 'balance_type'] // available, locked, total
        });

        this.casino_withdrawals_pending = new promClient.Gauge({
            name: 'casino_withdrawals_pending',
            help: 'Number of pending withdrawal requests',
            labelNames: ['env']
        });

        // =======================
        // INDEXER & BLOCKCHAIN
        // =======================

        this.casino_indexer_last_block = new promClient.Gauge({
            name: 'casino_indexer_last_block',
            help: 'Last processed block number by deposit indexer',
            labelNames: ['env']
        });

        this.casino_indexer_confirmed_lag_blocks = new promClient.Gauge({
            name: 'casino_indexer_confirmed_lag_blocks',
            help: 'Number of blocks behind current head (with confirmations)',
            labelNames: ['env']
        });

        this.casino_deposits_processed_total = new promClient.Counter({
            name: 'casino_deposits_processed_total',
            help: 'Total number of deposits processed',
            labelNames: ['env', 'status'] // success, failed, duplicate
        });

        // =======================
        // API PERFORMANCE
        // =======================

        this.casino_rpc_place_bet_ms = new promClient.Histogram({
            name: 'casino_rpc_place_bet_ms',
            help: 'Latency of bet placement RPC calls in milliseconds',
            buckets: [10, 25, 50, 100, 150, 200, 500, 1000],
            labelNames: ['env', 'status'] // success, failed, conflict
        });

        this.casino_rpc_cashout_ms = new promClient.Histogram({
            name: 'casino_rpc_cashout_ms',
            help: 'Latency of cashout RPC calls in milliseconds',
            buckets: [10, 25, 50, 100, 150, 200, 500, 1000],
            labelNames: ['env', 'status']
        });

        this.casino_database_query_ms = new promClient.Histogram({
            name: 'casino_database_query_ms',
            help: 'Database query latency in milliseconds',
            buckets: [1, 5, 10, 25, 50, 100, 200, 500],
            labelNames: ['env', 'operation'] // select, insert, update, rpc
        });

        // =======================
        // SOCKET.IO & CONNECTIONS
        // =======================

        this.casino_socket_clients = new promClient.Gauge({
            name: 'casino_socket_clients',
            help: 'Number of connected WebSocket clients',
            labelNames: ['env']
        });

        this.casino_socket_events_total = new promClient.Counter({
            name: 'casino_socket_events_total',
            help: 'Total number of socket events emitted',
            labelNames: ['env', 'event_type'] // round_start, round_crash, bet_placed, etc.
        });

        this.casino_socket_reconnections_total = new promClient.Counter({
            name: 'casino_socket_reconnections_total',
            help: 'Total number of socket reconnections',
            labelNames: ['env', 'reason'] // disconnect, timeout, error
        });

        // =======================
        // ERROR TRACKING
        // =======================

        this.casino_errors_total = new promClient.Counter({
            name: 'casino_errors_total',
            help: 'Total number of errors by type',
            labelNames: ['env', 'error_type', 'component'] // backend, frontend, indexer, etc.
        });

        this.casino_invariant_violations_total = new promClient.Counter({
            name: 'casino_invariant_violations_total',
            help: 'Total number of invariant violations detected',
            labelNames: ['env', 'violation_type', 'severity'] // critical, high, medium
        });

        // =======================
        // GAME FAIRNESS
        // =======================

        this.casino_rtp_percentage = new promClient.Gauge({
            name: 'casino_rtp_percentage',
            help: 'Return to Player percentage over last N rounds',
            labelNames: ['env', 'window'] // 1k, 10k, 100k rounds
        });

        this.casino_instant_crash_rate = new promClient.Gauge({
            name: 'casino_instant_crash_rate',
            help: 'Rate of instant crashes (should be ~3.03%)',
            labelNames: ['env', 'window']
        });

        // Register all metrics
        this.register.registerMetric(this.casino_round_active);
        this.register.registerMetric(this.casino_round_crash_value);
        this.register.registerMetric(this.casino_round_duration_seconds);
        this.register.registerMetric(this.casino_ledger_snapshot_drift_wei);
        this.register.registerMetric(this.casino_hot_wallet_eth_wei);
        this.register.registerMetric(this.casino_total_balance_eth_wei);
        this.register.registerMetric(this.casino_withdrawals_pending);
        this.register.registerMetric(this.casino_indexer_last_block);
        this.register.registerMetric(this.casino_indexer_confirmed_lag_blocks);
        this.register.registerMetric(this.casino_deposits_processed_total);
        this.register.registerMetric(this.casino_rpc_place_bet_ms);
        this.register.registerMetric(this.casino_rpc_cashout_ms);
        this.register.registerMetric(this.casino_database_query_ms);
        this.register.registerMetric(this.casino_socket_clients);
        this.register.registerMetric(this.casino_socket_events_total);
        this.register.registerMetric(this.casino_socket_reconnections_total);
        this.register.registerMetric(this.casino_errors_total);
        this.register.registerMetric(this.casino_invariant_violations_total);
        this.register.registerMetric(this.casino_rtp_percentage);
        this.register.registerMetric(this.casino_instant_crash_rate);
    }

    // =======================
    // METRIC HELPER METHODS
    // =======================

    /**
     * 🎮 Record round metrics
     */
    recordRoundStart(env = 'prod') {
        this.casino_round_active.set({ env }, 1);
    }

    recordRoundCrash(env = 'prod', crashValue, durationSeconds) {
        this.casino_round_active.set({ env }, 0);
        this.casino_round_crash_value.set({ env }, crashValue);
        this.casino_round_duration_seconds.observe({ env, phase: 'running' }, durationSeconds);
    }

    /**
     * 💰 Record financial metrics
     */
    recordLedgerDrift(env = 'prod', driftWei) {
        this.casino_ledger_snapshot_drift_wei.set({ env }, driftWei);
        
        // Alert if drift is non-zero
        if (driftWei !== 0) {
            this.casino_invariant_violations_total.inc({ 
                env, 
                violation_type: 'ledger_drift', 
                severity: 'critical' 
            });
        }
    }

    recordWalletBalance(env = 'prod', walletType, balanceWei) {
        this.casino_hot_wallet_eth_wei.set({ env, wallet_type: walletType }, balanceWei);
    }

    recordTotalBalance(env = 'prod', balanceType, balanceWei) {
        this.casino_total_balance_eth_wei.set({ env, balance_type: balanceType }, balanceWei);
    }

    /**
     * 🔍 Record indexer metrics
     */
    recordIndexerBlock(env = 'prod', blockNumber, lagBlocks) {
        this.casino_indexer_last_block.set({ env }, blockNumber);
        this.casino_indexer_confirmed_lag_blocks.set({ env }, lagBlocks);
    }

    recordDeposit(env = 'prod', status) {
        this.casino_deposits_processed_total.inc({ env, status });
    }

    /**
     * ⚡ Record API performance
     */
    recordBetPlacement(env = 'prod', latencyMs, status) {
        this.casino_rpc_place_bet_ms.observe({ env, status }, latencyMs);
    }

    recordCashout(env = 'prod', latencyMs, status) {
        this.casino_rpc_cashout_ms.observe({ env, status }, latencyMs);
    }

    recordDatabaseQuery(env = 'prod', operation, latencyMs) {
        this.casino_database_query_ms.observe({ env, operation }, latencyMs);
    }

    /**
     * 🌐 Record socket metrics
     */
    recordSocketClients(env = 'prod', count) {
        this.casino_socket_clients.set({ env }, count);
    }

    recordSocketEvent(env = 'prod', eventType) {
        this.casino_socket_events_total.inc({ env, event_type: eventType });
    }

    recordSocketReconnection(env = 'prod', reason) {
        this.casino_socket_reconnections_total.inc({ env, reason });
    }

    /**
     * ❌ Record errors
     */
    recordError(env = 'prod', errorType, component) {
        this.casino_errors_total.inc({ env, error_type: errorType, component });
    }

    recordInvariantViolation(env = 'prod', violationType, severity) {
        this.casino_invariant_violations_total.inc({ 
            env, 
            violation_type: violationType, 
            severity 
        });
    }

    /**
     * 🎲 Record fairness metrics
     */
    recordRTP(env = 'prod', window, rtpPercentage) {
        this.casino_rtp_percentage.set({ env, window }, rtpPercentage);
        
        // Alert if RTP is outside expected range (97% ± 0.8%)
        if (Math.abs(rtpPercentage - 97) > 0.8) {
            this.casino_invariant_violations_total.inc({ 
                env, 
                violation_type: 'rtp_drift', 
                severity: 'high' 
            });
        }
    }

    recordInstantCrashRate(env = 'prod', window, rate) {
        this.casino_instant_crash_rate.set({ env, window }, rate);
        
        // Alert if instant crash rate is outside expected range (~3.03% ± 0.5%)
        if (Math.abs(rate - 3.03) > 0.5) {
            this.casino_invariant_violations_total.inc({ 
                env, 
                violation_type: 'crash_rate_drift', 
                severity: 'medium' 
            });
        }
    }

    /**
     * 🎯 Express middleware for automatic API metrics
     */
    getMiddleware() {
        return (req, res, next) => {
            const start = Date.now();
            const env = process.env.NODE_ENV || 'dev';

            // Track the response
            const originalSend = res.send;
            res.send = function(data) {
                const duration = Date.now() - start;
                const status = res.statusCode >= 400 ? 'error' : 'success';
                
                // Record API latency based on endpoint
                if (req.path.includes('/bet/place')) {
                    global.metrics?.recordBetPlacement(env, duration, status);
                } else if (req.path.includes('/cashout')) {
                    global.metrics?.recordCashout(env, duration, status);
                }

                // Call original send
                originalSend.call(this, data);
            };

            next();
        };
    }

    /**
     * 📊 Get metrics endpoint handler
     */
    getMetricsHandler() {
        return async (req, res) => {
            try {
                const metrics = await this.register.metrics();
                res.set('Content-Type', this.register.contentType);
                res.send(metrics);
            } catch (error) {
                res.status(500).send('Error generating metrics');
            }
        };
    }

    /**
     * 🧹 Clear all metrics (for testing)
     */
    clear() {
        this.register.clear();
    }
}

module.exports = PrometheusMetrics;
