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
                
                // Update if different
                if (Math.abs(serverBalance - this.balance) > 0.0001) {
                    console.log(`💰 Balance updated: ${this.balance.toFixed(4)} → ${serverBalance.toFixed(4)} ETH`);
                    this.balance = serverBalance;
                    this.updateBalanceDisplay();
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
                const errorText = await response.text();
                throw new Error(`Bet failed: ${errorText || 'Server error'}`);
            }
            
            const result = await response.json();
            
            // Optimistically update balance
            this.balance -= amount;
            this.updateBalanceDisplay();
            
            console.log(`✅ Bet placed successfully: ${amount} ETH`);
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
        
        // Create hot wallet UI
        const hotWalletHTML = `
            <div id="hotWalletContainer" class="hot-wallet-section" style="
                background: linear-gradient(135deg, #1a1a2e, #16213e);
                border: 2px solid #ffd700;
                border-radius: 12px;
                padding: 16px;
                margin: 12px 0;
                box-shadow: 0 4px 20px rgba(255, 215, 0, 0.1);
            ">
                <div class="hot-wallet-header" style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 12px;
                ">
                    <h3 style="color: #ffd700; margin: 0; font-size: 16px; font-weight: 600;">
                        🏦 Hot Wallet Balance
                    </h3>
                    <button id="refreshHotWalletBtn" style="
                        background: transparent;
                        border: 1px solid #ffd700;
                        color: #ffd700;
                        padding: 4px 8px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 12px;
                    ">🔄 Refresh</button>
                </div>
                
                <div class="balance-display" style="
                    text-align: center;
                    margin: 12px 0;
                ">
                    <div id="hotWalletBalance" style="
                        font-size: 24px;
                        font-weight: bold;
                        color: #ffffff;
                        text-shadow: 0 0 10px rgba(255, 215, 0, 0.3);
                    ">${this.balance.toFixed(4)} ETH</div>
                    <div style="color: #888; font-size: 12px;">Available for betting</div>
                </div>
                
                <div class="wallet-actions" style="
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 8px;
                    margin-top: 12px;
                ">
                    <button id="depositBtn" style="
                        background: linear-gradient(135deg, #4CAF50, #45a049);
                        border: none;
                        color: white;
                        padding: 8px 12px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-weight: 500;
                        font-size: 12px;
                    ">💰 Deposit</button>
                    
                    <button id="withdrawBtn" style="
                        background: linear-gradient(135deg, #ff6b6b, #ee5a52);
                        border: none;
                        color: white;
                        padding: 8px 12px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-weight: 500;
                        font-size: 12px;
                    ">🏧 Withdraw</button>
                </div>
                
                <div id="hotWalletStatus" style="
                    margin-top: 8px;
                    font-size: 11px;
                    color: #888;
                    text-align: center;
                ">Connected to ${this.walletAddress.substring(0, 6)}...${this.walletAddress.substring(38)}</div>
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
        this.walletAddress = null;
        this.balance = 0;
        this.isInitialized = false;
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
        return this.isInitialized && this.walletAddress;
    }
}

// Create global instance
window.unifiedHotWallet = new UnifiedHotWallet();

// Auto-initialize when wallet connects
window.addEventListener('walletConnected', (event) => {
    if (event.detail && event.detail.address) {
        window.unifiedHotWallet.init(event.detail.address);
    }
});

// Auto-disconnect when wallet disconnects
window.addEventListener('walletDisconnected', () => {
    window.unifiedHotWallet.disconnect();
});

console.log('🏦 Unified Hot Wallet System loaded');
