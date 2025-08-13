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
        
        // CORS FIX: Handle both www and non-www domains
        const allowedOrigins = [
            'https://pacothechicken.xyz',
            'https://www.pacothechicken.xyz',
            'http://localhost:3000',
            'http://localhost:5173'
        ];
        
        // Initialize Socket.IO with proven settings
        this.io = new Server(this.server, {
            cors: {
                origin: allowedOrigins,
                methods: ["GET", "POST"],
                credentials: true
            },
            // Temporarily use default path to debug connection issues
            // path: '/crash-ws',
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

        this.provenEngine.on('playerCashedOut', async (data) => {
            console.log(`💸 Player cashed out: ${data.playerId} @ ${data.multiplier}x`);
            
            // AUTOMATIC PAYOUT: Process blockchain transaction
            if (this.walletIntegration && data.payout > 0) {
                try {
                    console.log(`💰 Processing automatic payout: ${data.payout.toFixed(4)} ETH to ${data.playerId}`);
                    
                    const payoutResult = await this.walletIntegration.processWinnerPayout(
                        data.playerId,        // Player address
                        data.betAmount || 0.001, // Original bet amount
                        data.multiplier,      // Cashout multiplier
                        data.roundId         // Round ID for tracking
                    );
                    
                    if (payoutResult.success) {
                        console.log(`✅ Automatic payout successful: ${payoutResult.txHash}`);
                        
                        // Notify player of successful payout
                        this.io.emit('payoutSuccess', {
                            roundId: data.roundId,
                            playerId: data.playerId,
                            payout: data.payout,
                            txHash: payoutResult.txHash,
                            multiplier: data.multiplier
                        });
                    } else {
                        console.error(`❌ Automatic payout failed: ${payoutResult.error}`);
                        
                        // Notify player of payout failure
                        this.io.emit('payoutFailed', {
                            roundId: data.roundId,
                            playerId: data.playerId,
                            error: payoutResult.error
                        });
                    }
                    
                } catch (error) {
                    console.error('❌ Payout processing error:', error);
                    
                    // Notify player of payout failure
                    this.io.emit('payoutFailed', {
                        roundId: data.roundId,
                        playerId: data.playerId,
                        error: error.message
                    });
                }
            }
            
            // Send cashout event to all clients
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
            
            // Handle betting (old event name)
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
                        payoutMultiplier,
                        walletAddress // Pass player address
                    );
                    
                    if (success) {
                        socket.emit('betSuccess', { amount, payoutMultiplier });
                    }
                    
                } catch (error) {
                    console.error('❌ Bet error:', error.message);
                    socket.emit('error', { message: error.message });
                }
            });

            // Handle betting (new event name from frontend)
            socket.on('place_bet', async (data) => {
                try {
                    const { betAmount, autoPayoutMultiplier, txHash, blockNumber, playerAddress } = data;
                    
                    // Validate bet data
                    if (!betAmount || !playerAddress || !txHash) {
                        socket.emit('error', { message: 'Invalid bet data' });
                        return;
                    }
                    
                    // Use auto payout multiplier or default to high value for manual cashout
                    const payoutMultiplier = autoPayoutMultiplier || 1000.0;
                    
                    console.log(`🎲 Processing bet: ${betAmount} ETH from ${playerAddress} (tx: ${txHash})`);
                    
                    // Store player address on socket for cashouts
                    socket.playerAddress = playerAddress;
                    
                    // Place bet using proven engine with player address
                    const success = this.provenEngine.placeBet(
                        playerAddress,    // Use address as player ID
                        playerAddress.slice(0, 8) + '...', // Short username
                        parseFloat(betAmount), 
                        payoutMultiplier,
                        playerAddress     // Pass player address for payouts
                    );
                    
                    if (success) {
                        socket.emit('betSuccess', { 
                            amount: betAmount, 
                            payoutMultiplier,
                            txHash,
                            playerAddress
                        });
                        console.log(`✅ Bet placed successfully for ${playerAddress}`);
                    }
                    
                } catch (error) {
                    console.error('❌ Bet placement error:', error.message);
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

            // Handle manual cashout (new event name)
            socket.on('cash_out', () => {
                try {
                    // For the new frontend, we need to find the player by their address
                    // Since we're using address as playerId now, this should work
                    const playerAddress = socket.playerAddress || socket.id;
                    
                    console.log(`🏃‍♂️ Manual cashout requested by ${playerAddress}`);
                    
                    const success = this.provenEngine.manualCashout(playerAddress);
                    if (success) {
                        socket.emit('cashout_success', {
                            message: 'Cashed out successfully',
                            multiplier: success.multiplier,
                            payout: success.payout
                        });
                        console.log(`✅ Manual cashout successful for ${playerAddress}`);
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
        this.app.get('/api/crash/health', async (req, res) => {
            const gameState = this.provenEngine?.getGameState() || {};
            
            // Basic health check (always fast)
            const basicHealth = {
                status: 'healthy',
                timestamp: Date.now(),
                services: {
                    provenEngine: !!this.provenEngine,
                    webSocket: !!this.io,
                    database: this.config.enableDatabase
                },
                gameState: gameState,
                version: '3.0.0-proven'
            };
            
            // Comprehensive validation only if requested
            if (req.query.validate === 'true') {
                try {
                    console.log('🔍 Running comprehensive health validation...');
                    
                    // Environment validation
                    const requiredVars = ['HOUSE_WALLET_ADDRESS', 'ABSTRACT_NETWORK', 'CORS_ORIGIN'];
                    const missingVars = requiredVars.filter(v => !process.env[v]);
                    
                    // Database test (with timeout)
                    let dbStatus = 'unknown';
                    try {
                        if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
                            const { createClient } = require('@supabase/supabase-js');
                            const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
                            
                            const { data, error } = await Promise.race([
                                supabase.from('crash_rounds').select('count').limit(1),
                                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
                            ]);
                            
                            dbStatus = error ? `error: ${error.message}` : 'connected';
                        } else {
                            dbStatus = 'missing_env_vars';
                        }
                    } catch (dbError) {
                        dbStatus = `failed: ${dbError.message}`;
                    }
                    
                    // Wallet validation
                    let walletStatus = 'unknown';
                    try {
                        const { getHouseWallet } = require('./backend/house-wallet.js');
                        const wallet = getHouseWallet();
                        walletStatus = wallet ? `loaded: ${wallet.address.slice(0, 8)}...` : 'failed_to_load';
                    } catch (walletError) {
                        walletStatus = `error: ${walletError.message}`;
                    }
                    
                    res.json({
                        ...basicHealth,
                        validation: {
                            environment: {
                                missingVars: missingVars,
                                status: missingVars.length === 0 ? 'ok' : 'incomplete'
                            },
                            database: {
                                status: dbStatus,
                                supabaseConfigured: !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
                            },
                            wallet: {
                                status: walletStatus,
                                networkConfigured: !!process.env.ABSTRACT_NETWORK
                            },
                            deployment: {
                                platform: process.env.RENDER ? 'render' : 'local',
                                nodeVersion: process.version,
                                uptime: Math.floor((Date.now() - this.gameStats.uptime) / 1000)
                            }
                        }
                    });
                    
                } catch (validationError) {
                    res.json({
                        ...basicHealth,
                        validation: {
                            error: validationError.message,
                            status: 'validation_failed'
                        }
                    });
                }
            } else {
                res.json(basicHealth);
            }
        });
        
        // Add global health endpoint for render
        this.app.get('/health', async (req, res) => {
            res.json({
                status: 'ok',
                timestamp: Date.now(),
                message: 'PacoRocko backend is running',
                services: {
                    crash_casino: !!this.provenEngine,
                    websocket: !!this.io,
                    database: this.config.enableDatabase
                }
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
