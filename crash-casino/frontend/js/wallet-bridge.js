/**
 * 🌉 Wallet Bridge for Crash Casino
 * 
 * Bridges the crash casino frontend to the new RainbowKit wallet system
 * Provides compatibility layer for existing crash game code
 */

class WalletBridge {
    constructor() {
        this.isConnected = false;
        this.address = null;
        this.provider = null;
        this.signer = null;
        
        // Initialize bridge
        this.init();
        
        // Setup connect button when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupConnectButton());
        } else {
            this.setupConnectButton();
        }
    }

    /**
     * 🚀 Initialize wallet bridge
     */
    async init() {
        console.log('🌉 Initializing wallet bridge for crash casino...');
        
        // Check RPC endpoint health if health checker is available
        if (window.rpcHealthChecker) {
            await window.rpcHealthChecker.findHealthyEndpoint();
        }
        
        // Check if we're running in the React app context
        if (window.parent !== window) {
            // We're in an iframe or embedded context - communicate with parent
            this.setupParentCommunication();
        } else {
            // Direct integration - check for ethers
            this.setupDirectIntegration();
        }
    }

    /**
     * 🔗 Setup communication with parent React app
     */
    setupParentCommunication() {
        // Listen for wallet state from parent
        window.addEventListener('message', (event) => {
            if (event.data.type === 'WALLET_STATE_UPDATE') {
                this.updateWalletState(event.data.payload);
            }
        });

        // Request initial wallet state
        window.parent.postMessage({
            type: 'REQUEST_WALLET_STATE'
        }, '*');
    }

    /**
     * ⚡ Setup direct integration with ethers
     */
    async setupDirectIntegration() {
        if (typeof window.ethereum !== 'undefined') {
            try {
                // Use the existing ethereum provider
                this.provider = new ethers.BrowserProvider(window.ethereum);
                
                // Check current chain - ensure we're on Abstract L2
                const network = await this.provider.getNetwork();
                const networkName = network.name === 'unknown' && network.chainId === 2741n ? 'Abstract' : network.name;
                console.log('🌐 Current network:', networkName, network.chainId);
                
                // Check if already connected
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                if (accounts.length > 0) {
                    this.address = accounts[0];
                    this.isConnected = true;
                    this.signer = this.provider.getSigner();
                    console.log('🔗 Wallet already connected:', this.address);
                    
                    // Verify we're on Abstract L2
                    await this.ensureAbstractNetwork();
                }

                // Listen for account changes
                window.ethereum.on('accountsChanged', (accounts) => {
                    if (accounts.length > 0) {
                        this.address = accounts[0];
                        this.isConnected = true;
                        this.signer = this.provider.getSigner();
                    } else {
                        this.address = null;
                        this.isConnected = false;
                        this.signer = null;
                    }
                    this.notifyStateChange();
                });

                // Listen for chain changes
                window.ethereum.on('chainChanged', (chainId) => {
                    console.log('🌐 Chain changed:', chainId);
                    // You might want to check if it's Abstract L2
                });

            } catch (error) {
                console.error('❌ Failed to setup direct wallet integration:', error);
            }
        }
    }

    /**
     * 🔄 Update wallet state from parent
     */
    updateWalletState(state) {
        this.isConnected = state.isConnected;
        this.address = state.address;
        this.chainId = state.chainId;
        
        console.log('🔄 Wallet state updated:', {
            isConnected: this.isConnected,
            address: this.address,
            chainId: this.chainId
        });

        this.notifyStateChange();
    }

    /**
     * 📢 Notify components of state change
     */
    notifyStateChange() {
        // Dispatch custom event for other components
        window.dispatchEvent(new CustomEvent('walletStateChanged', {
            detail: {
                isConnected: this.isConnected,
                address: this.address,
                chainId: this.chainId
            }
        }));
        
        // Dispatch specific events for balance tracker
        if (this.isConnected && this.address && this.provider) {
            document.dispatchEvent(new CustomEvent('walletConnected', {
                detail: {
                    address: this.address,
                    provider: this.provider,
                    chainId: this.chainId
                }
            }));
            console.log('⚡ Wallet connected event dispatched for balance tracker');
        } else {
            document.dispatchEvent(new CustomEvent('walletDisconnected'));
            console.log('⚡ Wallet disconnected event dispatched for balance tracker');
        }
    }

    /**
     * 🔌 Check if wallet is connected (compatibility method)
     */
    isWalletConnected() {
        return this.isConnected && this.address;
    }

    /**
     * 💸 Send transaction (compatibility method with RPC health checking)
     */
    async sendTransaction(to, value, gasConfig = {}) {
        if (!this.isConnected || !this.signer) {
            throw new Error('Wallet not connected');
        }

        try {
            // Check RPC health before transaction
            if (window.rpcHealthChecker) {
                const healthyEndpoint = await window.rpcHealthChecker.findHealthyEndpoint();
                console.log(`🏥 Using healthy RPC endpoint for transaction: ${healthyEndpoint}`);
                
                // If we switched endpoints, we may need to refresh the provider
                const currentNetwork = await this.provider.getNetwork();
                if (currentNetwork.chainId !== 2741n) {
                    console.log('🔄 Network mismatch detected, ensuring Abstract L2...');
                    await this.ensureAbstractNetwork();
                }
            }

            // SIMPLIFIED: Use standard ETH transfer format for Abstract L2
            const tx = {
                to: to,
                value: ethers.parseEther(value.toString()),
                gas: '0x5208', // 21000 gas - standard for simple ETH transfers
                gasPrice: '0x3B9ACA00', // 1 gwei - appropriate for Abstract L2
                data: '0x' // Required empty data field for transfers
            };
            
            console.log('📊 Using legacy transaction format for Abstract Network compatibility');

            console.log('📤 Sending transaction with RPC health check:', tx);
            
            // Skip comprehensive debugging to avoid transaction interference
            console.log('🚀 Streamlined transaction flow - skipping diagnostics...');
            
            // Abstract Network: Use direct MetaMask request instead of ethers.js
            console.log('🔗 Sending transaction via direct MetaMask request for Abstract Network...');
            
            // Convert to Abstract L2 MetaMask-compatible format
            const fromAddress = await this.signer.getAddress();
            const metaMaskTx = {
                from: fromAddress,
                to: tx.to,
                value: typeof tx.value === 'string' ? tx.value : '0x' + BigInt(tx.value).toString(16),
                gas: typeof tx.gas === 'string' ? tx.gas : '0x' + BigInt(tx.gas || tx.gasLimit || 100000).toString(16),
                gasPrice: typeof tx.gasPrice === 'string' ? tx.gasPrice : '0x' + BigInt(tx.gasPrice).toString(16),
                data: '0x', // Abstract L2 requires data field
                // Abstract L2 specific: Add nonce if needed
                // nonce: await this.provider.getTransactionCount(fromAddress)
            };
            
            console.log('📡 MetaMask transaction object:', metaMaskTx);
            
            // ABSTRACT L2 FIX: Enhanced transaction submission with proper error handling
            let txHash;
            try {
                // First, try gas estimation with Abstract L2 format
                const gasEstimate = await window.ethereum.request({
                    method: 'eth_estimateGas',
                    params: [metaMaskTx]
                });
                console.log('✅ Abstract L2 gas estimation successful:', gasEstimate);
                
                // FIXED: Use simple 21k gas for ETH transfers (no buffer needed)
                // Abstract L2 transfers should cost ~$0.001, not $0.90
                metaMaskTx.gas = '0x5208'; // 21000 gas - standard ETH transfer
                console.log(`🔧 Using standard gas limit: 21000 for ETH transfer`);
                
            } catch (gasError) {
                console.log('⚠️ Gas estimation failed, using default:', gasError.message);
                // Continue with default gas limit
            }
            
            // ABSTRACT L2 FIX: Use helper for optimized transaction submission
            console.log('📡 Sending Abstract L2 transaction:', metaMaskTx);
            
            if (window.abstractL2Helper) {
                // Use Abstract L2 helper with built-in retry logic
                txHash = await window.abstractL2Helper.sendTransaction(metaMaskTx, 3);
                console.log('🌐 Transaction sent via Abstract L2 Helper');
            } else {
                // Fallback to direct MetaMask request
                txHash = await window.ethereum.request({
                    method: 'eth_sendTransaction',
                    params: [metaMaskTx]
                });
                console.log('⚠️ Transaction sent via fallback method');
            }
            
            console.log('✅ Transaction sent via MetaMask:', txHash);
            
            // Create ethers-compatible response
            const txResponse = {
                hash: txHash,
                wait: async () => {
                    return await this.provider.waitForTransaction(txHash);
                }
            };
            
            console.log('✅ Transaction sent successfully:', txResponse.hash);
            
            // Reset failed endpoints on successful transaction
            if (window.rpcHealthChecker) {
                window.rpcHealthChecker.resetFailedEndpoints();
                console.log('🏥 RPC endpoints reset after successful transaction');
            }
            
            return txResponse;
        } catch (error) {
            console.error('❌ Transaction failed:', error);
            
            // Record RPC failure if it's an RPC-related error
            if (window.rpcHealthChecker && (
                error.message.includes('Internal JSON-RPC error') ||
                error.code === -32603 ||
                error.message.includes('network error')
            )) {
                console.log('🔴 Recording RPC failure due to transaction error');
                // Force find new healthy endpoint for next attempt
                await window.rpcHealthChecker.findHealthyEndpoint();
            }
            
            throw error;
        }
    }

    /**
     * 📝 Sign message (compatibility method)
     */
    async signMessage(message) {
        if (!this.isConnected || !this.signer) {
            throw new Error('Wallet not connected');
        }

        try {
            const signature = await this.signer.signMessage(message);
            console.log('✅ Message signed');
            return signature;
        } catch (error) {
            console.error('❌ Message signing failed:', error);
            throw error;
        }
    }

    /**
     * 🌐 Ensure we're on Abstract L2
     */
    async ensureAbstractNetwork() {
        const targetChainId = 2741; // Abstract mainnet
        const network = await this.provider.getNetwork();
        
        if (network.chainId !== targetChainId) {
            console.log('🔄 Switching to Abstract L2...');
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: `0x${targetChainId.toString(16)}` }],
                });
            } catch (switchError) {
                // Chain not added, try to add it
                if (switchError.code === 4902) {
                    await this.addAbstractNetwork();
                }
            }
        }
    }

    /**
     * ➕ Add Abstract L2 to wallet
     */
    async addAbstractNetwork() {
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
                    rpcUrls: [
                        'https://api.mainnet.abs.xyz',
                        'https://rpc.abs.xyz',
                        'https://abstract-mainnet.g.alchemy.com/v2/demo'
                    ],
                    blockExplorerUrls: ['https://abscan.org']
                }]
            });
        } catch (error) {
            console.error('❌ Failed to add Abstract network:', error);
        }
    }

    /**
     * 🔗 Request wallet connection (compatibility method)
     */
    async connectWallet() {
        if (window.ethereum) {
            try {
                const accounts = await window.ethereum.request({ 
                    method: 'eth_requestAccounts' 
                });
                
                if (accounts.length > 0) {
                    this.address = accounts[0];
                    this.isConnected = true;
                    this.signer = this.provider.getSigner();
                    
                    // Ensure we're on Abstract L2
                    await this.ensureAbstractNetwork();
                    
                    this.notifyStateChange();
                    return true;
                }
            } catch (error) {
                console.error('❌ Failed to connect wallet:', error);
                return false;
            }
        } else {
            // Show helpful message for mobile users
            alert('🦊 Please install MetaMask or use a Web3 browser to connect your wallet');
        }
        return false;
    }

    /**
     * 🔌 Disconnect wallet (compatibility method)
     */
    disconnect() {
        this.isConnected = false;
        this.address = null;
        this.signer = null;
        this.provider = null;
        console.log('🔌 Wallet disconnected');
        this.notifyStateChange();
    }

    /**
     * 🔘 Setup connect button event listener
     */
    setupConnectButton() {
        const connectBtn = document.getElementById('connectWalletBtn');
        if (connectBtn) {
            console.log('🔘 Setting up connect wallet button...');
            
            connectBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                console.log('🔘 Connect wallet button clicked!');
                
                // Always show wallet selection modal
                this.showWalletModal();
            });
        } else {
            console.log('⚠️ Connect wallet button not found');
        }
    }

    /**
     * 🎯 Show proper wallet selection modal
     */
    showWalletModal() {
        // Remove existing modal if any
        const existingModal = document.getElementById('walletModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Create modal HTML with proper icons
        const modal = document.createElement('div');
        modal.id = 'walletModal';
        modal.innerHTML = `
            <div class="wb-modal-overlay">
                <div class="wb-modal-container">
                    <div class="wb-modal-header">
                        <h3>Connect Wallet</h3>
                        <button class="wb-modal-close">&times;</button>
                    </div>
                    <div class="wb-modal-body">
                        <div class="wb-wallet-options">
                            <button class="wb-wallet-option agw" data-wallet="agw">
                                <img class="wb-wallet-icon" src="/abstract.png" alt="Abstract">
                                <span>Abstract Global Wallet</span>
                            </button>
                            <button class="wb-wallet-option metamask" data-wallet="metamask">
                                <img class="wb-wallet-icon" src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" alt="MetaMask" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNGNjg1MUIiLz4KPHN2ZyB4PSI4IiB5PSI4IiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAzMiAyOSIgZmlsbD0ibm9uZSI+CjxwYXRoIGQ9Ik0yOS4yIDEuMTNMMTYuNTIgMTAuNTFMMTkuNDYgMy43NEwyOS4yIDEuMTNaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4KPC9zdmc+';">
                                <span>MetaMask</span>
                            </button>
                            <button class="wb-wallet-option walletconnect" data-wallet="walletconnect">
                                <img class="wb-wallet-icon" src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiMzQjk5RkMiLz4KPHBhdGggZD0iTTcgMTguNWMwLTYuNDUgNS4yMy0xMS42OCAxMS42OC0xMS42OHMxMS42OCA1LjIzIDExLjY4IDExLjY4aC00Ljg0YzAtMy43Ny0zLjA3LTYuODQtNi44NC02Ljg0LTMuNzcgMC02Ljg0IDMuMDctNi44NCA2Ljg0SDd6IiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K" alt="WalletConnect">
                                <span>WalletConnect</span>
                            </button>
                            <button class="wb-wallet-option coinbase" data-wallet="coinbase">
                                <img class="wb-wallet-icon" src="https://wallet-connect-assets.s3.us-east-1.amazonaws.com/coinbase.png" alt="Coinbase" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiMwMDUyRkYiLz4KPHJlY3QgeD0iMTMiIHk9IjEzIiB3aWR0aD0iMTQiIGhlaWdodD0iMTQiIHJ4PSIyIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K';">
                                <span>Coinbase Wallet</span>
                            </button>
                            <button class="wb-wallet-option injected" data-wallet="injected">
                                <img class="wb-wallet-icon" src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiM2MzM2QzciLz4KPHBhdGggZD0iTTEyIDIwaDEybS02LTZsNiA2LTYgNiIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+Cg==" alt="Browser Wallet">
                                <span>Browser Wallet</span>
                            </button>
                        </div>
                        <div class="wb-security-note">
                            <small>🔒 Your wallet stays secure. We never store your private keys.</small>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove any existing injected styles first
        const existingStyle = document.getElementById('wallet-bridge-styles');
        if (existingStyle) {
            existingStyle.remove();
        }

        // Add comprehensive styles with !important to override external CSS
        const style = document.createElement('style');
        style.id = 'wallet-bridge-styles';
        style.textContent = `
            /* Force compact wallet modal styles - unique classes to avoid conflicts */
            #walletModal {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                background: rgba(0, 0, 0, 0.75) !important;
                z-index: 10000 !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
                backdrop-filter: blur(4px) !important;
            }
            
            .wb-modal-overlay {
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                height: 100% !important;
                background: transparent !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
            }
            
            .wb-modal-container {
                background: white !important;
                border-radius: 16px !important;
                width: 320px !important;
                max-width: 90vw !important;
                box-shadow: 0 25px 50px rgba(0, 0, 0, 0.4) !important;
                overflow: hidden !important;
                position: relative !important;
                transform: translateY(0) !important;
                margin: 0 auto !important;
            }
            
            .wb-modal-header {
                padding: 12px 16px 8px !important;
                border-bottom: 1px solid #eee !important;
                display: flex !important;
                justify-content: space-between !important;
                align-items: center !important;
                margin-bottom: 0 !important;
            }
            
            .wb-modal-header h3 {
                margin: 0 !important;
                font-size: 16px !important;
                font-weight: 600 !important;
                color: #1a1a1a !important;
            }
            
            .wb-modal-close {
                background: none !important;
                border: none !important;
                font-size: 18px !important;
                cursor: pointer !important;
                color: #666 !important;
                width: 24px !important;
                height: 24px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                border-radius: 4px !important;
                transition: all 0.2s !important;
                padding: 0 !important;
            }
            
            .wb-modal-close:hover {
                background: #f5f5f5 !important;
                color: #333 !important;
            }
            
            .wb-modal-body {
                padding: 12px 16px 16px !important;
            }
            
            .wb-wallet-options {
                display: flex !important;
                flex-direction: column !important;
                gap: 6px !important;
                margin-bottom: 12px !important;
            }
            
            .wb-wallet-option {
                display: flex !important;
                align-items: center !important;
                gap: 10px !important;
                width: 100% !important;
                padding: 8px 12px !important;
                border: 1px solid #e5e7eb !important;
                border-radius: 6px !important;
                background: white !important;
                cursor: pointer !important;
                transition: all 0.2s !important;
                font-size: 13px !important;
                font-weight: 500 !important;
                color: #1a1a1a !important;
                text-align: left !important;
                margin: 0 !important;
            }
            
            .wb-wallet-option:hover {
                border-color: #3b82f6 !important;
                background: #f8faff !important;
                transform: translateY(-1px) !important;
                box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15) !important;
            }
            
            .wb-wallet-option:active {
                transform: translateY(0) !important;
            }
            
            .wb-wallet-icon {
                width: 20px !important;
                height: 20px !important;
                border-radius: 4px !important;
                flex-shrink: 0 !important;
                object-fit: contain !important;
            }
            
            .wb-injected-fallback {
                width: 20px !important;
                height: 20px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                border-radius: 4px !important;
                font-size: 12px !important;
                flex-shrink: 0 !important;
                background: linear-gradient(45deg, #666, #555) !important;
                color: white !important;
            }
            
            .wb-security-note {
                text-align: center !important;
                padding: 8px 10px !important;
                background: #f8f9fa !important;
                border-radius: 4px !important;
                border-left: 2px solid #28a745 !important;
                margin: 0 !important;
            }
            
            .wb-security-note small {
                color: #666 !important;
                font-size: 11px !important;
            }
            
            .wb-wallet-option.agw:hover {
                border-color: #FFA500 !important;
                background: #fffbf0 !important;
                box-shadow: 0 4px 12px rgba(255, 165, 0, 0.2) !important;
            }
            
            .wb-wallet-option.metamask:hover {
                border-color: #f6851b !important;
                background: #fffaf7 !important;
                box-shadow: 0 4px 12px rgba(246, 133, 27, 0.15) !important;
            }
            
            .wb-wallet-option.walletconnect:hover {
                border-color: #3b99fc !important;
                background: #f7fcff !important;
                box-shadow: 0 4px 12px rgba(59, 153, 252, 0.15) !important;
            }
            
            .wb-wallet-option.coinbase:hover {
                border-color: #0052ff !important;
                background: #f0f7ff !important;
                box-shadow: 0 4px 12px rgba(0, 82, 255, 0.15) !important;
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(modal);

        // Add event listeners with new class names
        modal.querySelector('.wb-modal-close').addEventListener('click', () => {
            modal.remove();
        });

        modal.querySelector('.wb-modal-overlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                modal.remove();
            }
        });

        // Wallet option handlers
        modal.querySelectorAll('.wb-wallet-option').forEach(btn => {
            btn.addEventListener('click', async () => {
                const walletType = btn.getAttribute('data-wallet');
                modal.remove();
                await this.connectSpecificWallet(walletType);
            });
        });
    }

    /**
     * 🔗 Connect to specific wallet type
     */
    async connectSpecificWallet(walletType) {
        console.log('🔗 Connecting to wallet:', walletType);
        
        const connectBtn = document.getElementById('connectWalletBtn');
        if (connectBtn) {
            connectBtn.textContent = 'Connecting...';
            connectBtn.disabled = true;
        }

        try {
            let success = false;
            
            switch (walletType) {
                case 'agw':
                    success = await this.connectAbstractGlobalWallet();
                    break;
                case 'metamask':
                    success = await this.connectMetaMask();
                    break;
                case 'walletconnect':
                    success = await this.connectWalletConnect();
                    break;
                case 'coinbase':
                    success = await this.connectCoinbase();
                    break;
                case 'injected':
                    success = await this.connectInjected();
                    break;
                default:
                    success = await this.connectWallet();
            }

            this.updateConnectButton();
            
        } catch (error) {
            console.error('❌ Wallet connection failed:', error);
            this.updateConnectButton();
        } finally {
            if (connectBtn) {
                connectBtn.disabled = false;
            }
        }
    }

    /**
     * 🌟 Connect Abstract Global Wallet (AGW) - Native Smart Contract Wallet
     */
    async connectAbstractGlobalWallet() {
        try {
            console.log('🌟 Connecting to Abstract Global Wallet...');
            console.log('🔍 Checking AGW client availability...');
            console.log('🔍 window.AbstractWalletSDK:', typeof window.AbstractWalletSDK);
            console.log('🔍 window.agwClient:', typeof window.agwClient);
            
            // AGW is a native smart contract wallet - different from browser extensions
            if (window.agwClient) {
                console.log('🌟 AGW client detected, initiating login...');
                
                try {
                    // AGW uses social/email login flow
                    const loginResult = await window.agwClient.login({
                        loginOptions: {
                            mode: 'popup', // or 'redirect'
                            prompt: 'login' // Force fresh login
                        }
                    });
                    
                    console.log('🌟 AGW login result:', loginResult);
                    
                    if (loginResult?.address || loginResult?.account) {
                        const address = loginResult.address || loginResult.account;
                        
                        this.address = address;
                        this.isConnected = true;
                        this.provider = window.agwClient.getProvider();
                        this.signer = window.agwClient.getSigner();
                        
                        console.log('✅ Connected to Abstract Global Wallet:', this.address);
                        this.notifyStateChange();
                        return true;
                    } else {
                        console.log('⚠️ AGW login did not return address');
                        return false;
                    }
                } catch (loginError) {
                    console.error('❌ AGW login error:', loginError);
                    throw loginError;
                }
            } else {
                console.log('🌟 AGW SDK not loaded, opening portal directly...');
                
                // Direct portal integration - back to working URL
                const portalUrl = `https://abs.xyz/portal?redirectUrl=${encodeURIComponent(window.location.href)}`;
                
                // Open AGW portal directly
                window.open(portalUrl, 'agw-login', 'width=400,height=600,scrollbars=yes,resizable=yes');
                
                // Listen for successful login callback
                return await this.waitForAGWCallback();
            }
        } catch (error) {
            console.error('❌ Abstract Global Wallet login failed:', error);
            
            if (error.message?.includes('user_cancelled')) {
                console.log('ℹ️ User cancelled AGW login');
                return false;
            }
            
            alert('Failed to connect to Abstract Global Wallet: ' + error.message);
            return false;
        }
        return false;
    }

    /**
     * 🔄 Wait for AGW login callback (portal integration)
     */
    async waitForAGWCallback() {
        return new Promise((resolve) => {
            console.log('🌟 Waiting for AGW login callback...');
            
            const checkCallback = setInterval(() => {
                // Check if we received AGW credentials via callback
                const urlParams = new URLSearchParams(window.location.search);
                const agwToken = urlParams.get('agw_token');
                const agwAddress = urlParams.get('agw_address');
                
                if (agwToken && agwAddress) {
                    console.log('✅ AGW callback received:', agwAddress);
                    
                    clearInterval(checkCallback);
                    
                    // Set up AGW connection
                    this.address = agwAddress;
                    this.isConnected = true;
                    this.agwToken = agwToken;
                    
                    // Clean URL
                    window.history.replaceState({}, document.title, window.location.pathname);
                    
                    this.notifyStateChange();
                    resolve(true);
                }
            }, 1000);
            
            // Timeout after 2 minutes
            setTimeout(() => {
                clearInterval(checkCallback);
                console.log('⏰ AGW login timeout');
                resolve(false);
            }, 120000);
        });
    }

    /**
     * 🦊 Connect MetaMask specifically
     */
    async connectMetaMask() {
        console.log('🦊 Attempting MetaMask connection...');
        console.log('🔍 Current window.ethereum:', window.ethereum);
        console.log('🔍 window.ethereum.isMetaMask:', window.ethereum?.isMetaMask);
        console.log('🔍 window.ethereum.providers:', window.ethereum?.providers);
        
        // Check for MetaMask specifically
        let metamaskProvider = null;
        
        if (window.ethereum) {
            if (window.ethereum.isMetaMask) {
                metamaskProvider = window.ethereum;
                console.log('🦊 Found MetaMask as primary provider');
            } else if (window.ethereum.providers) {
                // Multiple providers - find MetaMask
                metamaskProvider = window.ethereum.providers.find(p => p.isMetaMask);
                console.log('🦊 Found MetaMask in providers array:', metamaskProvider);
            }
        }
        
        if (metamaskProvider) {
            console.log('🦊 MetaMask detected, requesting connection...');
            return await this.connectWithMetaMaskProvider(metamaskProvider);
        } else {
            console.log('❌ MetaMask not found in any provider');
            alert('MetaMask not detected! Please install MetaMask or enable it.');
            return false;
        }
    }

    /**
     * 🦊 Connect specifically with MetaMask provider
     */
    async connectWithMetaMaskProvider(metamaskProvider) {
        try {
            console.log('🦊 Requesting MetaMask account access...');
            
            // First, try to get current accounts to see if already connected
            let currentAccounts = [];
            try {
                currentAccounts = await metamaskProvider.request({ method: 'eth_accounts' });
                console.log('🦊 Current MetaMask accounts:', currentAccounts);
            } catch (e) {
                console.log('🦊 No current accounts');
            }
            
            // Force account selection popup even if already connected
            console.log('🦊 Forcing MetaMask account selection popup...');
            const accounts = await metamaskProvider.request({ 
                method: 'wallet_requestPermissions',
                params: [{ eth_accounts: {} }]
            }).then(() => {
                // After permissions, get the selected accounts
                return metamaskProvider.request({ method: 'eth_requestAccounts' });
            });
            
            console.log('🦊 MetaMask returned accounts after selection:', accounts);
            
            if (accounts && accounts.length > 0) {
                // Clear any existing connection first
                this.disconnect();
                
                this.address = accounts[0];
                this.isConnected = true;
                this.provider = new ethers.BrowserProvider(metamaskProvider);
                this.signer = await this.provider.getSigner();
                
                console.log('✅ Successfully connected to MetaMask:', this.address);
                
                // Ensure we're on Abstract L2
                await this.ensureAbstractNetwork();
                
                this.notifyStateChange();
                return true;
            } else {
                console.log('❌ No accounts returned from MetaMask');
                return false;
            }
        } catch (error) {
            console.error('❌ MetaMask connection failed:', error);
            
            // If permissions method failed, try fallback with simple request
            if (error.code === -32602 || error.message?.includes('wallet_requestPermissions')) {
                console.log('🦊 Permissions method not supported, trying fallback...');
                try {
                    const fallbackAccounts = await metamaskProvider.request({ 
                        method: 'eth_requestAccounts' 
                    });
                    
                    if (fallbackAccounts && fallbackAccounts.length > 0) {
                        this.disconnect();
                        this.address = fallbackAccounts[0];
                        this.isConnected = true;
                        this.provider = new ethers.BrowserProvider(metamaskProvider);
                        this.signer = await this.provider.getSigner();
                        
                        console.log('✅ Connected to MetaMask (fallback):', this.address);
                        await this.ensureAbstractNetwork();
                        this.notifyStateChange();
                        return true;
                    }
                } catch (fallbackError) {
                    console.error('❌ Fallback connection also failed:', fallbackError);
                }
            }
            
            if (error.code === 4001) {
                alert('MetaMask connection was rejected by user.');
            } else {
                alert('Failed to connect to MetaMask: ' + error.message);
            }
            return false;
        }
    }

    /**
     * 🔗 Connect WalletConnect
     */
    async connectWalletConnect() {
        alert('WalletConnect integration coming soon!');
        return false;
    }

    /**
     * 🟦 Connect Coinbase Wallet
     */
    async connectCoinbase() {
        if (typeof window.ethereum !== 'undefined' && window.ethereum.isCoinbaseWallet) {
            return await this.connectWithProvider(window.ethereum);
        } else {
            alert('Coinbase Wallet not detected!');
            return false;
        }
    }

    /**
     * 🌐 Connect any injected wallet
     */
    async connectInjected() {
        if (typeof window.ethereum !== 'undefined') {
            return await this.connectWithProvider(window.ethereum);
        } else {
            alert('No wallet detected! Please install a Web3 wallet.');
            return false;
        }
    }

    /**
     * 🔌 Connect with specific provider
     */
    async connectWithProvider(provider) {
        try {
            const accounts = await provider.request({ 
                method: 'eth_requestAccounts' 
            });
            
            if (accounts.length > 0) {
                this.address = accounts[0];
                this.isConnected = true;
                this.provider = new ethers.BrowserProvider(provider);
                this.signer = await this.provider.getSigner();
                
                console.log('✅ Connected to wallet:', this.address);
                
                // Ensure we're on Abstract L2
                await this.ensureAbstractNetwork();
                
                this.notifyStateChange();
                return true;
            }
        } catch (error) {
            console.error('❌ Failed to connect wallet:', error);
            return false;
        }
        return false;
    }

    /**
     * 🔍 Check for existing wallet connection
     */
    async checkExistingConnection() {
        if (window.ethereum) {
            try {
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                if (accounts.length > 0) {
                    this.address = accounts[0];
                    this.isConnected = true;
                    this.provider = new ethers.BrowserProvider(window.ethereum);
                    this.signer = await this.provider.getSigner();
                    
                                // Check network
            const network = await this.provider.getNetwork();
            console.log('🔗 Found existing wallet connection:', this.address);
            console.log('🌐 Current network:', network.name, network.chainId);
            
            // Debug Abstract Network capabilities
            if (network.chainId === 2741n) {
                this.debugAbstractNetwork();
            }
            
            this.notifyStateChange();
                    return true;
                }
            } catch (error) {
                console.error('❌ Failed to check existing connection:', error);
            }
        }
        return false;
    }

    /**
     * 🔄 Update connect button display
     */
    updateConnectButton() {
        const connectBtn = document.getElementById('connectWalletBtn');
        if (connectBtn) {
            if (this.isConnected && this.address) {
                connectBtn.textContent = `${this.formatAddress(this.address)}`;
                connectBtn.classList.add('connected');
            } else {
                connectBtn.textContent = 'Connect Wallet';
                connectBtn.classList.remove('connected');
            }
        }
    }

    /**
     * 📏 Format address for display
     */
    formatAddress(address) {
        if (!address) return '';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }
    
    /**
     * 🔍 Debug Abstract Network provider capabilities
     */
    debugAbstractNetwork() {
        if (!this.provider) return;
        
        console.log('🔍 ABSTRACT NETWORK DEBUG SESSION STARTING...');
        console.log('🔗 Provider details:', this.provider);
        console.log('🌐 Network info available:', !!this.provider.getNetwork);
        
        // Test basic RPC capabilities
        this.testAbstractRPCCapabilities();
    }
    
    /**
     * 🧪 Test Abstract Network RPC capabilities
     */
    async testAbstractRPCCapabilities() {
        if (!this.provider) return;
        
        console.log('🧪 Testing Abstract Network RPC capabilities...');
        
        const tests = [
            { name: 'eth_chainId', method: 'eth_chainId', params: [] },
            { name: 'eth_gasPrice', method: 'eth_gasPrice', params: [] },
            { name: 'eth_blockNumber', method: 'eth_blockNumber', params: [] },
            { name: 'eth_getBalance', method: 'eth_getBalance', params: [await this.signer?.getAddress() || '0x0000000000000000000000000000000000000000', 'latest'] }
        ];
        
        for (const test of tests) {
            try {
                const result = await this.provider.send(test.method, test.params);
                console.log(`✅ ${test.name}: ${result}`);
            } catch (error) {
                console.log(`❌ ${test.name}: ${error.message}`);
            }
        }
        
        // Test transaction estimation specifically
        try {
            if (this.signer && await this.signer.getAddress()) {
                const testTx = {
                    from: await this.signer.getAddress(), // Required for estimateGas
                    to: await this.signer.getAddress(), // Send to self
                    value: '0x1', // 1 wei
                    data: '0x'
                };
                
                console.log('🧪 Testing eth_estimateGas with minimal transaction...');
                const gasEstimate = await this.provider.send('eth_estimateGas', [testTx]);
                console.log(`✅ Gas estimation works: ${gasEstimate}`);
                
                console.log('🧪 Testing eth_sendTransaction capability...');
                // Test with minimal transaction to see exact error
                const minimalTx = {
                    from: await this.signer.getAddress(),
                    to: await this.signer.getAddress(),
                    value: '0x1', // 1 wei
                    gas: '0x5208', // 21000 in hex
                    gasPrice: '0x3b9aca00' // 1 gwei in hex
                };
                console.log('🧪 Minimal test transaction:', minimalTx);
                
                try {
                    const result = await this.provider.send('eth_sendTransaction', [minimalTx]);
                    console.log(`✅ eth_sendTransaction SUCCESS: ${result}`);
                } catch (sendError) {
                    console.log(`🔍 eth_sendTransaction FAILED: ${sendError.message}`);
                    console.log(`🔍 Error code: ${sendError.code}`);
                    console.log(`🔍 Error data:`, sendError.data);
                    console.log(`🔍 Full error object:`, sendError);
                }
            }
        } catch (error) {
            console.log(`❌ Transaction testing failed: ${error.message}`);
        }
    }

    /**
     * 📊 Get balance
     */
    async getBalance() {
        if (!this.isConnected || !this.provider || !this.address) {
            return '0';
        }

        try {
            const balance = await this.provider.getBalance(this.address);
            return ethers.formatEther(balance);
        } catch (error) {
            console.error('❌ Failed to get balance:', error);
            return '0';
        }
    }
}

// Create global instance for compatibility
window.realWeb3Modal = new WalletBridge();

// Also expose the class
window.WalletBridge = WalletBridge;

console.log('🌉 Wallet bridge initialized for crash casino');
