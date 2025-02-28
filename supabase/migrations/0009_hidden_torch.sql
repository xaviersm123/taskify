/*
  # Fix workspace initialization policies
  
  1. Changes
    - Add policies for default workspace access
    - Simplify workspace member policies
*/

-- Drop existing workspace policies
DROP POLICY IF EXISTS "Workspace access" ON workspaces;

-- Allow users to access their created workspaces
CREATE POLICY "Users can access their workspaces"
  ON workspaces FOR ALL
  USING (created_by = auth.uid());

-- Allow workspace members to view workspaces
CREATE POLICY "Members can view workspaces"
  ON workspaces FOR SELECT
  USING (
    id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );