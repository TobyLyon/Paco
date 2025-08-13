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
        console.log('🔍 INPUT TRANSACTION:', transaction);
        console.log('🔍 Transaction fields:', Object.keys(transaction));
        console.log('🔍 From:', transaction.from);
        console.log('🔍 To:', transaction.to);
        console.log('🔍 Value:', transaction.value);
        
        // CRITICAL: Validate required fields
        if (!transaction.to) {
            throw new Error('Missing "to" field - this would create a contract deployment!');
        }
        
        if (!transaction.from) {
            throw new Error('Missing "from" field - transaction needs sender address');
        }
        
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
        console.log('🔍 Recipient address:', standardTx.to);
        console.log('🔍 Value (wei):', standardTx.value);
        
        return standardTx;
    }

    /**
     * 🔄 Normalize value to proper hex format
     */
    normalizeValue(value) {
        if (!value) return '0x0';
        
        console.log('🔍 Normalizing value:', value, 'type:', typeof value);
        
        // If already hex and valid
        if (typeof value === 'string' && value.startsWith('0x')) {
            console.log('✅ Value already in hex format:', value);
            return value;
        }
        
        // If small decimal number (likely ETH amount)
        if (!isNaN(value) && parseFloat(value) < 1000) {
            const weiValue = ethers.parseEther(value.toString());
            const hexValue = '0x' + weiValue.toString(16);
            console.log('✅ Converted ETH to wei hex:', value, 'ETH ->', hexValue, 'wei');
            return hexValue;
        }
        
        // If ethers BigNumber or similar (large numbers)
        if (typeof value === 'object' && value.toString) {
            const hexValue = '0x' + BigInt(value.toString()).toString(16);
            console.log('✅ Converted BigInt to hex:', value.toString(), '->', hexValue);
            return hexValue;
        }
        
        // If large string number (wei amounts)
        if (typeof value === 'string' && /^\d+$/.test(value)) {
            const hexValue = '0x' + BigInt(value).toString(16);
            console.log('✅ Converted wei string to hex:', value, '->', hexValue);
            return hexValue;
        }
        
        console.error('❌ Could not normalize value:', value);
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
            
            // 3. Check Abstract ETH balance
            console.log('🔍 Checking Abstract ETH balance...');
            try {
                const balanceHex = await window.ethereum.request({
                    method: 'eth_getBalance',
                    params: [accounts[0], 'latest']
                });
                const balanceWei = BigInt(balanceHex);
                const balanceEth = parseFloat(ethers.formatEther(balanceWei));
                console.log(`💰 Abstract ETH Balance: ${balanceEth} ETH (${balanceWei} wei)`);
                
                // Check if sufficient balance
                const requiredEth = parseFloat(transactionParams.value || 0);
                if (balanceEth < requiredEth) {
                    throw new Error(`Insufficient Abstract ETH balance. Have: ${balanceEth} ETH, Need: ${requiredEth} ETH`);
                }
                console.log(`✅ Sufficient balance for ${requiredEth} ETH transaction`);
            } catch (balanceError) {
                console.error('❌ Failed to check balance:', balanceError);
                // Continue anyway, let MetaMask handle it
            }
            
            // 4. Prepare standardized transaction
            const transaction = {
                from: accounts[0],
                to: transactionParams.to,
                value: transactionParams.value,
                ...transactionParams // Allow overrides
            };
            
            const standardTx = this.standardizeTransaction(transaction);
            
            console.log('🚀 Sending standardized Abstract transaction:', standardTx);
            
            // 5. Send via MetaMask
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
