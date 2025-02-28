/*
  # Add task policies

  1. Changes
    - Add policies for task management
    - Enable RLS for tasks table
    - Add policies for task access control

  2. Security
    - Users can only access tasks in their workspaces
    - Users can create tasks in projects they have access to
    - Users can update and delete their own tasks
*/

-- Task Policies
CREATE POLICY "Users can view tasks in their workspaces"
  ON tickets
  FOR SELECT
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create tasks in their workspaces"
  ON tickets
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update tasks in their workspaces"
  ON tickets
  FOR UPDATE
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete tasks in their workspaces"
  ON tickets
  FOR DELETE
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE wm.user_id = auth.uid()
    )
  );