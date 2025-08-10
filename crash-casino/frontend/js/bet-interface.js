/**
 * 🎯 Bet Interface for PacoRocko Crash Casino
 * 
 * Handles betting UI interactions and validation
 */

class BetInterface {
    constructor() {
        this.betAmount = 0.01; // Default bet amount
        this.isPlacingBet = false;
        this.currentBet = null;
        
        this.init();
    }

    /**
     * 🚀 Initialize bet interface
     */
    init() {
        console.log('🎯 Initializing bet interface...');
        this.setupEventListeners();
        this.updateBetDisplay();
    }

    /**
     * 🔌 Setup event listeners
     */
    setupEventListeners() {
        // Bet amount input
        const betInput = document.getElementById('betAmount');
        if (betInput) {
            betInput.addEventListener('input', (e) => {
                this.betAmount = parseFloat(e.target.value) || 0.01;
                this.updateBetDisplay();
                this.validateBetAmount();
            });
        }

        // Quick bet buttons
        document.querySelectorAll('.quick-bet').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const amount = parseFloat(e.target.dataset.amount);
                this.setBetAmount(amount);
            });
        });

        // Place bet button
        const placeBetBtn = document.getElementById('placeBetBtn');
        if (placeBetBtn) {
            placeBetBtn.addEventListener('click', () => {
                this.placeBet();
            });
        }

        // Cash out button
        const cashOutBtn = document.getElementById('cashOutBtn');
        if (cashOutBtn) {
            cashOutBtn.addEventListener('click', () => {
                this.cashOut();
            });
        }
    }

    /**
     * 💰 Set bet amount
     */
    setBetAmount(amount) {
        this.betAmount = Math.max(0.001, Math.min(amount, 10)); // Min 0.001, Max 10 ETH
        
        const betInput = document.getElementById('betAmount');
        if (betInput) {
            betInput.value = this.betAmount.toFixed(3);
        }
        
        this.updateBetDisplay();
        this.validateBetAmount();
    }

    /**
     * ✅ Validate bet amount
     */
    validateBetAmount() {
        const placeBetBtn = document.getElementById('placeBetBtn');
        const isValid = this.betAmount >= 0.001 && this.betAmount <= 10;
        
        if (placeBetBtn) {
            placeBetBtn.disabled = !isValid || this.isPlacingBet;
            
            if (!isValid) {
                placeBetBtn.textContent = this.betAmount < 0.001 ? 'TOO LOW' : 'TOO HIGH';
            } else {
                placeBetBtn.textContent = '🎯 PLACE BET';
            }
        }

        return isValid;
    }

    /**
     * 🎯 Place bet
     */
    async placeBet() {
        if (!this.validateBetAmount() || this.isPlacingBet) {
            return;
        }

        // Check if crash client is available and connected for betting
        if (!window.crashGameClient) {
            this.showNotification('❌ Betting system not initialized', 'error');
            return;
        }
        
        if (!window.crashGameClient.isConnected) {
            this.showNotification('❌ Not connected to betting server - check connection status', 'error');
            console.log('🔍 CrashGameClient status:', {
                exists: !!window.crashGameClient,
                isConnected: window.crashGameClient?.isConnected,
                gameState: window.crashGameClient?.gameState
            });
            return;
        }

        // Check wallet connection
        if (window.realWeb3Modal && !window.realWeb3Modal.isWalletConnected()) {
            this.showNotification('❌ Please connect your wallet first', 'error');
            return;
        }



        this.isPlacingBet = true;
        this.updatePlaceBetButton('⚡ INSTANT BET...');

        try {
            // Priority 1: Enhanced betting system (Option 1 - fixes RPC issues)
            if (window.enhancedBetting && window.enhancedBetting.preApprovalActive) {
                console.log('🚀 Using enhanced betting system (pre-approved)');
                
                const result = await window.enhancedBetting.placeInstantBet(this.betAmount);
                
                this.currentBet = {
                    amount: this.betAmount,
                    timestamp: Date.now()
                };
                
                this.showBetStatus();
                this.showNotification(`🚀 Instant bet placed: ${this.betAmount.toFixed(4)} ETH`, 'success');
                
            } 
            // Priority 2: Direct blockchain transaction (original system)
            else {
                console.log('🔗 Using direct blockchain transaction');
                
                const success = await window.crashGameClient.placeBet(this.betAmount);
                
                if (success) {
                    this.currentBet = {
                        amount: this.betAmount,
                        timestamp: Date.now()
                    };
                    
                    this.showBetStatus();
                    this.showNotification(`✅ Bet placed: ${this.betAmount.toFixed(4)} ETH`, 'success');
                } else {
                    this.showNotification('❌ Failed to place bet', 'error');
                }
            }
        } catch (error) {
            console.error('❌ Bet placement error:', error);
            this.showNotification('❌ Error placing bet: ' + error.message, 'error');
        } finally {
            this.isPlacingBet = false;
            this.updatePlaceBetButton();
            this.validateBetAmount();
        }
    }

    /**
     * 🏃‍♂️ Cash out current bet
     */
    cashOut() {
        if (!this.currentBet || !window.crashGameClient) {
            return;
        }

        try {
            window.crashGameClient.cashOut();
            
            // Hide cash out button
            const cashOutBtn = document.getElementById('cashOutBtn');
            if (cashOutBtn) {
                cashOutBtn.style.display = 'none';
            }
        } catch (error) {
            console.error('❌ Cash out error:', error);
            this.showNotification('❌ Error cashing out: ' + error.message, 'error');
        }
    }

    /**
     * 🎨 Update bet display
     */
    updateBetDisplay() {
        // Update potential win if there's an active bet
        if (this.currentBet && window.crashGameClient) {
            const currentMultiplier = window.crashGameClient.currentMultiplier || 1.0;
            const potentialWin = this.currentBet.amount * currentMultiplier;
            
            const potentialWinElement = document.getElementById('potentialWin');
            if (potentialWinElement) {
                potentialWinElement.textContent = potentialWin.toFixed(4) + ' ETH';
            }
        }
    }

    /**
     * 📊 Show bet status
     */
    showBetStatus() {
        const betStatus = document.getElementById('betStatus');
        const yourBetAmount = document.getElementById('yourBetAmount');
        const potentialWin = document.getElementById('potentialWin');
        
        if (betStatus && yourBetAmount && this.currentBet) {
            yourBetAmount.textContent = this.currentBet.amount.toFixed(4) + ' ETH';
            potentialWin.textContent = this.currentBet.amount.toFixed(4) + ' ETH';
            betStatus.style.display = 'block';
        }
    }

    /**
     * 🚫 Hide bet status
     */
    hideBetStatus() {
        const betStatus = document.getElementById('betStatus');
        if (betStatus) {
            betStatus.style.display = 'none';
        }
        
        this.currentBet = null;
    }

    /**
     * 🔄 Update place bet button
     */
    updatePlaceBetButton(text = null) {
        const placeBetBtn = document.getElementById('placeBetBtn');
        if (placeBetBtn) {
            if (text) {
                placeBetBtn.textContent = text;
            } else {
                placeBetBtn.textContent = '🎯 PLACE BET';
            }
        }
    }

    /**
     * 🎮 Handle game state changes
     */
    onGameStateChange(state) {
        const placeBetBtn = document.getElementById('placeBetBtn');
        const cashOutBtn = document.getElementById('cashOutBtn');
        
        switch (state) {
            case 'pending':
            case 'betting':
                // Enable betting
                if (placeBetBtn) {
                    placeBetBtn.disabled = false;
                    this.validateBetAmount();
                }
                if (cashOutBtn) {
                    cashOutBtn.style.display = 'none';
                }
                break;
                
            case 'running':
                // Disable betting, show cash out if player has bet
                if (placeBetBtn) {
                    placeBetBtn.disabled = true;
                    placeBetBtn.textContent = '🔒 ROUND ACTIVE';
                }
                if (cashOutBtn && this.currentBet) {
                    cashOutBtn.style.display = 'block';
                }
                break;
                
            case 'crashed':
                // Round ended
                if (placeBetBtn) {
                    placeBetBtn.disabled = true;
                    placeBetBtn.textContent = '💥 ROUND ENDED';
                }
                if (cashOutBtn) {
                    cashOutBtn.style.display = 'none';
                }
                
                // Clear current bet after a delay
                setTimeout(() => {
                    this.hideBetStatus();
                    this.validateBetAmount();
                }, 3000);
                break;
        }
    }

    /**
     * 💰 Handle successful bet placement
     */
    onBetPlaced(data) {
        this.currentBet = {
            amount: data.amount || this.betAmount,
            timestamp: Date.now()
        };
        
        this.showBetStatus();
    }

    /**
     * 🏆 Handle successful cash out
     */
    onCashOut(data) {

        
        this.showNotification(
            `🏆 Cashed out at ${data.multiplier.toFixed(2)}x for ${data.payout.toFixed(4)} ETH!`, 
            'success'
        );
        
        this.hideBetStatus();
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
     * 🔄 Reset interface
     */
    reset() {
        this.currentBet = null;
        this.isPlacingBet = false;
        this.hideBetStatus();
        this.validateBetAmount();
    }
}

// Global instance
window.BetInterface = BetInterface;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.betInterface = new BetInterface();
    });
} else {
    window.betInterface = new BetInterface();
}
