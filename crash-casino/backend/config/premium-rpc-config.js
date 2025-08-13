/**
 * 🏆 Premium RPC Configuration for Abstract Network
 * 
 * Configuration for paid RPC providers with better reliability
 */

const premiumRpcProviders = {
    // 🥇 ALCHEMY - RECOMMENDED (Enterprise grade)
    alchemy: {
        name: 'Alchemy',
        mainnet: {
            url: `https://abstract-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
            wsUrl: `wss://abstract-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
            features: ['enhanced-apis', 'webhooks', 'analytics', 'sla-99.9%'],
            pricing: 'Free: 300M req/month, Paid: $199+/month',
            rateLimits: {
                free: '330 req/sec',
                paid: 'Unlimited'
            }
        },
        testnet: {
            url: `https://abstract-testnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
            wsUrl: `wss://abstract-testnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
        }
    },

    // 🥈 QUICKNODE - EXCELLENT CHOICE (Fast setup, good docs)
    quicknode: {
        name: 'QuickNode',
        mainnet: {
            url: process.env.QUICKNODE_ABSTRACT_MAINNET_URL, // Custom endpoint from QuickNode dashboard
            wsUrl: process.env.QUICKNODE_ABSTRACT_MAINNET_WSS,
            features: ['global-network', 'websockets', 'analytics', 'add-ons'],
            pricing: 'Starting $9/month',
            rateLimits: {
                starter: '25 req/sec',
                pro: '200 req/sec'
            }
        },
        testnet: {
            url: process.env.QUICKNODE_ABSTRACT_TESTNET_URL,
            wsUrl: process.env.QUICKNODE_ABSTRACT_TESTNET_WSS
        }
    },

    // 🥉 ONFINALITY - COST EFFECTIVE
    onfinality: {
        name: 'OnFinality',
        mainnet: {
            url: process.env.ONFINALITY_ABSTRACT_MAINNET_URL, // Private endpoint
            features: ['private-endpoints', 'high-performance', 'analytics'],
            pricing: 'Free: 500k req/day, Paid: $50+/month',
            rateLimits: {
                free: '10 req/sec',
                paid: '100+ req/sec'
            }
        }
    },

    // 🔄 ANKR - PAY AS YOU GO
    ankr: {
        name: 'Ankr',
        mainnet: {
            url: `https://rpc.ankr.com/abstract/${process.env.ANKR_API_KEY}`,
            features: ['pay-per-request', 'sla-guarantees', 'debugging-apis'],
            pricing: 'Pay-per-request, no monthly minimum'
        }
    }
};

// Current configuration - switch between providers easily
const config = {
    // 🎯 PRODUCTION RECOMMENDATION: Use Alchemy for best reliability
    provider: process.env.RPC_PROVIDER || 'alchemy', // 'alchemy', 'quicknode', 'onfinality', 'ankr'
    
    // Fallback to free endpoints if API keys not configured
    fallbackToFree: true,
    
    // Current provider settings
    get currentProvider() {
        const provider = premiumRpcProviders[this.provider];
        if (!provider) {
            throw new Error(`Unknown RPC provider: ${this.provider}`);
        }
        return provider;
    },

    // Get mainnet URL with fallback
    get mainnetUrl() {
        const provider = this.currentProvider;
        if (provider.mainnet?.url && this.hasRequiredEnvVars()) {
            return provider.mainnet.url;
        }
        
        // Fallback to free endpoints
        if (this.fallbackToFree) {
            console.warn(`⚠️ ${provider.name} API key not configured, falling back to free RPC`);
            return 'https://api.mainnet.abs.xyz';
        }
        
        throw new Error(`${provider.name} API key required but not configured`);
    },

    // Check if required environment variables are set
    hasRequiredEnvVars() {
        switch (this.provider) {
            case 'alchemy':
                return !!process.env.ALCHEMY_API_KEY;
            case 'quicknode':
                return !!process.env.QUICKNODE_ABSTRACT_MAINNET_URL;
            case 'onfinality':
                return !!process.env.ONFINALITY_ABSTRACT_MAINNET_URL;
            case 'ankr':
                return !!process.env.ANKR_API_KEY;
            default:
                return false;
        }
    },

    // Get setup instructions for chosen provider
    getSetupInstructions() {
        const provider = this.currentProvider;
        const instructions = {
            alchemy: `
🏆 ALCHEMY SETUP (RECOMMENDED):
1. Sign up at: https://alchemy.com
2. Create new Abstract app
3. Copy API key from dashboard
4. Set environment variable: ALCHEMY_API_KEY=your_api_key_here
5. URL will be: https://abstract-mainnet.g.alchemy.com/v2/YOUR_API_KEY
`,
            quicknode: `
🚀 QUICKNODE SETUP:
1. Sign up at: https://quicknode.com
2. Create Abstract Network endpoint
3. Copy HTTP and WSS URLs from dashboard
4. Set environment variables:
   QUICKNODE_ABSTRACT_MAINNET_URL=your_http_url
   QUICKNODE_ABSTRACT_MAINNET_WSS=your_wss_url
`,
            onfinality: `
💰 ONFINALITY SETUP:
1. Sign up at: https://onfinality.io
2. Create Abstract Network private endpoint
3. Copy private endpoint URL
4. Set environment variable: ONFINALITY_ABSTRACT_MAINNET_URL=your_url
`,
            ankr: `
⚡ ANKR SETUP:
1. Sign up at: https://ankr.com
2. Get API key from dashboard
3. Set environment variable: ANKR_API_KEY=your_api_key
4. Pay-per-request pricing automatically applied
`
        };
        
        return instructions[this.provider] || 'No setup instructions available';
    }
};

module.exports = {
    premiumRpcProviders,
    config
};
