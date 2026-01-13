-- SA100 Declarations and Submissions Tables
-- Stores tax return declarations and their submission status to HMRC

-- =============================================================================
-- Part 1: Declarations Table (stores draft/paid/submitted tax returns)
-- =============================================================================

CREATE TABLE IF NOT EXISTS declarations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tax_year TEXT NOT NULL,

  -- Status workflow: draft -> paid -> submitted
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'paid', 'submitted')),

  -- The complete SA100 return data as JSON
  return_data JSONB NOT NULL DEFAULT '{}',

  -- Wizard progress tracking
  wizard_step TEXT,
  wizard_completed BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ,

  -- Payment reference (Stripe)
  stripe_payment_intent_id TEXT,

  -- Unique constraint: one declaration per user per tax year
  UNIQUE(user_id, tax_year)
);

-- Indexes
CREATE INDEX idx_declarations_user_id ON declarations(user_id);
CREATE INDEX idx_declarations_status ON declarations(status);
CREATE INDEX idx_declarations_tax_year ON declarations(tax_year);

-- RLS Policies
ALTER TABLE declarations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own declarations"
  ON declarations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own declarations"
  ON declarations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own declarations"
  ON declarations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own declarations"
  ON declarations FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can update (for webhooks)
CREATE POLICY "Service role can update declarations"
  ON declarations FOR UPDATE
  USING (true);

COMMENT ON TABLE declarations IS 'Stores SA100 tax return declarations and their status';

-- =============================================================================
-- Part 2: SA100 Submissions Table (stores HMRC submission attempts/results)
-- =============================================================================

CREATE TABLE IF NOT EXISTS sa100_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  declaration_id UUID NOT NULL REFERENCES declarations(id) ON DELETE CASCADE,
  tax_year TEXT NOT NULL,

  -- Submission timestamps
  submitted_at TIMESTAMPTZ,

  -- HMRC response data
  irmark TEXT,
  correlation_id TEXT,

  -- Status: pending -> submitting -> submitted/failed
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'submitting', 'submitted', 'failed')),

  -- Error tracking
  error_code TEXT,
  error_message TEXT,

  -- The XML that was submitted (for debugging/audit)
  submission_xml TEXT,

  -- HMRC response XML
  response_xml TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX idx_sa100_submissions_user_id ON sa100_submissions(user_id);
CREATE INDEX idx_sa100_submissions_declaration_id ON sa100_submissions(declaration_id);
CREATE INDEX idx_sa100_submissions_status ON sa100_submissions(status);
CREATE INDEX idx_sa100_submissions_tax_year ON sa100_submissions(tax_year);

-- RLS Policies
ALTER TABLE sa100_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own submissions"
  ON sa100_submissions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own submissions"
  ON sa100_submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own submissions"
  ON sa100_submissions FOR UPDATE
  USING (auth.uid() = user_id);

COMMENT ON TABLE sa100_submissions IS 'Stores SA100 submission attempts and HMRC responses';

-- =============================================================================
-- Part 3: Updated_at trigger function
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to declarations
DROP TRIGGER IF EXISTS update_declarations_updated_at ON declarations;
CREATE TRIGGER update_declarations_updated_at
  BEFORE UPDATE ON declarations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to sa100_submissions
DROP TRIGGER IF EXISTS update_sa100_submissions_updated_at ON sa100_submissions;
CREATE TRIGGER update_sa100_submissions_updated_at
  BEFORE UPDATE ON sa100_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
