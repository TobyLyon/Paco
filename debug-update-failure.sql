-- Debug why the UPDATE is failing but returning empty results

-- 1. Check current RLS policies on game_scores table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'game_scores';

-- 2. Check if the record actually exists and can be selected
SELECT id, user_id, username, score, game_date, created_at
FROM game_scores 
WHERE id = 2 
  AND user_id = '1950278013796622336' 
  AND game_date = '2025-08-05';

-- 3. Test if a manual UPDATE would work (don't run this, just check syntax)
-- UPDATE game_scores 
-- SET score = 26498, 
--     updated_at = NOW()
-- WHERE id = 2 
--   AND user_id = '1950278013796622336' 
--   AND game_date = '2025-08-05'
-- RETURNING *;

-- 4. Check table constraints that might block updates
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.check_constraints cc 
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'game_scores' 
    AND tc.table_schema = 'public'
ORDER BY tc.constraint_type, tc.constraint_name;

-- 5. Check if there are any triggers that might interfere
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'game_scores';

-- 6. Test current user permissions
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants 
WHERE table_name = 'game_scores' 
    AND table_schema = 'public';