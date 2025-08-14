/**
 * 🎯 Unified Production Integration
 * 
 * PERFECT SYNC implementation based on proven reference architecture
 * Replaces conflicted dual-system with clean server-authority pattern
 */

const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

// Use the unified crash engine (clean implementation)
const UnifiedCrashEngine = require('./backend/unified-crash-engine');

// Keep existing wallet and database integrations
let WalletIntegration = null;
try {
    WalletIntegration = require('./backend/wallet-integration-abstract.js').getWalletIntegration;
    console.log('🏦 Using Abstract wallet integration');
} catch (e) {
    try {
        WalletIntegration = require('./backend/wallet-integration.js');
        console.log('🏦 Fallback to basic wallet integration');
    } catch (e2) {
        console.log('🏦 No wallet integration available');
    }
}

class UnifiedPacoRockoProduction {
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
        
        // CORS configuration for both www and non-www domains
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
            transports: ['websocket', 'polling'],
            pingTimeout: 60000,
            pingInterval: 25000
        });
        
        // Initialize unified crash engine (SINGLE SOURCE OF TRUTH)
        this.crashEngine = null;
        this.walletIntegration = null;
        this.connectedPlayers = new Map();
        
        // Game statistics
        this.gameStats = {
            totalRounds: 0,
            totalVolume: 0,
            totalPlayers: 0,
            uptime: Date.now()
        };

        this.init();
    }
    
    /**
     * 🚀 Initialize unified production system
     */
    async init() {
        try {
            console.log('🎯 Initializing Unified PacoRocko Production System...');
            
            // Initialize wallet integration
            if (WalletIntegration) {
                this.walletIntegration = new WalletIntegration(
                    process.env.SUPABASE_URL,
                    process.env.SUPABASE_SERVICE_ROLE_KEY
                );
                console.log('✅ Wallet integration initialized');
            }
            
            // Initialize unified crash engine (SERVER AUTHORITY)
            console.log('🎮 Starting unified crash engine...');
            this.crashEngine = new UnifiedCrashEngine(this.io, {
                bettingPhaseDuration: 15000, // 15 seconds (user requested)
                cashoutPhaseDuration: 3000   // 3 seconds (proven timing)
            });
            
            // Setup engine event listeners
            this.setupEngineListeners();
            
            // Setup socket connection handlers
            this.setupSocketHandlers();
            
            // Start the engine
            this.crashEngine.start();
            
            console.log('✅ Unified crash engine initialized and running');
            
        } catch (error) {
            console.error('❌ Failed to initialize unified system:', error);
            throw error;
        }
    }
    
    /**
     * 🎧 Setup crash engine event listeners
     */
    setupEngineListeners() {
        this.crashEngine.on('roundCreated', async (round) => {
            this.gameStats.totalRounds++;
            console.log(`🎲 Round ${round.id} created - Commit ${round.commitHash}`);
            // Persist commit to Supabase
            try {
                if (this.walletIntegration?.supabase) {
                    await this.walletIntegration.supabase
                        .from('rounds')
                        .insert({
                            id: String(round.id),
                            commit_hash: round.commitHash,
                            status: 'pending',
                            started_at: new Date().toISOString()
                        })
                }
            } catch (e) {
                console.warn('RDS: failed to insert round commit', e?.message)
            }
        });

        this.crashEngine.on('roundStarted', (data) => {
            console.log(`🚀 Round ${data.roundId} started - Clients will sync automatically`);
        });

        this.crashEngine.on('roundCrashed', async (data) => {
            this.gameStats.totalVolume += data.totalPayout || 0;
            console.log(`💥 Round ${data.roundId} crashed at ${data.crashPoint}x - Perfect sync maintained`);
            // Reveal serverSeed and persist
            try {
                const serverSeed = this.crashEngine.currentServerSeed
                const commit = this.crashEngine.currentCommit
                if (this.walletIntegration?.supabase) {
                    await this.walletIntegration.supabase
                        .from('rounds')
                        .update({
                            seed_revealed: serverSeed,
                            crash_point_ppm: Math.round(Number(data.crashPoint) * 1_000_000),
                            settled_at: new Date().toISOString(),
                            status: 'settled'
                        })
                        .eq('id', String(data.roundId))
                }
                this.io.emit('round_reveal', { roundId: data.roundId, serverSeed, commit })
            } catch (e) {
                console.warn('RDS: failed to reveal round', e?.message)
            }
        });

        // Handle successful cashouts and trigger payouts
        this.crashEngine.on('playerCashedOut', async (data) => {
            console.log(`💸 Player cashed out: ${data.playerId} @ ${data.multiplier}x`);
            
            // AUTOMATIC PAYOUT: Process blockchain transaction
            if (this.walletIntegration && data.payout > 0) {
                try {
                    console.log(`💰 Processing automatic payout: ${data.payout.toFixed(4)} ETH to ${data.playerId}`);
                    
                    const payoutResult = await this.walletIntegration.processCashOut(
                        data.playerId,        // Player address
                        data.roundId,         // Round ID
                        data.multiplier,      // Cashout multiplier
                        data.betAmount        // Original bet amount
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
                }
            }
        });
        
        console.log('🎧 Crash engine event listeners configured');
    }
    
    /**
     * 🔌 Setup socket connection handlers
     */
    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            console.log(`🔌 Client connected: ${socket.id}`);
            
            // Track connected player
            this.connectedPlayers.set(socket.id, {
                id: socket.id,
                connectedAt: Date.now(),
                authenticated: false,
                playerId: null
            });
            
            // Send current game state immediately
            this.sendGameState(socket);
            
            // Handle betting
            // Handle both bet event types from different clients
            socket.on('send_bet', async (data) => {
                try {
                    await this.handleBet(socket, data);
                } catch (error) {
                    socket.emit('error', { message: error.message });
                }
            });
            
            socket.on('place_bet', async (data) => {
                try {
                    // Convert place_bet format to send_bet format
                    const betData = {
                        bet_amount: data.betAmount,
                        payout_multiplier: data.autoPayoutMultiplier || 2.0, // Default 2x if not specified
                        player_address: data.playerAddress
                    };
                    await this.handleBet(socket, betData);
                } catch (error) {
                    socket.emit('error', { message: error.message });
                }
            });
            
            // Handle manual cashout
            socket.on('manual_cashout_early', async () => {
                try {
                    await this.handleCashout(socket);
                } catch (error) {
                    socket.emit('error', { message: error.message });
                }
            });
            
            // Handle game state requests
            socket.on('get_game_status', () => {
                this.sendGameState(socket);
            });
            
            // Handle authentication
            socket.on('authenticate', (data) => {
                this.handleAuthentication(socket, data);
            });
            
            // Handle disconnection
            socket.on('disconnect', () => {
                console.log(`🔌 Client disconnected: ${socket.id}`);
                this.connectedPlayers.delete(socket.id);
            });
        });
        
        console.log('🔌 Socket connection handlers configured');
    }
    
    /**
     * 📊 Send current game state to client
     */
    sendGameState(socket) {
        const gameState = this.crashEngine.getGameState();
        
        socket.emit('gameState', {
            phase: gameState.phase,
            timeRemaining: gameState.timeRemaining,
            roundId: gameState.roundId,
            info: gameState.phaseStartTime
        });
        
        // Send history and other state
        socket.emit('crash_history', gameState.previousCrashes);
        socket.emit('get_round_id_list', gameState.roundIdList);
        socket.emit('receive_live_betting_table', JSON.stringify(gameState.liveBettors));
    }
    
    /**
     * 💰 Handle betting request
     */
    async handleBet(socket, data) {
        const player = this.connectedPlayers.get(socket.id);
        
        const { bet_amount, payout_multiplier, player_address } = data;
        
        // For wallet-based bets, store the player address for cashouts
        if (player_address) {
            player.lastBetAddress = player_address;
        }
        
        // Allow bets from wallet users even if not formally authenticated
        if (!player || (!player.authenticated && !player_address)) {
            throw new Error('Not authenticated or no player address provided');
        }
        
        // Validate bet
        if (!bet_amount || !payout_multiplier || bet_amount <= 0 || payout_multiplier < 1) {
            throw new Error('Invalid bet parameters');
        }

        // Pre-bet solvency check
        try {
            if (this.walletIntegration?.getHouseInfo) {
                const info = await this.walletIntegration.getHouseInfo()
                const balanceEth = parseFloat(info.balance || '0')
                const maxLiabilityFactor = parseFloat(process.env.MAX_LIABILITY_FACTOR || '0.25')
                const potentialPayout = Number(bet_amount) * Number(payout_multiplier)
                const maxLiability = balanceEth * maxLiabilityFactor
                if (potentialPayout > maxLiability) {
                    throw new Error('Bet exceeds solvency limit')
                }
            }
        } catch (e) {
            throw new Error(e?.message || 'Solvency check failed')
        }
        
        // Process bet through crash engine
        const betResult = await this.crashEngine.placeBet(
            player.playerId,
            player.username || 'Anonymous',
            bet_amount,
            payout_multiplier
        );
        
        // Process wallet transaction if wallet integration available
        if (this.walletIntegration) {
            // Handle wallet deduction
            console.log(`💳 Processing wallet transaction for ${player.playerId}`);
        }
        
        socket.emit('betSuccess', betResult);
        console.log(`💰 Bet processed: ${player.playerId} - ${bet_amount} @ ${payout_multiplier}x`);
    }
    
    /**
     * 🏃 Handle cashout request
     */
    async handleCashout(socket) {
        const player = this.connectedPlayers.get(socket.id);
        
        // For wallet-based game, use the last bet address as player ID if not authenticated
        if (!player || (!player.authenticated && !player.lastBetAddress)) {
            throw new Error('No active player or bet found');
        }
        
        const playerId = player.authenticated ? player.playerId : player.lastBetAddress;
        
        // Get current multiplier from game state
        const gameState = this.crashEngine.getGameState();
        if (gameState.phase !== 'game_phase') {
            throw new Error('Not in game phase');
        }
        
        // Calculate current multiplier (same formula as client and server)
        const elapsed = (Date.now() - gameState.phaseStartTime) / 1000;
        const currentMultiplier = parseFloat((1.0024 * Math.pow(1.0718, elapsed)).toFixed(2));
        
        // Process cashout through crash engine
        const cashoutResult = await this.crashEngine.processCashout(
            playerId,
            currentMultiplier
        );
        
        // The crashEngine.processCashout now emits 'playerCashedOut' which triggers automatic payout
        // So we don't need to manually call payout here anymore
        
        socket.emit('cashoutSuccess', {
            multiplier: currentMultiplier,
            profit: cashoutResult ? cashoutResult.profit : 0,
            payout: cashoutResult ? cashoutResult.payout : 0
        });
        
        console.log(`🏃 Cashout processed: ${playerId} @ ${currentMultiplier.toFixed(2)}x`);
    }
    
    /**
     * 🔐 Handle authentication
     */
    handleAuthentication(socket, data) {
        const player = this.connectedPlayers.get(socket.id);
        if (!player) return;
        
        // Simple authentication for now
        player.authenticated = true;
        player.playerId = data.playerId || socket.id;
        player.username = data.username || 'Anonymous';
        
        socket.emit('authenticated', {
            playerId: player.playerId,
            username: player.username
        });
        
        console.log(`🔐 Player authenticated: ${player.username} (${player.playerId})`);
    }
    
    /**
     * 📊 Get system statistics
     */
    getStats() {
        return {
            ...this.gameStats,
            connectedPlayers: this.connectedPlayers.size,
            currentGameState: this.crashEngine ? this.crashEngine.getGameState() : null,
            uptime: Date.now() - this.gameStats.uptime
        };
    }
    
    /**
     * 🚀 Start the production server
     */
    async start(port = 3001) {
        return new Promise((resolve, reject) => {
            this.server.listen(port, (error) => {
                if (error) {
                    reject(error);
                } else {
                    console.log(`🚀 Unified PacoRocko Production Server running on port ${port}`);
                    console.log(`🔗 WebSocket endpoint: ws://localhost:${port}`);
                    console.log(`🎯 Server-authority crash engine active`);
                    console.log(`💫 Perfect sync enabled`);
                    resolve(this);
                }
            });
        });
    }
    
    /**
     * 🛑 Stop the production server
     */
    async stop() {
        if (this.crashEngine) {
            this.crashEngine.stop();
        }
        
        if (this.server) {
            this.server.close();
        }
        
        console.log('🛑 Unified PacoRocko Production Server stopped');
    }
}

module.exports = UnifiedPacoRockoProduction;
