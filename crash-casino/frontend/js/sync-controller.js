/**
 * 🎯 Crash Game Sync Controller
 * 
 * SINGLE SOURCE OF TRUTH implementation based on reference working architecture
 * Eliminates dual-system conflicts by establishing clear server authority
 */

class CrashGameSyncController {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        
        // Game state (SERVER AUTHORITATIVE)
        this.gamePhase = 'waiting'; // waiting, betting, running, crashed
        this.currentRound = null;
        this.roundStartTime = null;
        this.serverCrashPoint = null;
        
        // Display state (CLIENT VISUAL)
        this.currentMultiplier = 1.0;
        this.animationFrame = null;
        this.localStartTime = null;
        
        // Round history
        this.roundHistory = [];
        
        // Event callbacks
        this.onGameStateUpdate = null;
        this.onRoundStart = null;
        this.onRoundCrash = null;
        this.onBetUpdate = null;
        
        console.log('🎯 Sync Controller initialized - Single Source of Truth architecture');
    }

    /**
     * 🔌 Connect to server (REFERENCE COMPATIBLE)
     */
    async connect(serverUrl = 'https://paco-x57j.onrender.com') {
        try {
            console.log('🔌 Connecting to crash server:', serverUrl);
            
            // Import socket.io if not available
            if (typeof io === 'undefined') {
                console.log('📦 Loading Socket.IO...');
                await this.loadSocketIO();
            }
            
            // Connect to server
            this.socket = io(serverUrl, {
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000
            });
            
            this.setupEventListeners();
            
        } catch (error) {
            console.error('❌ Connection failed:', error);
        }
    }

    /**
     * 📡 Setup event listeners (REFERENCE ARCHITECTURE)
     */
    setupEventListeners() {
        // Connection events
        this.socket.on('connect', () => {
            console.log('✅ Connected to crash server');
            this.isConnected = true;
            this.requestGameState();
        });

        this.socket.on('disconnect', () => {
            console.log('🔌 Disconnected from crash server');
            this.isConnected = false;
            this.stopMultiplierAnimation();
        });

        // REFERENCE COMPATIBLE EVENTS
        this.socket.on('start_betting_phase', (data) => {
            console.log('💰 Betting phase started');
            this.handleBettingPhase(data);
        });

        this.socket.on('start_multiplier_count', (data) => {
            console.log('🚀 Multiplier count started');
            this.handleRoundStart(data);
        });

        this.socket.on('stop_multiplier_count', (crashPoint) => {
            console.log('💥 Round crashed at:', crashPoint);
            this.handleRoundCrash(crashPoint);
        });

        this.socket.on('crash_history', (history) => {
            console.log('📊 Round history updated');
            this.updateRoundHistory(history);
        });

        // Enhanced events (compatible with your backend)
        this.socket.on('gameState', (data) => {
            console.log('🎮 Game state received:', data);
            this.handleGameState(data);
        });

        this.socket.on('roundStarted', (data) => {
            console.log('🚀 Round started (enhanced):', data);
            this.handleRoundStart(data);
        });

        this.socket.on('roundCrashed', (data) => {
            console.log('💥 Round crashed (enhanced):', data);
            this.handleRoundCrash(data.crashPoint || data.finalMultiplier);
        });
    }

    /**
     * 💰 Handle betting phase (SERVER AUTHORITATIVE)
     */
    handleBettingPhase(data) {
        this.gamePhase = 'betting';
        this.currentMultiplier = 1.0;
        
        // Update UI
        this.updateGameStatus('Betting Phase', '💰 Place your bets!');
        this.enableBettingInterface();
        
        // Start betting countdown (6 seconds like reference)
        this.startBettingCountdown(data?.timeUntilStart || 6000);
        
        if (this.onGameStateUpdate) {
            this.onGameStateUpdate({ phase: 'betting', ...data });
        }
    }

    /**
     * 🚀 Handle round start (SERVER AUTHORITATIVE)
     */
    handleRoundStart(data) {
        this.gamePhase = 'running';
        this.currentRound = data?.roundId || Date.now();
        this.serverCrashPoint = data?.crashPoint || null;
        
        // CLIENT VISUAL: Start smooth multiplier animation
        this.localStartTime = Date.now();
        this.roundStartTime = data?.startTime || this.localStartTime;
        
        // Update UI
        this.updateGameStatus('Round Active', '🚀 Round in progress - good luck!');
        this.disableBettingInterface();
        
        // Start smooth multiplier display (REFERENCE FORMULA)
        this.startMultiplierAnimation();
        
        if (this.onRoundStart) {
            this.onRoundStart(data);
        }
    }

    /**
     * 💥 Handle round crash (SERVER AUTHORITATIVE)
     */
    handleRoundCrash(crashPoint) {
        this.gamePhase = 'crashed';
        
        // CRITICAL: Use server crash point EXACTLY
        const finalCrashPoint = typeof crashPoint === 'string' ? 
            parseFloat(crashPoint) : crashPoint;
            
        this.currentMultiplier = finalCrashPoint;
        
        // Stop animation and display final crash point
        this.stopMultiplierAnimation();
        
        // Update UI with EXACT server value
        this.updateGameStatus('Crashed', `💥 Crashed at ${finalCrashPoint.toFixed(2)}x`);
        this.updateMultiplierDisplay(finalCrashPoint);
        
        // Add to history
        this.roundHistory.unshift(finalCrashPoint);
        if (this.roundHistory.length > 25) {
            this.roundHistory.pop();
        }
        
        // Update round history display
        this.updateRoundHistoryDisplay();
        
        if (this.onRoundCrash) {
            this.onRoundCrash({ crashPoint: finalCrashPoint });
        }
    }

    /**
     * 🎮 Start smooth multiplier animation (REFERENCE FORMULA)
     */
    startMultiplierAnimation() {
        console.log('🎮 Starting smooth multiplier animation');
        
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        
        const animate = () => {
            if (this.gamePhase !== 'running') return;
            
            // REFERENCE FORMULA: Identical to working implementation
            const elapsed = (Date.now() - this.localStartTime) / 1000.0;
            this.currentMultiplier = parseFloat((1.0024 * Math.pow(1.0718, elapsed)).toFixed(2));
            
            // Update display
            this.updateMultiplierDisplay(this.currentMultiplier);
            
            // Continue animation
            this.animationFrame = requestAnimationFrame(animate);
        };
        
        this.animationFrame = requestAnimationFrame(animate);
    }

    /**
     * 🛑 Stop multiplier animation
     */
    stopMultiplierAnimation() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }

    /**
     * 🎨 Update multiplier display
     */
    updateMultiplierDisplay(multiplier) {
        const element = document.getElementById('multiplierValue');
        if (element) {
            element.textContent = `${multiplier.toFixed(2)}x`;
            
            // Add crashed styling if needed
            if (this.gamePhase === 'crashed') {
                element.classList.add('crashed');
            } else {
                element.classList.remove('crashed');
            }
        }
        
        // Update chart if available
        if (window.crashChart && window.crashChart.updateMultiplier) {
            window.crashChart.updateMultiplier(multiplier);
        }
    }

    /**
     * 🎮 Update game status
     */
    updateGameStatus(status, message) {
        const statusElement = document.getElementById('gameStatus');
        const messageElement = document.getElementById('gameStateMessage');
        
        if (statusElement) statusElement.textContent = status;
        if (messageElement) messageElement.textContent = message;
    }

    /**
     * 💰 Enable betting interface
     */
    enableBettingInterface() {
        if (window.betInterface && window.betInterface.enableBetting) {
            window.betInterface.enableBetting();
        }
        
        const betButton = document.querySelector('.bet-button');
        if (betButton) {
            betButton.disabled = false;
            betButton.textContent = 'Place Bet';
        }
    }

    /**
     * 🚫 Disable betting interface
     */
    disableBettingInterface() {
        if (window.betInterface && window.betInterface.disableBetting) {
            window.betInterface.disableBetting();
        }
        
        const betButton = document.querySelector('.bet-button');
        if (betButton) {
            betButton.disabled = true;
            betButton.textContent = 'Round Active';
        }
    }

    /**
     * ⏱️ Start betting countdown
     */
    startBettingCountdown(duration = 6000) {
        let timeLeft = duration / 1000;
        
        const updateCountdown = () => {
            if (this.gamePhase !== 'betting' || timeLeft <= 0) return;
            
            const messageElement = document.getElementById('gameStateMessage');
            if (messageElement) {
                messageElement.textContent = `💰 Betting closes in ${timeLeft.toFixed(1)}s`;
            }
            
            timeLeft -= 0.1;
            setTimeout(updateCountdown, 100);
        };
        
        updateCountdown();
    }

    /**
     * 📊 Update round history display
     */
    updateRoundHistoryDisplay() {
        const historyElement = document.getElementById('roundHistory');
        if (!historyElement) return;
        
        historyElement.innerHTML = '';
        
        this.roundHistory.slice(0, 10).forEach(crashPoint => {
            const item = document.createElement('div');
            item.className = `history-item ${crashPoint >= 2 ? 'high' : 'low'}`;
            item.textContent = `${crashPoint.toFixed(2)}x`;
            historyElement.appendChild(item);
        });
    }

    /**
     * 🎮 Handle general game state updates
     */
    handleGameState(data) {
        if (data.phase) {
            this.gamePhase = data.phase;
        }
        
        if (data.history) {
            this.roundHistory = data.history;
            this.updateRoundHistoryDisplay();
        }
        
        if (this.onGameStateUpdate) {
            this.onGameStateUpdate(data);
        }
    }

    /**
     * 📊 Update round history from server
     */
    updateRoundHistory(history) {
        if (Array.isArray(history)) {
            this.roundHistory = history;
            this.updateRoundHistoryDisplay();
        }
    }

    /**
     * 🔄 Request current game state
     */
    requestGameState() {
        if (this.socket && this.isConnected) {
            this.socket.emit('requestState');
        }
    }

    /**
     * 💰 Place bet through server
     */
    placeBet(amount, payoutMultiplier, walletAddress) {
        if (!this.isConnected || this.gamePhase !== 'betting') {
            console.log('❌ Cannot place bet - not in betting phase');
            return false;
        }
        
        this.socket.emit('placeBet', {
            amount,
            payoutMultiplier,
            walletAddress
        });
        
        return true;
    }

    /**
     * 💸 Manual cashout
     */
    cashOut() {
        if (!this.isConnected || this.gamePhase !== 'running') {
            console.log('❌ Cannot cash out - round not active');
            return false;
        }
        
        this.socket.emit('cashOut');
        return true;
    }

    /**
     * 📦 Load Socket.IO dynamically
     */
    async loadSocketIO() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.socket.io/4.7.2/socket.io.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * 🧹 Cleanup
     */
    destroy() {
        this.stopMultiplierAnimation();
        if (this.socket) {
            this.socket.disconnect();
        }
    }
}

// Export for global use
window.CrashGameSyncController = CrashGameSyncController;
console.log('🎯 Sync Controller loaded - Ready for single source of truth architecture');
