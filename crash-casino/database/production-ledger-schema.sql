-- 🏦 Production-Grade Ledger System for Crash Casino
-- Based on GPT recommendations for casino-grade reliability

-- =============================================================================
-- CORE LEDGER SYSTEM: Double-entry + versions + locks
-- =============================================================================

-- Append-only ledger (source of truth) - NEVER mutate
CREATE TABLE IF NOT EXISTS ledger (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  op_type TEXT NOT NULL,         -- deposit|withdraw|bet_lock|bet_win|bet_lose|adjustment
  amount NUMERIC(78,0) NOT NULL, -- wei as integer (NO floats for precision)
  ref JSONB NOT NULL,            -- game_id, round_id, txHash, client_id, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Account snapshot with Optimistic Concurrency Control (OCC) version
CREATE TABLE IF NOT EXISTS accounts (
  user_id UUID PRIMARY KEY,
  available NUMERIC(78,0) NOT NULL DEFAULT 0,  -- Available for betting
  locked    NUMERIC(78,0) NOT NULL DEFAULT 0,  -- Locked in active bets
  version   BIGINT NOT NULL DEFAULT 0          -- For optimistic locking
);

-- Idempotency guard - prevents duplicate operations
CREATE UNIQUE INDEX IF NOT EXISTS uniq_idem
ON ledger (user_id, (ref->>'op_type'), (ref->>'client_id'));

-- Performance indexes
CREATE INDEX IF NOT EXISTS ledger_user_time_idx ON ledger(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ledger_op_type_idx ON ledger(op_type) WHERE op_type IN ('deposit', 'withdraw');

-- =============================================================================
-- DEPOSIT TRACKING SYSTEM
-- =============================================================================

-- Track processed deposits to prevent duplicates
CREATE TABLE IF NOT EXISTS deposits_seen (
  tx_hash TEXT NOT NULL,
  log_index INTEGER NOT NULL,
  user_id UUID NOT NULL,
  amount NUMERIC(78,0) NOT NULL,
  block_number BIGINT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tx_hash, log_index)
);

-- Indexer checkpoint tracking
CREATE TABLE IF NOT EXISTS indexer_checkpoint (
  id INTEGER PRIMARY KEY DEFAULT 1,
  last_processed_block BIGINT NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT single_checkpoint CHECK (id = 1)
);

-- =============================================================================
-- ATOMIC RPC FUNCTIONS
-- =============================================================================

-- 🎯 Place Bet (with OCC + row locking)
CREATE OR REPLACE FUNCTION rpc_place_bet(
  p_user UUID, 
  p_amount NUMERIC, 
  p_round UUID, 
  p_client UUID, 
  p_expected_version BIGINT
) RETURNS TABLE(new_available NUMERIC, new_locked NUMERIC, new_version BIGINT) 
LANGUAGE plpgsql AS $$
DECLARE
  current_version BIGINT;
  current_available NUMERIC;
  ledger_inserted BOOLEAN := FALSE;
BEGIN
  -- Row-level lock to prevent concurrent modifications
  SELECT version, available INTO current_version, current_available
  FROM accounts WHERE user_id = p_user FOR UPDATE;
  
  -- Create account if doesn't exist
  IF NOT FOUND THEN
    INSERT INTO accounts(user_id, available, locked, version) 
    VALUES(p_user, 0, 0, 0);
    SELECT version, available INTO current_version, current_available
    FROM accounts WHERE user_id = p_user FOR UPDATE;
  END IF;

  -- Optimistic concurrency control - version check
  IF current_version <> p_expected_version THEN
    RAISE EXCEPTION 'VERSION_CONFLICT: Expected %, got %', p_expected_version, current_version;
  END IF;

  -- Sufficient funds check
  IF current_available < p_amount THEN
    RAISE EXCEPTION 'INSUFFICIENT_FUNDS: Need %, have %', p_amount, current_available;
  END IF;

  -- Idempotent ledger insert (no-op if duplicate)
  BEGIN
    INSERT INTO ledger(user_id, op_type, amount, ref)
    VALUES (p_user, 'bet_lock', p_amount,
            jsonb_build_object(
              'op_type', 'bet_lock',
              'client_id', p_client,
              'round_id', p_round,
              'timestamp', extract(epoch from now())
            ));
    ledger_inserted := TRUE;
  EXCEPTION WHEN unique_violation THEN
    -- Operation already processed, return current state
    ledger_inserted := FALSE;
  END;

  -- Apply state change only if new ledger entry was created
  IF ledger_inserted THEN
    UPDATE accounts
    SET available = available - p_amount,
        locked    = locked + p_amount,
        version   = version + 1
    WHERE user_id = p_user;
  END IF;

  -- Return current state
  RETURN QUERY
    SELECT available, locked, version FROM accounts WHERE user_id = p_user;
END$$;

-- 🏆 Process Win (move from locked to available)
CREATE OR REPLACE FUNCTION rpc_process_win(
  p_user UUID,
  p_win_amount NUMERIC,
  p_bet_amount NUMERIC,
  p_round UUID,
  p_client UUID
) RETURNS TABLE(new_available NUMERIC, new_locked NUMERIC, new_version BIGINT)
LANGUAGE plpgsql AS $$
DECLARE
  ledger_inserted BOOLEAN := FALSE;
BEGIN
  -- Row-level lock
  PERFORM 1 FROM accounts WHERE user_id = p_user FOR UPDATE;

  -- Idempotent ledger insert
  BEGIN
    INSERT INTO ledger(user_id, op_type, amount, ref)
    VALUES (p_user, 'bet_win', p_win_amount,
            jsonb_build_object(
              'op_type', 'bet_win',
              'client_id', p_client,
              'round_id', p_round,
              'bet_amount', p_bet_amount,
              'timestamp', extract(epoch from now())
            ));
    ledger_inserted := TRUE;
  EXCEPTION WHEN unique_violation THEN
    ledger_inserted := FALSE;
  END;

  IF ledger_inserted THEN
    UPDATE accounts
    SET available = available + p_win_amount,
        locked    = locked - p_bet_amount,
        version   = version + 1
    WHERE user_id = p_user;
  END IF;

  RETURN QUERY
    SELECT available, locked, version FROM accounts WHERE user_id = p_user;
END$$;

-- 💸 Process Loss (move from locked to house)
CREATE OR REPLACE FUNCTION rpc_process_loss(
  p_user UUID,
  p_bet_amount NUMERIC,
  p_round UUID,
  p_client UUID
) RETURNS TABLE(new_available NUMERIC, new_locked NUMERIC, new_version BIGINT)
LANGUAGE plpgsql AS $$
DECLARE
  ledger_inserted BOOLEAN := FALSE;
BEGIN
  -- Row-level lock
  PERFORM 1 FROM accounts WHERE user_id = p_user FOR UPDATE;

  -- Idempotent ledger insert
  BEGIN
    INSERT INTO ledger(user_id, op_type, amount, ref)
    VALUES (p_user, 'bet_lose', p_bet_amount,
            jsonb_build_object(
              'op_type', 'bet_lose',
              'client_id', p_client,
              'round_id', p_round,
              'timestamp', extract(epoch from now())
            ));
    ledger_inserted := TRUE;
  EXCEPTION WHEN unique_violation THEN
    ledger_inserted := FALSE;
  END;

  IF ledger_inserted THEN
    UPDATE accounts
    SET locked = locked - p_bet_amount,
        version = version + 1
    WHERE user_id = p_user;
  END IF;

  RETURN QUERY
    SELECT available, locked, version FROM accounts WHERE user_id = p_user;
END$$;

-- 💰 Record Deposit
CREATE OR REPLACE FUNCTION rpc_record_deposit(
  p_tx TEXT,
  p_idx INTEGER,
  p_user UUID,
  p_amount NUMERIC
) RETURNS VOID
LANGUAGE plpgsql AS $$
DECLARE
  client_id UUID := gen_random_uuid();
BEGIN
  -- Record in deposits_seen (idempotent)
  INSERT INTO deposits_seen(tx_hash, log_index, user_id, amount, block_number)
  VALUES (p_tx, p_idx, p_user, p_amount, 0)
  ON CONFLICT (tx_hash, log_index) DO NOTHING;

  -- Add to ledger and account (idempotent)
  INSERT INTO ledger(user_id, op_type, amount, ref)
  VALUES (p_user, 'deposit', p_amount,
          jsonb_build_object(
            'op_type', 'deposit',
            'client_id', client_id,
            'tx_hash', p_tx,
            'log_index', p_idx,
            'timestamp', extract(epoch from now())
          ))
  ON CONFLICT DO NOTHING;

  -- Update account balance
  INSERT INTO accounts(user_id, available, locked, version)
  VALUES (p_user, p_amount, 0, 1)
  ON CONFLICT (user_id) DO UPDATE SET
    available = accounts.available + p_amount,
    version = accounts.version + 1;
END$$;

-- 📊 Get Balance Snapshot
CREATE OR REPLACE FUNCTION rpc_get_balance(p_user UUID)
RETURNS TABLE(available NUMERIC, locked NUMERIC, version BIGINT)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
    SELECT a.available, a.locked, a.version 
    FROM accounts a 
    WHERE a.user_id = p_user;
    
  -- Return zeros if account doesn't exist
  IF NOT FOUND THEN
    RETURN QUERY SELECT 0::NUMERIC, 0::NUMERIC, 0::BIGINT;
  END IF;
END$$;

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Get/Set indexer checkpoint
CREATE OR REPLACE FUNCTION get_indexer_checkpoint()
RETURNS BIGINT
LANGUAGE plpgsql AS $$
DECLARE
  checkpoint BIGINT;
BEGIN
  SELECT last_processed_block INTO checkpoint 
  FROM indexer_checkpoint WHERE id = 1;
  
  IF NOT FOUND THEN
    INSERT INTO indexer_checkpoint(last_processed_block) VALUES(0);
    RETURN 0;
  END IF;
  
  RETURN checkpoint;
END$$;

CREATE OR REPLACE FUNCTION set_indexer_checkpoint(p_block BIGINT)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO indexer_checkpoint(id, last_processed_block, last_updated)
  VALUES (1, p_block, NOW())
  ON CONFLICT (id) DO UPDATE SET
    last_processed_block = p_block,
    last_updated = NOW();
END$$;

-- =============================================================================
-- VIEWS FOR MONITORING
-- =============================================================================

-- Balance reconciliation view
CREATE OR REPLACE VIEW balance_reconciliation AS
SELECT 
  user_id,
  SUM(CASE WHEN op_type IN ('deposit', 'bet_win') THEN amount ELSE 0 END) as total_credits,
  SUM(CASE WHEN op_type IN ('withdraw', 'bet_lose') THEN amount ELSE 0 END) as total_debits,
  SUM(CASE WHEN op_type = 'bet_lock' THEN amount ELSE 0 END) -
  SUM(CASE WHEN op_type IN ('bet_win', 'bet_lose') THEN 
    COALESCE((ref->>'bet_amount')::NUMERIC, amount) ELSE 0 END) as locked_calculated
FROM ledger
GROUP BY user_id;

-- Recent activity view
CREATE OR REPLACE VIEW recent_activity AS
SELECT 
  l.user_id,
  l.op_type,
  l.amount,
  l.ref,
  l.created_at,
  a.available,
  a.locked,
  a.version
FROM ledger l
LEFT JOIN accounts a ON l.user_id = a.user_id
ORDER BY l.created_at DESC
LIMIT 1000;
