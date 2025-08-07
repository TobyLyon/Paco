/**
 * 🔗 Web3 Integration for PacoRocko
 * 
 * Handles wallet connections, smart contract interactions, and blockchain operations
 */

class Web3Integration {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.walletAddress = null;
        this.isConnected = false;
        this.networkId = null;
        this.contract = null;
        
        // Abstract Testnet configuration
        this.ABSTRACT_TESTNET = {
            chainId: '0xAA36A7', // Abstract testnet chain ID (example)
            chainName: 'Abstract Testnet',
            nativeCurrency: {
                name: 'ETH',
                symbol: 'ETH',
                decimals: 18
            },
            rpcUrls: ['https://node.testnet.abs.xyz'], // Example RPC
            blockExplorerUrls: ['https://explorer.testnet.abs.xyz']
        };
        
        // Contract configuration (will be set after deployment)
        this.CONTRACT_ADDRESS = null; // To be set after contract deployment
        this.CONTRACT_ABI = []; // Simplified ABI for demo
        
        this.init();
    }

    /**
     * 🚀 Initialize Web3 integration
     */
    async init() {
        console.log('🔗 Initializing Web3 integration...');
        
        // Check if wallet is already connected
        if (typeof window.ethereum !== 'undefined') {
            try {
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                if (accounts.length > 0) {
                    await this.connectWallet();
                }
            } catch (error) {
                console.log('No previously connected wallet found');
            }
        }
        
        this.setupEventListeners();
    }

    /**
     * 🔌 Setup event listeners
     */
    setupEventListeners() {
        // Connect wallet button
        document.getElementById('connectWalletBtn').addEventListener('click', () => {
            if (this.isConnected) {
                this.showWalletInfo();
            } else {
                this.showWalletModal();
            }
        });

        // Wallet option buttons
        document.getElementById('connectMetamask')?.addEventListener('click', () => {
            this.connectMetaMask();
        });

        document.getElementById('connectWalletConnect')?.addEventListener('click', () => {
            this.connectWalletConnect();
        });

        // Listen for account changes
        if (typeof window.ethereum !== 'undefined') {
            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length === 0) {
                    this.disconnectWallet();
                } else {
                    this.walletAddress = accounts[0];
                    this.updateWalletUI();
                }
            });

            window.ethereum.on('chainChanged', (chainId) => {
                this.networkId = chainId;
                this.checkNetwork();
            });
        }
    }

    /**
     * 🦊 Connect MetaMask wallet
     */
    async connectMetaMask() {
        if (typeof window.ethereum === 'undefined') {
            this.showError('MetaMask is not installed. Please install MetaMask to continue.');
            return false;
        }

        try {
            // Request account access
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            
            if (accounts.length === 0) {
                this.showError('No accounts found. Please check your MetaMask.');
                return false;
            }

            // Initialize provider and signer
            this.provider = new ethers.providers.Web3Provider(window.ethereum);
            this.signer = this.provider.getSigner();
            this.walletAddress = accounts[0];
            this.isConnected = true;

            // Get network info
            const network = await this.provider.getNetwork();
            this.networkId = network.chainId;

            // Check if on correct network
            await this.checkNetwork();

            // Update UI
            this.updateWalletUI();
            this.closeModal('walletModal');

            // Authenticate with game server
            await this.authenticateWithGameServer();

            console.log('✅ MetaMask connected:', this.walletAddress);
            this.showNotification('✅ MetaMask connected successfully!', 'success');

            return true;

        } catch (error) {
            console.error('❌ MetaMask connection failed:', error);
            this.showError('Failed to connect MetaMask: ' + error.message);
            return false;
        }
    }

    /**
     * 🔗 Connect WalletConnect (placeholder)
     */
    async connectWalletConnect() {
        this.showError('WalletConnect integration coming soon! Please use MetaMask for now.');
    }

    /**
     * 🌐 Check if on correct network
     */
    async checkNetwork() {
        if (!this.provider) return;

        try {
            const network = await this.provider.getNetwork();
            
            // For development, we'll accept any network
            // In production, enforce Abstract testnet
            if (network.chainId !== parseInt(this.ABSTRACT_TESTNET.chainId, 16)) {
                console.warn('⚠️ Not on Abstract testnet, but allowing for development');
                
                // Optionally prompt to switch networks
                // await this.switchToAbstractTestnet();
            }

        } catch (error) {
            console.error('❌ Network check failed:', error);
        }
    }

    /**
     * 🔄 Switch to Abstract testnet
     */
    async switchToAbstractTestnet() {
        if (!window.ethereum) return;

        try {
            // Try to switch to the network
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: this.ABSTRACT_TESTNET.chainId }],
            });

        } catch (switchError) {
            // Network doesn't exist, add it
            if (switchError.code === 4902) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [this.ABSTRACT_TESTNET],
                    });
                } catch (addError) {
                    console.error('❌ Failed to add Abstract testnet:', addError);
                    this.showError('Failed to add Abstract testnet to wallet');
                }
            } else {
                console.error('❌ Failed to switch to Abstract testnet:', switchError);
                this.showError('Failed to switch to Abstract testnet');
            }
        }
    }

    /**
     * 🔐 Authenticate with game server
     */
    async authenticateWithGameServer() {
        try {
            // Create a simple JWT token for authentication
            // In production, this should be a signed message from the wallet
            const token = btoa(JSON.stringify({
                address: this.walletAddress,
                timestamp: Date.now()
            }));

            // Send to crash client
            if (window.crashClient) {
                window.crashClient.authenticate(this.walletAddress, token);
            }

        } catch (error) {
            console.error('❌ Authentication failed:', error);
            this.showError('Failed to authenticate with game server');
        }
    }

    /**
     * 💰 Get ETH balance
     */
    async getBalance() {
        if (!this.provider || !this.walletAddress) return '0';

        try {
            const balance = await this.provider.getBalance(this.walletAddress);
            return ethers.utils.formatEther(balance);
        } catch (error) {
            console.error('❌ Failed to get balance:', error);
            return '0';
        }
    }

    /**
     * 🎯 Place bet on smart contract (placeholder)
     */
    async placeBetOnChain(amount) {
        if (!this.signer || !this.CONTRACT_ADDRESS) {
            // For development, simulate the transaction
            return {
                hash: '0x' + Math.random().toString(16).substring(2, 66),
                wait: async () => ({ status: 1 })
            };
        }

        try {
            // In production, interact with actual smart contract
            const contract = new ethers.Contract(
                this.CONTRACT_ADDRESS,
                this.CONTRACT_ABI,
                this.signer
            );

            const tx = await contract.placeBet({
                value: ethers.utils.parseEther(amount.toString())
            });

            return tx;

        } catch (error) {
            console.error('❌ Bet transaction failed:', error);
            throw error;
        }
    }

    /**
     * 🏃‍♂️ Cash out on smart contract (placeholder)
     */
    async cashOutOnChain(roundId, multiplier) {
        if (!this.signer || !this.CONTRACT_ADDRESS) {
            // For development, simulate success
            return { status: 1 };
        }

        try {
            const contract = new ethers.Contract(
                this.CONTRACT_ADDRESS,
                this.CONTRACT_ABI,
                this.signer
            );

            const tx = await contract.cashOut(roundId, multiplier);
            return await tx.wait();

        } catch (error) {
            console.error('❌ Cash out transaction failed:', error);
            throw error;
        }
    }

    /**
     * 🎨 Update wallet UI
     */
    updateWalletUI() {
        const connectBtn = document.getElementById('connectWalletBtn');
        
        if (this.isConnected && this.walletAddress) {
            const shortAddress = `${this.walletAddress.substring(0, 6)}...${this.walletAddress.substring(-4)}`;
            connectBtn.textContent = `🔗 ${shortAddress}`;
            connectBtn.style.background = 'linear-gradient(45deg, #00ff88, #00cc66)';
        } else {
            connectBtn.textContent = '🔗 Connect Wallet';
            connectBtn.style.background = 'linear-gradient(45deg, #FFD700, #FFA500)';
        }
    }

    /**
     * 📱 Show wallet modal
     */
    showWalletModal() {
        document.getElementById('walletModal').style.display = 'flex';
    }

    /**
     * ℹ️ Show wallet info
     */
    showWalletInfo() {
        if (!this.isConnected) return;

        this.getBalance().then(balance => {
            this.showNotification(
                `Wallet: ${this.walletAddress.substring(0, 10)}...\nBalance: ${parseFloat(balance).toFixed(4)} ETH`,
                'info'
            );
        });
    }

    /**
     * 🚪 Disconnect wallet
     */
    disconnectWallet() {
        this.provider = null;
        this.signer = null;
        this.walletAddress = null;
        this.isConnected = false;
        this.networkId = null;
        
        this.updateWalletUI();
        this.showNotification('Wallet disconnected', 'info');
    }

    /**
     * ❌ Close modal
     */
    closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }

    /**
     * 📢 Show notification
     */
    showNotification(message, type = 'info') {
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }

    /**
     * ❌ Show error
     */
    showError(message) {
        this.showNotification(message, 'error');
    }

    /**
     * ✅ Check if wallet is connected
     */
    isWalletConnected() {
        return this.isConnected && this.walletAddress;
    }

    /**
     * 📊 Get wallet info
     */
    getWalletInfo() {
        return {
            address: this.walletAddress,
            isConnected: this.isConnected,
            networkId: this.networkId,
            provider: this.provider
        };
    }
}

// Global instance
window.Web3Integration = Web3Integration;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.web3 = new Web3Integration();
    });
} else {
    window.web3 = new Web3Integration();
}