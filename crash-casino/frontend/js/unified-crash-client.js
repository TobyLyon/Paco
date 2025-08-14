/**
 * 🎯 Unified Crash Client - Perfect Sync Implementation
 * 
 * CLIENT-PREDICTION pattern that reacts ONLY to server events
 * NO independent round generation - pure display layer
 */

class UnifiedCrashClient {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        
        // Game state (mirrors server)
        this.currentPhase = 'waiting';
        this.roundId = null;
        this.phaseStartTime = null;
        
        // Multiplier display
        this.currentMultiplier = 1.0;
        this.multiplierAnimationFrame = null;
        this.gameStartTime = null;
        
        // UI elements
        this.multiplierElement = null;
        this.gameStatusElement = null;
        this.gameMessageElement = null;
        
        // Event handlers
        this.onRoundStart = null;
        this.onRoundCrash = null;
        this.onBettingStart = null;
        this.onGameStateUpdate = null;
        
        console.log('🎯 Unified Crash Client initialized - pure reactive mode');
    }
    
    /**
     * 🔌 Connect to server
     */
    connect(serverUrl = 'https://paco-x57j.onrender.com') {
        console.log(`🔌 Connecting to crash server: ${serverUrl}`);
        
        this.socket = io(serverUrl, {
            transports: ['websocket', 'polling'],
            timeout: 30000,
            forceNew: false,  // FIXED: Don't force new connection - maintain stability
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000
        });
        
        this.setupEventListeners();
        this.initializeUI();
        
        return this;
    }
    
    /**
     * 🎧 Setup server event listeners (ONLY way client gets updates)
     */
    setupEventListeners() {
        // Connection events
        this.socket.on('connect', () => {
            console.log('✅ Connected to crash server');
            this.isConnected = true;
            this.requestGameState();
            
            // CRITICAL: Add UI update listeners immediately upon connection
            this.addUIUpdateListeners();
        });
        
        this.socket.on('disconnect', () => {
            console.log('❌ Disconnected from crash server');
            this.isConnected = false;
            this.stopMultiplierAnimation();
        });
        
        // CORE GAME EVENTS (from reference implementation)
        
        // 1. BETTING PHASE START (triggers 6-second countdown)
        this.socket.on('start_betting_phase', () => {
            console.log('🎲 Server: Betting phase started');
            this.handleBettingPhaseStart();
        });
        
        // 2. MULTIPLIER COUNT START (game phase begins)
        this.socket.on('start_multiplier_count', () => {
            console.log('🚀 Server: Multiplier count started');
            this.handleMultiplierStart();
        });
        
        // 3. MULTIPLIER COUNT STOP (round crashed)
        this.socket.on('stop_multiplier_count', (crashValue) => {
            console.log(`💥 Server: Round crashed at ${crashValue}x`);
            this.handleMultiplierStop(crashValue);
        });
        
        // History and state updates
        this.socket.on('crash_history', (history) => {
            console.log('📊 Server: History update', history);
            this.updateHistory(history);
        });
        
        this.socket.on('get_round_id_list', (roundIds) => {
            console.log('🔢 Server: Round IDs update', roundIds);
            this.updateRoundIds(roundIds);
        });
        
        this.socket.on('receive_live_betting_table', (bettorsJson) => {
            console.log('💰 Server: Live bettors update');
            this.updateLiveBettors(JSON.parse(bettorsJson));
        });
        
        // User updates
        this.socket.on('update_user', () => {
            console.log('👤 Server: User update requested');
            if (this.onGameStateUpdate) {
                this.onGameStateUpdate();
            }
        });
        
        console.log('🎧 Server event listeners configured');
    }
    
    /**
     * 🎲 Handle betting phase start (6-second countdown)
     */
    handleBettingPhaseStart() {
        this.currentPhase = 'betting';
        this.phaseStartTime = Date.now();
        this.stopMultiplierAnimation();
        
        // Update UI
        this.updateGameStatus('Betting Phase', 'Place your bets!');
        this.resetMultiplierDisplay();
        
        // Start betting countdown
        this.startBettingCountdown();
        
        // Trigger callback
        if (this.onBettingStart) {
            this.onBettingStart();
        }
    }
    
    /**
     * ⏰ Start betting phase countdown (6 seconds)
     */
    startBettingCountdown() {
        const countdownInterval = setInterval(() => {
            const elapsed = (Date.now() - this.phaseStartTime) / 1000;
            const remaining = Math.max(0, 6 - elapsed);
            
            if (remaining > 0) {
                this.updateGameStatus('Betting Phase', `${remaining.toFixed(1)}s remaining`);
            } else {
                clearInterval(countdownInterval);
                this.updateGameStatus('Starting...', 'Get ready!');
            }
        }, 100); // Update every 100ms for smooth countdown
    }
    
    /**
     * 🚀 Handle multiplier start (game phase begins)
     */
    handleMultiplierStart() {
        this.currentPhase = 'game';
        this.gameStartTime = Date.now();
        this.currentMultiplier = 1.0;
        
        // Update UI
        this.updateGameStatus('Round Running', 'Multiplier climbing...');
        this.updateMultiplierDisplay(1.0);
        
        // Initialize chart for new round
        if (window.crashChart) {
            window.crashChart.startNewRound();
            console.log('📈 Chart: Started new round for multiplier tracking');
        }
        
        // Start smooth multiplier animation
        this.startMultiplierAnimation();
        
        // Trigger callback
        if (this.onRoundStart) {
            this.onRoundStart({
                roundId: this.roundId,
                startTime: this.gameStartTime
            });
        }
    }
    
    /**
     * 📈 Start smooth multiplier animation (client prediction)
     */
    startMultiplierAnimation() {
        const animate = () => {
            if (this.currentPhase !== 'game') return;
            
            // Calculate multiplier using SAME formula as server
            const elapsed = (Date.now() - this.gameStartTime) / 1000;
            this.currentMultiplier = parseFloat((1.0024 * Math.pow(1.0718, elapsed)).toFixed(2));
            
            // Update display
            this.updateMultiplierDisplay(this.currentMultiplier);
            
            // Continue animation
            this.multiplierAnimationFrame = requestAnimationFrame(animate);
        };
        
        animate();
    }
    
    /**
     * 💥 Handle multiplier stop (round crashed)
     */
    handleMultiplierStop(crashValue) {
        this.currentPhase = 'crashed';
        this.stopMultiplierAnimation();
        
        // Use server's authoritative crash value
        const finalCrashValue = parseFloat(crashValue);
        
        // Update UI with final crash value
        this.updateGameStatus('Crashed', `Round ended at ${finalCrashValue.toFixed(2)}x`);
        this.updateMultiplierDisplay(finalCrashValue, true);
        
        // Trigger callback
        if (this.onRoundCrash) {
            this.onRoundCrash({
                roundId: this.roundId,
                crashValue: finalCrashValue
            });
        }
    }
    
    /**
     * 🛑 Stop multiplier animation
     */
    stopMultiplierAnimation() {
        if (this.multiplierAnimationFrame) {
            cancelAnimationFrame(this.multiplierAnimationFrame);
            this.multiplierAnimationFrame = null;
        }
    }
    
    /**
     * 🎨 Initialize UI elements
     */
    initializeUI() {
        this.multiplierElement = document.getElementById('multiplierValue');
        this.gameStatusElement = document.getElementById('gameStatus');
        this.gameMessageElement = document.getElementById('gameStateMessage');
        
        if (!this.multiplierElement || !this.gameStatusElement || !this.gameMessageElement) {
            console.warn('⚠️ Some UI elements not found - creating fallbacks');
        }
        
        // Initial state
        this.updateGameStatus('Connecting...', 'Connecting to server...');
        this.resetMultiplierDisplay();
    }
    
    /**
     * 📊 Update multiplier display
     */
    updateMultiplierDisplay(multiplier, crashed = false) {
        if (this.multiplierElement) {
            this.multiplierElement.textContent = `${multiplier.toFixed(2)}x`;
            
            if (crashed) {
                this.multiplierElement.classList.add('crashed');
            } else {
                this.multiplierElement.classList.remove('crashed');
            }
        }
        
        // Update chart if available
        if (window.crashChart && this.currentPhase === 'game') {
            const elapsed = (Date.now() - this.gameStartTime) / 1000;
            window.crashChart.addDataPoint(elapsed, multiplier);
        }
    }
    
    /**
     * 🔄 Reset multiplier display
     */
    resetMultiplierDisplay() {
        this.updateMultiplierDisplay(1.0, false);
        
        // Reset chart if available
        if (window.crashChart) {
            window.crashChart.startNewRound();
        }
    }
    
    /**
     * 📝 Update game status
     */
    updateGameStatus(status, message) {
        if (this.gameStatusElement) {
            this.gameStatusElement.textContent = status;
        }
        
        if (this.gameMessageElement) {
            this.gameMessageElement.textContent = message;
        }
    }
    
    /**
     * 📊 Update crash history
     */
    updateHistory(history) {
        console.log('📊 Updating crash history:', history);
        
        // Update history display if element exists
        const historyElement = document.getElementById('crashHistory');
        if (historyElement && Array.isArray(history)) {
            // Implementation would update history UI
        }
    }
    
    /**
     * 🔢 Update round IDs
     */
    updateRoundIds(roundIds) {
        console.log('🔢 Updating round IDs:', roundIds);
        this.roundId = roundIds[0]; // Current round is first in list
    }
    
    /**
     * 💰 Update live bettors
     */
    updateLiveBettors(bettors) {
        console.log('💰 Updating live bettors:', bettors.length, 'active');
        
        // Update live betting display if element exists
        const bettingTableElement = document.getElementById('liveBettingTable');
        if (bettingTableElement && Array.isArray(bettors)) {
            // Implementation would update betting table UI
        }
    }
    
    /**
     * 🔍 Request current game state from server
     */
    requestGameState() {
        console.log('🔍 Requesting current game state...');
        
        // Request initial state - server should respond with current phase
        this.socket.emit('get_game_status');
    }
    
    /**
     * 💸 Place a bet
     */
    placeBet(amount, payoutMultiplier) {
        if (!this.isConnected) {
            throw new Error('Not connected to server');
        }
        
        if (this.currentPhase !== 'betting') {
            throw new Error('Not in betting phase');
        }
        
        console.log(`💸 Placing bet: ${amount} @ ${payoutMultiplier}x`);
        
        this.socket.emit('send_bet', {
            bet_amount: amount,
            payout_multiplier: payoutMultiplier,
            player_address: window.realWeb3Modal?.address || window.ethereum?.selectedAddress
        });
    }
    
    /**
     * 🏃 Manual cashout
     */
    cashOut() {
        if (!this.isConnected) {
            throw new Error('Not connected to server');
        }
        
        if (this.currentPhase !== 'game') {
            throw new Error('Not in game phase');
        }
        
        console.log(`🏃 Cashing out at ${this.currentMultiplier.toFixed(2)}x`);
        
        this.socket.emit('manual_cashout_early');
    }
    
    /**
     * 📊 Get current state
     */
    getCurrentState() {
        return {
            phase: this.currentPhase,
            multiplier: this.currentMultiplier,
            roundId: this.roundId,
            connected: this.isConnected
        };
    }
    
    /**
     * 🎯 Add UI update listeners for direct DOM manipulation
     */
    addUIUpdateListeners() {
        console.log('🎯 Adding direct UI update listeners...');
        
        // Listen for server events and update UI immediately
        this.socket.on('start_betting_phase', () => {
            console.log('🎲 SERVER: Betting phase started - updating UI');
            const gameStatus = document.getElementById('gameStatus');
            const gameMessage = document.getElementById('gameStateMessage');
            
            if (gameStatus) gameStatus.textContent = 'Betting Phase';
            if (gameMessage) gameMessage.textContent = 'Place your bets! (6 seconds)';
        });
        
        this.socket.on('start_multiplier_count', () => {
            console.log('🚀 SERVER: Multiplier count started - updating UI');
            const gameStatus = document.getElementById('gameStatus');
            const gameMessage = document.getElementById('gameStateMessage');
            
            if (gameStatus) gameStatus.textContent = 'Round Running';
            if (gameMessage) gameMessage.textContent = 'Multiplier climbing...';
            
            // Start local animation if available
            if (window.liveGameSystem) {
                window.liveGameSystem.gameState = 'running';
                window.liveGameSystem.roundStartTime = Date.now();
                window.liveGameSystem.animate();
            }
        });
        
        this.socket.on('stop_multiplier_count', (crashValue) => {
            console.log('💥 SERVER: Round crashed at', crashValue + 'x - updating UI');
            const gameStatus = document.getElementById('gameStatus');
            const gameMessage = document.getElementById('gameStateMessage');
            const multiplierElement = document.getElementById('multiplierValue');
            
            const finalCrash = parseFloat(crashValue);
            
            if (gameStatus) gameStatus.textContent = 'Crashed';
            if (gameMessage) gameMessage.textContent = `Crashed at ${finalCrash.toFixed(2)}x`;
            if (multiplierElement) {
                multiplierElement.textContent = finalCrash.toFixed(2) + 'x';
                multiplierElement.classList.add('crashed');
            }
            
            // Update local system
            if (window.liveGameSystem) {
                window.liveGameSystem.gameState = 'crashed';
                window.liveGameSystem.crashPoint = finalCrash;
            }
        });
        
        console.log('✅ Direct UI update listeners added successfully');
    }
    
    /**
     * 🔌 Disconnect from server
     */
    disconnect() {
        this.stopMultiplierAnimation();
        
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        
        this.isConnected = false;
        console.log('🔌 Disconnected from crash server');
    }
}

// Make it globally available
window.UnifiedCrashClient = UnifiedCrashClient;
