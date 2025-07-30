-- Enable real-time for live order updates
-- Run this if you already have the main schema set up

-- Add the paco_orders table to real-time publication
ALTER PUBLICATION supabase_realtime ADD TABLE paco_orders;

-- Verify real-time is enabled
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'paco_orders';