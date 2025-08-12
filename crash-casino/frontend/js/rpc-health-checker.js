/**
 * 🏥 Abstract Network RPC Health Checker
 * 
 * Automatically checks RPC endpoint health and switches to working alternatives
 */

class RPCHealthChecker {
    constructor() {
        this.endpoints = [
            'https://api.mainnet.abs.xyz',
            'https://rpc.abs.xyz',
            'https://abstract-mainnet.g.alchemy.com/v2/demo'
        ];
        this.currentEndpoint = this.endpoints[0];
        this.failedEndpoints = new Set();
        this.checkInProgress = false;
    }

    /**
     * 🔍 Check if an RPC endpoint is healthy
     */
    async checkEndpointHealth(endpoint) {
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'eth_blockNumber',
                    params: [],
                    id: 1
                }),
                timeout: 5000 // 5 second timeout
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            if (data.error) {
                throw new Error(`RPC Error: ${data.error.message}`);
            }

            return true;
        } catch (error) {
            console.log(`❌ RPC endpoint ${endpoint} failed health check:`, error.message);
            return false;
        }
    }

    /**
     * 🔄 Find the best working RPC endpoint and switch MetaMask if needed
     */
    async findHealthyEndpoint() {
        if (this.checkInProgress) {
            return this.currentEndpoint;
        }

        this.checkInProgress = true;
        console.log('🏥 Checking Abstract Network RPC endpoints...');

        try {
            // First, try current endpoint
            if (await this.checkEndpointHealth(this.currentEndpoint)) {
                console.log(`✅ Current RPC endpoint healthy: ${this.currentEndpoint}`);
                return this.currentEndpoint;
            }

            // Mark current as failed and try alternatives
            this.failedEndpoints.add(this.currentEndpoint);

            for (const endpoint of this.endpoints) {
                if (this.failedEndpoints.has(endpoint)) {
                    continue; // Skip known failed endpoints
                }

                console.log(`🔍 Testing RPC endpoint: ${endpoint}`);
                if (await this.checkEndpointHealth(endpoint)) {
                    console.log(`✅ Found healthy RPC endpoint: ${endpoint}`);
                    
                    // Switch MetaMask to the healthy endpoint
                    await this.switchMetaMaskRPC(endpoint);
                    
                    this.currentEndpoint = endpoint;
                    return endpoint;
                }

                this.failedEndpoints.add(endpoint);
            }

            // If all endpoints fail, clear the failed list and try again with the original
            console.log('⚠️ All RPC endpoints failed, resetting and using original');
            this.failedEndpoints.clear();
            this.currentEndpoint = this.endpoints[0];
            
            // Try to switch back to original
            await this.switchMetaMaskRPC(this.currentEndpoint);
            
            return this.currentEndpoint;

        } finally {
            this.checkInProgress = false;
        }
    }

    /**
     * 🔄 Switch MetaMask RPC endpoint
     */
    async switchMetaMaskRPC(newEndpoint) {
        if (!window.ethereum) {
            console.log('⚠️ MetaMask not available for RPC switch');
            return false;
        }

        try {
            console.log(`🔄 Switching MetaMask RPC to: ${newEndpoint}`);
            
            // Try to switch the network's RPC URL
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
                    rpcUrls: [newEndpoint],
                    blockExplorerUrls: ['https://abscan.org']
                }]
            });
            
            console.log(`✅ MetaMask RPC switched to: ${newEndpoint}`);
            return true;
            
        } catch (error) {
            if (error.code === 4902) {
                console.log('ℹ️ Abstract network already exists in MetaMask');
                return true;
            } else {
                console.error('❌ Failed to switch MetaMask RPC:', error);
                return false;
            }
        }
    }

    /**
     * 📊 Get RPC endpoint status
     */
    getStatus() {
        return {
            currentEndpoint: this.currentEndpoint,
            failedEndpoints: Array.from(this.failedEndpoints),
            totalEndpoints: this.endpoints.length,
            healthyEndpoints: this.endpoints.length - this.failedEndpoints.size
        };
    }

    /**
     * 🔄 Reset failed endpoints list (call after successful transaction)
     */
    resetFailedEndpoints() {
        this.failedEndpoints.clear();
        console.log('✅ RPC endpoints reset - all marked as healthy');
    }
}

// Create global instance
window.rpcHealthChecker = new RPCHealthChecker();

console.log('🏥 RPC Health Checker initialized with endpoints:', window.rpcHealthChecker.endpoints);
