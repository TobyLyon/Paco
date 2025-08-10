/**
 * 🔌 PacoRocko WebSocket Server (Compiled from TypeScript)
 * 
 * Production-ready JavaScript version for immediate deployment
 */

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const CrashGameEngine = require('./game-engine-compiled');

class CrashWebSocketServer {
    constructor(server, config = {}) {
        console.log('🔌🔌🔌 WEBSOCKET SERVER CONSTRUCTOR CALLED - DEBUG VERSION v2.1 LOADED AT', new Date().toISOString(), '🔌🔌🔌');
        
        // Handle both old (jwtSecret string) and new (config object) formats
        if (typeof config === 'string') {
            this.jwtSecret = config;
            this.corsOrigin = "*";
            this.wsPath = '/crash-ws';
        } else {
            this.jwtSecret = config.jwtSecret || 'default-secret';
            this.corsOrigin = config.corsOrigin || "*";
            this.wsPath = config.path || '/crash-ws';
        }
        
        console.log('🔧 WebSocket config:', { 
            corsOrigin: this.corsOrigin, 
            path: this.wsPath 
        });
        
        this.io = new Server(server, {
            cors: {
                origin: this.corsOrigin,
                methods: ["GET", "POST"],
                credentials: true
            },
            path: this.wsPath,
            transports: ['websocket', 'polling'],
            allowEIO3: true
        });

        this.gameEngine = new CrashGameEngine();
        this.connectedPlayers = new Map();
        this.socketToPlayer = new Map();
        
        this.setupGameEngineListeners();
        this.setupSocketHandlers();
        
        console.log('🎰 Crash WebSocket server initialized');
    }

    /**
     * 🎮 Setup game engine event listeners
     */
    setupGameEngineListeners() {
        this.gameEngine.on('roundCreated', (round) => {
            this.broadcast('gameState', {
                status: 'pending',
                roundId: round.id,
                timeUntilStart: 5000
            });
        });

        this.gameEngine.on('roundStarted', (data) => {
            this.broadcast('roundStarted', {
                roundId: data.roundId,
                startTime: Date.now()
            });
        });

        this.gameEngine.on('multiplierUpdate', (data) => {
            this.broadcast('multiplierUpdate', {
                roundId: data.roundId,
                multiplier: data.multiplier,
                elapsed: data.elapsed
            });
        });

        this.gameEngine.on('roundCrashed', (data) => {
            this.broadcast('roundCrashed', {
                roundId: data.roundId,
                crashPoint: data.crashPoint,
                finalMultiplier: data.finalMultiplier,
                totalPayout: data.totalPayout
            });
        });

        this.gameEngine.on('betPlaced', (data) => {
            this.broadcast('betPlaced', {
                roundId: data.roundId,
                playerId: data.bet.playerId,
                amount: data.bet.amount,
                totalBets: data.totalBets,
                totalAmount: data.totalAmount
            });
        });

        this.gameEngine.on('playerCashedOut', (data) => {
            this.broadcast('playerCashedOut', {
                roundId: data.roundId,
                playerId: data.playerId,
                multiplier: data.multiplier,
                payout: data.payout
            });
        });

        this.gameEngine.on('readyForNewRound', () => {
            console.log('🔄 readyForNewRound event received, starting new round in 2s...');
            setTimeout(() => {
                console.log('🎰 Starting new round from readyForNewRound event');
                this.gameEngine.startNewRound();
            }, 2000);
        });
    }

    /**
     * 🔌 Setup socket connection handlers
     */
    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            console.log(`🔗 New connection: ${socket.id}`);
            
            // Create temporary player record
            const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const player = {
                id: playerId,
                socketId: socket.id,
                isAuthenticated: false,
                lastActivity: Date.now()
            };
            
            this.connectedPlayers.set(playerId, player);
            this.socketToPlayer.set(socket.id, playerId);

            // Send current game state
            const gameState = this.gameEngine.getGameState();
            this.sendToSocket(socket.id, 'gameState', {
                isRunning: gameState.isRunning,
                currentMultiplier: gameState.currentMultiplier,
                roundId: gameState.currentRound?.id,
                status: gameState.currentRound?.status,
                config: gameState.config
            });

            // Handle client messages
            socket.on('message', (message) => {
                this.handleClientMessage(socket.id, message);
            });

            socket.on('authenticate', (data) => {
                this.handleAuthentication(socket.id, data);
            });

            socket.on('placeBet', (data) => {
                this.handlePlaceBet(socket.id, data);
            });

            socket.on('cashOut', () => {
                this.handleCashOut(socket.id);
            });

            socket.on('disconnect', () => {
                this.handleDisconnection(socket.id);
            });

            socket.on('ping', () => {
                socket.emit('pong');
                this.updatePlayerActivity(socket.id);
            });
        });

        // Start the first round  
        console.log('⏰ Scheduling first round start in 3 seconds...');
        setTimeout(() => {
            console.log('🎰 FORCING FIRST ROUND START NOW!');
            try {
                this.gameEngine.startNewRound();
                console.log('✅ First round start command completed');
            } catch (error) {
                console.error('❌ Failed to start first round:', error);
                // Retry in 5 seconds
                setTimeout(() => {
                    console.log('🔄 Retrying first round start...');
                    this.gameEngine.startNewRound();
                }, 5000);
            }
        }, 3000);
    }

    /**
     * 🔐 Handle wallet authentication
     */
    handleAuthentication(socketId, data) {
        try {
            const playerId = this.socketToPlayer.get(socketId);
            if (!playerId) return;

            const player = this.connectedPlayers.get(playerId);
            if (!player) return;

            // Simple validation for development
            // In production, verify wallet signature
            if (data.walletAddress && data.walletAddress.length === 42) {
                player.walletAddress = data.walletAddress;
                player.isAuthenticated = true;
                player.lastActivity = Date.now();

                this.sendToSocket(socketId, 'authenticated', {
                    success: true,
                    playerId: player.id,
                    walletAddress: player.walletAddress
                });

                console.log(`✅ Player authenticated: ${player.walletAddress}`);
            } else {
                throw new Error('Invalid wallet address');
            }

        } catch (error) {
            this.sendToSocket(socketId, 'error', {
                message: 'Authentication failed',
                code: 'AUTH_FAILED'
            });
        }
    }

    /**
     * 💰 Handle bet placement
     */
    async handlePlaceBet(socketId, data) {
        const playerId = this.socketToPlayer.get(socketId);
        if (!playerId) return;

        const player = this.connectedPlayers.get(playerId);
        if (!player || !player.isAuthenticated || !player.walletAddress) {
            this.sendToSocket(socketId, 'error', {
                message: 'Must be authenticated to place bets',
                code: 'NOT_AUTHENTICATED'
            });
            return;
        }

        try {
            // First, process wallet transaction
            if (this.walletIntegration) {
                const gameState = this.gameEngine.getGameState();
                const roundId = gameState.currentRound?.id;
                
                if (!roundId) {
                    this.sendToSocket(socketId, 'error', {
                        message: 'No active round for betting',
                        code: 'NO_ACTIVE_ROUND'
                    });
                    return;
                }

                const walletResult = await this.walletIntegration.placeBet(
                    player.walletAddress,
                    data.amount,
                    roundId
                );

                if (!walletResult.success) {
                    this.sendToSocket(socketId, 'error', {
                        message: walletResult.error,
                        code: 'WALLET_ERROR'
                    });
                    return;
                }

                // Now place bet in game engine
                const bet = this.gameEngine.placeBet(
                    player.id,
                    player.walletAddress,
                    data.amount,
                    walletResult.transactionId
                );

                if (bet) {
                    this.sendToSocket(socketId, 'betPlaced', {
                        success: true,
                        bet: {
                            amount: bet.amount,
                            timestamp: bet.timestamp,
                            transactionId: walletResult.transactionId
                        },
                        newBalance: walletResult.newBalance
                    });
                }
            } else {
                // Fallback to original behavior
                const bet = this.gameEngine.placeBet(
                    player.id,
                    player.walletAddress,
                    data.amount,
                    data.txHash
                );

                if (bet) {
                    this.sendToSocket(socketId, 'betPlaced', {
                        success: true,
                        bet: {
                            amount: bet.amount,
                            timestamp: bet.timestamp
                        }
                    });
                }
            }

        } catch (error) {
            this.sendToSocket(socketId, 'error', {
                message: error.message,
                code: 'BET_FAILED'
            });
        }
    }

    /**
     * 🏃‍♂️ Handle cash out
     */
    async handleCashOut(socketId) {
        const playerId = this.socketToPlayer.get(socketId);
        if (!playerId) return;

        const player = this.connectedPlayers.get(playerId);
        if (!player || !player.isAuthenticated) {
            this.sendToSocket(socketId, 'error', {
                message: 'Must be authenticated to cash out',
                code: 'NOT_AUTHENTICATED'
            });
            return;
        }

        try {
            const result = this.gameEngine.cashOut(player.id);
            
            if (result.success && this.walletIntegration) {
                // Get the bet details from game engine
                const gameState = this.gameEngine.getGameState();
                const bet = gameState.currentRound?.bets?.get(player.id);
                
                if (bet) {
                    // Process wallet cash out
                    const walletResult = await this.walletIntegration.processCashOut(
                        player.walletAddress,
                        gameState.currentRound.id,
                        result.multiplier,
                        bet.amount
                    );

                    if (walletResult.success) {
                        this.sendToSocket(socketId, 'cashOutSuccess', {
                            multiplier: result.multiplier,
                            payout: result.payout,
                            newBalance: walletResult.newBalance,
                            transactionId: walletResult.transactionId
                        });
                    } else {
                        this.sendToSocket(socketId, 'error', {
                            message: 'Cash out failed - wallet error',
                            code: 'WALLET_CASHOUT_FAILED'
                        });
                    }
                } else {
                    this.sendToSocket(socketId, 'error', {
                        message: 'Cash out failed - bet not found',
                        code: 'BET_NOT_FOUND'
                    });
                }
            } else if (result.success) {
                // Fallback to original behavior
                this.sendToSocket(socketId, 'cashOutSuccess', {
                    multiplier: result.multiplier,
                    payout: result.payout
                });
            } else {
                this.sendToSocket(socketId, 'error', {
                    message: 'Cash out failed - no active bet or round ended',
                    code: 'CASHOUT_FAILED'
                });
            }
        } catch (error) {
            console.error('❌ Cash out error:', error);
            this.sendToSocket(socketId, 'error', {
                message: 'Cash out failed - system error',
                code: 'SYSTEM_ERROR'
            });
        }
    }

    /**
     * 📨 Handle generic client messages
     */
    handleClientMessage(socketId, message) {
        this.updatePlayerActivity(socketId);

        switch (message.type) {
            case 'subscribe':
                this.sendToSocket(socketId, 'gameState', this.gameEngine.getGameState());
                break;

            default:
                this.sendToSocket(socketId, 'error', {
                    message: `Unknown message type: ${message.type}`,
                    code: 'UNKNOWN_MESSAGE_TYPE'
                });
        }
    }

    /**
     * 🚪 Handle client disconnection
     */
    handleDisconnection(socketId) {
        const playerId = this.socketToPlayer.get(socketId);
        
        if (playerId) {
            const player = this.connectedPlayers.get(playerId);
            if (player) {
                console.log(`🚪 Player disconnected: ${player.walletAddress || player.id}`);
            }
            
            this.connectedPlayers.delete(playerId);
            this.socketToPlayer.delete(socketId);
        }
        
        console.log(`🔌 Connection closed: ${socketId}`);
    }

    /**
     * 📡 Send message to specific socket
     */
    sendToSocket(socketId, type, data) {
        const message = {
            type,
            data,
            timestamp: Date.now()
        };
        
        this.io.to(socketId).emit('message', message);
    }

    /**
     * 📢 Broadcast message to all connected clients
     */
    broadcast(type, data) {
        const message = {
            type,
            data,
            timestamp: Date.now()
        };
        
        this.io.emit('message', message);
    }

    /**
     * 💓 Update player activity timestamp
     */
    updatePlayerActivity(socketId) {
        const playerId = this.socketToPlayer.get(socketId);
        if (playerId) {
            const player = this.connectedPlayers.get(playerId);
            if (player) {
                player.lastActivity = Date.now();
            }
        }
    }

    /**
     * 🧹 Clean up inactive connections
     */
    cleanupInactiveConnections() {
        const now = Date.now();
        const timeout = 5 * 60 * 1000; // 5 minutes

        for (const [playerId, player] of this.connectedPlayers) {
            if (now - player.lastActivity > timeout) {
                console.log(`🧹 Cleaning up inactive player: ${player.id}`);
                
                const socket = this.io.sockets.sockets.get(player.socketId);
                if (socket) {
                    socket.disconnect(true);
                }
                
                this.connectedPlayers.delete(playerId);
                this.socketToPlayer.delete(player.socketId);
            }
        }
    }

    /**
     * 📊 Get server statistics
     */
    getStats() {
        const authenticated = Array.from(this.connectedPlayers.values())
            .filter(p => p.isAuthenticated).length;

        return {
            connectedPlayers: this.connectedPlayers.size,
            authenticatedPlayers: authenticated,
            gameState: this.gameEngine.getGameState()
        };
    }

    /**
     * 🔧 Get game engine for admin operations
     */
    getGameEngine() {
        return this.gameEngine;
    }
}

module.exports = CrashWebSocketServer;
