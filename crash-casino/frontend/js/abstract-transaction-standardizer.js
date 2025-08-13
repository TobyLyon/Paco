/**
 * 🔧 Abstract Transaction Standardizer
 * 
 * Ensures ALL transactions use proper Abstract ZK Stack format
 * Fixes the "wrong network" and transaction failure issues
 */

class AbstractTransactionStandardizer {
    constructor() {
        this.CHAIN_ID = '0xab5'; // 2741 in hex (lowercase for consistency)
        this.CHAIN_ID_DECIMAL = 2741;
        
        // Standard ZK Stack configuration that works reliably
        this.DEFAULT_CONFIG = {
            gasPrice: '0x3B9ACA00', // 1 gwei - reliable for Abstract
            gas: '0x186A0', // 100k gas - sufficient for most operations
            gas_per_pubdata_limit: '0xC350', // 50k - required for ZK Stack
            data: '0x' // Required field
        };
        
        console.log('🔧 Abstract Transaction Standardizer initialized');
    }

    /**
     * 🎯 Standardize ANY transaction for Abstract ZK Stack
     */
    standardizeTransaction(transaction) {
        // Start with a clean transaction object
        const standardTx = {
            from: transaction.from,
            to: transaction.to,
            value: this.normalizeValue(transaction.value),
            gasPrice: transaction.gasPrice || this.DEFAULT_CONFIG.gasPrice,
            gas: transaction.gas || transaction.gasLimit || this.DEFAULT_CONFIG.gas,
            data: transaction.data || this.DEFAULT_CONFIG.data,
            gas_per_pubdata_limit: transaction.gas_per_pubdata_limit || this.DEFAULT_CONFIG.gas_per_pubdata_limit
        };

        // Remove any conflicting fields that cause issues
        delete standardTx.gasLimit; // Use 'gas' instead
        delete standardTx.maxFeePerGas; // Not supported on Abstract
        delete standardTx.maxPriorityFeePerGas; // Not supported on Abstract
        delete standardTx.type; // Use legacy format
        delete standardTx.nonce; // Let MetaMask handle nonce

        console.log('🔧 Transaction standardized for Abstract ZK Stack:', standardTx);
        
        return standardTx;
    }

    /**
     * 🔄 Normalize value to proper hex format
     */
    normalizeValue(value) {
        if (!value) return '0x0';
        
        // If already hex
        if (typeof value === 'string' && value.startsWith('0x')) {
            return value;
        }
        
        // If numeric string or number
        if (!isNaN(value)) {
            return '0x' + parseInt(value).toString(16);
        }
        
        // If ethers BigNumber or similar
        if (typeof value === 'object' && value.toString) {
            return '0x' + BigInt(value.toString()).toString(16);
        }
        
        // Fallback
        return '0x0';
    }

    /**
     * 🌐 Validate network before transaction
     */
    async validateNetwork() {
        try {
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            const normalizedChainId = chainId.toLowerCase();
            
            if (normalizedChainId !== this.CHAIN_ID) {
                throw new Error(`Wrong network. Expected Abstract (${this.CHAIN_ID}), got ${chainId}`);
            }
            
            console.log('✅ Abstract network validated');
            return true;
        } catch (error) {
            console.error('❌ Network validation failed:', error);
            throw error;
        }
    }

    /**
     * 📤 Send transaction with full standardization
     */
    async sendStandardizedTransaction(transactionParams) {
        try {
            // 1. Validate network first
            await this.validateNetwork();
            
            // 2. Get current account
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (!accounts || accounts.length === 0) {
                throw new Error('No wallet connected');
            }
            
            // 3. Prepare standardized transaction
            const transaction = {
                from: accounts[0],
                to: transactionParams.to,
                value: transactionParams.value,
                ...transactionParams // Allow overrides
            };
            
            const standardTx = this.standardizeTransaction(transaction);
            
            console.log('🚀 Sending standardized Abstract transaction:', standardTx);
            
            // 4. Send via MetaMask
            const txHash = await window.ethereum.request({
                method: 'eth_sendTransaction',
                params: [standardTx]
            });
            
            console.log('✅ Transaction successful:', txHash);
            return { success: true, txHash };
            
        } catch (error) {
            console.error('❌ Standardized transaction failed:', error);
            throw error;
        }
    }

    /**
     * 🔍 Debug transaction format
     */
    debugTransaction(transaction) {
        console.log('🔍 TRANSACTION DEBUG:');
        console.log('📋 Required fields present:');
        console.log('  ✅ from:', !!transaction.from);
        console.log('  ✅ to:', !!transaction.to);
        console.log('  ✅ value:', !!transaction.value);
        console.log('  ✅ gas:', !!transaction.gas);
        console.log('  ✅ gasPrice:', !!transaction.gasPrice);
        console.log('  ✅ data:', !!transaction.data);
        console.log('  ✅ gas_per_pubdata_limit:', !!transaction.gas_per_pubdata_limit);
        console.log('📋 Forbidden fields removed:');
        console.log('  ❌ gasLimit:', !transaction.gasLimit);
        console.log('  ❌ maxFeePerGas:', !transaction.maxFeePerGas);
        console.log('  ❌ maxPriorityFeePerGas:', !transaction.maxPriorityFeePerGas);
        console.log('  ❌ type:', !transaction.type);
        console.log('📊 Gas Configuration:');
        console.log('  💰 Gas Price:', parseInt(transaction.gasPrice, 16) / 1e9, 'gwei');
        console.log('  ⛽ Gas Limit:', parseInt(transaction.gas, 16));
        console.log('  📊 Pubdata Limit:', parseInt(transaction.gas_per_pubdata_limit, 16));
    }
}

// Create global instance
window.abstractTransactionStandardizer = new AbstractTransactionStandardizer();

console.log('🔧 Abstract Transaction Standardizer loaded');
console.log('📖 Usage: abstractTransactionStandardizer.sendStandardizedTransaction({ to, value })');
