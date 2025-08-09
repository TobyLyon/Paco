/**
 * 🏦 House Wallet Management for PacoRocko
 * 
 * Manages the casino's bank wallet on Abstract L2
 */

const { ethers } = require('ethers');
const { config, validateConfig } = require('./config/abstract-config');

class HouseWallet {
    constructor() {
        this.provider = null;
        this.wallet = null;
        this.balance = 0;
        this.isInitialized = false;
        
        // Track pending transactions
        this.pendingTxs = new Map();
        
        // Initialize on creation
        this.init().catch(console.error);
    }
    
    /**
     * 🚀 Initialize house wallet
     */
    async init() {
        try {
            console.log('🏦 Initializing house wallet...');
            
            // Validate configuration
            validateConfig();
            
            if (!config.houseWallet.privateKey) {
                console.error('❌ House wallet private key not configured!');
                console.log('📝 Set HOUSE_WALLET_PRIVATE_KEY in your .env file');
                return false;
            }
            
            // Connect to Abstract network
            this.provider = new ethers.JsonRpcProvider(
                config.currentNetwork.rpcUrl
            );
            
            // Create wallet instance
            this.wallet = new ethers.Wallet(
                config.houseWallet.privateKey,
                this.provider
            );
            
            // Verify wallet address matches config
            if (config.houseWallet.address && 
                this.wallet.address.toLowerCase() !== config.houseWallet.address.toLowerCase()) {
                console.warn('⚠️  Wallet address mismatch!');
                console.log(`   Config: ${config.houseWallet.address}`);
                console.log(`   Actual: ${this.wallet.address}`);
            }
            
            // Update balance
            await this.updateBalance();
            
            // Set up balance monitoring
            this.startBalanceMonitoring();
            
            this.isInitialized = true;
            
            console.log('✅ House wallet initialized');
            console.log(`   Address: ${this.wallet.address}`);
            console.log(`   Network: ${config.currentNetwork.name}`);
            console.log(`   Balance: ${ethers.formatEther(this.balance)} ETH`);
            
            return true;
            
        } catch (error) {
            console.error('❌ Failed to initialize house wallet:', error);
            return false;
        }
    }
    
    /**
     * 💰 Update wallet balance
     */
    async updateBalance() {
        try {
            const balance = await this.provider.getBalance(this.wallet.address);
            this.balance = balance;
            return balance;
        } catch (error) {
            console.error('❌ Failed to update balance:', error);
            return this.balance;
        }
    }
    
    /**
     * 📊 Start balance monitoring
     */
    startBalanceMonitoring() {
        // Check balance every 30 seconds
        setInterval(async () => {
            await this.updateBalance();
            
            // Check if we need to withdraw to cold storage
            const balanceInEth = parseFloat(ethers.formatEther(this.balance));
            if (balanceInEth > config.game.autoWithdrawThreshold) {
                console.warn(`⚠️  House wallet balance (${balanceInEth} ETH) exceeds threshold`);
                // In production, trigger cold wallet transfer here
            }
        }, 30000);
    }
    
    /**
     * 💸 Process payout to player
     */
    async processPayout(playerAddress, amount, roundId) {
        if (!this.isInitialized) {
            throw new Error('House wallet not initialized');
        }
        
        try {
            console.log(`💸 Processing payout: ${ethers.formatEther(amount)} ETH to ${playerAddress}`);
            
            // Check balance
            if (this.balance < amount) {
                throw new Error('Insufficient house balance');
            }
            
            // Create transaction
            const tx = {
                to: playerAddress,
                value: amount,
                data: ethers.hexlify(ethers.toUtf8Bytes(`PacoRocko payout: ${roundId}`))
            };
            
            // Estimate gas
            const gasLimit = await this.wallet.estimateGas(tx);
            tx.gasLimit = gasLimit * 120n / 100n; // Add 20% buffer
            
            // Send transaction
            const txResponse = await this.wallet.sendTransaction(tx);
            
            // Track pending transaction
            this.pendingTxs.set(txResponse.hash, {
                type: 'payout',
                playerAddress,
                amount,
                roundId,
                timestamp: Date.now()
            });
            
            console.log(`📤 Payout transaction sent: ${txResponse.hash}`);
            
            // Wait for confirmation
            const receipt = await txResponse.wait(config.security.minConfirmations);
            
            // Remove from pending
            this.pendingTxs.delete(txResponse.hash);
            
            // Update balance
            await this.updateBalance();
            
            console.log(`✅ Payout confirmed: ${receipt.hash}`);
            
            return receipt;
            
        } catch (error) {
            console.error('❌ Payout failed:', error);
            throw error;
        }
    }
    
    /**
     * 📥 Handle incoming bet (validate payment)
     */
    async validateBetPayment(txHash, expectedAmount, playerAddress) {
        try {
            console.log(`🔍 Validating bet payment: ${txHash}`);
            
            // Get transaction receipt
            const receipt = await this.provider.getTransactionReceipt(txHash);
            
            if (!receipt) {
                return { valid: false, error: 'Transaction not found' };
            }
            
            // Check if transaction is to house wallet
            if (receipt.to.toLowerCase() !== this.wallet.address.toLowerCase()) {
                return { valid: false, error: 'Transaction not to house wallet' };
            }
            
            // Get transaction details
            const tx = await this.provider.getTransaction(txHash);
            
            // Validate sender
            if (tx.from.toLowerCase() !== playerAddress.toLowerCase()) {
                return { valid: false, error: 'Transaction from wrong address' };
            }
            
            // Validate amount
            if (tx.value < expectedAmount) {
                return { valid: false, error: 'Insufficient payment amount' };
            }
            
            // Check confirmations
            const currentBlock = await this.provider.getBlockNumber();
            const confirmations = currentBlock - receipt.blockNumber;
            
            if (confirmations < config.security.minConfirmations) {
                return { valid: false, error: 'Insufficient confirmations' };
            }
            
            console.log(`✅ Bet payment validated: ${ethers.formatEther(tx.value)} ETH`);
            
            return {
                valid: true,
                amount: tx.value,
                confirmations,
                blockNumber: receipt.blockNumber
            };
            
        } catch (error) {
            console.error('❌ Payment validation error:', error);
            return { valid: false, error: error.message };
        }
    }
    
    /**
     * 📊 Get wallet statistics
     */
    async getStats() {
        await this.updateBalance();
        
        return {
            address: this.wallet.address,
            balance: ethers.formatEther(this.balance),
            balanceWei: this.balance.toString(),
            network: config.currentNetwork.name,
            chainId: config.currentNetwork.chainId,
            pendingTxCount: this.pendingTxs.size,
            isInitialized: this.isInitialized
        };
    }
    
    /**
     * 🔐 Sign message (for verification)
     */
    async signMessage(message) {
        if (!this.isInitialized) {
            throw new Error('House wallet not initialized');
        }
        
        return await this.wallet.signMessage(message);
    }
    
    /**
     * 🛡️ Verify player signature
     */
    async verifyPlayerSignature(message, signature, expectedAddress) {
        try {
            const recoveredAddress = ethers.verifyMessage(message, signature);
            return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
        } catch (error) {
            console.error('❌ Signature verification failed:', error);
            return false;
        }
    }
}

// Singleton instance
let houseWalletInstance = null;

function getHouseWallet() {
    if (!houseWalletInstance) {
        houseWalletInstance = new HouseWallet();
    }
    return houseWalletInstance;
}

module.exports = {
    HouseWallet,
    getHouseWallet
};
