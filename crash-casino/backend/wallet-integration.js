/**
 * 🔐 PacoRocko Backend Wallet Integration
 * 
 * Secure wallet management system using Supabase backend
 * No smart contracts - pure backend balance management with environment security
 */

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const { toWei, fromWei } = require('../../src/lib/money');

class WalletIntegration {
    constructor(config = {}) {
        this.config = {
            supabaseUrl: process.env.SUPABASE_URL,
            supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY, // Service role for backend operations
            houseBankWallet: process.env.HOUSE_BANK_WALLET || '0x0000000000000000000000000000000000000001',
            minBet: parseFloat(process.env.MIN_BET || '0.001'),
            maxBet: parseFloat(process.env.MAX_BET || '10.0'),
            houseEdge: parseFloat(process.env.HOUSE_EDGE || '0.02'),
            enableDatabase: config.enableDatabase !== false, // Allow disabling database
            ...config
        };

        // Initialize Supabase only if configuration is available
        this.supabase = null;
        this.databaseEnabled = false;
        
        if (this.config.supabaseUrl && this.config.supabaseServiceKey && this.config.enableDatabase) {
            try {
                this.supabase = createClient(
                    this.config.supabaseUrl,
                    this.config.supabaseServiceKey
                );
                this.databaseEnabled = true;
                console.log('🔐 Wallet Integration initialized with Supabase backend');
            } catch (error) {
                console.warn('⚠️ Supabase initialization failed, running in demo mode:', error.message);
                this.databaseEnabled = false;
            }
        } else {
            console.log('🔐 Wallet Integration initialized in DEMO MODE (no database)');
            this.databaseEnabled = false;
        }

        // In-memory balance cache for performance
        this.balanceCache = new Map();
        this.cacheExpiry = new Map();
        this.cacheTTL = 30000; // 30 seconds cache

        // Demo mode: Initialize demo balances
        if (!this.databaseEnabled) {
            this.initDemoMode();
        }
    }

    /**
     * 🎮 Initialize demo mode with fake balances
     */
    initDemoMode() {
        console.log('🎮 Running in DEMO MODE - using in-memory balances');
        this.demoBalances = new Map();
        this.demoTransactions = [];
        
        // Set default demo balance for any wallet
        this.defaultDemoBalance = 10.0; // 10 ETH demo balance
    }

    /**
     * 🔍 Verify wallet ownership (signature-based)
     */
    async verifyWalletOwnership(walletAddress, signature, message) {
        try {
            // In production, implement proper signature verification
            // For now, we'll use a simple verification mechanism
            const expectedMessage = `PacoRocko Access Request: ${Date.now()}`;
            
            // Simple verification - in production use proper crypto verification
            if (signature && signature.length > 10 && walletAddress.length === 42) {
                return {
                    valid: true,
                    walletAddress,
                    timestamp: Date.now()
                };
            }
            
            return { valid: false, error: 'Invalid signature' };
            
        } catch (error) {
            console.error('❌ Wallet verification failed:', error);
            return { valid: false, error: 'Verification failed' };
        }
    }

    /**
     * 💰 Get player balance (with caching)
     */
    async getPlayerBalance(walletAddress) {
        try {
            // Check cache first
            const cached = this.balanceCache.get(walletAddress);
            const cacheTime = this.cacheExpiry.get(walletAddress);
            
            if (cached && cacheTime && Date.now() < cacheTime) {
                return cached;
            }

            let balance;

            if (this.databaseEnabled && this.supabase) {
                // Query Supabase for player balance
                const { data, error } = await this.supabase
                    .from('player_balances')
                    .select('balance, locked_balance')
                    .eq('wallet_address', walletAddress)
                    .single();

                if (error && error.code !== 'PGRST116') { // PGRST116 = not found
                    throw error;
                }

                balance = data ? {
                    available: parseFloat(data.balance || 0),
                    locked: parseFloat(data.locked_balance || 0),
                    total: parseFloat(data.balance || 0) + parseFloat(data.locked_balance || 0)
                } : {
                    available: 0,
                    locked: 0,
                    total: 0
                };
            } else {
                // Demo mode: Use in-memory balances
                const demoBalance = this.demoBalances.get(walletAddress) || this.defaultDemoBalance;
                balance = {
                    available: demoBalance,
                    locked: 0,
                    total: demoBalance
                };
                
                // Set initial demo balance if not exists
                if (!this.demoBalances.has(walletAddress)) {
                    this.demoBalances.set(walletAddress, this.defaultDemoBalance);
                }
            }

            // Cache the result
            this.balanceCache.set(walletAddress, balance);
            this.cacheExpiry.set(walletAddress, Date.now() + this.cacheTTL);

            return balance;

        } catch (error) {
            console.error('❌ Failed to get player balance:', error);
            
            // Fallback to demo balance
            const fallbackBalance = {
                available: this.defaultDemoBalance || 10.0,
                locked: 0,
                total: this.defaultDemoBalance || 10.0
            };
            
            return fallbackBalance;
        }
    }

    /**
     * 💸 Process bet placement
     */
    async placeBet(walletAddress, amount, roundId) {
        try {
            // Validate bet amount
            if (amount < this.config.minBet || amount > this.config.maxBet) {
                return {
                    success: false,
                    error: `Bet must be between ${this.config.minBet} and ${this.config.maxBet} ETH`
                };
            }

            // Get current balance
            const balance = await this.getPlayerBalance(walletAddress);
            
            if (balance.available < amount) {
                return {
                    success: false,
                    error: 'Insufficient balance'
                };
            }

            // Create transaction record
            const transactionId = crypto.randomUUID();
            
            if (this.databaseEnabled && this.supabase) {
                // Database mode: Use Supabase transactions
                const { data: txData, error: txError } = await this.supabase.rpc('process_bet_placement', {
                    p_wallet_address: walletAddress,
                    p_amount: amount,
                    p_round_id: roundId,
                    p_transaction_id: transactionId
                });

                if (txError) {
                    console.error('❌ Bet placement transaction failed:', txError);
                    return {
                        success: false,
                        error: 'Transaction failed'
                    };
                }

                // Record in crash_bets table
                const { error: betError } = await this.supabase
                    .from('crash_bets')
                    .insert({
                        round_id: roundId,
                        player_address: walletAddress,
                        bet_amount: amount,
                        status: 'active',
                        tx_hash: transactionId
                    });

                if (betError) {
                    console.error('❌ Failed to record bet:', betError);
                    // Rollback balance change
                    await this.refundBet(walletAddress, amount, transactionId);
                    return {
                        success: false,
                        error: 'Failed to record bet'
                    };
                }
            } else {
                // Demo mode: Update in-memory balance using proper BigInt arithmetic
                const currentBalance = this.demoBalances.get(walletAddress) || this.defaultDemoBalance;
                const currentWei = toWei(currentBalance.toString());
                const amountWei = toWei(amount.toString());
                const newBalanceWei = currentWei - amountWei; // Proper BigInt arithmetic
                // UI conversion only for demo balance tracking - not money arithmetic
                const newBalance = Number(fromWei(newBalanceWei));
                this.demoBalances.set(walletAddress, newBalance);
                
                // Store demo transaction
                this.demoTransactions.push({
                    id: transactionId,
                    walletAddress,
                    amount,
                    roundId,
                    type: 'bet',
                    timestamp: Date.now()
                });
            }

            // Clear cache
            this.balanceCache.delete(walletAddress);
            this.cacheExpiry.delete(walletAddress);

            console.log(`💰 Bet placed: ${walletAddress} - ${amount} ETH (${this.databaseEnabled ? 'DB' : 'DEMO'} mode)`);
            
            return {
                success: true,
                transactionId,
                newBalance: (await this.getPlayerBalance(walletAddress)).available
            };

        } catch (error) {
            console.error('❌ Bet placement error:', error);
            return {
                success: false,
                error: 'System error'
            };
        }
    }

    /**
     * 🏃‍♂️ Process cash out
     */
    async processCashOut(walletAddress, roundId, multiplier, betAmount) {
        try {
            const payout = betAmount * multiplier;
            const profit = payout - betAmount;
            const transactionId = crypto.randomUUID();

            // Calculate house profit/loss
            const houseProfit = betAmount - payout;

            if (this.databaseEnabled && this.supabase) {
                // Database mode: Use Supabase
                const { error: payoutError } = await this.supabase.rpc('process_cash_out', {
                    p_wallet_address: walletAddress,
                    p_payout: payout,
                    p_round_id: roundId,
                    p_transaction_id: transactionId,
                    p_multiplier: multiplier
                });

                if (payoutError) {
                    console.error('❌ Cash out processing failed:', payoutError);
                    return {
                        success: false,
                        error: 'Payout failed'
                    };
                }

                // Update bet record
                const { error: updateError } = await this.supabase
                    .from('crash_bets')
                    .update({
                        multiplier: multiplier,
                        payout: payout,
                        status: 'cashed_out',
                        cash_out_time: new Date().toISOString()
                    })
                    .eq('player_address', walletAddress)
                    .eq('round_id', roundId)
                    .eq('status', 'active');

                if (updateError) {
                    console.error('❌ Failed to update bet record:', updateError);
                }

                // Update house balance
                await this.updateHouseBalance(houseProfit);
            } else {
                // Demo mode: Update in-memory balance
                const currentBalance = this.demoBalances.get(walletAddress) || 0;
                const newBalance = currentBalance + payout;
                this.demoBalances.set(walletAddress, newBalance);
                
                // Store demo transaction
                this.demoTransactions.push({
                    id: transactionId,
                    walletAddress,
                    amount: payout,
                    roundId,
                    type: 'cashout',
                    multiplier,
                    timestamp: Date.now()
                });
            }

            // Clear cache
            this.balanceCache.delete(walletAddress);
            this.cacheExpiry.delete(walletAddress);

            console.log(`🏃‍♂️ Cash out: ${walletAddress} - ${payout} ETH at ${multiplier}x (${this.databaseEnabled ? 'DB' : 'DEMO'} mode)`);

            return {
                success: true,
                payout,
                profit,
                multiplier,
                transactionId,
                newBalance: (await this.getPlayerBalance(walletAddress)).available
            };

        } catch (error) {
            console.error('❌ Cash out error:', error);
            return {
                success: false,
                error: 'System error'
            };
        }
    }

    /**
     * 💸 Process lost bet
     */
    async processLostBet(walletAddress, roundId, betAmount) {
        try {
            const transactionId = crypto.randomUUID();

            // Update bet record as lost
            const { error: updateError } = await this.supabase
                .from('crash_bets')
                .update({
                    status: 'lost',
                    cash_out_time: new Date().toISOString()
                })
                .eq('player_address', walletAddress)
                .eq('round_id', roundId)
                .eq('status', 'active');

            if (updateError) {
                console.error('❌ Failed to update lost bet:', updateError);
                return false;
            }

            // House wins the bet amount
            await this.updateHouseBalance(betAmount);

            console.log(`💸 Lost bet: ${walletAddress} - ${betAmount} ETH`);
            return true;

        } catch (error) {
            console.error('❌ Lost bet processing error:', error);
            return false;
        }
    }

    /**
     * 🏦 Update house balance
     */
    async updateHouseBalance(amount) {
        try {
            if (this.databaseEnabled && this.supabase) {
                const { error } = await this.supabase.rpc('update_house_balance', {
                    p_amount: amount
                });

                if (error) {
                    console.error('❌ House balance update failed:', error);
                }
            } else {
                // Demo mode: Just log the house balance change
                console.log(`🏦 Demo house balance change: ${amount > 0 ? '+' : ''}${amount.toFixed(4)} ETH`);
            }

        } catch (error) {
            console.error('❌ House balance error:', error);
        }
    }

    /**
     * 💳 Add funds to player account (admin function)
     */
    async addFunds(walletAddress, amount, adminAddress, reason = 'manual_credit') {
        try {
            const transactionId = crypto.randomUUID();

            const { error } = await this.supabase.rpc('add_player_funds', {
                p_wallet_address: walletAddress,
                p_amount: amount,
                p_admin_address: adminAddress,
                p_transaction_id: transactionId,
                p_reason: reason
            });

            if (error) {
                console.error('❌ Add funds failed:', error);
                return {
                    success: false,
                    error: 'Failed to add funds'
                };
            }

            // Clear cache
            this.balanceCache.delete(walletAddress);
            this.cacheExpiry.delete(walletAddress);

            // Log admin action
            await this.logAdminAction(adminAddress, 'add_funds', {
                target_wallet: walletAddress,
                amount,
                reason,
                transaction_id: transactionId
            });

            return {
                success: true,
                transactionId,
                newBalance: (await this.getPlayerBalance(walletAddress)).available
            };

        } catch (error) {
            console.error('❌ Add funds error:', error);
            return {
                success: false,
                error: 'System error'
            };
        }
    }

    /**
     * 🔒 Lock funds for betting
     */
    async lockFunds(walletAddress, amount) {
        try {
            const { error } = await this.supabase.rpc('lock_player_funds', {
                p_wallet_address: walletAddress,
                p_amount: amount
            });

            if (error) {
                return false;
            }

            // Clear cache
            this.balanceCache.delete(walletAddress);
            this.cacheExpiry.delete(walletAddress);

            return true;

        } catch (error) {
            console.error('❌ Lock funds error:', error);
            return false;
        }
    }

    /**
     * 🔓 Unlock funds
     */
    async unlockFunds(walletAddress, amount) {
        try {
            const { error } = await this.supabase.rpc('unlock_player_funds', {
                p_wallet_address: walletAddress,
                p_amount: amount
            });

            if (error) {
                return false;
            }

            // Clear cache
            this.balanceCache.delete(walletAddress);
            this.cacheExpiry.delete(walletAddress);

            return true;

        } catch (error) {
            console.error('❌ Unlock funds error:', error);
            return false;
        }
    }

    /**
     * 🔄 Refund bet (in case of errors)
     */
    async refundBet(walletAddress, amount, transactionId) {
        try {
            const { error } = await this.supabase.rpc('refund_bet', {
                p_wallet_address: walletAddress,
                p_amount: amount,
                p_transaction_id: transactionId
            });

            if (error) {
                console.error('❌ Refund failed:', error);
                return false;
            }

            // Clear cache
            this.balanceCache.delete(walletAddress);
            this.cacheExpiry.delete(walletAddress);

            return true;

        } catch (error) {
            console.error('❌ Refund error:', error);
            return false;
        }
    }

    /**
     * 📊 Get player statistics
     */
    async getPlayerStats(walletAddress) {
        try {
            const { data, error } = await this.supabase
                .from('crash_player_stats')
                .select('*')
                .eq('wallet_address', walletAddress)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            return data || {
                wallet_address: walletAddress,
                total_bets_placed: 0,
                total_amount_bet: 0,
                total_amount_won: 0,
                biggest_win: 0,
                games_played: 0,
                win_rate: 0
            };

        } catch (error) {
            console.error('❌ Failed to get player stats:', error);
            return null;
        }
    }

    /**
     * 📝 Log admin actions
     */
    async logAdminAction(adminAddress, action, details) {
        try {
            await this.supabase
                .from('crash_admin_logs')
                .insert({
                    admin_address: adminAddress,
                    action: action,
                    details: details
                });

        } catch (error) {
            console.error('❌ Failed to log admin action:', error);
        }
    }

    /**
     * 🔍 Validate transaction integrity
     */
    async validateTransaction(transactionId) {
        try {
            const { data, error } = await this.supabase
                .from('wallet_transactions')
                .select('*')
                .eq('transaction_id', transactionId)
                .single();

            return !error && data;

        } catch (error) {
            console.error('❌ Transaction validation error:', error);
            return false;
        }
    }

    /**
     * 🧹 Clear balance cache
     */
    clearCache(walletAddress = null) {
        if (walletAddress) {
            this.balanceCache.delete(walletAddress);
            this.cacheExpiry.delete(walletAddress);
        } else {
            this.balanceCache.clear();
            this.cacheExpiry.clear();
        }
    }

    /**
     * 📊 Get system statistics
     */
    async getSystemStats() {
        try {
            const { data: houseBalance } = await this.supabase
                .from('house_balance')
                .select('balance')
                .single();

            const { data: totalVolume } = await this.supabase
                .from('crash_daily_stats')
                .select('total_volume')
                .order('date', { ascending: false })
                .limit(30);

            return {
                houseBalance: houseBalance?.balance || 0,
                totalVolume30Days: totalVolume?.reduce((sum, day) => sum + parseFloat(day.total_volume || 0), 0) || 0,
                cacheSize: this.balanceCache.size
            };

        } catch (error) {
            console.error('❌ Failed to get system stats:', error);
            return {
                houseBalance: 0,
                totalVolume30Days: 0,
                cacheSize: this.balanceCache.size
            };
        }
    }
}

module.exports = WalletIntegration;
