-- 🎯 Atomic Transaction Functions for Crash Casino
-- Ensures database consistency and prevents race conditions

-- Drop functions if they exist (for updates)
DROP FUNCTION IF EXISTS place_bet_atomic(TEXT, DECIMAL, DECIMAL);
DROP FUNCTION IF EXISTS add_winnings_atomic(TEXT, DECIMAL);
DROP FUNCTION IF EXISTS transfer_funds_atomic(TEXT, TEXT, DECIMAL);

-- 💰 Atomic bet placement function
CREATE OR REPLACE FUNCTION place_bet_atomic(
    player_address TEXT,
    bet_amount DECIMAL,
    current_balance DECIMAL DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    actual_balance DECIMAL;
    new_balance DECIMAL;
    result JSON;
    bet_id BIGINT;
BEGIN
    -- Lock the row to prevent concurrent modifications
    SELECT balance INTO actual_balance 
    FROM user_balances 
    WHERE address = player_address 
    FOR UPDATE;
    
    -- If no existing balance record, create one with 0 balance
    IF actual_balance IS NULL THEN
        INSERT INTO user_balances (address, balance, updated_at)
        VALUES (player_address, 0, NOW())
        ON CONFLICT (address) DO NOTHING;
        actual_balance := 0;
    END IF;
    
    -- Validate sufficient balance
    IF actual_balance < bet_amount THEN
        RAISE EXCEPTION 'Insufficient balance: have %.6f, need %.6f', actual_balance, bet_amount;
    END IF;
    
    -- Calculate new balance
    new_balance := actual_balance - bet_amount;
    
    -- Update balance atomically
    UPDATE user_balances 
    SET balance = new_balance, 
        updated_at = NOW()
    WHERE address = player_address;
    
    -- Insert bet record atomically
    INSERT INTO balance_bets (address, amount, balance_before, balance_after, created_at)
    VALUES (player_address, bet_amount, actual_balance, new_balance, NOW())
    RETURNING id INTO bet_id;
    
    -- Prepare success response
    result := json_build_object(
        'success', true,
        'bet_id', bet_id,
        'balance_before', actual_balance,
        'balance_after', new_balance,
        'bet_amount', bet_amount,
        'timestamp', extract(epoch from NOW())
    );
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Return error details
        result := json_build_object(
            'success', false,
            'error', SQLERRM,
            'error_code', SQLSTATE
        );
        RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 🎉 Atomic winnings addition function
CREATE OR REPLACE FUNCTION add_winnings_atomic(
    player_address TEXT,
    winnings_amount DECIMAL
) RETURNS JSON AS $$
DECLARE
    current_balance DECIMAL;
    new_balance DECIMAL;
    result JSON;
    winning_id BIGINT;
BEGIN
    -- Lock the row to prevent concurrent modifications
    SELECT balance INTO current_balance 
    FROM user_balances 
    WHERE address = player_address 
    FOR UPDATE;
    
    -- If no existing balance record, create one
    IF current_balance IS NULL THEN
        INSERT INTO user_balances (address, balance, updated_at)
        VALUES (player_address, winnings_amount, NOW())
        ON CONFLICT (address) DO UPDATE SET 
            balance = user_balances.balance + winnings_amount,
            updated_at = NOW();
        new_balance := winnings_amount;
    ELSE
        -- Add winnings to existing balance
        new_balance := current_balance + winnings_amount;
        
        UPDATE user_balances 
        SET balance = new_balance,
            updated_at = NOW()
        WHERE address = player_address;
    END IF;
    
    -- Record the winning transaction
    INSERT INTO balance_winnings (address, amount, balance_before, balance_after, created_at)
    VALUES (player_address, winnings_amount, COALESCE(current_balance, 0), new_balance, NOW())
    RETURNING id INTO winning_id;
    
    -- Prepare success response
    result := json_build_object(
        'success', true,
        'winning_id', winning_id,
        'balance_before', COALESCE(current_balance, 0),
        'balance_after', new_balance,
        'winnings_amount', winnings_amount,
        'timestamp', extract(epoch from NOW())
    );
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        result := json_build_object(
            'success', false,
            'error', SQLERRM,
            'error_code', SQLSTATE
        );
        RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 🏦 Atomic funds transfer function (for house/hot wallet management)
CREATE OR REPLACE FUNCTION transfer_funds_atomic(
    from_address TEXT,
    to_address TEXT,
    transfer_amount DECIMAL
) RETURNS JSON AS $$
DECLARE
    from_balance DECIMAL;
    to_balance DECIMAL;
    new_from_balance DECIMAL;
    new_to_balance DECIMAL;
    result JSON;
    transfer_id BIGINT;
BEGIN
    -- Lock both accounts in a consistent order to prevent deadlocks
    IF from_address < to_address THEN
        SELECT balance INTO from_balance FROM user_balances WHERE address = from_address FOR UPDATE;
        SELECT balance INTO to_balance FROM user_balances WHERE address = to_address FOR UPDATE;
    ELSE
        SELECT balance INTO to_balance FROM user_balances WHERE address = to_address FOR UPDATE;
        SELECT balance INTO from_balance FROM user_balances WHERE address = from_address FOR UPDATE;
    END IF;
    
    -- Validate source has sufficient funds
    IF from_balance IS NULL OR from_balance < transfer_amount THEN
        RAISE EXCEPTION 'Insufficient funds for transfer: have %.6f, need %.6f', 
            COALESCE(from_balance, 0), transfer_amount;
    END IF;
    
    -- Calculate new balances
    new_from_balance := from_balance - transfer_amount;
    new_to_balance := COALESCE(to_balance, 0) + transfer_amount;
    
    -- Update source balance
    UPDATE user_balances 
    SET balance = new_from_balance, updated_at = NOW()
    WHERE address = from_address;
    
    -- Update destination balance (insert if doesn't exist)
    INSERT INTO user_balances (address, balance, updated_at)
    VALUES (to_address, new_to_balance, NOW())
    ON CONFLICT (address) DO UPDATE SET
        balance = new_to_balance,
        updated_at = NOW();
    
    -- Record the transfer
    INSERT INTO balance_transfers (from_address, to_address, amount, created_at)
    VALUES (from_address, to_address, transfer_amount, NOW())
    RETURNING id INTO transfer_id;
    
    result := json_build_object(
        'success', true,
        'transfer_id', transfer_id,
        'from_balance_before', from_balance,
        'from_balance_after', new_from_balance,
        'to_balance_before', COALESCE(to_balance, 0),
        'to_balance_after', new_to_balance,
        'transfer_amount', transfer_amount
    );
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        result := json_build_object(
            'success', false,
            'error', SQLERRM,
            'error_code', SQLSTATE
        );
        RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 📊 Create necessary tables if they don't exist
CREATE TABLE IF NOT EXISTS balance_winnings (
    id BIGSERIAL PRIMARY KEY,
    address VARCHAR(42) NOT NULL,
    amount DECIMAL(18,8) NOT NULL,
    balance_before DECIMAL(18,8) NOT NULL,
    balance_after DECIMAL(18,8) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS balance_transfers (
    id BIGSERIAL PRIMARY KEY,
    from_address VARCHAR(42) NOT NULL,
    to_address VARCHAR(42) NOT NULL,
    amount DECIMAL(18,8) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_balance_winnings_address ON balance_winnings(address);
CREATE INDEX IF NOT EXISTS idx_balance_winnings_created ON balance_winnings(created_at);
CREATE INDEX IF NOT EXISTS idx_balance_transfers_from ON balance_transfers(from_address);
CREATE INDEX IF NOT EXISTS idx_balance_transfers_to ON balance_transfers(to_address);
CREATE INDEX IF NOT EXISTS idx_balance_transfers_created ON balance_transfers(created_at);

-- Grant permissions (adjust as needed for your setup)
-- GRANT EXECUTE ON FUNCTION place_bet_atomic TO your_app_user;
-- GRANT EXECUTE ON FUNCTION add_winnings_atomic TO your_app_user;
-- GRANT EXECUTE ON FUNCTION transfer_funds_atomic TO your_app_user;
