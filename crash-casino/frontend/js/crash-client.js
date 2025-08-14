/**
 * 🎰 PacoRocko Crash Client
 * 
 * WebSocket client for real-time crash game communication
 */

class CrashGameClient {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.currentRound = null;
        this.gameState = 'waiting';
        this.currentMultiplier = 1.0;
        this.playerBet = null;
        this.roundHistory = [];
        
        // PURE CLIENT MODE: Always disable server multiplier updates for smooth gameplay
        this.disableMultiplierUpdates = true; // Server only handles start/stop, client handles display
        
        // Smooth interpolation system for server-driven mode
        this.lastServerMultiplier = 1.0;
        this.lastServerTime = 0;
        this.serverUpdateInterval = 16.67; // 60 FPS expected
        this.interpolationActive = false;
        this.animationFrame = null;
        this.crashPoint = null;
        this.roundStartTime = null;
        
        // Event handlers
        this.onGameStateUpdate = null;
        this.onMultiplierUpdate = null;
        this.onRoundStart = null;
        this.onRoundCrash = null;
        this.onBetPlaced = null;
        this.onCashOut = null;
        this.onError = null;
        
        this.init();
    }

    /**
     * 🚀 Start smooth interpolation using server data as anchor points
     */
    startSmoothInterpolation(serverData) {
        if (this.interpolationActive) return; // Already running
        
        this.interpolationActive = true;
        console.log('🚀 Starting HYBRID smooth interpolation with server anchors at 20 FPS');
        
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        
        const interpolateLoop = () => {
            if (this.gameState !== 'running' || !this.interpolationActive) {
                this.interpolationActive = false;
                return;
            }
            
            const now = Date.now();
            const serverAge = now - this.lastServerTime;
            
            // If server data is fresh (< 100ms), interpolate from server value
            if (serverAge < 100) {
                // Predict forward from last server update using industry algorithm
                const elapsed = (now - this.roundStartTime) / 1000;
                const predictedMultiplier = parseFloat((1.0024 * Math.pow(1.0718, elapsed)).toFixed(2));
                
                // Blend server value with prediction for ultra-smooth display
                const blendFactor = Math.min(serverAge / 50, 1); // 0-1 over 50ms
                this.currentMultiplier = this.lastServerMultiplier + (predictedMultiplier - this.lastServerMultiplier) * blendFactor;
            } else {
                // Server data too old, use pure client prediction
                const elapsed = (now - this.roundStartTime) / 1000;
                this.currentMultiplier = parseFloat((1.0024 * Math.pow(1.0718, elapsed)).toFixed(2));
            }
            
            // Check crash prediction
            if (this.currentMultiplier >= this.crashPoint - 0.01) {
                console.log('🎯 Interpolation predicted crash at', this.currentMultiplier.toFixed(2));
            }
            
            // Update UI at 60 FPS
            this.updateGameplayUI(this.currentMultiplier);
            
            // Continue smooth animation
            this.animationFrame = requestAnimationFrame(interpolateLoop);
        };
        
        this.animationFrame = requestAnimationFrame(interpolateLoop);
    }
    
    /**
     * 🎮 Start client-driven smooth gameplay with industry standard algorithm
     */
    startClientDrivenGameplay() {
        console.log('🎮 Starting CLIENT-DRIVEN smooth gameplay with industry standard algorithm');
        
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        
        const updateLoop = () => {
            if (this.gameState !== 'running') return;
            
            const elapsed = (Date.now() - this.roundStartTime) / 1000;
            
            // INDUSTRY STANDARD ALGORITHM - matches server exactly
            this.currentMultiplier = parseFloat((1.0024 * Math.pow(1.0718, elapsed)).toFixed(2));
            
            // Check if we've reached crash point (client prediction)
            if (this.currentMultiplier >= this.crashPoint - 0.01) {
                console.log('🎯 Client predicted crash at', this.currentMultiplier.toFixed(2));
                // Don't crash yet - wait for server confirmation
                // But we can start preparing the crash animation
            }
            
            // Update all UI components with smooth multiplier
            this.updateGameplayUI(this.currentMultiplier);
            
            // Continue animation at 60 FPS
            this.animationFrame = requestAnimationFrame(updateLoop);
        };
        
        this.animationFrame = requestAnimationFrame(updateLoop);
    }

    /**
     * 🎨 Update gameplay UI components
     */
    updateGameplayUI(multiplier) {
        // Update multiplier display
        if (window.multiplierDisplay) {
            window.multiplierDisplay.updateMultiplier(multiplier);
        }
        
        // Update chart
        if (window.crashChart) {
            const elapsed = (Date.now() - this.roundStartTime) / 1000;
            window.crashChart.addDataPoint(elapsed, multiplier);
        }
        
        // Update rocket/visualizer
        if (window.crashVisualizer) {
            window.crashVisualizer.updatePosition(elapsed, multiplier);
        }
        
        // Fire multiplier update event for other systems
        if (this.onMultiplierUpdate) {
            this.onMultiplierUpdate({
                multiplier,
                elapsed: Date.now() - this.roundStartTime,
                roundId: this.currentRound
            });
        }
    }

    /**
     * 🚀 Initialize the WebSocket connection
     */
    init() {
        console.log('🎰 Initializing crash game client...');
        
        try {
            // Connect to WebSocket server - Use production backend URL
            let wsUrl;
            
            // Check if we're running locally (for development)
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                const host = window.location.hostname;
                const port = parseInt(window.location.port) + 1; // Local dev server
                wsUrl = `${protocol}//${host}:${port}`;
            } else {
                // Production: Connect to your Render backend
                wsUrl = 'https://paco-x57j.onrender.com'; // Your live Render backend
            }
            
            console.log('🔗 Connecting to:', wsUrl);
            
            // FIXED: Stable connection settings
            this.socket = io(wsUrl, {
                transports: ['websocket', 'polling'],
                timeout: 30000,
                forceNew: false,  // FIXED: Don't force new connections
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000
            });
            
            this.setupSocketListeners();
            
        } catch (error) {
            console.error('❌ Failed to initialize crash client:', error);
            this.showError('Failed to connect to game server');
        }
    }

    /**
     * 🔌 Setup WebSocket event listeners
     */
    setupSocketListeners() {
        this.socket.on('connect', () => {
            console.log('✅ Connected to crash game server for betting');
            console.log('🎮 Local game system handling multiplier display');
            console.log('🔍 DEBUG: Socket connected, event listeners should be active');
            console.log('⏰ Waiting for server events: start_betting_phase, betting_countdown, start_multiplier_count');
            this.isConnected = true;
            
            // DEBUG: Log ALL socket events to see what we're actually receiving
            const originalEmit = this.socket.emit;
            const originalOn = this.socket.on;
            
            // Log all incoming events
            this.socket.onAny((eventName, ...args) => {
                console.log(`📡 SOCKET EVENT RECEIVED: ${eventName}`, args);
            });

            // 💰 Listen for automatic payout notifications
            this.socket.on('payoutSuccess', (data) => {
                console.log('💰 Automatic payout successful:', data);
                this.showNotification(
                    `💰 Payout Received! ${data.payout.toFixed(4)} ETH sent to your wallet`,
                    'success',
                    8000
                );
                this.showTransactionStatus('success', 'Payout Sent', `Transaction: ${data.txHash}`);
            });

            this.socket.on('payoutFailed', (data) => {
                console.error('❌ Automatic payout failed:', data);
                this.showNotification(
                    `❌ Payout Failed: ${data.error}`,
                    'error',
                    8000
                );
            });

            this.updateConnectionStatus(true);
            
            // Server will initiate rounds - no local initiation needed
            
            // Notify connection callback
            if (this.onGameStateUpdate) {
                this.onGameStateUpdate({ connected: true, isConnected: true });
            }
        });

        this.socket.on('disconnect', () => {
            console.log('🔌 Disconnected from crash game server');
            this.isConnected = false;
            this.updateConnectionStatus(false);
            
            // Auto-reconnect after 2 seconds if not manually disconnected
            setTimeout(() => {
                if (!this.isConnected && this.socket && !this.socket.connected) {
                    console.log('🔄 Attempting automatic reconnection...');
                    this.socket.connect();
                }
            }, 2000);
        });

        this.socket.on('connect_error', (error) => {
            console.error('❌ Failed to connect to crash game server:', error);
            console.log('🔍 Connection URL was:', this.socket.io.uri);
            this.isConnected = false;
            this.updateConnectionStatus(false);
        });

        // Handle compiled server message format (generic 'message' event with type field)
        this.socket.on('message', (message) => {
            // Reduce console spam - only log important events
            if (message.type !== 'multiplierUpdate') {
                console.log(`📨 Server message received:`, message.type, message.data);
            }
            
            // Route based on message type
            switch (message.type) {
                case 'gameState':
                    this.handleGameState(message.data);
                    break;
                    
                case 'roundStarted':
                    this.handleRoundStart(message.data);
                    break;
                    
                case 'multiplierUpdate':
                    this.handleMultiplierUpdate(message.data);
                    break;
                    
                case 'roundCrashed':
                    this.handleRoundCrash(message.data);
                    break;
                    
                case 'betPlaced':
                    this.handleBetPlaced(message.data);
                    break;
                    
                case 'bettingPhase':
                case 'betting_phase':
                    this.handleBettingPhase(message.data);
                    break;
                    
                default:
                    console.log(`🔍 Unhandled message type: ${message.type}`);
            }
        });

        // FIXED: Listen for ACTUAL server events
        this.socket.on('start_betting_phase', () => {
            console.log('🎲 SERVER: Betting phase started');
            console.log('🔍 DEBUG: About to call handleBettingPhase()');
            this.gameState = 'betting';
            this.handleBettingPhase();
            console.log('✅ DEBUG: handleBettingPhase() called');
        });
        
        this.socket.on('start_multiplier_count', () => {
            console.log('🚀 SERVER: MULTIPLIER COUNT STARTED - STARTING VISUALS');
            console.log('🔄 TRANSITION: Betting countdown finished, game phase starting');
            this.gameState = 'running';
            this.roundStartTime = Date.now();
            this.currentMultiplier = 1.0;
            
            // Notify bet interface of state change
            if (window.betInterface && typeof window.betInterface.onGameStateChange === 'function') {
                window.betInterface.onGameStateChange('running');
                console.log('🎮 Notified bet interface: game state = running');
            }
            
            // Hide countdown timer when round starts
            const countdownElement = document.getElementById('countdownTimer');
            if (countdownElement) {
                countdownElement.style.display = 'none';
                console.log('⏰ Countdown timer hidden');
            }
            
            // Update UI immediately and reset multiplier display
            const gameStatus = document.getElementById('gameStatus');
            const gameMessage = document.getElementById('gameStateMessage');
            const multiplierElement = document.getElementById('multiplierValue');
            
            if (gameStatus) gameStatus.textContent = 'Round Running';
            if (gameMessage) gameMessage.textContent = 'Multiplier climbing...';
            if (multiplierElement) {
                multiplierElement.textContent = '1.00x';
                multiplierElement.classList.remove('crashed');
                console.log('🔄 Multiplier display reset to 1.00x');
            }
            
            console.log('✅ UI updated for round start');
            
            // 🚫 DISABLED: No local visual systems - server controls everything
            if (window.liveGameSystem) {
                console.log('🚫 SKIPPING: liveGameSystem animation (server-only mode)');
                console.log('🎯 Server handles all multiplier updates and crashes');
                // NO LOCAL ANIMATION:
                // window.liveGameSystem.isRunning = true;
                // window.liveGameSystem.gameState = 'running';
                // window.liveGameSystem.roundStartTime = Date.now();
                // window.liveGameSystem.animate(); // DISABLED
                console.log('✅ Local animation disabled - server authority only');
            }
            
            // ✅ START SERVER-DRIVEN VISUAL ANIMATION
            this.startServerDrivenVisuals();
            
            // Force start chart
            if (window.crashChart) {
                console.log('📈 FORCING: Starting crash chart');
                window.crashChart.startNewRound();
                console.log('📊 Chart state after start:', {
                    isRunning: window.crashChart.isRunning,
                    hasChart: !!window.crashChart.chart,
                    hasRoundStartTime: !!window.crashChart.roundStartTime
                });
            } else {
                console.log('❌ crashChart not found - chart visuals will not work');
            }
            
            console.log('🎮 ROUND START COMPLETE - All systems should be running');
        });
        
        this.socket.on('stop_multiplier_count', (crashValue) => {
            console.log('💥 SERVER: Round crashed at', crashValue + 'x');
            console.log('🔄 TRANSITION: Game phase ending, crash phase starting');
            this.gameState = 'crashed';
            const crash = parseFloat(crashValue);
            this.currentMultiplier = crash;
            
            // Update multiplier display immediately with crash styling
            const multiplierElement = document.getElementById('multiplierValue');
            if (multiplierElement) {
                multiplierElement.textContent = crash.toFixed(2) + 'x';
                multiplierElement.classList.add('crashed');
                console.log('💥 Multiplier display updated with crash styling');
            }
            
            // CRITICAL: Handle player bet conclusion
            if (this.playerBet && !this.playerBet.cashedOut) {
                console.log('💸 Player bet lost in crash - clearing bet state');
                this.playerBet = null; // Clear the bet since it was lost
            }
            
            // Hide cash out button immediately
            const cashOutBtn = document.getElementById('cashOutBtn');
            if (cashOutBtn) {
                cashOutBtn.style.display = 'none';
                console.log('🚫 Cash out button hidden - round ended');
            }
            
            // Update UI status
            const gameStatus = document.getElementById('gameStatus');
            const gameMessage = document.getElementById('gameStateMessage');
            if (gameStatus) gameStatus.textContent = 'Crashed';
            if (gameMessage) gameMessage.textContent = `Crashed at ${crash.toFixed(2)}x`;
            
            // Notify bet interface of crashed state
            if (window.betInterface && typeof window.betInterface.onGameStateChange === 'function') {
                window.betInterface.onGameStateChange('crashed');
                console.log('🎮 Notified bet interface: game state = crashed');
            }
            
            // Update local system
            if (window.liveGameSystem) {
                window.liveGameSystem.gameState = 'crashed';
                window.liveGameSystem.crashPoint = crash;
                console.log('✅ liveGameSystem updated with crash data');
            }
            
            // Stop visual animation when server crashes
            this.stopServerDrivenVisuals();
            
            // Add to local recent rounds history
            this.addToLocalHistory(crash);
            
            console.log('💥 CRASH COMPLETE - All visual systems updated');
        });
        
        // 🎯 SERVER-DRIVEN COUNTDOWN: Listen for real-time countdown from server
        this.socket.on('betting_countdown', (data) => {
            console.log(`⏰ SERVER COUNTDOWN: ${data.remaining}s remaining`);
            this.updateServerCountdown(data.remaining);
        });
        
        // Legacy events (keeping for compatibility)
        this.socket.on('gameState', (data) => this.handleGameState(data));
        this.socket.on('roundStarted', (data) => this.handleRoundStart(data));
        this.socket.on('multiplierUpdate', (data) => this.handleMultiplierUpdate(data));
        this.socket.on('roundCrashed', (data) => this.handleRoundCrash(data));
        this.socket.on('betPlaced', (data) => this.handleBetPlaced(data));
        this.socket.on('bettingPhase', (data) => this.handleBettingPhase(data));
        this.socket.on('betting_phase', (data) => this.handleBettingPhase(data));
        
        this.socket.on('cashOut', (data) => this.handleCashOut(data));

        this.socket.on('bet_placed_global', (data) => {
            // Update players list / stats if needed
        });

        this.socket.on('cashout_success', (data) => {
            this.handleOwnCashOut(data);
        });

        this.socket.on('authenticated', (data) => {
            this.handleAuthentication(data);
        });

        this.socket.on('live_betting_table', (data) => {
            this.handleLiveBettingTable(data);
        });

        this.socket.on('crash_history', (data) => {
            console.log('📊 Server crash_history received - MERGING with local display');
            console.log('🎯 Integrating server rounds with local recent rounds');
            
            // Only process if we have data and it's an array
            if (data && Array.isArray(data) && data.length > 0) {
                this.handleCrashHistory(data);
            } else {
                console.log('📊 No server history data to process');
            }
        });

        this.socket.on('connect_error', (error) => {
            console.error('❌ Connection error:', error);
            this.showError('Connection failed. Retrying...');
        });

        // Setup heartbeat
        setInterval(() => {
            if (this.socket && this.isConnected) {
                this.socket.emit('ping');
            }
        }, 30000); // Ping every 30 seconds
    }

    /**
     * 📨 Handle messages from server
     */
    handleServerMessage(message) {
        const { type, data, timestamp } = message;
        
        console.log(`📨 Received: ${type}`, data);

        switch (type) {
            case 'gameState':
                this.handleGameState(data);
                break;
                
            case 'roundStarted':
                this.handleRoundStart(data);
                break;
                
            case 'multiplierUpdate':
                this.handleMultiplierUpdate(data);
                break;
                
            case 'roundCrashed':
                this.handleRoundCrash(data);
                break;
                
            case 'betPlaced':
                this.handleBetPlaced(data);
                break;
                
            case 'playerCashedOut':
                this.handlePlayerCashOut(data);
                break;
                
            case 'cashOutSuccess':
                this.handleOwnCashOut(data);
                break;
                
            case 'authenticated':
                this.handleAuthentication(data);
                break;
                
            case 'error':
                this.handleError(data);
                break;
                
            default:
                console.warn('Unknown message type:', type);
        }
    }

    /**
     * 🎮 Handle game state updates
     */
    handleGameState(data) {
        // Support both legacy and enhanced payloads
        const phase = data.status || data.currentPhase || 'waiting';
        
        // Map backend phases to frontend states
        if (phase === 'betting') {
            this.gameState = 'betting';  // Accepting bets
        } else if (phase === 'waiting') {
            this.gameState = 'pending';  // Between rounds
        } else if (phase === 'running' || phase === 'flying') {
            this.gameState = 'running';  // Game in progress
        } else if (phase === 'crashed' || phase === 'ended') {
            this.gameState = 'crashed'; // Round ended
        } else {
            this.gameState = phase;      // Use backend phase as-is
        }
        
        this.currentMultiplier = data.currentMultiplier || 1.0;
        this.currentRound = data.roundId;
        
        console.log(`🎮 Game state updated: ${phase} → ${this.gameState}`);
        
        // 🔄 SAFE SYNC: Only sync if local system is stable and there's a big difference
        setTimeout(() => {
            if (data.isRunning && data.currentMultiplier > 2.0 && window.liveGameSystem && window.liveGameSystem.isRunning) {
                const localMultiplier = window.liveGameSystem.currentMultiplier || 1.0;
                const serverMultiplier = data.currentMultiplier;
                const difference = Math.abs(serverMultiplier - localMultiplier);
                
                // Only sync if there's a significant difference (>1.5x gap) to avoid constant adjustments
                if (difference > 1.5) {
                    console.log(`🔄 SAFE SYNC: Major difference (local: ${localMultiplier.toFixed(2)}x, server: ${serverMultiplier.toFixed(2)}x)`);
                    
                    // Gentle sync - don't force, just suggest
                    if (window.liveGameSystem.updateMultiplierDisplay) {
                        window.liveGameSystem.currentMultiplier = serverMultiplier;
                        window.liveGameSystem.updateMultiplierDisplay(serverMultiplier);
                        console.log(`✅ Gentle sync to ${serverMultiplier.toFixed(2)}x`);
                    }
                }
            }
        }, 1000); // Wait 1 second to ensure local system is stable
        
        // Update UI
        const roundIdElement = document.getElementById('currentRoundId');
        if (roundIdElement) {
            roundIdElement.textContent = data.roundId ? `Round ${data.roundId}` : '-';
        }
        const gameStatusElement = document.getElementById('gameStatus');
        if (gameStatusElement) {
            gameStatusElement.textContent = this.gameState;
        }
        
        if (this.onGameStateUpdate) {
            this.onGameStateUpdate(data);
        }
    }

    /**
     * 🎲 Handle betting phase start 
     */
    handleBettingPhase(data) {
        console.log('🎲 Betting phase started - waiting for server countdown');
        this.gameState = 'betting';
        
        // CRITICAL: Reset bet state for new round
        if (this.playerBet) {
            console.log('🧹 Clearing previous round bet state for new betting phase');
            this.playerBet = null;
        }
        
        // Hide cash out button for new round
        const cashOutBtn = document.getElementById('cashOutBtn');
        if (cashOutBtn) {
            cashOutBtn.style.display = 'none';
            console.log('🚫 Cash out button hidden - new betting phase');
        }
        
        // Notify bet interface of betting state
        if (window.betInterface && typeof window.betInterface.onGameStateChange === 'function') {
            window.betInterface.onGameStateChange('betting');
            console.log('🎮 Notified bet interface: game state = betting');
        }
        
        // 🚫 REMOVED: No local countdown - server controls timing
        // this.startCountdown(6); // DISABLED
        
        // Show countdown timer but wait for server updates
        const countdownElement = document.getElementById('countdownTimer');
        if (countdownElement) countdownElement.style.display = 'block';
        
        // Update UI
        const gameStatus = document.getElementById('gameStatus');
        const gameMessage = document.getElementById('gameStateMessage');
        if (gameStatus) gameStatus.textContent = 'Betting Phase';
        if (gameMessage) gameMessage.textContent = 'Starting 15-second betting countdown...';
        
        console.log('⏰ Waiting for server betting_countdown events');
    }

    /**
     * 🚀 Handle round start - PRODUCTION FIX: No visual interference
     */
    handleRoundStart(data) {
        this.gameState = 'running';
        this.roundStartTime = data.startTime || Date.now();
        this.currentRound = data.roundId;
        this.currentMultiplier = 1.0;
        
        // Store server data for validation only
        this.crashPoint = data.crashPoint;
        this.serverSeed = data.serverSeed;
        this.clientSeed = data.clientSeed;
        this.nonce = data.nonce;
        this.maxDuration = data.duration || 60000;
        
        console.log('🌐 Server round start (betting only):', {
            roundId: data.roundId,
            crashPoint: this.crashPoint,
            mode: 'SERVER-BETTING-ONLY (local handles display)'
        });
        
        // SIMPLIFIED: Only handle essential betting UI
        
        // Show cash out button if player has bet
        if (this.playerBet && !this.playerBet.cashedOut) {
            const cashOutBtn = document.getElementById('cashOutBtn');
            if (cashOutBtn) {
                cashOutBtn.style.display = 'block';
                console.log('💰 Cash out button shown - round started with active bet');
            }
        } else {
            console.log('🚫 No active bet for cash out button');
        }
        
        // Hide countdown timer since round started
        const countdownElement = document.getElementById('countdownTimer');
        if (countdownElement) countdownElement.style.display = 'none';
        
        // Notify betting system only
        if (this.onRoundStart) {
            this.onRoundStart(data);
        }
        
        console.log('🎯 Server round start processed - UI updated for running state');
    }

    /**
     * 📈 Handle multiplier updates - PRODUCTION FIX: Always ignore server updates
     */
    handleMultiplierUpdate(data) {
        // PRODUCTION FIX: Always ignore server multiplier updates to prevent visual bugs
        // Local system provides smooth 60 FPS, server causes stuttering and conflicts
        if (this.disableMultiplierUpdates) {
            if (Math.random() < 0.01) { // 1% chance to log for debugging
                console.log(`🚫 Server multiplier IGNORED: ${data.multiplier.toFixed(2)}x (LOCAL system controls display)`);
            }
            return; // Exit early, don't process server updates
        }

        // In smooth interpolation mode, let the animation loop handle updates
        if (this.interpolationActive) {
            // Only log occasionally to reduce console spam
            if (data.multiplier % 1 < 0.1 || data.multiplier > 5) {
                console.log(`📡 Server Multiplier: ${data.multiplier.toFixed(2)}x (interpolating)`);
            }
            return;
        }
        
        // Fallback: Direct update if interpolation isn't active
        if (data.multiplier >= 1.0) {
            const timeElapsed = (Date.now() - this.roundStartTime) / 1000;
            this.updateVisualSystems(data.multiplier, timeElapsed);
            
            // Only log occasionally to reduce console spam
            if (data.multiplier % 1 < 0.1 || data.multiplier > 5) {
                console.log(`📡 Server Multiplier: ${data.multiplier.toFixed(2)}x (direct)`);
            }
        }
        
        // Always update potential winnings even if display is disabled
        if (this.playerBet && !this.playerBet.cashedOut) {
            const potentialWin = (this.playerBet.amount * data.multiplier).toFixed(4);
            const potentialWinElement = document.getElementById('potentialWin');
            if (potentialWinElement) {
                potentialWinElement.textContent = potentialWin + ' ETH';
            }
        }
        
        if (this.onMultiplierUpdate) {
            this.onMultiplierUpdate(data);
        }
    }

    /**
     * 💥 Handle round crash - PRODUCTION FIX: No visual interference
     */
    handleRoundCrash(data) {
        this.gameState = 'crashed';
        
        console.log('🌐 Server crash confirmed (betting only):', data.crashPoint + 'x');
        
        // PRODUCTION FIX: Don't interfere with local visual system
        // Local system handles all crash display and animations
        
        // Only handle betting results, never visual display
        if (this.playerBet) {
            if (this.playerBet.cashedOut) {
                this.showNotification(`🎉 You won ${this.playerBet.payout.toFixed(4)} ETH!`, 'success');
            } else {
                this.showNotification('💥 Your bet was lost in the crash', 'error');
            }
            this.playerBet = null;
        }
        
        // Hide cash out button
        document.getElementById('cashOutBtn').style.display = 'none';
        
        // Notify betting system only
        if (this.onRoundCrash) {
            this.onRoundCrash(data);
        }
        
        // Server will handle next round timing
        
        console.log('🎯 Server crash processed - local system handles all visual display');
        return;
        
        // PRODUCTION FIX: All legacy UI updates removed - local system handles everything
    }

    /**
     * 💰 Handle bet placement
     */
    handleBetPlaced(data) {
        // Update total bet amount
        document.getElementById('totalBetAmount').textContent = 
            data.totalAmount.toFixed(4) + ' ETH';
        document.getElementById('playerCount').textContent = data.totalBets;
        
        if (this.onBetPlaced) {
            this.onBetPlaced(data);
        }
    }

    /**
     * 🎰 Handle betting phase started by server
     */
    // REMOVED DUPLICATE: handleBettingPhase method was defined twice, 
    // causing the countdown version to be overridden

    /**
     * 🏃‍♂️ Handle other player cash out
     */
    handlePlayerCashOut(data) {
        console.log('🏃‍♂️ Player cashed out:', data.playerId, 'at', data.multiplier + 'x');
        
        if (this.onCashOut) {
            this.onCashOut(data);
        }
    }

    /**
     * ✅ Handle own cash out success
     */
    handleOwnCashOut(data) {
        if (this.playerBet) {
            this.playerBet.cashedOut = true;
            this.playerBet.multiplier = data.multiplier;
            this.playerBet.payout = data.payout;
            console.log('✅ Player successfully cashed out - clearing bet state');
            
            // Clear the bet after successful cash out
            setTimeout(() => {
                this.playerBet = null;
                console.log('🧹 Bet state cleared after successful cash out');
            }, 2000); // Give time to show the success message
        }
        
        // Hide cash out button immediately
        const cashOutBtn = document.getElementById('cashOutBtn');
        if (cashOutBtn) {
            cashOutBtn.style.display = 'none';
            console.log('🚫 Cash out button hidden - successfully cashed out');
        }
        
        // Notify bet interface that bet concluded successfully
        if (window.betInterface && typeof window.betInterface.onCashOut === 'function') {
            window.betInterface.onCashOut(data);
            console.log('🎮 Notified bet interface of successful cash out');
        }
        
        this.showNotification(`✅ Cashed out at ${data.multiplier.toFixed(2)}x for ${data.payout.toFixed(4)} ETH!`, 'success');
    }

    /**
     * 🔐 Handle authentication response
     */
    handleAuthentication(data) {
        if (data.success) {
            console.log('✅ Authenticated with wallet:', data.walletAddress);
            this.showNotification('✅ Wallet connected successfully!', 'success');
        }
    }

    /**
     * ❌ Handle errors
     */
    handleError(data) {
        console.error('❌ Game error:', data);
        this.showError(data.message || 'Unknown error occurred');
        
        if (this.onError) {
            this.onError(data);
        }
    }

    /**
     * 💰 Place a bet
     */
    async placeBet(amount) {
        if (!this.isConnected) {
            this.showError('Not connected to game server');
            return false;
        }

        // PRODUCTION FIX: Use local game state for betting validation
        if (this.disableMultiplierUpdates && window.liveGameSystem) {
            const localGameState = window.liveGameSystem.gameState;
            const gameMultiplier = window.liveGameSystem.currentMultiplier || 1.0;
            console.log(`🎮 Local game validation - State: "${localGameState}", Multiplier: ${gameMultiplier}x`);
            
            if (localGameState === 'betting') {
                console.log(`✅ Bet allowed - Local game in betting phase`);
            } else if (localGameState === 'running' && gameMultiplier < 1.2) {
                // Allow "late betting" if round just started (< 1.2x multiplier)
                console.log(`✅ Late bet allowed - Round just started (${gameMultiplier}x)`);
            } else if (localGameState === 'running' && gameMultiplier >= 1.2) {
                this.showError(`Too late to bet - round is at ${gameMultiplier.toFixed(2)}x`);
                console.log(`🚫 Bet rejected - Round too advanced (${gameMultiplier}x)`);
                return false;
            } else if (localGameState === 'crashed') {
                this.showError(`Cannot bet now - round crashed`);
                console.log(`🚫 Bet rejected - Local game crashed`);
                return false;
            } else {
                // If local state is unclear, allow betting as fallback
                console.log(`⚠️ Local game state unclear (${localGameState}), allowing bet`);
            }
        } else {
            // Legacy mode: Use server state with improved timing tolerance
            if (this.gameState === 'crashed') {
                this.showError(`Cannot bet now - round crashed`);
                console.log(`🚫 Bet rejected - Round crashed`);
                return false;
            }
            
            if (this.gameState === 'running') {
                // Reject all bets during running phase - must wait for next round
                const currentMultiplier = this.currentMultiplier || 1.0;
                this.showError(`Round in progress (${currentMultiplier.toFixed(2)}x) - wait for next round`);
                console.log(`🚫 Bet rejected - Round already running at ${currentMultiplier.toFixed(2)}x`);
                return false;
            }
            
            if (!['betting', 'waiting', 'pending', 'running', undefined].includes(this.gameState)) {
                this.showError(`Cannot bet now - game state: "${this.gameState}"`);
                console.log(`🚫 Bet rejected - Game state: "${this.gameState}"`);
                return false;
            }
        }
        
        console.log(`✅ Bet validation passed - Game state: "${this.gameState}"`);
        console.log(`🔗 Connection status: ${this.isConnected}`);
        console.log(`🎰 Current round: ${this.currentRound}`);

        try {
            // Check if wallet is connected and get player address
            if (!window.realWeb3Modal || !window.realWeb3Modal.isWalletConnected()) {
                this.showError('Please connect your wallet first');
                return false;
            }
            
            // Get current wallet address for RPC debugging
            this.playerAddress = window.ethereum.selectedAddress;
            console.log('🔗 Player address for debugging:', this.playerAddress);
            console.log('🔍 Debug realWeb3Modal methods:', Object.keys(window.realWeb3Modal || {}));
            
            if (!this.playerAddress) {
                console.log('⚠️ No player address found, attempting to get from MetaMask...');
                try {
                    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                    this.playerAddress = accounts[0];
                    console.log('✅ Retrieved player address:', this.playerAddress);
                } catch (error) {
                    console.error('❌ Failed to get player address:', error);
                    this.showError('Unable to get wallet address');
                    return false;
                }
            }

            this.showNotification('🎰 Processing bet transaction...', 'info');
            this.showTransactionStatus('pending', 'Waiting for MetaMask approval...', 'Please approve the transaction in your wallet');
            
            // Send transaction to Abstract L2 - Use correct house wallet with advanced retry logic
            const houseWallet = '0x1f8B1c4D05eF17Ebaa1E572426110146691e6C5a'; // Your house wallet
            
            // Advanced RPC error handling for Abstract Network
            let txResult;
            let attempts = 0;
            const maxAttempts = 3;
            
            while (attempts < maxAttempts) {
                attempts++;
                console.log(`🔄 Transaction attempt ${attempts}/${maxAttempts}`);
                
                try {
                    // Abstract Network uses LEGACY transaction format (not EIP-1559)
                    let gasConfig;
                    
                    // Use Abstract ZK Stack Helper for proper gas configuration
                    const urgency = attempts >= 3 ? 'urgent' : 'standard';
                    
                    if (window.abstractL2Helper) {
                        gasConfig = window.abstractL2Helper.getAbstractGasConfig(urgency);
                        console.log(`📊 Attempt ${attempts}: Using Abstract ZK Stack config (${urgency})`);
                        console.log('🔄 Note: Excess gas will be automatically refunded by Abstract bootloader');
                    } else {
                        // Fallback: Abstract ZK Stack configuration
                        if (attempts >= 3) {
                            // Urgent: Higher gas price for faster processing
                            gasConfig = {
                                gasPrice: '0x3B9ACA00', // 1 gwei for urgent transactions (still low for Abstract)
                                gas: '0x7530', // 30k gas for urgent (excess refunded)
                                gas_per_pubdata_limit: '0x7530' // 30k pubdata for urgent
                            };
                            console.log('📊 Attempt 3+: Abstract ZK Stack urgent mode (overpayment refunded)');
                        } else {
                            // Standard: Reasonable gas configuration
                            gasConfig = {
                                gasPrice: '0x5F5E100', // 0.1 gwei - Ultra-low for Abstract ZK Stack
                                gas: '0x5208', // 21k gas - Standard minimum (excess refunded)
                                gas_per_pubdata_limit: '0x4E20' // 20k pubdata - Minimal for simple transfers
                            };
                            console.log('📊 Attempt 1-2: Abstract ZK Stack standard mode (overpayment refunded)');
                        }
                    }
                    
                    // Streamlined transaction flow for production
                    if (window.ethereum) {
                        console.log('🚀 Preparing bet transaction for Abstract Network...');
                        
                        // Quick verification before transaction
                        console.log('🔍 Quick wallet check...');
                        console.log('🌐 window.ethereum.selectedAddress:', window.ethereum.selectedAddress);
                        console.log('🌐 window.ethereum.chainId:', window.ethereum.chainId);
                        console.log('🌐 window.ethereum.networkVersion:', window.ethereum.networkVersion);
                        
                        // Check if MetaMask has different RPC than our health checker
                        if (window.ethereum.connection && window.ethereum.connection.url) {
                            console.log('🔗 MetaMask connection URL:', window.ethereum.connection.url);
                        }
                        
                        let chainId;
                        let balanceEth;
                        
                        try {
                            // Quick chain verification only
                            chainId = await window.ethereum.request({ method: 'eth_chainId' });
                            console.log(`✅ Chain verified: ${chainId}`);
                        } catch (basicError) {
                            console.log(`🚨 CRITICAL: Basic RPC call failed: ${basicError.message}`);
                            console.log(`🚨 Error code: ${basicError.code}`);
                            console.log(`🚨 Error data:`, basicError.data);
                            console.log(`🚨 This means Abstract Network RPC is completely broken!`);
                            throw basicError; // Re-throw to stop transaction
                        }
                        
                        // Skip all RPC testing - proceed directly to transaction
                        console.log('🚀 Skipping RPC diagnostics - proceeding to transaction...');
                        
                        // Check if we're on Abstract mainnet
                        if (chainId !== '0xab5') {
                            console.log('⚠️ Not on Abstract mainnet (0xab5). Current chain:', chainId);
                            throw new Error('Please switch to Abstract mainnet (Chain ID: 0xab5)');
                        }
                        
                        // Balance check will be handled by MetaMask during transaction
                    }
                    
                    // Final debug before main transaction
                    console.log('🚀 SENDING MAIN BETTING TRANSACTION...');
                    console.log('🏠 House wallet:', houseWallet);
                    console.log('💰 Amount:', amount);
                    console.log('⛽ Gas config:', gasConfig);
                    console.log('🔗 Using realWeb3Modal:', !!window.realWeb3Modal);
                    console.log('🔗 realWeb3Modal methods:', Object.keys(window.realWeb3Modal || {}));
                    
                    txResult = await window.realWeb3Modal.sendTransaction(
                        houseWallet,
                        amount,
                        gasConfig
                    );
                    
                    console.log('✅ MAIN TRANSACTION SUCCESS:', txResult);
                    
                    console.log('✅ Transaction successful:', txResult);
                    
                    // Report success to network health monitor
                    if (window.NetworkHealthMonitor) {
                        window.NetworkHealthMonitor.recordSuccess();
                    }
                    
                    break; // Success, exit retry loop
                    
                } catch (error) {
                    console.error(`❌ Attempt ${attempts} failed:`, error);
                    
                    // Report failure to network health monitor
                    if (window.NetworkHealthMonitor) {
                        console.log(`🔴 Recording RPC failure #${window.NetworkHealthMonitor.consecutiveFailures + 1} to health monitor`);
                        window.NetworkHealthMonitor.recordFailure();
                    } else {
                        console.log('⚠️ NetworkHealthMonitor not available');
                    }
                    
                    // Check for user rejection first
                    if (error.code === 4001 || error.message?.includes('User denied') || 
                        error.message?.includes('User rejected')) {
                        console.log('🚫 User rejected transaction - stopping all attempts');
                        this.showNotification('❌ Transaction cancelled by user', 'error');
                        this.showTransactionStatus('cancelled', 'Transaction Cancelled', 'User rejected the transaction');
                        return false;
                    }

                    // Analyze error type - now handles EIP-1559 specific errors and RPC issues
                    if (error.message.includes('Internal JSON-RPC error')) {
                        console.log('🔍 Internal JSON-RPC error detected - this is usually an RPC issue, not transaction format');
                        
                        // For Internal JSON-RPC errors, don't retry - this is usually an RPC or network issue
                        console.log('🚫 Internal JSON-RPC error detected - this is an RPC/network issue, not a transaction problem');
                        this.showNotification('❌ Network RPC error - try refreshing the page or switching networks', 'error');
                        this.showTransactionStatus('error', 'Network Error', 'Internal JSON-RPC error - try refreshing the page');
                        return false;
                    } else if (error.message.includes('transaction type not supported') ||
                               error.message.includes('maxFeePerGas') ||
                               error.message.includes('EIP-1559')) {
                        console.log('🔍 Transaction format error detected - likely EIP-1559 compatibility issue');
                        
                        // Trigger RPC health check and endpoint switching before final attempt
                        if (window.rpcHealthChecker && attempts < maxAttempts) {
                            console.log('🏥 Triggering RPC health check and endpoint switch...');
                            try {
                                // Mark current endpoint as failed due to transaction error
                                window.rpcHealthChecker.failedEndpoints.add(window.rpcHealthChecker.currentEndpoint);
                                console.log(`🔴 Marking ${window.rpcHealthChecker.currentEndpoint} as failed due to transaction error`);
                                
                                // Find a different healthy endpoint
                                const newEndpoint = await window.rpcHealthChecker.findHealthyEndpoint();
                                console.log(`✅ RPC endpoint switched to: ${newEndpoint}, will retry transaction...`);
                            } catch (rpcError) {
                                console.error('❌ RPC health check failed:', rpcError);
                            }
                        }
                        
                        // If it's the last attempt, show user-friendly message
                        if (attempts === maxAttempts) {
                            console.log('💡 Abstract Network RPC Issue - Suggested solutions:');
                            console.log('1. 🔄 Refresh the page and reconnect your wallet');
                            console.log('2. 🌐 Check Abstract Network status at https://status.abs.xyz');
                            console.log('3. 💰 Ensure sufficient ETH balance for gas fees');
                            console.log('4. ⏰ Try again in a few minutes');
                            console.log('5. 🔗 Try switching MetaMask RPC endpoint');
                            
                            // Show user-friendly modal message
                            this.showNotification(
                                '❌ Transaction Failed: Abstract Network RPC Error. Try refreshing the page and reconnecting your wallet, or check Abstract Network status.',
                                'error',
                                10000
                            );
                            
                            throw new Error(`Transaction failed after ${maxAttempts} attempts. This appears to be an Abstract Network RPC issue. Please try refreshing the page or check the console for detailed troubleshooting steps.`);
                        }
                    } else {
                        // Different error type, don't retry
                        throw error;
                    }
                    
                    // Wait before retry
                    if (attempts < maxAttempts) {
                        console.log(`⏱️ Waiting 2 seconds before retry...`);
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                }
            }
            
            // Verify transaction was successful
            if (!txResult || !txResult.hash) {
                throw new Error('Transaction failed');
            }
            
            // Wait for confirmation
            const receipt = await txResult.wait();
            
            if (receipt.status !== 1) {
                throw new Error('Transaction failed on blockchain');
            }
            
            this.showNotification('✅ Transaction confirmed! Placing bet...', 'success');
            
            // Now notify the game server with verified transaction
            this.socket.emit('place_bet', {
                betAmount: amount,
                autoPayoutMultiplier: null, // Can be set for auto-cashout
                txHash: receipt.transactionHash,
                blockNumber: receipt.blockNumber,
                playerAddress: window.realWeb3Modal?.address
            });

            this.playerBet = {
                amount: amount,
                cashedOut: false,
                txHash: receipt.transactionHash,
                blockNumber: receipt.blockNumber
            };

            // Update UI
            document.getElementById('yourBetAmount').textContent = amount.toFixed(4) + ' ETH';
            
            // Show cash out button if round is running
            const cashOutBtn = document.getElementById('cashOutBtn');
            if (cashOutBtn && this.gameState === 'running') {
                cashOutBtn.style.display = 'block';
                console.log('💰 Cash out button displayed - bet confirmed');
            }
            
            // Notify bet interface about successful bet
            if (window.betInterface && typeof window.betInterface.onBetPlaced === 'function') {
                window.betInterface.onBetPlaced({
                    amount: amount,
                    txHash: receipt.transactionHash
                });
                console.log('🎯 Bet interface notified of successful bet placement');
            }
            document.getElementById('potentialWin').textContent = amount.toFixed(4) + ' ETH';
            document.getElementById('betStatus').style.display = 'block';
            document.getElementById('placeBetBtn').disabled = true;

            // Show success status
            this.showTransactionStatus('success', 'Bet placed successfully!', `${amount.toFixed(4)} ETH bet confirmed`);

            return true;

        } catch (error) {
            console.error('❌ Failed to place bet:', error);
            
            // If it's an RPC error, suggest solutions
            if (error.message.includes('RPC') || error.message.includes('JSON-RPC')) {
                this.suggestRPCSwitch();
            }
            
            // Handle specific error types
            let errorMessage = 'Failed to place bet';
            if (error.message.includes('insufficient funds')) {
                errorMessage = 'Insufficient ETH balance';
            } else if (error.message.includes('user rejected')) {
                errorMessage = 'Transaction cancelled';
            } else if (error.message.includes('House wallet not configured')) {
                errorMessage = 'Game temporarily unavailable';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            this.showError(errorMessage);
            this.showTransactionStatus('error', 'Transaction failed', errorMessage);
            return false;
        }
    }

    /**
     * 🔗 Helper function to suggest Alternative Abstract RPC endpoints
     */
    suggestRPCSwitch() {
        const abstractRPCs = [
            {
                name: 'Abstract Mainnet (Primary)',
                url: 'https://api.mainnet.abs.xyz',
                chainId: '0xab5'
            },
            // No alternates to avoid wallet warnings
        ];
        
        console.log('🔗 Alternative Abstract RPC endpoints you can try:');
        abstractRPCs.forEach((rpc, index) => {
            console.log(`${index + 1}. ${rpc.name}: ${rpc.url}`);
        });
        
        console.log('📋 To switch RPC in MetaMask:');
        console.log('1. Open MetaMask > Settings > Networks');
        console.log('2. Find "Abstract" and click Edit');
        console.log('3. Try changing RPC URL to one above');
        console.log('4. Chain ID: 2741 (0xab5)');
        console.log('5. Currency: ETH');
                console.log('6. Block Explorer: https://abscan.org');
        
        // Also show a user notification
        this.showNotification(
            '🔗 RPC Issue Detected. Check console for alternative RPC endpoints to try in MetaMask.',
            'warning',
            8000
        );
    }

    /**
     * 🏃‍♂️ Cash out current bet
     */
    cashOut() {
        if (!this.isConnected) {
            this.showError('Not connected to game server');
            return;
        }

        if (!this.playerBet || this.playerBet.cashedOut) {
            this.showError('No active bet to cash out');
            return;
        }

        if (this.gameState !== 'running') {
            this.showError('Cannot cash out - round not running');
            return;
        }

        this.socket.emit('cash_out');
    }

    /**
     * 🔐 Authenticate with wallet
     */
    authenticate(walletAddress, token) {
        if (!this.isConnected) {
            this.showError('Not connected to game server');
            return;
        }

        this.socket.emit('authenticate', {
            address: walletAddress,
            signature: token.signature || token, // compatibility if we pass a signed message
            message: token.message || `Login to PacoRocko at ${new Date().toISOString()}`
        });
    }

    /**
     * 🔄 Prepare for next round
     */
    prepareForNextRound() {
        this.gameState = 'waiting';
        console.log('🔄 Preparing for next round...');
        
        // Reset UI elements
        const gameStatusElement = document.getElementById('gameStatus');
        const gameStateMessageElement = document.getElementById('gameStateMessage');
        const multiplierElement = document.getElementById('multiplierValue');
        const betStatusElement = document.getElementById('betStatus');
        const placeBetBtnElement = document.getElementById('placeBetBtn');
        
        if (gameStatusElement) gameStatusElement.textContent = 'Next Round';
        if (gameStateMessageElement) gameStateMessageElement.textContent = 'Preparing next round...';
        if (multiplierElement) {
            multiplierElement.textContent = '1.00x';
            multiplierElement.classList.remove('crashed');
        }
        if (betStatusElement) betStatusElement.style.display = 'none';
        if (placeBetBtnElement) {
            placeBetBtnElement.disabled = false;
            placeBetBtnElement.textContent = '🎯 PLACE BET';
        }
        
        // Update bet interface state
        if (window.betInterface && typeof window.betInterface.onGameStateChange === 'function') {
            window.betInterface.onGameStateChange('waiting');
        }
        
        // Start countdown for betting phase
        this.startCountdown(15); // 15 second countdown for betting
    }

    /**
     * 🎯 Update countdown from server (SERVER-DRIVEN)
     */
    updateServerCountdown(remaining) {
        const countdownElement = document.getElementById('countdownTimer');
        const countdownValue = document.getElementById('countdownValue');
        const gameMessage = document.getElementById('gameStateMessage');
        
        // Update countdown display
        if (countdownValue) countdownValue.textContent = remaining;
        
        // Update message based on remaining time (15-second betting phase)
        if (remaining > 10) {
            if (gameMessage) gameMessage.textContent = `🎰 Place your bets! Round starts in ${remaining}s`;
        } else if (remaining > 5) {
            if (gameMessage) gameMessage.textContent = `⏰ ${remaining} seconds remaining to place bets`;
        } else if (remaining > 0) {
            if (gameMessage) gameMessage.textContent = `🚀 Round starting in ${remaining}s - Last chance!`;
        } else {
            if (gameMessage) gameMessage.textContent = `🚀 Round starting now...`;
            // Hide countdown when it reaches 0
            if (countdownElement) countdownElement.style.display = 'none';
        }
        
        console.log(`✅ Server countdown updated: ${remaining}s`);
    }

    /**
     * ⏰ Start unified betting countdown (DEPRECATED - SERVER-DRIVEN NOW)
     */
    startCountdown(seconds = 15) {
        const countdownElement = document.getElementById('countdownTimer');
        const countdownValue = document.getElementById('countdownValue');
        
        console.log(`⏰ Starting ${seconds}s countdown for betting phase`);
        console.log(`🔍 DEBUG: countdownElement found:`, !!countdownElement);
        console.log(`🔍 DEBUG: countdownValue found:`, !!countdownValue);
        
        if (countdownElement) countdownElement.style.display = 'block';
        if (countdownValue) countdownValue.textContent = seconds;
        
        // Immediately enter betting phase
        this.gameState = 'betting';
        
        let remaining = seconds;
        const interval = setInterval(() => {
            if (countdownValue) countdownValue.textContent = remaining;
            
            if (remaining > 5) {
                document.getElementById('gameStateMessage').textContent = `🎰 Place your bets! Round starts in ${remaining}s`;
            } else if (remaining > 0) {
                document.getElementById('gameStateMessage').textContent = `🚀 Round starting in ${remaining}s - Last chance!`;
            } else {
                document.getElementById('gameStateMessage').textContent = `🚀 Round starting now...`;
            }
            
            remaining--;
            
            if (remaining < 0) {
                clearInterval(interval);
                if (countdownElement) countdownElement.style.display = 'none';
                
                // Transition to pending/starting state
                this.gameState = 'pending';
                
                console.log('⏰ Betting countdown completed - waiting for server round start');
            }
        }, 1000);
    }

    /**
     * 📊 Add crash point to history
     */
    addToHistory(crashPoint) {
        this.roundHistory.unshift(crashPoint);
        if (this.roundHistory.length > 20) {
            this.roundHistory = this.roundHistory.slice(0, 20);
        }
        
        this.updateHistoryDisplay();
    }

    /**
     * 🎮 Start server-driven visual animation (no independent crashes)
     */
    startServerDrivenVisuals() {
        console.log('🎮 Starting server-driven visual animation...');
        console.log('🔍 Available visual systems:', {
            crashChart: !!window.crashChart,
            chartAddDataPoint: !!(window.crashChart && window.crashChart.addDataPoint),
            chartUpdatePacoPosition: !!(window.crashChart && window.crashChart.updatePacoPosition),
            crashVisualizer: !!window.crashVisualizer,
            visualizerUpdatePosition: !!(window.crashVisualizer && window.crashVisualizer.updatePosition),
            multiplierDisplay: !!window.multiplierDisplay,
            updatePacoMood: typeof updatePacoMood === 'function'
        });
        
        if (this.visualAnimationFrame) {
            cancelAnimationFrame(this.visualAnimationFrame);
        }
        
        this.visualAnimationActive = true;
        this.animateVisuals();
    }
    
    /**
     * 🛑 Stop server-driven visual animation
     */
    stopServerDrivenVisuals() {
        console.log('🛑 Stopping server-driven visual animation');
        this.visualAnimationActive = false;
        
        if (this.visualAnimationFrame) {
            cancelAnimationFrame(this.visualAnimationFrame);
            this.visualAnimationFrame = null;
        }
    }
    
    /**
     * 📈 Visual animation loop (server controls timing, no crashes)
     */
    animateVisuals() {
        if (!this.visualAnimationActive || this.gameState !== 'running') {
            this.stopServerDrivenVisuals();
            return;
        }
        
        // Calculate visual multiplier based on server timing
        const elapsed = (Date.now() - this.roundStartTime) / 1000;
        const visualMultiplier = 1.0024 * Math.pow(1.0718, elapsed);
        
        // Update all visual systems (NO CRASH DETECTION)
        this.updateVisualSystems(visualMultiplier, elapsed);
        
        // Continue animation at 60 FPS
        this.visualAnimationFrame = requestAnimationFrame(() => this.animateVisuals());
    }
    
    /**
     * 📊 Update all visual systems with multiplier data
     */
    updateVisualSystems(multiplier, elapsed) {
        try {
            // 1. Update multiplier display
            const multiplierElement = document.getElementById('multiplierValue');
            if (multiplierElement && !multiplierElement.classList.contains('crashed')) {
                multiplierElement.textContent = multiplier.toFixed(2) + 'x';
            }
            
            // 2. Update chart system (CRITICAL for line indicator + Paco rocket)
            if (window.crashChart) {
                if (typeof window.crashChart.addDataPoint === 'function') {
                    if (window.crashChart.isRunning && window.crashChart.chart) {
                        // Add data point to chart line
                        window.crashChart.addDataPoint(elapsed, multiplier);
                        
                        // CRITICAL: Explicitly update Paco rocket position on chart
                        if (typeof window.crashChart.updatePacoPosition === 'function') {
                            window.crashChart.updatePacoPosition(elapsed, multiplier);
                            // Debug every 30 frames (about every 0.5 seconds)
                            if (Math.floor(elapsed * 60) % 30 === 0) {
                                console.log(`🚀 Paco rocket updated: ${elapsed.toFixed(1)}s, ${multiplier.toFixed(2)}x`);
                            }
                        }
                    } else if (!window.crashChart.isRunning) {
                        console.log('📈 Chart not running - attempting to start');
                        window.crashChart.startNewRound();
                        if (window.crashChart.isRunning) {
                            window.crashChart.addDataPoint(elapsed, multiplier);
                            // Update Paco rocket after successful restart
                            if (typeof window.crashChart.updatePacoPosition === 'function') {
                                window.crashChart.updatePacoPosition(elapsed, multiplier);
                            }
                        }
                    }
                } else {
                    console.log('❌ crashChart.addDataPoint not available');
                }
            } else {
                console.log('❌ window.crashChart not available');
            }
            
            // 3. Update rocket/visualizer system
            if (window.crashVisualizer && typeof window.crashVisualizer.updatePosition === 'function') {
                window.crashVisualizer.updatePosition(elapsed, multiplier);
            }
            
            // 4. Update multiplier display system
            if (window.multiplierDisplay && typeof window.multiplierDisplay.updateMultiplier === 'function') {
                window.multiplierDisplay.updateMultiplier(multiplier);
            }
            
            // 5. Update mood/animations
            if (typeof updatePacoMood === 'function') {
                updatePacoMood(multiplier, true, false);
            }
            
        } catch (error) {
            console.log('📊 Visual update error:', error);
            console.log('🔍 Error details:', error.stack);
        }
    }

    /**
     * 📊 Add crash point to LOCAL recent rounds display
     */
    addToLocalHistory(crashPoint) {
        const historyContainer = document.getElementById('roundHistory');
        if (!historyContainer) {
            console.log('❌ Round history container not found');
            return;
        }

        console.log(`📊 Adding ${crashPoint.toFixed(2)}x to LOCAL recent rounds display`);
        
        // Create new round item
        const item = document.createElement('div');
        item.className = 'round-item local-round';
        item.textContent = crashPoint.toFixed(2) + 'x';
        
        // Color based on multiplier (2x+ = positive return = green)
        if (crashPoint < 2) {
            item.classList.add('low');
        } else if (crashPoint < 10) {
            item.classList.add('medium'); // 2x+ positive returns = green
        } else {
            item.classList.add('high');
        }
        
        // Add timestamp tooltip
        const timestamp = new Date().toLocaleTimeString();
        item.title = `Local round at ${timestamp}`;
        
        // Add to beginning of history
        historyContainer.insertBefore(item, historyContainer.firstChild);
        
        // Keep only last 20 rounds in display
        while (historyContainer.children.length > 20) {
            historyContainer.removeChild(historyContainer.lastChild);
        }
        
        console.log(`✅ Added ${crashPoint.toFixed(2)}x to recent rounds. Total visible: ${historyContainer.children.length}`);
    }

    /**
     * 🎨 Update history display (merge with existing Supabase history)
     */
    updateHistoryDisplay() {
        const historyContainer = document.getElementById('roundHistory');
        if (!historyContainer) return;
        
        // Don't clear existing history if it contains server-round items from Supabase
        const hasServerRounds = historyContainer.querySelector('.server-round');
        const hasLocalHistory = historyContainer.children.length > 0;
        
        if (!hasServerRounds && !hasLocalHistory) {
            // Only clear if we have no database history loaded
            console.log('📊 Displaying client history (no database history loaded)');
            historyContainer.innerHTML = '';
            
            this.roundHistory.forEach(crashPoint => {
                const item = document.createElement('div');
                item.className = 'round-item local-round';
                item.textContent = crashPoint.toFixed(2) + 'x';
                
                // Color based on multiplier
                if (crashPoint < 2) {
                    item.classList.add('low');
                } else if (crashPoint < 10) {
                    item.classList.add('medium');
                } else {
                    item.classList.add('high');
                }
                
                historyContainer.appendChild(item);
            });
        } else {
            console.log('📊 Preserving existing database history, only adding new local rounds');
            // Keep existing database history, only add new client rounds if they're not duplicates
        }
    }

    /**
     * 🔄 Update connection status UI
     */
    updateConnectionStatus(connected) {
        const statusIndicator = document.querySelector('.status-indicator');
        const statusText = document.querySelector('.status-text');
        
        if (connected) {
            statusIndicator.className = 'status-indicator online';
            statusText.textContent = 'Connected';
        } else {
            statusIndicator.className = 'status-indicator offline';
            statusText.textContent = 'Disconnected';
        }
    }

    /**
     * 🎮 Update game state UI indicators
     */
    updateGameStateUI(gameState) {
        const gameStatusElement = document.getElementById('gameStatus');
        const gameStateMessageElement = document.getElementById('gameStateMessage');
        const countdownElement = document.getElementById('countdownTimer');
        
        console.log(`🎨 Updating UI for game state: ${gameState}`);
        
        switch (gameState) {
            case 'betting':
                if (gameStatusElement) gameStatusElement.textContent = 'Place Your Bets';
                if (gameStateMessageElement) gameStateMessageElement.textContent = '🎰 Betting phase active - place your bets now!';
                if (countdownElement) countdownElement.style.display = 'none'; // Hide countdown, just show betting state
                console.log('🎯 UI updated for BETTING phase');
                break;
                
            case 'pending':
                if (gameStatusElement) gameStatusElement.textContent = 'Round Starting';
                if (gameStateMessageElement) gameStateMessageElement.textContent = '⏳ Round starting soon...';
                if (countdownElement) countdownElement.style.display = 'none';
                console.log('🎯 UI updated for PENDING phase');
                break;
                
            case 'running':
                if (gameStatusElement) gameStatusElement.textContent = 'Round Active';
                if (gameStateMessageElement) gameStateMessageElement.textContent = '🚀 Round in progress - good luck!';
                if (countdownElement) countdownElement.style.display = 'none';
                console.log('🎯 UI updated for RUNNING phase');
                break;
                
            case 'crashed':
                if (gameStatusElement) gameStatusElement.textContent = 'Round Ended';
                if (gameStateMessageElement) gameStateMessageElement.textContent = '💥 Round crashed - waiting for next round...';
                if (countdownElement) countdownElement.style.display = 'none';
                console.log('🎯 UI updated for CRASHED phase');
                break;
                
            default:
                if (gameStatusElement) gameStatusElement.textContent = 'Waiting';
                if (gameStateMessageElement) gameStateMessageElement.textContent = '⏳ Waiting for next round...';
                if (countdownElement) countdownElement.style.display = 'none';
                console.log('🎯 UI updated for DEFAULT/WAITING state');
        }
    }

    /**
     * 📢 Show notification
     */
    showNotification(message, type = 'info') {
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }

    /**
     * 📊 Handle live betting table updates
     */
    handleLiveBettingTable(data) {
        // Update the live players display
        const playersContainer = document.getElementById('playersList');
        if (playersContainer) {
            playersContainer.innerHTML = '';
            
            data.forEach(bettor => {
                const playerElement = document.createElement('div');
                playerElement.className = 'player-item';
                
                const statusClass = bettor.status === 'cashed_out' ? 'cashed-out' : 'active';
                
                playerElement.innerHTML = `
                    <div class="player-address">${bettor.username}</div>
                    <div class="player-bet">${bettor.betAmount.toFixed(4)} ETH</div>
                    <div class="player-status ${statusClass}">${bettor.status}</div>
                `;
                
                playersContainer.appendChild(playerElement);
            });
        }
    }

    /**
     * 📈 Handle crash history updates (smart merge with Supabase data)
     */
    handleCrashHistory(history) {
        if (!history || !Array.isArray(history)) return;
        
        console.log(`📊 Processing ${history.length} server history entries`);
        
        // Convert server history to numbers if needed
        const processedHistory = history.map(item => {
            if (typeof item === 'object' && item.crash_point) {
                return parseFloat(item.crash_point);
            } else if (typeof item === 'number') {
                return item;
            } else {
                return parseFloat(item);
            }
        }).filter(point => !isNaN(point));
        
        // Update local history with server data
        this.roundHistory = processedHistory;
        
        // Only update display if no Supabase history is loaded
        const historyContainer = document.getElementById('roundHistory');
        const hasServerRounds = historyContainer?.querySelector('.server-round');
        
        if (!hasServerRounds) {
            console.log('📊 No Supabase history detected, using server socket history');
            this.updateHistoryDisplay();
        } else {
            console.log('📊 Supabase history preserved, server history stored for new rounds');
        }
    }

    /**
     * ❌ Show error message
     */
    showError(message) {
        this.showNotification(message, 'error');
    }

    /**
     * 📱 Show transaction status feedback
     */
    showTransactionStatus(type, message, detail) {
        const statusElement = document.getElementById('transactionStatus');
        if (!statusElement) return;

        const statusIcon = statusElement.querySelector('.status-icon');
        const statusText = statusElement.querySelector('.status-text');
        const statusDetail = statusElement.querySelector('.status-detail');

        // Reset classes
        statusElement.className = 'transaction-status';
        
        switch (type) {
            case 'pending':
                statusIcon.textContent = '⏳';
                statusElement.classList.add('pending');
                break;
            case 'success':
                statusIcon.textContent = '✅';
                statusElement.classList.add('success');
                break;
            case 'error':
                statusIcon.textContent = '❌';
                statusElement.classList.add('error');
                break;
        }

        statusText.textContent = message;
        if (detail) statusDetail.textContent = detail;
        
        statusElement.style.display = 'flex';

        // Auto-hide success/error messages after 5 seconds
        if (type !== 'pending') {
            setTimeout(() => {
                statusElement.style.display = 'none';
            }, 5000);
        }
    }

    /**
     * 🔒 Hide transaction status
     */
    hideTransactionStatus() {
        const statusElement = document.getElementById('transactionStatus');
        if (statusElement) {
            statusElement.style.display = 'none';
        }
    }

    /**
     * 🎬 Start smooth interpolation animation
     */
    startSmoothInterpolation() {
        if (this.interpolationActive) return;
        
        this.interpolationActive = true;
        console.log('🎬 Starting smooth interpolation for server-driven casino');
        this.smoothInterpolationLoop();
    }

    /**
     * 🛑 Stop smooth interpolation
     */
    stopSmoothInterpolation() {
        this.interpolationActive = false;
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        console.log('🛑 Stopped smooth interpolation');
    }

    /**
     * 🔄 Smooth interpolation loop for ultra-smooth visuals
     */
    smoothInterpolationLoop() {
        if (!this.interpolationActive || this.gameState !== 'running') {
            this.stopSmoothInterpolation();
            return;
        }

        const now = Date.now();
        const timeSinceRoundStart = (now - this.roundStartTime) / 1000;
        
        // Predict multiplier based on exponential growth (same formula as server)
        const predictedMultiplier = 1.0024 * Math.pow(1.0718, timeSinceRoundStart);
        
        // Use interpolated server value if recent, otherwise predict
        const timeSinceServerUpdate = now - this.lastServerTime;
        const displayMultiplier = (timeSinceServerUpdate < 200) ? // 200ms tolerance
            this.interpolateTowards(this.lastServerMultiplier, now) : 
            predictedMultiplier;

        // Update all visual systems with smooth interpolated value
        this.updateVisualSystems(displayMultiplier, timeSinceRoundStart);

        // Continue animation loop at 60 FPS
        this.animationFrame = requestAnimationFrame(() => this.smoothInterpolationLoop());
    }

    /**
     * 📈 Interpolate towards server value for smoothness
     */
    interpolateTowards(serverMultiplier, currentTime) {
        const timeSinceUpdate = currentTime - this.lastServerTime;
        const interpolationFactor = Math.min(timeSinceUpdate / this.serverUpdateInterval, 1.0);
        
        // Smooth interpolation with exponential prediction
        const predictedGrowth = 1.0024 * Math.pow(1.0718, timeSinceUpdate / 1000);
        return serverMultiplier * predictedGrowth;
    }

    /**
     * 🎨 Update all visual systems with smooth value
     */
    updateVisualSystems(multiplier, timeElapsed) {
        // Update current multiplier
        this.currentMultiplier = multiplier;

        // Update multiplier display element
        const multiplierElement = document.getElementById('multiplierValue');
        if (multiplierElement) {
            multiplierElement.textContent = multiplier.toFixed(2) + 'x';
        }

        // Update MultiplierDisplay (throttled internally)
        if (window.multiplierDisplay && !window.multiplierDisplay.isCrashed) {
            window.multiplierDisplay.updateMultiplier(multiplier);
        }

        // Update crash chart (throttled internally)
        if (window.crashChart && window.crashChart.isRunning) {
            window.crashChart.addDataPoint(timeElapsed, multiplier);
        }
    }

    /**
     * 🧹 Cleanup
     */
    destroy() {
        if (this.socket) {
            this.socket.disconnect();
        }
    }
}

// Global instance
window.CrashGameClient = CrashGameClient;

// Note: Initialization is handled in the HTML file to avoid conflicts
// Note: Initialization is handled in the HTML file to avoid conflicts