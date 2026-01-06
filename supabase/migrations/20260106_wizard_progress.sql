-- Create wizard_progress table for persisting user wizard state
CREATE TABLE IF NOT EXISTS wizard_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wizard_data JSONB NOT NULL DEFAULT '{}',
  current_step TEXT NOT NULL DEFAULT 'residency',
  current_business_id TEXT,
  current_property_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS idx_wizard_progress_user_id ON wizard_progress(user_id);

-- Enable Row Level Security
ALTER TABLE wizard_progress ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only read their own progress
CREATE POLICY "Users can read own wizard progress"
  ON wizard_progress
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy: Users can insert their own progress
CREATE POLICY "Users can insert own wizard progress"
  ON wizard_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can update their own progress
CREATE POLICY "Users can update own wizard progress"
  ON wizard_progress
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create policy: Users can delete their own progress
CREATE POLICY "Users can delete own wizard progress"
  ON wizard_progress
  FOR DELETE
  USING (auth.uid() = user_id);
