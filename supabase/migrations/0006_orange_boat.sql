/*
  # Fix workspace policy recursion

  1. Changes
    - Simplify workspace and member policies to eliminate recursion
    - Use direct relationships without circular references
    - Maintain proper access control

  2. Security
    - Ensure users can only access their own workspaces and memberships
    - Maintain data isolation between users
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can view workspace memberships" ON workspace_members;
DROP POLICY IF EXISTS "Users can view workspace projects" ON projects;

-- Basic workspace access
CREATE POLICY "Workspace access"
  ON workspaces FOR SELECT
  USING (created_by = auth.uid());

-- Workspace member access
CREATE POLICY "Workspace member access"
  ON workspace_members FOR SELECT
  USING (user_id = auth.uid());

-- Project access through membership
CREATE POLICY "Project access"
  ON projects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = projects.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );