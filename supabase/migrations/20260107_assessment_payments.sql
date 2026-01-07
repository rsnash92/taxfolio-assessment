-- Assessment payments table for Stripe webhook records
CREATE TABLE IF NOT EXISTS assessment_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_payment_intent_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT,
  user_id UUID REFERENCES auth.users(id),
  amount INTEGER NOT NULL, -- in pence/cents
  currency TEXT NOT NULL DEFAULT 'gbp',
  status TEXT NOT NULL, -- 'succeeded', 'failed', 'pending'
  plan_id TEXT NOT NULL,
  plan_name TEXT,
  discount_code TEXT,
  discount_amount INTEGER DEFAULT 0,
  original_price INTEGER,
  receipt_email TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for looking up payments by user
CREATE INDEX IF NOT EXISTS idx_assessment_payments_user_id ON assessment_payments(user_id);

-- Index for looking up payments by Stripe ID
CREATE INDEX IF NOT EXISTS idx_assessment_payments_stripe_id ON assessment_payments(stripe_payment_intent_id);

-- Enable RLS
ALTER TABLE assessment_payments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own payments
CREATE POLICY "Users can view own payments" ON assessment_payments
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Service role can insert (for webhooks)
CREATE POLICY "Service role can insert payments" ON assessment_payments
  FOR INSERT
  WITH CHECK (true);

-- Policy: Service role can update (for webhooks)
CREATE POLICY "Service role can update payments" ON assessment_payments
  FOR UPDATE
  USING (true);
