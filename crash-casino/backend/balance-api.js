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
    async placeBetWithBalance(playerAddress, amount) {
        const address = playerAddress.toLowerCase();
        const currentBalance = await this.getBalance(address);

        if (currentBalance < amount) {
            throw new Error('Insufficient balance');
        }

        // Deduct from balance
        const newBalance = currentBalance - amount;
        
        // Update database
        const { error } = await this.supabase
            .from('user_balances')
            .upsert({
                address: address,
                balance: newBalance,
                updated_at: new Date().toISOString()
            });

        if (error) throw error;

        // Update cache
        this.balanceCache.set(address, newBalance);

        // Log the bet
        await this.supabase
            .from('balance_bets')
            .insert({
                address: address,
                amount: amount,
                balance_before: currentBalance,
                balance_after: newBalance,
                created_at: new Date().toISOString()
            });

        console.log(`💰 Balance bet: ${address} bet ${amount} ETH (balance: ${currentBalance} → ${newBalance})`);
        return { success: true, newBalance };
    }

    /**
     * 🎉 Add winnings to balance
     */
    async addWinnings(playerAddress, amount) {
        const address = playerAddress.toLowerCase();
        const currentBalance = await this.getBalance(address);
        const newBalance = currentBalance + amount;

        // Update database
        const { error } = await this.supabase
            .from('user_balances')
            .upsert({
                address: address,
                balance: newBalance,
                updated_at: new Date().toISOString()
            });

        if (error) throw error;

        // Update cache
        this.balanceCache.set(address, newBalance);

        console.log(`🎉 Winnings added: ${address} won ${amount} ETH (balance: ${currentBalance} → ${newBalance})`);
        return { success: true, newBalance };
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
            // Send ETH using wallet integration
            const result = await walletIntegration.processCashOut(
                address, 
                Date.now(), // roundId
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
