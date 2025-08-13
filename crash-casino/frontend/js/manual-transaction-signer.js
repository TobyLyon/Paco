/**
 * 🔑 Manual Transaction Signer for Abstract Network
 * 
 * Bypasses MetaMask's broken eth_sendTransaction by manually signing
 * and submitting transactions via direct RPC calls
 */

class ManualTransactionSigner {
    constructor() {
        this.rpcEndpoint = 'https://api.mainnet.abs.xyz';
        this.chainId = 2741;
        console.log('🔑 Manual Transaction Signer initialized');
        console.log('📡 Using RPC endpoint:', this.rpcEndpoint);
    }

    /**
     * 🚀 Send transaction by manual signing + direct RPC submission
     */
    async sendTransaction(to, value, gasConfig = {}) {
        try {
            console.log('🔑 Starting manual transaction signing process...');
            
            // Get signer from ethers
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const fromAddress = await signer.getAddress();
            
            console.log('📝 Transaction details:');
            console.log('  From:', fromAddress);
            console.log('  To:', to);
            console.log('  Value:', value, 'ETH');
            
            // Get current nonce
            const nonce = await this.getCurrentNonce(fromAddress);
            console.log('🔢 Current nonce:', nonce);
            
            // Get current gas price
            const gasPrice = await this.getCurrentGasPrice();
            console.log('⛽ Current gas price:', parseInt(gasPrice, 16) / 1e9, 'gwei');
            
            // Create transaction object
            const transaction = {
                to: to,
                value: ethers.parseEther(value.toString()),
                gasLimit: gasConfig.gas || 21000,
                gasPrice: gasPrice,
                nonce: nonce,
                chainId: this.chainId
            };
            
            console.log('📋 Transaction object created:', transaction);
            
            // Sign the transaction
            console.log('✍️ Signing transaction...');
            const signedTx = await signer.signTransaction(transaction);
            console.log('✅ Transaction signed:', signedTx);
            
            // Submit via direct RPC call
            console.log('📡 Submitting via direct RPC call...');
            const txHash = await this.submitSignedTransaction(signedTx);
            
            console.log('🎉 Transaction submitted successfully!');
            console.log('🔗 Transaction hash:', txHash);
            
            return {
                hash: txHash,
                wait: () => this.waitForTransaction(txHash)
            };
            
        } catch (error) {
            console.error('❌ Manual transaction signing failed:', error);
            throw error;
        }
    }

    /**
     * 🔢 Get current nonce for address
     */
    async getCurrentNonce(address) {
        try {
            const response = await fetch(this.rpcEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'eth_getTransactionCount',
                    params: [address, 'pending'],
                    id: 1
                })
            });
            
            const result = await response.json();
            if (result.error) {
                throw new Error(`RPC Error: ${result.error.message}`);
            }
            
            return parseInt(result.result, 16);
        } catch (error) {
            console.error('❌ Failed to get nonce:', error);
            throw error;
        }
    }

    /**
     * ⛽ Get current gas price
     */
    async getCurrentGasPrice() {
        try {
            const response = await fetch(this.rpcEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'eth_gasPrice',
                    params: [],
                    id: 2
                })
            });
            
            const result = await response.json();
            if (result.error) {
                throw new Error(`RPC Error: ${result.error.message}`);
            }
            
            // Use a minimum of 0.1 gwei for Abstract Network
            const networkGasPrice = BigInt(result.result);
            const minGasPrice = BigInt('100000000'); // 0.1 gwei
            const gasPrice = networkGasPrice > minGasPrice ? networkGasPrice : minGasPrice;
            
            return '0x' + gasPrice.toString(16);
        } catch (error) {
            console.error('❌ Failed to get gas price:', error);
            // Fallback to 0.1 gwei
            return '0x5F5E100';
        }
    }

    /**
     * 📡 Submit signed transaction via direct RPC
     */
    async submitSignedTransaction(signedTx) {
        try {
            const response = await fetch(this.rpcEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'eth_sendRawTransaction',
                    params: [signedTx],
                    id: 3
                })
            });
            
            const result = await response.json();
            if (result.error) {
                throw new Error(`RPC Error: ${result.error.message}`);
            }
            
            return result.result;
        } catch (error) {
            console.error('❌ Failed to submit signed transaction:', error);
            throw error;
        }
    }

    /**
     * ⏳ Wait for transaction confirmation
     */
    async waitForTransaction(txHash) {
        console.log('⏳ Waiting for transaction confirmation:', txHash);
        
        for (let i = 0; i < 60; i++) { // Wait up to 60 seconds
            try {
                const response = await fetch(this.rpcEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        jsonrpc: '2.0',
                        method: 'eth_getTransactionReceipt',
                        params: [txHash],
                        id: 4
                    })
                });
                
                const result = await response.json();
                if (result.result) {
                    console.log('✅ Transaction confirmed!');
                    return result.result;
                }
                
                // Wait 1 second before checking again
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                console.log('⏳ Still waiting for confirmation...');
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        throw new Error('Transaction confirmation timeout');
    }

    /**
     * 🧪 Test manual transaction signing
     */
    async testManualTransaction() {
        try {
            console.log('🧪 Testing manual transaction signing...');
            
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const address = await signer.getAddress();
            
            // Send 1 wei to self
            const result = await this.sendTransaction(address, '0.000000001');
            console.log('✅ Manual transaction test successful:', result.hash);
            
            return result;
        } catch (error) {
            console.error('❌ Manual transaction test failed:', error);
            throw error;
        }
    }
}

// Create global instance
window.ManualTransactionSigner = ManualTransactionSigner;
window.manualSigner = new ManualTransactionSigner();

// Add console command for testing
window.testManualTx = () => window.manualSigner.testManualTransaction();

console.log('🔑 Manual Transaction Signer loaded');
console.log('🧪 Test with: testManualTx()');
