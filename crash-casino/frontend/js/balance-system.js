/**
 * 💰 Balance-Based Betting System
 * 
 * Allows users to deposit a lump sum and bet seamlessly without individual transactions
 */

class BalanceSystem {
    constructor() {
        this.userBalance = 0;
        this.depositAddress = null;
        this.pendingDeposits = new Map();
        this.isInitialized = false;
    }

    /**
     * 🏦 Initialize balance system
     */
    async init() {
        if (this.isInitialized) return;
        
        // Get user's deposit address (could be their wallet address or a generated address)
        this.depositAddress = window.ethereum?.selectedAddress || window.realWeb3Modal?.address;
        
        if (!this.depositAddress) {
            throw new Error('No wallet connected');
        }

        // Load existing balance from backend
        await this.loadBalance();
        
        // Start monitoring for deposits
        this.startDepositMonitoring();
        
        this.isInitialized = true;
        console.log('💰 Balance system initialized');
    }

    /**
     * 📥 Load current balance from backend
     */
    async loadBalance() {
        try {
            const response = await fetch('/api/balance/' + this.depositAddress);
            if (response.ok) {
                const data = await response.json();
                this.userBalance = parseFloat(data.balance || 0);
                this.updateBalanceUI();
            }
        } catch (error) {
            console.warn('Could not load balance:', error);
        }
    }

    /**
     * 💸 Place bet using balance (no transaction required)
     */
    async placeBet(amount) {
        if (this.userBalance < amount) {
            throw new Error(`Insufficient balance. You have ${this.userBalance.toFixed(4)} ETH, need ${amount} ETH`);
        }

        // Optimistically update balance
        this.userBalance -= amount;
        this.updateBalanceUI();

        try {
            // Send bet to backend using balance
            const response = await fetch('/api/bet/balance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    playerAddress: this.depositAddress,
                    amount: amount,
                    useBalance: true
                })
            });

            if (!response.ok) {
                // Revert balance on error
                this.userBalance += amount;
                this.updateBalanceUI();
                throw new Error('Bet failed');
            }

            const result = await response.json();
            console.log(`💰 Balance bet placed: ${amount} ETH (remaining: ${this.userBalance.toFixed(4)} ETH)`);
            return result;

        } catch (error) {
            // Revert balance on error
            this.userBalance += amount;
            this.updateBalanceUI();
            throw error;
        }
    }

    /**
     * 💰 Add winnings to balance
     */
    addWinnings(amount) {
        this.userBalance += amount;
        this.updateBalanceUI();
        console.log(`🎉 Winnings added: ${amount} ETH (new balance: ${this.userBalance.toFixed(4)} ETH)`);
    }

    /**
     * 📊 Get current balance
     */
    getBalance() {
        return this.userBalance;
    }

    /**
     * 🏦 Create deposit instructions
     */
    getDepositInstructions() {
        const houseWallet = '0x1f8B1c4D05eF17Ebaa1E572426110146691e6C5a'; // House wallet address
        
        return {
            address: houseWallet,
            memo: this.depositAddress.slice(-8), // Last 8 chars as memo for attribution
            instructions: `
                🏦 **Deposit Instructions:**
                
                1. Send ETH to: **${houseWallet}**
                2. Include memo: **${this.depositAddress.slice(-8)}** (for attribution)
                3. Funds will be credited to your balance automatically
                4. Minimum deposit: **0.01 ETH**
                
                ⚡ **Benefits:**
                - No transaction delays for bets
                - Instant betting experience  
                - Lower gas costs (one deposit vs many bets)
            `
        };
    }

    /**
     * 👀 Monitor for deposits
     */
    startDepositMonitoring() {
        // Check for new deposits every 30 seconds
        setInterval(async () => {
            await this.checkForDeposits();
        }, 30000);
    }

    /**
     * 🔍 Check for new deposits
     */
    async checkForDeposits() {
        try {
            const response = await fetch('/api/deposits/check/' + this.depositAddress);
            if (response.ok) {
                const data = await response.json();
                if (data.newDeposits && data.newDeposits.length > 0) {
                    for (const deposit of data.newDeposits) {
                        this.userBalance += parseFloat(deposit.amount);
                        this.showDepositNotification(deposit.amount, deposit.txHash);
                    }
                    this.updateBalanceUI();
                }
            }
        } catch (error) {
            console.warn('Could not check deposits:', error);
        }
    }

    /**
     * 📱 Update balance in UI
     */
    updateBalanceUI() {
        const balanceElement = document.getElementById('userBalance');
        if (balanceElement) {
            balanceElement.textContent = `${this.userBalance.toFixed(4)} ETH`;
        }

        // Update bet interface
        if (window.betInterface) {
            window.betInterface.onBalanceUpdate?.(this.userBalance);
        }
    }

    /**
     * 🎉 Show deposit notification
     */
    showDepositNotification(amount, txHash) {
        if (window.BetInterface) {
            window.BetInterface.showNotification(
                `💰 Deposit confirmed: ${amount} ETH!`, 
                'success'
            );
        }
        console.log(`💰 Deposit confirmed: ${amount} ETH (tx: ${txHash})`);
    }

    /**
     * 💸 Withdraw balance
     */
    async withdraw(amount) {
        if (this.userBalance < amount) {
            throw new Error('Insufficient balance');
        }

        // Send withdrawal request
        const response = await fetch('/api/withdraw', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                playerAddress: this.depositAddress,
                amount: amount
            })
        });

        if (!response.ok) {
            throw new Error('Withdrawal failed');
        }

        this.userBalance -= amount;
        this.updateBalanceUI();
        
        const result = await response.json();
        console.log(`💸 Withdrawal initiated: ${amount} ETH (tx: ${result.txHash})`);
        return result;
    }
}

// Global instance
window.balanceSystem = new BalanceSystem();
