-- Submission logs table for tracking HMRC API interactions
-- Used for debugging and audit trail

CREATE TABLE IF NOT EXISTS submission_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Submission context
  submission_id TEXT NOT NULL, -- Unique ID for this submission attempt
  tax_year TEXT NOT NULL,

  -- Step details
  step_name TEXT NOT NULL,
  step_number INTEGER NOT NULL,

  -- Request/Response
  endpoint TEXT,
  request_payload JSONB,
  response_status INTEGER,
  response_body JSONB,

  -- Status
  status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'error', 'skipped')),
  error_message TEXT,

  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying by user and submission
CREATE INDEX idx_submission_logs_user_id ON submission_logs(user_id);
CREATE INDEX idx_submission_logs_submission_id ON submission_logs(submission_id);
CREATE INDEX idx_submission_logs_created_at ON submission_logs(created_at DESC);

-- RLS policies
ALTER TABLE submission_logs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own logs
CREATE POLICY "Users can view own submission logs"
  ON submission_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can insert (from server-side)
CREATE POLICY "Service role can insert submission logs"
  ON submission_logs
  FOR INSERT
  WITH CHECK (true);

-- Grant access
GRANT SELECT ON submission_logs TO authenticated;
GRANT INSERT ON submission_logs TO service_role;
