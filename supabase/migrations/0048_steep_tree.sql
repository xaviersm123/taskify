-- Update the foreign key constraint to cascade deletes
ALTER TABLE tickets 
  DROP CONSTRAINT IF EXISTS tickets_column_id_fkey,
  ADD CONSTRAINT tickets_column_id_fkey 
    FOREIGN KEY (column_id) 
    REFERENCES board_columns(id) 
    ON DELETE CASCADE;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_tickets_column_id ON tickets(column_id);