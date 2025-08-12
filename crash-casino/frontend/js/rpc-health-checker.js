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
     * 🔍 Check if an RPC endpoint is healthy for transactions
     */
    async checkEndpointHealth(endpoint) {
        try {
            // Test 1: Basic connectivity
            const blockResponse = await fetch(endpoint, {
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
                timeout: 5000
            });

            if (!blockResponse.ok) {
                throw new Error(`HTTP ${blockResponse.status}`);
            }

            const blockData = await blockResponse.json();
            if (blockData.error) {
                throw new Error(`RPC Error: ${blockData.error.message}`);
            }

            // Test 2: Chain ID verification (ensure it's Abstract mainnet)
            const chainResponse = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'eth_chainId',
                    params: [],
                    id: 2
                }),
                timeout: 5000
            });

            const chainData = await chainResponse.json();
            if (chainData.error) {
                throw new Error(`Chain ID Error: ${chainData.error.message}`);
            }

            // Verify it's Abstract mainnet (chain ID 2741 = 0xab5)
            if (chainData.result !== '0xab5') {
                throw new Error(`Wrong chain ID: ${chainData.result}, expected 0xab5`);
            }

            // Test 3: EIP-1559 fee data capability (better for L2 networks like Abstract)
            const feeResponse = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'eth_feeHistory',
                    params: [4, 'latest', [25, 50, 75]], // Get fee history for EIP-1559
                    id: 3
                }),
                timeout: 5000
            });

            const feeData = await feeResponse.json();
            // Check if fee history works (required for EIP-1559 transactions)
            if (feeData.error && feeData.error.message && feeData.error.message.includes('Internal JSON-RPC error')) {
                throw new Error(`Fee history failed with Internal JSON-RPC error`);
            }
            
            // Also test gas estimation with EIP-1559 format
            const gasResponse = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'eth_estimateGas',
                    params: [{
                        to: '0x1f8B1c4D05eF17Ebaa1E572426110146691e6C5a',
                        value: '0x1',
                        type: '0x2', // EIP-1559 transaction type
                        data: '0x'
                    }],
                    id: 4
                }),
                timeout: 5000
            });

            const gasData = await gasResponse.json();
            // Note: We expect this might error for various reasons (insufficient balance, etc.)
            // But if it errors with "Internal JSON-RPC error", that's a bad sign
            if (gasData.error && gasData.error.message && gasData.error.message.includes('Internal JSON-RPC error')) {
                throw new Error(`EIP-1559 gas estimation failed with Internal JSON-RPC error`);
            }

            console.log(`✅ RPC endpoint ${endpoint} passed all health checks`);
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
