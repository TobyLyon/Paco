-- Test and verify score replacement logic works properly

-- 1. Check current constraints on game_scores table
SELECT 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name,
    tc.is_deferrable,
    tc.initially_deferred
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name 
    AND tc.table_schema = kcu.table_schema
WHERE tc.table_name = 'game_scores' 
    AND tc.table_schema = 'public'
ORDER BY tc.constraint_type, tc.constraint_name;

-- 2. Check your current scores specifically
SELECT 
    id,
    user_id,
    username,
    score,
    game_date,
    created_at
FROM game_scores 
WHERE user_id = '1950278013796622336'  -- Your user ID
    AND game_date = '2025-08-05'
ORDER BY score DESC;

-- 3. Check for any duplicate prevention that might block updates
SELECT 
    user_id,
    game_date,
    COUNT(*) as score_count,
    array_agg(score ORDER BY score DESC) as all_scores,
    array_agg(id ORDER BY score DESC) as all_ids
FROM game_scores 
WHERE game_date = '2025-08-05'
GROUP BY user_id, game_date
HAVING COUNT(*) > 1
ORDER BY score_count DESC;

-- 4. Test query: What would happen if we tried to update your score?
-- (This is a SELECT, won't actually change anything)
SELECT 
    'Would update record ID: ' || id as action,
    'From score: ' || score as old_score,
    'To score: 15000' as new_score,
    'User: ' || username as user_info
FROM game_scores 
WHERE user_id = '1950278013796622336' 
    AND game_date = '2025-08-05'
ORDER BY score DESC 
LIMIT 1;