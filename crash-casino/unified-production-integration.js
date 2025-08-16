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

// Import security utilities
const MultiplierCalculator = require('./shared/multiplier-calculator');
const InputValidator = require('./utils/input-validator');

// Import money utilities for safe calculations
const { parseUserAmount } = require('../src/lib/money');

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
        
        // Bet type tracking to prevent double payouts
        this.playerBetTypes = new Map(); // socketId -> 'balance' | 'blockchain'
        this.playerBetData = new Map();  // socketId -> { amount, type, timestamp }
        
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
            
            // Initialize Balance API for atomic transactions
            const { BalanceAPI } = require('./backend/balance-api');
            this.balanceAPI = new BalanceAPI(
                process.env.SUPABASE_URL,
                process.env.SUPABASE_SERVICE_ROLE_KEY
            );
            console.log('✅ Balance API initialized with atomic transactions');
            
            // Initialize Solvency Manager
            const SolvencyManager = require('./backend/solvency-manager');
            this.solvencyManager = new SolvencyManager(this.walletIntegration, this.balanceAPI, {
                maxLiabilityRatio: parseFloat(process.env.MAX_LIABILITY_FACTOR) || 0.8,
                minReserveETH: process.env.MIN_RESERVE_ETH ? parseUserAmount(process.env.MIN_RESERVE_ETH) : parseUserAmount('1.0'),
                emergencyThreshold: parseFloat(process.env.EMERGENCY_THRESHOLD) || 0.9
            });
            console.log('✅ Solvency Manager initialized');

            // Initialize unified crash engine (SERVER AUTHORITY) with enhanced security
            console.log('🎮 Starting unified crash engine with security enhancements...');
            this.crashEngine = new UnifiedCrashEngine(this.io, {
                bettingPhaseDuration: 15000, // 15 seconds (user requested)
                cashoutPhaseDuration: 3000,  // 3 seconds (proven timing)
                betValidation: {
                                minBet: process.env.MIN_BET_AMOUNT ? parseUserAmount(process.env.MIN_BET_AMOUNT) : parseUserAmount('0.001'),
            maxBet: process.env.MAX_BET_AMOUNT ? parseUserAmount(process.env.MAX_BET_AMOUNT) : parseUserAmount('100.0'),
                    betCooldownMs: parseInt(process.env.BET_COOLDOWN_MS) || 1000,
                    maxBetsPerRound: parseInt(process.env.MAX_BETS_PER_ROUND) || 1000
                },
                rng: {
                    houseEdge: parseFloat(process.env.HOUSE_EDGE) || 0.01,
                    minCrashPoint: 1.00,
                    maxCrashPoint: 1000.0
                }
            });
            
            // Setup engine event listeners
            this.setupEngineListeners();
            
            // Setup socket connection handlers
            this.setupSocketHandlers();
            
            // Setup balance API routes
            this.setupBalanceAPIRoutes();
            
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
            
            // Clean up liability for all players who didn't cash out
            const activePlayerIds = this.crashEngine.active_player_id_list || [];
            let totalLostBets = 0;
            let lostBetCount = 0;
            
            for (const playerId of activePlayerIds) {
                this.solvencyManager.removeBetLiability(playerId, 0); // 0 payout = lost bet
                
                // Track lost bet amount for house accounting
                const betData = this.playerBetData.get(playerId) || {};
                const betAmount = betData.betAmount || 0;
                if (betAmount > 0) {
                    totalLostBets += betAmount;
                    lostBetCount++;
                    console.log(`💸 Lost bet processed: ${playerId} - ${betAmount} ETH (already in house wallet)`);
                }
            }
            
            console.log(`🧹 Cleaned up liability for ${activePlayerIds.length} players who lost`);
            console.log(`🏠 House profit this round: ${totalLostBets.toFixed(6)} ETH from ${lostBetCount} lost bets`);
            
            // Clear bet data for next round
            for (const playerId of activePlayerIds) {
                this.playerBetData.delete(playerId);
                this.playerBetTypes.delete(playerId);
            }
            
            // Reveal serverSeed and persist
            try {
                const serverSeed = this.crashEngine.rng?.getCurrentRoundData?.()?.serverSeed;
                const commit = data.commitHash;
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
                
                // Use the actual bet type from the enhanced cashout data
                const isBalanceBet = data.betType === 'balance';
                
                if (isBalanceBet) {
                    // Add winnings to balance AND transfer actual ETH from house to hot wallet
                    try {
                        // Use the already initialized balance API
                        
                        // CRITICAL: Transfer actual ETH from house wallet to hot wallet
                        console.log(`🏦 Processing balance payout: transferring ${data.payout.toFixed(4)} ETH from house to hot wallet`);
                        const payoutResult = await this.balanceAPI.processBalancePayout(data.playerId, data.payout);
                        
                        // Add winnings to database balance
                        await this.balanceAPI.addWinnings(data.playerId, data.payout);
                        console.log(`💰 Added ${data.payout.toFixed(4)} ETH to balance for ${data.playerId}`);
                        console.log(`🏦 ETH transfer completed: ${payoutResult.txHash}`);
                        
                        // Notify player of balance update
                        this.io.emit('balanceWinnings', {
                            roundId: data.roundId,
                            playerId: data.playerId,
                            winnings: data.payout,
                            multiplier: data.multiplier,
                            txHash: payoutResult.txHash
                        });
                        
                    } catch (error) {
                        console.error('❌ Balance payout error:', error);
                        console.error('❌ This means ETH was not transferred from house to hot wallet!');
                    }
                } else {
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
            
            // Handle manual cashout (support both event types)
            socket.on('manual_cashout_early', async () => {
                try {
                    await this.handleCashout(socket);
                } catch (error) {
                    socket.emit('error', { message: error.message });
                }
            });
            
            socket.on('cash_out', async () => {
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
            
            // Handle provably fair verification requests
            socket.on('verify_round', (data) => {
                try {
                    if (this.crashEngine.rng) {
                        const verification = this.crashEngine.rng.verifyRound(
                            data.serverSeed,
                            data.clientSeed,
                            data.nonce,
                            data.expectedCrashPoint
                        );
                        socket.emit('verification_result', verification);
                    } else {
                        socket.emit('verification_error', { message: 'RNG not available' });
                    }
                } catch (error) {
                    socket.emit('verification_error', { message: error.message });
                }
            });
            
            // Handle solvency status requests
            socket.on('get_solvency_status', async () => {
                try {
                    const status = await this.solvencyManager.getStatus();
                    socket.emit('solvency_status', {
                        canAcceptBets: status.canAcceptBets,
                        utilizationPercent: status.utilizationPercent,
                        emergencyMode: status.emergencyMode
                    });
                } catch (error) {
                    socket.emit('solvency_error', { message: error.message });
                }
            });
            
            // Handle RNG statistics requests
            socket.on('get_rng_stats', () => {
                try {
                    if (this.crashEngine.rng) {
                        const stats = this.crashEngine.rng.getDistributionStats();
                        const config = this.crashEngine.rng.getConfig();
                        socket.emit('rng_stats', { stats, config });
                    } else {
                        socket.emit('rng_error', { message: 'RNG not available' });
                    }
                } catch (error) {
                    socket.emit('rng_error', { message: error.message });
                }
            });

            // Handle disconnection
            socket.on('disconnect', () => {
                console.log(`🔌 Client disconnected: ${socket.id}`);
                
                // Clean up player data
                const player = this.connectedPlayers.get(socket.id);
                if (player && player.playerId) {
                    // Remove any liability tracking for disconnected player
                    // (This is a safety measure - normally handled during cashout/crash)
                    this.solvencyManager.removeBetLiability(player.playerId, 0);
                }
                
                this.connectedPlayers.delete(socket.id);
                this.playerBetTypes.delete(socket.id);
                this.playerBetData.delete(socket.id);
            });
        });
        
        console.log('🔌 Socket connection handlers configured');
    }
    
    /**
     * 🏦 Setup Balance API routes
     */
    setupBalanceAPIRoutes() {
        console.log('🏦 Setting up Balance API routes...');
        
        try {
            // Initialize BalanceAPI
            const { BalanceAPI } = require('./backend/balance-api');
            this.balanceAPI = new BalanceAPI(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
            console.log('✅ BalanceAPI initialized successfully');
            
            // Get user balance
            this.app.get('/api/balance/:address', async (req, res) => {
                try {
                    if (!this.balanceAPI) {
                        return res.status(503).json({ error: 'Balance API not initialized' });
                    }
                    const balance = await this.balanceAPI.getBalance(req.params.address);
                    res.json({ balance });
                } catch (error) {
                    console.error('Balance check error:', error);
                    res.status(500).json({ error: 'Could not fetch balance' });
                }
            });

            // Check for new deposits
            this.app.get('/api/deposits/check/:address', async (req, res) => {
                try {
                    if (!this.balanceAPI) {
                        return res.status(503).json({ error: 'Balance API not initialized' });
                    }
                    const newDeposits = await this.balanceAPI.checkNewDeposits(req.params.address);
                    res.json({ newDeposits });
                } catch (error) {
                    console.error('Deposit check error:', error);
                    res.status(500).json({ error: 'Could not check deposits' });
                }
            });

            // Register deposit (for frontend tracking)
            this.app.post('/api/deposit/register', async (req, res) => {
                try {
                    // This endpoint is for frontend deposit tracking
                    // The actual deposit processing is handled by the deposit indexer
                    console.log('📝 Deposit registration request:', req.body);
                    res.json({ success: true, message: 'Deposit registered for tracking' });
                } catch (error) {
                    console.error('Deposit registration error:', error);
                    res.status(500).json({ error: 'Could not register deposit' });
                }
            });

            // Place bet with balance
            this.app.post('/api/bet/balance', async (req, res) => {
                try {
                    if (!this.balanceAPI) {
                        return res.status(503).json({ error: 'Balance API not initialized' });
                    }
                    const { playerAddress, amount } = req.body;
                    
                    // 🏠 CRITICAL FIX: Pass house wallet to ensure bet money is transferred
                    const houseWallet = this.walletIntegration?.houseWallet || null;
                    const houseWalletAddress = process.env.HOUSE_WALLET_ADDRESS || '0x1f8B1c4D05eF17Ebaa1E572426110146691e6C5a';
                    console.log(`🏠 Processing balance bet with house wallet: ${houseWallet ? 'PROVIDED' : 'MISSING'}`);
                    console.log(`🏠 House wallet address: ${houseWalletAddress}`);
                    
                    if (!houseWalletAddress) {
                        throw new Error('❌ CRITICAL: House wallet address not configured - cannot process bets safely');
                    }
                    
                    const result = await this.balanceAPI.placeBetWithBalance(playerAddress, amount, houseWalletAddress);
                    res.json(result);
                } catch (error) {
                    console.error('Balance bet error:', error);
                    res.status(400).json({ error: error.message });
                }
            });

            // Process withdrawal
            this.app.post('/api/withdraw', async (req, res) => {
                try {
                    if (!this.balanceAPI) {
                        return res.status(503).json({ error: 'Balance API not initialized' });
                    }
                    const { playerAddress, amount } = req.body;
                    const result = await this.balanceAPI.processWithdrawal(playerAddress, amount, this.walletIntegration);
                    res.json(result);
                } catch (error) {
                    console.error('Withdrawal error:', error);
                    res.status(500).json({ error: 'Could not process withdrawal' });
                }
            });
            
            // Admin monitoring endpoints
            this.app.get('/api/admin/solvency', async (req, res) => {
                try {
                    const status = await this.solvencyManager.getStatus();
                    res.json(status);
                } catch (error) {
                    res.status(500).json({ error: error.message });
                }
            });
            
            this.app.get('/api/admin/security', async (req, res) => {
                try {
                    const betValidatorStats = this.crashEngine.betValidator.getStats();
                    const rngStats = this.crashEngine.rng.getDistributionStats();
                    const rngConfig = this.crashEngine.rng.getConfig();
                    
                    res.json({
                        betValidator: betValidatorStats,
                        rng: { stats: rngStats, config: rngConfig },
                        server: {
                            uptime: Date.now() - this.gameStats.uptime,
                            totalRounds: this.gameStats.totalRounds,
                            connectedPlayers: this.connectedPlayers.size,
                            activeBets: this.playerBetTypes.size
                        }
                    });
                } catch (error) {
                    res.status(500).json({ error: error.message });
                }
            });
            
            this.app.get('/api/admin/health', async (req, res) => {
                try {
                    const health = {
                        status: 'healthy',
                        timestamp: new Date().toISOString(),
                        systems: {
                            crashEngine: !!this.crashEngine,
                            balanceAPI: !!this.balanceAPI,
                            solvencyManager: !!this.solvencyManager,
                            walletIntegration: !!this.walletIntegration
                        },
                        database: false, // Will be updated below
                        emergency: this.solvencyManager.emergencyMode
                    };
                    
                    // Test database connection
                    if (this.balanceAPI) {
                        try {
                            await this.balanceAPI.supabase.from('user_balances').select('count').limit(1);
                            health.systems.database = true;
                        } catch (dbError) {
                            health.status = 'degraded';
                            health.systems.database = false;
                        }
                    }
                    
                    res.json(health);
                } catch (error) {
                    res.status(500).json({ 
                        status: 'error',
                        error: error.message,
                        timestamp: new Date().toISOString()
                    });
                }
            });

            console.log('✅ Balance API routes configured with admin monitoring');
            
        } catch (error) {
            console.error('❌ Failed to setup Balance API routes:', error.message);
            console.error('📍 Balance API will not be available');
        }
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
        try {
            const player = this.connectedPlayers.get(socket.id);
            
            const { bet_amount, payout_multiplier, player_address, txHash } = data;
            
            // Validate inputs first
            const validatedAmount = InputValidator.validateAmount(bet_amount);
            const validatedMultiplier = InputValidator.validateMultiplier(payout_multiplier);
            const validatedAddress = player_address ? InputValidator.sanitizeAddress(player_address) : null;
            
            // Determine bet type: blockchain (has txHash) or balance (no txHash)
            const betType = txHash ? 'blockchain' : 'balance';
            
            // Store bet type and data for cashout processing
            this.playerBetTypes.set(socket.id, betType);
            this.playerBetData.set(socket.id, {
                amount: validatedAmount,
                multiplier: validatedMultiplier,
                type: betType,
                timestamp: Date.now(),
                address: validatedAddress,
                txHash: txHash
            });
        
        // For wallet-based bets, store the player address for cashouts
        if (validatedAddress) {
            player.lastBetAddress = validatedAddress;
            console.log(`🎯 BET DEBUG - Set lastBetAddress for socket ${socket.id}:`, player_address);
            console.log(`🎯 BET DEBUG - Player state:`, {
                authenticated: player.authenticated,
                playerId: player.playerId,
                lastBetAddress: player.lastBetAddress
            });
        }
        
            // Allow bets from wallet users even if not formally authenticated
            if (!player || (!player.authenticated && !validatedAddress)) {
                throw new Error('Not authenticated or no player address provided');
            }
        
            // Use validated amounts instead of raw inputs
            console.log(`🎯 BET PROCESSED - ${betType} bet: ${validatedAmount} ETH @ ${validatedMultiplier}x`);

            // Enhanced solvency check using SolvencyManager
            try {
                const effectivePlayerId = player.playerId || validatedAddress;
                await this.solvencyManager.canAcceptBet(effectivePlayerId, validatedAmount, validatedMultiplier);
                console.log('✅ Solvency check passed');
            } catch (solvencyError) {
                console.error('❌ Solvency check failed:', solvencyError.message);
                throw new Error(`Bet rejected: ${solvencyError.message}`);
            }
        
            // Process bet through crash engine
            // For balance bets, use wallet address as player ID if not authenticated
            const effectivePlayerId = player.playerId || validatedAddress;
            const effectiveUsername = player.username || (validatedAddress ? `${validatedAddress.slice(0,6)}...${validatedAddress.slice(-4)}` : 'Anonymous');
            
            console.log(`🎯 BET DEBUG - Processing bet for effective player ID:`, effectivePlayerId);
            
            const betResult = await this.crashEngine.placeBet(
                effectivePlayerId,
                effectiveUsername,
                validatedAmount,
                validatedMultiplier,
                betType  // Pass bet type to engine
            );
        
            // Handle different bet result types
            if (betResult.type === 'immediate') {
                // Add liability tracking for immediate bets
                await this.solvencyManager.addBetLiability(effectivePlayerId, validatedAmount, validatedMultiplier, betType);
                
                console.log(`💰 Bet placed immediately: ${effectiveUsername} - ${validatedAmount} @ ${validatedMultiplier}x (${betType})`);
                socket.emit('betSuccess', {
                    type: 'immediate',
                    message: 'Bet placed successfully',
                    betInfo: betResult.betInfo,
                    betType: betType
                });
            } else if (betResult.type === 'queued') {
                console.log(`🕐 Bet queued: ${effectiveUsername} - ${validatedAmount} @ ${validatedMultiplier}x (${betType})`);
                socket.emit('betQueued', {
                    type: 'queued',
                    message: 'Bet queued for next round',
                    queuedBet: betResult.queuedBet,
                    betType: betType
                });
                // Note: Liability for queued bets will be added when they're processed
            }
            
            // Process wallet transaction if wallet integration available
            if (this.walletIntegration) {
                // Handle wallet deduction
                console.log(`💳 Processing wallet transaction for ${effectivePlayerId}`);
            }
            
        } catch (error) {
            console.error('❌ Bet handling failed:', error);
            socket.emit('betError', {
                message: error.message || 'Failed to process bet'
            });
            
            // Clean up stored bet data on error
            this.playerBetTypes.delete(socket.id);
            this.playerBetData.delete(socket.id);
        }
    }
    
    /**
     * 🏃 Handle cashout request
     */
    async handleCashout(socket) {
        try {
            const player = this.connectedPlayers.get(socket.id);
        
        console.log('🔍 CASHOUT DEBUG - Player state:', {
            socketId: socket.id,
            hasPlayer: !!player,
            playerData: player ? {
                authenticated: player.authenticated,
                playerId: player.playerId,
                lastBetAddress: player.lastBetAddress
            } : null,
            connectedPlayersSize: this.connectedPlayers.size
        });
        
        // For wallet-based game, use the last bet address as player ID if not authenticated
        if (!player) {
            console.error('❌ CASHOUT FAILED - No player found for socket');
            console.error('💡 Available players:', Array.from(this.connectedPlayers.keys()));
            throw new Error('Player not found - please refresh and try again');
        }
        
        if (!player.authenticated && !player.lastBetAddress) {
            console.error('❌ CASHOUT FAILED - Player has no active bet');
            console.error('💡 Player state:', player);
            throw new Error('No active bet found for cashout');
        }
        
        // Use playerId if authenticated, otherwise use lastBetAddress (wallet address) for balance bets
        const playerId = player.authenticated ? player.playerId : player.lastBetAddress;
        
        console.log(`🔍 CASHOUT DEBUG - Using player ID for cashout:`, playerId);
        console.log(`🔍 CASHOUT DEBUG - Player authenticated:`, player.authenticated);
        console.log(`🔍 CASHOUT DEBUG - Player.playerId:`, player.playerId);
        console.log(`🔍 CASHOUT DEBUG - Player.lastBetAddress:`, player.lastBetAddress);
        
        // Get current multiplier from game state
        const gameState = this.crashEngine.getGameState();
        console.log('🔍 CASHOUT DEBUG - Game state:', {
            phase: gameState.phase,
            phaseStartTime: gameState.phaseStartTime,
            crashPoint: gameState.crashPoint
        });
        
        if (gameState.phase !== 'game_phase') {
            throw new Error(`Not in game phase - current phase: ${gameState.phase}`);
        }
        
        // Calculate current multiplier using centralized calculator
        const currentMultiplier = MultiplierCalculator.calculateMultiplier(gameState.phaseStartTime);
        console.log(`🔍 CASHOUT DEBUG - Current multiplier: ${currentMultiplier}x, Crash point: ${gameState.crashPoint}x`);
        
        // Validate multiplier is safe for cashout (prevents timing attacks)
        const isValidMultiplier = MultiplierCalculator.validateMultiplier(currentMultiplier, gameState.crashPoint);
        console.log(`🔍 CASHOUT DEBUG - Multiplier validation: ${isValidMultiplier}`);
        
        if (!isValidMultiplier) {
            throw new Error(`Cashout too close to crash point - current: ${currentMultiplier}x, crash: ${gameState.crashPoint}x`);
        }
        
        // Process cashout through crash engine
        console.log(`🔍 CASHOUT DEBUG - Processing cashout for player: ${playerId}`);
        const cashoutResult = await this.crashEngine.processCashout(
            playerId,
            currentMultiplier
        );
        console.log(`🔍 CASHOUT DEBUG - Cashout result:`, cashoutResult);
        
        // Handle payout based on bet type - FIXED: Get actual bet type instead of hardcoding
        if (cashoutResult && cashoutResult.payout > 0) {
            // Get actual bet type from stored data
            const betType = this.playerBetTypes.get(socket.id) || 'balance';
            const betData = this.playerBetData.get(socket.id);
            const isBalanceBet = betType === 'balance';
            
            console.log(`💰 CASHOUT PAYOUT - Type: ${betType}, Amount: ${cashoutResult.payout.toFixed(4)} ETH`);
            
            if (isBalanceBet) {
                // For balance bets, add winnings to user balance instead of blockchain payout
                console.log(`💰 Processing balance-based cashout: ${cashoutResult.payout.toFixed(4)} ETH`);
                
                // Add winnings to balance via balance API (includes house → hot wallet transfer)
                if (this.balanceAPI) {
                    try {
                        console.log(`🔍 CASHOUT DEBUG - Processing complete payout for ${playerId}: ${cashoutResult.payout} ETH`);
                        console.log(`🏦 This will: 1) Transfer ETH from house wallet to hot wallet 2) Update player balance`);
                        const result = await this.balanceAPI.addWinnings(playerId, cashoutResult.payout);
                        console.log(`✅ Complete cashout processed: ${cashoutResult.payout.toFixed(4)} ETH`);
                        console.log(`📤 Payout transaction: ${result.payoutTxHash}`);
                        
                        // Emit balance-specific event
                        socket.emit('balanceWinnings', {
                            playerId: playerId,
                            multiplier: currentMultiplier,
                            payout: cashoutResult.payout,
                            winnings: cashoutResult.payout
                        });
                    } catch (error) {
                        console.error('❌ Failed to update balance with winnings:', error);
                        throw error;
                    }
                } else {
                    console.error('❌ CASHOUT DEBUG - No balanceAPI available for balance bet payout');
                    throw new Error('Balance API not available for payout processing');
                }
            } else {
                // For blockchain bets, the crashEngine.processCashout emits 'playerCashedOut' 
                // which triggers automatic blockchain payout
                console.log(`🔗 Processing blockchain-based cashout: ${cashoutResult.payout.toFixed(4)} ETH`);
                console.log(`📤 Blockchain payout will be handled by 'playerCashedOut' event listener`);
            }
        }
        
        // Remove liability tracking after cashout
        if (cashoutResult && cashoutResult.payout > 0) {
            this.solvencyManager.removeBetLiability(playerId, cashoutResult.payout);
        }
        
        // Clean up bet tracking data after successful cashout
        this.playerBetTypes.delete(socket.id);
        this.playerBetData.delete(socket.id);
        
        socket.emit('cashoutSuccess', {
            multiplier: currentMultiplier,
            profit: cashoutResult ? cashoutResult.profit : 0,
            payout: cashoutResult ? cashoutResult.payout : 0,
            betType: betType
        });
        
        console.log(`🏃 Cashout processed: ${playerId} @ ${currentMultiplier.toFixed(2)}x`);
        
        } catch (error) {
            console.error('❌ Cashout handling failed:', error);
            socket.emit('cashoutError', {
                message: error.message || 'Failed to process cashout'
            });
            
            // Clean up on error
            this.playerBetTypes.delete(socket.id);
            this.playerBetData.delete(socket.id);
        }
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
