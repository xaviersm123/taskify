-- Drop existing policies if they exist
DO $$ 
BEGIN
  -- Drop all existing ticket policies
  DROP POLICY IF EXISTS "ticket_access_policy" ON tickets;
  DROP POLICY IF EXISTS "tickets_select_policy" ON tickets;
  DROP POLICY IF EXISTS "tickets_insert_policy" ON tickets;
  DROP POLICY IF EXISTS "tickets_update_policy" ON tickets;
EXCEPTION
  WHEN others THEN
    NULL;
END $$;

-- Create new policies for tickets
DO $$ 
BEGIN
  -- Select policy
  CREATE POLICY "tickets_select_policy"
    ON tickets FOR SELECT
    USING (
      project_id IN (
        SELECT id FROM projects WHERE created_by = auth.uid()
      ) OR
      assignee_id = auth.uid()
    );

  -- Insert policy
  CREATE POLICY "tickets_insert_policy"
    ON tickets FOR INSERT
    WITH CHECK (
      project_id IN (
        SELECT id FROM projects WHERE created_by = auth.uid()
      ) OR
      project_id IN (
        SELECT project_id FROM project_members WHERE user_id = auth.uid()
      )
    );

  -- Update policy
  CREATE POLICY "tickets_update_policy"
    ON tickets FOR UPDATE
    USING (
      project_id IN (
        SELECT id FROM projects WHERE created_by = auth.uid()
      ) OR
      assignee_id = auth.uid() OR
      project_id IN (
        SELECT project_id FROM project_members WHERE user_id = auth.uid()
      )
    );
EXCEPTION
  WHEN others THEN
    NULL;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tickets_assignee_id ON tickets(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tickets_project_id ON tickets(project_id);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at);