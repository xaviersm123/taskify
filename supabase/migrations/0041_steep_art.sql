-- Add new columns to subtasks table
ALTER TABLE subtasks 
  ADD COLUMN assignee_id uuid REFERENCES auth.users(id),
  ADD COLUMN due_date timestamptz;

-- Add index for better performance
CREATE INDEX idx_subtasks_assignee_id ON subtasks(assignee_id);
CREATE INDEX idx_subtasks_due_date ON subtasks(due_date);