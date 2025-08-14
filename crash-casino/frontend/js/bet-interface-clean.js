/**
 * 🎯 Bet Interface for PacoRocko Crash Casino - Balance Only
 * 
 * Simplified betting interface using only balance-based betting
 */

class BetInterface {
    constructor() {
        this.betAmount = 0.005; // Default bet amount
        this.isPlacingBet = false;
        this.currentBet = null;
        
        // Balance system only
        this.userBalance = 0;
        this.balanceInitialized = false;
        
        this.init();
    }

    /**
     * 🚀 Initialize bet interface
     */
    async init() {
        console.log('🎯 Initializing bet interface (balance-only)...');
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

        if (this.userBalance < this.betAmount) {
            this.showNotification(`❌ Insufficient balance. You have ${this.userBalance.toFixed(4)} ETH`, 'error');
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
     * 🏃‍♂️ Cash out current bet
     */
    cashOut() {
        if (window.crashGameClient) {
            window.crashGameClient.cashOut();
        } else {
            this.showNotification('❌ Cannot cash out - game not connected', 'error');
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

        const balanceHTML = `
            <div id="balanceSection" class="balance-section">
                <div class="balance-header">
                    <h3>💰 Game Balance</h3>
                    <div id="userBalance" class="balance-amount">${this.userBalance.toFixed(4)} ETH</div>
                </div>
                
                <div class="balance-actions">
                    <button id="depositBtn" class="balance-btn deposit-btn">💳 Deposit</button>
                    <button id="withdrawBtn" class="balance-btn withdraw-btn">💸 Withdraw</button>
                </div>
                
                <div class="balance-info">
                    <div class="balance-mode-info">
                        ⚡ Instant betting from balance
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
                        
                        <button id="confirmDeposit" class="confirm-btn">💳 Deposit Funds</button>
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
     * 💳 Process deposit transaction
     */
    async processDeposit(amount) {
        const walletAddress = window.ethereum?.selectedAddress || window.realWeb3Modal?.address;
        const houseWallet = '0x1f8B1c4D05eF17Ebaa1E572426110146691e6C5a';

        if (!walletAddress) {
            throw new Error('No wallet connected');
        }

        try {
            // Create unique transaction identifier for attribution
            const depositId = Date.now().toString();
            
            // Send transaction through wallet bridge
            console.log(`💳 Sending deposit: ${amount} ETH to ${houseWallet}`);
            
            if (window.realWeb3Modal && typeof window.realWeb3Modal.sendTransaction === 'function') {
                // Use the wallet bridge's sendTransaction method
                const txHash = await window.realWeb3Modal.sendTransaction(houseWallet, amount);
                
                this.showNotification('📤 Transaction sent! Waiting for confirmation...', 'info');
                
                // Register deposit with backend for attribution
                await this.registerDeposit(depositId, txHash, walletAddress, amount);
                
                this.showNotification(`✅ Deposit successful! ${amount} ETH will be credited shortly.`, 'success');
                
            } else if (window.realWeb3Modal && window.realWeb3Modal.signer) {
                // Fallback to direct signer method
                const tx = await window.realWeb3Modal.signer.sendTransaction({
                    to: houseWallet,
                    value: ethers.parseEther(amount.toString()),
                    data: '0x' + Buffer.from(depositId).toString('hex') // Encode depositId for attribution
                });

                this.showNotification('📤 Transaction sent! Waiting for confirmation...', 'info');
                
                // Wait for confirmation
                const receipt = await tx.wait();
                
                if (receipt.status === 1) {
                    // Register deposit with backend for attribution
                    await this.registerDeposit(depositId, tx.hash, walletAddress, amount);
                    
                    this.showNotification(`✅ Deposit successful! ${amount} ETH will be credited shortly.`, 'success');
                } else {
                    throw new Error('Transaction failed on blockchain');
                }
                
            } else {
                throw new Error('Wallet not properly connected - please reconnect your wallet');
            }
            
        } catch (error) {
            console.error('Deposit error:', error);
            if (error.code === 4001) {
                throw new Error('Transaction cancelled by user');
            } else {
                throw new Error(error.message || 'Deposit transaction failed');
            }
        }
    }

    /**
     * 📝 Register deposit with backend for attribution
     */
    async registerDeposit(depositId, txHash, walletAddress, amount) {
        try {
            const response = await fetch('/api/deposit/register', {
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
                console.warn('Failed to register deposit with backend');
            }
        } catch (error) {
            console.warn('Failed to register deposit:', error);
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
