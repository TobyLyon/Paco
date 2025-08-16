# 🏗️ Production Implementation Guide

This guide walks you through implementing the production-grade architecture for your crash casino based on the GPT recommendations.

## 📋 Implementation Checklist

### Phase 1: Database Schema Migration
- [ ] **Deploy ledger schema** (`production-ledger-schema.sql`)
- [ ] **Migrate existing balances** to new accounts table
- [ ] **Create RPC functions** for atomic operations
- [ ] **Test idempotency** with duplicate operations
- [ ] **Verify balance reconciliation** views

### Phase 2: Backend API Updates
- [ ] **Replace balance-api.js** with `production-balance-api.js`
- [ ] **Update unified-production-integration.js** to use new API
- [ ] **Implement deposit indexer** (`production-deposit-indexer.js`)
- [ ] **Add Socket.IO manager** (`production-socket-manager.js`)
- [ ] **Add health check endpoints**

### Phase 3: Frontend Integration
- [ ] **Add production balance manager** (`production-balance-manager.js`)
- [ ] **Update bet-interface-clean.js** to use new manager
- [ ] **Implement optimistic updates** with rollback
- [ ] **Add version conflict handling**
- [ ] **Test reconnection scenarios**

### Phase 4: Production Hardening
- [ ] **Setup monitoring** and alerts
- [ ] **Configure circuit breakers**
- [ ] **Implement rate limiting**
- [ ] **Add comprehensive logging**
- [ ] **Setup backup systems**

## 🗄️ Database Migration Steps

### 1. Create New Schema
```sql
-- Run the production-ledger-schema.sql
-- This creates the new ledger system alongside existing tables
```

### 2. Migrate Existing Balances
```sql
-- Migrate existing user_balances to new accounts table
INSERT INTO accounts (user_id, available, locked, version)
SELECT 
    address::uuid,
    (balance * 1e18)::numeric(78,0), -- Convert ETH to wei
    0,
    1
FROM user_balances
ON CONFLICT (user_id) DO NOTHING;

-- Create initial ledger entries for existing balances
INSERT INTO ledger (user_id, op_type, amount, ref)
SELECT 
    address::uuid,
    'adjustment',
    (balance * 1e18)::numeric(78,0),
    jsonb_build_object(
        'op_type', 'adjustment',
        'client_id', gen_random_uuid(),
        'note', 'Initial migration',
        'timestamp', extract(epoch from now())
    )
FROM user_balances;
```

### 3. Test New System
```sql
-- Test placing a bet
SELECT * FROM rpc_place_bet(
    'user-uuid-here'::uuid,
    '1000000000000000'::numeric, -- 0.001 ETH in wei
    'round-uuid-here'::uuid,
    'client-uuid-here'::uuid,
    1 -- expected version
);

-- Verify balance consistency
SELECT * FROM balance_reconciliation;
```

## 🔄 Backend Integration Steps

### 1. Update Main Integration File
```javascript
// In unified-production-integration.js
const ProductionBalanceAPI = require('./backend/production-balance-api');
const ProductionSocketManager = require('./backend/production-socket-manager');

class UnifiedPacoRockoProduction {
    constructor(expressApp, config = {}) {
        // Replace existing balance API
        this.balanceAPI = new ProductionBalanceAPI(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );
        
        // Add socket manager
        this.socketManager = new ProductionSocketManager(this.io);
    }
    
    async handleCashout(socket) {
        const clientId = crypto.randomUUID();
        const playerId = this.getPlayerIdFromSocket(socket);
        
        try {
            // Process win with atomic operation
            const result = await this.balanceAPI.processWin(
                playerId,
                winAmount,
                betAmount,
                roundId,
                clientId
            );
            
            // Emit balance update to user
            this.socketManager.emitToUser(playerId, 'balance_update', result.newBalance);
            
        } catch (error) {
            if (error.message === 'VERSION_CONFLICT') {
                // Handle version conflict
                socket.emit('version_conflict', { error: 'Balance changed, please refresh' });
            } else {
                socket.emit('cashout_error', { error: error.message });
            }
        }
    }
}
```

### 2. Setup Deposit Indexer
```javascript
// In server.js or main app file
const ProductionDepositIndexer = require('./backend/production-deposit-indexer');

const indexer = new ProductionDepositIndexer({
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    hotWalletAddress: process.env.HOT_WALLET_ADDRESS,
    confirmations: 12,
    reorgBuffer: 25
});

// Start indexer
indexer.start();

// Add health check endpoint
app.get('/health/indexer', async (req, res) => {
    const status = await indexer.getStatus();
    res.json(status);
});
```

## 🖥️ Frontend Integration Steps

### 1. Initialize Production Balance Manager
```javascript
// In bet-interface-clean.js, replace existing balance logic

class BetInterface {
    constructor() {
        // Replace userBalance with production manager
        this.balanceManager = null;
    }
    
    async initializeBalance() {
        const walletAddress = window.ethereum?.selectedAddress;
        if (!walletAddress) return;
        
        // Initialize production balance manager
        this.balanceManager = new ProductionBalanceManager({
            apiBaseUrl: '/api',
            syncInterval: 15000
        });
        
        // Setup event listeners
        this.balanceManager.on('balance_updated', (balance) => {
            this.updateBalanceDisplay(balance);
        });
        
        this.balanceManager.on('bet_confirmed', (data) => {
            this.showNotification('success', `Bet placed: ${data.amountEth} ETH`);
        });
        
        this.balanceManager.on('bet_failed', (data) => {
            this.showNotification('error', `Bet failed: ${data.error}`);
        });
        
        // Initialize
        await this.balanceManager.initialize(walletAddress);
    }
    
    async placeBetWithBalance(amount) {
        if (!this.balanceManager) {
            throw new Error('Balance manager not initialized');
        }
        
        try {
            const result = await this.balanceManager.placeBet(
                amount,
                this.getCurrentRoundId()
            );
            
            return result;
            
        } catch (error) {
            if (error.message === 'VERSION_CONFLICT') {
                this.showNotification('warning', 'Balance updated, please try again');
            } else if (error.message === 'INSUFFICIENT_FUNDS') {
                this.showNotification('error', 'Insufficient balance');
            } else {
                this.showNotification('error', `Bet failed: ${error.message}`);
            }
            throw error;
        }
    }
}
```

### 2. Socket.IO Client Updates
```javascript
// Enhanced socket client with event replay
class CrashGameClient {
    constructor() {
        this.lastEventId = 0;
        this.isReconnecting = false;
    }
    
    connect() {
        this.socket = io(this.serverUrl);
        
        this.socket.on('connect', () => {
            // Send hello with last event ID for replay
            this.socket.emit('hello', {
                lastEventId: this.lastEventId,
                userId: this.walletAddress
            });
        });
        
        this.socket.on('event', (event) => {
            this.lastEventId = event.id;
            this.handleGameEvent(event);
        });
        
        this.socket.on('snapshot', (snapshot) => {
            this.lastEventId = snapshot.eventId;
            this.handleFullSnapshot(snapshot);
        });
        
        this.socket.on('disconnect', () => {
            this.handleDisconnection();
        });
    }
    
    handleGameEvent(event) {
        switch (event.type) {
            case 'balance_update':
                if (window.betInterface?.balanceManager) {
                    window.betInterface.balanceManager.handleServerBalanceUpdate(event.payload);
                }
                break;
            case 'round_start':
                this.handleRoundStart(event.payload);
                break;
            case 'round_crash':
                this.handleRoundCrash(event.payload);
                break;
        }
    }
}
```

## 🏥 Health Monitoring Setup

### 1. Health Check Endpoints
```javascript
// Add to your Express app
app.get('/health', async (req, res) => {
    const health = {
        server: 'healthy',
        timestamp: new Date().toISOString(),
        services: {}
    };
    
    // Check balance API
    try {
        const balanceHealth = await balanceAPI.healthCheck();
        health.services.balance = balanceHealth;
    } catch (error) {
        health.services.balance = { healthy: false, error: error.message };
    }
    
    // Check indexer
    try {
        const indexerHealth = await indexer.getStatus();
        health.services.indexer = indexerHealth;
    } catch (error) {
        health.services.indexer = { healthy: false, error: error.message };
    }
    
    // Check socket manager
    health.services.sockets = socketManager.getHealthStatus();
    
    res.json(health);
});
```

### 2. Metrics and Monitoring
```javascript
// Add metrics collection
const metrics = {
    betsPlaced: 0,
    balanceUpdates: 0,
    socketConnections: 0,
    errors: 0
};

// In your bet placement logic
metrics.betsPlaced++;

// Expose metrics endpoint
app.get('/metrics', (req, res) => {
    res.json({
        ...metrics,
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});
```

## 🚀 Deployment Steps

### 1. Environment Variables
```bash
# Add to your .env file
HOUSE_WALLET_PRIVATE_KEY=your_private_key
HOT_WALLET_ADDRESS=0x02B4bFbA6D16308F5B40A5DF1f136C9472da52FF
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Indexer settings
INDEXER_CONFIRMATIONS=12
INDEXER_REORG_BUFFER=25
INDEXER_POLL_INTERVAL=1500
```

### 2. Testing Checklist
- [ ] **Place bet** with sufficient balance
- [ ] **Place bet** with insufficient balance (should fail gracefully)
- [ ] **Version conflict** test (concurrent bets from same user)
- [ ] **Socket reconnection** (disconnect and reconnect)
- [ ] **Deposit detection** (send ETH to hot wallet)
- [ ] **Balance reconciliation** (verify ledger matches accounts)
- [ ] **Cashout processing** (win and loss scenarios)

### 3. Production Deployment
1. **Deploy database schema** to production
2. **Migrate existing data** carefully
3. **Deploy new backend code** with feature flags
4. **Test with small amounts** first
5. **Monitor logs and metrics** closely
6. **Gradually increase limits**

## 🔧 Troubleshooting Guide

### Balance Inconsistencies
```sql
-- Check balance reconciliation
SELECT 
    user_id,
    total_credits - total_debits as calculated_balance,
    (SELECT available + locked FROM accounts WHERE accounts.user_id = br.user_id) as account_balance
FROM balance_reconciliation br
WHERE total_credits - total_debits != (SELECT available + locked FROM accounts WHERE accounts.user_id = br.user_id);
```

### Missed Deposits
```javascript
// Manual reprocess block range
await indexer.manualReprocess(startBlock, endBlock);
```

### Version Conflicts
- Check for concurrent operations
- Verify client is sending correct expectedVersion
- Ensure balance manager is properly handling conflicts

This production architecture provides casino-grade reliability with proper error handling, atomic operations, and zero race conditions. Follow the implementation phases carefully and test thoroughly at each step.
