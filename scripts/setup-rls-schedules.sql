-- Enable RLS on schedules table if not already enabled
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to view schedules" ON schedules;
DROP POLICY IF EXISTS "Allow authenticated users to insert schedules" ON schedules;
DROP POLICY IF EXISTS "Allow authenticated users to update schedules" ON schedules;
DROP POLICY IF EXISTS "Allow authenticated users to delete schedules" ON schedules;

-- Create policies for schedules table
-- Allow all authenticated users to view schedules (for guest access)
CREATE POLICY "Allow authenticated users to view schedules" ON schedules
  FOR SELECT USING (true);

-- Only allow specific Discord user to modify schedules
-- Replace 'YOUR_DISCORD_USER_ID' with the actual Discord user ID
CREATE POLICY "Allow specific user to insert schedules" ON schedules
  FOR INSERT WITH CHECK (
    current_setting('request.jwt.claims', true)::json->>'sub' = '534299512831737866'
  );

CREATE POLICY "Allow specific user to update schedules" ON schedules
  FOR UPDATE USING (
    current_setting('request.jwt.claims', true)::json->>'sub' = '534299512831737866'
  );

CREATE POLICY "Allow specific user to delete schedules" ON schedules
  FOR DELETE USING (
    current_setting('request.jwt.claims', true)::json->>'sub' = '534299512831737866'
  );
