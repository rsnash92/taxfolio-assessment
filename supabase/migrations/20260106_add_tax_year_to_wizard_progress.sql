-- Add tax_year column to wizard_progress table
-- This allows users to have separate progress records for each tax year

-- Add tax_year column with default value
ALTER TABLE wizard_progress
ADD COLUMN IF NOT EXISTS tax_year TEXT NOT NULL DEFAULT '2024-25';

-- Drop the old unique constraint on user_id only
ALTER TABLE wizard_progress
DROP CONSTRAINT IF EXISTS wizard_progress_user_id_key;

-- Create new unique constraint on user_id + tax_year combination
ALTER TABLE wizard_progress
ADD CONSTRAINT wizard_progress_user_id_tax_year_key UNIQUE (user_id, tax_year);

-- Create index for faster lookups by user_id and tax_year
CREATE INDEX IF NOT EXISTS idx_wizard_progress_user_tax_year
ON wizard_progress(user_id, tax_year);
