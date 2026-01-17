-- supabase_usage_metrics.sql

-- Create the usage_metrics table
CREATE TABLE IF NOT EXISTS usage_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL, -- e.g., 'document_upload', 'file_upload', 'question_asked'
  event_details jsonb,      -- Optional: Store additional structured data (e.g., document_id, file_name, question_length)
  created_at timestamp WITH TIME ZONE DEFAULT now()
);

-- Optional: Create indexes for faster lookups by user and event type
CREATE INDEX IF NOT EXISTS idx_usage_metrics_user_id ON usage_metrics (user_id);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_event_type ON usage_metrics (event_type);

-- Enable RLS on the usage_metrics table
ALTER TABLE usage_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own usage metrics
DROP POLICY IF EXISTS "Users can view their own usage metrics." ON usage_metrics;
CREATE POLICY "Users can view their own usage metrics." ON usage_metrics
  FOR SELECT USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own usage metrics
DROP POLICY IF EXISTS "Users can insert their own usage metrics." ON usage_metrics;
CREATE POLICY "Users can insert their own usage metrics." ON usage_metrics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Optional RLS Policies: Disable UPDATE and DELETE to maintain historical integrity.
-- These prevent users from altering or deleting their own metric records.
-- If an admin needs to alter these, it would require a separate service role key or admin policy.
DROP POLICY IF EXISTS "Users cannot update usage metrics." ON usage_metrics;
CREATE POLICY "Users cannot update usage metrics." ON usage_metrics
  FOR UPDATE USING (FALSE);

DROP POLICY IF EXISTS "Users cannot delete usage metrics." ON usage_metrics;
CREATE POLICY "Users cannot delete usage metrics." ON usage_metrics
  FOR DELETE USING (FALSE);
