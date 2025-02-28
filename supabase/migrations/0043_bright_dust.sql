-- Drop existing policies if they exist
DROP POLICY IF EXISTS "attachments_select_policy" ON attachments;
DROP POLICY IF EXISTS "attachments_insert_policy" ON attachments;
DROP POLICY IF EXISTS "attachments_delete_policy" ON attachments;

-- Create RLS policies
CREATE POLICY "attachments_select_policy"
  ON attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tickets t
      JOIN projects p ON p.id = t.project_id
      WHERE t.id = attachments.ticket_id
      AND (
        p.created_by = auth.uid() OR
        t.assignee_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members
          WHERE project_id = p.id
          AND user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "attachments_insert_policy"
  ON attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tickets t
      JOIN projects p ON p.id = t.project_id
      WHERE t.id = ticket_id
      AND (
        p.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members
          WHERE project_id = p.id
          AND user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "attachments_delete_policy"
  ON attachments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tickets t
      JOIN projects p ON p.id = t.project_id
      WHERE t.id = ticket_id
      AND (
        p.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members
          WHERE project_id = p.id
          AND user_id = auth.uid()
        )
      )
    )
  );

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_attachments_ticket_id ON attachments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_attachments_created_at ON attachments(created_at);