/**
 * 🎯 SIMPLE SYNC CLIENT - Bulletproof Implementation
 * 
 * This is a minimal, robust client that ONLY handles server events
 * and updates the UI. No complex layering or method conflicts.
 */

class SimpleSyncClient {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.gamePhase = 'waiting';
        this.multiplier = 1.0;
        this.gameStartTime = null;
        this.animationFrame = null;
        
        console.log('🎯 Simple Sync Client initialized');
    }
    
    /**
     * 🔌 Connect to server with stable settings
     */
    connect(serverUrl = 'https://paco-x57j.onrender.com') {
        console.log(`🔌 Simple client connecting to: ${serverUrl}`);
        
        this.socket = io(serverUrl, {
            transports: ['websocket', 'polling'],
            timeout: 30000,
            forceNew: false,
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });
        
        this.setupEventListeners();
        return this;
    }
    
    /**
     * 🎧 Setup server event listeners (ONLY these 3 events matter)
     */
    setupEventListeners() {
        this.socket.on('connect', () => {
            console.log('✅ Simple client connected to server');
            this.isConnected = true;
        });
        
        this.socket.on('disconnect', () => {
            console.log('❌ Simple client disconnected');
            this.isConnected = false;
            this.stopAnimation();
        });
        
        // BETTING PHASE (6 seconds)
        this.socket.on('start_betting_phase', () => {
            console.log('🎲 SIMPLE: Betting phase started');
            this.gamePhase = 'betting';
            this.updateUI('Betting Phase', 'Place your bets! (6 seconds)');
            this.stopAnimation();
        });
        
        // GAME PHASE (multiplier climbing)
        this.socket.on('start_multiplier_count', () => {
            console.log('🚀 SIMPLE: Game started - starting animation');
            this.gamePhase = 'game';
            this.gameStartTime = Date.now();
            this.multiplier = 1.0;
            this.updateUI('Round Running', 'Multiplier climbing...');
            this.startAnimation();
        });
        
        // CRASH PHASE (round ended)
        this.socket.on('stop_multiplier_count', (crashValue) => {
            console.log('💥 SIMPLE: Round crashed at', crashValue + 'x');
            this.gamePhase = 'crashed';
            const crash = parseFloat(crashValue);
            this.multiplier = crash;
            this.updateUI('Crashed', `Crashed at ${crash.toFixed(2)}x`);
            this.updateMultiplier(crash, true);
            this.stopAnimation();
        });
        
        console.log('✅ Simple event listeners configured');
    }
    
    /**
     * 🎨 Update UI elements directly
     */
    updateUI(status, message) {
        const statusEl = document.getElementById('gameStatus');
        const messageEl = document.getElementById('gameStateMessage');
        
        if (statusEl) statusEl.textContent = status;
        if (messageEl) messageEl.textContent = message;
    }
    
    /**
     * 📊 Update multiplier display and chart
     */
    updateMultiplier(value, crashed = false) {
        // Update multiplier text
        const multiplierEl = document.getElementById('multiplierValue');
        if (multiplierEl) {
            multiplierEl.textContent = value.toFixed(2) + 'x';
            if (crashed) {
                multiplierEl.classList.add('crashed');
            } else {
                multiplierEl.classList.remove('crashed');
            }
        }
        
        // Update chart using CORRECT method name
        if (window.crashChart && this.gamePhase === 'game') {
            const elapsed = (Date.now() - this.gameStartTime) / 1000;
            
            // Try multiple method names to be safe
            if (typeof window.crashChart.addDataPoint === 'function') {
                window.crashChart.addDataPoint(elapsed, value);
            } else if (typeof window.crashChart.addPoint === 'function') {
                window.crashChart.addPoint(elapsed, value);
            } else if (typeof window.crashChart.update === 'function') {
                window.crashChart.update(elapsed, value);
            } else {
                console.log('⚠️ No chart update method found');
            }
        }
    }
    
    /**
     * 🎯 Start smooth 60 FPS animation
     */
    startAnimation() {
        if (!this.gameStartTime) return;
        
        const animate = () => {
            if (this.gamePhase !== 'game') return;
            
            // Calculate multiplier using EXACT server formula
            const elapsed = (Date.now() - this.gameStartTime) / 1000;
            this.multiplier = parseFloat((1.0024 * Math.pow(1.0718, elapsed)).toFixed(2));
            
            // Update display
            this.updateMultiplier(this.multiplier, false);
            
            // Continue animation
            this.animationFrame = requestAnimationFrame(animate);
        };
        
        animate();
        console.log('✅ Animation started');
    }
    
    /**
     * 🛑 Stop animation
     */
    stopAnimation() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }
    
    /**
     * 🔌 Disconnect
     */
    disconnect() {
        this.stopAnimation();
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.isConnected = false;
    }
}

// Make globally available
window.SimpleSyncClient = SimpleSyncClient;
