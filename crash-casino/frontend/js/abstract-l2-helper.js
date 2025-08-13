/**
 * 🌐 Abstract L2 Transaction Helper (ZK Stack Implementation)
 * 
 * Abstract uses a unique ZK Stack architecture with gas refund mechanism
 * Unlike traditional L1/L2, Abstract has dual-component fees + automatic refunds
 * 
 * CRITICAL: Abstract's fee structure is NOT like traditional EVM chains!
 * - Offchain fee: Fixed ~$0.001 per transaction (ZK proof generation)
 * - Onchain fee: Variable based on Ethereum L1 gas prices
 * - Gas refund mechanism: Overpaid amounts automatically refunded by bootloader
 */

class AbstractL2Helper {
    constructor() {
        this.chainId = 2741; // Abstract mainnet
        this.chainIdHex = '0xab5';
        
        // ABSTRACT ZK STACK SPECIFIC CONFIGURATION
        // Users pay upfront, excess is refunded automatically by bootloader
        this.abstractFeeStructure = {
            // Fixed offchain component (independent of transaction complexity)
            offchainFeeUSD: 0.001, // ~$0.001 for ZK proof generation and L2 state storage
            
            // Variable onchain component (influenced by Ethereum L1 gas prices)
            onchainFeeVariable: true, // Depends on L1 gas price for proof verification
            
            // Gas refund mechanism (unique to Abstract ZK Stack)
            hasGasRefund: true, // Bootloader refunds overpaid amounts
            refundMechanism: 'automatic', // No user action required
            
            // ZK Stack specific parameters
            gasPerPubdataDefault: 50000, // Max gas per byte of pubdata posted to L1
            batchSealingFactor: true // Fees proportional to how close batch is to being sealed
        };
        
        // Abstract transaction format (ZK Stack specific)
        this.transactionFormat = {
            // Standard EVM fields
            usesGasField: true, // Uses 'gas' not 'gasLimit'
            usesLegacyFormat: true, // No EIP-1559
            requiresDataField: true, // Must include 'data' field even if empty
            
            // ZK Stack specific fields
            gasPerPubdataLimit: '0xC350', // 50000 hex - controls L1 data posting cost
            customAccountLogic: true // All accounts are smart contracts on Abstract
        };
        
        // Recommended gas configuration for Abstract ZK Stack
        // Note: Users are refunded for overpayment, so we can be generous with gas
        this.recommendedGas = {
            gasPrice: '0x5F5E100', // 0.1 gwei - Ultra-low for Abstract dual fee structure
            gasLimit: '0x5208', // 21k gas - Minimal for standard transfers (excess refunded)
            gasPerPubdataLimit: '0x4E20' // 20k pubdata - Minimal for simple operations
        };
        
        console.log('🌐 Abstract ZK Stack Helper initialized');
        console.log('💰 Fee structure: Fixed $0.001 offchain + variable onchain + automatic refunds');
        console.log('🔄 Gas refund mechanism: Overpaid amounts automatically refunded by bootloader');
    }

    /**
     * 🔧 Format transaction for Abstract ZK Stack
     * 
     * IMPORTANT: Abstract uses gas refund mechanism - overpayment is automatically refunded!
     * This means we can be generous with gas limits to ensure transaction success.
     */
    formatTransaction(to, value, gasConfig = {}) {
        // Use recommended Abstract ZK Stack configuration
        const transaction = {
            to: to,
            value: this.toHex(value),
            
            // ZK Stack gas configuration (overpayment will be refunded)
            gasPrice: gasConfig.gasPrice || this.recommendedGas.gasPrice,
            gas: gasConfig.gas || gasConfig.gasLimit || this.recommendedGas.gasLimit,
            
            // Required for Abstract ZK Stack
            data: gasConfig.data || '0x', // Must include data field
            
            // ZK Stack specific: controls cost of posting data to L1
            gas_per_pubdata_limit: gasConfig.gas_per_pubdata_limit || this.recommendedGas.gasPerPubdataLimit
        };

        // Remove conflicting EIP-1559 fields (Abstract uses legacy format)
        delete transaction.gasLimit; // Use 'gas' field
        delete transaction.maxFeePerGas; // Not supported
        delete transaction.maxPriorityFeePerGas; // Not supported
        delete transaction.type; // Legacy transaction type

        console.log('🔧 Abstract ZK Stack transaction formatted:', transaction);
        console.log('💰 Gas: price=' + parseInt(transaction.gasPrice, 16) / 1e9 + ' gwei, limit=' + parseInt(transaction.gas, 16));
        console.log('📊 Pubdata limit:', parseInt(transaction.gas_per_pubdata_limit, 16));
        console.log('🔄 Note: Excess gas will be automatically refunded by Abstract bootloader');
        
        return transaction;
    }

    /**
     * 🧮 Convert value to hex format
     */
    toHex(value) {
        if (typeof value === 'string' && value.startsWith('0x')) {
            return value;
        }
        
        if (typeof value === 'number') {
            return '0x' + value.toString(16);
        }
        
        if (typeof value === 'bigint') {
            return '0x' + value.toString(16);
        }
        
        // If it's an ethers BigNumber or similar
        if (value && typeof value.toString === 'function') {
            try {
                const bigIntValue = BigInt(value.toString());
                return '0x' + bigIntValue.toString(16);
            } catch (error) {
                console.error('❌ Failed to convert value to hex:', error);
                return '0x0';
            }
        }
        
        return '0x0';
    }

    /**
     * 💰 Get Abstract ZK Stack gas configuration
     * 
     * IMPORTANT: Abstract has gas refund mechanism - we use generous limits
     * Users are automatically refunded for overpayment by the bootloader
     */
    getAbstractGasConfig(urgency = 'standard') {
        // Abstract ZK Stack recommended configuration
        // Since excess is refunded, we can be generous to ensure success
        const baseConfig = {
            gasPrice: '0x5F5E100', // 0.1 gwei - Proven working gas price
            gas: '0x5208', // 21k gas - Standard ETH transfer minimum (bootloader refunds excess)
            gas_per_pubdata_limit: '0x4E20' // 20k pubdata - Minimal for simple transfers
        };

        // For urgent transactions, we can increase gas price
        // (still reasonable due to refund mechanism)
        if (urgency === 'urgent') {
            baseConfig.gasPrice = '0x3B9ACA00'; // 1 gwei for faster processing (still low)
            baseConfig.gas = '0x7530'; // 30k gas for urgent operations
            baseConfig.gas_per_pubdata_limit = '0x7530'; // 30k pubdata for urgent
        }

        console.log(`💰 Abstract ZK Stack gas config (${urgency}):`, {
            gasPrice: parseInt(baseConfig.gasPrice, 16) / 1e9 + ' gwei',
            gasLimit: parseInt(baseConfig.gas, 16),
            pubdataLimit: parseInt(baseConfig.gas_per_pubdata_limit, 16),
            note: 'Excess gas automatically refunded by Abstract bootloader'
        });
        
        return baseConfig;
    }

    /**
     * 💵 Estimate Abstract transaction cost
     * 
     * Note: Actual cost will be lower due to gas refund mechanism
     */
    estimateAbstractCost(gasConfig) {
        // This is MAXIMUM cost - actual cost will be lower due to refunds
        const gasPriceGwei = parseInt(gasConfig.gasPrice, 16) / 1e9;
        const gasLimit = parseInt(gasConfig.gas, 16);
        const maxGasCostETH = (gasPriceGwei * gasLimit) / 1e9;
        
        // Assume ETH price around $3000
        const ethPriceUSD = 3000;
        const maxOnchainCostUSD = maxGasCostETH * ethPriceUSD;
        
        // Add Abstract's fixed offchain fee
        const maxTotalCostUSD = this.abstractFeeStructure.offchainFeeUSD + maxOnchainCostUSD;
        
        return {
            maxCostUSD: maxTotalCostUSD,
            offchainFeeUSD: this.abstractFeeStructure.offchainFeeUSD,
            maxOnchainCostUSD: maxOnchainCostUSD,
            note: 'Actual cost will be lower due to automatic gas refunds',
            refundMechanism: 'Excess gas automatically refunded by Abstract bootloader'
        };
    }

    /**
     * ✅ Validate Abstract L2 transaction
     */
    validateTransaction(tx) {
        const errors = [];

        // Required fields for Abstract L2
        if (!tx.from || !tx.from.startsWith('0x') || tx.from.length !== 42) {
            errors.push('from address is required for Abstract L2');
        }

        if (!tx.to || !tx.to.startsWith('0x') || tx.to.length !== 42) {
            errors.push('Invalid recipient address');
        }

        if (!tx.value || !tx.value.startsWith('0x')) {
            errors.push('Invalid value format (must be hex)');
        }

        if (!tx.gasPrice || !tx.gasPrice.startsWith('0x')) {
            errors.push('Invalid gasPrice format (must be hex)');
        }

        if (!tx.gas || !tx.gas.startsWith('0x')) {
            errors.push('Invalid gas format (must be hex)');
        }

        // Abstract L2 specific validations
        if (tx.gasLimit) {
            errors.push('Use "gas" instead of "gasLimit" for Abstract L2');
        }

        if (tx.maxFeePerGas || tx.maxPriorityFeePerGas) {
            errors.push('EIP-1559 fields not supported on Abstract L2');
        }

        if (!tx.data) {
            errors.push('Missing required "data" field for Abstract L2');
        }

        if (!tx.gas_per_pubdata_limit) {
            errors.push('gas_per_pubdata_limit is required for Abstract L2');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * 🔄 Send transaction with Abstract L2 retry logic
     */
    async sendTransaction(transaction, maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🚀 Abstract L2 transaction attempt ${attempt}/${maxRetries}`);
                
                // CRITICAL FIX: Create standard Ethereum transaction format first
                let cleanTransaction = {
                    from: transaction.from,
                    to: transaction.to,
                    value: transaction.value,
                    gas: transaction.gas,
                    gasPrice: transaction.gasPrice,
                    data: transaction.data || '0x'
                };
                
                // Only add ZK-specific fields on retry attempts, not first attempt
                if (attempt > 1 && transaction.gas_per_pubdata_limit) {
                    cleanTransaction.gas_per_pubdata_limit = transaction.gas_per_pubdata_limit;
                    console.log(`🔧 Attempt ${attempt}: Adding ZK Stack field gas_per_pubdata_limit`);
                } else {
                    console.log(`🔧 Attempt ${attempt}: Using STANDARD Ethereum transaction format (no ZK fields)`);
                }
                
                // DEBUG: Log the exact transaction object being sent
                console.log('🔍 EXACT TRANSACTION OBJECT BEING SENT TO METAMASK:');
                console.log('📋 Transaction fields:', Object.keys(cleanTransaction));
                console.log('📋 Full transaction object:', JSON.stringify(cleanTransaction, null, 2));
                
                // Use simplified validation for standard format
                if (!cleanTransaction.from || !cleanTransaction.to || !cleanTransaction.value) {
                    throw new Error('Missing required transaction fields: from, to, value');
                }
                console.log('✅ Transaction validation passed');

                // DEBUG: Log MetaMask request details
                console.log('🔗 Sending to MetaMask via eth_sendTransaction...');
                console.log('📤 Request method: eth_sendTransaction');
                console.log('📤 Request params length:', [cleanTransaction].length);
                
                // Send via MetaMask
                const txHash = await window.ethereum.request({
                    method: 'eth_sendTransaction',
                    params: [cleanTransaction]
                });

                console.log('✅ Abstract L2 transaction successful:', txHash);
                return txHash;

            } catch (error) {
                console.error(`❌ Abstract L2 transaction attempt ${attempt} failed:`, error);

                if (attempt === maxRetries) {
                    throw new Error(`Abstract L2 transaction failed after ${maxRetries} attempts: ${error.message}`);
                }

                // Check if this is a user rejection or RPC error that shouldn't be retried
                if (error.code === 4001 || error.message?.includes('User denied') || 
                    error.message?.includes('User rejected')) {
                    console.log('🚫 Transaction rejected by user - not retrying');
                    throw error;
                }

                // Check for Internal JSON-RPC error (often means RPC issue, not gas)
                if (error.message.includes('Internal JSON-RPC error') || error.code === -32603) {
                    console.log('🚫 Internal JSON-RPC error detected - this is usually an RPC issue, not gas');
                    console.log('💡 Try refreshing the page or switching RPC endpoints');
                    throw error;
                }

                // For gas-related errors only, adjust gas conservatively
                if (error.message.includes('gas')) {
                    
                    console.log('🔧 Adjusting gas for Abstract L2 compatibility...');
                    
                    // Conservative increase for Abstract L2 (remember: excess is refunded)
                    const currentGas = parseInt(transaction.gas, 16);
                    const newGas = Math.min(currentGas + 15000, 60000); // Cap at 60k gas
                    transaction.gas = '0x' + newGas.toString(16);
                    
                    // Minimal gas price increase (keep fees ultra-low)
                    const currentGasPrice = parseInt(transaction.gasPrice, 16);
                    const newGasPrice = Math.min(currentGasPrice * 3, 1000000000); // Cap at 1 gwei
                    transaction.gasPrice = '0x' + newGasPrice.toString(16);
                    
                    console.log(`🔧 Updated gas: ${newGas}, gasPrice: ${(newGasPrice / 1e9).toFixed(1)} gwei`);
                    console.log('💡 Remember: Abstract bootloader refunds excess gas automatically');
                } else {
                    // For non-gas errors, don't retry
                    console.log('🚫 Non-gas related error - not retrying');
                    throw error;
                }

                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }
    }

    /**
     * 🌐 Verify Abstract L2 network connection
     */
    async verifyNetwork() {
        try {
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            
            if (chainId !== this.chainIdHex) {
                throw new Error(`Wrong network. Expected Abstract L2 (${this.chainIdHex}), got ${chainId}`);
            }

            console.log('✅ Abstract L2 network verified');
            return true;

        } catch (error) {
            console.error('❌ Abstract L2 network verification failed:', error);
            return false;
        }
    }

    /**
     * 🏥 Test Abstract L2 RPC health
     */
    async testRPCHealth() {
        const tests = [
            { name: 'Chain ID', method: 'eth_chainId', params: [] },
            { name: 'Block Number', method: 'eth_blockNumber', params: [] },
            { name: 'Gas Price', method: 'eth_gasPrice', params: [] }
        ];

        const results = {};

        for (const test of tests) {
            try {
                const result = await window.ethereum.request({
                    method: test.method,
                    params: test.params
                });
                results[test.name] = { success: true, result };
                console.log(`✅ ${test.name}: ${result}`);
            } catch (error) {
                results[test.name] = { success: false, error: error.message };
                console.log(`❌ ${test.name}: ${error.message}`);
            }
        }

        return results;
    }
}

// Create global instance
window.AbstractL2Helper = AbstractL2Helper;
window.abstractL2Helper = new AbstractL2Helper();

console.log('🌐 Abstract L2 Helper loaded and ready');
