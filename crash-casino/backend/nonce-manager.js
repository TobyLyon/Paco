/**
 * 🔐 Nonce Manager with Replacement Logic
 * 
 * Single-threaded, serialized transaction sending with automatic:
 * - Nonce tracking and recovery
 * - Fee bumping for replacements
 * - Transaction monitoring and receipts
 * - Proper error handling for production
 */

const { createWalletClient, createPublicClient, http, parseEther, formatEther } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');

class NonceManager {
    constructor(config = {}) {
        this.config = {
            chainId: config.chainId || 2741, // Abstract
            rpcUrl: config.rpcUrl || process.env.RPC_PRIMARY,
            privateKey: config.privateKey || process.env.HOUSE_WALLET_PRIVATE_KEY,
            maxRetries: config.maxRetries || 3,
            feeMultiplier: config.feeMultiplier || 1.2, // 20% bump for replacements
            receiptTimeout: config.receiptTimeout || 300000, // 5 minutes
            ...config
        };

        // Initialize account and clients
        this.account = privateKeyToAccount(
            this.config.privateKey.startsWith('0x') 
                ? this.config.privateKey 
                : `0x${this.config.privateKey}`
        );

        this.chain = {
            id: this.config.chainId,
            name: 'Abstract',
            rpcUrls: { 
                default: { http: [this.config.rpcUrl] } 
            }
        };

        this.walletClient = createWalletClient({
            account: this.account,
            chain: this.chain,
            transport: http(this.config.rpcUrl)
        });

        this.publicClient = createPublicClient({
            chain: this.chain,
            transport: http(this.config.rpcUrl)
        });

        // Nonce tracking
        this.localNonce = null;
        this.pendingTransactions = new Map(); // txHash -> transaction info
        this.isInitialized = false;
        this.mutex = false; // Simple mutex for serialization

        console.log(`🔐 Nonce manager initialized for ${this.account.address}`);
    }

    /**
     * 🚀 Initialize nonce from blockchain
     */
    async initialize() {
        if (this.isInitialized) return;

        try {
            const onChainNonce = await this.publicClient.getTransactionCount({
                address: this.account.address,
                blockTag: 'pending'
            });

            this.localNonce = onChainNonce;
            this.isInitialized = true;

            console.log(`🔐 Nonce manager initialized with nonce: ${this.localNonce}`);

        } catch (error) {
            console.error('❌ Failed to initialize nonce manager:', error);
            throw error;
        }
    }

    /**
     * 💸 Send transaction with nonce management and replacement logic
     */
    async sendTransaction(to, value, data = '0x', metadata = {}) {
        // Wait for mutex
        while (this.mutex) {
            await this.sleep(10);
        }

        this.mutex = true;

        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            return await this._sendTransactionInternal(to, value, data, metadata);

        } finally {
            this.mutex = false;
        }
    }

    /**
     * 🔄 Internal transaction sending with retry logic
     */
    async _sendTransactionInternal(to, value, data, metadata) {
        const startTime = Date.now();
        let attempt = 0;
        let lastError = null;

        while (attempt < this.config.maxRetries) {
            attempt++;

            try {
                console.log(`🔐 Sending transaction attempt ${attempt}/${this.config.maxRetries}`);
                console.log(`   To: ${to}`);
                console.log(`   Value: ${formatEther(value)} ETH`);
                console.log(`   Nonce: ${this.localNonce}`);

                // Get gas price with bump if retry
                const gasPrice = await this.getGasPrice(attempt > 1);

                // Prepare transaction
                const transaction = {
                    to,
                    value,
                    data,
                    nonce: this.localNonce,
                    gasPrice,
                    gas: 21000n // Standard ETH transfer, adjust if needed
                };

                // Send transaction
                const txHash = await this.walletClient.sendTransaction(transaction);

                console.log(`✅ Transaction sent: ${txHash} (nonce: ${this.localNonce})`);

                // Track pending transaction
                this.pendingTransactions.set(txHash, {
                    ...transaction,
                    hash: txHash,
                    timestamp: Date.now(),
                    attempt,
                    metadata
                });

                // Increment local nonce
                this.localNonce++;

                // Wait for receipt
                const receipt = await this.waitForReceipt(txHash);

                // Remove from pending
                this.pendingTransactions.delete(txHash);

                console.log(`🎉 Transaction confirmed: ${txHash} (block: ${receipt.blockNumber})`);

                return {
                    success: true,
                    txHash,
                    receipt,
                    attempts: attempt,
                    duration: Date.now() - startTime
                };

            } catch (error) {
                lastError = error;
                console.error(`❌ Transaction attempt ${attempt} failed:`, error.message);

                // Handle specific error types
                if (this.isNonceError(error)) {
                    console.log('🔄 Nonce error detected, refreshing from chain...');
                    await this.refreshNonce();
                } else if (this.isReplacementError(error)) {
                    console.log('🔄 Replacement underpriced, will bump fees...');
                    // Continue with fee bump on next attempt
                } else if (this.isUnrecoverableError(error)) {
                    console.error('💥 Unrecoverable error, aborting:', error);
                    break;
                } else {
                    // Wait before retry for other errors
                    await this.sleep(1000 * attempt);
                }
            }
        }

        // All attempts failed
        console.error(`💥 Transaction failed after ${attempt} attempts:`, lastError);
        
        return {
            success: false,
            error: lastError.message,
            attempts: attempt,
            duration: Date.now() - startTime
        };
    }

    /**
     * ⏳ Wait for transaction receipt with timeout
     */
    async waitForReceipt(txHash, timeout = null) {
        const actualTimeout = timeout || this.config.receiptTimeout;
        const startTime = Date.now();

        while (Date.now() - startTime < actualTimeout) {
            try {
                const receipt = await this.publicClient.getTransactionReceipt({ hash: txHash });
                
                if (receipt) {
                    if (receipt.status === 'success') {
                        return receipt;
                    } else {
                        throw new Error(`Transaction reverted: ${txHash}`);
                    }
                }

            } catch (error) {
                // Transaction not found yet, continue polling
                if (error.message.includes('not found')) {
                    await this.sleep(2000); // Poll every 2 seconds
                    continue;
                }
                throw error;
            }
        }

        throw new Error(`Transaction receipt timeout: ${txHash}`);
    }

    /**
     * ⛽ Get gas price with optional bump
     */
    async getGasPrice(shouldBump = false) {
        try {
            const baseGasPrice = await this.publicClient.getGasPrice();
            
            if (shouldBump) {
                const bumpedPrice = (baseGasPrice * BigInt(Math.floor(this.config.feeMultiplier * 100))) / 100n;
                console.log(`⛽ Bumping gas price: ${formatEther(baseGasPrice, 'gwei')} → ${formatEther(bumpedPrice, 'gwei')} gwei`);
                return bumpedPrice;
            }
            
            return baseGasPrice;

        } catch (error) {
            console.warn('⚠️ Failed to get gas price, using fallback:', error);
            return parseEther('0.000000001'); // 1 gwei fallback
        }
    }

    /**
     * 🔄 Refresh nonce from blockchain
     */
    async refreshNonce() {
        try {
            const onChainNonce = await this.publicClient.getTransactionCount({
                address: this.account.address,
                blockTag: 'pending'
            });

            console.log(`🔄 Nonce refreshed: ${this.localNonce} → ${onChainNonce}`);
            this.localNonce = onChainNonce;

        } catch (error) {
            console.error('❌ Failed to refresh nonce:', error);
        }
    }

    /**
     * 🔍 Error classification
     */
    isNonceError(error) {
        const message = error.message.toLowerCase();
        return message.includes('nonce too low') || 
               message.includes('invalid nonce') ||
               message.includes('nonce has already been used');
    }

    isReplacementError(error) {
        const message = error.message.toLowerCase();
        return message.includes('replacement transaction underpriced') ||
               message.includes('insufficient gas price');
    }

    isUnrecoverableError(error) {
        const message = error.message.toLowerCase();
        return message.includes('insufficient funds') ||
               message.includes('execution reverted') ||
               message.includes('invalid recipient');
    }

    /**
     * 💰 Send ETH with metadata
     */
    async sendETH(to, amountEth, metadata = {}) {
        const value = parseEther(amountEth.toString());
        return this.sendTransaction(to, value, '0x', metadata);
    }

    /**
     * 📊 Get nonce manager status
     */
    getStatus() {
        return {
            address: this.account.address,
            localNonce: this.localNonce,
            isInitialized: this.isInitialized,
            pendingTransactions: this.pendingTransactions.size,
            pending: Array.from(this.pendingTransactions.values()).map(tx => ({
                hash: tx.hash,
                to: tx.to,
                value: formatEther(tx.value),
                nonce: tx.nonce,
                age: Date.now() - tx.timestamp
            }))
        };
    }

    /**
     * 🧹 Clean up old pending transactions
     */
    async cleanupPending() {
        const maxAge = 600000; // 10 minutes
        const now = Date.now();

        for (const [txHash, tx] of this.pendingTransactions.entries()) {
            if (now - tx.timestamp > maxAge) {
                console.log(`🧹 Cleaning up old pending transaction: ${txHash}`);
                this.pendingTransactions.delete(txHash);
            }
        }
    }

    /**
     * 🏥 Health check
     */
    async healthCheck() {
        try {
            const balance = await this.publicClient.getBalance({ 
                address: this.account.address 
            });

            const onChainNonce = await this.publicClient.getTransactionCount({
                address: this.account.address,
                blockTag: 'pending'
            });

            const nonceDrift = this.localNonce ? Math.abs(Number(onChainNonce) - this.localNonce) : 0;

            return {
                healthy: true,
                address: this.account.address,
                balance: formatEther(balance),
                localNonce: this.localNonce,
                onChainNonce: Number(onChainNonce),
                nonceDrift,
                pendingTransactions: this.pendingTransactions.size
            };

        } catch (error) {
            return {
                healthy: false,
                error: error.message
            };
        }
    }

    /**
     * ⏱️ Sleep utility
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = NonceManager;
