/**
 * 📈 Multiplier Display for PacoRocko Crash Casino
 * 
 * Handles real-time multiplier visualization and animations
 */

class MultiplierDisplay {
    constructor() {
        this.currentMultiplier = 1.0;
        this.isRunning = false;
        this.isCrashed = false;
        this.animationFrame = null;
        this.lastUpdateTime = 0;
        
        this.init();
    }

    /**
     * 🚀 Initialize multiplier display
     */
    init() {
        console.log('📈 Initializing multiplier display...');
        this.setupElements();
        this.setupEventListeners();
        this.startDisplay();
    }

    /**
     * 🎨 Setup DOM elements
     */
    setupElements() {
        this.multiplierElement = document.getElementById('multiplierValue');
        this.gameStateElement = document.getElementById('gameStateMessage');
        this.countdownElement = document.getElementById('countdownTimer');
        this.countdownValueElement = document.getElementById('countdownValue');
        this.pacoRocket = document.getElementById('pacoRocket');
        this.pacoMascot = document.getElementById('pacoMascot');
        this.rocketTrail = document.getElementById('rocketTrail');
        
        // Ensure elements exist
        if (!this.multiplierElement) {
            console.warn('⚠️ Multiplier element not found');
        }
    }

    /**
     * 🔌 Setup event listeners
     */
    setupEventListeners() {
        // No longer hooking into crash client events - let the main live game system handle everything
        // This prevents conflicts and ensures single source of truth for multiplier updates
        console.log('📈 MultiplierDisplay: Delegating all event handling to live game system');
    }

    /**
     * 🎬 Start display system
     */
    startDisplay() {
        this.animate();
    }

    /**
     * 📈 Update multiplier value - RESTRICTED to prevent conflicts with live game system
     */
    updateMultiplier(multiplier) {
        // Don't update if crashed to prevent overwriting crash value
        if (this.isCrashed) {
            console.log(`🚫 Skipping multiplier update (${multiplier.toFixed(2)}x) - already crashed`);
            return;
        }
        
        // Sanity check - reject absurdly high values that indicate a bug
        if (multiplier > 1000) {
            console.log(`🚫 Rejecting absurd multiplier update: ${multiplier.toFixed(2)}x - likely a bug`);
            return;
        }
        
        console.log(`📈 MultiplierDisplay updating to: ${multiplier.toFixed(2)}x (RESTRICTED MODE)`);
        this.currentMultiplier = multiplier;
        this.lastUpdateTime = Date.now();

        // Only update animations and colors, NOT the actual text display
        // The live game system handles the text display directly
        this.updateMultiplierColor(multiplier);
        this.updateAnimations(multiplier);
        
        // Update bet interface if available
        if (window.betInterface) {
            window.betInterface.updateBetDisplay();
        }
    }

    /**
     * 🎨 Update multiplier color
     */
    updateMultiplierColor(multiplier) {
        if (!this.multiplierElement) return;

        // Remove existing color classes
        this.multiplierElement.classList.remove('low', 'medium', 'high', 'extreme');

        if (multiplier < 2) {
            this.multiplierElement.style.color = '#10b981'; // Green
        } else if (multiplier < 5) {
            this.multiplierElement.style.color = '#fbbf24'; // Yellow
            this.multiplierElement.classList.add('medium');
        } else if (multiplier < 10) {
            this.multiplierElement.style.color = '#f97316'; // Orange
            this.multiplierElement.classList.add('high');
        } else {
            this.multiplierElement.style.color = '#dc2626'; // Red
            this.multiplierElement.classList.add('extreme');
        }

        // Update text shadow
        const color = this.multiplierElement.style.color;
        this.multiplierElement.style.textShadow = `
            0 0 20px ${color},
            0 0 40px ${color}aa,
            0 0 60px ${color}66
        `;
    }

    /**
     * 🎭 Update animations based on multiplier
     */
    updateAnimations(multiplier) {
        try {
            // Update PACO rocket animation
            if (this.pacoRocket) {
                this.pacoRocket.classList.remove('launching', 'crashed');
                
                if (this.isRunning && multiplier > 1.5) {
                    this.pacoRocket.classList.add('launching');
                    
                    // Rocket trail effect
                    if (this.rocketTrail) {
                        this.rocketTrail.classList.add('active');
                    }
                }
            }

            // Update PACO mascot animation
            if (this.pacoMascot) {
                this.pacoMascot.classList.remove('excited', 'crashed');
                
                if (this.isRunning && multiplier > 2.0) {
                    this.pacoMascot.classList.add('excited');
                }
            }

            // Screen shake effect for high multipliers
            if (multiplier > 10) {
                this.addScreenShake();
            }

        } catch (error) {
            console.log('Animation update error:', error);
        }
    }

    /**
     * 🚀 Handle round start
     */
    onRoundStart() {
        console.log('🎮 MultiplierDisplay.onRoundStart() called');
        this.isRunning = true;
        this.isCrashed = false;
        this.currentMultiplier = 1.0;

        // Reset visual state
        if (this.multiplierElement) {
            this.multiplierElement.classList.remove('crashed');
            this.multiplierElement.textContent = '1.00x';
            console.log('✅ MultiplierDisplay reset to 1.00x');
        }

        // Update game state message
        if (this.gameStateElement) {
            this.gameStateElement.textContent = 'Round in progress...';
        }

        // Hide countdown
        if (this.countdownElement) {
            this.countdownElement.style.display = 'none';
        }

        // Reset animations
        this.resetAnimations();
        this.updateMultiplierColor(1.0);

        console.log('🚀 Multiplier display: Round started');
    }

    /**
     * 💥 Handle round crash
     */
    onRoundCrash(crashPoint) {
        console.log(`🎯 MultiplierDisplay.onRoundCrash called with: ${crashPoint.toFixed(2)}x`);
        
        this.isRunning = false;
        this.isCrashed = true;

        // Update display with correct crash point
        if (this.multiplierElement) {
            const crashValue = `${crashPoint.toFixed(2)}x`;
            this.multiplierElement.textContent = crashValue;
            this.multiplierElement.classList.add('crashed');
            this.multiplierElement.style.color = '#dc2626';
            this.multiplierElement.style.textShadow = `
                0 0 20px #dc2626,
                0 0 40px #dc2626aa,
                0 0 60px #dc262666
            `;
            console.log(`✅ MultiplierDisplay set to: ${crashValue}`);
            
            // Force the value to stick by setting it again after a brief delay
            setTimeout(() => {
                if (this.multiplierElement && this.isCrashed) {
                    this.multiplierElement.textContent = crashValue;
                    console.log(`🔒 MultiplierDisplay crash value locked: ${crashValue}`);
                }
            }, 50);
        }

        // Update game state message
        if (this.gameStateElement) {
            this.gameStateElement.textContent = `Crashed at ${crashPoint.toFixed(2)}x`;
        }

        // Crash animations
        this.triggerCrashAnimations();

        console.log(`💥 Multiplier display: Round crashed at ${crashPoint}x`);

        // Start countdown for next round
        setTimeout(() => {
            this.startCountdown(5);
        }, 2000);
    }

    /**
     * ⏰ Start unified betting countdown (5 seconds)
     */
    startCountdown(seconds = 5) {
        if (!this.countdownElement || !this.countdownValueElement) return;

        this.countdownElement.style.display = 'block';
        
        if (this.gameStateElement) {
            this.gameStateElement.textContent = 'Place Your Bets';
        }

        let remaining = seconds;
        const interval = setInterval(() => {
            this.countdownValueElement.textContent = remaining;
            
            // Update message during countdown
            const messageElement = document.getElementById('gameStateMessage');
            if (messageElement) {
                if (remaining > 0) {
                    messageElement.textContent = `🎰 Next round starting in ${remaining}s - Place your bets now!`;
                } else {
                    messageElement.textContent = `🚀 Round starting...`;
                }
            }
            
            remaining--;
            
            if (remaining < 0) {
                clearInterval(interval);
                this.countdownElement.style.display = 'none';
                
                if (this.gameStateElement) {
                    this.gameStateElement.textContent = 'Round Starting';
                }
            }
        }, 1000);
    }

    /**
     * 🎭 Reset animations
     */
    resetAnimations() {
        try {
            if (this.pacoRocket) {
                this.pacoRocket.classList.remove('launching', 'crashed');
            }
            
            if (this.pacoMascot) {
                this.pacoMascot.classList.remove('excited', 'crashed');
            }
            
            if (this.rocketTrail) {
                this.rocketTrail.classList.remove('active');
            }

            // Remove screen effects
            document.body.classList.remove('screen-shake');
        } catch (error) {
            console.log('Animation reset error:', error);
        }
    }

    /**
     * 💥 Trigger crash animations
     */
    triggerCrashAnimations() {
        try {
            if (this.pacoRocket) {
                this.pacoRocket.classList.add('crashed');
            }
            
            if (this.pacoMascot) {
                this.pacoMascot.classList.add('crashed');
            }
            
            if (this.rocketTrail) {
                this.rocketTrail.classList.remove('active');
            }

            // Screen flash effect removed per user request
        } catch (error) {
            console.log('Crash animation error:', error);
        }
    }

    /**
     * 🌟 Add screen shake effect
     */
    addScreenShake() {
        document.body.classList.add('screen-shake');
        setTimeout(() => {
            document.body.classList.remove('screen-shake');
        }, 200);
    }



    /**
     * 🔄 Animation loop - DISABLED to prevent conflicts with live game system
     */
    animate() {
        // Animation loop disabled - live game system handles all multiplier updates
        // This prevents conflicts and ensures single source of truth
        
        // Still run the loop for potential future enhancements but don't update multiplier
        this.animationFrame = requestAnimationFrame(() => this.animate());
    }

    /**
     * 🛑 Stop display
     */
    stop() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }

    /**
     * 🔄 Reset display
     */
    reset() {
        this.currentMultiplier = 1.0;
        this.isRunning = false;
        this.isCrashed = false;
        
        if (this.multiplierElement) {
            this.multiplierElement.textContent = '1.00x';
            this.multiplierElement.classList.remove('crashed');
        }
        
        this.resetAnimations();
        this.updateMultiplierColor(1.0);
    }
}

// Global instance
window.MultiplierDisplay = MultiplierDisplay;

// Don't auto-initialize - let the main game handle this
// (Removed automatic initialization to prevent conflicts)

// Add CSS for screen effects
const style = document.createElement('style');
style.textContent = `

    
    .screen-shake {
        animation: screenShake 0.2s ease-in-out;
    }
    
    @keyframes screenShake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-2px); }
        75% { transform: translateX(2px); }
    }
`;
document.head.appendChild(style);
