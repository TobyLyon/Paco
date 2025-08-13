/**
 * 🌐 Abstract L2 Network Configuration
 * 
 * Configuration for Abstract testnet and mainnet
 */

const abstractNetworks = {
    testnet: {
        chainId: 11124, // Abstract Testnet
        name: 'Abstract Testnet',
        rpcUrl: 'https://api.testnet.abs.xyz',
        wsUrl: 'wss://api.testnet.abs.xyz',
        explorer: 'https://explorer.testnet.abs.xyz',
        nativeCurrency: {
            name: 'ETH',
            symbol: 'ETH',
            decimals: 18
        }
    },
    mainnet: {
        chainId: 2741, // Abstract Mainnet
        name: 'Abstract',
        rpcUrl: process.env.ABSTRACT_RPC_URL || 'https://snowy-restless-film.abstract-mainnet.quiknode.pro/0d86d78bd448a138a16e65ee68b783a6d41bde5c/',
        alternativeRpcUrls: ['https://api.mainnet.abs.xyz'],
        wsUrl: 'wss://api.mainnet.abs.xyz', 
        explorer: 'https://abscan.org',
        nativeCurrency: {
            name: 'ETH',
            symbol: 'ETH',
            decimals: 18
        }
    }
};

// Configuration
const config = {
    // Network selection (mainnet for production)
    network: process.env.ABSTRACT_NETWORK || 'mainnet',
    
    // House wallet configuration (DO NOT COMMIT PRIVATE KEY)
    houseWallet: {
        address: process.env.HOUSE_WALLET_ADDRESS || '',
        privateKey: process.env.HOUSE_WALLET_PRIVATE_KEY || ''
    },
    
    // Game configuration - INDUSTRY STANDARD SETTINGS
    game: {
        minBet: 0.001, // 0.001 ETH minimum
        maxBet: 10.0,  // 10 ETH maximum  
        houseEdge: 0.01, // 1% house edge (industry standard for crash games)
        maxMultiplier: 1000.0, // Standard 1000x max for crash games
        autoWithdrawThreshold: 100, // Auto withdraw to cold wallet at 100 ETH
        hotWalletMaxBalance: 50 // Keep max 50 ETH in hot wallet
    },
    
    // Contract addresses (to be deployed)
    contracts: {
        crashCasino: process.env.CRASH_CASINO_CONTRACT || '',
        escrow: process.env.ESCROW_CONTRACT || ''
    },
    
    // Security settings
    security: {
        maxPendingBets: 100,
        rateLimitPerUser: 10, // Max 10 bets per minute
        requireSignature: true,
        minConfirmations: 1
    }
};

// Get current network configuration
config.currentNetwork = abstractNetworks[config.network];

// Validate configuration
function validateConfig() {
    if (!config.houseWallet.address) {
        console.warn('⚠️  HOUSE_WALLET_ADDRESS not configured');
    }
    if (!config.houseWallet.privateKey) {
        console.warn('⚠️  HOUSE_WALLET_PRIVATE_KEY not configured');
    }
    if (!config.currentNetwork) {
        throw new Error(`Invalid network: ${config.network}`);
    }
}

module.exports = {
    config,
    abstractNetworks,
    validateConfig
};
