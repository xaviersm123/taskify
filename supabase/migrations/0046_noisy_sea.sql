-- Add collaborator_ids array column to tickets table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tickets' AND column_name = 'collaborator_ids'
  ) THEN
    ALTER TABLE tickets ADD COLUMN collaborator_ids uuid[] DEFAULT '{}';
    CREATE INDEX idx_tickets_collaborator_ids ON tickets USING gin(collaborator_ids);
  END IF;
END $$;

-- Update RLS policies to include collaborators
DROP POLICY IF EXISTS "tickets_access_policy" ON tickets;

CREATE POLICY "tickets_access_policy"
  ON tickets FOR ALL
  USING (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
    ) OR
    assignee_id = auth.uid() OR
    auth.uid() = ANY(collaborator_ids) OR
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