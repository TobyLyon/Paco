/**
 * 🏦 Unified Hot Wallet System
 * 
 * PERSISTENT balance system that:
 * - Stores balances permanently in database
 * - Shows consistent UI across refreshes
 * - Only touches blockchain for deposits/withdrawals
 * - Automatically syncs with server balance
 */

class UnifiedHotWallet {
    constructor() {
        this.walletAddress = null;
        this.balance = 0;
        this.isInitialized = false;
        this.isUIVisible = false;
        this.syncInterval = null;
        this.lastBetTime = 0; // Track when last bet was placed
        
        // Bind methods
        this.init = this.init.bind(this);
        this.refreshBalance = this.refreshBalance.bind(this);
        this.showHotWalletUI = this.showHotWalletUI.bind(this);
        this.hideHotWalletUI = this.hideHotWalletUI.bind(this);
        
        console.log('🏦 Unified Hot Wallet System initialized');
    }
    
    /**
     * 🚀 Initialize hot wallet system
     */
    async init(walletAddress) {
        if (!walletAddress) {
            console.warn('🏦 No wallet address provided to hot wallet system');
            return false;
        }
        
        // Validate that we have a real wallet connection
        const hasActiveConnection = (window.ethereum?.isConnected?.() && window.ethereum?.selectedAddress === walletAddress) || 
                                   window.realWeb3Modal?.address === walletAddress;
        
        if (!hasActiveConnection) {
            console.warn('⚠️ No active wallet connection detected, skipping hot wallet init');
            return false;
        }
        
        this.walletAddress = walletAddress.toLowerCase();
        console.log(`🏦 Initializing hot wallet for: ${this.walletAddress}`);
        
        try {
            // Always load balance from server (source of truth)
            await this.refreshBalance();
            
            // Show UI immediately (persistent across refreshes)
            this.showHotWalletUI();
            
            // Start automatic balance sync (every 10 seconds)
            this.startAutoSync();
            
            this.isInitialized = true;
            console.log(`✅ Hot wallet initialized - Balance: ${this.balance.toFixed(4)} ETH`);
            
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize hot wallet:', error);
            this.isInitialized = false;
            this.walletAddress = null;
            return false;
        }
    }
    
    /**
     * 🔄 Refresh balance from server (source of truth)
     */
    async refreshBalance() {
        if (!this.walletAddress) {
            console.warn('🏦 Cannot refresh balance - no wallet address');
            return;
        }
        
        try {
            console.log(`🔄 Refreshing balance for ${this.walletAddress}`);
            
            const response = await fetch(`https://paco-x57j.onrender.com/api/balance/${this.walletAddress}`, {
                method: 'GET',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                const serverBalance = parseFloat(data.balance || 0);
                
                // Update if different, but avoid overwriting recent bet optimistic updates
                const timeSinceLastBet = Date.now() - this.lastBetTime;
                if (Math.abs(serverBalance - this.balance) > 0.0001) {
                    // If we just placed a bet (within 3 seconds), be more careful about updates
                    if (timeSinceLastBet < 3000) {
                        // Only update if server balance is significantly different from expected
                        // (Expected would be original balance minus bet amount)
                        console.log(`⚠️ Potential sync conflict detected - recent bet ${timeSinceLastBet}ms ago`);
                        console.log(`Server: ${serverBalance.toFixed(4)} ETH, Local: ${this.balance.toFixed(4)} ETH`);
                        
                        // Only update if server balance is higher (indicating a credit/deposit)
                        // or if the difference is very large (indicating a real discrepancy)
                        if (serverBalance > this.balance || Math.abs(serverBalance - this.balance) > 0.01) {
                            console.log(`💰 Balance updated: ${this.balance.toFixed(4)} → ${serverBalance.toFixed(4)} ETH`);
                            this.balance = serverBalance;
                            this.updateBalanceDisplay();
                        } else {
                            console.log(`⏳ Keeping optimistic balance, server will catch up`);
                        }
                    } else {
                        // Normal update - no recent bet to worry about
                        console.log(`💰 Balance updated: ${this.balance.toFixed(4)} → ${serverBalance.toFixed(4)} ETH`);
                        this.balance = serverBalance;
                        this.updateBalanceDisplay();
                    }
                }
                
                return this.balance;
            } else {
                throw new Error(`Server returned ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('❌ Failed to refresh balance:', error);
            throw error;
        }
    }
    
    /**
     * 💸 Place bet using hot wallet balance
     */
    async placeBet(amount) {
        if (!this.isInitialized) {
            throw new Error('Hot wallet not initialized');
        }
        
        // Pre-validate balance
        if (this.balance < amount) {
            throw new Error(`Insufficient balance. You have ${this.balance.toFixed(4)} ETH, need ${amount.toFixed(4)} ETH`);
        }
        
        try {
            console.log(`🎯 Placing bet: ${amount} ETH (balance: ${this.balance.toFixed(4)} ETH)`);
            
            // Store original balance for rollback
            const originalBalance = this.balance;
            
            // Optimistically update balance BEFORE request
            this.balance -= amount;
            this.updateBalanceDisplay();
            this.lastBetTime = Date.now(); // Track bet timing
            
            // Make the bet request
            const response = await fetch('https://paco-x57j.onrender.com/api/bet/balance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    playerAddress: this.walletAddress,
                    amount: amount
                })
            });
            
            if (!response.ok) {
                // Rollback optimistic update on failure
                this.balance = originalBalance;
                this.updateBalanceDisplay();
                
                const errorText = await response.text();
                throw new Error(`Bet failed: ${errorText || 'Server error'}`);
            }
            
            const result = await response.json();
            
            // Don't update balance here - the optimistic update already happened
            // And we'll refresh from server shortly anyway
            
            console.log(`✅ Bet placed successfully: ${amount} ETH (new balance: ${this.balance.toFixed(4)} ETH)`);
            
            // Refresh balance from server after a short delay to sync with backend
            setTimeout(() => {
                this.refreshBalance().catch(err => 
                    console.warn('⚠️ Failed to sync balance after bet:', err)
                );
            }, 1000);
            
            return result;
            
        } catch (error) {
            console.error('❌ Bet placement failed:', error);
            // Refresh balance to get accurate state
            await this.refreshBalance();
            throw error;
        }
    }
    
    /**
     * 🏆 Add winnings to balance (from cashouts)
     */
    addWinnings(amount) {
        if (!this.isInitialized) return;
        
        this.balance += amount;
        this.updateBalanceDisplay();
        console.log(`🏆 Winnings added: +${amount.toFixed(4)} ETH (new balance: ${this.balance.toFixed(4)} ETH)`);
    }
    
    /**
     * 💰 Process deposit (external function can call this)
     */
    async processDeposit(amount) {
        if (!this.isInitialized) return;
        
        try {
            // Refresh balance from server (deposit will be processed server-side)
            await this.refreshBalance();
            
            console.log(`💰 Deposit processed: +${amount.toFixed(4)} ETH`);
            this.showNotification(`💰 Deposit confirmed: +${amount.toFixed(4)} ETH`, 'success');
            
        } catch (error) {
            console.error('❌ Failed to process deposit:', error);
        }
    }
    
    /**
     * 🏦 Show persistent hot wallet UI
     */
    showHotWalletUI() {
        if (this.isUIVisible) return;
        
        // Find or create the betting panel
        let bettingPanel = document.querySelector('.betting-panel');
        if (!bettingPanel) {
            console.warn('🏦 Betting panel not found - hot wallet UI may not display correctly');
            return;
        }
        
        // Remove any existing hot wallet UI
        const existingUI = document.getElementById('hotWalletContainer');
        if (existingUI) {
            existingUI.remove();
        }
        
        // Hide legacy balance UI if it exists
        const legacyBalanceUI = document.getElementById('balanceSection');
        if (legacyBalanceUI) {
            legacyBalanceUI.style.display = 'none';
            console.log('🏦 Hidden legacy balance UI in favor of unified hot wallet');
        }
        
        // Create hot wallet UI (compact version)
        const hotWalletHTML = `
            <div id="hotWalletContainer" class="hot-wallet-section" style="
                background: linear-gradient(135deg, #1a1a2e, #16213e);
                border: 1px solid #ffd700;
                border-radius: 8px;
                padding: 10px;
                margin: 8px 0;
                box-shadow: 0 2px 12px rgba(255, 215, 0, 0.1);
            ">
                <div class="hot-wallet-header" style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 8px;
                ">
                    <h3 style="color: #ffd700; margin: 0; font-size: 14px; font-weight: 600;">
                        🏦 Hot Wallet
                    </h3>
                    <button id="refreshHotWalletBtn" style="
                        background: transparent;
                        border: 1px solid #ffd700;
                        color: #ffd700;
                        padding: 2px 6px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 10px;
                    ">🔄</button>
                </div>
                
                <div class="balance-display" style="
                    text-align: center;
                    margin: 6px 0;
                ">
                    <div id="hotWalletBalance" style="
                        font-size: 20px;
                        font-weight: bold;
                        color: #ffffff;
                        text-shadow: 0 0 8px rgba(255, 215, 0, 0.3);
                        line-height: 1;
                    ">${this.balance.toFixed(4)} ETH</div>
                    <div style="color: #888; font-size: 10px; margin-top: 2px;">Available for betting</div>
                </div>
                
                <div class="wallet-actions" style="
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 6px;
                    margin-top: 8px;
                ">
                    <button id="hotWalletDepositBtn" style="
                        background: linear-gradient(135deg, #4CAF50, #45a049);
                        border: none;
                        color: white;
                        padding: 6px 8px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-weight: 500;
                        font-size: 10px;
                    ">💰 Deposit</button>
                    
                    <button id="hotWalletWithdrawBtn" style="
                        background: linear-gradient(135deg, #ff6b6b, #ee5a52);
                        border: none;
                        color: white;
                        padding: 6px 8px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-weight: 500;
                        font-size: 10px;
                    ">🏧 Withdraw</button>
                </div>
                
                <div id="hotWalletStatus" style="
                    margin-top: 6px;
                    font-size: 9px;
                    color: #666;
                    text-align: center;
                ">Connected ${this.walletAddress.substring(0, 4)}...${this.walletAddress.substring(38)}</div>
            </div>
        `;
        
        // Insert the hot wallet UI before the bet input
        const betInputSection = bettingPanel.querySelector('.bet-input-section');
        if (betInputSection) {
            betInputSection.insertAdjacentHTML('beforebegin', hotWalletHTML);
        } else {
            bettingPanel.insertAdjacentHTML('afterbegin', hotWalletHTML);
        }
        
        // Add event listeners
        this.setupEventListeners();
        
        this.isUIVisible = true;
        console.log('✅ Hot wallet UI displayed');
    }
    
    /**
     * 🚫 Hide hot wallet UI
     */
    hideHotWalletUI() {
        const container = document.getElementById('hotWalletContainer');
        if (container) {
            container.remove();
            this.isUIVisible = false;
            console.log('🚫 Hot wallet UI hidden');
        }
    }
    
    /**
     * 📊 Update balance display
     */
    updateBalanceDisplay() {
        const balanceElement = document.getElementById('hotWalletBalance');
        if (balanceElement) {
            balanceElement.textContent = `${this.balance.toFixed(4)} ETH`;
            
            // Add a subtle animation
            balanceElement.style.transform = 'scale(1.05)';
            setTimeout(() => {
                balanceElement.style.transform = 'scale(1)';
            }, 200);
        }
    }
    
    /**
     * 🎛️ Setup event listeners for hot wallet UI
     */
    setupEventListeners() {
        // Refresh button
        const refreshBtn = document.getElementById('refreshHotWalletBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                refreshBtn.style.animation = 'spin 1s linear infinite';
                try {
                    await this.refreshBalance();
                    this.showNotification('💰 Balance refreshed', 'success');
                } catch (error) {
                    this.showNotification('❌ Failed to refresh balance', 'error');
                } finally {
                    refreshBtn.style.animation = '';
                }
            });
        }
        
        // Set up deposit/withdraw button listeners with retry logic
        setTimeout(() => {
            const depositBtn = document.getElementById('hotWalletDepositBtn');
            const withdrawBtn = document.getElementById('hotWalletWithdrawBtn');
            
            console.log('🔍 Setting up hot wallet deposit/withdraw button listeners:', {
                hotWalletDepositBtn: !!depositBtn,
                hotWalletWithdrawBtn: !!withdrawBtn
            });
            
            if (depositBtn) {
                depositBtn.addEventListener('click', () => {
                    console.log('💰 Hot wallet deposit button clicked');
                    this.showDepositModal();
                });
                console.log('✅ Hot wallet deposit button listener added');
            } else {
                console.warn('⚠️ Hot wallet deposit button not found - will retry');
                // Retry after a short delay
                setTimeout(() => {
                    const retryDepositBtn = document.getElementById('hotWalletDepositBtn');
                    if (retryDepositBtn) {
                        retryDepositBtn.addEventListener('click', () => {
                            console.log('💰 Hot wallet deposit button clicked (retry)');
                            this.showDepositModal();
                        });
                        console.log('✅ Hot wallet deposit button listener added (retry)');
                    }
                }, 500);
            }
            
            if (withdrawBtn) {
                withdrawBtn.addEventListener('click', () => {
                    console.log('🏧 Hot wallet withdraw button clicked');
                    this.showWithdrawModal();
                });
                console.log('✅ Hot wallet withdraw button listener added');
            } else {
                console.warn('⚠️ Hot wallet withdraw button not found - will retry');
                // Retry after a short delay
                setTimeout(() => {
                    const retryWithdrawBtn = document.getElementById('hotWalletWithdrawBtn');
                    if (retryWithdrawBtn) {
                        retryWithdrawBtn.addEventListener('click', () => {
                            console.log('🏧 Hot wallet withdraw button clicked (retry)');
                            this.showWithdrawModal();
                        });
                        console.log('✅ Hot wallet withdraw button listener added (retry)');
                    }
                }, 500);
            }
        }, 100); // Small delay to ensure DOM is ready
    }
    
    /**
     * 💰 Show deposit modal
     */
    showDepositModal() {
        const houseWallet = '0x1f8B1c4D05eF17Ebaa1E572426110146691e6C5a';
        
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center;
            z-index: 10000;
        `;
        
        modal.innerHTML = `
            <div style="
                background: linear-gradient(135deg, #1a1a2e, #16213e);
                border: 2px solid #ffd700;
                border-radius: 12px;
                padding: 24px;
                max-width: 400px;
                width: 90%;
                color: white;
                text-align: center;
            ">
                <h3 style="color: #ffd700; margin-bottom: 16px;">💰 Deposit to Hot Wallet</h3>
                
                <p style="margin-bottom: 16px; color: #ccc; font-size: 14px;">
                    Send ETH to the house wallet address below.<br>
                    Your balance will be credited automatically!
                </p>
                
                <div style="
                    background: #0a0a0a;
                    border: 1px solid #333;
                    border-radius: 8px;
                    padding: 12px;
                    margin: 16px 0;
                    word-break: break-all;
                    font-family: monospace;
                    font-size: 12px;
                ">${houseWallet}</div>
                
                <div style="display: flex; gap: 12px; margin-top: 20px;">
                    <button id="copyDepositAddress" style="
                        background: linear-gradient(135deg, #4CAF50, #45a049);
                        border: none; color: white; padding: 10px 16px;
                        border-radius: 6px; cursor: pointer; flex: 1;
                    ">📋 Copy Address</button>
                    
                    <button id="closeDepositModal" style="
                        background: #666; border: none; color: white;
                        padding: 10px 16px; border-radius: 6px; cursor: pointer; flex: 1;
                    ">Close</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Event listeners
        modal.querySelector('#copyDepositAddress').onclick = () => {
            navigator.clipboard.writeText(houseWallet);
            this.showNotification('📋 Address copied to clipboard!', 'success');
        };
        
        modal.querySelector('#closeDepositModal').onclick = () => {
            modal.remove();
        };
        
        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };
    }
    
    /**
     * 🏧 Show withdraw modal
     */
    showWithdrawModal() {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center;
            z-index: 10000;
        `;
        
        modal.innerHTML = `
            <div style="
                background: linear-gradient(135deg, #1a1a2e, #16213e);
                border: 2px solid #ffd700;
                border-radius: 12px;
                padding: 24px;
                max-width: 400px;
                width: 90%;
                color: white;
                text-align: center;
            ">
                <h3 style="color: #ffd700; margin-bottom: 16px;">🏧 Withdraw from Hot Wallet</h3>
                
                <p style="margin-bottom: 16px; color: #ccc; font-size: 14px;">
                    Available: ${this.balance.toFixed(4)} ETH
                </p>
                
                <input type="number" id="withdrawAmount" placeholder="Amount to withdraw" 
                       min="0.001" max="${this.balance}" step="0.001" style="
                    width: 100%; padding: 12px; border-radius: 6px;
                    border: 1px solid #333; background: #0a0a0a;
                    color: white; margin-bottom: 16px; text-align: center;
                ">
                
                <div style="display: flex; gap: 12px; margin-top: 20px;">
                    <button id="confirmWithdraw" style="
                        background: linear-gradient(135deg, #ff6b6b, #ee5a52);
                        border: none; color: white; padding: 10px 16px;
                        border-radius: 6px; cursor: pointer; flex: 1;
                    ">🏧 Withdraw</button>
                    
                    <button id="closeWithdrawModal" style="
                        background: #666; border: none; color: white;
                        padding: 10px 16px; border-radius: 6px; cursor: pointer; flex: 1;
                    ">Cancel</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Event listeners
        modal.querySelector('#confirmWithdraw').onclick = async () => {
            const amount = parseFloat(modal.querySelector('#withdrawAmount').value);
            if (!amount || amount <= 0 || amount > this.balance) {
                this.showNotification('❌ Invalid withdrawal amount', 'error');
                return;
            }
            
            try {
                await this.processWithdrawal(amount);
                modal.remove();
            } catch (error) {
                console.error('❌ Withdrawal failed:', error);
                this.showNotification(`❌ Withdrawal failed: ${error.message}`, 'error');
            }
        };
        
        modal.querySelector('#closeWithdrawModal').onclick = () => {
            modal.remove();
        };
        
        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };
    }
    
    /**
     * 🏧 Process withdrawal request
     */
    async processWithdrawal(amount) {
        try {
            console.log(`🏧 Processing withdrawal: ${amount} ETH`);
            
            const response = await fetch('https://paco-x57j.onrender.com/api/withdraw', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    playerAddress: this.walletAddress,
                    amount: amount
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Withdrawal failed');
            }
            
            const result = await response.json();
            
            // Update balance optimistically
            this.balance -= amount;
            this.updateBalanceDisplay();
            
            this.showNotification(`✅ Withdrawal initiated: ${amount.toFixed(4)} ETH`, 'success');
            console.log(`✅ Withdrawal successful:`, result);
            
        } catch (error) {
            console.error('❌ Withdrawal failed:', error);
            throw error;
        }
    }
    
    /**
     * 🔄 Start automatic balance sync
     */
    startAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        
        this.syncInterval = setInterval(async () => {
            if (this.isInitialized && this.walletAddress) {
                try {
                    await this.refreshBalance();
                } catch (error) {
                    console.warn('⚠️ Auto-sync failed:', error.message);
                }
            }
        }, 10000); // Every 10 seconds
        
        console.log('🔄 Auto-sync started (10s interval)');
    }
    
    /**
     * 🛑 Stop automatic balance sync
     */
    stopAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
            console.log('🛑 Auto-sync stopped');
        }
    }
    
    /**
     * 🔌 Disconnect and cleanup
     */
    disconnect() {
        this.stopAutoSync();
        this.hideHotWalletUI();
        
        // Show legacy balance UI back
        const legacyBalanceUI = document.getElementById('balanceSection');
        if (legacyBalanceUI) {
            legacyBalanceUI.style.display = 'block';
            console.log('🏦 Restored legacy balance UI after disconnect');
        }
        
        this.walletAddress = null;
        this.balance = 0;
        this.isInitialized = false;
        this.lastBetTime = 0;
        console.log('🔌 Hot wallet disconnected');
    }
    
    /**
     * 📢 Show notification
     */
    showNotification(message, type = 'info') {
        // Try to use existing notification system
        if (window.betInterface && typeof window.betInterface.showNotification === 'function') {
            window.betInterface.showNotification(message, type);
            return;
        }
        
        // Fallback notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 10001;
            background: ${type === 'error' ? '#ff4444' : type === 'success' ? '#44ff44' : '#4488ff'};
            color: white; padding: 12px 20px; border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            font-weight: 500; max-width: 300px;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    /**
     * 📊 Get current balance
     */
    getBalance() {
        return this.balance;
    }
    
    /**
     * ✅ Check if initialized
     */
    isReady() {
        return this.isInitialized && !!this.walletAddress;
    }
}

// Create global instance
window.unifiedHotWallet = new UnifiedHotWallet();

// Auto-initialize if wallet is already connected
setTimeout(() => {
    // Very strict wallet detection - only init if we have ACTIVE connection indicators
    const hasMetaMask = window.ethereum?.selectedAddress && window.ethereum?.isConnected?.();
    const hasWeb3Modal = window.realWeb3Modal?.address;
    const walletAddress = window.ethereum?.selectedAddress || window.realWeb3Modal?.address;
    
    // Check if wallet bridge indicates CURRENT session is connected (not cached)
    const walletBridgeConnected = document.body.classList.contains('wallet-connected');
    
    // DEBUG: Log all detection states
    console.log('🔍 HOT WALLET AUTO-INIT DEBUG:', {
        'window.ethereum?.selectedAddress': window.ethereum?.selectedAddress,
        'window.ethereum?.isConnected?.()': window.ethereum?.isConnected?.(),
        'window.realWeb3Modal?.address': window.realWeb3Modal?.address,
        'hasMetaMask': hasMetaMask,
        'hasWeb3Modal': hasWeb3Modal,
        'walletAddress': walletAddress,
        'walletBridgeConnected': walletBridgeConnected,
        'document.body.classList': Array.from(document.body.classList),
        'alreadyInitialized': window.unifiedHotWallet.isInitialized
    });
    
    // Only initialize if we have BOTH an address AND active connection indicators
    if (walletAddress && !window.unifiedHotWallet.isInitialized && (hasMetaMask || hasWeb3Modal) && walletBridgeConnected) {
        console.log('🏦 ✅ Auto-initializing unified hot wallet:', walletAddress);
        window.unifiedHotWallet.init(walletAddress);
    } else {
        console.log('🏦 ❌ Hot wallet auto-init failed conditions');
    }
}, 1000); // Small delay to ensure other systems are loaded

// Auto-initialize when wallet connects
document.addEventListener('walletConnected', (event) => {
    console.log('🏦 Unified hot wallet received wallet connected event:', event.detail);
    if (event.detail && event.detail.address) {
        window.unifiedHotWallet.init(event.detail.address);
    }
});

// Auto-disconnect when wallet disconnects
document.addEventListener('walletDisconnected', () => {
    console.log('🏦 Unified hot wallet received wallet disconnected event');
    window.unifiedHotWallet.disconnect();
});

// 🧪 MANUAL DEBUG FUNCTIONS for troubleshooting
window.forceShowHotWallet = function() {
    console.log('🧪 FORCE SHOWING HOT WALLET...');
    const walletAddress = window.ethereum?.selectedAddress || window.realWeb3Modal?.address || '0x2e215a36c9fa606e9408b7e7094e687f9d8b06a6';
    console.log('🧪 Using wallet address:', walletAddress);
    
    if (walletAddress) {
        window.unifiedHotWallet.init(walletAddress);
        console.log('🧪 Hot wallet initialization triggered');
    } else {
        console.error('🧪 No wallet address found');
    }
};

window.debugHotWallet = function() {
    console.log('🧪 HOT WALLET DEBUG INFO:', {
        'unifiedHotWallet exists': !!window.unifiedHotWallet,
        'isInitialized': window.unifiedHotWallet?.isInitialized,
        'isUIVisible': window.unifiedHotWallet?.isUIVisible,
        'walletAddress': window.unifiedHotWallet?.walletAddress,
        'balance': window.unifiedHotWallet?.balance,
        'hotWalletContainer exists': !!document.getElementById('hotWalletContainer'),
        'balanceSection exists': !!document.getElementById('balanceSection')
    });
};

console.log('🏦 Unified Hot Wallet System loaded');
