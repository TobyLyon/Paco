/**
 * 🎮 Fixed Crash Client - Pure Display Layer
 * 
 * This client ONLY displays what the server tells it
 * No local game logic, no competing systems
 */

class FixedCrashClient {
    constructor() {
        // Display state
        this.currentMultiplier = 1.00;
        this.isAnimating = false;
        this.animationStartTime = null;
        this.animationFrame = null;
        this.crashPoint = null;
        
        // Betting state
        this.canBet = false;
        this.bettingTimeRemaining = 0;
        this.bettingInterval = null;
        this.bettingStartTime = null;
        
        // Connection
        this.socket = null;
        this.isConnected = false;
        
        // UI update callbacks
        this.onMultiplierUpdate = null;
        this.onStateChange = null;
        this.onBettingTimeUpdate = null;
        this.onCrashHistoryUpdate = null;
        this.onLiveBetsUpdate = null;
        
        this.connect();
    }
    
    /**
     * 🔌 Connect to server
     */
    connect() {
        // Get WebSocket URL from environment
        const wsUrl = window.WEBSOCKET_URL || 
                     (window.location.hostname === 'localhost' 
                        ? 'ws://localhost:3001' 
                        : 'wss://paco-x57j.onrender.com');
        
        console.log('🔌 Connecting to server:', wsUrl);
        
        this.socket = io(wsUrl, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });
        
        this.setupEventListeners();
    }
    
    /**
     * 🎧 Setup server event listeners
     */
    setupEventListeners() {
        // Connection events
        this.socket.on('connect', () => {
            console.log('✅ Connected to crash server');
            this.isConnected = true;
            this.updateState('connected');
        });
        
        this.socket.on('disconnect', () => {
            console.log('❌ Disconnected from server');
            this.isConnected = false;
            this.stopAnimation();
            this.stopBettingCountdown();
            this.updateState('disconnected');
        });
        
        // Game events - exactly from reference
        this.socket.on('start_betting_phase', () => {
            console.log('🎲 Betting phase started');
            this.startBettingPhase();
        });
        
        this.socket.on('start_multiplier_count', () => {
            console.log('🚀 Game started - animating multiplier');
            this.startMultiplierAnimation();
        });
        
        this.socket.on('stop_multiplier_count', (crashValue) => {
            console.log('💥 Game crashed at', crashValue);
            this.stopAtCrash(parseFloat(crashValue));
        });
        
        this.socket.on('crash_history', (history) => {
            console.log('📊 Crash history updated:', history);
            if (this.onCrashHistoryUpdate) {
                this.onCrashHistoryUpdate(history);
            }
        });
        
        this.socket.on('receive_live_betting_table', (betsJson) => {
            const bets = JSON.parse(betsJson);
            console.log('💰 Live bets updated:', bets.length, 'bets');
            if (this.onLiveBetsUpdate) {
                this.onLiveBetsUpdate(bets);
            }
        });
        
        this.socket.on('update_user', () => {
            console.log('👤 User update requested');
            // Trigger wallet balance refresh
            if (window.walletBridge) {
                window.walletBridge.updateBalance();
            }
        });
        
        // Request initial game status
        this.socket.emit('get_game_status');
    }
    
    /**
     * 🎲 Start betting phase
     */
    startBettingPhase() {
        this.canBet = true;
        this.currentMultiplier = 1.00;
        this.bettingStartTime = Date.now();
        
        // Update UI
        this.updateState('betting');
        if (this.onMultiplierUpdate) {
            this.onMultiplierUpdate(1.00, false);
        }
        
        // Start 6 second countdown
        if (this.bettingInterval) {
            clearInterval(this.bettingInterval);
        }
        
        this.bettingInterval = setInterval(() => {
            const elapsed = (Date.now() - this.bettingStartTime) / 1000;
            const remaining = Math.max(0, 6 - elapsed);
            
            this.bettingTimeRemaining = remaining;
            if (this.onBettingTimeUpdate) {
                this.onBettingTimeUpdate(remaining);
            }
            
            if (remaining <= 0) {
                this.stopBettingCountdown();
            }
        }, 100);
    }
    
    /**
     * 🚀 Start multiplier animation
     */
    startMultiplierAnimation() {
        this.canBet = false;
        this.isAnimating = true;
        this.animationStartTime = Date.now();
        this.currentMultiplier = 1.00;
        
        // Update state
        this.updateState('running');
        
        // Animate multiplier using exact formula from reference
        const animate = () => {
            if (!this.isAnimating) return;
            
            const elapsed = (Date.now() - this.animationStartTime) / 1000;
            this.currentMultiplier = parseFloat((1.0024 * Math.pow(1.0718, elapsed)).toFixed(2));
            
            if (this.onMultiplierUpdate) {
                this.onMultiplierUpdate(this.currentMultiplier, true);
            }
            
            this.animationFrame = requestAnimationFrame(animate);
        };
        
        this.animationFrame = requestAnimationFrame(animate);
    }
    
    /**
     * 💥 Stop at crash point
     */
    stopAtCrash(crashValue) {
        this.isAnimating = false;
        this.canBet = false;
        this.crashPoint = crashValue;
        this.currentMultiplier = crashValue;
        
        // Stop animation
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        
        // Update UI with final crash value
        if (this.onMultiplierUpdate) {
            this.onMultiplierUpdate(crashValue, false);
        }
        
        this.updateState('crashed');
    }
    
    /**
     * ⏹️ Stop betting countdown
     */
    stopBettingCountdown() {
        if (this.bettingInterval) {
            clearInterval(this.bettingInterval);
            this.bettingInterval = null;
        }
        this.bettingTimeRemaining = 0;
    }
    
    /**
     * ⏹️ Stop animation
     */
    stopAnimation() {
        this.isAnimating = false;
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }
    
    /**
     * 🎮 Update game state
     */
    updateState(state) {
        if (this.onStateChange) {
            this.onStateChange(state);
        }
    }
    
    /**
     * 💰 Place bet
     */
    placeBet(amount, autoMultiplier = null) {
        if (!this.isConnected) {
            console.error('Not connected to server');
            return Promise.reject(new Error('Not connected'));
        }
        
        if (!this.canBet) {
            console.error('Not in betting phase');
            return Promise.reject(new Error('Not in betting phase'));
        }
        
        return new Promise((resolve, reject) => {
            // Send bet to server
            this.socket.emit('place_bet', {
                amount: amount,
                auto_cashout: autoMultiplier
            }, (response) => {
                if (response.success) {
                    console.log('✅ Bet placed successfully');
                    resolve(response);
                } else {
                    console.error('❌ Bet failed:', response.error);
                    reject(new Error(response.error));
                }
            });
        });
    }
    
    /**
     * 💸 Manual cashout
     */
    cashOut() {
        if (!this.isConnected || !this.isAnimating) {
            return Promise.reject(new Error('Cannot cash out now'));
        }
        
        return new Promise((resolve, reject) => {
            this.socket.emit('cash_out', {}, (response) => {
                if (response.success) {
                    console.log('✅ Cashed out at', response.multiplier);
                    resolve(response);
                } else {
                    console.error('❌ Cashout failed:', response.error);
                    reject(new Error(response.error));
                }
            });
        });
    }
    
    /**
     * 🛑 Disconnect
     */
    disconnect() {
        this.stopAnimation();
        this.stopBettingCountdown();
        
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        
        this.isConnected = false;
        this.updateState('disconnected');
    }
}

// Make globally available
window.FixedCrashClient = FixedCrashClient;
