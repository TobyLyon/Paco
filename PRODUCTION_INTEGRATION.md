# 🔗 PRODUCTION INTEGRATION GUIDE

How to wire all the production components together for your main server file.

## 📦 Main Server Integration

Update your main server file (e.g., `server.js` or `app.js`) to include all production components:

```javascript
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');

// Production components
const PrometheusMetrics = require('./crash-casino/backend/prometheus-metrics');
const InvariantHealthEndpoint = require('./crash-casino/backend/health-invariants-endpoint');
const VerifySeedsEndpoint = require('./crash-casino/backend/verify-seeds-endpoint');
const NonceManager = require('./crash-casino/backend/nonce-manager');
const ProductionBalanceAPI = require('./crash-casino/backend/production-balance-api');
const ProductionDepositIndexer = require('./crash-casino/backend/production-deposit-indexer');
const ProductionSocketManager = require('./crash-casino/backend/production-socket-manager');

const app = express();
const server = createServer(app);
const io = new Server(server);

// Initialize production systems
const metrics = new PrometheusMetrics();
const healthEndpoint = new InvariantHealthEndpoint(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);
const verifyEndpoint = new VerifySeedsEndpoint(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);
const nonceManager = new NonceManager({
    chainId: parseInt(process.env.CHAIN_ID),
    rpcUrl: process.env.RPC_PRIMARY,
    privateKey: process.env.HOUSE_WALLET_PRIVATE_KEY
});
const balanceAPI = new ProductionBalanceAPI(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);
const depositIndexer = new ProductionDepositIndexer({
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    hotWalletAddress: process.env.HOT_WALLET_ADDRESS
});
const socketManager = new ProductionSocketManager(io);

// Make components globally available
global.metrics = metrics;
global.balanceAPI = balanceAPI;
global.nonceManager = nonceManager;
global.depositIndexer = depositIndexer;
global.socketManager = socketManager;

// Middleware
app.use(express.json());
app.use(metrics.getMiddleware()); // Automatic API metrics

// Health endpoints
app.use(healthEndpoint.getRouter());
app.use(verifyEndpoint.getRouter());

// Metrics endpoint for Prometheus
app.get('/metrics', metrics.getMetricsHandler());

// Initialize systems
async function initializeProduction() {
    console.log('🚀 Initializing production systems...');
    
    // Initialize nonce manager
    await nonceManager.initialize();
    
    // Start deposit indexer
    await depositIndexer.start();
    
    console.log('✅ Production systems initialized');
}

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, async () => {
    console.log(`🎰 Casino server running on port ${PORT}`);
    await initializeProduction();
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('🛑 Graceful shutdown initiated...');
    await depositIndexer.stop();
    await socketManager.shutdown();
    server.close();
});
```

## 🎯 Game Engine Integration

Update your crash game engine to use production metrics:

```javascript
// In your crash game engine file
class CrashGameEngine {
    
    startRound() {
        // Record round start
        global.metrics?.recordRoundStart();
        global.socketManager?.emitGlobalGameEvent('round_start', {
            roundId: this.currentRoundId,
            startTime: Date.now()
        });
    }
    
    crashRound(crashValue) {
        const duration = Date.now() - this.roundStartTime;
        
        // Record crash metrics
        global.metrics?.recordRoundCrash('prod', crashValue, duration / 1000);
        global.socketManager?.emitGlobalGameEvent('round_crash', {
            roundId: this.currentRoundId,
            crashValue,
            duration
        });
    }
    
    async placeBet(userId, amount, clientId) {
        const start = Date.now();
        
        try {
            const result = await global.balanceAPI.placeBet(
                userId, amount, this.currentRoundId, clientId, expectedVersion
            );
            
            const duration = Date.now() - start;
            global.metrics?.recordBetPlacement('prod', duration, 'success');
            
            return result;
            
        } catch (error) {
            const duration = Date.now() - start;
            const status = error.message === 'VERSION_CONFLICT' ? 'conflict' : 'failed';
            global.metrics?.recordBetPlacement('prod', duration, status);
            throw error;
        }
    }
}
```

## 📊 Monitoring Integration

Add this to your environment file for complete monitoring:

```bash
# Add to your .env.production
METRICS_ENABLED=true
METRICS_PROM_PORT=9464

# Health check intervals
HEALTH_CHECK_INTERVAL=30000
INVARIANT_CHECK_INTERVAL=60000

# Alert thresholds
ALERT_LEDGER_DRIFT_WEI=0
ALERT_INDEXER_LAG_BLOCKS=18
ALERT_HOT_WALLET_MIN_WEI=500000000000000000
```

## 🚨 Alert Integration

Connect to your alerting system:

```javascript
// Example Grafana/Prometheus alerts
const alertRules = `
groups:
- name: casino_critical
  rules:
  - alert: LedgerDriftCritical
    expr: casino_ledger_snapshot_drift_wei != 0
    for: 0m
    severity: critical
    annotations:
      summary: "CRITICAL: Ledger drift detected"
      
  - alert: IndexerLagHigh  
    expr: casino_indexer_confirmed_lag_blocks > 18
    for: 3m
    severity: high
    annotations:
      summary: "Indexer lagging behind blockchain"
      
  - alert: HotWalletLow
    expr: casino_hot_wallet_eth_wei < 500000000000000000
    for: 1m
    severity: high
    annotations:
      summary: "Hot wallet balance critically low"
`;
```

## 🔗 API Route Integration

Add production endpoints to your API:

```javascript
// In your main router
app.use('/api/bet', require('./routes/betting')); // Your existing routes
app.use('/api/balance', require('./routes/balance')); // Your existing routes

// Production endpoints
app.use('/', healthEndpoint.getRouter()); // /health/*, /internal/health/invariants
app.use('/', verifyEndpoint.getRouter()); // /verify, /verify/:roundId

// Admin endpoints (protect with auth)
app.use('/admin', authMiddleware, require('./routes/admin'));

// Internal endpoints (IP restrict in production)
app.post('/internal/health/invariants/recheck', healthEndpoint.handleForceRecheck);
app.get('/internal/nonce/status', (req, res) => {
    res.json(global.nonceManager.getStatus());
});
app.post('/internal/nonce/refresh', async (req, res) => {
    await global.nonceManager.refreshNonce();
    res.json({ success: true });
});
```

## 🎮 Frontend Integration

Update your frontend to use production endpoints:

```javascript
// In your main frontend JS
class ProductionCasinoClient {
    constructor() {
        this.healthCheckInterval = setInterval(() => {
            this.checkSystemHealth();
        }, 30000); // Check every 30 seconds
    }
    
    async checkSystemHealth() {
        try {
            const response = await fetch('/health/detailed');
            const health = await response.json();
            
            if (health.status !== 'healthy') {
                this.showMaintenanceBanner();
            }
            
        } catch (error) {
            console.warn('Health check failed:', error);
        }
    }
    
    showMaintenanceBanner() {
        // Show user-friendly maintenance message
        const banner = document.createElement('div');
        banner.className = 'maintenance-banner';
        banner.innerHTML = '⚠️ System maintenance in progress. Betting temporarily paused.';
        document.body.appendChild(banner);
    }
}

// Initialize
const casino = new ProductionCasinoClient();
```

## 🔧 Docker Integration (Optional)

If using Docker, here's a production-ready setup:

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000 9464

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["npm", "start"]
```

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  casino:
    build: .
    ports:
      - "3000:3000"
      - "9464:9464"
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    restart: unless-stopped
    
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      
  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

## 🎯 Deployment Commands

Final deployment sequence:

```bash
# 1. Tag release
git tag v1.0-mainnet
git push origin v1.0-mainnet

# 2. Deploy database schema
psql $DATABASE_URL -f crash-casino/database/production-ledger-schema.sql

# 3. Set production environment
cp production.env.template .env.production
# Edit .env.production with your values

# 4. Run verification
./run-verification.sh

# 5. Deploy application
pm2 start ecosystem.config.js --env production

# 6. Verify deployment
curl localhost:3000/health/detailed
curl localhost:3000/internal/health/invariants
```

This integration gives you a complete, production-ready crash casino with casino-grade monitoring, error handling, and operational procedures! 🎰💰
