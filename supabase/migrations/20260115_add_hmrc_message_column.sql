-- Add hmrc_message column to sa100_submissions
-- Stores the confirmation message from HMRC upon successful submission

ALTER TABLE sa100_submissions
ADD COLUMN IF NOT EXISTS hmrc_message TEXT;

-- Update status check constraint to include 'polling' status
ALTER TABLE sa100_submissions
DROP CONSTRAINT IF EXISTS sa100_submissions_status_check;

ALTER TABLE sa100_submissions
ADD CONSTRAINT sa100_submissions_status_check
CHECK (status IN ('pending', 'submitting', 'polling', 'submitted', 'failed'));

COMMENT ON COLUMN sa100_submissions.hmrc_message IS 'Confirmation message received from HMRC upon successful submission';
