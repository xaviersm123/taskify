-- Drop existing project access policies
DROP POLICY IF EXISTS "project_access_policy" ON projects;
DROP POLICY IF EXISTS "tickets_access_policy" ON tickets;

-- Create comprehensive project access policy
CREATE POLICY "project_access_policy"
  ON projects FOR ALL
  USING (
    created_by = auth.uid() OR
    id IN (
      SELECT project_id 
      FROM project_members 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    created_by = auth.uid() OR
    id IN (
      SELECT project_id 
      FROM project_members 
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'member')
    )
  );

-- Update tickets access policy to include project members
CREATE POLICY "tickets_access_policy"
  ON tickets FOR ALL
  USING (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
      UNION
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    ) OR
    assignee_id = auth.uid() OR
    auth.uid() = ANY(collaborator_ids)
  )
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
      UNION
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

-- Update board columns access policy
DROP POLICY IF EXISTS "board_columns_access_policy" ON board_columns;
CREATE POLICY "board_columns_access_policy"
  ON board_columns FOR ALL
  USING (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
      UNION
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

-- Update task comments access policy
DROP POLICY IF EXISTS "comment_access_policy" ON task_comments;
CREATE POLICY "comment_access_policy"
  ON task_comments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tickets t
      JOIN projects p ON p.id = t.project_id
      WHERE t.id = task_comments.ticket_id
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

-- Update subtasks access policy
DROP POLICY IF EXISTS "subtask_access_policy" ON subtasks;
CREATE POLICY "subtask_access_policy"
  ON subtasks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tickets t
      JOIN projects p ON p.id = t.project_id
      WHERE t.id = subtasks.ticket_id
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