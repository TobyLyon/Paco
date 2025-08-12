/**
 * 🌐 Abstract L2 Transaction Helper
 * 
 * Specialized helper for Abstract L2 transaction format and compatibility
 * Addresses specific Abstract Network requirements that differ from standard Ethereum
 */

class AbstractL2Helper {
    constructor() {
        this.chainId = 2741; // Abstract mainnet
        this.chainIdHex = '0xab5';
        this.defaultGasPrice = '0x5F5E100'; // 0.1 gwei in hex (100000000 wei) - MUCH lower for Abstract L2
        this.defaultGasLimit = '0x5208'; // 21000 in hex - standard ETH transfer
        
        console.log('🌐 Abstract L2 Helper initialized with low-cost settings');
        console.log(`💰 Default gas: ${parseInt(this.defaultGasLimit, 16)} limit, ${parseInt(this.defaultGasPrice, 16) / 1e9} gwei price`);
    }

    /**
     * 🔧 Format transaction for Abstract L2 compatibility
     */
    formatTransaction(to, value, gasConfig = {}) {
        // Abstract L2 requires specific transaction format
        const transaction = {
            to: to,
            value: this.toHex(value),
            gasPrice: gasConfig.gasPrice || this.defaultGasPrice,
            gas: gasConfig.gas || gasConfig.gasLimit || this.defaultGasLimit, // Abstract uses 'gas' not 'gasLimit'
            data: '0x', // Required empty data field for Abstract L2
        };

        // Remove any conflicting fields
        delete transaction.gasLimit; // Abstract L2 uses 'gas'
        delete transaction.maxFeePerGas; // No EIP-1559
        delete transaction.maxPriorityFeePerGas; // No EIP-1559

        console.log('🔧 Abstract L2 transaction formatted:', transaction);
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
     * 💰 Calculate Abstract L2 gas configuration
     */
    calculateGasConfig(priority = 'standard') {
        switch (priority) {
            case 'fast':
                return {
                    gasPrice: '0xBEBC200', // 0.2 gwei (200000000 wei)
                    gas: '0x7530' // 30000 - higher limit for fast
                };
            case 'urgent':
                return {
                    gasPrice: '0x17D78400', // 0.4 gwei (400000000 wei)
                    gas: '0xAFC8' // 45000 - highest limit
                };
            case 'standard':
            default:
                return {
                    gasPrice: this.defaultGasPrice, // 0.1 gwei
                    gas: this.defaultGasLimit // 21000 - minimal for simple transfer
                };
        }
    }

    /**
     * ✅ Validate Abstract L2 transaction
     */
    validateTransaction(tx) {
        const errors = [];

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

        if (tx.gasLimit) {
            errors.push('Use "gas" instead of "gasLimit" for Abstract L2');
        }

        if (tx.maxFeePerGas || tx.maxPriorityFeePerGas) {
            errors.push('EIP-1559 fields not supported on Abstract L2');
        }

        if (!tx.data) {
            errors.push('Missing required "data" field for Abstract L2');
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
                
                // Validate transaction format
                const validation = this.validateTransaction(transaction);
                if (!validation.isValid) {
                    throw new Error('Transaction validation failed: ' + validation.errors.join(', '));
                }

                // Send via MetaMask
                const txHash = await window.ethereum.request({
                    method: 'eth_sendTransaction',
                    params: [transaction]
                });

                console.log('✅ Abstract L2 transaction successful:', txHash);
                return txHash;

            } catch (error) {
                console.error(`❌ Abstract L2 transaction attempt ${attempt} failed:`, error);

                if (attempt === maxRetries) {
                    throw new Error(`Abstract L2 transaction failed after ${maxRetries} attempts: ${error.message}`);
                }

                // For Abstract L2 specific errors, adjust gas
                if (error.message.includes('Internal JSON-RPC error') || 
                    error.message.includes('gas') ||
                    error.code === -32603) {
                    
                    console.log('🔧 Adjusting gas for Abstract L2 compatibility...');
                    
                    // Increase gas progressively
                    const currentGas = parseInt(transaction.gas, 16);
                    const newGas = Math.floor(currentGas * 1.5);
                    transaction.gas = '0x' + newGas.toString(16);
                    
                    // Increase gas price slightly
                    const currentGasPrice = parseInt(transaction.gasPrice, 16);
                    const newGasPrice = Math.floor(currentGasPrice * 1.2);
                    transaction.gasPrice = '0x' + newGasPrice.toString(16);
                    
                    console.log(`🔧 Updated gas: ${newGas}, gasPrice: ${newGasPrice}`);
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
