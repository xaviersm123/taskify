/*
  # Fix project creation permissions

  1. Changes
    - Add INSERT policies for projects
    - Add INSERT policies for workspace members
    - Ensure proper error handling
*/

-- Add INSERT policies for projects
CREATE POLICY "Project creation"
  ON projects FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = projects.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'admin', 'member')
    )
  );

-- Add INSERT policies for workspace members
CREATE POLICY "Workspace member creation"
  ON workspace_members FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces 
      WHERE created_by = auth.uid()
    )
  );