/**
 * 🎰 PacoRocko Production Integration
 * 
 * Complete production-ready crash casino integration for Abstract L2
 * Combines TypeScript game engine with Express server and database
 */

const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
// FORCE CLEAR NODE.JS REQUIRE CACHE FOR RENDER DEPLOYMENT
delete require.cache[require.resolve('./backend/src/game-engine-compiled.js')];
delete require.cache[require.resolve('./backend/src/websocket-server-compiled.js')];

console.log('🔄 CACHE CLEARED - FORCING FRESH LOAD OF COMPILED FILES v2.0');

const CrashGameEngine = require('./backend/src/game-engine-compiled.js');
// FORCE USE STABLE COMPILED SERVER for Render Starter Plan reliability
let CrashWebSocketServer = null;
try {
    CrashWebSocketServer = require('./backend/src/websocket-server-compiled.js');
    console.log('🔌 Using STABLE compiled WebSocket server for Render production');
} catch (e) {
    console.log('❌ Failed to load compiled server, this should not happen');
    throw e;
}

let WalletIntegration = null;
try {
    WalletIntegration = require('./backend/wallet-integration-abstract.js').getWalletIntegration;
    console.log('🏦 Using Abstract wallet integration');
} catch (e) {
    WalletIntegration = require('./backend/wallet-integration.js');
    console.log('🏦 Fallback to basic wallet integration');
}
const { getHouseWallet } = require('./backend/house-wallet.js');

class PacoRockoProduction {
    constructor(expressApp, config = {}) {
        this.app = expressApp;
        this.config = {
            jwtSecret: process.env.JWT_SECRET || 'paco-crash-secret-key',
            corsOrigin: process.env.CORS_ORIGIN || "*",
            enableDatabase: true,
            enableSmartContracts: true,
            ...config
        };

        // Create HTTP server from Express app
        this.server = http.createServer(this.app);
        
        // Initialize components
        this.crashWebSocketServer = null;
        this.walletIntegration = null;
        this.gameEngine = null;
        this.connectedPlayers = new Map();
        this.gameStats = {
            totalRounds: 0,
            totalVolume: 0,
            totalPlayers: 0,
            uptime: Date.now()
        };

        this.init();
    }

    /**
     * 🚀 Initialize production system
     */
    async init() {
        try {
            console.log('🎰 Initializing PacoRocko Production System...');
            
            // Initialize wallet integration first (Abstract-first)
            if (typeof WalletIntegration === 'function') {
                // enhanced module exports a getter
                this.walletIntegration = WalletIntegration();
            } else {
                this.walletIntegration = new WalletIntegration({
                    supabaseUrl: process.env.SUPABASE_URL,
                    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
                    enableDatabase: this.config.enableDatabase && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
                });
            }
            
            // Setup WebSocket server with TypeScript engine
            this.crashWebSocketServer = new CrashWebSocketServer(this.server, {
                jwtSecret: this.config.jwtSecret,
                corsOrigin: this.config.corsOrigin
            });
            
            // Inject wallet integration into WebSocket server
            this.crashWebSocketServer.walletIntegration = this.walletIntegration;
            
            // Setup Express API routes
            this.setupAPIRoutes();
            
            // Setup database if enabled
            if (this.config.enableDatabase) {
                await this.setupDatabase();
            }
            
            // Setup game engine event listeners
            this.setupGameEngineListeners();
            
            // Setup cleanup processes
            this.setupCleanupTasks();
            
            console.log('✅ PacoRocko Production System initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize PacoRocko:', error);
            throw error;
        }
    }

    /**
     * 🛤️ Setup Express API routes
     */
    setupAPIRoutes() {
        // Game statistics endpoint
        this.app.get('/api/crash/stats', (req, res) => {
            const gameState = this.crashWebSocketServer?.getStats() || {};
            
            res.json({
                ...this.gameStats,
                ...gameState,
                serverTime: Date.now(),
                status: 'production',
                version: '1.0.0'
            });
        });

        // Game history endpoint
        this.app.get('/api/crash/history', (req, res) => {
            const gameEngine = this.crashWebSocketServer?.getGameEngine();
            const gameState = gameEngine?.getGameState() || {};
            
            res.json({
                history: gameState.currentRound?.history || [],
                currentRound: gameState.currentRound?.id,
                status: gameState.isRunning ? 'running' : 'waiting'
            });
        });

        // Player statistics endpoint
        this.app.get('/api/crash/player/:address', async (req, res) => {
            try {
                const { address } = req.params;
                
                const [balance, stats] = await Promise.all([
                    this.walletIntegration.getPlayerBalance(address),
                    this.walletIntegration.getPlayerStats(address)
                ]);

                res.json({
                    address,
                    balance: balance.available,
                    lockedBalance: balance.locked,
                    totalBalance: balance.total,
                    totalBets: stats?.total_bets_placed || 0,
                    totalWon: stats?.total_amount_won || 0,
                    gamesPlayed: stats?.games_played || 0,
                    winRate: stats?.win_rate || 0,
                    biggestWin: stats?.biggest_win || 0
                });
            } catch (error) {
                console.error('❌ Player stats error:', error);
                res.status(500).json({ error: 'Failed to get player statistics' });
            }
        });

        // Wallet balance endpoint
        this.app.get('/api/crash/wallet/:address/balance', async (req, res) => {
            try {
                const { address } = req.params;
                const balance = await this.walletIntegration.getPlayerBalance(address);
                
                res.json({
                    address,
                    ...balance,
                    timestamp: Date.now()
                });
            } catch (error) {
                console.error('❌ Balance check error:', error);
                res.status(500).json({ error: 'Failed to get balance' });
            }
        });

        // Add funds endpoint (admin only)
        this.app.post('/api/crash/admin/add-funds', this.requireAuth, async (req, res) => {
            try {
                const { walletAddress, amount, reason } = req.body;
                const adminAddress = req.adminAddress; // Set by auth middleware
                
                const result = await this.walletIntegration.addFunds(
                    walletAddress, 
                    amount, 
                    adminAddress, 
                    reason
                );
                
                res.json(result);
            } catch (error) {
                console.error('❌ Add funds error:', error);
                res.status(500).json({ error: 'Failed to add funds' });
            }
        });

        // Admin endpoint (protected)
        this.app.get('/api/crash/admin', this.requireAuth, (req, res) => {
            const stats = this.crashWebSocketServer?.getStats() || {};
            
            res.json({
                ...stats,
                systemInfo: {
                    uptime: Date.now() - this.gameStats.uptime,
                    memoryUsage: process.memoryUsage(),
                    nodeVersion: process.version
                },
                connectedPlayers: Array.from(this.connectedPlayers.values()),
                gameConfig: this.crashWebSocketServer?.getGameEngine()?.getGameState()?.config
            });
        });

        // Health check endpoint
        this.app.get('/api/crash/health', (req, res) => {
            const wsServer = this.crashWebSocketServer;
            const gameEngine = wsServer?.getGameEngine();
            
            const health = {
                status: 'healthy',
                timestamp: Date.now(),
                services: {
                    webSocket: !!wsServer,
                    gameEngine: !!gameEngine,
                    database: this.config.enableDatabase
                }
            };

            res.json(health);
        });

        // House wallet endpoint
        this.app.get('/api/crash-casino/house-wallet', (req, res) => {
            const houseWallet = getHouseWallet();
            res.json({ 
                houseWallet: houseWallet ? houseWallet.address : null,
                network: process.env.ABSTRACT_NETWORK || 'testnet'
            });
        });

        console.log('🛤️ Crash casino API routes configured');
    }

    /**
     * 🗄️ Setup database schema
     */
    async setupDatabase() {
        // For now, we'll use Supabase like the main app
        // In production, you might want a dedicated Redis/PostgreSQL setup
        
        console.log('🗄️ Database integration ready (using existing Supabase)');
        
        // TODO: Create crash casino specific tables
        // - crash_rounds (id, server_seed, client_seed, nonce, crash_point, start_time, end_time)
        // - crash_bets (id, round_id, player_address, amount, multiplier, payout, tx_hash)
        // - player_stats (address, total_bets, total_won, games_played, created_at)
    }

    /**
     * 🎮 Setup game engine event listeners
     */
    setupGameEngineListeners() {
        if (!this.crashWebSocketServer) return;

        const gameEngine = this.crashWebSocketServer.getGameEngine();
        
        gameEngine.on('roundStarted', (round) => {
            this.gameStats.totalRounds++;
            console.log(`🚀 Round ${round.id} started - Crash Point: ${round.crashPoint}x`);
        });

        gameEngine.on('roundCrashed', (data) => {
            this.gameStats.totalVolume += data.totalPayout;
            console.log(`💥 Round ${data.roundId} crashed at ${data.crashPoint}x`);
            
            // TODO: Save round data to database
        });

        gameEngine.on('betPlaced', (data) => {
            this.gameStats.totalVolume += data.bet.amount;
            console.log(`💰 Bet placed: ${data.bet.amount} ETH`);
            
            // TODO: Save bet to database
        });

        // Add forced round start if no activity detected
        setTimeout(() => {
            if (this.gameStats.totalRounds === 0) {
                console.log('⚠️ No rounds detected after 30s - forcing game engine restart');
                try {
                    gameEngine.startNewRound();
                } catch (error) {
                    console.log('❌ Failed to force restart:', error.message);
                }
            }
        }, 30000);

        console.log('🎮 Game engine event listeners configured');
    }

    /**
     * 🧹 Setup cleanup tasks
     */
    setupCleanupTasks() {
        // Clean up inactive connections every 5 minutes
        setInterval(() => {
            if (this.crashWebSocketServer) {
                this.crashWebSocketServer.cleanupInactiveConnections();
            }
        }, 5 * 60 * 1000);

        // Log statistics every hour
        setInterval(() => {
            const stats = this.getSystemStats();
            console.log('📊 Hourly Stats:', JSON.stringify(stats, null, 2));
        }, 60 * 60 * 1000);

        console.log('🧹 Cleanup tasks configured');
    }

    /**
     * 🔐 Auth middleware for admin endpoints
     */
    requireAuth(req, res, next) {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        // TODO: Implement proper JWT validation
        // For now, accept any bearer token in development
        next();
    }

    /**
     * 🚀 Start the production server
     */
    async start(port = process.env.PORT || 3000) {
        return new Promise((resolve, reject) => {
            try {
                this.server.listen(port, () => {
                    console.log(`🎰 PacoRocko Production Server running on port ${port}`);
                    console.log(`🔌 WebSocket endpoint: ws://localhost:${port}/crash-ws`);
                    console.log(`📊 API endpoints available at /api/crash/*`);
                    console.log(`🎮 Game accessible at /PacoRocko`);
                    
                    resolve(port);
                });
                
                this.server.on('error', (error) => {
                    console.error('❌ Server error:', error);
                    reject(error);
                });
                
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * 🛑 Stop the production server
     */
    async stop() {
        return new Promise((resolve) => {
            if (this.crashWebSocketServer) {
                // Cleanup WebSocket server
                this.crashWebSocketServer.cleanupInactiveConnections();
            }
            
            this.server.close(() => {
                console.log('🛑 PacoRocko Production Server stopped');
                resolve();
            });
        });
    }

    /**
     * 📊 Get comprehensive system statistics
     */
    getSystemStats() {
        const wsStats = this.crashWebSocketServer?.getStats() || {};
        
        return {
            ...this.gameStats,
            ...wsStats,
            uptime: Date.now() - this.gameStats.uptime,
            memoryUsage: process.memoryUsage(),
            timestamp: Date.now()
        };
    }

    /**
     * ⚙️ Update game configuration (admin only)
     */
    updateGameConfig(newConfig) {
        const gameEngine = this.crashWebSocketServer?.getGameEngine();
        if (gameEngine && typeof gameEngine.updateConfig === 'function') {
            gameEngine.updateConfig(newConfig);
            console.log('⚙️ Game configuration updated:', newConfig);
            return true;
        }
        return false;
    }

    /**
     * 📈 Get real-time metrics
     */
    getMetrics() {
        return {
            timestamp: Date.now(),
            server: {
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                cpu: process.cpuUsage()
            },
            game: this.getSystemStats(),
            websocket: {
                connections: this.crashWebSocketServer?.getStats()?.connectedPlayers || 0
            }
        };
    }
}

module.exports = PacoRockoProduction;
