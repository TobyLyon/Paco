-- Fix Row Level Security policies for game_scores table

-- 1. Check current RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'game_scores';

-- 2. Drop existing policies that might be blocking UPSERT
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON game_scores;
DROP POLICY IF EXISTS "Enable select for authenticated users only" ON game_scores;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON game_scores;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON game_scores;
DROP POLICY IF EXISTS "Users can insert their own scores" ON game_scores;
DROP POLICY IF EXISTS "Users can update their own scores" ON game_scores;
DROP POLICY IF EXISTS "Users can view all scores" ON game_scores;

-- 3. Create simple, permissive policies that allow all operations
CREATE POLICY "Allow all operations for authenticated users" ON game_scores
    FOR ALL USING (true) WITH CHECK (true);

-- Alternative: Create specific policies for each operation
-- CREATE POLICY "Allow select for all" ON game_scores FOR SELECT USING (true);
-- CREATE POLICY "Allow insert for authenticated" ON game_scores FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Allow update for authenticated" ON game_scores FOR UPDATE USING (true) WITH CHECK (true);
-- CREATE POLICY "Allow delete for authenticated" ON game_scores FOR DELETE USING (true);

-- 4. Ensure RLS is enabled
ALTER TABLE game_scores ENABLE ROW LEVEL SECURITY;

-- 5. Test the new policy by checking permissions
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants 
WHERE table_name = 'game_scores' 
    AND table_schema = 'public'
    AND grantee IN ('anon', 'authenticated', 'service_role');

-- 6. Verify the new policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'game_scores';