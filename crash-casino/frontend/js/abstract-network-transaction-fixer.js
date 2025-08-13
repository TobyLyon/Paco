/**
 * 🚀 Abstract Network Transaction Fixer
 * 
 * Specialized utility to handle Abstract Network transaction submission issues
 * Tries multiple strategies to get transactions through
 */

class AbstractNetworkTransactionFixer {
    constructor() {
        // Use reliable Abstract RPC endpoints that actually work for transactions
        this.alternativeEndpoints = [
            'https://abstract-mainnet.g.alchemy.com/public', // Alchemy public - better tx support
            'https://api.mainnet.abs.xyz' // Official Abstract RPC (fallback)
        ];
        
        this.currentEndpointIndex = 0;
        this.maxRetries = this.alternativeEndpoints.length;
    }

    /**
     * 🎯 Attempt transaction with multiple RPC endpoints
     */
    async attemptTransactionWithFallbacks(transactionParams) {
        const { to, value, gasLimit = 100000, gasPriceGwei = 0.5 } = transactionParams;
        
        for (let attempt = 0; attempt < this.maxRetries; attempt++) {
            const endpoint = this.alternativeEndpoints[attempt];
            
            try {
                console.log(`🚀 Transaction attempt ${attempt + 1}/${this.maxRetries} using: ${endpoint}`);
                
                // Update MetaMask to use this specific endpoint
                await this.updateMetaMaskRPC(endpoint);
                
                // Wait for MetaMask to update
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Format transaction for Abstract Network
                const fromAddress = await window.ethereum.request({ method: 'eth_accounts' }).then(accounts => accounts[0]);
                
                const tx = {
                    from: fromAddress,
                    to: to,
                    value: '0x' + ethers.parseEther(value.toString()).toString(16),
                    gas: '0x' + gasLimit.toString(16),
                    gasPrice: '0x' + Math.floor(gasPriceGwei * 1e9).toString(16),
                    data: '0x',
                    gas_per_pubdata_limit: '0xC350' // Required for Abstract Network
                };
                
                console.log(`📡 Sending transaction via ${endpoint}:`, tx);
                
                // Attempt transaction
                const txHash = await window.ethereum.request({
                    method: 'eth_sendTransaction',
                    params: [tx]
                });
                
                console.log(`✅ Transaction successful via ${endpoint}: ${txHash}`);
                return { success: true, txHash, endpoint };
                
            } catch (error) {
                console.error(`❌ Attempt ${attempt + 1} failed via ${endpoint}:`, error.message);
                
                // If user rejected, don't retry
                if (error.code === 4001) {
                    throw new Error('User rejected transaction');
                }
                
                // Continue to next endpoint
                continue;
            }
        }
        
        // All endpoints failed
        throw new Error(`All ${this.maxRetries} RPC endpoints failed for transaction submission`);
    }

    /**
     * 🔄 Update MetaMask to use specific RPC endpoint
     */
    async updateMetaMaskRPC(endpoint) {
        try {
            await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                    chainId: '0xab5', // 2741 in hex
                    chainName: 'Abstract',
                    nativeCurrency: {
                        name: 'Ether',
                        symbol: 'ETH',
                        decimals: 18
                    },
                    rpcUrls: [endpoint],
                    blockExplorerUrls: ['https://abscan.org']
                }]
            });
            console.log(`🔄 MetaMask updated to: ${endpoint}`);
        } catch (error) {
            console.log(`⚠️ Could not update MetaMask to ${endpoint}:`, error.message);
        }
    }

    /**
     * 🧪 Test all endpoints for transaction capability
     */
    async testAllEndpoints() {
        console.log('🧪 Testing all Abstract Network RPC endpoints...');
        
        for (const endpoint of this.alternativeEndpoints) {
            try {
                // Test basic connectivity
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        jsonrpc: '2.0',
                        method: 'eth_chainId',
                        params: [],
                        id: 1
                    })
                });
                
                const data = await response.json();
                if (data.result === '0xab5') {
                    console.log(`✅ ${endpoint} - Working (Chain ID: ${data.result})`);
                } else {
                    console.log(`❌ ${endpoint} - Wrong chain ID: ${data.result}`);
                }
            } catch (error) {
                console.log(`❌ ${endpoint} - Failed: ${error.message}`);
            }
        }
    }
}

// Create global instance
window.abstractNetworkTransactionFixer = new AbstractNetworkTransactionFixer();

console.log('🚀 Abstract Network Transaction Fixer loaded');
console.log('🧪 Test endpoints with: abstractNetworkTransactionFixer.testAllEndpoints()');
