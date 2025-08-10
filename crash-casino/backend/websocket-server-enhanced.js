/**
 * 🔌 Enhanced WebSocket Server for PacoRocko
 * 
 * Real-time multiplayer crash game with Abstract network integration
 */

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { getWalletIntegration } = require('./wallet-integration-abstract');
const EnhancedCrashEngine = require('../extracted/enhanced-crash-engine');

class EnhancedWebSocketServer {
    constructor(httpServer, config = {}) {
        this.config = {
            jwtSecret: process.env.JWT_SECRET || 'paco-crash-secret',
            corsOrigin: process.env.CORS_ORIGIN || "*",
            ...config
        };
        
        // Initialize Socket.IO
        this.io = new Server(httpServer, {
            cors: {
                origin: this.config.corsOrigin,
                methods: ["GET", "POST"],
                credentials: true
            },
            path: '/crash-ws',
            transports: ['websocket', 'polling']
        });
        
        // Game components - INDUSTRY STANDARD SETTINGS
        this.gameEngine = new EnhancedCrashEngine(this.io, {
            bettingPhaseDuration: 5000,   // 5 seconds betting phase
            cashoutPhaseDuration: 5000,   // 5 seconds to cash out  
            houseEdge: 0.01,             // 1% house edge (industry standard)
            maxMultiplier: 1000.0,       // 1000x maximum (industry standard)
            tickRate: 50                 // 50ms updates (20 FPS)
        });
        
        this.walletIntegration = getWalletIntegration();
        
        // Player management
        this.connectedPlayers = new Map();
        this.authenticatedPlayers = new Map();
        this.playerSockets = new Map(); // wallet -> socketId mapping
        
        // Rate limiting
        this.rateLimits = new Map();
        
        this.setupSocketHandlers();
        this.setupGameEngineListeners();
        
        console.log('🔌 Enhanced WebSocket server initialized');
    }
    
    /**
     * 🎮 Setup Socket.IO handlers
     */
    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            console.log(`🔗 New connection: ${socket.id}`);
            
            // Add to connected players
            this.connectedPlayers.set(socket.id, {
                socketId: socket.id,
                connectedAt: Date.now(),
                authenticated: false
            });
            
            // Send current game state
            socket.emit('game_state', this.gameEngine.getGameStats());
            
            // Authentication
            socket.on('authenticate', async (data) => {
                await this.handleAuthentication(socket, data);
            });
            
            // Betting
            socket.on('place_bet', async (data) => {
                await this.handlePlaceBet(socket, data);
            });
            
            // Confirm bet payment (player provides tx hash)
            socket.on('confirm_bet_payment', async (data) => {
                await this.handleConfirmBetPayment(socket, data);
            });

            // Cash out
            socket.on('cash_out', async () => {
                await this.handleCashOut(socket);
            });
            
            // Chat
            socket.on('chat_message', (data) => {
                this.handleChatMessage(socket, data);
            });
            
            // Game state request
            socket.on('request_state', () => {
                socket.emit('game_state', this.gameEngine.getGameStats());
            });
            
            // Disconnect
            socket.on('disconnect', () => {
                this.handleDisconnect(socket);
            });
            
            // Heartbeat
            socket.on('ping', () => {
                socket.emit('pong', { serverTime: Date.now() });
            });
        });
    }
    
    /**
     * 🔐 Handle wallet authentication
     */
    async handleAuthentication(socket, data) {
        try {
            const { address, signature, message } = data;
            
            if (!address || !signature || !message) {
                socket.emit('auth_error', { error: 'Missing authentication data' });
                return;
            }
            
            // Authenticate with wallet integration
            const result = await this.walletIntegration.authenticatePlayer(
                address,
                signature,
                message
            );
            
            if (!result.success) {
                socket.emit('auth_error', { error: result.error });
                return;
            }
            
            // Create JWT token
            const token = jwt.sign(
                { 
                    address: address.toLowerCase(),
                    network: result.network
                },
                this.config.jwtSecret,
                { expiresIn: '24h' }
            );
            
            // Update player records
            const player = this.connectedPlayers.get(socket.id);
            player.authenticated = true;
            player.walletAddress = address.toLowerCase();
            player.balance = result.balance;
            
            // Map wallet to socket
            this.playerSockets.set(address.toLowerCase(), socket.id);
            this.authenticatedPlayers.set(socket.id, {
                address: address.toLowerCase(),
                balance: result.balance,
                activeBet: null
            });
            
            // Send success response
            socket.emit('authenticated', {
                success: true,
                token,
                address,
                balance: result.balance,
                network: result.network
            });
            
            // Join authenticated room
            socket.join('authenticated');
            
            console.log(`✅ Player authenticated: ${address}`);
            
        } catch (error) {
            console.error('❌ Authentication error:', error);
            socket.emit('auth_error', { error: 'Authentication failed' });
        }
    }
    
    /**
     * 💰 Handle bet placement
     */
    async handlePlaceBet(socket, data) {
        try {
            // Check authentication
            const player = this.authenticatedPlayers.get(socket.id);
            if (!player) {
                socket.emit('bet_error', { error: 'Not authenticated' });
                return;
            }
            
            // Rate limiting
            if (!this.checkRateLimit(player.address)) {
                socket.emit('bet_error', { error: 'Too many requests' });
                return;
            }
            
            const { amount } = data;
            
            // Validate amount
            if (!amount || amount <= 0) {
                socket.emit('bet_error', { error: 'Invalid bet amount' });
                return;
            }
            
            // Check if player already has active bet
            if (player.activeBet) {
                socket.emit('bet_error', { error: 'Already have active bet' });
                return;
            }
            
            // Get current round
            const gameState = this.gameEngine.getGameStats();
            if (gameState.currentPhase !== 'betting' && gameState.currentPhase !== 'waiting') {
                socket.emit('bet_error', { error: 'Cannot place bets during active round' });
                return;
            }
            
            // Place bet through wallet integration
            const betResult = await this.walletIntegration.placeBet(
                player.address,
                amount,
                gameState.roundId
            );
            
            if (!betResult.success) {
                socket.emit('bet_error', { error: betResult.error });
                return;
            }
            
            // Register bet with game engine
            const engineResult = this.gameEngine.placeBet(
                player.address,
                socket.id,
                amount,
                data.autoPayoutMultiplier
            );
            
            if (!engineResult.success) {
                socket.emit('bet_error', { error: engineResult.error });
                return;
            }
            
            // Update player state
            player.activeBet = {
                betId: betResult.betId,
                amount,
                roundId: gameState.roundId,
                status: 'pending'
            };
            
            // Send success response
            socket.emit('bet_placed', {
                success: true,
                betId: betResult.betId,
                amount,
                paymentRequired: true,
                paymentAddress: betResult.paymentAddress,
                instructions: 'Send ETH to confirm your bet'
            });
            
            console.log(`💰 Bet placed: ${player.address} - ${amount} ETH`);
            
        } catch (error) {
            console.error('❌ Bet placement error:', error);
            socket.emit('bet_error', { error: 'Failed to place bet' });
        }
    }
    
    /**
     * ✅ Confirm bet payment
     */
    async confirmBetPayment(address, betId, txHash) {
        try {
            const result = await this.walletIntegration.confirmBetPayment(betId, txHash);
            
            if (result.success) {
                // Find player socket
                const socketId = this.playerSockets.get(address.toLowerCase());
                if (socketId) {
                    const socket = this.io.sockets.sockets.get(socketId);
                    if (socket) {
                        socket.emit('bet_confirmed', {
                            betId,
                            confirmed: true
                        });
                        
                        // Update player state
                        const player = this.authenticatedPlayers.get(socketId);
                        if (player && player.activeBet) {
                            player.activeBet.status = 'confirmed';
                        }
                    }
                }
            }
            
            return result;
            
        } catch (error) {
            console.error('❌ Bet confirmation error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * ✅ Handle confirm bet payment from socket
     */
    async handleConfirmBetPayment(socket, data) {
        try {
            const player = this.authenticatedPlayers.get(socket.id);
            if (!player) {
                socket.emit('bet_error', { error: 'Not authenticated' });
                return;
            }

            const { betId, txHash } = data || {};
            if (!betId || !txHash) {
                socket.emit('bet_error', { error: 'Missing betId or txHash' });
                return;
            }

            const result = await this.confirmBetPayment(player.address, betId, txHash);
            if (result.success) {
                socket.emit('bet_confirmed', { betId, txHash });
            } else {
                socket.emit('bet_error', { error: result.error || 'Bet confirmation failed' });
            }
        } catch (error) {
            console.error('❌ Confirm bet payment error:', error);
            socket.emit('bet_error', { error: 'Failed to confirm bet payment' });
        }
    }
    
    /**
     * 🏃‍♂️ Handle cash out
     */
    async handleCashOut(socket) {
        try {
            const player = this.authenticatedPlayers.get(socket.id);
            if (!player) {
                socket.emit('cashout_error', { error: 'Not authenticated' });
                return;
            }
            
            if (!player.activeBet || player.activeBet.status !== 'confirmed') {
                socket.emit('cashout_error', { error: 'No active bet' });
                return;
            }
            
            // Cash out through game engine
            const result = this.gameEngine.cashOut(player.address);
            
            if (!result.success) {
                socket.emit('cashout_error', { error: result.error });
                return;
            }
            
            // Process payout through wallet integration
            const payoutResult = await this.walletIntegration.processCashOut(
                player.address,
                player.activeBet.roundId,
                result.multiplier,
                player.activeBet.amount
            );
            
            if (!payoutResult.success) {
                socket.emit('cashout_error', { error: payoutResult.error });
                return;
            }
            
            // Clear active bet
            player.activeBet = null;
            
            // Send success response
            socket.emit('cashout_success', {
                multiplier: result.multiplier,
                payout: result.payout,
                profit: result.profit,
                txHash: payoutResult.txHash
            });
            
            console.log(`🏃‍♂️ Cashout: ${player.address} at ${result.multiplier}x`);
            
        } catch (error) {
            console.error('❌ Cash out error:', error);
            socket.emit('cashout_error', { error: 'Cash out failed' });
        }
    }
    
    /**
     * 💬 Handle chat messages
     */
    handleChatMessage(socket, data) {
        const player = this.authenticatedPlayers.get(socket.id);
        if (!player) return;
        
        const { message } = data;
        if (!message || message.length > 200) return;
        
        // Broadcast to authenticated users
        this.io.to('authenticated').emit('chat_message', {
            address: player.address,
            username: player.address.substring(0, 6) + '...',
            message,
            timestamp: Date.now()
        });
    }
    
    /**
     * 🚪 Handle disconnect
     */
    handleDisconnect(socket) {
        const player = this.connectedPlayers.get(socket.id);
        
        if (player && player.walletAddress) {
            console.log(`🚪 Player disconnected: ${player.walletAddress}`);
            this.playerSockets.delete(player.walletAddress);
        }
        
        this.connectedPlayers.delete(socket.id);
        this.authenticatedPlayers.delete(socket.id);
    }
    
    /**
     * 🎮 Setup game engine listeners
     */
    setupGameEngineListeners() {
        // Broadcast all game events to connected clients
        this.gameEngine.on('roundStarted', (data) => {
            this.io.emit('round_started', data);
        });
        
        this.gameEngine.on('multiplierUpdate', (data) => {
            this.io.emit('multiplier_update', data);
        });
        
        this.gameEngine.on('roundCrashed', (data) => {
            this.io.emit('round_crashed', data);
            
            // Clear all active bets
            for (const [socketId, player] of this.authenticatedPlayers) {
                if (player.activeBet && player.activeBet.roundId === data.roundId) {
                    player.activeBet = null;
                }
            }
        });
        
        this.gameEngine.on('betPlaced', (data) => {
            this.io.emit('bet_placed_global', {
                address: data.playerId.substring(0, 6) + '...',
                amount: data.betAmount
            });
            
            // Broadcast updated live betting table
            this.broadcastLiveBettingTable();
        });
        
        this.gameEngine.on('playerCashedOut', (data) => {
            this.io.emit('player_cashed_out', {
                address: data.playerId.substring(0, 6) + '...',
                multiplier: data.multiplier,
                payout: data.payout
            });
            
            // Update live betting table
            this.broadcastLiveBettingTable();
        });
    }
    
    /**
     * 🛡️ Rate limiting
     */
    checkRateLimit(address) {
        const now = Date.now();
        const limit = this.rateLimits.get(address) || { count: 0, resetTime: now + 60000 };
        
        if (now > limit.resetTime) {
            limit.count = 1;
            limit.resetTime = now + 60000;
        } else {
            limit.count++;
        }
        
        this.rateLimits.set(address, limit);
        
        return limit.count <= 10; // Max 10 requests per minute
    }
    
    /**
     * 📊 Get server stats
     */
    getStats() {
        return {
            connectedPlayers: this.connectedPlayers.size,
            authenticatedPlayers: this.authenticatedPlayers.size,
            gameState: this.gameEngine.getGameStats()
        };
    }

    /**
     * 🔧 Expose game engine for API routes
     */
    getGameEngine() {
        return this.gameEngine;
    }

    /**
     * 📊 Broadcast live betting table to all clients
     */
    broadcastLiveBettingTable() {
        const activeBettors = [];
        
        // Collect all players with active bets
        for (const player of this.authenticatedPlayers.values()) {
            if (player.activeBet) {
                activeBettors.push({
                    username: player.address.substring(0, 6) + '...',
                    betAmount: player.activeBet.amount,
                    status: player.activeBet.cashedOut ? 'cashed_out' : 'active',
                    multiplier: player.activeBet.multiplier || null
                });
            }
        }
        
        // Broadcast to all connected clients
        this.io.emit('live_betting_table', activeBettors);
    }

    /**
     * 🧹 Clean up inactive connections (compatibility with production-integration)
     */
    cleanupInactiveConnections() {
        const now = Date.now();
        for (const [socketId, player] of this.connectedPlayers) {
            // Consider inactive after 10 minutes without auth
            if (!player.authenticated && now - player.connectedAt > 10 * 60 * 1000) {
                const socket = this.io.sockets.sockets.get(socketId);
                if (socket) {
                    socket.disconnect(true);
                }
                this.connectedPlayers.delete(socketId);
                this.authenticatedPlayers.delete(socketId);
            }
        }
    }
}

module.exports = EnhancedWebSocketServer;
