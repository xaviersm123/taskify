/*
  # Fix workspace policies and initialization
  
  1. Changes
    - Simplify workspace policies
    - Fix workspace member access
    - Update project access policies
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Workspace access policy" ON workspaces;
DROP POLICY IF EXISTS "Workspace member access policy" ON workspace_members;

-- Simple workspace access policy
CREATE POLICY "workspace_access"
  ON workspaces FOR ALL
  USING (
    id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      UNION
      SELECT id FROM workspaces WHERE created_by = auth.uid()
    )
  );

-- Simple workspace member access
CREATE POLICY "workspace_member_access"
  ON workspace_members FOR ALL
  USING (user_id = auth.uid());

-- Update project access
CREATE POLICY "project_access"
  ON projects FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );