-- 🔐 PacoRocko Wallet Functions Only
-- Run this AFTER the main database schema is already set up

-- 🔄 Create Update Function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 💰 Function: Process Bet Placement
CREATE OR REPLACE FUNCTION process_bet_placement(
    p_wallet_address VARCHAR(42),
    p_amount DECIMAL(18,8),
    p_round_id UUID,
    p_transaction_id UUID
)
RETURNS TABLE(success BOOLEAN, new_balance DECIMAL(18,8), error_message TEXT) AS $$
DECLARE
    current_balance DECIMAL(18,8);
    new_bal DECIMAL(18,8);
BEGIN
    -- Get current balance
    SELECT balance INTO current_balance 
    FROM player_balances 
    WHERE wallet_address = p_wallet_address;
    
    -- Check if player exists, create if not
    IF current_balance IS NULL THEN
        INSERT INTO player_balances (wallet_address, balance)
        VALUES (p_wallet_address, 0);
        current_balance := 0;
    END IF;
    
    -- Check sufficient balance
    IF current_balance < p_amount THEN
        RETURN QUERY SELECT FALSE, current_balance, 'Insufficient balance';
        RETURN;
    END IF;
    
    -- Deduct amount from balance
    new_bal := current_balance - p_amount;
    
    UPDATE player_balances 
    SET balance = new_bal,
        updated_at = CURRENT_TIMESTAMP
    WHERE wallet_address = p_wallet_address;
    
    -- Record transaction
    INSERT INTO wallet_transactions (
        transaction_id, wallet_address, transaction_type, amount, 
        balance_before, balance_after, round_id, status
    ) VALUES (
        p_transaction_id, p_wallet_address, 'bet', p_amount,
        current_balance, new_bal, p_round_id, 'completed'
    );
    
    RETURN QUERY SELECT TRUE, new_bal, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- 🏃‍♂️ Function: Process Cash Out
CREATE OR REPLACE FUNCTION process_cash_out(
    p_wallet_address VARCHAR(42),
    p_payout DECIMAL(18,8),
    p_round_id UUID,
    p_transaction_id UUID,
    p_multiplier DECIMAL(10,2)
)
RETURNS TABLE(success BOOLEAN, new_balance DECIMAL(18,8), error_message TEXT) AS $$
DECLARE
    current_balance DECIMAL(18,8);
    new_bal DECIMAL(18,8);
BEGIN
    -- Get current balance
    SELECT balance INTO current_balance 
    FROM player_balances 
    WHERE wallet_address = p_wallet_address;
    
    IF current_balance IS NULL THEN
        RETURN QUERY SELECT FALSE, 0::DECIMAL(18,8), 'Player not found';
        RETURN;
    END IF;
    
    -- Add payout to balance
    new_bal := current_balance + p_payout;
    
    UPDATE player_balances 
    SET balance = new_bal,
        updated_at = CURRENT_TIMESTAMP
    WHERE wallet_address = p_wallet_address;
    
    -- Record transaction
    INSERT INTO wallet_transactions (
        transaction_id, wallet_address, transaction_type, amount,
        balance_before, balance_after, round_id, status,
        metadata
    ) VALUES (
        p_transaction_id, p_wallet_address, 'payout', p_payout,
        current_balance, new_bal, p_round_id, 'completed',
        jsonb_build_object('multiplier', p_multiplier)
    );
    
    RETURN QUERY SELECT TRUE, new_bal, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- 🏦 Function: Update House Balance
CREATE OR REPLACE FUNCTION update_house_balance(p_amount DECIMAL(18,8))
RETURNS BOOLEAN AS $$
DECLARE
    current_balance DECIMAL(18,8);
BEGIN
    -- Get current house balance
    SELECT balance INTO current_balance FROM house_balance LIMIT 1;
    
    -- Update house balance
    UPDATE house_balance 
    SET balance = current_balance + p_amount,
        total_collected = CASE WHEN p_amount > 0 THEN total_collected + p_amount ELSE total_collected END,
        total_paid = CASE WHEN p_amount < 0 THEN total_paid + ABS(p_amount) ELSE total_paid END,
        last_updated = CURRENT_TIMESTAMP;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 💳 Function: Add Player Funds (Admin)
CREATE OR REPLACE FUNCTION add_player_funds(
    p_wallet_address VARCHAR(42),
    p_amount DECIMAL(18,8),
    p_admin_address VARCHAR(42),
    p_transaction_id UUID,
    p_reason TEXT
)
RETURNS TABLE(success BOOLEAN, new_balance DECIMAL(18,8), error_message TEXT) AS $$
DECLARE
    current_balance DECIMAL(18,8);
    new_bal DECIMAL(18,8);
BEGIN
    -- Get current balance or create player
    SELECT balance INTO current_balance 
    FROM player_balances 
    WHERE wallet_address = p_wallet_address;
    
    IF current_balance IS NULL THEN
        INSERT INTO player_balances (wallet_address, balance, total_deposited)
        VALUES (p_wallet_address, p_amount, p_amount);
        new_bal := p_amount;
    ELSE
        new_bal := current_balance + p_amount;
        UPDATE player_balances 
        SET balance = new_bal,
            total_deposited = total_deposited + p_amount,
            updated_at = CURRENT_TIMESTAMP
        WHERE wallet_address = p_wallet_address;
    END IF;
    
    -- Record transaction
    INSERT INTO wallet_transactions (
        transaction_id, wallet_address, transaction_type, amount,
        balance_before, balance_after, status,
        metadata
    ) VALUES (
        p_transaction_id, p_wallet_address, 'deposit', p_amount,
        COALESCE(current_balance, 0), new_bal, 'completed',
        jsonb_build_object('admin_address', p_admin_address, 'reason', p_reason)
    );
    
    RETURN QUERY SELECT TRUE, new_bal, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- 🔒 Function: Lock Player Funds
CREATE OR REPLACE FUNCTION lock_player_funds(
    p_wallet_address VARCHAR(42),
    p_amount DECIMAL(18,8)
)
RETURNS BOOLEAN AS $$
DECLARE
    current_balance DECIMAL(18,8);
    current_locked DECIMAL(18,8);
BEGIN
    SELECT balance, locked_balance INTO current_balance, current_locked
    FROM player_balances 
    WHERE wallet_address = p_wallet_address;
    
    IF current_balance IS NULL OR current_balance < p_amount THEN
        RETURN FALSE;
    END IF;
    
    UPDATE player_balances 
    SET balance = balance - p_amount,
        locked_balance = locked_balance + p_amount,
        updated_at = CURRENT_TIMESTAMP
    WHERE wallet_address = p_wallet_address;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 🔓 Function: Unlock Player Funds
CREATE OR REPLACE FUNCTION unlock_player_funds(
    p_wallet_address VARCHAR(42),
    p_amount DECIMAL(18,8)
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE player_balances 
    SET balance = balance + p_amount,
        locked_balance = locked_balance - p_amount,
        updated_at = CURRENT_TIMESTAMP
    WHERE wallet_address = p_wallet_address
    AND locked_balance >= p_amount;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- 🔄 Function: Refund Bet
CREATE OR REPLACE FUNCTION refund_bet(
    p_wallet_address VARCHAR(42),
    p_amount DECIMAL(18,8),
    p_transaction_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    current_balance DECIMAL(18,8);
    new_bal DECIMAL(18,8);
BEGIN
    SELECT balance INTO current_balance 
    FROM player_balances 
    WHERE wallet_address = p_wallet_address;
    
    IF current_balance IS NULL THEN
        RETURN FALSE;
    END IF;
    
    new_bal := current_balance + p_amount;
    
    UPDATE player_balances 
    SET balance = new_bal,
        updated_at = CURRENT_TIMESTAMP
    WHERE wallet_address = p_wallet_address;
    
    -- Record refund transaction
    INSERT INTO wallet_transactions (
        transaction_id, wallet_address, transaction_type, amount,
        balance_before, balance_after, status
    ) VALUES (
        gen_random_uuid(), p_wallet_address, 'refund', p_amount,
        current_balance, new_bal, 'completed'
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 📊 Function: Get Player Summary
CREATE OR REPLACE FUNCTION get_player_summary(p_wallet_address VARCHAR(42))
RETURNS TABLE(
    balance DECIMAL(18,8),
    locked_balance DECIMAL(18,8),
    total_deposited DECIMAL(18,8),
    total_bet DECIMAL(18,8),
    total_won DECIMAL(18,8),
    games_played BIGINT,
    last_activity TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pb.balance,
        pb.locked_balance,
        pb.total_deposited,
        COALESCE(SUM(CASE WHEN wt.transaction_type = 'bet' THEN wt.amount END), 0) as total_bet,
        COALESCE(SUM(CASE WHEN wt.transaction_type = 'payout' THEN wt.amount END), 0) as total_won,
        COUNT(DISTINCT CASE WHEN wt.transaction_type = 'bet' THEN wt.round_id END) as games_played,
        MAX(wt.created_at) as last_activity
    FROM player_balances pb
    LEFT JOIN wallet_transactions wt ON pb.wallet_address = wt.wallet_address
    WHERE pb.wallet_address = p_wallet_address
    GROUP BY pb.wallet_address, pb.balance, pb.locked_balance, pb.total_deposited;
END;
$$ LANGUAGE plpgsql;

-- ✅ Wallet Functions Setup Complete
SELECT '🔐 PacoRocko wallet functions setup complete!' as status;
