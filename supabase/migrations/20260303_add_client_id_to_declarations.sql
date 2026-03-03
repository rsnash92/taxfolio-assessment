-- Migration: Add practice/client columns to declarations for agent access
-- When an accountant prepares an SA100 for a client, client_id and practice_id
-- link the declaration back to the practice's client record.

ALTER TABLE declarations ADD COLUMN IF NOT EXISTS client_id uuid;
ALTER TABLE declarations ADD COLUMN IF NOT EXISTS practice_id uuid;

-- Replace the single UNIQUE(user_id, tax_year) with two partial unique indexes:
-- 1. Individual users: one declaration per user per tax year (when no client)
-- 2. Practice clients: one declaration per client per tax year
ALTER TABLE declarations DROP CONSTRAINT IF EXISTS declarations_user_id_tax_year_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_declarations_individual_unique
  ON declarations(user_id, tax_year) WHERE client_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_declarations_client_unique
  ON declarations(client_id, tax_year) WHERE client_id IS NOT NULL;

-- General indexes for practice lookups
CREATE INDEX IF NOT EXISTS idx_declarations_client ON declarations(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_declarations_practice ON declarations(practice_id) WHERE practice_id IS NOT NULL;

-- Drop existing individual-only policies and replace with combined policies
DROP POLICY IF EXISTS "Users can view own declarations" ON declarations;
DROP POLICY IF EXISTS "Users can insert own declarations" ON declarations;
DROP POLICY IF EXISTS "Users can update own declarations" ON declarations;

-- Combined policies: individual users OR practice members
CREATE POLICY "Users can view own or practice declarations"
  ON declarations FOR SELECT
  USING (
    auth.uid() = user_id
    OR (
      practice_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM practice_members pm
        WHERE pm.practice_id = declarations.practice_id AND pm.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert own or practice declarations"
  ON declarations FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR (
      practice_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM practice_members pm
        WHERE pm.practice_id = declarations.practice_id AND pm.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update own or practice declarations"
  ON declarations FOR UPDATE
  USING (
    auth.uid() = user_id
    OR (
      practice_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM practice_members pm
        WHERE pm.practice_id = declarations.practice_id AND pm.user_id = auth.uid()
      )
    )
  );

-- Keep existing delete policy for individual users only (practice members don't delete)
-- "Users can delete own declarations" - unchanged
-- "Service role can update declarations" - unchanged
