/**
 * 🎰 Reference Crash Client (EXACT COPY from Working Implementation)
 * 
 * This is adapted from the WORKING reference implementation:
 * wbrandon25/Online-Crash-Gambling-Simulator/client/src/App.js
 * 
 * CRITICAL: Uses EXACT same events and logic that we know works.
 */

class ReferenceCrashClient {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        
        // Game state (EXACT from reference - App.js lines 23-49)
        this.multiplier = null;
        this.liveMultiplier = 'CONNECTING...';
        this.liveMultiplierSwitch = false;
        this.announcement = '';
        this.betActive = false;
        this.crashHistory = [];
        this.roundIdList = [];
        this.bBettingPhase = false;
        this.bettingPhaseTime = -1;
        this.liveBettingTable = null;
        this.globalTimeNow = 0;
        
        // Animation tracking (EXACT from reference)
        this.gamePhaseTimeElapsed = 0;
        this.gameCounter = null;
        this.bettingInterval = null;
        
        // Initialize
        this.init();
    }
    
    /**
     * 🚀 Initialize client (EXACT from reference - App.js lines 56-134)
     */
    init() {
        console.log('🎰 Initializing Reference Crash Client (exact copy from working repo)...');
        
        // Connect to backend server
        const serverUrl = window.location.hostname === 'localhost' ? 
            'http://localhost:3001' : 
            'https://paco-x57j.onrender.com';
            
        this.socket = io.connect(serverUrl);
        
        // Setup event listeners (EXACT from reference)
        this.setupSocketListeners();
        
        console.log('🔗 Connected to:', serverUrl);
    }
    
    /**
     * 🔌 Setup socket listeners (EXACT from reference - App.js lines 61-134)
     */
    setupSocketListeners() {
        // Connection events
        this.socket.on('connect', () => {
            this.isConnected = true;
            console.log('✅ Connected to crash game server');
            this.updateConnectionStatus('CONNECTED');
        });
        
        this.socket.on('disconnect', () => {
            this.isConnected = false;
            console.log('❌ Disconnected from crash game server');
            this.updateConnectionStatus('DISCONNECTED');
        });
        
        // EXACT reference events (App.js lines 65-68)
        this.socket.on("start_multiplier_count", (data) => {
            console.log('🚀 REFERENCE EVENT: start_multiplier_count');
            this.globalTimeNow = Date.now();
            this.liveMultiplierSwitch = true;
            this.startMultiplierAnimation();
        });
        
        // EXACT reference events (App.js lines 70-75)
        this.socket.on("stop_multiplier_count", (data) => {
            console.log('💥 REFERENCE EVENT: stop_multiplier_count:', data);
            this.liveMultiplier = data;
            this.liveMultiplierSwitch = false;
            this.stopMultiplierAnimation();
            this.betActive = false;
            this.updateMultiplierDisplay(data, true); // true = crashed
        });
        
        // EXACT reference events (App.js lines 77-79)
        this.socket.on("update_user", (data) => {
            console.log('🔄 REFERENCE EVENT: update_user');
            // Update user balance if needed
        });
        
        // EXACT reference events (App.js lines 81-102)
        this.socket.on("crash_history", (data) => {
            console.log('📊 REFERENCE EVENT: crash_history:', data);
            this.crashHistory = data;
            this.updateCrashHistory(data);
        });
        
        // EXACT reference events (App.js lines 104-106)
        this.socket.on("get_round_id_list", (data) => {
            console.log('📝 REFERENCE EVENT: get_round_id_list:', data);
            this.roundIdList = data.reverse();
        });
        
        // EXACT reference events (App.js lines 108-118)
        this.socket.on("start_betting_phase", (data) => {
            console.log('🎲 REFERENCE EVENT: start_betting_phase');
            this.globalTimeNow = Date.now();
            this.liveMultiplier = "Starting...";
            this.bBettingPhase = true;
            this.liveBettingTable = null;
            
            this.updateMultiplierDisplay("Starting...", false);
            this.startBettingPhaseTimer();
        });
        
        // EXACT reference events (App.js lines 124-129)
        this.socket.on("receive_live_betting_table", (data) => {
            console.log('📋 REFERENCE EVENT: receive_live_betting_table');
            this.liveBettingTable = data;
            this.updateBettingTable(JSON.parse(data));
        });
        
        console.log('🔌 Reference socket listeners setup complete');
    }
    
    /**
     * 🎬 Start multiplier animation (EXACT from reference - App.js lines 162-187)
     */
    startMultiplierAnimation() {
        console.log('🎬 Starting multiplier animation (reference algorithm)');
        
        // Clear any existing animation
        if (this.gameCounter) {
            clearInterval(this.gameCounter);
        }
        
        // Set initial multiplier
        this.liveMultiplier = '1.00';
        this.updateMultiplierDisplay('1.00x', false);
        
        // EXACT reference animation (App.js lines 166-180)
        this.gameCounter = setInterval(() => {
            if (!this.liveMultiplierSwitch) return;
            
            let time_elapsed = (Date.now() - this.globalTimeNow) / 1000.0;
            this.gamePhaseTimeElapsed = time_elapsed;
            
            // EXACT reference algorithm (App.js line 169)
            let currentMultiplier = (1.0024 * Math.pow(1.0718, time_elapsed)).toFixed(2);
            this.liveMultiplier = currentMultiplier;
            
            this.updateMultiplierDisplay(currentMultiplier + 'x', false);
            
        }, 1); // 1ms interval for smooth animation (EXACT reference)
    }
    
    /**
     * 🛑 Stop multiplier animation
     */
    stopMultiplierAnimation() {
        console.log('🛑 Stopping multiplier animation');
        
        if (this.gameCounter) {
            clearInterval(this.gameCounter);
            this.gameCounter = null;
        }
    }
    
    /**
     * ⏰ Start betting phase timer (EXACT from reference - App.js lines 189-207)
     */
    startBettingPhaseTimer() {
        console.log('⏰ Starting betting phase timer (6 seconds)');
        
        // Clear any existing timer
        if (this.bettingInterval) {
            clearInterval(this.bettingInterval);
        }
        
        // EXACT reference betting timer (App.js lines 194-206)
        this.bettingInterval = setInterval(() => {
            let time_elapsed = ((Date.now() - this.globalTimeNow) / 1000.0);
            let time_remaining = (6 - time_elapsed).toFixed(2); // 6 seconds (EXACT reference)
            this.bettingPhaseTime = time_remaining;
            
            this.updateBettingTimer(time_remaining);
            
            if (time_remaining < 0) {
                this.bBettingPhase = false;
                clearInterval(this.bettingInterval);
                this.bettingInterval = null;
                console.log('⏰ Betting phase ended');
            }
        }, 100); // EXACT reference interval
    }
    
    /**
     * 🖥️ Update multiplier display
     */
    updateMultiplierDisplay(value, crashed = false) {
        const multiplierElement = document.getElementById('multiplierValue');
        if (multiplierElement) {
            multiplierElement.textContent = value;
            
            if (crashed) {
                multiplierElement.classList.add('crashed');
                console.log(`💥 Multiplier crashed at: ${value}`);
            } else {
                multiplierElement.classList.remove('crashed');
            }
        }
        
        // Update game status
        const statusElement = document.getElementById('gameStatus');
        if (statusElement) {
            if (crashed) {
                statusElement.textContent = 'Crashed';
            } else if (this.bBettingPhase) {
                statusElement.textContent = 'Betting';
            } else if (this.liveMultiplierSwitch) {
                statusElement.textContent = 'Running';
            } else {
                statusElement.textContent = 'Waiting';
            }
        }
    }
    
    /**
     * 📊 Update crash history display
     */
    updateCrashHistory(history) {
        const historyElement = document.getElementById('crashHistory');
        if (historyElement && Array.isArray(history)) {
            historyElement.innerHTML = history.slice(0, 10).map(crash => 
                `<span class="crash-value ${crash >= 2 ? 'high' : 'low'}">${crash.toFixed(2)}x</span>`
            ).join('');
        }
    }
    
    /**
     * ⏰ Update betting timer display
     */
    updateBettingTimer(timeRemaining) {
        const timerElement = document.getElementById('bettingTimer');
        if (timerElement) {
            if (timeRemaining > 0) {
                timerElement.textContent = `Betting: ${timeRemaining}s`;
                timerElement.classList.remove('hidden');
            } else {
                timerElement.classList.add('hidden');
            }
        }
    }
    
    /**
     * 📋 Update betting table display
     */
    updateBettingTable(bettingData) {
        const tableElement = document.getElementById('bettingTable');
        if (tableElement && Array.isArray(bettingData)) {
            tableElement.innerHTML = bettingData.map(bet => `
                <div class="bet-row ${bet.b_bet_live ? 'live' : 'completed'}">
                    <span class="username">${bet.the_username}</span>
                    <span class="bet-amount">${bet.bet_amount} ETH</span>
                    <span class="multiplier">${bet.cashout_multiplier ? bet.cashout_multiplier + 'x' : 'Live'}</span>
                    <span class="profit ${bet.profit > 0 ? 'positive' : 'negative'}">${bet.profit ? bet.profit.toFixed(4) + ' ETH' : ''}</span>
                </div>
            `).join('');
        }
    }
    
    /**
     * 🔗 Update connection status
     */
    updateConnectionStatus(status) {
        const statusElement = document.getElementById('connectionStatus');
        if (statusElement) {
            statusElement.textContent = status;
            statusElement.className = `connection-status ${status.toLowerCase()}`;
        }
    }
    
    /**
     * 💰 Place bet (for wallet integration)
     */
    async placeBet(betAmount, payoutMultiplier) {
        if (!this.bBettingPhase) {
            console.warn('⚠️ Cannot place bet - not in betting phase');
            return { success: false, error: 'Not in betting phase' };
        }
        
        try {
            // This would integrate with your wallet system
            console.log(`💰 Placing bet: ${betAmount} ETH @ ${payoutMultiplier}x`);
            
            // For now, emit to server (would be replaced with wallet transaction)
            this.socket.emit('place_bet', {
                bet_amount: betAmount,
                payout_multiplier: payoutMultiplier
            });
            
            this.betActive = true;
            return { success: true };
            
        } catch (error) {
            console.error('❌ Failed to place bet:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * 🤑 Manual cash out
     */
    async cashOut() {
        if (!this.betActive || !this.liveMultiplierSwitch) {
            console.warn('⚠️ Cannot cash out - no active bet or game not running');
            return { success: false, error: 'No active bet or game not running' };
        }
        
        try {
            console.log(`🤑 Cashing out at: ${this.liveMultiplier}x`);
            
            // Emit cash out event
            this.socket.emit('cash_out');
            
            this.betActive = false;
            return { success: true, multiplier: this.liveMultiplier };
            
        } catch (error) {
            console.error('❌ Failed to cash out:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * 🛑 Disconnect
     */
    disconnect() {
        if (this.gameCounter) {
            clearInterval(this.gameCounter);
        }
        if (this.bettingInterval) {
            clearInterval(this.bettingInterval);
        }
        if (this.socket) {
            this.socket.disconnect();
        }
        
        console.log('🛑 Reference crash client disconnected');
    }
}

// Create global instance
window.ReferenceCrashClient = ReferenceCrashClient;

console.log('🎰 Reference Crash Client loaded (exact copy from working implementation)');
