/**
 * 🎯 Bet Interface for PacoRocko Crash Casino - Balance Only
 * 
 * Simplified betting interface using only balance-based betting
 */

class BetInterface {
    constructor() {
        this.betAmount = 0.001; // Default bet amount (reduced to accommodate low balances)
        this.isPlacingBet = false;
        this.currentBet = null;
        
        // Balance system only
        this.userBalance = 0;
        this.balanceInitialized = false;
        
        // Orders tracking
        this.activeOrders = new Map(); // Track active orders
        
        this.init();
    }

    /**
     * 🚀 Initialize bet interface (ENHANCED with persistent UI)
     */
    async init() {
        console.log('🎯 Initializing bet interface (balance-only)...');
        this.setupEventListeners();
        this.updateBetDisplay();
        
        // Always show balance UI immediately for consistency
        setTimeout(() => {
            console.log('🏦 Always showing balance UI for consistency');
            this.createBalanceUI();
        }, 500);
        
        // Initialize balance system when wallet is detected
        if (window.ethereum?.selectedAddress || window.realWeb3Modal?.address) {
            console.log('🔗 Wallet detected, initializing balance system...');
            await this.initializeBalance();
        } else {
            console.log('⚠️ No wallet detected yet, waiting for connection...');
        }
        
        // Listen for wallet connection events
        document.addEventListener('walletConnected', async (event) => {
            console.log('🔗 Wallet connected event received!');
            
            // Initialize balance system but keep same UI
            await this.initializeBalance();
            
            // Refresh UI content but keep same design
            this.updateBalanceDisplay();
        });

        // Listen for socket events
        if (window.crashGameClient?.socket) {
            // Handle both success events with comprehensive processing
            window.crashGameClient.socket.on('balanceWinnings', (data) => {
                console.log('💰 Balance winnings received from server:', data);
                console.log('🎊 Triggering celebration for balance winnings');
                this.handleSuccessfulCashout(data);
            });

            window.crashGameClient.socket.on('cashoutSuccess', (data) => {
                console.log('💰 Cashout success received:', data);
                console.log('🎊 Triggering celebration for cashout success');
                this.handleSuccessfulCashout(data);
            });

            window.crashGameClient.socket.on('stop_multiplier_count', (data) => {
                console.log('💥 Round crashed:', data);
                this.handleCrashEvent({ crashPoint: parseFloat(data) });
            });

            window.crashGameClient.socket.on('start_betting_phase', () => {
                console.log('🧹 New round started, clearing active orders for fresh start');
                this.clearActiveOrders();
                this.updateOrdersDisplay();
            });

            // Handle bet queue events
            window.crashGameClient.socket.on('betQueued', (data) => {
                console.log('🕐 Bet queued for next round:', data);
                this.showNotification(`🕐 Bet queued for next round: ${data.queuedBet.betAmount} ETH`, 'info', 3000);
                this.addQueuedOrder(data.queuedBet);
            });

            window.crashGameClient.socket.on('queuedBetProcessed', (data) => {
                console.log('✅ Queued bet processed:', data);
                this.showNotification(`✅ Queued bet placed: ${data.betInfo.bet_amount} ETH`, 'success', 2000);
                this.updateQueuedOrderToActive(data.playerId, data.betInfo);
                
                // CRITICAL: Update crash client playerBet state for cashout functionality
                if (window.crashGameClient && data.playerId === (window.ethereum?.selectedAddress || window.realWeb3Modal?.address)) {
                    window.crashGameClient.playerBet = {
                        amount: data.betInfo.bet_amount,
                        cashedOut: false,
                        playerAddress: data.playerId,
                        useBalance: true,
                        timestamp: Date.now(),
                        fromQueue: true
                    };
                    console.log('✅ Updated crash client playerBet state from queued bet:', window.crashGameClient.playerBet);
                }
            });

            window.crashGameClient.socket.on('queuedBetFailed', (data) => {
                console.log('❌ Queued bet failed:', data);
                this.showNotification(`❌ Queued bet failed: ${data.error}`, 'error', 5000);
                this.removeQueuedOrder(data.playerId);
            });

            // Listen for errors
            window.crashGameClient.socket.on('error', (data) => {
                console.error('❌ Socket error received:', data);
                console.error('❌ Error details:', JSON.stringify(data, null, 2));
                console.error('❌ Error message:', data?.message);
                console.error('❌ Full error object:', data);
                this.showNotification(`❌ Cashout Error: ${data?.message || 'Unknown error'}`, 'error');
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
        this.betAmount = Math.max(0.001, Math.min(amount, 1)); // Min 0.001, Max 1 ETH
        
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
        const isValid = this.betAmount >= 0.001 && this.betAmount <= 1;
        
        if (placeBetBtn) {
            placeBetBtn.disabled = !isValid || this.isPlacingBet || !this.balanceInitialized;
        }
        
        return isValid;
    }

    /**
     * 📊 Update bet display
     */
    updateBetDisplay() {
        // Update max win calculation if needed
        const maxWin = (this.betAmount * 50).toFixed(4); // Example 50x max
        
        // Update any display elements
        this.validateBetAmount();
    }

    /**
     * 🎯 Place bet (balance only)
     */
    async placeBet() {
        if (!this.validateBetAmount() || this.isPlacingBet) {
            return;
        }

        // Only use balance betting - no more transaction mode
        if (!this.balanceInitialized) {
            this.showNotification('❌ Please deposit funds to your game balance first', 'error');
            return;
        }

        // CRITICAL: Force balance refresh before betting to ensure accuracy
        console.log('🔄 Force refreshing balance before bet to ensure accuracy...');
        await this.refreshBalance();
        
        // CRITICAL: Log current balance state before validation
        console.log(`🔍 BALANCE DEBUG - Current userBalance: ${this.userBalance.toFixed(6)} ETH`);
        console.log(`🔍 BALANCE DEBUG - Requested bet amount: ${this.betAmount.toFixed(6)} ETH`);
        console.log(`🔍 BALANCE DEBUG - Balance sufficient: ${this.userBalance >= this.betAmount}`);
        
        if (this.userBalance < this.betAmount) {
            this.showNotification(`❌ Insufficient balance. You have ${this.userBalance.toFixed(4)} ETH, need ${this.betAmount.toFixed(4)} ETH`, 'error');
            
            // Auto-adjust bet amount to maximum possible
            if (this.userBalance >= 0.001) {
                const maxBet = Math.floor(this.userBalance * 1000) / 1000; // Round down to 3 decimals
                this.setBetAmount(maxBet);
                this.showNotification(`💡 Bet amount adjusted to ${maxBet.toFixed(4)} ETH (your max)`, 'info');
            }
            return;
        }

        try {
            this.isPlacingBet = true;
            this.updatePlaceBetButton('🔄 PLACING BET...');
            
            await this.placeBetWithBalance(this.betAmount);
            
            this.showNotification(`✅ Bet placed: ${this.betAmount.toFixed(4)} ETH`, 'success');
            
        } catch (error) {
            console.error('❌ Bet error:', error);
            this.showNotification(`❌ Bet failed: ${error.message}`, 'error');
        } finally {
            this.isPlacingBet = false;
            this.updatePlaceBetButton('🎯 PLACE BET');
        }
    }

    /**
     * 💸 Place bet using balance
     */
    async placeBetWithBalance(amount) {
        console.log('🔍 Using original balance system for bet placement');
        
        // CRITICAL: Always refresh balance before attempting to bet
        try {
            await this.refreshBalance();
        } catch (error) {
            console.warn('⚠️ Balance refresh failed, using cached balance:', error);
        }
        
        if (this.userBalance < amount) {
            throw new Error(`Insufficient balance. You have ${this.userBalance.toFixed(4)} ETH, need ${amount.toFixed(4)} ETH`);
        }

        const walletAddress = window.ethereum?.selectedAddress || window.realWeb3Modal?.address;
        
        // Optimistically update balance
        const originalBalance = this.userBalance;
        this.userBalance -= amount;
        this.updateBalanceDisplay();

        // Add bet to orders display immediately
        const betId = `bet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const playerName = walletAddress ? `${walletAddress.slice(0,6)}...${walletAddress.slice(-4)}` : 'You';
        
        this.addBetToOrders({
            id: betId,
            player: playerName,
            playerAddress: walletAddress,
            amount: amount,
            status: 'placing',
            timestamp: Date.now(),
            isYou: true
        });

        try {
            console.log(`🎯 Attempting balance bet: ${amount} ETH (have: ${this.userBalance.toFixed(6)} ETH)`);
            
            // Pre-validate balance locally
            if (this.userBalance < amount) {
                throw new Error(`Insufficient balance. You have ${this.userBalance.toFixed(4)} ETH, need ${amount.toFixed(4)} ETH`);
            }
            
            const response = await fetch('https://paco-x57j.onrender.com/api/bet/balance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    playerAddress: walletAddress,
                    amount: amount
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Server response:', response.status, errorText);
                throw new Error(`Balance bet failed: ${errorText || 'Server error'}`);
            }

            const result = await response.json();
            console.log(`💰 Balance bet placed: ${amount} ETH (remaining: ${this.userBalance.toFixed(4)} ETH)`);
            
            // Update bet status in orders to active
            this.updateBetInOrders(betId, { status: 'active' });
            
            // CRITICAL: Set playerBet state in crash client for cashout functionality
            if (window.crashGameClient) {
                window.crashGameClient.playerBet = {
                    amount: amount,
                    cashedOut: false,
                    playerAddress: walletAddress,
                    useBalance: true,
                    timestamp: Date.now()
                };
                console.log('✅ Player bet state set in crash client for cashout functionality');
                
                // Show cashout button if round is running
                if (window.crashGameClient.gameState === 'running') {
                    const cashOutBtn = document.getElementById('cashOutBtn');
                    if (cashOutBtn) {
                        cashOutBtn.style.display = 'block';
                        console.log('💰 Cash out button shown - balance bet placed during running round');
                    }
                }
                
                // Emit bet event for server tracking
                if (window.crashGameClient.socket) {
                    console.log('🎯 Emitting place_bet event to server for balance bet');
                window.crashGameClient.socket.emit('place_bet', {
                        betAmount: amount,
                        playerAddress: walletAddress,
                        useBalance: true,
                        autoPayoutMultiplier: 2.0 // Default auto-cashout at 2x
                    });
                    console.log('✅ place_bet event emitted with data:', {
                    betAmount: amount,
                    playerAddress: walletAddress,
                    useBalance: true
                });
                } else {
                    console.error('❌ No socket connection available for bet registration');
                }
            }
            
            return result;

        } catch (error) {
            // Revert balance on error
            this.userBalance = originalBalance;
            this.updateBalanceDisplay();
            
            // Update bet status to failed
            this.updateBetInOrders(betId, { status: 'failed', error: error.message });
            
            throw error;
        }
    }

    /**
     * 🏃‍♂️ Cash out current bet
     */
    cashOut() {
        if (window.crashGameClient) {
            console.log('🏃 Initiating cashout via crash game client...');
            window.crashGameClient.cashOut();
            
            // Immediately hide the cashout button to prevent double-clicks
            const cashOutBtn = document.getElementById('cashOutBtn');
            if (cashOutBtn) {
                cashOutBtn.style.display = 'none';
                console.log('🚫 Cashout button hidden after click');
            }
        } else {
            this.showNotification('❌ Cannot cash out - game not connected', 'error');
        }
    }

    /**
     * 🎉 Handle cashout event from crash client (called by window.betInterface.onCashOut)
     */
    onCashOut(data) {
        console.log('🎉 onCashOut called from crash client:', data);
        this.handleSuccessfulCashout(data);
    }

    /**
     * 🎉 Handle successful cashout with visual feedback
     */
    handleSuccessfulCashout(data) {
        console.log('🎉 Processing successful cashout:', data);
        
        // Clear player bet state in crash client
        if (window.crashGameClient.playerBet) {
            window.crashGameClient.playerBet.cashedOut = true;
            window.crashGameClient.playerBet.multiplier = data.multiplier;
            window.crashGameClient.playerBet.payout = data.payout || data.winnings;
            console.log('✅ Player bet marked as cashed out');
        }
        
        // Calculate winnings
        const winnings = data.payout || data.winnings || (data.multiplier * (this.activeOrders.get('current')?.amount || 0));
        const multiplier = data.multiplier || 0;
        
        // Add winnings to balance
        if (winnings > 0) {
            this.addWinnings(winnings);
            console.log(`💰 Added ${winnings.toFixed(4)} ETH to balance`);
        }
        
        // Update orders to show cashed out
        this.handleCashoutEvent({
            playerId: window.ethereum?.selectedAddress || window.realWeb3Modal?.address,
            multiplier: multiplier,
            payout: winnings
        });
        
        // Show success notification with celebration
        this.showCashoutSuccess(multiplier, winnings);
        
        // Refresh balance display
        this.refreshBalance();
    }

    /**
     * 🎊 Show animated cashout success notification
     */
    showCashoutSuccess(multiplier, winnings) {
        const betAmount = this.activeOrders.get('current')?.amount || 0.001;
        const netResult = winnings - betAmount;
        const isProfit = netResult > 0;
        
        if (isProfit) {
            // Profitable cashout
            this.showNotification(
                `🎉 CASHED OUT! ${multiplier.toFixed(2)}x → +${netResult.toFixed(4)} ETH profit`, 
                'success', 
                5000
            );
        } else {
            // Loss cashout
            const lossAmount = Math.abs(netResult);
            const lossPercentage = (lossAmount / betAmount) * 100;
            this.showNotification(
                `⚠️ CASHED OUT! ${multiplier.toFixed(2)}x → -${lossAmount.toFixed(4)} ETH loss (${lossPercentage.toFixed(1)}%)`, 
                'warning', 
                5000
            );
        }
        
        // Create animated overlay (modified for losses)
        this.createCashoutCelebration(multiplier, winnings, isProfit);
        
        console.log(`🎊 Cashout: ${multiplier.toFixed(2)}x for ${winnings.toFixed(4)} ETH (${isProfit ? 'profit' : 'loss'})`);
    }

    /**
     * ✨ Create visual celebration for cashout
     */
    createCashoutCelebration(multiplier, winnings, isProfit = true) {
        const betAmount = this.activeOrders.get('current')?.amount || 0.001;
        const netResult = winnings - betAmount;
        
        // Create celebration overlay
        const celebration = document.createElement('div');
        celebration.className = 'cashout-celebration';
        
        if (isProfit) {
            celebration.innerHTML = `
                <div class="celebration-content">
                    <div class="celebration-icon">💰</div>
                    <div class="celebration-title">CASHED OUT!</div>
                    <div class="celebration-multiplier">${multiplier.toFixed(2)}x</div>
                    <div class="celebration-winnings">+${netResult.toFixed(4)} ETH profit</div>
                </div>
            `;
            // Profit colors - green gradient
            celebration.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 10000;
                background: linear-gradient(45deg, #10b981, #fbbf24);
                border-radius: 20px;
                padding: 30px;
                box-shadow: 0 20px 60px rgba(16, 185, 129, 0.4);
                animation: cashoutPop 3s ease-out forwards;
                pointer-events: none;
                text-align: center;
                color: white;
                font-family: var(--font-display, sans-serif);
            `;
        } else {
            const lossAmount = Math.abs(netResult);
            const lossPercentage = (lossAmount / betAmount) * 100;
            celebration.innerHTML = `
                <div class="celebration-content">
                    <div class="celebration-icon">⚠️</div>
                    <div class="celebration-title">CASHED OUT</div>
                    <div class="celebration-multiplier">${multiplier.toFixed(2)}x</div>
                    <div class="celebration-winnings">-${lossAmount.toFixed(4)} ETH loss (${lossPercentage.toFixed(1)}%)</div>
                </div>
            `;
            // Loss colors - red gradient
            celebration.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 10000;
                background: linear-gradient(45deg, #dc2626, #f59e0b);
                border-radius: 20px;
                padding: 30px;
                box-shadow: 0 20px 60px rgba(220, 38, 38, 0.4);
                animation: cashoutPop 3s ease-out forwards;
                pointer-events: none;
                text-align: center;
                color: white;
                font-family: var(--font-display, sans-serif);
            `;
        }
        
        // Add CSS animation
        if (!document.querySelector('#cashout-celebration-styles')) {
            const styles = document.createElement('style');
            styles.id = 'cashout-celebration-styles';
            styles.textContent = `
                @keyframes cashoutPop {
                    0% { 
                        opacity: 0; 
                        transform: translate(-50%, -50%) scale(0.5); 
                    }
                    20% { 
                        opacity: 1; 
                        transform: translate(-50%, -50%) scale(1.1); 
                    }
                    80% { 
                        opacity: 1; 
                        transform: translate(-50%, -50%) scale(1); 
                    }
                    100% { 
                        opacity: 0; 
                        transform: translate(-50%, -50%) scale(0.8); 
                    }
                }
                .celebration-icon { font-size: 48px; margin-bottom: 10px; }
                .celebration-title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
                .celebration-multiplier { font-size: 32px; font-weight: bold; color: #fbbf24; margin-bottom: 5px; }
                .celebration-winnings { font-size: 18px; opacity: 0.9; }
            `;
            document.head.appendChild(styles);
        }
        
        document.body.appendChild(celebration);
        
        // Remove after animation
        setTimeout(() => {
            if (celebration.parentNode) {
                celebration.parentNode.removeChild(celebration);
            }
        }, 3000);
    }

    /**
     * 🔧 Manually trigger deposit processing (debug)
     */
    async manualTriggerDeposit(txHash, fromAddress, amount) {
        try {
            console.log(`🔧 Manually triggering deposit processing: ${txHash}`);
            
            const response = await fetch('https://paco-x57j.onrender.com/api/deposits/force-process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ txHash, fromAddress, amount })
            });
            
            const result = await response.json();
            console.log('🔧 Manual deposit result:', result);
            
            if (result.success) {
                this.showNotification(`✅ Deposit manually processed! Balance updated.`, 'success');
                await this.refreshBalance();
            } else {
                this.showNotification(`⚠️ Manual processing: ${result.reason}`, 'warning');
            }
            
            return result;
        } catch (error) {
            console.error('Manual deposit trigger error:', error);
            this.showNotification(`❌ Manual processing failed: ${error.message}`, 'error');
        }
    }

    /**
     * 🔧 Manually trigger indexer (debug)
     */
    async manualTriggerIndexer() {
        try {
            console.log(`🔧 Manually triggering deposit indexer...`);
            
            const response = await fetch('https://paco-x57j.onrender.com/api/deposits/trigger-indexer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            const result = await response.json();
            console.log('🔧 Manual indexer result:', result);
            
            this.showNotification(`✅ Indexer triggered: ${result.blocksScanned} blocks scanned`, 'success');
            await this.refreshBalance();
            
            return result;
        } catch (error) {
            console.error('Manual indexer trigger error:', error);
            this.showNotification(`❌ Indexer trigger failed: ${error.message}`, 'error');
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
     * 🔄 Update place bet button
     */
    updatePlaceBetButton(text) {
        const placeBetBtn = document.getElementById('placeBetBtn');
        if (placeBetBtn) {
            placeBetBtn.textContent = text;
        }
    }

    /**
     * 🔔 Show notification
     */
    showNotification(message, type = 'info') {
        console.log(`💬 ${type.toUpperCase()}: ${message}`);
        
        // Create notification element
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 16px;
            border-radius: 6px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            max-width: 300px;
            word-wrap: break-word;
            backdrop-filter: blur(8px);
            ${type === 'success' ? 'background: rgba(34, 197, 94, 0.9);' : ''}
            ${type === 'error' ? 'background: rgba(239, 68, 68, 0.9);' : ''}
            ${type === 'warning' ? 'background: rgba(245, 158, 11, 0.9);' : ''}
            ${type === 'info' ? 'background: rgba(59, 130, 246, 0.9);' : ''}
        `;

        document.body.appendChild(notification);

        // Remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }

    // ===========================================
    // BALANCE SYSTEM METHODS
    // ===========================================

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
            const response = await fetch(`https://paco-x57j.onrender.com/api/balance/${walletAddress}`);
            if (response.ok) {
                const data = await response.json();
                this.userBalance = parseFloat(data.balance || 0);
                console.log(`💰 Loaded game balance: ${this.userBalance} ETH`);
            } else {
                this.userBalance = 0;
                console.log('💰 No existing game balance found, starting with 0');
            }

            this.balanceInitialized = true;
            this.updateBalanceDisplay();
            this.createBalanceUI();
            this.startBalanceMonitoring();
            
            // Show notification if user has game balance
            if (this.userBalance > 0) {
                this.showNotification(`💰 Game balance loaded: ${this.userBalance.toFixed(4)} ETH`, 'success');
            }
            
        } catch (error) {
            console.error('❌ Failed to initialize balance:', error);
            this.userBalance = 0;
        }
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

        // Update bet validation
        this.validateBetAmount();
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

        // Determine connection state for consistent UI
        const walletAddress = window.ethereum?.selectedAddress || window.realWeb3Modal?.address;
        const isConnected = !!walletAddress;
        const displayBalance = this.userBalance || 0;
        
        const balanceHTML = `
            <div id="balanceSection" class="balance-section">
                <div class="balance-header">
                    <h3>💰 Game Balance</h3>
                    <div id="userBalance" class="balance-amount">${displayBalance.toFixed(4)} ETH</div>
                    <button id="refreshBalanceBtn" class="refresh-balance-btn" title="Refresh balance">🔄</button>
                </div>
                
                <div class="balance-actions">
                    <button id="depositBtn" class="balance-btn deposit-btn" ${!isConnected ? 'disabled' : ''}>💳 Deposit</button>
                    <button id="withdrawBtn" class="balance-btn withdraw-btn" ${!isConnected ? 'disabled' : ''}>💸 Withdraw</button>
                </div>
                
                <div class="balance-info">
                    <div class="balance-mode-info">
                        ${isConnected 
                            ? `⚡ Instant betting from balance (${walletAddress.substring(0,4)}...${walletAddress.substring(38)})`
                            : `⚠️ Connect wallet to deposit/withdraw`
                        }
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

        const refreshBalanceBtn = document.getElementById('refreshBalanceBtn');
        if (refreshBalanceBtn) {
            refreshBalanceBtn.addEventListener('click', async () => {
                await this.refreshBalance();
            });
        }
    }

    /**
     * 🏦 Show deposit modal
     */
    showDepositModal() {
        const modalHTML = `
            <div id="depositModal" class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>💳 Add Funds to Game Balance</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    
                    <div class="deposit-form">
                        <div class="current-balance">
                            <p>Current Balance: <strong>${this.userBalance.toFixed(4)} ETH</strong></p>
                        </div>
                        
                        <div class="form-group">
                            <label>Amount to Deposit:</label>
                            <input type="number" id="depositAmount" min="0.001" step="0.001" placeholder="0.01">
                            <div class="quick-amounts">
                                <button class="quick-amount" data-amount="0.01">0.01 ETH</button>
                                <button class="quick-amount" data-amount="0.05">0.05 ETH</button>
                                <button class="quick-amount" data-amount="0.1">0.1 ETH</button>
                                <button class="quick-amount" data-amount="0.5">0.5 ETH</button>
                            </div>
                        </div>
                        
                        <div class="deposit-benefits">
                            <h4>✨ Why use game balance?</h4>
                            <ul>
                                <li>⚡ Instant betting - no transaction delays</li>
                                <li>💸 Lower gas fees - one deposit covers many bets</li>
                                <li>🚀 Seamless gaming experience</li>
                            </ul>
                        </div>
                        
                        <div class="deposit-note">
                            <p>💡 Funds are credited automatically after blockchain confirmation</p>
                            <p>⏱️ Usually takes 1-2 minutes on Abstract Network</p>
                        </div>
                        
                        <div class="manual-deposit-section">
                            <h4>📋 Or send ETH directly to our hot wallet:</h4>
                            <div class="hot-wallet-address">
                                <input type="text" id="hotWalletAddr" value="0x02B4bFbA6D16308F5B40A5DF1f136C9472da52FF" readonly>
                                <button id="copyHotWallet" class="copy-btn">📋 Copy</button>
                            </div>
                            <p class="manual-note">⚠️ Only send ETH on Abstract Network to this address</p>
                        </div>
                        
                        <button id="confirmDeposit" class="confirm-btn">💳 Deposit via Wallet</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.setupModalHandlers('depositModal');
        this.setupDepositHandlers();
    }

    /**
     * 🔧 Setup deposit-specific handlers
     */
    setupDepositHandlers() {
        const depositInput = document.getElementById('depositAmount');
        const confirmBtn = document.getElementById('confirmDeposit');

        // Quick amount buttons
        document.querySelectorAll('.quick-amount').forEach(btn => {
            btn.addEventListener('click', () => {
                const amount = parseFloat(btn.dataset.amount);
                depositInput.value = amount.toFixed(3);
            });
        });

        // Copy hot wallet address
        const copyBtn = document.getElementById('copyHotWallet');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                const addressInput = document.getElementById('hotWalletAddr');
                addressInput.select();
                document.execCommand('copy');
                this.showNotification('📋 Hot wallet address copied to clipboard!', 'success');
            });
        }

        // Confirm deposit
        if (confirmBtn) {
            confirmBtn.addEventListener('click', async () => {
                const amount = parseFloat(depositInput.value);
                if (!amount || amount <= 0) {
                    this.showNotification('Please enter a valid deposit amount', 'error');
                    return;
                }

                confirmBtn.disabled = true;
                confirmBtn.textContent = '⏳ Processing...';

                try {
                    await this.processDeposit(amount);
                    document.getElementById('depositModal').remove();
                } catch (error) {
                    this.showNotification(`Deposit failed: ${error.message}`, 'error');
                } finally {
                    confirmBtn.disabled = false;
                    confirmBtn.textContent = '💳 Deposit Funds';
                }
            });
        }
    }

    /**
     * 📊 Show transaction processing modal
     */
    showTransactionModal(type, txHash, amount, targetAddress) {
        const modalHTML = `
            <div id="transactionModal" class="modal-overlay transaction-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>${type === 'deposit' ? '💳' : '💸'} Processing ${type.charAt(0).toUpperCase() + type.slice(1)}</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    
                    <div class="transaction-info">
                        <div class="transaction-status">
                            <div class="status-indicator pending">
                                <div class="spinner"></div>
                                <span id="statusText">Broadcasting transaction...</span>
                            </div>
                        </div>
                        
                        <div class="transaction-details">
                            <div class="detail-row">
                                <span class="label">Amount:</span>
                                <span class="value">${amount} ETH</span>
                            </div>
                            <div class="detail-row">
                                <span class="label">${type === 'deposit' ? 'To' : 'From'}:</span>
                                <span class="value address">${targetAddress}</span>
                            </div>
                            <div class="detail-row" id="txHashRow" style="display: none;">
                                <span class="label">Transaction Hash:</span>
                                <span class="value">
                                    <a id="txHashLink" href="#" target="_blank" class="tx-link">
                                        <span id="txHashText">-</span>
                                        <span class="external-icon">🔗</span>
                                    </a>
                                </span>
                            </div>
                            <div class="detail-row" id="blockRow" style="display: none;">
                                <span class="label">Block:</span>
                                <span class="value" id="blockNumber">-</span>
                            </div>
                            <div class="detail-row" id="confirmationsRow" style="display: none;">
                                <span class="label">Confirmations:</span>
                                <span class="value" id="confirmationCount">0</span>
                            </div>
                        </div>
                        
                        <div class="progress-steps">
                            <div class="step active" id="step1">
                                <div class="step-number">1</div>
                                <div class="step-text">Broadcasting</div>
                            </div>
                            <div class="step" id="step2">
                                <div class="step-number">2</div>
                                <div class="step-text">Confirming</div>
                            </div>
                            <div class="step" id="step3">
                                <div class="step-number">3</div>
                                <div class="step-text">Updating Balance</div>
                            </div>
                        </div>
                        
                        <div class="estimated-time">
                            <p>⏱️ Estimated time: 1-2 minutes on Abstract Network</p>
                        </div>
                        
                        <div class="transaction-actions">
                            <button id="closeTransactionModal" class="secondary-btn" disabled>Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.setupTransactionModalHandlers();
        
        // If we have a transaction hash, show it immediately
        if (txHash) {
            this.updateTransactionModal(txHash, 'submitted');
        }
        
        return document.getElementById('transactionModal');
    }

    /**
     * 🔄 Update transaction modal with new status
     */
    updateTransactionModal(txHash, status, blockNumber = null, confirmations = 0) {
        const modal = document.getElementById('transactionModal');
        if (!modal) return;

        const statusText = document.getElementById('statusText');
        const statusIndicator = modal.querySelector('.status-indicator');
        const txHashRow = document.getElementById('txHashRow');
        const txHashLink = document.getElementById('txHashLink');
        const txHashText = document.getElementById('txHashText');
        const blockRow = document.getElementById('blockRow');
        const blockNumber_elem = document.getElementById('blockNumber');
        const confirmationsRow = document.getElementById('confirmationsRow');
        const confirmationCount = document.getElementById('confirmationCount');
        const closeBtn = document.getElementById('closeTransactionModal');

        // Abstract Network block explorer URL
        const explorerUrl = `https://explorer.abs.xyz/tx/${txHash}`;

        switch (status) {
            case 'submitted':
                statusText.textContent = 'Transaction submitted to network...';
                txHashRow.style.display = 'flex';
                txHashLink.href = explorerUrl;
                txHashText.textContent = `${txHash.substring(0, 10)}...${txHash.substring(txHash.length - 8)}`;
                modal.querySelector('#step1').classList.add('completed');
                modal.querySelector('#step2').classList.add('active');
                break;
                
            case 'confirmed':
                statusText.textContent = 'Transaction confirmed! Updating balance...';
                statusIndicator.className = 'status-indicator confirmed';
                statusIndicator.innerHTML = '<span class="check-mark">✅</span><span id="statusText">Transaction confirmed! Updating balance...</span>';
                
                if (blockNumber) {
                    blockRow.style.display = 'flex';
                    blockNumber_elem.textContent = blockNumber;
                }
                
                confirmationsRow.style.display = 'flex';
                confirmationCount.textContent = confirmations;
                
                modal.querySelector('#step2').classList.add('completed');
                modal.querySelector('#step3').classList.add('active');
                break;
                
            case 'completed':
                statusText.textContent = 'Transaction complete! Balance updated.';
                statusIndicator.className = 'status-indicator completed';
                statusIndicator.innerHTML = '<span class="check-mark">🎉</span><span id="statusText">Transaction complete! Balance updated.</span>';
                modal.querySelector('#step3').classList.add('completed');
                closeBtn.disabled = false;
                closeBtn.textContent = 'Done';
                break;
                
            case 'failed':
                statusText.textContent = 'Transaction failed or was rejected.';
                statusIndicator.className = 'status-indicator failed';
                statusIndicator.innerHTML = '<span class="error-mark">❌</span><span id="statusText">Transaction failed or was rejected.</span>';
                closeBtn.disabled = false;
                closeBtn.textContent = 'Close';
                break;
        }
    }

    /**
     * ⚙️ Setup transaction modal event handlers
     */
    setupTransactionModalHandlers() {
        const modal = document.getElementById('transactionModal');
        const closeBtn = document.getElementById('closeTransactionModal');
        const modalCloseBtn = modal.querySelector('.modal-close');

        const closeModal = () => {
            modal.remove();
        };

        closeBtn.addEventListener('click', closeModal);
        modalCloseBtn.addEventListener('click', closeModal);

        // Close on outside click (only when transaction is complete)
        modal.addEventListener('click', (e) => {
            if (e.target === modal && !closeBtn.disabled) {
                closeModal();
            }
        });
    }

    /**
     * 💳 Process deposit transaction
     */
    async processDeposit(amount) {
        const walletAddress = window.ethereum?.selectedAddress || window.realWeb3Modal?.address;
        const hotWallet = '0x02B4bFbA6D16308F5B40A5DF1f136C9472da52FF'; // Hot wallet for game balance deposits

        if (!walletAddress) {
            throw new Error('No wallet connected');
        }

        try {
            // Create unique transaction identifier for attribution
            const depositId = Date.now().toString();
            
            // Show transaction processing modal
            const modal = this.showTransactionModal('deposit', null, amount, hotWallet);
            
            // Send transaction through wallet bridge
            console.log(`💳 Sending deposit: ${amount} ETH to hot wallet ${hotWallet}`);
            
            if (window.realWeb3Modal && typeof window.realWeb3Modal.sendTransaction === 'function') {
                // Use the wallet bridge's sendTransaction method
                const txHash = await window.realWeb3Modal.sendTransaction(hotWallet, amount);
                
                // Update modal with transaction hash
                this.updateTransactionModal(txHash, 'submitted');
                
                // Start monitoring the transaction with modal updates
                this.monitorPendingTransaction(txHash, depositId, walletAddress, amount);
                
            } else if (window.realWeb3Modal && window.realWeb3Modal.signer) {
                // Fallback to direct signer method
                const tx = await window.realWeb3Modal.signer.sendTransaction({
                    to: hotWallet,
                    value: ethers.parseEther(amount.toString()),
                    data: '0x' + Buffer.from(depositId).toString('hex') // Encode depositId for attribution
                });

                // Update modal with transaction hash
                this.updateTransactionModal(tx.hash, 'submitted');
                
                // Wait for confirmation
                const receipt = await tx.wait();
                
                // Update modal with confirmation
                this.updateTransactionModal(tx.hash, 'confirmed', receipt.blockNumber, 1);
                
                if (receipt.status === 1) {
                    // Start monitoring the transaction
                    this.monitorPendingTransaction(tx.hash, depositId, walletAddress, amount);
                    
                    this.showNotification(`🔄 Transaction confirmed! Processing deposit...`, 'info');
                } else {
                    throw new Error('Transaction failed on blockchain');
                }
                
            } else {
                throw new Error('Wallet not properly connected - please reconnect your wallet');
            }
            
        } catch (error) {
            console.error('Deposit error:', error);
            
            // Update transaction modal with failure
            this.updateTransactionModal(null, 'failed');
            
            if (error.code === 4001) {
                throw new Error('Transaction cancelled by user');
            } else {
                throw new Error(error.message || 'Deposit transaction failed');
            }
        }
    }

    /**
     * 🔄 Monitor pending transaction and update balance when confirmed
     */
    async monitorPendingTransaction(txHash, depositId, walletAddress, amount) {
        const startTime = Date.now();
        const maxWaitTime = 5 * 60 * 1000; // 5 minutes max
        let attempts = 0;
        const maxAttempts = 60; // Check every 5 seconds for 5 minutes
        
        console.log(`🔄 Starting transaction monitoring for ${txHash}`);
        
        const checkTransaction = async () => {
            attempts++;
            const elapsed = Date.now() - startTime;
            
            try {
                // Register with backend first (for attribution)
                await this.registerDeposit(depositId, txHash, walletAddress, amount);
                
                // Check if deposit has been processed by indexer
                const response = await fetch(`https://paco-x57j.onrender.com/api/deposits/check/${walletAddress}`);
                if (response.ok) {
                    const data = await response.json();
                    
                    // Look for our transaction in new deposits
                    const ourDeposit = data.newDeposits?.find(dep => 
                        dep.tx_hash?.toLowerCase() === txHash.toLowerCase()
                    );
                    
                    if (ourDeposit) {
                        console.log(`✅ Deposit confirmed by indexer:`, ourDeposit);
                        
                        // Update transaction modal
                        this.updateTransactionModal(txHash, 'confirmed', ourDeposit.block_number, 1);
                        
                        // Refresh balance
                        await this.loadBalance();
                        
                        // Complete the transaction modal
                        setTimeout(() => {
                            this.updateTransactionModal(txHash, 'completed');
                        }, 1000);
                        
                        this.showNotification(`✅ Deposit confirmed! ${amount} ETH credited to your balance.`, 'success');
                        
                        return true; // Stop monitoring
                    }
                }
                
                // Update status message periodically
                if (attempts % 6 === 0) { // Every 30 seconds
                    const minutes = Math.floor(elapsed / 60000);
                    const seconds = Math.floor((elapsed % 60000) / 1000);
                    this.showNotification(`⏳ Still processing... (${minutes}m ${seconds}s)`, 'info');
                }
                
                // Continue monitoring if within time limit
                if (elapsed < maxWaitTime && attempts < maxAttempts) {
                    setTimeout(checkTransaction, 5000); // Check again in 5 seconds
                } else {
                    // Timeout - manual refresh needed
                    this.showNotification(`⚠️ Deposit processing is taking longer than expected. Your transaction ${txHash.slice(0,10)}... is confirmed on-chain. Balance will update automatically.`, 'warning');
                    console.warn(`🔄 Transaction monitoring timeout for ${txHash}`);
                }
                
            } catch (error) {
                console.error('Error monitoring transaction:', error);
                
                // Continue monitoring on error unless we've exceeded limits
                if (elapsed < maxWaitTime && attempts < maxAttempts) {
                    setTimeout(checkTransaction, 10000); // Retry in 10 seconds on error
                } else {
                    this.showNotification(`❌ Error monitoring deposit. Check your balance in a few minutes.`, 'error');
                }
            }
        };
        
        // Start monitoring after a short delay
        setTimeout(checkTransaction, 3000); // First check after 3 seconds
    }

    /**
     * 📝 Register deposit with backend for attribution
     */
    async registerDeposit(depositId, txHash, walletAddress, amount) {
        try {
            const response = await fetch('https://paco-x57j.onrender.com/api/deposit/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    depositId,
                    txHash,
                    walletAddress,
                    amount
                })
            });

            if (!response.ok) {
                console.warn('Failed to register deposit with backend - this is expected initially');
            }
        } catch (error) {
            console.warn('Failed to register deposit (API may not be ready):', error.message);
        }
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

        const response = await fetch('https://paco-x57j.onrender.com/api/withdraw', {
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

        console.log('📊 Starting balance monitoring for:', walletAddress);

        // Check for deposits every 15 seconds for faster updates
        setInterval(async () => {
            try {
                const response = await fetch(`https://paco-x57j.onrender.com/api/deposits/check/${walletAddress}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.newDeposits && data.newDeposits.length > 0) {
                        console.log(`💰 Found ${data.newDeposits.length} new deposits:`, data.newDeposits);
                        for (const deposit of data.newDeposits) {
                            this.userBalance += parseFloat(deposit.amount);
                            this.showNotification(`💰 Deposit confirmed: ${deposit.amount} ETH! New balance: ${this.userBalance.toFixed(4)} ETH`, 'success');
                        }
                        this.updateBalanceDisplay();
                    }
                }
                
                // Also refresh the balance from server to ensure accuracy
                const balanceResponse = await fetch(`https://paco-x57j.onrender.com/api/balance/${walletAddress}`);
                if (balanceResponse.ok) {
                    const balanceData = await balanceResponse.json();
                    const serverBalance = parseFloat(balanceData.balance || 0);
                    
                    // If server balance differs from local, sync it
                    if (Math.abs(serverBalance - this.userBalance) > 0.0001) {
                        console.log(`🔄 Syncing balance: ${this.userBalance.toFixed(4)} → ${serverBalance.toFixed(4)} ETH`);
                        this.userBalance = serverBalance;
                        this.updateBalanceDisplay();
                    }
                }
                
            } catch (error) {
                console.warn('Could not check for deposits:', error);
            }
        }, 15000); // Check every 15 seconds
        
        console.log('📊 Balance monitoring started (15s interval)');
    }

    /**
     * 🔄 Update balance when called from external systems
     */
    onBalanceUpdate(newBalance) {
        this.userBalance = newBalance;
        this.updateBalanceDisplay();
    }

    /**
     * 🔄 Manually refresh balance from server
     */
    async refreshBalance() {
        const walletAddress = window.ethereum?.selectedAddress || window.realWeb3Modal?.address;
        if (!walletAddress) {
            console.warn('⚠️ Cannot refresh balance - no wallet address');
            return;
        }

        const refreshBtn = document.getElementById('refreshBalanceBtn');
        if (refreshBtn) {
            refreshBtn.style.animation = 'spin 1s linear infinite';
        }

        try {
            console.log('🔄 Refreshing balance...');
            const response = await fetch(`https://paco-x57j.onrender.com/api/balance/${walletAddress}`, {
                method: 'GET',
                headers: {
                    'Cache-Control': 'no-cache'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                const serverBalance = parseFloat(data.balance || 0);
                
                if (Math.abs(serverBalance - this.userBalance) > 0.0001) {
                    console.log(`🔄 Balance updated: ${this.userBalance.toFixed(4)} → ${serverBalance.toFixed(4)} ETH`);
                }
                
                this.userBalance = serverBalance;
                this.updateBalanceDisplay();
                console.log(`🔄 Balance refreshed: ${this.userBalance.toFixed(4)} ETH`);
                
                // CRITICAL: Update bet amount validation after balance refresh
                this.validateBetAmount();
                return true;
            } else {
                throw new Error(`Server returned ${response.status}`);
            }
        } catch (error) {
            console.error('❌ Failed to refresh balance:', error);
            throw error; // Re-throw so caller can handle
        } finally {
            if (refreshBtn) {
                setTimeout(() => {
                    refreshBtn.style.animation = '';
                }, 500);
            }
        }
    }

    /**
     * 🍗 Add bet to orders display
     */
    addBetToOrders(order) {
        this.activeOrders.set(order.id, order);
        this.updateOrdersDisplay();
    }

    /**
     * 🔄 Update existing bet in orders
     */
    updateBetInOrders(betId, updates) {
        const order = this.activeOrders.get(betId);
        if (order) {
            Object.assign(order, updates);
            this.updateOrdersDisplay();
        }
    }

    /**
     * 📊 Update the orders display UI
     */
    updateOrdersDisplay() {
        const ordersFeed = document.getElementById('ordersFeed');
        if (!ordersFeed) return;

        const orders = Array.from(this.activeOrders.values())
            .sort((a, b) => b.timestamp - a.timestamp) // Most recent first
            .slice(0, 10); // Show last 10 orders

        if (orders.length === 0) {
            ordersFeed.innerHTML = `
                <div class="orders-empty-state">
                    <div class="orders-empty-content">
                        <span class="orders-empty-icon">🍗</span>
                        <div class="orders-empty-message">No orders yet</div>
                        <div class="orders-empty-hint">Waiting for players to place bets...</div>
                    </div>
                </div>
            `;
            return;
        }

        ordersFeed.innerHTML = orders.map(order => {
            const statusDisplay = this.getOrderStatusDisplay(order);
            const playerClass = order.isYou ? 'order-you' : '';
            
            return `
                <div class="order-item ${order.status} ${playerClass}" data-order-id="${order.id}">
                    <span class="order-player">${order.player}</span>
                    <span class="order-amount">${order.amount.toFixed(4)} ETH</span>
                    <span class="order-status">${statusDisplay}</span>
                </div>
            `;
        }).join('');
    }

    /**
     * 🎯 Get display text for order status
     */
    getOrderStatusDisplay(order) {
        switch (order.status) {
            case 'placing':
                return '⏳ Placing...';
            case 'active':
                return '🎯 Active';
            case 'cashed_out':
                return `💰 ${order.multiplier?.toFixed(2)}x`;
            case 'crashed':
                return '💥 Crashed';
            case 'failed':
                return '❌ Failed';
            default:
                return '⏳ Pending';
        }
    }

    /**
     * 💰 Handle cashout events from socket
     */
    handleCashoutEvent(data) {
        // Find order by player address and update
        for (const [orderId, order] of this.activeOrders) {
            if (order.playerAddress === data.playerId && order.status === 'active') {
                this.updateBetInOrders(orderId, {
                    status: 'cashed_out',
                    multiplier: data.multiplier,
                    payout: data.payout
                });
                break;
            }
        }
    }

    /**
     * 💥 Handle crash events from socket
     */
    handleCrashEvent(data) {
        // Mark all active orders as crashed
        for (const [orderId, order] of this.activeOrders) {
            if (order.status === 'active') {
                this.updateBetInOrders(orderId, {
                    status: 'crashed',
                    crashPoint: data.crashPoint
                });
            }
        }
    }

    /**
     * 🧹 Clear active orders for new round
     */
    clearActiveOrders() {
        console.log(`🧹 Clearing ${this.activeOrders.size} active orders for new round`);
        
        // Clear all active orders
        this.activeOrders.clear();
        
        console.log('✅ Active orders cleared for fresh round');
    }

    /**
     * 🕐 Add queued order to display
     */
    addQueuedOrder(queuedBet) {
        const orderId = `queued_${queuedBet.playerId}_${Date.now()}`;
        
        this.activeOrders.set(orderId, {
            id: orderId,
            amount: queuedBet.betAmount,
            multiplier: queuedBet.payoutMultiplier,
            status: 'queued',
            timestamp: queuedBet.timestamp,
            playerId: queuedBet.playerId
        });
        
        this.updateOrdersDisplay();
        console.log(`🕐 Added queued order: ${queuedBet.betAmount} ETH`);
    }

    /**
     * ✅ Update queued order to active when processed
     */
    updateQueuedOrderToActive(playerId, betInfo) {
        // Find and update the queued order
        for (const [orderId, order] of this.activeOrders) {
            if (order.playerId === playerId && order.status === 'queued') {
                order.status = 'active';
                order.betInfo = betInfo;
                console.log(`✅ Updated queued order to active: ${orderId}`);
                break;
            }
        }
        
        this.updateOrdersDisplay();
    }

    /**
     * ❌ Remove queued order if failed
     */
    removeQueuedOrder(playerId) {
        for (const [orderId, order] of this.activeOrders) {
            if (order.playerId === playerId && order.status === 'queued') {
                this.activeOrders.delete(orderId);
                console.log(`❌ Removed failed queued order: ${orderId}`);
                break;
            }
        }
        
        this.updateOrdersDisplay();
    }

    /**
     * 🧹 Clear old orders (keep last 50)
     */
    cleanupOldOrders() {
        const orders = Array.from(this.activeOrders.entries())
            .sort((a, b) => b[1].timestamp - a[1].timestamp);
        
        // Keep only the 50 most recent
        if (orders.length > 50) {
            const toRemove = orders.slice(50);
            toRemove.forEach(([orderId]) => {
                this.activeOrders.delete(orderId);
            });
        }
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
        setupDebugCommands();
    });
} else {
    window.betInterface = new BetInterface();
    setupDebugCommands();
}

// Global debug functions
function setupDebugCommands() {
    window.debugDeposit = {
        // Manually process your deposit
        processYourDeposit: () => {
            return window.betInterface.manualTriggerDeposit(
                '0xaf14e82f668f53c677c38bad483abaf892c73e84e75a47ae1f112f577c977ad2', 
                '0x2e215a36c9fa606e9408b7e7094e687f9d8b06a6', 
                0.01
            );
        },
        
        // Trigger indexer to scan for deposits
        triggerIndexer: () => {
            return window.betInterface.manualTriggerIndexer();
        },
        
            // Process any deposit manually
    processDeposit: (txHash, fromAddress, amount) => {
        return window.betInterface.manualTriggerDeposit(txHash, fromAddress, amount);
    },
    
    // Verify fund flow
    verifyFundFlow: async () => {
        try {
            const response = await fetch('https://paco-x57j.onrender.com/api/fund-flow/verify');
            const result = await response.json();
            console.log('🏦 Fund Flow Verification:', result);
            console.log('💰 Fund Flow Summary:');
            console.log('  1. Deposits: Players → Hot Wallet');
            console.log('  2. Bets: Hot Wallet → House Wallet');
            console.log('  3. Wins: House Wallet → Hot Wallet → Players');
            console.log('  4. Losses: Funds remain in House Wallet');
            return result;
        } catch (error) {
            console.error('Fund flow verification error:', error);
        }
    }
    };

    console.log('🔧 Debug commands available:');
    console.log('debugDeposit.processYourDeposit() - Process your 0.01 ETH deposit');
    console.log('debugDeposit.triggerIndexer() - Trigger deposit indexer');
    console.log('debugDeposit.processDeposit(txHash, address, amount) - Process any deposit');
    console.log('debugDeposit.verifyFundFlow() - Verify fund flow between wallets');
}

