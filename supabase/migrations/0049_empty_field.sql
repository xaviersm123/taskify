-- Ensure proper cascading deletes for columns and tasks
ALTER TABLE tickets 
  DROP CONSTRAINT IF EXISTS tickets_column_id_fkey,
  ADD CONSTRAINT tickets_column_id_fkey 
    FOREIGN KEY (column_id) 
    REFERENCES board_columns(id) 
    ON DELETE CASCADE;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tickets_column_id ON tickets(column_id);
CREATE INDEX IF NOT EXISTS idx_board_columns_project_id ON board_columns(project_id);

-- Add ON DELETE CASCADE to subtasks and comments
ALTER TABLE subtasks
  DROP CONSTRAINT IF EXISTS subtasks_ticket_id_fkey,
  ADD CONSTRAINT subtasks_ticket_id_fkey
    FOREIGN KEY (ticket_id)
    REFERENCES tickets(id)
    ON DELETE CASCADE;

ALTER TABLE task_comments
  DROP CONSTRAINT IF EXISTS task_comments_ticket_id_fkey,
  ADD CONSTRAINT task_comments_ticket_id_fkey
    FOREIGN KEY (ticket_id)
    REFERENCES tickets(id)
    ON DELETE CASCADE;