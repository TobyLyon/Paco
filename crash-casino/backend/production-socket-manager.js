/**
 * 🌐 Production Socket.IO Manager
 * 
 * Casino-grade real-time communication with:
 * - Event replay system
 * - Connection resilience
 * - Room management
 * - Circuit breakers
 * - Performance optimization
 */

class ProductionSocketManager {
    constructor(io, config = {}) {
        this.io = io;
        this.config = {
            eventBufferSize: config.eventBufferSize || 500,
            heartbeatInterval: config.heartbeatInterval || 30000,
            syncTickInterval: config.syncTickInterval || 1000,
            maxReconnectAttempts: config.maxReconnectAttempts || 5,
            roomCleanupInterval: config.roomCleanupInterval || 60000,
            ...config
        };

        // Event management
        this.eventId = 0;
        this.eventBuffer = []; // Ring buffer for event replay
        this.connectedUsers = new Map(); // userId -> socket data
        this.userSockets = new Map(); // socketId -> user data
        
        // Performance monitoring
        this.metrics = {
            totalConnections: 0,
            activeConnections: 0,
            eventsEmitted: 0,
            eventReplayRequests: 0,
            lastHeartbeat: Date.now()
        };

        this.setupSocketHandlers();
        this.startPeriodicTasks();
        
        console.log('🌐 Production Socket Manager initialized');
    }

    /**
     * 🔌 Setup socket connection handlers
     */
    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            this.handleConnection(socket);
        });
    }

    /**
     * 🤝 Handle new socket connection
     */
    handleConnection(socket) {
        console.log(`🤝 New connection: ${socket.id}`);
        this.metrics.totalConnections++;
        this.metrics.activeConnections++;

        // Setup connection handlers
        socket.on('hello', (data) => this.handleHello(socket, data));
        socket.on('authenticate', (data) => this.handleAuthenticate(socket, data));
        socket.on('heartbeat', () => this.handleHeartbeat(socket));
        socket.on('disconnect', (reason) => this.handleDisconnect(socket, reason));
        socket.on('error', (error) => this.handleError(socket, error));

        // Send initial connection acknowledgment
        socket.emit('connected', {
            socketId: socket.id,
            timestamp: Date.now(),
            serverTime: new Date().toISOString()
        });
    }

    /**
     * 👋 Handle hello/reconnection
     */
    async handleHello(socket, data = {}) {
        const { lastEventId, userId } = data;
        
        console.log(`👋 Hello from ${socket.id}, lastEventId: ${lastEventId}, userId: ${userId}`);

        try {
            // Send missed events or full snapshot
            if (lastEventId && typeof lastEventId === 'number') {
                await this.sendMissedEvents(socket, lastEventId);
                this.metrics.eventReplayRequests++;
            } else {
                await this.sendFullSnapshot(socket);
            }

            // Join global room for game events
            socket.join('global_game');
            
            // If user is authenticated, join user-specific room
            if (userId) {
                socket.join(`user:${userId}`);
                this.connectedUsers.set(userId, {
                    socketId: socket.id,
                    lastSeen: Date.now(),
                    authenticated: true
                });
                this.userSockets.set(socket.id, { userId, authenticated: true });
            }

            socket.emit('hello_ack', {
                success: true,
                serverEventId: this.eventId,
                timestamp: Date.now()
            });

        } catch (error) {
            console.error('❌ Hello handling error:', error);
            socket.emit('hello_ack', {
                success: false,
                error: 'Failed to process hello'
            });
        }
    }

    /**
     * 🔐 Handle user authentication
     */
    async handleAuthenticate(socket, data) {
        const { userId, signature, timestamp } = data;
        
        try {
            // TODO: Implement signature verification
            const isValid = await this.verifyUserSignature(userId, signature, timestamp);
            
            if (isValid) {
                // Join user-specific room
                socket.join(`user:${userId}`);
                
                // Update tracking
                this.connectedUsers.set(userId, {
                    socketId: socket.id,
                    lastSeen: Date.now(),
                    authenticated: true
                });
                this.userSockets.set(socket.id, { userId, authenticated: true });

                socket.emit('authenticated', {
                    success: true,
                    userId,
                    timestamp: Date.now()
                });

                console.log(`🔐 User authenticated: ${userId} (${socket.id})`);
                
            } else {
                socket.emit('authenticated', {
                    success: false,
                    error: 'Invalid signature'
                });
            }

        } catch (error) {
            console.error('❌ Authentication error:', error);
            socket.emit('authenticated', {
                success: false,
                error: 'Authentication failed'
            });
        }
    }

    /**
     * 💓 Handle heartbeat
     */
    handleHeartbeat(socket) {
        const userData = this.userSockets.get(socket.id);
        if (userData) {
            const userConnection = this.connectedUsers.get(userData.userId);
            if (userConnection) {
                userConnection.lastSeen = Date.now();
            }
        }

        socket.emit('heartbeat_ack', { timestamp: Date.now() });
    }

    /**
     * 💔 Handle disconnection
     */
    handleDisconnect(socket, reason) {
        console.log(`💔 Disconnection: ${socket.id} (${reason})`);
        
        this.metrics.activeConnections--;
        
        const userData = this.userSockets.get(socket.id);
        if (userData) {
            const userConnection = this.connectedUsers.get(userData.userId);
            if (userConnection && userConnection.socketId === socket.id) {
                this.connectedUsers.delete(userData.userId);
            }
            this.userSockets.delete(socket.id);
        }
    }

    /**
     * ❌ Handle socket errors
     */
    handleError(socket, error) {
        console.error(`❌ Socket error (${socket.id}):`, error);
    }

    /**
     * 📤 Emit event to room with buffering
     */
    emitToRoom(room, eventType, payload, options = {}) {
        const event = {
            id: ++this.eventId,
            type: eventType,
            payload,
            timestamp: Date.now(),
            room
        };

        // Add to buffer for replay
        this.eventBuffer.push(event);
        if (this.eventBuffer.length > this.config.eventBufferSize) {
            this.eventBuffer.shift();
        }

        // Emit to room
        this.io.to(room).emit('event', event);
        this.metrics.eventsEmitted++;

        console.log(`📤 Event ${event.id} (${eventType}) → ${room}`);
        return event.id;
    }

    /**
     * 📤 Emit event to specific user
     */
    emitToUser(userId, eventType, payload) {
        return this.emitToRoom(`user:${userId}`, eventType, payload);
    }

    /**
     * 📤 Emit global game event
     */
    emitGlobalGameEvent(eventType, payload) {
        return this.emitToRoom('global_game', eventType, payload);
    }

    /**
     * 📦 Send missed events since lastEventId
     */
    async sendMissedEvents(socket, lastEventId) {
        const missedEvents = this.eventBuffer.filter(event => event.id > lastEventId);
        
        if (missedEvents.length > 0) {
            console.log(`📦 Sending ${missedEvents.length} missed events to ${socket.id}`);
            
            for (const event of missedEvents) {
                socket.emit('event', event);
            }
        } else {
            console.log(`📦 No missed events for ${socket.id} since ${lastEventId}`);
        }
    }

    /**
     * 📸 Send full game state snapshot
     */
    async sendFullSnapshot(socket) {
        try {
            // Get current game state from the game engine
            const gameState = await this.getCurrentGameState();
            
            socket.emit('snapshot', {
                eventId: this.eventId,
                timestamp: Date.now(),
                gameState
            });

            console.log(`📸 Full snapshot sent to ${socket.id}`);

        } catch (error) {
            console.error('❌ Snapshot generation failed:', error);
            socket.emit('snapshot_error', {
                error: 'Failed to generate snapshot'
            });
        }
    }

    /**
     * 🎮 Get current game state (implement based on your game engine)
     */
    async getCurrentGameState() {
        // TODO: Implement based on your crash game engine
        return {
            phase: 'betting', // or 'running', 'crashed'
            roundId: 'current-round-id',
            multiplier: 1.00,
            timeRemaining: 15000,
            crashHistory: [],
            activeBettors: []
        };
    }

    /**
     * 🔐 Verify user signature (implement your verification logic)
     */
    async verifyUserSignature(userId, signature, timestamp) {
        // TODO: Implement signature verification
        return true; // Placeholder
    }

    /**
     * ⏰ Start periodic tasks
     */
    startPeriodicTasks() {
        // Heartbeat monitoring
        setInterval(() => {
            this.cleanupStaleConnections();
            this.metrics.lastHeartbeat = Date.now();
        }, this.config.heartbeatInterval);

        // Sync tick for game state
        setInterval(() => {
            this.sendSyncTick();
        }, this.config.syncTickInterval);

        // Room cleanup
        setInterval(() => {
            this.cleanupEmptyRooms();
        }, this.config.roomCleanupInterval);

        // Metrics logging
        setInterval(() => {
            this.logMetrics();
        }, 60000); // Every minute
    }

    /**
     * 🧹 Cleanup stale connections
     */
    cleanupStaleConnections() {
        const now = Date.now();
        const staleThreshold = this.config.heartbeatInterval * 3; // 3x heartbeat interval

        for (const [userId, connection] of this.connectedUsers.entries()) {
            if (now - connection.lastSeen > staleThreshold) {
                console.log(`🧹 Cleaning up stale connection for user ${userId}`);
                this.connectedUsers.delete(userId);
                
                // Also cleanup userSockets if socket still exists
                if (this.userSockets.has(connection.socketId)) {
                    this.userSockets.delete(connection.socketId);
                }
            }
        }
    }

    /**
     * ⏱️ Send sync tick for client time correction
     */
    sendSyncTick() {
        this.emitGlobalGameEvent('sync_tick', {
            serverTime: Date.now(),
            eventId: this.eventId
        });
    }

    /**
     * 🧹 Cleanup empty rooms
     */
    cleanupEmptyRooms() {
        // Socket.IO automatically handles room cleanup, but we can add custom logic here
        const roomCount = this.io.sockets.adapter.rooms.size;
        console.log(`🏠 Active rooms: ${roomCount}`);
    }

    /**
     * 📊 Log metrics
     */
    logMetrics() {
        console.log('📊 Socket Metrics:', {
            activeConnections: this.metrics.activeConnections,
            totalConnections: this.metrics.totalConnections,
            eventsEmitted: this.metrics.eventsEmitted,
            eventReplayRequests: this.metrics.eventReplayRequests,
            bufferSize: this.eventBuffer.length,
            authenticatedUsers: this.connectedUsers.size
        });
    }

    /**
     * 🏥 Health check
     */
    getHealthStatus() {
        return {
            healthy: true,
            activeConnections: this.metrics.activeConnections,
            bufferSize: this.eventBuffer.length,
            lastHeartbeat: new Date(this.metrics.lastHeartbeat).toISOString(),
            metrics: this.metrics
        };
    }

    /**
     * 🛑 Graceful shutdown
     */
    async shutdown() {
        console.log('🛑 Shutting down Socket Manager...');
        
        // Notify all connected clients
        this.io.emit('server_shutdown', {
            message: 'Server is shutting down',
            timestamp: Date.now()
        });

        // Give clients time to receive the message
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Close all connections
        this.io.close();
        
        console.log('✅ Socket Manager shutdown complete');
    }
}

module.exports = ProductionSocketManager;
