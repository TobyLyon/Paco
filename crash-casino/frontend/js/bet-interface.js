/**
 * 🎯 Bet Interface for PacoRocko Crash Casino
 * 
 * Handles betting UI interactions and validation
 */

class BetInterface {
    constructor() {
        this.betAmount = 0.005; // Realistic default bet amount
        this.isPlacingBet = false;
        this.currentBet = null;
        this.pendingTransactions = new Map(); // Track pending bets
        this.activeBets = new Map(); // Track active bets in current round
        this.cancelledTransactions = new Set(); // Track cancelled transactions to prevent respamming
        this.currentTxId = null; // Track current transaction ID
        
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
                this.betAmount = parseFloat(e.target.value) || 0.005;
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

        // Cancel bet button
        const cancelBetBtn = document.getElementById('cancelBetBtn');
        if (cancelBetBtn) {
            cancelBetBtn.addEventListener('click', () => {
                this.cancelCurrentTransaction();
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
        this.betAmount = Math.max(0.001, Math.min(amount, 1)); // Min 0.001, Max 10 ETH
        
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
     * 🎯 Place bet with comprehensive tracking
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

        const betId = `bet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        this.isPlacingBet = true;
        this.updatePlaceBetButton('🔄 SENDING TX...');
        
        // Track this transaction
        this.currentTxId = betId;

        try {
            // Check if this bet was previously cancelled
            if (this.cancelledTransactions.has(betId)) {
                console.log('🚫 Bet was cancelled, not proceeding');
                this.showNotification('❌ Bet was cancelled', 'error');
                return;
            }
            
            // Add to pending transactions immediately for UI feedback
            this.pendingTransactions.set(betId, {
                amount: this.betAmount,
                timestamp: Date.now(),
                status: 'pending',
                stage: 'sending',
                txId: betId
            });
            
            this.updateActiveBetsDisplay();
            this.showNotification('🔄 Sending transaction to MetaMask...', 'pending');

            // Place bet through crash client
            const success = await window.crashGameClient.placeBet(this.betAmount);
            
            if (success) {
                // Update bet status to confirmed
                this.pendingTransactions.set(betId, {
                    amount: this.betAmount,
                    timestamp: Date.now(),
                    status: 'confirmed',
                    stage: 'confirmed',
                    roundId: window.crashGameClient.currentRound
                });
                
                // Move to active bets if we have round info
                if (window.crashGameClient.currentRound) {
                    this.activeBets.set(window.crashGameClient.currentRound, {
                        id: betId,
                        amount: this.betAmount,
                        timestamp: Date.now(),
                        roundId: window.crashGameClient.currentRound,
                        status: 'active',
                        multiplier: 1.00
                    });
                    
                    this.currentBet = this.activeBets.get(window.crashGameClient.currentRound);
                }
                
                this.showBetStatus();
                this.showNotification(`✅ Bet confirmed: ${this.betAmount.toFixed(4)} ETH`, 'success');
                this.updateActiveBetsDisplay();
                
                // Remove from pending after delay
                setTimeout(() => {
                    this.pendingTransactions.delete(betId);
                    this.updateActiveBetsDisplay();
                }, 3000);
                
            } else {
                // Update to failed status
                this.pendingTransactions.set(betId, {
                    ...this.pendingTransactions.get(betId),
                    status: 'failed',
                    stage: 'failed'
                });
                
                this.showNotification('❌ Transaction failed or rejected', 'error');
                this.updateActiveBetsDisplay();
                
                // Remove failed bet after delay
                setTimeout(() => {
                    this.pendingTransactions.delete(betId);
                    this.updateActiveBetsDisplay();
                }, 5000);
            }
        } catch (error) {
            console.error('❌ Bet placement error:', error);
            
            // Check if this was a user cancellation
            const isCancellation = error.message && (
                error.message.includes('User denied') || 
                error.message.includes('rejected') ||
                error.message.includes('cancelled') ||
                error.code === 4001
            );
            
            if (isCancellation) {
                console.log('🚫 User cancelled transaction:', betId);
                // Mark this transaction as cancelled to prevent respamming
                this.cancelledTransactions.add(betId);
                
                // Clean up the cancelled transaction immediately
                this.pendingTransactions.delete(betId);
                this.currentTxId = null;
                
                this.showNotification('❌ Transaction cancelled by user', 'warning');
                this.updateActiveBetsDisplay();
                
                // Clear cancellation after 30 seconds (prevents permanent blocking)
                setTimeout(() => {
                    this.cancelledTransactions.delete(betId);
                    console.log('🔄 Cleared cancellation flag for:', betId);
                }, 30000);
                
            } else {
                // Handle other errors normally
                if (this.pendingTransactions.has(betId)) {
                    this.pendingTransactions.set(betId, {
                        ...this.pendingTransactions.get(betId),
                        status: 'error',
                        stage: 'error',
                        error: error.message
                    });
                }
                
                this.showNotification('❌ Error placing bet: ' + error.message, 'error');
                this.updateActiveBetsDisplay();
                
                // Remove failed bet after delay
                setTimeout(() => {
                    this.pendingTransactions.delete(betId);
                    this.updateActiveBetsDisplay();
                }, 5000);
            }
            
        } finally {
            this.isPlacingBet = false;
            this.currentTxId = null; // Clear current transaction
            this.updatePlaceBetButton();
            this.validateBetAmount();
        }
    }

    /**
     * 🚫 Cancel current transaction and clear MetaMask spam
     */
    cancelCurrentTransaction() {
        if (this.currentTxId) {
            console.log('🚫 Manually cancelling current transaction:', this.currentTxId);
            
            // Mark as cancelled
            this.cancelledTransactions.add(this.currentTxId);
            
            // Clear pending transaction
            this.pendingTransactions.delete(this.currentTxId);
            
            // Reset betting state
            this.isPlacingBet = false;
            this.currentTxId = null;
            
            // Update UI
            this.updatePlaceBetButton();
            this.updateActiveBetsDisplay();
            
            // Show notification
            this.showNotification('🚫 Current transaction cancelled', 'warning');
            
            console.log('✅ Transaction cancelled and state cleared');
            return true;
        }
        
        console.log('⚠️ No current transaction to cancel');
        return false;
    }

    /**
     * 🧹 Clear all cancelled transactions (reset spam protection)
     */
    clearCancelledTransactions() {
        const count = this.cancelledTransactions.size;
        this.cancelledTransactions.clear();
        console.log(`🧹 Cleared ${count} cancelled transaction flags`);
        this.showNotification(`🧹 Cleared ${count} cancelled transactions`, 'info');
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
     * 🔄 Update place bet button and cancel button visibility
     */
    updatePlaceBetButton(text = null) {
        const placeBetBtn = document.getElementById('placeBetBtn');
        const cancelBetBtn = document.getElementById('cancelBetBtn');
        
        if (placeBetBtn) {
            if (text) {
                placeBetBtn.textContent = text;
                placeBetBtn.disabled = this.isPlacingBet;
            } else {
                if (this.isPlacingBet) {
                    placeBetBtn.textContent = '🔄 PLACING BET...';
                    placeBetBtn.disabled = true;
                } else {
                    placeBetBtn.textContent = '🎯 PLACE BET';
                    placeBetBtn.disabled = false;
                }
            }
        }
        
        // Show/hide cancel button based on transaction state
        if (cancelBetBtn) {
            if (this.isPlacingBet && this.currentTxId) {
                cancelBetBtn.style.display = 'inline-block';
            } else {
                cancelBetBtn.style.display = 'none';
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

    /**
     * 📊 Update active bets display with visual feedback
     */
    updateActiveBetsDisplay() {
        // Find or create the bets display container
        let betsContainer = document.getElementById('activeBetsContainer');
        if (!betsContainer) {
            // Create the container if it doesn't exist
            const betStatus = document.getElementById('betStatus');
            if (betStatus) {
                betsContainer = document.createElement('div');
                betsContainer.id = 'activeBetsContainer';
                betsContainer.className = 'active-bets-container';
                betStatus.appendChild(betsContainer);
            } else {
                return; // No place to show the bets
            }
        }

        // Clear existing content
        betsContainer.innerHTML = '';

        // Show pending transactions
        if (this.pendingTransactions.size > 0) {
            const pendingSection = document.createElement('div');
            pendingSection.className = 'pending-bets-section';
            pendingSection.innerHTML = '<div class="bets-section-title">⏳ Pending Transactions</div>';
            
            this.pendingTransactions.forEach((bet, betId) => {
                const betElement = document.createElement('div');
                betElement.className = `bet-item pending-bet ${bet.status}`;
                
                let statusIcon = '⏳';
                let statusText = 'Pending';
                
                switch (bet.stage) {
                    case 'sending':
                        statusIcon = '📤';
                        statusText = 'Sending to MetaMask...';
                        break;
                    case 'confirmed':
                        statusIcon = '✅';
                        statusText = 'Transaction Confirmed!';
                        break;
                    case 'failed':
                        statusIcon = '❌';
                        statusText = 'Transaction Failed';
                        break;
                    case 'error':
                        statusIcon = '🚨';
                        statusText = 'Transaction Error';
                        break;
                }
                
                betElement.innerHTML = `
                    <div class="bet-item-header">
                        <span class="bet-status-icon">${statusIcon}</span>
                        <span class="bet-amount">${bet.amount.toFixed(4)} ETH</span>
                    </div>
                    <div class="bet-item-status">${statusText}</div>
                    ${bet.error ? `<div class="bet-item-error">${bet.error}</div>` : ''}
                `;
                
                pendingSection.appendChild(betElement);
            });
            
            betsContainer.appendChild(pendingSection);
        }

        // Show active bets
        if (this.activeBets.size > 0) {
            const activeSection = document.createElement('div');
            activeSection.className = 'active-bets-section';
            activeSection.innerHTML = '<div class="bets-section-title">🎯 Active Bets</div>';
            
            this.activeBets.forEach((bet, roundId) => {
                const betElement = document.createElement('div');
                betElement.className = 'bet-item active-bet';
                
                const currentMultiplier = this.getCurrentMultiplier();
                const potentialWin = (bet.amount * currentMultiplier).toFixed(4);
                
                betElement.innerHTML = `
                    <div class="bet-item-header">
                        <span class="bet-status-icon">🎯</span>
                        <span class="bet-amount">${bet.amount.toFixed(4)} ETH</span>
                    </div>
                    <div class="bet-item-details">
                        <div class="bet-multiplier">@ ${currentMultiplier.toFixed(2)}x</div>
                        <div class="bet-potential-win">Potential: ${potentialWin} ETH</div>
                    </div>
                `;
                
                activeSection.appendChild(betElement);
            });
            
            betsContainer.appendChild(activeSection);
        }

        // Show empty state if no bets
        if (this.pendingTransactions.size === 0 && this.activeBets.size === 0) {
            betsContainer.innerHTML = `
                <div class="no-bets-message">
                    <span class="no-bets-icon">🎲</span>
                    <div class="no-bets-text">No active bets</div>
                </div>
            `;
        }

        // Update main bet status display
        const betStatusElement = document.getElementById('betStatus');
        if (betStatusElement) {
            if (this.pendingTransactions.size > 0 || this.activeBets.size > 0) {
                betStatusElement.style.display = 'block';
            }
        }
    }

    /**
     * 🎯 Get current multiplier for display
     */
    getCurrentMultiplier() {
        // Try to get from the main system's multiplier display
        const multiplierElement = document.getElementById('multiplier');
        if (multiplierElement) {
            const text = multiplierElement.textContent || '1.00x';
            const match = text.match(/(\d+\.?\d*)x/);
            if (match) {
                return parseFloat(match[1]);
            }
        }
        return 1.00;
    }

    /**
     * 🏆 Handle round end - update bet results
     */
    onRoundEnd(crashPoint) {
        this.activeBets.forEach((bet, roundId) => {
            if (bet.multiplier <= crashPoint) {
                // Bet won
                const winAmount = bet.amount * bet.multiplier;
                this.showNotification(`🏆 Won ${winAmount.toFixed(4)} ETH!`, 'success');
            } else {
                // Bet lost
                this.showNotification(`💸 Lost ${bet.amount.toFixed(4)} ETH`, 'error');
            }
        });

        // Clear active bets for next round
        this.activeBets.clear();
        this.currentBet = null;
        this.updateActiveBetsDisplay();
    }

    /**
     * 🔄 Handle new round start
     */
    onRoundStart() {
        // Clear any old data and prepare for new round
        this.updateActiveBetsDisplay();
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
