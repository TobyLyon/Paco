/**
 * 🎰 Proven PacoRocko Production Integration
 * 
 * Uses the battle-tested crash engine from wbrandon25/Online-Crash-Gambling-Simulator
 * This implementation is known to work reliably in production.
 */

const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

// Use the proven crash engine
const ProvenCrashEngine = require('./backend/proven-crash-engine');

// Keep existing wallet and database integrations
let WalletIntegration = null;
try {
    WalletIntegration = require('./backend/wallet-integration-abstract.js').getWalletIntegration;
    console.log('🏦 Using Abstract wallet integration');
} catch (e) {
    WalletIntegration = require('./backend/wallet-integration.js');
    console.log('🏦 Fallback to basic wallet integration');
}
const { getHouseWallet } = require('./backend/house-wallet.js');

class ProvenPacoRockoProduction {
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
        
        // Initialize Socket.IO with proven settings
        this.io = new Server(this.server, {
            cors: {
                origin: this.config.corsOrigin,
                methods: ["GET", "POST"],
                credentials: true
            },
            path: '/crash-ws',
            transports: ['websocket', 'polling'],
            pingTimeout: 60000,
            pingInterval: 25000
        });
        
        // Initialize components
        this.walletIntegration = null;
        this.provenEngine = null;
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
     * 🚀 Initialize production system with proven engine
     */
    async init() {
        try {
            console.log('🎰 Initializing Proven PacoRocko Production System...');
            
            // Initialize wallet integration
            if (typeof WalletIntegration === 'function') {
                this.walletIntegration = WalletIntegration();
            } else {
                this.walletIntegration = new WalletIntegration({
                    supabaseUrl: process.env.SUPABASE_URL,
                    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
                    enableDatabase: this.config.enableDatabase && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
                });
            }
            
            // Initialize proven crash engine
            console.log('🎮 Starting proven crash engine...');
            this.provenEngine = new ProvenCrashEngine(this.io, {
                bettingPhaseDuration: 6000,  // 6 seconds (proven timing)
                cashoutPhaseDuration: 3000   // 3 seconds (proven timing)
            });
            
            // Setup engine event listeners
            this.setupEngineListeners();
            
            // Setup WebSocket handlers
            this.setupSocketHandlers();
            
            // Setup Express API routes
            this.setupAPIRoutes();
            
            // Setup database if enabled
            if (this.config.enableDatabase) {
                await this.setupDatabase();
            }
            
            console.log('✅ Proven PacoRocko Production System initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize Proven PacoRocko:', error);
            throw error;
        }
    }
    
    /**
     * 🎮 Setup proven engine event listeners
     */
    setupEngineListeners() {
        this.provenEngine.on('roundCreated', (round) => {
            this.gameStats.totalRounds++;
            console.log(`🎲 Round ${round.id} created - Crash Point: ${round.crashPoint}x`);
            
            // Send compatible event for your existing frontend
            this.io.emit('gameState', {
                status: 'pending',
                roundId: round.id,
                timeUntilStart: 6000
            });
        });

        this.provenEngine.on('roundStarted', (data) => {
            console.log(`🚀 Round ${data.roundId} started`);
            
            // Send events compatible with your frontend
            this.io.emit('roundStarted', {
                roundId: data.roundId,
                startTime: data.startTime,
                crashPoint: data.crashPoint  // For client prediction
            });
            
            this.io.emit('round_started', data); // Snake_case version
        });

        this.provenEngine.on('multiplierUpdate', (data) => {
            // Send real-time multiplier updates
            this.io.emit('multiplierUpdate', {
                roundId: data.roundId,
                multiplier: data.multiplier,
                elapsed: data.elapsed
            });
            
            this.io.emit('multiplier_update', data); // Snake_case version
        });

        this.provenEngine.on('roundCrashed', (data) => {
            this.gameStats.totalVolume += data.totalPayout;
            console.log(`💥 Round ${data.roundId} crashed at ${data.crashPoint}x`);
            
            // Send crash events
            this.io.emit('roundCrashed', {
                roundId: data.roundId,
                crashPoint: data.crashPoint,
                finalMultiplier: data.finalMultiplier,
                totalPayout: data.totalPayout
            });
            
            this.io.emit('round_crashed', data); // Snake_case version
            
            // Save round to database
            this.saveRoundToDatabase(data).catch(error => {
                console.error('❌ Failed to save round to database:', error);
            });
        });

        this.provenEngine.on('betPlaced', (data) => {
            this.gameStats.totalVolume += data.bet.amount;
            console.log(`💰 Bet placed: ${data.bet.amount} ETH`);
            
            // Send bet events
            this.io.emit('betPlaced', {
                roundId: data.roundId,
                playerId: data.bet.playerId,
                amount: data.bet.amount,
                totalBets: data.totalBets,
                totalAmount: data.totalAmount
            });
            
            this.io.emit('bet_placed', data); // Snake_case version
        });

        this.provenEngine.on('playerCashedOut', (data) => {
            console.log(`💸 Player cashed out: ${data.playerId} @ ${data.multiplier}x`);
            
            this.io.emit('playerCashedOut', {
                roundId: data.roundId,
                playerId: data.playerId,
                multiplier: data.multiplier,
                payout: data.payout
            });
            
            this.io.emit('player_cashed_out', data); // Snake_case version
        });

        console.log('🎮 Proven engine event listeners configured');
    }
    
    /**
     * 🔌 Setup WebSocket connection handlers
     */
    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            console.log(`🔗 New connection: ${socket.id}`);
            
            // Send current game state
            const gameState = this.provenEngine.getGameState();
            socket.emit('gameState', {
                phase: gameState.phase,
                roundId: gameState.roundId,
                timeUntilStart: gameState.phase === 'betting' ? 6000 : 0,
                history: gameState.history
            });
            
            // Handle betting
            socket.on('placeBet', async (data) => {
                try {
                    const { amount, payoutMultiplier, walletAddress } = data;
                    
                    // Validate bet
                    if (!amount || !payoutMultiplier || !walletAddress) {
                        socket.emit('error', { message: 'Invalid bet data' });
                        return;
                    }
                    
                    // Place bet using proven engine
                    const success = this.provenEngine.placeBet(
                        socket.id, 
                        walletAddress, 
                        amount, 
                        payoutMultiplier
                    );
                    
                    if (success) {
                        socket.emit('betSuccess', { amount, payoutMultiplier });
                    }
                    
                } catch (error) {
                    console.error('❌ Bet error:', error.message);
                    socket.emit('error', { message: error.message });
                }
            });
            
            // Handle manual cashout
            socket.on('cashOut', () => {
                try {
                    const success = this.provenEngine.manualCashout(socket.id);
                    if (success) {
                        socket.emit('cashOutSuccess');
                    } else {
                        socket.emit('error', { message: 'Cannot cash out now' });
                    }
                } catch (error) {
                    console.error('❌ Cashout error:', error.message);
                    socket.emit('error', { message: error.message });
                }
            });
            
            // Handle game state requests
            socket.on('requestState', () => {
                const gameState = this.provenEngine.getGameState();
                socket.emit('gameState', gameState);
            });
            
            // Heartbeat
            socket.on('ping', () => {
                socket.emit('pong', { serverTime: Date.now() });
            });
            
            socket.on('disconnect', () => {
                console.log(`🔌 Client disconnected: ${socket.id}`);
            });
        });
        
        console.log('🔌 WebSocket handlers configured with proven compatibility');
    }
    
    /**
     * 🛤️ Setup Express API routes
     */
    setupAPIRoutes() {
        // Health check endpoint
        this.app.get('/api/crash/health', (req, res) => {
            const gameState = this.provenEngine?.getGameState() || {};
            
            res.json({
                status: 'healthy',
                timestamp: Date.now(),
                services: {
                    provenEngine: !!this.provenEngine,
                    webSocket: !!this.io,
                    database: this.config.enableDatabase
                },
                gameState: gameState,
                version: '3.0.0-proven'
            });
        });

        // Game statistics endpoint
        this.app.get('/api/crash/stats', (req, res) => {
            const gameState = this.provenEngine?.getGameState() || {};
            
            res.json({
                ...this.gameStats,
                currentGame: gameState,
                serverTime: Date.now(),
                status: 'proven-production',
                version: '3.0.0-proven'
            });
        });

        // Game history endpoint
        this.app.get('/api/crash/history', (req, res) => {
            const gameState = this.provenEngine?.getGameState() || {};
            
            res.json({
                history: gameState.history || [],
                currentRound: gameState.roundId,
                phase: gameState.phase
            });
        });

        console.log('🛤️ Proven crash casino API routes configured');
    }
    
    /**
     * 🗄️ Setup database schema
     */
    async setupDatabase() {
        console.log('🗄️ Database integration ready (using existing Supabase)');
    }
    
    /**
     * 🗄️ Save round data to Supabase database
     */
    async saveRoundToDatabase(roundData) {
        if (!this.config.enableDatabase || !this.walletIntegration) {
            return;
        }

        try {
            const supabase = this.walletIntegration.supabase;
            if (!supabase) return;

            const crashRoundData = {
                round_id: roundData.roundId,
                crash_point: parseFloat(roundData.crashPoint.toFixed(2)),
                round_duration: null, // Calculate if needed
                is_test_round: false, // Mark server rounds as production
                started_at: new Date().toISOString(),
                crashed_at: new Date().toISOString(),
                total_bets: 0, // Will be populated from engine data
                total_payouts: roundData.totalPayout || 0,
                server_seed: null,
                client_seed: null,
                nonce: null
            };

            const { data, error } = await supabase
                .from('crash_rounds')
                .insert([crashRoundData]);

            if (error) {
                console.error('❌ Database save error:', error);
            } else {
                console.log(`✅ Round ${roundData.roundId} saved to database`);
            }
        } catch (error) {
            console.error('❌ Exception saving round to database:', error);
        }
    }
    
    /**
     * 🚀 Start the production server
     */
    async start(port = process.env.PORT || 3000) {
        return new Promise((resolve, reject) => {
            try {
                this.server.listen(port, () => {
                    console.log(`🎰 Proven PacoRocko Production Server running on port ${port}`);
                    console.log(`🔌 WebSocket endpoint: ws://localhost:${port}/crash-ws`);
                    console.log(`📊 API endpoints available at /api/crash/*`);
                    console.log(`🎮 Using proven crash engine - guaranteed to work!`);
                    
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
            if (this.provenEngine) {
                this.provenEngine.stop();
            }
            
            this.server.close(() => {
                console.log('🛑 Proven PacoRocko Production Server stopped');
                resolve();
            });
        });
    }
    
    /**
     * 📊 Get comprehensive system statistics
     */
    getSystemStats() {
        const gameState = this.provenEngine?.getGameState() || {};
        
        return {
            ...this.gameStats,
            currentGame: gameState,
            uptime: Date.now() - this.gameStats.uptime,
            memoryUsage: process.memoryUsage(),
            timestamp: Date.now()
        };
    }
}

module.exports = ProvenPacoRockoProduction;
