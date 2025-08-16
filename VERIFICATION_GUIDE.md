# 🎯 VERIFICATION GAUNTLET - Prove It's Casino-Grade

This is your **"flip the switch"** verification system to prove your crash casino is bulletproof before deploying with real ETH.

## 🚀 Quick Start

### Prerequisites
- Node.js installed
- Supabase database deployed with production schema
- Environment variables configured

### Run Complete Verification
```bash
# Linux/Mac
./run-verification.sh

# Windows
run-verification.bat
```

## 📋 What Gets Tested

### 🔥 CRITICAL TESTS (Must Pass)
These tests **MUST** pass before deployment. Failure = DO NOT DEPLOY.

#### 1. Database Invariants
- ✅ **No negative balances** - Any negative balance is a critical bug
- ✅ **Ledger-snapshot consistency** - Total ledger must equal account totals  
- ✅ **Idempotency violations** - No duplicate client_ids in ledger
- ✅ **Balance reconciliation** - Available + locked must match ledger

#### 2. Deposit Indexer 
- ✅ **Zero missed deposits** - All deposits must be detected
- ✅ **Reorg protection** - 25-block buffer prevents double-credits
- ✅ **Confirmation threshold** - 12-block confirmation working
- ✅ **WebSocket + polling** - Dual monitoring resilience

#### 3. Health Endpoints
- ✅ **Basic health** - API responding properly
- ✅ **Detailed health** - All services operational
- ✅ **Real-time invariants** - Live system integrity

#### 4. Game Fairness
- ✅ **Crash distribution** - 3% house edge verified
- ✅ **Instant crash rate** - ~3.03% as expected
- ✅ **RNG determinism** - Provably fair verification

### 🧪 PERFORMANCE TESTS (Should Pass)
These validate performance but won't block deployment.

#### 5. Socket Load Test
- 🌐 **100+ concurrent clients** - Realistic user load
- ⚡ **<150ms average latency** - Responsive betting
- 🔄 **Reconnection handling** - Event replay working
- 📊 **>99.5% success rate** - Reliability under load

#### 6. Chaos Testing
- 🌪️ **Database slowdowns** - Graceful degradation
- 💥 **RPC failures** - Circuit breaker behavior  
- 🚧 **Maintenance mode** - Controlled shutdown
- 🧠 **Memory pressure** - Resource constraint handling

## 🔧 Configuration

### Required Environment Variables
```bash
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Optional Configuration
```bash
# API endpoints
API_URL=http://localhost:3000          # Your backend API
SOCKET_URL=ws://localhost:3001         # Your WebSocket server

# Test control
SKIP_LOAD_TEST=false                   # Skip socket load test
SKIP_CHAOS_TEST=false                  # Skip chaos engineering tests
```

## 📊 Understanding Results

### ✅ SUCCESS - Ready for Deployment
```
🎉 VERIFICATION PASSED - READY FOR DEPLOYMENT!
💰 System is casino-grade and ready for real ETH

📊 Tests: 15/15 passed
🚨 Critical failures: 0
🏥 Overall status: READY FOR DEPLOYMENT
```

### ❌ FAILURE - Do Not Deploy
```
🚨 VERIFICATION FAILED - DO NOT DEPLOY
❌ Critical issues detected

📊 Tests: 12/15 passed  
🚨 Critical failures: 2
🏥 Overall status: NOT READY
```

## 🧪 Manual Testing Commands

### SQL Invariant Checks
Run these directly in Supabase/PSQL:

```sql
-- 1. Check for negative balances
SELECT user_id, available, locked
FROM accounts
WHERE available < 0 OR locked < 0;

-- 2. Verify ledger consistency  
WITH ledger_totals AS (
    SELECT
        SUM(CASE WHEN op_type = 'deposit' THEN amount ELSE 0 END) as deposits,
        SUM(CASE WHEN op_type = 'withdraw' THEN amount ELSE 0 END) as withdrawals,
        SUM(CASE WHEN op_type = 'bet_win' THEN amount ELSE 0 END) as wins,
        SUM(CASE WHEN op_type = 'bet_lose' THEN amount ELSE 0 END) as losses
    FROM ledger
),
snapshot_totals AS (
    SELECT 
        SUM(available + locked) as total_balance
    FROM accounts
)
SELECT 
    (deposits + wins - withdrawals - losses) as ledger_total,
    total_balance as snapshot_total,
    (deposits + wins - withdrawals - losses) - total_balance as drift
FROM ledger_totals CROSS JOIN snapshot_totals;
-- Drift MUST be 0

-- 3. Check idempotency violations
SELECT user_id, ref->>'client_id', COUNT(*)
FROM ledger
WHERE ref ? 'client_id'
GROUP BY 1,2
HAVING COUNT(*) > 1;
-- MUST return 0 rows
```

### Individual Test Components

```bash
# Run just database invariants
node crash-casino/verification/ledger-invariant-checks.sql

# Run just deposit indexer tests  
node crash-casino/verification/deposit-indexer-tests.js

# Run socket load test (100 clients, 1 minute)
N=100 DURATION_MS=60000 node crash-casino/verification/socket-load-test.js

# Run chaos tests
CHAOS_TESTING_ENABLED=true node crash-casino/verification/chaos-testing.js
```

## 🚨 Troubleshooting Common Failures

### Database Invariant Failures

**Negative Balances**
```sql
-- Fix negative balances with adjustment
INSERT INTO ledger(user_id, op_type, amount, ref)
VALUES ('affected-user-id', 'adjustment', ABS(negative_amount), 
        '{"reason": "negative_balance_fix", "client_id": "manual-fix-123"}');

UPDATE accounts SET available = 0, version = version + 1 
WHERE user_id = 'affected-user-id' AND available < 0;
```

**Ledger Drift**
```sql
-- Find the discrepancy source
SELECT op_type, SUM(amount) FROM ledger GROUP BY op_type;

-- Compare with account totals
SELECT SUM(available), SUM(locked) FROM accounts;
```

### Deposit Indexer Issues

**Missed Deposits**
```bash
# Rewind checkpoint and reprocess
curl -X POST localhost:3000/api/deposits/trigger-indexer

# Force process specific transaction
curl -X POST localhost:3000/api/deposits/force-process \
  -H "Content-Type: application/json" \
  -d '{"txHash": "0x...", "userAddress": "0x..."}'
```

**Reorg Protection**
- Check if `last_processed_block` is too aggressive
- Increase `INDEXER_REORG_BUFFER` from 25 to 50 blocks
- Verify confirmation threshold is adequate for network

### Performance Issues

**High Socket Latency**
- Check database connection pooling
- Verify WebSocket event buffer size
- Monitor CPU and memory usage

**Load Test Failures**
- Increase server resources
- Check for memory leaks
- Verify database performance

## 📈 Production Deployment Checklist

After verification passes:

- [ ] **Deploy with small limits** - Start with 0.01 ETH max bet
- [ ] **Monitor health endpoints** - `/health/detailed` every minute
- [ ] **Set up alerts** - Invariant violations, indexer lag, high latency
- [ ] **Watch funds flow** - House wallet, hot wallet balances
- [ ] **Test real deposits** - Small amounts first
- [ ] **Verify cashouts** - Ensure payouts work correctly
- [ ] **Scale gradually** - Increase limits as confidence grows

## 🔄 Regular Verification

Run verification:
- **Before every deployment**
- **Weekly in production** 
- **After any database changes**
- **When adding new features**
- **If any anomalies detected**

## 📞 Emergency Procedures

### Critical Failure Detected
1. **PAUSE ALL BETTING** - Set `MAINTENANCE_PAUSE_BETS=true`
2. **Stop new deposits** - Set `DISABLE_DEPOSITS=true`  
3. **Freeze withdrawals** - Set `FREEZE_WITHDRAWALS=true`
4. **Run full verification** - Identify exact issue
5. **Fix and re-verify** - Don't resume until all tests pass

### Runbook Commands
```bash
# Emergency pause (add to environment)
export MAINTENANCE_PAUSE_BETS=true
export DISABLE_DEPOSITS=true  
export FREEZE_WITHDRAWALS=true

# Force invariant recheck
curl -X POST localhost:3000/internal/recheck-invariants

# Manual balance reconciliation
node crash-casino/tools/reconcile-balances.js
```

## 🎯 Success Criteria

**Ready for real ETH when:**
- ✅ All critical tests pass consistently
- ✅ No negative balances or ledger drift  
- ✅ Deposit indexer catches 100% of transactions
- ✅ Health endpoints return healthy status
- ✅ Load tests show good performance
- ✅ Chaos tests prove graceful degradation
- ✅ Game fairness verified mathematically

**Never deploy with:**
- ❌ Any critical test failures
- ❌ Negative balances in database
- ❌ Ledger-snapshot drift ≠ 0
- ❌ Missed deposits in testing
- ❌ Health check failures
- ❌ Unfair game mathematics

This verification gauntlet ensures your crash casino is truly **casino-grade** and ready for real money! 🎰💰
