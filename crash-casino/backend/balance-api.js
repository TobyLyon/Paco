/**
 * 💰 Balance-Based Betting API
 * 
 * Backend endpoints for deposit/withdraw/balance system
 */

const { createClient } = require('@supabase/supabase-js');

class BalanceAPI {
    constructor(supabaseUrl, supabaseKey) {
        this.supabase = createClient(supabaseUrl, supabaseKey);
        
        // In-memory balance cache for fast access
        this.balanceCache = new Map();
    }

    /**
     * 📊 Get user balance
     */
    async getBalance(playerAddress) {
        const address = playerAddress.toLowerCase();
        
        // Check cache first
        if (this.balanceCache.has(address)) {
            return this.balanceCache.get(address);
        }

        // Query database
        const { data, error } = await this.supabase
            .from('user_balances')
            .select('balance')
            .eq('address', address)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = not found
            throw error;
        }

        const balance = data?.balance || 0;
        this.balanceCache.set(address, balance);
        return balance;
    }

    /**
     * 💸 Place bet using balance
     */
    async placeBetWithBalance(playerAddress, amount, houseWallet = null) {
        const address = playerAddress.toLowerCase();

        try {
            // Use atomic database function to prevent race conditions
            const { data, error } = await this.supabase.rpc('place_bet_atomic', {
                player_address: address,
                bet_amount: amount
            });

            if (error) {
                console.error('❌ Atomic bet placement failed:', error);
                throw new Error(`Database error: ${error.message}`);
            }

            if (!data.success) {
                throw new Error(data.error || 'Bet placement failed');
            }

            // 🏠 CRITICAL: Transfer bet amount from hot wallet to house wallet
            if (houseWallet) {
                try {
                    const transferResult = await this.transferBetToHouse(amount, houseWallet);
                    console.log(`🏠 Balance bet amount transferred to house wallet: ${amount} ETH (TX: ${transferResult.txHash})`);
                } catch (transferError) {
                    console.error(`❌ Failed to transfer bet to house wallet:`, transferError);
                    // Note: We should implement rollback logic here in production
                    throw new Error(`Bet transfer to house wallet failed: ${transferError.message}`);
                }
            } else {
                console.warn(`⚠️ NO HOUSE WALLET PROVIDED - Bet amount not transferred to house (FINANCIAL RISK)`);
            }

            // Update cache with new balance
            this.balanceCache.set(address, data.balance_after);

            console.log(`💰 ATOMIC Balance bet: ${address} bet ${amount} ETH (${data.balance_before.toFixed(6)} → ${data.balance_after.toFixed(6)})`);
            return data.balance_after;

        } catch (error) {
            console.error('❌ placeBetWithBalance failed:', error);
            throw error;
        }
    }

    /**
     * 🏠 Transfer bet amount from hot wallet to house wallet
     */
    async transferBetToHouse(amount, houseWallet) {
        const { ethers } = require('ethers');
        const { createWalletClient, http, parseEther } = require('viem');
        const { privateKeyToAccount } = require('viem/accounts');
        
        // Abstract chain config
        const ABSTRACT_CHAIN = {
            id: 2741,
            name: 'Abstract',
            rpcUrls: { 
                default: { http: ['https://api.mainnet.abs.xyz'] } 
            }
        };

        const hotWalletKey = process.env.HOT_WALLET_PRIVATE_KEY;
        if (!hotWalletKey) {
            throw new Error('HOT_WALLET_PRIVATE_KEY environment variable not configured');
        }

        const houseWalletAddress = process.env.HOUSE_WALLET_ADDRESS || '0x1f8B1c4D05eF17Ebaa1E572426110146691e6C5a';

        // Initialize hot wallet client
        const hotAccount = privateKeyToAccount(hotWalletKey);
        const walletClient = createWalletClient({
            account: hotAccount,
            chain: ABSTRACT_CHAIN,
            transport: http(ABSTRACT_CHAIN.rpcUrls.default.http[0]),
        });

        const amountWei = parseEther(amount.toString());

        // Check hot wallet balance
        const hotBalance = await walletClient.getBalance({ address: hotAccount.address });
        if (hotBalance < amountWei) {
            throw new Error(`Insufficient hot wallet balance for bet transfer. Need: ${amount} ETH, Have: ${(Number(hotBalance) / 1e18).toFixed(6)} ETH`);
        }

        console.log(`🏠 Transferring bet amount: ${amount} ETH from hot wallet (${hotAccount.address}) to house wallet (${houseWalletAddress})`);

        // Send transaction
        const txHash = await walletClient.sendTransaction({
            to: houseWalletAddress,
            value: amountWei,
        });

        console.log(`✅ Bet transfer to house wallet successful: ${txHash}`);

        return {
            success: true,
            txHash: txHash,
            amount: amount,
            from: hotAccount.address,
            to: houseWalletAddress
        };
    }

    /**
     * 🏦 Process balance payout - transfer ETH from house to hot wallet
     */
    async processBalancePayout(playerAddress, payoutAmount) {
        const { createWalletClient, http, parseEther } = require('viem');
        const { privateKeyToAccount } = require('viem/accounts');
        
        // Abstract chain config
        const ABSTRACT_CHAIN = {
            id: 2741,
            name: 'Abstract',
            rpcUrls: { 
                default: { http: ['https://api.mainnet.abs.xyz'] } 
            }
        };

        const houseWalletKey = process.env.HOUSE_WALLET_PRIVATE_KEY;
        const hotWalletAddress = process.env.HOT_WALLET_ADDRESS;
        
        if (!houseWalletKey) {
            throw new Error('HOUSE_WALLET_PRIVATE_KEY environment variable not configured');
        }
        
        if (!hotWalletAddress) {
            throw new Error('HOT_WALLET_ADDRESS environment variable not configured');
        }

        // Initialize house wallet client for sending payouts
        // Ensure private key has 0x prefix for viem compatibility
        const formattedPrivateKey = houseWalletKey.startsWith('0x') ? houseWalletKey : `0x${houseWalletKey}`;
        const houseAccount = privateKeyToAccount(formattedPrivateKey);
        const walletClient = createWalletClient({
            account: houseAccount,
            chain: ABSTRACT_CHAIN,
            transport: http(ABSTRACT_CHAIN.rpcUrls.default.http[0]),
        });

        const payoutWei = parseEther(payoutAmount.toString());

        // Check house wallet balance
        const houseBalance = await walletClient.getBalance({ address: houseAccount.address });
        if (houseBalance < payoutWei) {
            throw new Error(`Insufficient house wallet balance for payout. Need: ${payoutAmount} ETH, Have: ${(Number(houseBalance) / 1e18).toFixed(6)} ETH`);
        }

        console.log(`🏦 Processing payout: ${payoutAmount} ETH from house wallet (${houseAccount.address}) to hot wallet (${hotWalletAddress})`);

        // Send transaction from house wallet to hot wallet
        const txHash = await walletClient.sendTransaction({
            to: hotWalletAddress,
            value: payoutWei,
        });

        console.log(`✅ Payout transfer successful: ${txHash}`);

        return {
            success: true,
            txHash: txHash,
            amount: payoutAmount,
            from: houseAccount.address,
            to: hotWalletAddress
        };
    }

    /**
     * 🎉 Add winnings to balance - ATOMIC VERSION
     */
    async addWinnings(playerAddress, amount) {
        const address = playerAddress.toLowerCase();

        try {
            // Use atomic database function to prevent race conditions
            const { data, error } = await this.supabase.rpc('add_winnings_atomic', {
                player_address: address,
                winnings_amount: amount
            });

            if (error) {
                console.error('❌ Atomic winnings addition failed:', error);
                throw new Error(`Database error: ${error.message}`);
            }

            if (!data.success) {
                throw new Error(data.error || 'Winnings addition failed');
            }

            // Update cache with new balance
            this.balanceCache.set(address, data.balance_after);

            console.log(`🎉 ATOMIC Winnings added: ${address} won ${amount} ETH (${data.balance_before.toFixed(6)} → ${data.balance_after.toFixed(6)})`);
            return { success: true, newBalance: data.balance_after };

        } catch (error) {
            console.error('❌ addWinnings failed:', error);
            throw error;
        }
    }

    /**
     * 🏦 Process deposit attribution
     */
    async processDeposit(txHash, fromAddress, amount, memo) {
        const address = fromAddress.toLowerCase();
        
        // Check if deposit already processed
        const { data: existingDeposit } = await this.supabase
            .from('balance_deposits')
            .select('id')
            .eq('tx_hash', txHash)
            .single();

        if (existingDeposit) {
            console.log(`⚠️ Deposit ${txHash} already processed`);
            return { success: false, reason: 'already_processed' };
        }

        // Add to balance
        const currentBalance = await this.getBalance(address);
        const newBalance = currentBalance + amount;

        // Update balance
        await this.supabase
            .from('user_balances')
            .upsert({
                address: address,
                balance: newBalance,
                updated_at: new Date().toISOString()
            });

        // Record deposit in balance_deposits table
        await this.supabase
            .from('balance_deposits')
            .insert({
                tx_hash: txHash,
                from_address: address,
                amount: amount,
                memo: memo,
                balance_before: currentBalance,
                balance_after: newBalance,
                status: 'confirmed',
                created_at: new Date().toISOString()
            });

        // Update cache
        this.balanceCache.set(address, newBalance);

        console.log(`🏦 Deposit processed: ${address} deposited ${amount} ETH (balance: ${currentBalance} → ${newBalance})`);
        return { success: true, newBalance };
    }

    /**
     * 💸 Process withdrawal
     */
    async processWithdrawal(playerAddress, amount, walletIntegration) {
        const address = playerAddress.toLowerCase();
        const currentBalance = await this.getBalance(address);

        if (currentBalance < amount) {
            throw new Error('Insufficient balance');
        }

        // Deduct from balance first
        const newBalance = currentBalance - amount;
        
        await this.supabase
            .from('user_balances')
            .upsert({
                address: address,
                balance: newBalance,
                updated_at: new Date().toISOString()
            });

        // Update cache
        this.balanceCache.set(address, newBalance);

        try {
            // Send ETH using hot wallet for withdrawals
            console.log(`💸 Processing withdrawal: ${amount} ETH to ${address} via hot wallet`);
            const result = await walletIntegration.processCashOut(
                address, 
                `withdrawal_${Date.now()}`, // roundId
                1.0, // multiplier (1x for withdrawal)
                amount // betAmount
            );

            if (result.success) {
                // Record successful withdrawal
                await this.supabase
                    .from('balance_withdrawals')
                    .insert({
                        address: address,
                        amount: amount,
                        tx_hash: result.txHash,
                        balance_before: currentBalance,
                        balance_after: newBalance,
                        status: 'completed',
                        created_at: new Date().toISOString()
                    });

                console.log(`💸 Withdrawal completed: ${address} withdrew ${amount} ETH (tx: ${result.txHash})`);
                return result;
            } else {
                // Revert balance on failure
                await this.supabase
                    .from('user_balances')
                    .upsert({
                        address: address,
                        balance: currentBalance,
                        updated_at: new Date().toISOString()
                    });

                this.balanceCache.set(address, currentBalance);
                throw new Error('Withdrawal transaction failed');
            }
        } catch (error) {
            // Revert balance on error
            await this.supabase
                .from('user_balances')
                .upsert({
                    address: address,
                    balance: currentBalance,
                    updated_at: new Date().toISOString()
                });

            this.balanceCache.set(address, currentBalance);
            throw error;
        }
    }

    /**
     * 🔍 Check for new deposits for a user
     */
    async checkNewDeposits(playerAddress) {
        const address = playerAddress.toLowerCase();
        
        // Get deposits from last 5 minutes
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        
        const { data, error } = await this.supabase
            .from('balance_deposits')
            .select('amount, tx_hash, created_at')
            .eq('from_address', address)
            .gte('created_at', fiveMinutesAgo)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return data || [];
    }
}

module.exports = { BalanceAPI };
