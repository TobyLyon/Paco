/**
 * 🎰 Reference PacoRocko Production Integration (EXACT SYNC FIX)
 * 
 * This uses the EXACT reference implementation that we know works.
 * No complex event mapping - direct socket events matching working frontend.
 */

const http = require('http');
const { Server } = require('socket.io');

// Use the EXACT reference crash engine
const ReferenceCrashEngine = require('./backend/reference-crash-engine');

// Keep existing wallet integration
let WalletIntegration = null;
try {
    WalletIntegration = require('./backend/wallet-integration-abstract.js').getWalletIntegration;
    console.log('🏦 Using Abstract wallet integration');
} catch (e) {
    WalletIntegration = require('./backend/wallet-integration.js');
    console.log('🏦 Fallback to basic wallet integration');
}

class ReferencePacoRockoProduction {
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
        
        // CORS configuration
        const allowedOrigins = [
            'https://pacothechicken.xyz',
            'https://www.pacothechicken.xyz',
            'http://localhost:3000',
            'http://localhost:5173'
        ];
        
        // Initialize Socket.IO (EXACT reference settings)
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
        
        // Initialize components
        this.walletIntegration = null;
        this.referenceEngine = null;
        this.connectedPlayers = new Map();

        this.init();
    }

    /**
     * 🚀 Initialize with reference engine
     */
    async init() {
        try {
            console.log('🎰 Initializing Reference PacoRocko (EXACT SYNC)...');
            
            // Initialize wallet integration
            if (typeof WalletIntegration === 'function') {
                this.walletIntegration = WalletIntegration();
            } else {
                this.walletIntegration = new WalletIntegration({
                    supabaseUrl: process.env.SUPABASE_URL,
                    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
                    enableDatabase: this.config.enableDatabase
                });
            }
            
            // Initialize REFERENCE crash engine (EXACT copy from working repo)
            console.log('🎮 Starting REFERENCE crash engine (exact events, exact timing)...');
            this.referenceEngine = new ReferenceCrashEngine(this.io);
            
            // Setup WebSocket handlers (SIMPLIFIED)
            this.setupSocketHandlers();
            
            // Setup Express API routes
            this.setupAPIRoutes();
            
            console.log('✅ Reference PacoRocko initialized - using EXACT working implementation');
            
        } catch (error) {
            console.error('❌ Failed to initialize Reference PacoRocko:', error);
            throw error;
        }
    }
    
    /**
     * 🔌 Setup WebSocket handlers (MINIMAL - engine handles events directly)
     */
    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            console.log(`🔗 Player connected: ${socket.id}`);
            this.connectedPlayers.set(socket.id, { id: socket.id, joinTime: Date.now() });
            
            // Send game status to new player
            socket.emit('game_status', this.referenceEngine.getGameStatus());
            
            // Handle disconnection
            socket.on('disconnect', () => {
                console.log(`🔌 Player disconnected: ${socket.id}`);
                this.connectedPlayers.delete(socket.id);
            });
            
            // Basic ping/pong for connection testing
            socket.on('ping', () => {
                socket.emit('pong');
            });
        });
        
        console.log('🔌 WebSocket handlers setup (minimal - engine emits directly)');
    }
    
    /**
     * 🛤️ Setup Express API routes (for betting integration)
     */
    setupAPIRoutes() {
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({ 
                status: 'OK', 
                service: 'Reference PacoRocko',
                engine: 'Reference Engine (Exact Copy)',
                players: this.connectedPlayers.size,
                timestamp: new Date().toISOString()
            });
        });
        
        // Game status
        this.app.get('/game/status', (req, res) => {
            res.json(this.referenceEngine.getGameStatus());
        });
        
        // Place bet (for wallet integration)
        this.app.post('/game/bet', async (req, res) => {
            try {
                const { userId, username, betAmount, payoutMultiplier } = req.body;
                
                // Validate input
                if (!userId || !username || !betAmount || !payoutMultiplier) {
                    return res.status(400).json({ error: 'Missing required parameters' });
                }
                
                // Place bet through engine
                const result = this.referenceEngine.placeBet(userId, username, betAmount, payoutMultiplier);
                
                if (result.success) {
                    res.json(result);
                } else {
                    res.status(400).json(result);
                }
                
            } catch (error) {
                console.error('❌ Bet placement error:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });
        
        // Manual cash out
        this.app.post('/game/cashout', (req, res) => {
            try {
                const { userId } = req.body;
                
                if (!userId) {
                    return res.status(400).json({ error: 'Missing userId' });
                }
                
                const result = this.referenceEngine.manualCashOut(userId);
                
                if (result.success) {
                    res.json(result);
                } else {
                    res.status(400).json(result);
                }
                
            } catch (error) {
                console.error('❌ Cash out error:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });
        
        console.log('🛤️ Express API routes setup');
    }
    
    /**
     * 🚀 Start the server
     */
    async start(port = 3001) {
        return new Promise((resolve, reject) => {
            try {
                this.server.listen(port, () => {
                    console.log(`🚀 Reference PacoRocko running on port ${port}`);
                    console.log(`🔗 WebSocket endpoint: ws://localhost:${port}`);
                    console.log(`🎰 Using EXACT reference implementation for perfect sync`);
                    resolve();
                });
            } catch (error) {
                reject(error);
            }
        });
    }
    
    /**
     * 🛑 Stop the server
     */
    async stop() {
        if (this.referenceEngine) {
            this.referenceEngine.stop();
        }
        
        if (this.server) {
            this.server.close();
        }
        
        console.log('🛑 Reference PacoRocko stopped');
    }
}

module.exports = ReferencePacoRockoProduction;
