/*
  # Fix workspace creation and policies

  1. Changes
    - Simplify workspace policies
    - Fix workspace member creation
    - Ensure proper access control

  2. Security
    - Maintain RLS security
    - Ensure proper workspace access
*/

-- Drop existing policies
DROP POLICY IF EXISTS "workspace_select_20240323" ON workspaces;
DROP POLICY IF EXISTS "workspace_insert_20240323" ON workspaces;
DROP POLICY IF EXISTS "member_select_20240323" ON workspace_members;
DROP POLICY IF EXISTS "member_insert_20240323" ON workspace_members;

-- Workspace policies
CREATE POLICY "workspace_select_20240324"
  ON workspaces FOR SELECT
  USING (
    id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "workspace_insert_20240324"
  ON workspaces FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Workspace member policies
CREATE POLICY "member_select_20240324"
  ON workspace_members FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "member_insert_20240324"
  ON workspace_members FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE created_by = auth.uid()
    )
  );