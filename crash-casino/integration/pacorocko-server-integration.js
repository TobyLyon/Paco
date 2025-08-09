/**
 * 🎰 PacoRocko Server Integration
 * 
 * Integrates the enhanced crash engine with your existing Express server
 */

const http = require('http');
const { Server } = require('socket.io');
const EnhancedCrashEngine = require('../extracted/enhanced-crash-engine');

class PacoRockoServerIntegration {
    constructor(expressApp, options = {}) {
        this.app = expressApp;
        this.options = {
            port: 3001,
            corsOrigin: "*",
            ...options
        };
        
        // Create HTTP server from Express app
        this.server = http.createServer(this.app);
        
        // Initialize Socket.IO
        this.io = new Server(this.server, {
            cors: {
                origin: this.options.corsOrigin,
                methods: ["GET", "POST"]
            },
            path: '/crash-ws'
        });
        
        // Initialize crash game engine with unified countdown
        this.crashEngine = new EnhancedCrashEngine(this.io, {
            bettingPhaseDuration: 5000,   // Unified 5-second betting countdown
            houseEdge: 0.03,             // 3% house edge (industry standard)
            maxMultiplier: 100.0,        // Realistic 100x max
            tickRate: 50                 // 20 FPS updates
        });
        
        // Connected players
        this.connectedPlayers = new Map();
        
        this.setupSocketHandlers();
        this.setupExpressRoutes();
        this.setupEngineListeners();
        
        console.log('🎰 PacoRocko crash casino server integration initialized');
    }

    /**
     * 🔌 Setup Socket.IO event handlers
     */
    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            console.log(`🔗 New player connected: ${socket.id}`);
            
            // Send current game state
            socket.emit('game_state', this.crashEngine.getGameStats());
            
            // Handle wallet authentication
            socket.on('authenticate', (data) => {
                this.handleAuthentication(socket, data);
            });
            
            // Handle bet placement
            socket.on('place_bet', (data) => {
                this.handlePlaceBet(socket, data);
            });
            
            // Handle manual cashout
            socket.on('cash_out', () => {
                this.handleCashOut(socket);
            });
            
            // Handle chat messages
            socket.on('chat_message', (data) => {
                this.handleChatMessage(socket, data);
            });
            
            // Handle disconnection
            socket.on('disconnect', () => {
                this.handleDisconnection(socket);
            });
            
            // Heartbeat
            socket.on('ping', () => {
                socket.emit('pong');
            });
        });
    }

    /**
     * 🔐 Handle wallet authentication
     */
    handleAuthentication(socket, data) {
        try {
            const { walletAddress, signature } = data;
            
            // TODO: Verify wallet signature here
            // For now, accept any wallet address
            
            if (walletAddress && walletAddress.length === 42) {
                const player = {
                    id: walletAddress,
                    socketId: socket.id,
                    walletAddress,
                    authenticated: true,
                    connectedAt: Date.now(),
                    balance: 10.0 // Demo balance - integrate with your wallet system
                };
                
                this.connectedPlayers.set(socket.id, player);
                
                socket.emit('authenticated', {
                    success: true,
                    playerId: player.id,
                    walletAddress: player.walletAddress,
                    balance: player.balance
                });
                
                console.log(`✅ Player authenticated: ${walletAddress}`);
            } else {
                socket.emit('authentication_failed', {
                    error: 'Invalid wallet address'
                });
            }
        } catch (error) {
            console.error('❌ Authentication error:', error);
            socket.emit('authentication_failed', {
                error: 'Authentication failed'
            });
        }
    }

    /**
     * 💰 Handle bet placement
     */
    handlePlaceBet(socket, data) {
        try {
            const player = this.connectedPlayers.get(socket.id);
            
            if (!player || !player.authenticated) {
                socket.emit('bet_failed', {
                    error: 'Must be authenticated to place bets'
                });
                return;
            }
            
            const { betAmount, autoPayoutMultiplier } = data;
            
            // Validate bet amount
            if (!betAmount || betAmount <= 0 || betAmount > player.balance) {
                socket.emit('bet_failed', {
                    error: 'Invalid bet amount'
                });
                return;
            }
            
            // Place bet with crash engine
            const result = this.crashEngine.placeBet(
                player.id,
                socket.id,
                betAmount,
                autoPayoutMultiplier
            );
            
            if (result.success) {
                // Deduct from player balance (in production, this would be a blockchain transaction)
                player.balance -= betAmount;
                
                socket.emit('bet_placed', {
                    success: true,
                    bet: result.bet,
                    newBalance: player.balance
                });
                
                console.log(`💰 Bet placed: ${player.walletAddress} - ${betAmount} ETH`);
            } else {
                socket.emit('bet_failed', {
                    error: result.error
                });
            }
            
        } catch (error) {
            console.error('❌ Bet placement error:', error);
            socket.emit('bet_failed', {
                error: 'Failed to place bet'
            });
        }
    }

    /**
     * 🏃‍♂️ Handle manual cashout
     */
    handleCashOut(socket) {
        try {
            const player = this.connectedPlayers.get(socket.id);
            
            if (!player || !player.authenticated) {
                socket.emit('cashout_failed', {
                    error: 'Must be authenticated to cash out'
                });
                return;
            }
            
            const result = this.crashEngine.cashOut(player.id);
            
            if (result.success) {
                // Add winnings to player balance (in production, this would be a blockchain transaction)
                player.balance += result.payout;
                
                socket.emit('cashout_success', {
                    multiplier: result.multiplier,
                    payout: result.payout,
                    profit: result.profit,
                    newBalance: player.balance
                });
                
                console.log(`🏃‍♂️ Cashout: ${player.walletAddress} - ${result.payout} ETH at ${result.multiplier}x`);
            } else {
                socket.emit('cashout_failed', {
                    error: result.error
                });
            }
            
        } catch (error) {
            console.error('❌ Cashout error:', error);
            socket.emit('cashout_failed', {
                error: 'Failed to cash out'
            });
        }
    }

    /**
     * 💬 Handle chat messages
     */
    handleChatMessage(socket, data) {
        const player = this.connectedPlayers.get(socket.id);
        
        if (!player || !player.authenticated) {
            return;
        }
        
        const { message } = data;
        
        if (message && message.length > 0 && message.length <= 200) {
            const chatMessage = {
                playerId: player.id,
                username: player.walletAddress.substring(0, 6) + '...' + player.walletAddress.substring(-4),
                message: message,
                timestamp: Date.now()
            };
            
            this.io.emit('chat_message', chatMessage);
        }
    }

    /**
     * 🚪 Handle disconnection
     */
    handleDisconnection(socket) {
        const player = this.connectedPlayers.get(socket.id);
        
        if (player) {
            console.log(`🚪 Player disconnected: ${player.walletAddress}`);
            this.connectedPlayers.delete(socket.id);
        }
    }

    /**
     * 🎮 Setup crash engine event listeners
     */
    setupEngineListeners() {
        this.crashEngine.on('roundStarted', (round) => {
            console.log(`🚀 Round started: ${round.id}`);
        });
        
        this.crashEngine.on('roundCrashed', (data) => {
            console.log(`💥 Round crashed: ${data.roundId} at ${data.crashPoint}x`);
        });
        
        this.crashEngine.on('betPlaced', (data) => {
            console.log(`💰 New bet: ${data.playerId} - ${data.betAmount} ETH`);
        });
        
        this.crashEngine.on('playerCashedOut', (data) => {
            console.log(`🏃‍♂️ Player cashed out: ${data.playerId} at ${data.multiplier}x`);
        });
    }

    /**
     * 🛤️ Setup Express API routes
     */
    setupExpressRoutes() {
        // Game statistics endpoint
        this.app.get('/api/crash/stats', (req, res) => {
            res.json({
                ...this.crashEngine.getGameStats(),
                connectedPlayers: this.connectedPlayers.size,
                serverTime: Date.now()
            });
        });
        
        // Game history endpoint
        this.app.get('/api/crash/history', (req, res) => {
            res.json({
                history: this.crashEngine.roundHistory,
                count: this.crashEngine.roundHistory.length
            });
        });
        
        // Admin endpoint (TODO: Add authentication)
        this.app.get('/api/crash/admin', (req, res) => {
            // TODO: Add admin authentication
            res.json({
                connectedPlayers: Array.from(this.connectedPlayers.values()).map(p => ({
                    id: p.id,
                    walletAddress: p.walletAddress,
                    balance: p.balance,
                    connectedAt: p.connectedAt
                })),
                gameStats: this.crashEngine.getGameStats(),
                uptime: process.uptime()
            });
        });
    }

    /**
     * 🚀 Start the integrated server
     */
    start(port = this.options.port) {
        return new Promise((resolve) => {
            this.server.listen(port, () => {
                console.log(`🎰 PacoRocko crash casino server running on port ${port}`);
                console.log(`🔌 WebSocket endpoint: ws://localhost:${port}/crash-ws`);
                console.log(`📊 Stats endpoint: http://localhost:${port}/api/crash/stats`);
                resolve(port);
            });
        });
    }

    /**
     * 🛑 Stop the server
     */
    stop() {
        return new Promise((resolve) => {
            this.crashEngine.stop();
            this.server.close(() => {
                console.log('🛑 PacoRocko crash casino server stopped');
                resolve();
            });
        });
    }

    /**
     * 📊 Get server statistics
     */
    getStats() {
        return {
            connectedPlayers: this.connectedPlayers.size,
            gameStats: this.crashEngine.getGameStats(),
            uptime: process.uptime()
        };
    }
}

module.exports = PacoRockoServerIntegration;