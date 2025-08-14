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
        
        // Balance system
        this.userBalance = 0;
        this.bettingMode = 'transaction'; // 'transaction' or 'balance'
        this.balanceInitialized = false;
        
        this.init();
    }

    /**
     * 🚀 Initialize bet interface
     */
    async init() {
        console.log('🎯 Initializing bet interface...');
        this.setupEventListeners();
        this.updateBetDisplay();
        
        // Initialize balance system when wallet connects
        if (window.ethereum?.selectedAddress || window.realWeb3Modal?.address) {
            console.log('🔗 Wallet detected, initializing balance system...');
            await this.initializeBalance();
        } else {
            console.log('⚠️ No wallet detected yet, waiting for connection...');
            // Show balance UI anyway for testing
            setTimeout(() => {
                if (!this.balanceInitialized) {
                    console.log('🧪 Creating balance UI for testing (no wallet)');
                    this.createBalanceUI();
                }
            }, 2000);
        }
        
        // Listen for wallet connection events
        window.addEventListener('walletConnected', async () => {
            console.log('🔗 Wallet connected event received!');
            await this.initializeBalance();
        });

        // Listen for balance winnings from socket
        if (window.crashGameClient?.socket) {
            window.crashGameClient.socket.on('balanceWinnings', (data) => {
                console.log('🎉 Balance winnings received:', data);
                this.addWinnings(data.winnings);
            });
        }
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

        // Mode toggle button
        const modeToggleBtn = document.getElementById('bettingModeToggle');
        if (modeToggleBtn) {
            modeToggleBtn.addEventListener('click', () => {
                this.toggleBettingMode();
            });
        }

        // Deposit button
        const depositBtn = document.getElementById('depositBtn');
        if (depositBtn) {
            depositBtn.addEventListener('click', () => {
                this.showDepositModal();
            });
        }

        // Withdraw button
        const withdrawBtn = document.getElementById('withdrawBtn');
        if (withdrawBtn) {
            withdrawBtn.addEventListener('click', () => {
                this.showWithdrawModal();
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

        // Check betting mode and use appropriate method
        if (this.balanceInitialized && this.bettingMode === 'balance') {
            return await this.placeBetWithBalance(this.betAmount);
        }

        // Check if crash client is available and connected for transaction betting
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

        // Prevent multiple simultaneous transactions
        if (this.isPlacingBet || this.currentTxId) {
            console.log('🚫 Transaction already in progress, preventing duplicate');
            this.showNotification('⏳ Transaction already in progress...', 'warning');
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

            // Check if this was an Internal JSON-RPC error (network issue)
            const isRpcError = error.message && (
                error.message.includes('Internal JSON-RPC error') ||
                error.code === -32603
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
                
            } else if (isRpcError) {
                console.log('🚫 RPC error detected - network issue:', betId);
                
                // Clean up the failed transaction immediately
                this.pendingTransactions.delete(betId);
                this.currentTxId = null;
                
                this.showNotification('❌ Network error - try refreshing the page', 'error');
                this.updateActiveBetsDisplay();
                
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
        // Check for active bet in either bet interface or crash client
        const hasActiveBet = this.currentBet || (window.crashGameClient && window.crashGameClient.playerBet && !window.crashGameClient.playerBet.cashedOut);
        
        if (!hasActiveBet || !window.crashGameClient) {
            console.log('🚫 No active bet to cash out or crash client not available');
            this.showNotification('❌ No active bet to cash out', 'error');
            return;
        }

        try {
            console.log('🏃‍♂️ Cashing out bet via crash client...');
            window.crashGameClient.cashOut();
            
            // Hide cash out button
            const cashOutBtn = document.getElementById('cashOutBtn');
            if (cashOutBtn) {
                cashOutBtn.style.display = 'none';
            }
            
            // Clear current bet
            this.currentBet = null;
            
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
                
                // Show cash out button if player has bet (check both currentBet and crash client's playerBet)
                const hasActiveBet = this.currentBet || (window.crashGameClient && window.crashGameClient.playerBet && !window.crashGameClient.playerBet.cashedOut);
                if (cashOutBtn && hasActiveBet) {
                    cashOutBtn.style.display = 'block';
                    console.log('💰 Cash out button displayed - running state with active bet');
                } else {
                    console.log('🚫 No cash out button - no active bet found');
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
                
                // CRITICAL: Clear current bet immediately when round crashes
                if (this.currentBet) {
                    console.log('🧹 Clearing bet interface currentBet - round crashed');
                    this.currentBet = null;
                }
                
                // Clear UI after a delay
                setTimeout(() => {
                    this.hideBetStatus();
                    this.validateBetAmount();
                }, 3000);
                break;
                
            case 'betting':
                // New betting phase - reset for new round
                if (placeBetBtn) {
                    placeBetBtn.disabled = false;
                    placeBetBtn.textContent = '🎯 PLACE BET';
                }
                if (cashOutBtn) {
                    cashOutBtn.style.display = 'none';
                }
                
                // Clear any lingering bet state
                if (this.currentBet) {
                    console.log('🧹 Clearing bet interface currentBet - new betting phase');
                    this.currentBet = null;
                }
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

    /**
     * 🏦 Initialize balance system
     */
    async initializeBalance() {
        if (this.balanceInitialized) return;
        
        const walletAddress = window.ethereum?.selectedAddress || window.realWeb3Modal?.address;
        if (!walletAddress) {
            console.warn('No wallet connected for balance initialization');
            return;
        }

        try {
            console.log('🏦 Initializing balance system for:', walletAddress);
            
            // Load current balance
            const response = await fetch(`/api/balance/${walletAddress}`);
            if (response.ok) {
                const data = await response.json();
                this.userBalance = parseFloat(data.balance || 0);
                console.log(`💰 Loaded balance: ${this.userBalance} ETH`);
            } else {
                this.userBalance = 0;
                console.log('💰 No existing balance found, starting with 0');
            }

            this.balanceInitialized = true;
            this.updateBalanceDisplay();
            this.createBalanceUI();
            this.startBalanceMonitoring();
            
        } catch (error) {
            console.error('❌ Failed to initialize balance:', error);
            this.userBalance = 0;
        }
    }

    /**
     * 🎯 Toggle between transaction and balance betting modes
     */
    toggleBettingMode() {
        if (!this.balanceInitialized) {
            this.showNotification('Balance system not available', 'error');
            return;
        }

        this.bettingMode = this.bettingMode === 'transaction' ? 'balance' : 'transaction';
        this.updateBettingModeDisplay();
        this.updateBetDisplay();
        
        const mode = this.bettingMode === 'balance' ? 'Balance' : 'Transaction';
        this.showNotification(`🔄 Switched to ${mode} mode`, 'info');
    }

    /**
     * 💸 Place bet using balance
     */
    async placeBetWithBalance(amount) {
        if (this.userBalance < amount) {
            throw new Error(`Insufficient balance. You have ${this.userBalance.toFixed(4)} ETH, need ${amount} ETH`);
        }

        const walletAddress = window.ethereum?.selectedAddress || window.realWeb3Modal?.address;
        
        // Optimistically update balance
        const originalBalance = this.userBalance;
        this.userBalance -= amount;
        this.updateBalanceDisplay();

        try {
            const response = await fetch('/api/bet/balance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    playerAddress: walletAddress,
                    amount: amount
                })
            });

            if (!response.ok) {
                throw new Error('Balance bet failed');
            }

            const result = await response.json();
            console.log(`💰 Balance bet placed: ${amount} ETH (remaining: ${this.userBalance.toFixed(4)} ETH)`);
            
            // Emit bet event for crash client
            if (window.crashGameClient && window.crashGameClient.socket) {
                window.crashGameClient.socket.emit('place_bet', {
                    betAmount: amount,
                    playerAddress: walletAddress,
                    useBalance: true
                });
            }
            
            return result;

        } catch (error) {
            // Revert balance on error
            this.userBalance = originalBalance;
            this.updateBalanceDisplay();
            throw error;
        }
    }

    /**
     * 💰 Add winnings to balance
     */
    addWinnings(amount) {
        this.userBalance += amount;
        this.updateBalanceDisplay();
        this.showNotification(`🎉 +${amount.toFixed(4)} ETH added to balance!`, 'success');
    }

    /**
     * 📊 Update balance display
     */
    updateBalanceDisplay() {
        const balanceElement = document.getElementById('userBalance');
        if (balanceElement) {
            balanceElement.textContent = `${this.userBalance.toFixed(4)} ETH`;
        }

        const balanceSection = document.getElementById('balanceSection');
        if (balanceSection) {
            balanceSection.style.display = this.balanceInitialized ? 'block' : 'none';
        }
    }

    /**
     * 🎨 Update betting mode display
     */
    updateBettingModeDisplay() {
        const modeToggle = document.getElementById('bettingModeToggle');
        if (modeToggle) {
            const isBalance = this.bettingMode === 'balance';
            modeToggle.textContent = isBalance ? '🏦 Balance Mode' : '💳 Transaction Mode';
            modeToggle.classList.toggle('balance-mode', isBalance);
        }

        const placeBetBtn = document.getElementById('placeBetBtn');
        if (placeBetBtn) {
            const isBalance = this.bettingMode === 'balance';
            placeBetBtn.textContent = isBalance ? '🚀 Bet (Balance)' : '💳 Bet (Transaction)';
        }
    }

    /**
     * 🏗️ Create balance UI elements
     */
    createBalanceUI() {
        // Check if balance section already exists
        if (document.getElementById('balanceSection')) return;

        const betInterface = document.querySelector('.betting-panel');
        if (!betInterface) {
            console.error('❌ .betting-panel not found! Available elements:', document.querySelectorAll('[class*="bet"]'));
            return;
        }
        console.log('✅ Found betting panel:', betInterface);

        const balanceHTML = `
            <div id="balanceSection" class="balance-section">
                <div class="balance-header">
                    <h3>💰 Game Balance</h3>
                    <div id="userBalance" class="balance-amount">${this.userBalance.toFixed(4)} ETH</div>
                </div>
                
                <div class="balance-controls">
                    <button id="bettingModeToggle" class="mode-toggle-btn">
                        ${this.bettingMode === 'balance' ? '🏦 Balance Mode' : '💳 Transaction Mode'}
                    </button>
                    
                    <div class="balance-actions">
                        <button id="depositBtn" class="balance-btn deposit-btn">💳 Deposit</button>
                        <button id="withdrawBtn" class="balance-btn withdraw-btn">💸 Withdraw</button>
                    </div>
                </div>
                
                <div class="balance-info">
                    <div class="balance-mode-info">
                        ${this.bettingMode === 'balance' 
                            ? '⚡ Instant betting from balance' 
                            : '🔗 Direct wallet transactions'}
                    </div>
                </div>
            </div>
        `;

        // Insert balance section at the top of betting panel
        const betInputSection = betInterface.querySelector('.bet-input-section');
        if (betInputSection) {
            console.log('✅ Inserting balance UI before bet input section');
            betInputSection.insertAdjacentHTML('beforebegin', balanceHTML);
        } else {
            console.log('⚠️ .bet-input-section not found, inserting at beginning of betting panel');
            betInterface.insertAdjacentHTML('afterbegin', balanceHTML);
        }

        // Add event listeners for new elements
        this.setupBalanceEventListeners();
    }

    /**
     * 🔌 Setup balance-specific event listeners
     */
    setupBalanceEventListeners() {
        const modeToggleBtn = document.getElementById('bettingModeToggle');
        if (modeToggleBtn) {
            modeToggleBtn.addEventListener('click', () => {
                this.toggleBettingMode();
            });
        }

        const depositBtn = document.getElementById('depositBtn');
        if (depositBtn) {
            depositBtn.addEventListener('click', () => {
                this.showDepositModal();
            });
        }

        const withdrawBtn = document.getElementById('withdrawBtn');
        if (withdrawBtn) {
            withdrawBtn.addEventListener('click', () => {
                this.showWithdrawModal();
            });
        }
    }

    /**
     * 🏦 Show deposit modal
     */
    showDepositModal() {
        const walletAddress = window.ethereum?.selectedAddress || window.realWeb3Modal?.address;
        const houseWallet = '0x1f8B1c4D05eF17Ebaa1E572426110146691e6C5a';
        const memo = walletAddress.slice(-8);

        const modalHTML = `
            <div id="depositModal" class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>🏦 Deposit to Game Balance</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    
                    <div class="deposit-instructions">
                        <div class="instruction-step">
                            <h4>1. Send ETH to House Wallet:</h4>
                            <div class="address-box">
                                <code>${houseWallet}</code>
                                <button class="copy-btn" data-copy="${houseWallet}">📋 Copy</button>
                            </div>
                        </div>
                        
                        <div class="instruction-step">
                            <h4>2. Include this memo for attribution:</h4>
                            <div class="memo-box">
                                <code>${memo}</code>
                                <button class="copy-btn" data-copy="${memo}">📋 Copy</button>
                            </div>
                        </div>
                        
                        <div class="deposit-benefits">
                            <h4>✨ Benefits:</h4>
                            <ul>
                                <li>⚡ Instant betting (no transaction delays)</li>
                                <li>💸 Lower gas costs</li>
                                <li>🚀 Seamless gaming experience</li>
                            </ul>
                        </div>
                        
                        <div class="deposit-note">
                            <p>💡 Funds will be credited automatically once confirmed on-chain</p>
                            <p>⏱️ Usually takes 1-2 minutes</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.setupModalHandlers('depositModal');
    }

    /**
     * 💸 Show withdraw modal
     */
    showWithdrawModal() {
        const modalHTML = `
            <div id="withdrawModal" class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>💸 Withdraw from Balance</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    
                    <div class="withdraw-form">
                        <div class="current-balance">
                            <p>Current Balance: <strong>${this.userBalance.toFixed(4)} ETH</strong></p>
                        </div>
                        
                        <div class="form-group">
                            <label>Amount to Withdraw:</label>
                            <input type="number" id="withdrawAmount" min="0.001" max="${this.userBalance}" step="0.001" placeholder="0.001">
                            <div class="quick-amounts">
                                <button class="quick-amount" data-percent="25">25%</button>
                                <button class="quick-amount" data-percent="50">50%</button>
                                <button class="quick-amount" data-percent="75">75%</button>
                                <button class="quick-amount" data-percent="100">All</button>
                            </div>
                        </div>
                        
                        <div class="withdraw-note">
                            <p>💡 Funds will be sent to your connected wallet</p>
                            <p>⏱️ Usually processed within 1-2 minutes</p>
                        </div>
                        
                        <button id="confirmWithdraw" class="confirm-btn">💸 Confirm Withdrawal</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.setupModalHandlers('withdrawModal');
        this.setupWithdrawHandlers();
    }

    /**
     * 🔧 Setup modal handlers
     */
    setupModalHandlers(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        // Close button
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.remove();
            });
        }

        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        // Copy buttons
        modal.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const textToCopy = btn.dataset.copy;
                navigator.clipboard.writeText(textToCopy);
                btn.textContent = '✅ Copied!';
                setTimeout(() => {
                    btn.textContent = '📋 Copy';
                }, 2000);
            });
        });
    }

    /**
     * 🔧 Setup withdraw-specific handlers
     */
    setupWithdrawHandlers() {
        const withdrawInput = document.getElementById('withdrawAmount');
        const confirmBtn = document.getElementById('confirmWithdraw');

        // Quick amount buttons
        document.querySelectorAll('.quick-amount').forEach(btn => {
            btn.addEventListener('click', () => {
                const percent = parseFloat(btn.dataset.percent) / 100;
                const amount = this.userBalance * percent;
                withdrawInput.value = amount.toFixed(4);
            });
        });

        // Confirm withdrawal
        if (confirmBtn) {
            confirmBtn.addEventListener('click', async () => {
                const amount = parseFloat(withdrawInput.value);
                if (!amount || amount <= 0 || amount > this.userBalance) {
                    this.showNotification('Invalid withdrawal amount', 'error');
                    return;
                }

                confirmBtn.disabled = true;
                confirmBtn.textContent = '⏳ Processing...';

                try {
                    await this.processWithdrawal(amount);
                    document.getElementById('withdrawModal').remove();
                } catch (error) {
                    this.showNotification(`Withdrawal failed: ${error.message}`, 'error');
                } finally {
                    confirmBtn.disabled = false;
                    confirmBtn.textContent = '💸 Confirm Withdrawal';
                }
            });
        }
    }

    /**
     * 💸 Process withdrawal
     */
    async processWithdrawal(amount) {
        const walletAddress = window.ethereum?.selectedAddress || window.realWeb3Modal?.address;

        const response = await fetch('/api/withdraw', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                playerAddress: walletAddress,
                amount: amount
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Withdrawal failed');
        }

        const result = await response.json();
        this.userBalance -= amount;
        this.updateBalanceDisplay();
        
        this.showNotification(`💸 Withdrawal of ${amount} ETH initiated! Tx: ${result.txHash}`, 'success');
        return result;
    }

    /**
     * 👀 Start monitoring for balance changes
     */
    startBalanceMonitoring() {
        const walletAddress = window.ethereum?.selectedAddress || window.realWeb3Modal?.address;
        if (!walletAddress) return;

        // Check for deposits every 30 seconds
        setInterval(async () => {
            try {
                const response = await fetch(`/api/deposits/check/${walletAddress}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.newDeposits && data.newDeposits.length > 0) {
                        for (const deposit of data.newDeposits) {
                            this.userBalance += parseFloat(deposit.amount);
                            this.showNotification(`💰 Deposit confirmed: ${deposit.amount} ETH!`, 'success');
                        }
                        this.updateBalanceDisplay();
                    }
                }
            } catch (error) {
                console.warn('Could not check for deposits:', error);
            }
        }, 30000);
    }

    /**
     * 🔄 Update balance when called from external systems
     */
    onBalanceUpdate(newBalance) {
        this.userBalance = newBalance;
        this.updateBalanceDisplay();
    }
}

// Global instance
window.BetInterface = BetInterface;

// Debug function to manually show balance UI
window.showBalanceUI = function() {
    console.log('🧪 Manually showing balance UI...');
    if (window.betInterface) {
        window.betInterface.createBalanceUI();
        window.betInterface.updateBalanceDisplay();
        console.log('✅ Balance UI created!');
    } else {
        console.error('❌ betInterface not found');
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.betInterface = new BetInterface();
    });
} else {
    window.betInterface = new BetInterface();
}
