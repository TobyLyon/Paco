/**
 * 🎰 Fixed PacoRocko Production Integration
 * 
 * Clean server setup with proper synchronization
 * Based on the working reference implementation
 */

const http = require('http');
const { Server } = require('socket.io');
const FixedCrashEngine = require('./backend/fixed-crash-engine');

class FixedPacoRockoProduction {
    constructor(expressApp, config = {}) {
        this.app = expressApp;
        this.config = {
            corsOrigin: process.env.CORS_ORIGIN || "*",
            ...config
        };
        
        // Create HTTP server
        this.server = http.createServer(this.app);
        
        // Initialize Socket.IO with proper CORS
        const allowedOrigins = [
            'https://pacothechicken.xyz',
            'https://www.pacothechicken.xyz',
            'http://localhost:3000',
            'http://localhost:5173'
        ];
        
        this.io = new Server(this.server, {
            cors: {
                origin: allowedOrigins,
                methods: ["GET", "POST"],
                credentials: true
            },
            transports: ['websocket', 'polling']
        });
        
        // Initialize components
        this.crashEngine = null;
        this.activePlayers = new Map();
        this.walletIntegration = null;
        
        this.init();
    }
    
    /**
     * 🚀 Initialize the fixed system
     */
    async init() {
        console.log('🎰 Initializing Fixed PacoRocko Production System...');
        
        // Initialize wallet integration if available
        try {
            const WalletIntegration = require('./backend/wallet-integration-abstract.js');
            if (WalletIntegration && WalletIntegration.getWalletIntegration) {
                this.walletIntegration = WalletIntegration.getWalletIntegration();
                console.log('💰 Abstract wallet integration loaded');
            }
        } catch (e) {
            console.log('⚠️ Wallet integration not available - betting simulation mode');
        }
        
        // Start the crash engine
        this.crashEngine = new FixedCrashEngine(this.io);
        
        // Setup socket handlers
        this.setupSocketHandlers();
        
        // Setup engine event handlers
        this.setupEngineHandlers();
        
        // Setup API routes
        this.setupAPIRoutes();
        
        console.log('✅ Fixed PacoRocko system initialized');
    }
    
    /**
     * 🔌 Setup socket connection handlers
     */
    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            console.log('👤 New player connected:', socket.id);
            
            // Send current game state
            socket.on('get_game_status', () => {
                const status = this.crashEngine.getGameStatus();
                socket.emit('game_status', status);
                
                // Send crash history
                socket.emit('crash_history', this.crashEngine.previous_crashes);
                socket.emit('get_round_id_list', this.crashEngine.round_id_list);
            });
            
            // Handle betting with wallet integration
            socket.on('place_bet', async (data, callback) => {
                try {
                    // Get player info from socket
                    const player = this.activePlayers.get(socket.id);
                    if (!player) {
                        throw new Error('Not authenticated');
                    }
                    
                    // Validate bet amount
                    if (!data.amount || data.amount < 0.001) {
                        throw new Error('Invalid bet amount');
                    }
                    
                    // If wallet integration exists, record the bet
                    if (this.walletIntegration && player.address) {
                        try {
                            // Create bet record in database
                            const betResult = await this.walletIntegration.placeBet(
                                player.address,
                                data.amount,
                                this.crashEngine.current_round_id || 'round_' + Date.now()
                            );
                            
                            console.log('💰 Bet recorded in database:', betResult);
                            
                            // Store transaction reference
                            player.activeBetId = betResult.betId;
                            player.betAmount = data.amount;
                        } catch (walletError) {
                            console.error('⚠️ Wallet integration error:', walletError);
                            // Continue anyway - don't block gameplay
                        }
                    }
                    
                    // Place bet through engine
                    const bet = this.crashEngine.placeBet(
                        player.id,
                        player.username,
                        data.amount,
                        data.auto_cashout
                    );
                    
                    callback({ success: true, bet });
                    
                } catch (error) {
                    console.error('❌ Bet error:', error.message);
                    callback({ success: false, error: error.message });
                }
            });
            
            // Handle manual cashout
            socket.on('cash_out', async (data, callback) => {
                try {
                    const player = this.activePlayers.get(socket.id);
                    if (!player) {
                        throw new Error('Not authenticated');
                    }
                    
                    const result = this.crashEngine.manualCashout(player.id);
                    if (result) {
                        callback({ 
                            success: true, 
                            multiplier: result.multiplier,
                            profit: result.profit,
                            total: result.total
                        });
                    } else {
                        callback({ success: false, error: 'Cannot cash out' });
                    }
                    
                } catch (error) {
                    console.error('❌ Cashout error:', error.message);
                    callback({ success: false, error: error.message });
                }
            });
            
            // Handle authentication
            socket.on('authenticate', (data) => {
                // Store player info
                this.activePlayers.set(socket.id, {
                    id: data.address || socket.id,
                    username: data.username || `Player${socket.id.substr(0, 6)}`,
                    address: data.address,
                    socketId: socket.id
                });
                
                console.log('🔐 Player authenticated:', data.username || data.address);
                socket.emit('authenticated', { success: true });
            });
            
            // Handle disconnect
            socket.on('disconnect', () => {
                this.activePlayers.delete(socket.id);
                console.log('👤 Player disconnected:', socket.id);
            });
        });
    }
    
    /**
     * 🎮 Setup engine event handlers
     */
    setupEngineHandlers() {
        // Handle player wins (automatic cashout)
        this.crashEngine.on('playerWon', async (data) => {
            console.log(`💰 Player ${data.playerId} won ${data.amount} at ${data.multiplier}x`);
            
            // Find player by ID
            let playerSocket = null;
            for (const [socketId, player] of this.activePlayers) {
                if (player.id === data.playerId || player.address === data.playerId) {
                    playerSocket = { socketId, player };
                    break;
                }
            }
            
            if (playerSocket && this.walletIntegration && playerSocket.player.address) {
                try {
                    // Process actual blockchain payout
                    const payoutResult = await this.walletIntegration.processCashOut(
                        playerSocket.player.address,
                        this.crashEngine.current_round_id || 'round_' + Date.now(),
                        data.multiplier,
                        playerSocket.player.betAmount || data.amount / data.multiplier
                    );
                    
                    console.log('✅ Blockchain payout processed:', payoutResult);
                    
                    // Notify player of successful payout
                    this.io.to(playerSocket.socketId).emit('payout_processed', {
                        success: true,
                        multiplier: data.multiplier,
                        amount: data.amount,
                        txHash: payoutResult.txHash
                    });
                    
                } catch (error) {
                    console.error('❌ Blockchain payout error:', error);
                    
                    // Notify player of payout failure
                    this.io.to(playerSocket.socketId).emit('payout_processed', {
                        success: false,
                        error: error.message
                    });
                }
            }
        });
        
        // Handle manual cashouts
        this.crashEngine.on('playerCashedOut', async (data) => {
            console.log(`💸 Player ${data.playerId} cashed out ${data.amount} at ${data.multiplier}x`);
            
            // Find player by ID
            let playerSocket = null;
            for (const [socketId, player] of this.activePlayers) {
                if (player.id === data.playerId || player.address === data.playerId) {
                    playerSocket = { socketId, player };
                    break;
                }
            }
            
            if (playerSocket && this.walletIntegration && playerSocket.player.address) {
                try {
                    // Process actual blockchain payout
                    const payoutResult = await this.walletIntegration.processCashOut(
                        playerSocket.player.address,
                        this.crashEngine.current_round_id || 'round_' + Date.now(),
                        data.multiplier,
                        playerSocket.player.betAmount || data.amount / data.multiplier
                    );
                    
                    console.log('✅ Manual cashout blockchain payout:', payoutResult);
                    
                    // Notify player
                    this.io.to(playerSocket.socketId).emit('payout_processed', {
                        success: true,
                        multiplier: data.multiplier,
                        amount: data.amount,
                        txHash: payoutResult.txHash,
                        manual: true
                    });
                    
                } catch (error) {
                    console.error('❌ Manual cashout payout error:', error);
                    
                    this.io.to(playerSocket.socketId).emit('payout_processed', {
                        success: false,
                        error: error.message
                    });
                }
            }
        });
    }
    
    /**
     * 🛣️ Setup API routes
     */
    setupAPIRoutes() {
        // Health check
        this.app.get('/crash/health', (req, res) => {
            res.json({
                status: 'OK',
                engine: 'running',
                phase: this.crashEngine.betting_phase ? 'betting' : 
                       this.crashEngine.game_phase ? 'game' : 'cashout',
                players: this.activePlayers.size
            });
        });
        
        // Get game status
        this.app.get('/crash/status', (req, res) => {
            const status = this.crashEngine.getGameStatus();
            res.json({
                ...status,
                history: this.crashEngine.previous_crashes,
                activeBets: this.crashEngine.live_bettors_table.length
            });
        });
    }
    
    /**
     * 🚀 Start the server
     */
    async start(port) {
        return new Promise((resolve) => {
            this.server.listen(port, () => {
                console.log(`✅ Fixed PacoRocko server running on port ${port}`);
                console.log(`🔌 WebSocket endpoint: ws://localhost:${port}`);
                resolve();
            });
        });
    }
    
    /**
     * 🛑 Stop the server
     */
    stop() {
        if (this.crashEngine) {
            this.crashEngine.stop();
        }
        
        if (this.server) {
            this.server.close();
        }
        
        console.log('🛑 Fixed PacoRocko server stopped');
    }
}

module.exports = FixedPacoRockoProduction;
