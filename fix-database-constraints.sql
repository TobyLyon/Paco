-- ===== FIX DATABASE CONSTRAINTS FOR SCORE UPDATES =====
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

-- STEP 3: Clean up existing duplicates - keep only highest score per user per day
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
),
scores_to_delete AS (
    SELECT id, user_id, game_date, score FROM ranked_scores WHERE rn > 1
)
-- Show what will be deleted first
SELECT 'Duplicate scores to be cleaned up:' as info;
SELECT user_id, game_date, score, 'Will be deleted' as action 
FROM scores_to_delete;

-- Actually delete the duplicates (recreate the CTE for the DELETE)
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

-- STEP 4: Add the correct constraint - ONE score per user per day
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

-- STEP 5: Verify the fix
SELECT 'Final constraints:' as info;
SELECT conname, pg_get_constraintdef(oid) as definition 
FROM pg_constraint 
WHERE conrelid = 'game_scores'::regclass 
AND contype = 'u';

-- STEP 6: Show current scores to verify cleanup
SELECT 'Current scores after cleanup:' as info;
SELECT 
    user_id,
    game_date,
    score,
    username,
    created_at,
    COUNT(*) OVER (PARTITION BY user_id, game_date) as score_count_for_user_date
FROM game_scores 
WHERE game_date >= CURRENT_DATE - INTERVAL '2 days'
ORDER BY game_date DESC, score DESC;

SELECT 'Summary:' as info;
SELECT 
    game_date,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(*) as total_scores,
    MAX(score) as highest_score
FROM game_scores 
WHERE game_date >= CURRENT_DATE - INTERVAL '2 days'
GROUP BY game_date 
ORDER BY game_date DESC;