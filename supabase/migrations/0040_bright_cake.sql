-- Drop existing policies
DROP POLICY IF EXISTS "tickets_select_policy" ON tickets;
DROP POLICY IF EXISTS "tickets_insert_policy" ON tickets;
DROP POLICY IF EXISTS "tickets_update_policy" ON tickets;

-- Create comprehensive policies for tickets
CREATE POLICY "tickets_access_policy"
  ON tickets FOR ALL
  USING (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
    ) OR
    assignee_id = auth.uid() OR
    project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
    ) OR
    project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

-- Add missing indexes
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_column_id ON tickets(column_id);