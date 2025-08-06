-- ===== FIX DATABASE CONSTRAINTS FOR SCORE UPDATES (CORRECTED) =====
-- This SQL fixes the constraint issue preventing score updates

-- STEP 1: Check current constraints
SELECT 'Current constraints:' as info;
SELECT conname, pg_get_constraintdef(oid) as definition 
FROM pg_constraint 
WHERE conrelid = 'game_scores'::regclass 
AND contype = 'u';

-- STEP 2: Remove the problematic constraint that allows multiple scores per user
DO $$
BEGIN
    -- Remove old constraint that allows multiple scores per user per day
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'game_scores_user_id_game_date_score_key'
    ) THEN
        ALTER TABLE game_scores DROP CONSTRAINT game_scores_user_id_game_date_score_key;
        RAISE NOTICE '✅ Removed problematic constraint that allowed multiple scores per user';
    ELSE
        RAISE NOTICE '⚠️ Problematic constraint not found (already removed)';
    END IF;
END $$;

-- STEP 3: Show what duplicates exist before cleanup
SELECT 'Duplicate scores that will be cleaned up:' as info;
WITH ranked_scores AS (
    SELECT id, 
           user_id,
           username,
           game_date,
           score,
           created_at,
           ROW_NUMBER() OVER (
               PARTITION BY user_id, game_date 
               ORDER BY score DESC, created_at ASC
           ) as rn
    FROM game_scores
)
SELECT 
    user_id,
    username,
    game_date, 
    score, 
    'Will be deleted (duplicate)' as action 
FROM ranked_scores 
WHERE rn > 1
ORDER BY user_id, game_date, score DESC;

-- STEP 4: Actually delete the duplicates
WITH ranked_scores AS (
    SELECT id, 
           user_id,
           game_date,
           score,
           created_at,
           ROW_NUMBER() OVER (
               PARTITION BY user_id, game_date 
               ORDER BY score DESC, created_at ASC
           ) as rn
    FROM game_scores
)
DELETE FROM game_scores 
WHERE id IN (SELECT id FROM ranked_scores WHERE rn > 1);

-- STEP 5: Add the correct constraint - ONE score per user per day
DO $$
BEGIN
    -- Add proper constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'game_scores_user_date_unique'
    ) THEN
        ALTER TABLE game_scores 
        ADD CONSTRAINT game_scores_user_date_unique 
        UNIQUE(user_id, game_date);
        RAISE NOTICE '✅ Added correct constraint: ONE score per user per day';
    ELSE
        RAISE NOTICE '⚠️ Correct constraint already exists';
    END IF;
END $$;

-- STEP 6: Verify the fix
SELECT 'Final constraints after fix:' as info;
SELECT conname, pg_get_constraintdef(oid) as definition 
FROM pg_constraint 
WHERE conrelid = 'game_scores'::regclass 
AND contype = 'u';

-- STEP 7: Show current scores to verify cleanup worked
SELECT 'Current scores after cleanup (should be only 1 per user per day):' as info;
SELECT 
    user_id,
    username,
    game_date,
    score,
    created_at,
    COUNT(*) OVER (PARTITION BY user_id, game_date) as scores_per_user_date
FROM game_scores 
WHERE game_date >= CURRENT_DATE - INTERVAL '3 days'
ORDER BY game_date DESC, score DESC;

-- STEP 8: Final summary
SELECT 'SUMMARY - Scores per user per day (should all be 1):' as info;
SELECT 
    game_date,
    user_id,
    username,
    COUNT(*) as score_count,
    MAX(score) as highest_score
FROM game_scores 
WHERE game_date >= CURRENT_DATE - INTERVAL '3 days'
GROUP BY game_date, user_id, username
HAVING COUNT(*) > 1  -- This should return NO rows if fix worked
ORDER BY game_date DESC, score_count DESC;

-- If the above query returns no rows, the fix worked perfectly!
SELECT 'If no rows above, the constraint fix was successful! ✅' as final_status;