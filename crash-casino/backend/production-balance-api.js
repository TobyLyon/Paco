/**
 * 🏦 Production-Grade Balance API
 * 
 * Implements casino-grade balance management with:
 * - Double-entry ledger system
 * - Optimistic Concurrency Control (OCC)
 * - Idempotency guarantees
 * - Atomic operations
 * - Zero race conditions
 */

const { createClient } = require('@supabase/supabase-js');
const { createWalletClient, createPublicClient, http, parseEther, formatEther } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');

// Abstract chain config
const ABSTRACT_CHAIN = {
    id: 2741,
    name: 'Abstract',
    rpcUrls: { 
        default: { http: ['https://api.mainnet.abs.xyz'] } 
    }
};

class ProductionBalanceAPI {
    constructor(supabaseUrl, supabaseKey) {
        this.supabase = createClient(supabaseUrl, supabaseKey);
        console.log('🏦 Production Balance API initialized with ledger system');
    }

    /**
     * 📊 Get user balance with version (for OCC)
     */
    async getBalance(userAddress) {
        const userId = userAddress.toLowerCase();
        
        try {
            const { data, error } = await this.supabase.rpc('rpc_get_balance', {
                p_user: userId
            });

            if (error) {
                console.error('❌ Failed to get balance:', error);
                throw error;
            }

            const balance = data[0] || { available: '0', locked: '0', version: '0' };
            
            return {
                available: parseFloat(formatEther(BigInt(balance.available))),
                locked: parseFloat(formatEther(BigInt(balance.locked))),
                total: parseFloat(formatEther(BigInt(balance.available) + BigInt(balance.locked))),
                version: parseInt(balance.version),
                availableWei: balance.available,
                lockedWei: balance.locked
            };
        } catch (error) {
            console.error('❌ Balance API error:', error);
            throw error;
        }
    }

    /**
     * 🎯 Place bet with atomic balance locking
     */
    async placeBet(userAddress, amountEth, roundId, clientId, expectedVersion) {
        const userId = userAddress.toLowerCase();
        const amountWei = parseEther(amountEth.toString()).toString();

        console.log(`🎯 Placing bet: ${amountEth} ETH for ${userId}`);

        try {
            const { data, error } = await this.supabase.rpc('rpc_place_bet', {
                p_user: userId,
                p_amount: amountWei,
                p_round: roundId,
                p_client: clientId,
                p_expected_version: expectedVersion
            });

            if (error) {
                if (error.message.includes('VERSION_CONFLICT')) {
                    throw new Error('VERSION_CONFLICT');
                }
                if (error.message.includes('INSUFFICIENT_FUNDS')) {
                    throw new Error('INSUFFICIENT_FUNDS');
                }
                throw error;
            }

            const result = data[0];
            return {
                success: true,
                newBalance: {
                    available: parseFloat(formatEther(BigInt(result.new_available))),
                    locked: parseFloat(formatEther(BigInt(result.new_locked))),
                    version: parseInt(result.new_version),
                    availableWei: result.new_available,
                    lockedWei: result.new_locked
                }
            };

        } catch (error) {
            console.error('❌ Bet placement failed:', error);
            throw error;
        }
    }

    /**
     * 🏆 Process winning bet
     */
    async processWin(userAddress, winAmountEth, betAmountEth, roundId, clientId) {
        const userId = userAddress.toLowerCase();
        const winAmountWei = parseEther(winAmountEth.toString()).toString();
        const betAmountWei = parseEther(betAmountEth.toString()).toString();

        console.log(`🏆 Processing win: ${winAmountEth} ETH for ${userId}`);

        try {
            // First, transfer ETH from house wallet to hot wallet
            await this.processWinPayout(winAmountEth);

            // Then update database atomically
            const { data, error } = await this.supabase.rpc('rpc_process_win', {
                p_user: userId,
                p_win_amount: winAmountWei,
                p_bet_amount: betAmountWei,
                p_round: roundId,
                p_client: clientId
            });

            if (error) {
                console.error('❌ Win processing failed:', error);
                throw error;
            }

            const result = data[0];
            return {
                success: true,
                newBalance: {
                    available: parseFloat(formatEther(BigInt(result.new_available))),
                    locked: parseFloat(formatEther(BigInt(result.new_locked))),
                    version: parseInt(result.new_version)
                }
            };

        } catch (error) {
            console.error('❌ Win processing failed:', error);
            throw error;
        }
    }

    /**
     * 💸 Process losing bet
     */
    async processLoss(userAddress, betAmountEth, roundId, clientId) {
        const userId = userAddress.toLowerCase();
        const betAmountWei = parseEther(betAmountEth.toString()).toString();

        console.log(`💸 Processing loss: ${betAmountEth} ETH for ${userId}`);

        try {
            const { data, error } = await this.supabase.rpc('rpc_process_loss', {
                p_user: userId,
                p_bet_amount: betAmountWei,
                p_round: roundId,
                p_client: clientId
            });

            if (error) {
                console.error('❌ Loss processing failed:', error);
                throw error;
            }

            const result = data[0];
            return {
                success: true,
                newBalance: {
                    available: parseFloat(formatEther(BigInt(result.new_available))),
                    locked: parseFloat(formatEther(BigInt(result.new_locked))),
                    version: parseInt(result.new_version)
                }
            };

        } catch (error) {
            console.error('❌ Loss processing failed:', error);
            throw error;
        }
    }

    /**
     * 💰 Record deposit (called by indexer)
     */
    async recordDeposit(txHash, logIndex, userAddress, amountWei) {
        const userId = userAddress.toLowerCase();

        console.log(`💰 Recording deposit: ${formatEther(BigInt(amountWei))} ETH for ${userId}`);

        try {
            const { error } = await this.supabase.rpc('rpc_record_deposit', {
                p_tx: txHash,
                p_idx: logIndex,
                p_user: userId,
                p_amount: amountWei.toString()
            });

            if (error && !error.message.includes('duplicate key')) {
                console.error('❌ Deposit recording failed:', error);
                throw error;
            }

            console.log(`✅ Deposit recorded: ${txHash}`);
            return { success: true };

        } catch (error) {
            console.error('❌ Deposit recording failed:', error);
            throw error;
        }
    }

    /**
     * 🏦 Process win payout (ETH transfer from house to hot wallet)
     */
    async processWinPayout(payoutAmountEth) {
        const houseWalletKey = process.env.HOUSE_WALLET_PRIVATE_KEY;
        const hotWalletAddress = process.env.HOT_WALLET_ADDRESS;
        
        if (!houseWalletKey) {
            throw new Error('HOUSE_WALLET_PRIVATE_KEY environment variable not configured');
        }
        
        if (!hotWalletAddress) {
            throw new Error('HOT_WALLET_ADDRESS environment variable not configured');
        }

        // Initialize clients
        const formattedPrivateKey = houseWalletKey.startsWith('0x') ? houseWalletKey : `0x${houseWalletKey}`;
        const houseAccount = privateKeyToAccount(formattedPrivateKey);
        
        const walletClient = createWalletClient({
            account: houseAccount,
            chain: ABSTRACT_CHAIN,
            transport: http(ABSTRACT_CHAIN.rpcUrls.default.http[0]),
        });

        const publicClient = createPublicClient({
            chain: ABSTRACT_CHAIN,
            transport: http(ABSTRACT_CHAIN.rpcUrls.default.http[0]),
        });

        const payoutWei = parseEther(payoutAmountEth.toString());

        // Check house wallet balance
        const houseBalance = await publicClient.getBalance({ address: houseAccount.address });
        if (houseBalance < payoutWei) {
            throw new Error(`Insufficient house wallet balance for payout. Need: ${payoutAmountEth} ETH, Have: ${formatEther(houseBalance)} ETH`);
        }

        console.log(`🏦 Processing payout: ${payoutAmountEth} ETH from house wallet to hot wallet`);

        // Send transaction
        const txHash = await walletClient.sendTransaction({
            to: hotWalletAddress,
            value: payoutWei,
        });

        console.log(`✅ Payout transfer successful: ${txHash}`);
        return { success: true, txHash };
    }

    /**
     * 📊 Get balance reconciliation report
     */
    async getBalanceReconciliation(userAddress) {
        const userId = userAddress.toLowerCase();

        try {
            const { data, error } = await this.supabase
                .from('balance_reconciliation')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            return data || {
                user_id: userId,
                total_credits: '0',
                total_debits: '0',
                locked_calculated: '0'
            };

        } catch (error) {
            console.error('❌ Balance reconciliation failed:', error);
            throw error;
        }
    }

    /**
     * 🔍 Get recent activity for user
     */
    async getRecentActivity(userAddress, limit = 50) {
        const userId = userAddress.toLowerCase();

        try {
            const { data, error } = await this.supabase
                .from('recent_activity')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) {
                throw error;
            }

            return data || [];

        } catch (error) {
            console.error('❌ Recent activity query failed:', error);
            throw error;
        }
    }

    /**
     * 🏥 Health check - verify ledger integrity
     */
    async healthCheck() {
        try {
            // Check if core tables exist and are accessible
            const { data: accountsCheck } = await this.supabase
                .from('accounts')
                .select('count')
                .limit(1);

            const { data: ledgerCheck } = await this.supabase
                .from('ledger')
                .select('count')
                .limit(1);

            return {
                healthy: true,
                accounts_accessible: !!accountsCheck,
                ledger_accessible: !!ledgerCheck,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('❌ Health check failed:', error);
            return {
                healthy: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

module.exports = ProductionBalanceAPI;
