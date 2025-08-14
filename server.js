/**
 * 🎰 PacoRocko Backend Server Entry Point
 * 
 * This is the main server file for Render deployment
 * Enhanced with environment fixes for perfect local/production parity
 */

const express = require('express');
const path = require('path');
const cors = require('cors');

// 🔧 Apply Render Environment Fixes First
console.log('🎯 Applying Render environment fixes...');
const RenderEnvironmentFixer = require('./render-environment-fixes.js');
const fixer = new RenderEnvironmentFixer();

// Apply critical fixes synchronously
fixer.clearRequireCache();
fixer.fixEnvironmentVariables();

console.log('✅ Environment fixes applied, continuing startup...');

// Import the UNIFIED crash casino implementation (perfect sync solution)
const UnifiedPacoRockoProduction = require('./crash-casino/unified-production-integration.js');

// Create Express app
const app = express();

// Basic middleware
app.use(cors());
app.use(express.json());

// Serve static files from root directory for frontend
app.use(express.static('.', {
    index: 'index.html',
    extensions: ['html', 'css', 'js', 'png', 'jpg', 'gif', 'ico']
}));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        service: 'PacoRocko Backend',
        timestamp: new Date().toISOString()
    });
});

// Provably fair proof endpoint
app.get('/proof/:roundId', async (req, res) => {
    try {
        const roundId = String(req.params.roundId)
        const engine = crashCasino?.crashEngine
        const wallet = crashCasino?.walletIntegration
        const supabase = wallet?.supabase
        let record = null
        if (supabase) {
            const { data } = await supabase
              .from('rounds')
              .select('*')
              .eq('id', roundId)
              .limit(1)
              .single()
            record = data
        }
        const serverSeed = record?.seed_revealed || engine?.currentServerSeed || null
        const commitHash = record?.commit_hash || engine?.currentCommit || null
        if (!serverSeed || !commitHash) {
            return res.status(404).json({ error: 'Round not found or not revealed' })
        }
        // Compute crash multiplier same as engine
        const { keccak256 } = require('ethers')
        const hash = keccak256(`0x${serverSeed}`)
        const bigint = BigInt(hash)
        const r = Number(bigint % (2n ** 52n)) / Number(2n ** 52n)
        const houseEdge = 0.01
        const raw = Math.floor((100 * (1 - houseEdge)) / Math.max(r, 1e-12)) / 100
        const m = Math.round(Math.max(1.0, Math.min(raw, 1000.0)) * 100) / 100
        res.json({
            roundId,
            serverSeed,
            commitHash,
            keccakOfSeed: hash,
            crashMultiplier: m,
            steps: [
                'hash = keccak256(serverSeed)',
                'r = (hash mod 2^52) / 2^52',
                'm = floor((100 * (1 - 0.01)) / max(r, 1e-12)) / 100',
                'm = clamp(m, 1.0, 1000.0) then round to 2 decimals'
            ]
        })
    } catch (e) {
        res.status(500).json({ error: e?.message || 'Internal error' })
    }
})

// Simple operator auth middleware
function requireAdmin(req, res, next) {
    const key = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '')
    if (!process.env.ADMIN_API_KEY || key !== process.env.ADMIN_API_KEY) {
        return res.status(401).json({ error: 'unauthorized' })
    }
    next()
}

// Operator: pause/unpause engine
app.post('/admin/pause', requireAdmin, (req, res) => {
    try {
        crashCasino?.crashEngine?.pause()
        res.json({ paused: true })
    } catch (e) {
        res.status(500).json({ error: e?.message })
    }
})

app.post('/admin/unpause', requireAdmin, (req, res) => {
    try {
        crashCasino?.crashEngine?.resume()
        res.json({ paused: false })
    } catch (e) {
        res.status(500).json({ error: e?.message })
    }
})

// Operator: limits
app.get('/admin/limits', requireAdmin, async (req, res) => {
    try {
        const supabase = crashCasino?.walletIntegration?.supabase
        if (!supabase) return res.json({})
        const { data } = await supabase.from('limits').select('*').order('created_at', { ascending: false }).limit(1)
        res.json(data?.[0] || {})
    } catch (e) {
        res.status(500).json({ error: e?.message })
    }
})

app.post('/admin/limits', requireAdmin, async (req, res) => {
    try {
        const supabase = crashCasino?.walletIntegration?.supabase
        if (!supabase) return res.status(400).json({ error: 'db unavailable' })
        const { data, error } = await supabase.from('limits').insert(req.body).select()
        if (error) return res.status(400).json({ error: error.message })
        res.json(data?.[0] || {})
    } catch (e) {
        res.status(500).json({ error: e?.message })
    }
})

// Operator: hot wallet balance
app.get('/admin/hot', requireAdmin, async (req, res) => {
    try {
        const info = await crashCasino?.walletIntegration?.getHouseInfo()
        
        // Add hot wallet balance check
        const { createPublicClient, http } = require('viem');
        const { abstract } = require('./src/lib/abstractChains');
        
        const publicClient = createPublicClient({
            chain: abstract,
            transport: http(abstract.rpcUrls.default.http[0]),
        });
        
        const hotWalletAddress = process.env.HOT_WALLET_ADDRESS || '0x02B4bFbA6D16308F5B40A5DF1f136C9472da52FF';
        const hotBalance = await publicClient.getBalance({ address: hotWalletAddress });
        
        const response = {
            ...info,
            hotWallet: {
                address: hotWalletAddress,
                balance: hotBalance.toString(),
                balanceETH: (Number(hotBalance) / 1e18).toFixed(6)
            }
        };
        
        res.json(response);
    } catch (e) {
        res.status(500).json({ error: e?.message })
    }
})

// Operator: manual payout/transfer
app.post('/admin/transfer', requireAdmin, async (req, res) => {
    try {
        const { to, amount_wei } = req.body || {}
        if (!to || !amount_wei) return res.status(400).json({ error: 'to and amount_wei required' })
        const receipt = await crashCasino?.walletIntegration?.houseWallet?.processPayout(to, BigInt(amount_wei), 'manual')
        res.json({ txHash: receipt?.hash, explorer: receipt?.hash ? `https://abscan.org/tx/${receipt.hash}` : null })
    } catch (e) {
        res.status(500).json({ error: e?.message })
    }
})

// Balance System API Routes
const { BalanceAPI } = require('./crash-casino/backend/balance-api');
const balanceAPI = new BalanceAPI(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Get user balance
app.get('/api/balance/:address', async (req, res) => {
    try {
        const balance = await balanceAPI.getBalance(req.params.address);
        res.json({ balance });
    } catch (error) {
        console.error('Balance check error:', error);
        res.status(500).json({ error: 'Could not fetch balance' });
    }
});

// Place bet with balance
app.post('/api/bet/balance', async (req, res) => {
    try {
        const { playerAddress, amount } = req.body;
        const result = await balanceAPI.placeBetWithBalance(playerAddress, amount);
        res.json(result);
    } catch (error) {
        console.error('Balance bet error:', error);
        res.status(400).json({ error: error.message });
    }
});

// Check for new deposits
app.get('/api/deposits/check/:address', async (req, res) => {
    try {
        const newDeposits = await balanceAPI.checkNewDeposits(req.params.address);
        res.json({ newDeposits });
    } catch (error) {
        console.error('Deposit check error:', error);
        res.status(500).json({ error: 'Could not check deposits' });
    }
});

// Process withdrawal
app.post('/api/withdraw', async (req, res) => {
    try {
        const { playerAddress, amount } = req.body;
        const walletIntegration = require('./crash-casino/backend/wallet-integration-abstract.js').getWalletIntegration();
        const result = await balanceAPI.processWithdrawal(playerAddress, amount, walletIntegration);
        res.json(result);
    } catch (error) {
        console.error('Withdrawal error:', error);
        res.status(400).json({ error: error.message });
    }
});

// Register deposit for attribution
app.post('/api/deposit/register', async (req, res) => {
    try {
        const { depositId, txHash, walletAddress, amount } = req.body;
        
        // Store pending deposit for attribution
        const pendingDeposit = {
            depositId,
            txHash,
            walletAddress: walletAddress.toLowerCase(),
            amount: parseFloat(amount),
            timestamp: new Date().toISOString(),
            status: 'pending'
        };
        
        // Store in a pending deposits cache or database
        // The deposit indexer will pick this up and attribute it properly
        console.log(`📝 Registered pending deposit:`, pendingDeposit);
        
        // Could store in Redis or database for deposit indexer to process
        // For now, just log it - the indexer will detect by transaction data
        
        res.json({ success: true });
    } catch (error) {
        console.error('Deposit registration error:', error);
        res.status(400).json({ error: error.message });
    }
});

// Three-wallet monitoring endpoint
app.get('/admin/wallet-status', requireAdmin, async (req, res) => {
    try {
        const { createPublicClient, http } = require('viem');
        const { abstract } = require('./src/lib/abstractChains');
        
        const publicClient = createPublicClient({
            chain: abstract,
            transport: http(abstract.rpcUrls.default.http[0]),
        });
        
        const hotWalletAddress = process.env.HOT_WALLET_ADDRESS || '0x02B4bFbA6D16308F5B40A5DF1f136C9472da52FF';
        const houseWalletAddress = process.env.HOUSE_WALLET_ADDRESS || '0x1f8B1c4D05eF17Ebaa1E572426110146691e6C5a';
        const safeWalletAddress = process.env.SAFE_WALLET_ADDRESS || '0x7A4223A412e455821c4D9480A80fcC0624924c27';
        
        const [hotBalance, houseBalance, safeBalance] = await Promise.all([
            publicClient.getBalance({ address: hotWalletAddress }),
            publicClient.getBalance({ address: houseWalletAddress }),
            publicClient.getBalance({ address: safeWalletAddress })
        ]);
        
        const hotETH = Number(hotBalance) / 1e18;
        const houseETH = Number(houseBalance) / 1e18;
        const safeETH = Number(safeBalance) / 1e18;
        const totalETH = hotETH + houseETH + safeETH;
        
        // Operational recommendations
        let recommendations = [];
        if (hotETH < 0.5) recommendations.push('🚨 HOT WALLET LOW - Fund from house wallet');
        if (hotETH > 5.0) recommendations.push('💰 HOT WALLET HIGH - Transfer excess to safe wallet');
        if (houseETH > 10.0) recommendations.push('🏦 HOUSE WALLET HIGH - Consider transferring to safe wallet');
        if (recommendations.length === 0) recommendations.push('✅ All wallet balances within recommended ranges');
        
        res.json({
            wallets: {
                hot: {
                    address: hotWalletAddress,
                    balance: hotBalance.toString(),
                    balanceETH: hotETH.toFixed(6),
                    purpose: 'Operational (payouts/withdrawals)',
                    recommended: '0.5 - 5.0 ETH',
                    status: hotETH < 0.5 ? 'LOW' : hotETH > 5.0 ? 'HIGH' : 'OK'
                },
                house: {
                    address: houseWalletAddress,
                    balance: houseBalance.toString(),
                    balanceETH: houseETH.toFixed(6),
                    purpose: 'Cold storage (deposits only)',
                    recommended: 'Transfer periodically to hot/safe',
                    status: houseETH > 10.0 ? 'HIGH' : 'OK'
                },
                safe: {
                    address: safeWalletAddress,
                    balance: safeBalance.toString(),
                    balanceETH: safeETH.toFixed(6),
                    purpose: 'Deep cold storage (excess funds)',
                    recommended: 'Long-term holdings',
                    status: 'SECURE'
                }
            },
            summary: {
                totalBalance: totalETH.toFixed(6) + ' ETH',
                distribution: {
                    hot: ((hotETH / totalETH) * 100).toFixed(1) + '%',
                    house: ((houseETH / totalETH) * 100).toFixed(1) + '%',
                    safe: ((safeETH / totalETH) * 100).toFixed(1) + '%'
                }
            },
            recommendations
        });
    } catch (error) {
        console.error('Wallet status check error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Legacy hot wallet endpoint (for backwards compatibility)
app.get('/admin/hot-wallet', requireAdmin, async (req, res) => {
    try {
        // Redirect to new comprehensive endpoint
        const response = await fetch(`${req.protocol}://${req.get('host')}/admin/wallet-status`, {
            headers: { ...req.headers }
        });
        const data = await response.json();
        
        // Return just hot wallet info for legacy compatibility
        res.json({
            hotWallet: data.wallets.hot,
            recommendation: data.recommendations[0] || 'Status OK'
        });
    } catch (error) {
        console.error('Legacy hot wallet check error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Initialize crash casino backend
console.log('🎰 Initializing PacoRocko crash casino backend...');

// Start the server
const PORT = process.env.PORT || 3001;

console.log('🎯 Creating UNIFIED PacoRocko Production instance...');
const crashCasino = new UnifiedPacoRockoProduction(app, {
    jwtSecret: process.env.JWT_SECRET || 'paco-crash-unified-key-2025',
    corsOrigin: process.env.CORS_ORIGIN || "*",
    enableDatabase: true,
    enableSmartContracts: true
});

console.log('🚀 Starting UNIFIED PacoRocko backend server...');
crashCasino.start(PORT).then(async () => {
    console.log(`✅ UNIFIED PacoRocko backend running on port ${PORT}`);
    console.log(`🔗 WebSocket endpoint: wss://paco-x57j.onrender.com`);
    console.log(`🏥 Health check: https://paco-x57j.onrender.com/health`);
    console.log(`🎯 UNIFIED crash casino ready for perfect sync!`);
    console.log('');
    console.log('🎯 Using server-authority pattern with client-prediction');
    console.log('🎯 ALL sync issues resolved with proven reference implementation!');
    
    // 🔧 Run comprehensive environment validation
    console.log('\n🔍 Running post-startup validation...');
    try {
        const success = await fixer.runAllFixes();
        if (success) {
            console.log('🎉 All systems validated and working!');
        } else {
            console.log('⚠️ Some issues detected, but server is running');
        }
        fixer.generateEnvironmentReport();
    } catch (validationError) {
        console.error('⚠️ Validation error (non-critical):', validationError.message);
    }
}).catch((error) => {
    console.error('❌ Failed to start server:', error);
    console.error('❌ Error details:', error.stack);
    
    // 🔧 Generate diagnostic report on failure
    console.log('\n📋 Generating diagnostic report...');
    fixer.generateEnvironmentReport();
    
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('🛑 Shutting down PacoRocko backend...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('🛑 Shutting down PacoRocko backend...');
    process.exit(0);
});
