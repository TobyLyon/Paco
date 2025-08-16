# 🚨 DAY-1 OPERATIONS SHEET
**Print this page. Keep it handy during launch.**

## ⚡ EMERGENCY KILL SWITCHES
**Execute immediately if ANY critical alert fires**

```bash
# 🚧 PAUSE ALL BETTING (keeps rounds visible)
export MAINTENANCE_PAUSE_BETS=true

# 🛑 DISABLE NEW DEPOSITS  
export DISABLE_DEPOSITS=true

# 🧊 FREEZE ALL WITHDRAWALS
export DISABLE_WITHDRAWALS=true

# ⏸️ STOP ROUND LOOP
export PAUSE_ROUND_LOOP=true

# Restart services to apply
pm2 restart casino-backend
```

## 🔔 CRITICAL ALERTS → IMMEDIATE ACTIONS

### 🚨 `ledger_snapshot_drift_wei != 0`
**SEVERITY: CRITICAL - Stop everything immediately**

```bash
# 1. EMERGENCY STOP
export MAINTENANCE_PAUSE_BETS=true
pm2 restart casino-backend

# 2. Check drift amount
curl -s localhost:3000/internal/health/invariants | jq '.checks[] | select(.name=="ledger_snapshot_consistency")'

# 3. Run manual reconciliation
psql $DATABASE_URL -f crash-casino/verification/ledger-invariant-checks.sql

# 4. If drift > 0.01 ETH → PAGE IMMEDIATELY
# 5. Never resume until drift = 0
```

### 🚨 `casino_indexer_confirmed_lag_blocks > 18`
**SEVERITY: HIGH - Deposits may be delayed**

```bash
# 1. Check indexer status
curl -s localhost:3000/health/indexer

# 2. Restart indexer
pm2 restart deposit-indexer

# 3. Force rewind and rescan
curl -X POST localhost:3000/api/deposits/trigger-indexer

# 4. Monitor recovery
watch "curl -s localhost:3000/health/indexer | jq '.lag'"
```

### 🚨 `casino_hot_wallet_eth_wei < HOT_WALLET_MIN_WEI`
**SEVERITY: HIGH - Payouts may fail**

```bash
# 1. Check wallet balances
curl -s localhost:3000/internal/health/invariants | jq '.checks[] | select(.name=="hot_wallet_balance")'

# 2. Auto top-up from house wallet (if configured)
curl -X POST localhost:3000/internal/topup-hot-wallet

# 3. Manual transfer if auto-topup fails
# Send HOT_WALLET_TOPUP_WEI from house to hot wallet

# 4. Monitor balance recovery
watch "curl -s localhost:3000/health/detailed | jq '.services.balance'"
```

### 🚨 `casino_rtp_percentage outside 97% ± 0.8%`
**SEVERITY: MEDIUM - Game fairness issue**

```bash
# 1. Check RTP over different windows
curl -s localhost:3000/internal/health/invariants | jq '.checks[] | select(.name=="rtp_percentage")'

# 2. Verify recent rounds
curl -s localhost:3000/verify/recent?count=1000

# 3. If RTP drift > 1.5% → investigate seed generation
# 4. Consider pausing new rounds until resolved
```

## 📊 MONITORING COMMANDS

### Quick Health Check
```bash
# Overall system health
curl -s localhost:3000/health/detailed | jq '.status'

# Critical invariants
curl -s localhost:3000/internal/health/invariants | jq '.violations'

# Key metrics
curl -s localhost:3000/metrics | grep -E "casino_(ledger_snapshot_drift|indexer_lag|socket_clients)"
```

### Detailed Status
```bash
# Database invariants (should return 0 rows for each)
psql $DATABASE_URL -f crash-casino/verification/ledger-invariant-checks.sql

# Active players and balances
psql $DATABASE_URL -c "SELECT COUNT(*) as accounts, SUM(available+locked)/1e18 as total_eth FROM accounts;"

# Recent activity
psql $DATABASE_URL -c "SELECT op_type, COUNT(*), SUM(amount)/1e18 as total_eth FROM ledger WHERE created_at > NOW() - INTERVAL '1 hour' GROUP BY op_type;"
```

## 🔧 COMMON INCIDENT RESPONSES

### "Deposit Missing" Report
```bash
# 1. Get transaction hash from user
TX_HASH="0x..."

# 2. Check if we've seen it
psql $DATABASE_URL -c "SELECT * FROM deposits_seen WHERE tx_hash = '$TX_HASH';"

# 3. If not found, force reprocess
curl -X POST localhost:3000/api/deposits/force-process -d '{"txHash":"'$TX_HASH'"}' -H "Content-Type: application/json"

# 4. If still not credited, manual adjustment
psql $DATABASE_URL -c "INSERT INTO ledger(user_id, op_type, amount, ref) VALUES ('$USER_ID', 'adjustment', '$AMOUNT_WEI', '{\"reason\":\"manual_deposit_fix\",\"tx_hash\":\"$TX_HASH\"}');"
```

### "Withdrawal Stuck" Report
```bash
# 1. Check nonce manager status
curl -s localhost:3000/health/nonce

# 2. Check pending transactions
curl -s localhost:3000/internal/pending-withdrawals

# 3. If nonce stuck, refresh and retry
curl -X POST localhost:3000/internal/refresh-nonce
curl -X POST localhost:3000/internal/retry-pending

# 4. Manual intervention if needed
# Use house wallet to send ETH directly, then mark withdrawal complete
```

### "Balance Wrong" Report
```bash
# 1. Check user's ledger history
psql $DATABASE_URL -c "SELECT * FROM ledger WHERE user_id = '$USER_ID' ORDER BY created_at DESC LIMIT 20;"

# 2. Check account snapshot
psql $DATABASE_URL -c "SELECT * FROM accounts WHERE user_id = '$USER_ID';"

# 3. Force balance refresh
curl -X POST localhost:3000/api/balance/refresh -d '{"userAddress":"'$USER_ID'"}' -H "Content-Type: application/json"
```

## 📈 LAUNCH SEQUENCE (T-0 to T+24h)

### T-0:00 (GO TIME)
- [ ] Enable deposits: `DISABLE_DEPOSITS=false`
- [ ] Keep withdrawals disabled: `DISABLE_WITHDRAWALS=true`
- [ ] Team does 3 test deposits each
- [ ] Verify: `curl localhost:3000/internal/health/invariants`

### T+1h (ENABLE WITHDRAWALS)
- [ ] `DISABLE_WITHDRAWALS=false`
- [ ] `FREEZE_WITHDRAWALS_OVER_WEI=200000000000000000` (0.2 ETH)
- [ ] Process 3-5 test withdrawals
- [ ] Check nonce manager: `curl localhost:3000/health/nonce`

### T+6h (LIFT CAPS)
- [ ] `FREEZE_WITHDRAWALS_OVER_WEI=1000000000000000000` (1 ETH)
- [ ] Remove manual review for small amounts
- [ ] Monitor metrics dashboard

### T+24h (FULL OPERATION)
- [ ] Review 24h metrics
- [ ] Check RTP: should be 97% ± 0.8%
- [ ] Error rate: < 0.5%
- [ ] If all green → remove withdrawal caps

## 🔗 IMPORTANT URLS

- **Health Dashboard**: `http://localhost:3000/health/detailed`
- **Invariants Check**: `http://localhost:3000/internal/health/invariants`
- **Metrics**: `http://localhost:3000/metrics`
- **Verification Page**: `http://localhost:3000/verify`
- **Admin Panel**: `http://localhost:3000/admin` (if implemented)

## 📞 ESCALATION

### Page Immediately If:
- `ledger_snapshot_drift_wei != 0`
- `casino_indexer_confirmed_lag_blocks > 25`
- `casino_hot_wallet_eth_wei < 0.1 ETH`
- Any invariant check returns violations
- Error rate > 2% for 5+ minutes
- RTP outside 97% ± 1.5% over 10k rounds

### Call Team If:
- Socket clients drop > 50% suddenly
- API latency p95 > 300ms for 10+ minutes
- Withdrawal queue > 30 minutes old
- Manual intervention needed

## 🧯 ROLLBACK PLAN
```bash
# 1. IMMEDIATE STOP
export MAINTENANCE_PAUSE_BETS=true
export DISABLE_DEPOSITS=true  
export DISABLE_WITHDRAWALS=true

# 2. Show maintenance banner
curl -X POST localhost:3000/internal/maintenance-mode

# 3. Capture current state
pg_dump $DATABASE_URL > backup_$(date +%s).sql
curl localhost:3000/internal/health/invariants > invariants_$(date +%s).json

# 4. If needed, rollback to previous version
git checkout v1.0-mainnet-previous
pm2 restart all

# 5. Verify rollback health
curl localhost:3000/health/detailed
```

---
**🎯 Remember: Better to pause and investigate than to let funds get lost. When in doubt, hit the kill switches!**
