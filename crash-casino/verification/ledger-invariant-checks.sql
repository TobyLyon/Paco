-- 🔍 LEDGER INVARIANT CHECKS
-- Run these SQL queries as smoke tests after any deploy
-- All queries should return ZERO ROWS if system is healthy

-- =============================================================================
-- 1) NO NEGATIVE BALANCES (CRITICAL)
-- =============================================================================
-- Should return 0 rows - any negative balance indicates critical bug
SELECT 
    user_id, 
    available, 
    locked,
    available + locked as total,
    'NEGATIVE_BALANCE_CRITICAL' as error_type
FROM accounts
WHERE available < 0 OR locked < 0
ORDER BY available + locked;

-- =============================================================================
-- 2) LOCKED EQUALS LIVE EXPOSURE
-- =============================================================================
-- Verifies locked funds match actual open bets
-- Adapt this query based on how you track open bets
WITH active_bets AS (
    -- Get currently locked bets from ledger (bet_lock minus bet_win/bet_lose)
    SELECT 
        user_id,
        SUM(CASE 
            WHEN op_type = 'bet_lock' THEN amount 
            WHEN op_type IN ('bet_win', 'bet_lose') THEN -COALESCE((ref->>'bet_amount')::NUMERIC, amount)
            ELSE 0 
        END) as calculated_locked
    FROM ledger 
    WHERE op_type IN ('bet_lock', 'bet_win', 'bet_lose')
    GROUP BY user_id
),
account_locked AS (
    SELECT user_id, locked FROM accounts WHERE locked > 0
)
SELECT 
    COALESCE(a.user_id, b.user_id) as user_id,
    COALESCE(a.calculated_locked, 0) as calculated_locked,
    COALESCE(b.locked, 0) as account_locked,
    COALESCE(b.locked, 0) - COALESCE(a.calculated_locked, 0) as drift,
    'LOCKED_EXPOSURE_MISMATCH' as error_type
FROM active_bets a 
FULL JOIN account_locked b USING(user_id)
WHERE COALESCE(b.locked, 0) != COALESCE(a.calculated_locked, 0)
ORDER BY ABS(drift) DESC;

-- =============================================================================
-- 3) LEDGER→SNAPSHOT CONSISTENCY (GLOBAL BALANCE)
-- =============================================================================
-- The most critical check - total system balance integrity
WITH ledger_totals AS (
    SELECT
        SUM(CASE WHEN op_type = 'deposit' THEN amount ELSE 0 END) as total_deposits,
        SUM(CASE WHEN op_type = 'withdraw' THEN amount ELSE 0 END) as total_withdrawals,
        SUM(CASE WHEN op_type = 'bet_win' THEN amount ELSE 0 END) as total_wins,
        SUM(CASE WHEN op_type = 'bet_lose' THEN amount ELSE 0 END) as total_losses,
        SUM(CASE WHEN op_type = 'adjustment' THEN amount ELSE 0 END) as total_adjustments,
        SUM(CASE WHEN op_type = 'bet_lock' THEN amount ELSE 0 END) as total_locks
    FROM ledger
),
snapshot_totals AS (
    SELECT 
        COALESCE(SUM(available), 0) as sum_available,
        COALESCE(SUM(locked), 0) as sum_locked
    FROM accounts
)
SELECT 
    lt.*,
    st.*,
    (lt.total_deposits + lt.total_wins + lt.total_adjustments - lt.total_withdrawals - lt.total_losses) as ledger_net,
    (st.sum_available + st.sum_locked) as snapshot_total,
    (lt.total_deposits + lt.total_wins + lt.total_adjustments - lt.total_withdrawals - lt.total_losses) - (st.sum_available + st.sum_locked) as snapshot_drift,
    CASE 
        WHEN (lt.total_deposits + lt.total_wins + lt.total_adjustments - lt.total_withdrawals - lt.total_losses) - (st.sum_available + st.sum_locked) != 0 
        THEN 'SNAPSHOT_DRIFT_CRITICAL' 
        ELSE 'OK' 
    END as status
FROM ledger_totals lt 
CROSS JOIN snapshot_totals st
WHERE (lt.total_deposits + lt.total_wins + lt.total_adjustments - lt.total_withdrawals - lt.total_losses) - (st.sum_available + st.sum_locked) != 0;

-- =============================================================================
-- 4) IDEMPOTENCY GUARD VERIFICATION
-- =============================================================================
-- Should return 0 rows - duplicate client_ids indicate failed idempotency
SELECT 
    user_id, 
    ref->>'client_id' as client_id, 
    op_type,
    COUNT(*) as duplicate_count,
    'IDEMPOTENCY_VIOLATION' as error_type,
    ARRAY_AGG(id ORDER BY created_at) as ledger_ids
FROM ledger
WHERE ref ? 'client_id' AND ref->>'client_id' IS NOT NULL
GROUP BY user_id, ref->>'client_id', op_type
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- =============================================================================
-- 5) VERSION MONOTONICITY CHECK
-- =============================================================================
-- Verify versions always increase (OCC requirement)
WITH version_audit AS (
    SELECT 
        user_id,
        version,
        LAG(version) OVER (PARTITION BY user_id ORDER BY version) as prev_version
    FROM accounts
    WHERE version > 0
)
SELECT 
    user_id,
    version,
    prev_version,
    'VERSION_NOT_MONOTONIC' as error_type
FROM version_audit
WHERE prev_version IS NOT NULL AND version <= prev_version;

-- =============================================================================
-- HEALTH SUMMARY VIEW
-- =============================================================================
-- Quick overview of system health
SELECT 
    (SELECT COUNT(*) FROM accounts WHERE available < 0 OR locked < 0) as negative_balances,
    (SELECT COUNT(*) FROM accounts) as total_accounts,
    (SELECT SUM(available + locked) FROM accounts) / 1e18 as total_balance_eth,
    (SELECT COUNT(*) FROM ledger WHERE created_at > NOW() - INTERVAL '1 hour') as ledger_entries_last_hour,
    (SELECT COUNT(*) FROM deposits_seen WHERE processed_at > NOW() - INTERVAL '1 hour') as deposits_last_hour,
    NOW() as check_timestamp;

-- =============================================================================
-- RECENT SUSPICIOUS ACTIVITY
-- =============================================================================
-- Large operations that might need manual review
SELECT 
    user_id,
    op_type,
    amount / 1e18 as amount_eth,
    ref,
    created_at,
    'LARGE_OPERATION' as flag_type
FROM ledger 
WHERE amount > 10e18 -- More than 10 ETH
    AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY amount DESC, created_at DESC
LIMIT 20;
