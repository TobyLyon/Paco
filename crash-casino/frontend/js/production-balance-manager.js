/**
 * 💰 Production Balance Manager (Frontend)
 * 
 * Casino-grade frontend balance management with:
 * - Optimistic Concurrency Control (OCC)
 * - Atomic operations with rollback
 * - Version-based synchronization
 * - Conflict resolution
 * - Real-time updates
 */

class ProductionBalanceManager {
    constructor(config = {}) {
        this.config = {
            apiBaseUrl: config.apiBaseUrl || '/api',
            syncInterval: config.syncInterval || 15000,
            maxRetries: config.maxRetries || 3,
            retryDelay: config.retryDelay || 1000,
            ...config
        };

        // Balance state with OCC version
        this.balance = {
            available: 0,
            locked: 0,
            total: 0,
            version: 0,
            availableWei: '0',
            lockedWei: '0'
        };

        // Operation tracking
        this.pendingOperations = new Map(); // clientId -> operation
        this.operationQueue = [];
        this.isProcessingQueue = false;

        // Event emitter for UI updates
        this.listeners = new Map();
        
        // Connection state
        this.isConnected = false;
        this.walletAddress = null;
        
        // Sync control
        this.syncInterval = null;
        this.lastSyncTime = 0;

        console.log('💰 Production Balance Manager initialized');
    }

    /**
     * 🚀 Initialize with wallet address
     */
    async initialize(walletAddress) {
        if (!walletAddress) {
            throw new Error('Wallet address required');
        }

        this.walletAddress = walletAddress.toLowerCase();
        console.log(`🚀 Initializing balance manager for: ${this.walletAddress}`);

        try {
            // Load initial balance
            await this.hardRefresh();
            
            // Start periodic sync
            this.startPeriodicSync();
            
            // Mark as connected
            this.isConnected = true;
            
            console.log('✅ Balance manager initialized successfully');
            this.emit('initialized', this.balance);
            
        } catch (error) {
            console.error('❌ Balance manager initialization failed:', error);
            throw error;
        }
    }

    /**
     * 🔄 Hard refresh from server (authoritative)
     */
    async hardRefresh() {
        try {
            const response = await fetch(`${this.config.apiBaseUrl}/balance/${this.walletAddress}`, {
                method: 'GET',
                headers: {
                    'Cache-Control': 'no-cache'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            // Update balance with server data
            const oldVersion = this.balance.version;
            this.balance = {
                available: data.available || 0,
                locked: data.locked || 0,
                total: (data.available || 0) + (data.locked || 0),
                version: data.version || 0,
                availableWei: data.availableWei || '0',
                lockedWei: data.lockedWei || '0'
            };

            this.lastSyncTime = Date.now();
            
            console.log(`🔄 Balance refreshed: ${this.balance.available.toFixed(4)} ETH (v${this.balance.version})`);
            
            if (oldVersion !== this.balance.version) {
                this.emit('balance_updated', this.balance);
            }

            return this.balance;

        } catch (error) {
            console.error('❌ Hard refresh failed:', error);
            throw error;
        }
    }

    /**
     * 🎯 Place bet with optimistic update and rollback
     */
    async placeBet(amountEth, roundId) {
        const clientId = this.generateClientId();
        const operation = {
            type: 'bet',
            clientId,
            amountEth,
            roundId,
            timestamp: Date.now(),
            status: 'pending'
        };

        console.log(`🎯 Placing bet: ${amountEth} ETH (client: ${clientId})`);

        try {
            // Optimistic update
            const snapshot = this.createSnapshot();
            this.applyOptimisticBet(amountEth);
            this.pendingOperations.set(clientId, operation);
            this.emit('balance_updated', this.balance);

            // Server request
            const response = await fetch(`${this.config.apiBaseUrl}/bet/place`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userAddress: this.walletAddress,
                    amountEth,
                    roundId,
                    clientId,
                    expectedVersion: snapshot.version
                })
            });

            const result = await response.json();

            if (!response.ok) {
                // Server rejected - handle specific errors
                this.handleBetError(result, snapshot, clientId);
                throw new Error(result.error || 'Bet placement failed');
            }

            // Success - update with server state
            this.applyServerBalance(result.newBalance);
            operation.status = 'confirmed';
            this.pendingOperations.delete(clientId);
            
            console.log(`✅ Bet confirmed: ${amountEth} ETH`);
            this.emit('bet_confirmed', { clientId, amountEth, newBalance: this.balance });
            
            return { success: true, clientId, newBalance: this.balance };

        } catch (error) {
            console.error('❌ Bet placement failed:', error);
            operation.status = 'failed';
            this.pendingOperations.delete(clientId);
            this.emit('bet_failed', { clientId, error: error.message });
            throw error;
        }
    }

    /**
     * 🏆 Process win notification
     */
    async processWin(winAmountEth, betAmountEth, roundId) {
        console.log(`🏆 Processing win: ${winAmountEth} ETH`);
        
        try {
            // Optimistic update
            this.applyOptimisticWin(winAmountEth, betAmountEth);
            this.emit('balance_updated', this.balance);
            
            // The server will send the authoritative update via Socket.IO
            // This optimistic update provides immediate UI feedback
            
            this.emit('win_processed', { winAmountEth, newBalance: this.balance });
            
        } catch (error) {
            console.error('❌ Win processing failed:', error);
            // Fallback to hard refresh on error
            await this.hardRefresh();
        }
    }

    /**
     * 💸 Process loss notification
     */
    async processLoss(betAmountEth, roundId) {
        console.log(`💸 Processing loss: ${betAmountEth} ETH`);
        
        try {
            // For losses, just unlock the amount (it goes to house)
            this.applyOptimisticLoss(betAmountEth);
            this.emit('balance_updated', this.balance);
            
            this.emit('loss_processed', { betAmountEth, newBalance: this.balance });
            
        } catch (error) {
            console.error('❌ Loss processing failed:', error);
            await this.hardRefresh();
        }
    }

    /**
     * 🔄 Handle server balance updates (from Socket.IO)
     */
    handleServerBalanceUpdate(serverBalance) {
        console.log(`🔄 Server balance update received (v${serverBalance.version})`);
        
        // Only apply if version is newer
        if (serverBalance.version > this.balance.version) {
            this.applyServerBalance(serverBalance);
            this.emit('balance_updated', this.balance);
        } else {
            console.log(`⚠️ Ignoring older server balance (v${serverBalance.version} <= v${this.balance.version})`);
        }
    }

    /**
     * ❌ Handle bet placement errors
     */
    handleBetError(errorResult, snapshot, clientId) {
        if (errorResult.error === 'VERSION_CONFLICT') {
            console.log('🔄 Version conflict detected, triggering hard refresh');
            // Restore snapshot and trigger refresh
            this.restoreSnapshot(snapshot);
            this.hardRefresh();
        } else if (errorResult.error === 'INSUFFICIENT_FUNDS') {
            console.log('💸 Insufficient funds, restoring balance');
            this.restoreSnapshot(snapshot);
        } else {
            console.log('❌ Unknown error, restoring balance');
            this.restoreSnapshot(snapshot);
        }
    }

    /**
     * 📸 Create balance snapshot
     */
    createSnapshot() {
        return { ...this.balance };
    }

    /**
     * 🔙 Restore balance from snapshot
     */
    restoreSnapshot(snapshot) {
        this.balance = { ...snapshot };
        this.emit('balance_updated', this.balance);
    }

    /**
     * ⚡ Apply optimistic bet (lock funds)
     */
    applyOptimisticBet(amountEth) {
        this.balance.available -= amountEth;
        this.balance.locked += amountEth;
        // Don't change total or version for optimistic updates
    }

    /**
     * 🏆 Apply optimistic win (unlock + add winnings)
     */
    applyOptimisticWin(winAmountEth, betAmountEth) {
        this.balance.locked -= betAmountEth; // Unlock original bet
        this.balance.available += winAmountEth; // Add winnings
        this.balance.total = this.balance.available + this.balance.locked;
    }

    /**
     * 💸 Apply optimistic loss (just unlock, funds go to house)
     */
    applyOptimisticLoss(betAmountEth) {
        this.balance.locked -= betAmountEth;
        this.balance.total = this.balance.available + this.balance.locked;
    }

    /**
     * 🌐 Apply server balance (authoritative)
     */
    applyServerBalance(serverBalance) {
        this.balance = {
            available: serverBalance.available || 0,
            locked: serverBalance.locked || 0,
            total: (serverBalance.available || 0) + (serverBalance.locked || 0),
            version: serverBalance.version || 0,
            availableWei: serverBalance.availableWei || '0',
            lockedWei: serverBalance.lockedWei || '0'
        };
    }

    /**
     * ⏰ Start periodic sync
     */
    startPeriodicSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }

        this.syncInterval = setInterval(async () => {
            try {
                // Only sync if no pending operations and reasonable time has passed
                if (this.pendingOperations.size === 0 && Date.now() - this.lastSyncTime > this.config.syncInterval) {
                    await this.hardRefresh();
                }
            } catch (error) {
                console.warn('⚠️ Periodic sync failed:', error);
            }
        }, this.config.syncInterval);
    }

    /**
     * 🛑 Stop periodic sync
     */
    stopPeriodicSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    /**
     * 🆔 Generate unique client ID
     */
    generateClientId() {
        return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 📡 Event emitter functionality
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`❌ Event listener error (${event}):`, error);
                }
            });
        }
    }

    /**
     * 📊 Get current balance
     */
    getBalance() {
        return { ...this.balance };
    }

    /**
     * 🏥 Get status
     */
    getStatus() {
        return {
            isConnected: this.isConnected,
            walletAddress: this.walletAddress,
            balance: this.balance,
            pendingOperations: this.pendingOperations.size,
            lastSyncTime: new Date(this.lastSyncTime).toISOString()
        };
    }

    /**
     * 🛑 Disconnect and cleanup
     */
    disconnect() {
        console.log('🛑 Disconnecting balance manager');
        
        this.stopPeriodicSync();
        this.isConnected = false;
        this.walletAddress = null;
        this.pendingOperations.clear();
        this.listeners.clear();
        
        this.balance = {
            available: 0,
            locked: 0,
            total: 0,
            version: 0,
            availableWei: '0',
            lockedWei: '0'
        };
    }
}

// Export for use in other modules
window.ProductionBalanceManager = ProductionBalanceManager;
