/*
  # Fix workspace policies recursion

  1. Changes
    - Simplify workspace member policies to prevent recursion
    - Update workspace access policies
    - Fix project policies

  2. Security
    - Maintain RLS while preventing policy loops
    - Ensure proper access control for workspaces and projects
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Workspace members can view workspace" ON workspaces;
DROP POLICY IF EXISTS "Users can view workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Workspace members can view projects" ON projects;

-- Simplified workspace policies
CREATE POLICY "Users can view their workspaces"
  ON workspaces FOR SELECT
  USING (
    created_by = auth.uid() OR
    id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- Direct workspace member policies
CREATE POLICY "Users can view workspace memberships"
  ON workspace_members FOR SELECT
  USING (
    user_id = auth.uid() OR
    workspace_id IN (
      SELECT id FROM workspaces WHERE created_by = auth.uid()
    )
  );

-- Project policies
CREATE POLICY "Users can view workspace projects"
  ON projects FOR SELECT
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE created_by = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );