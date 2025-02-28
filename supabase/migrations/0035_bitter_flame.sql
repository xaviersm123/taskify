-- Update the status check constraint for tickets table
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_status_check;
ALTER TABLE tickets ADD CONSTRAINT tickets_status_check 
  CHECK (status IN ('todo', 'in_progress', 'complete'));

-- Update any existing tickets to valid status values
UPDATE tickets 
SET status = 'todo' 
WHERE status NOT IN ('todo', 'in_progress', 'complete');