-- Drop existing policies
DROP POLICY IF EXISTS "task_activities_access_policy" ON task_activities;
DROP POLICY IF EXISTS "task_activities_access_policy_v2" ON task_activities;

-- Create or replace policy for task activity access
CREATE POLICY "task_activities_access_policy"
  ON task_activities FOR ALL
  USING (
    task_id IN (
      SELECT id FROM tickets
      WHERE project_id IN (
        SELECT id FROM projects WHERE created_by = auth.uid()
      ) OR assignee_id = auth.uid() OR
      auth.uid() = ANY(collaborator_ids) OR
      project_id IN (
        SELECT project_id FROM project_members WHERE user_id = auth.uid()
      )
    )
  );

-- Update type check constraint to include 'delete' type
ALTER TABLE task_activities 
DROP CONSTRAINT IF EXISTS task_activities_type_check,
ADD CONSTRAINT task_activities_type_check 
CHECK (type IN ('create', 'update', 'delete', 'comment', 'subtask', 'attachment'));